"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { searchBusinessesOsm, mapIndustry } from "@/lib/osm";
import { chatCompletion, isAiConfigured } from "@/lib/ai";
import {
  isApifyConfigured,
  maxLeadsPerJob,
  startApifyRun,
  waitForApifyRun,
  getDatasetItems,
  normalizeApifyItem,
} from "@/lib/apify";
import {
  fingerprint,
  computeLeadScore,
  normalizePhone,
  normalizeName,
  parseTags,
  mapToAllowedIndustry,
} from "@/lib/leads-utils";
import { insertLeadsDedupe } from "@/lib/insert-leads";
import type { ActionResult } from "@/lib/actions/leads";

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export interface GenerationJob {
  id: string;
  provider: string;
  country: string | null;
  state: string | null;
  city: string | null;
  industry: string | null;
  requested_count: number;
  found_count: number;
  valid_count: number;
  duplicate_count: number;
  imported_count: number;
  failed_count: number;
  status: "running" | "succeeded" | "failed";
  error: string | null;
  progress_log: Array<{ label: string; ts: string; count?: number }>;
  actor_run_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface GenerationRequest {
  country: string;
  state: string;
  city: string;
  industry: string;
  count: number;
}

interface RawRow {
  full_name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  industry: string | null;
  source: string;
  source_url: string | null;
  source_id: string | null;
}

const rowToJob = (row: Record<string, unknown>): GenerationJob => ({
  id: String(row.id),
  provider: String(row.provider ?? "apify"),
  country: (row.country as string | null) ?? null,
  state: (row.state as string | null) ?? null,
  city: (row.city as string | null) ?? null,
  industry: (row.industry as string | null) ?? null,
  requested_count: Number(row.requested_count ?? 0),
  found_count: Number(row.found_count ?? 0),
  valid_count: Number(row.valid_count ?? 0),
  duplicate_count: Number(row.duplicate_count ?? 0),
  imported_count: Number(row.imported_count ?? 0),
  failed_count: Number(row.failed_count ?? 0),
  status: String(row.status ?? "running") as GenerationJob["status"],
  error: (row.error as string | null) ?? null,
  progress_log: Array.isArray(row.progress_log) ? row.progress_log : [],
  actor_run_id: (row.actor_run_id as string | null) ?? null,
  created_at: String(row.created_at),
  completed_at: (row.completed_at as string | null) ?? null,
});

export async function getGenerationJobs(): Promise<GenerationJob[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_generation_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map(rowToJob);
}

/** Match a provider category label to the closest allowed industry. */
const normalizeIndustry = (raw: string | null): string | null =>
  mapToAllowedIndustry(raw, null);

export async function generateLeads(
  request: GenerationRequest
): Promise<ActionResult & { job?: GenerationJob }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const industry = normalizeIndustry(request.industry);
  const city = String(request.city ?? "").trim();
  const state = String(request.state ?? "").trim();
  const country = String(request.country ?? "").trim();
  if (!industry || industry === "Other") {
    return { ok: false, error: "Pick a valid industry from the list." };
  }
  if (!city) return { ok: false, error: "Enter a city to search in." };

  const cap = maxLeadsPerJob();
  const requested = Math.min(Math.max(Math.trunc(request.count) || 10, 1), cap);

  const log: Array<{ label: string; ts: string; count?: number }> = [];
  const step = (label: string, count?: number) => {
    log.push({ label, ts: new Date().toISOString(), ...(count !== undefined ? { count } : {}) });
    void supabase
      .from("lead_generation_jobs")
      .update({ progress_log: log })
      .eq("id", jobId)
      .throwOnError();
  };

  const { data: created } = await supabase
    .from("lead_generation_jobs")
    .insert({
      user_id: user.id,
      provider: isApifyConfigured() ? "apify" : "osm",
      country: country || null,
      state: state || null,
      city,
      industry,
      requested_count: requested,
      status: "running",
    })
    .select("*")
    .single();

  if (!created) return { ok: false, error: "Could not create generation job." };
  const jobId = String(created.id);

  const query = `${industry} in ${[city, state, country].filter(Boolean).join(", ")}`;

  try {
    let rows: RawRow[] = [];
    let provider: "apify" | "osm" | "ai" = "osm";

    // ---- 1) Apify (commercial discovery), free-mode guarded ----------------
    if (isApifyConfigured()) {
      step("Connecting to Apify Actor…");
      try {
        const actorId = process.env.APIFY_ACTOR_ID!;
        const input = {
          searchStringsArray: [query],
          maxCrawledPlacesPerSearch: requested,
          maxCrawledPlaces: requested,
          language: "en",
        };
        const run = await startApifyRun(actorId, input);
        await supabase
          .from("lead_generation_jobs")
          .update({ actor_run_id: run.id })
          .eq("id", jobId)
          .throwOnError();

        step("Running lead source…");
        const settled = await waitForApifyRun(run.id);
        if (settled.status !== "SUCCEEDED" || !settled.datasetId) {
          throw new Error(
            `Apify run ended with status "${settled.status}". Check the Actor's input format.`
          );
        }

        const items = await getDatasetItems(settled.datasetId, { limit: requested });
        const mapped = items
          .map((it) => normalizeApifyItem(it))
          .filter((x): x is NonNullable<typeof x> => Boolean(x.full_name));
        step("Businesses discovered", mapped.length);
        rows = mapped.map((m) => ({
          full_name: m.full_name!,
          company: m.company || m.full_name,
          phone: m.phone,
          email: m.email,
          website: m.website,
          address: m.address,
          city: m.city || city,
          state: m.state || (state || null),
          country: m.country || (country || null),
          latitude: m.lat,
          longitude: m.lng,
          industry: normalizeIndustry(m.industry) || industry,
          source: "Apify",
          source_url: m.source_url,
          source_id: m.source_id,
        }));
        provider = "apify";
      } catch (e) {
        step(`Apify unavailable — falling back to OpenStreetMap (${e instanceof Error ? e.message : "error"})`);
      }
    }

    // ---- 2) OpenStreetMap fallback (free, no key) ----------------------------
    if (!rows.length) {
      step("Searching OpenStreetMap (free)…");
      try {
        const businesses = await searchBusinessesOsm(query, { limit: Math.min(requested, 25) });
        step("Businesses discovered", businesses.length);
        rows = businesses.map((b) => ({
          full_name: b.name,
          company: b.name,
          phone: b.phone,
          email: b.email,
          website: b.website,
          address: b.address || null,
          city: b.city || city,
          state: state || null,
          country: country || (b.country ?? null),
          latitude: b.lat,
          longitude: b.lon,
          industry:
            normalizeIndustry(b.tags && Object.keys(b.tags).length ? mapIndustry(b.tags) : "") ||
            industry,
          source: "OpenStreetMap",
          source_url: null,
          source_id: null,
        }));
        provider = "osm";
      } catch (e) {
        step(`OpenStreetMap search failed (${e instanceof Error ? e.message : "error"})`);
      }
    }

    // ---- 3) AI fallback (only when told to use real data, never invents) -----
    if (!rows.length && isAiConfigured()) {
      step("No map data — asking AI for known public businesses…");
      try {
        const gen = await chatCompletion(
          [
            {
              role: "system",
              content: `You research businesses for a cold-calling CRM. Return JSON {"leads":[]} with up to ${requested} real, well-known ${industry} businesses in ${city}, ${country || state || "the given area"}. Each leads entry: {"full_name","phone","website","email","address","city","country","industry"}. NEVER invent or guess phone numbers, websites or emails — leave them empty when unsure. Only include businesses you are confident exist.`,
            },
            { role: "user", content: `Find ${industry} businesses in ${city}${state ? `, ${state}` : ""}${country ? `, ${country}` : ""}.` },
          ],
          { json: true, temperature: 0.2 }
        );
        const list = ((gen.json as { leads?: unknown[] } | undefined)?.leads ?? []) as Array<
          Record<string, unknown>
        >;
        rows = list.map((r, i) => ({
          full_name: String(r.full_name ?? "").trim(),
          company: String(r.full_name ?? "").trim() || null,
          phone: String(r.phone ?? "").trim() || null,
          email: String(r.email ?? "").trim().toLowerCase() || null,
          website: String(r.website ?? "").trim() || null,
          address: String(r.address ?? "").trim() || null,
          city: String(r.city ?? "").trim() || city,
          state: state || null,
          country: String(r.country ?? "").trim() || country || null,
          latitude: null,
          longitude: null,
          industry: normalizeIndustry(String(r.industry ?? "")) || industry,
          source: "AI Research",
          source_url: null,
          source_id: i === 0 ? "ai" : `gen-${i}`,
        }));
        provider = "ai";
        step("AI research results", rows.length);
      } catch (e) {
        step(`AI research failed (${e instanceof Error ? e.message : "error"})`);
      }
    }

    if (!rows.length) {
      throw new Error(
        "No businesses found. Try another city or business type, or configure an Apify Actor (APIFY_ACTOR_ID) for broader discovery."
      );
    }

    // ---- Validate -----------------------------------------------------------
    const valid = rows.filter((r) => {
      if (!r.full_name) return false;
      if (r.phone && (normalizePhone(r.phone) ?? "").length < 7) return false;
      if (r.email && !EMAIL_RE.test(r.email)) return false;
      return true;
    });
    step("Valid businesses", valid.length);

    // ---- Dedupe (normalized keys: domain / phone / name+city / name+address)
    const seen = new Set<string>();
    const build = new Map<string, number>(); // local key -> count
    const picked: RawRow[] = [];

    for (const r of valid) {
      const fp = fingerprint({
        name: r.full_name,
        city: r.city,
        address: r.address,
        phone: r.phone,
        website: r.website,
      });
      const keys = [
        fp.fp_domain,
        fp.fp_phone,
        fp.fp_name_city,
        fp.fp_name_address,
        normalizeName(r.full_name) ? `n:${normalizeName(r.full_name)}` : null,
      ]
        .filter(Boolean)
        .join("|");
      const localKey = fp.fp_phone || fp.fp_name_city || fp.fp_name_address || keys;
      if (seen.has(localKey)) {
        build.set(localKey, (build.get(localKey) ?? 0) + 1);
        continue;
      }
      seen.add(localKey);
      picked.push(r);
    }
    step("Duplicates", valid.length - picked.length);

    if (!picked.length) {
      await supabase
        .from("lead_generation_jobs")
        .update({
          status: "succeeded",
          found_count: rows.length,
          valid_count: valid.length,
          duplicate_count: valid.length,
          imported_count: 0,
          progress_log: [...log, { label: "Nothing new to add", ts: new Date().toISOString() }],
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId)
        .throwOnError();
      revalidatePath("/research");
      revalidatePath("/leads");
      return {
        ok: true,
        job: rowToJob({
          ...created,
          ...(await readJob(supabase, jobId)),
        }),
      };
    }

    // ---- Prepare + score + import -------------------------------------------
    const batch = picked.map((r) => {
      const fp = fingerprint({
        name: r.full_name,
        city: r.city,
        address: r.address,
        phone: r.phone,
        website: r.website,
      });
      const { score, reasons } = computeLeadScore({
        website: r.website,
        phone: r.phone,
        email: r.email,
        address: r.address,
        industry: r.industry,
        city: r.city,
        country: r.country,
      });
      return {
        user_id: user.id,
        assigned_to: null,
        full_name: r.full_name,
        company: r.company || r.full_name,
        job_title: null,
        phone: r.phone,
        whatsapp: r.phone || null,
        email: r.email,
        website: r.website,
        country: r.country,
        state: r.state,
        city: r.city,
        address: r.address,
        latitude: r.latitude,
        longitude: r.longitude,
        industry: r.industry,
        source: r.source,
        source_url: r.source_url,
        source_id: r.source_id,
        tags: parseTags(`${industry}`),
        lead_score: score,
        lead_score_reasons: reasons,
        status: "New",
        priority: "Medium",
        ...fp,
      };
    });

    step("Importing…");
    const ins = await insertLeadsDedupe(supabase, batch);
    const imported = ins.insertedIds.length;
    const dbDuplicates = ins.duplicates;
    const insertedIds = ins.insertedIds;
    if (ins.errors.length) {
      step(`Imported ${imported}, ${dbDuplicates} duplicates, ${ins.errors.length} failed`);
    } else {
      step(`Imported ${imported}`, imported);
    }

    for (const id of insertedIds) {
      await supabase
        .rpc("insert_activity", {
          p_lead_id: id,
          p_type: "imported",
          p_title: `Lead added by ${provider === "apify" ? "Apify" : provider === "ai" ? "AI research" : "OpenStreetMap"}`,
          p_description: `Discovered in ${industry} · ${city}${country ? `, ${country}` : ""}.`,
        })
        .throwOnError();
    }

    const finalLog: Array<{ label: string; ts: string; count?: number }> = [
      ...log,
      { label: "LEAD GENERATION COMPLETE", ts: new Date().toISOString() },
    ];
    await supabase
      .from("lead_generation_jobs")
      .update({
        provider,
        status: "succeeded",
        found_count: rows.length,
        valid_count: valid.length,
        duplicate_count: valid.length - picked.length + dbDuplicates,
        imported_count: imported,
        failed_count: ins.errors.length,
        progress_log: finalLog,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .throwOnError();

    revalidatePath("/research");
    revalidatePath("/leads");
    revalidatePath("/pipeline");
    revalidatePath("/");

    const finalRow = await readJob(supabase, jobId);
    return { ok: true, job: rowToJob({ ...created, ...finalRow }) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed.";
    const failLog = [...log, { label: `Failed: ${message}`, ts: new Date().toISOString() }];
    await supabase
      .from("lead_generation_jobs")
      .update({
        status: "failed",
        error: message,
        progress_log: failLog,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .throwOnError();
    revalidatePath("/research");
    const finalRow = await readJob(supabase, jobId);
    return { ok: false, error: message, job: rowToJob({ ...created, ...finalRow }) };
  }
}

async function readJob(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string
): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from("lead_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  return data ?? {};
}