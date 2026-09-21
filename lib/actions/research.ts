"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { searchBusinessesOsm, mapIndustry } from "@/lib/osm";
import { chatCompletion, isAiConfigured } from "@/lib/ai";
import { LEAD_STATUSES, LEAD_PRIORITIES, INDUSTRIES, LEAD_SOURCES } from "@/lib/constants";
import type { ActionResult } from "@/lib/actions/leads";
import { insertLeadsDedupe } from "@/lib/insert-leads";
import {
  fingerprint,
  computeLeadScore,
  parseTags,
  mapToAllowedIndustry,
  normalizePhone,
  normalizeEmail,
} from "@/lib/leads-utils";

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export interface ResearchRow {
  full_name: string;
  company: string;
  job_title: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  industry: string;
  source: string;
  status: string;
  priority: string;
  notes: string | null;
  next_follow_up_at: string | null;
}

export interface ResearchReport {
  query: string;
  source: "osm" | "ai";
  researched: number;
  inserted: number;
  skipped: number;
  skipped_reasons: Record<string, number>;
  errors: string[];
  insertedIds: string[];
}

const ALLOWED_STATUSES = LEAD_STATUSES as readonly string[];
const ALLOWED_PRIORITIES = LEAD_PRIORITIES as readonly string[];
const ALLOWED_INDUSTRIES = INDUSTRIES as readonly string[];
const ALLOWED_SOURCES = LEAD_SOURCES as readonly string[];

function cleanRow(raw: Record<string, unknown>, source: "osm" | "ai"): ResearchRow | null {
  const full_name = String(raw.full_name ?? raw.name ?? "").trim();
  const email = normalizeEmail(String(raw.email ?? ""));
  const phone = normalizePhone(String(raw.phone ?? ""));
  const website = String(raw.website ?? "").trim();
  const city = String(raw.city ?? "").trim();
  const country = String(raw.country ?? "").trim();

  if (!full_name) return null;
  if (email && !EMAIL_RE.test(email)) return null;
  if (phone && phone.length < 7) return null;

  let rawIndustry = String(raw.industry ?? "").trim();
  const tags = (raw.osm_tags as Record<string, string> | undefined) ?? {};
  const fromTags = Object.keys(tags).length ? mapIndustry(tags) : "";
  const industry = mapToAllowedIndustry(rawIndustry, fromTags) ?? "Other";
  rawIndustry = industry;

  let status = String(raw.status ?? "New").trim();
  if (!ALLOWED_STATUSES.includes(status)) status = "New";

  let priority = String(raw.priority ?? "Medium").trim();
  if (!ALLOWED_PRIORITIES.includes(priority)) priority = "Medium";

  let sourceName = String(raw.source ?? "").trim();
  if (!ALLOWED_SOURCES.includes(sourceName)) {
    sourceName = source === "osm" ? "OpenStreetMap" : "AI Research";
  }

  const state = String(raw.state ?? "").trim();
  const address = String(raw.address ?? "").trim();

  const noContact =
    source === "osm" && !phone && !website && !email
      ? "No phone/website listed on OpenStreetMap — verify before calling."
      : "";
  const notes = [
    address ? `Address: ${address}` : "",
    noContact,
    source === "ai" ? "AI-generated — verify phone/website before calling." : "",
  ]
    .filter(Boolean)
    .join("\n");

  const followUp = String(raw.next_follow_up_at ?? "").trim() || null;

  return {
    full_name,
    company: String(raw.company ?? "").trim() || full_name,
    job_title: String(raw.job_title ?? "").trim() || null,
    phone: phone || null,
    whatsapp: normalizePhone(String(raw.whatsapp ?? "")) || phone || null,
    email: email || null,
    website: website || null,
    country: country || null,
    state: state || null,
    city: city || null,
    address: address || null,
    industry,
    source: sourceName,
    status,
    priority,
    notes: notes || null,
    next_follow_up_at: followUp,
  };
}

const AI_SYSTEM = `You are the IrisLabs CRM lead researcher. You receive raw business research results for a cold-caller team and must return a CLEAN, valid JSON array under the key "leads".

Each lead object must look exactly like:
{
  "full_name": "Business or contact name",
  "company": "Company name",
  "job_title": "",
  "phone": "digits only, incl country code when available",
  "whatsapp": "",
  "email": "lowercase email if present else empty",
  "website": "full https:// URL if present else empty",
  "city": "",
  "country": "",
  "industry": "one of: ${ALLOWED_INDUSTRIES.join(", ")}",
  "status": "New",
  "priority": "one of: Low, Medium, High",
  "note": "one or two helpful sentences for a cold caller",
  "next_follow_up_at": ""
}

Rules:
- NEVER invent, guess, or alter phone numbers, websites, emails, names or addresses. Only use data present in the input.
- Full name must be present for every row.
- status must be "New" for every row.
- Industry must be one of the allowed values above (map OSM tags/Google types if needed).
- Return ONLY the JSON object; no prose, no markdown.`;

export async function runLeadResearch(
  query: string,
  limit: number = 10
): Promise<ActionResult & { report?: ResearchReport }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const q = query.trim();
  if (!q) return { ok: false, error: "Enter a research query." };
  const count = Math.min(Math.max(Math.trunc(limit) || 10, 1), 20);

  const report: ResearchReport = {
    query: q,
    source: "ai",
    researched: 0,
    inserted: 0,
    skipped: 0,
    skipped_reasons: {},
    errors: [],
    insertedIds: [],
  };

  let raw: Array<Record<string, unknown>> = [];

  // OpenStreetMap is free and needs no API key — always try it first for real data.
  try {
    const businesses = await searchBusinessesOsm(q, { limit: count });
    if (businesses.length) {
      report.source = "osm";
      raw = businesses.map((b) => ({
        full_name: b.name,
        company: b.name,
        phone: b.phone,
        whatsapp: b.phone,
        website: b.website,
        email: b.email,
        address: b.address,
        city: b.city,
        country: b.country,
        osm_tags: b.tags,
      }));
    }
  } catch (e) {
    report.errors.push(e instanceof Error ? e.message : "OpenStreetMap search failed.");
  }

  if (raw.length && raw.length < count && isAiConfigured()) {
    // AI-assist: fill the remaining slots from well-known public info if available.
    try {
      const gen = await chatCompletion(
        [
          { role: "system", content: AI_SYSTEM },
          {
            role: "user",
            content: `Research "${q}". Produce a JSON object {"leads": []} with up to ${
              count - raw.length
            } real, well-known businesses. Every phone, website and email you include must be real public information; leave fields empty when unsure.`,
          },
        ],
        { json: true, temperature: 0.3 }
      );
      const list = ((gen.json as { leads?: unknown[] } | undefined)?.leads ?? []) as Array<
        Record<string, unknown>
      >;
      raw = [...raw, ...list];
    } catch (e) {
      report.errors.push(e instanceof Error ? e.message : "AI fallback failed.");
    }
  } else if (!raw.length) {
    if (isAiConfigured()) {
      try {
        const gen = await chatCompletion(
          [
            { role: "system", content: AI_SYSTEM },
            {
              role: "user",
              content: `Research "${q}". Produce a JSON object {"leads": []} with up to ${count} real, well-known businesses. Every phone, website and email you include must be real public information; leave fields empty when unsure.`,
            },
          ],
          { json: true, temperature: 0.3 }
        );
        const list = ((gen.json as { leads?: unknown[] } | undefined)?.leads ?? []) as Array<
          Record<string, unknown>
        >;
        raw = list;
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Research failed.", report };
      }
    } else if (report.errors.length) {
      return { ok: false, error: report.errors[0], report };
    } else {
      return {
        ok: false,
        error: "No businesses found on OpenStreetMap for that query. Try a different city or a common business type (e.g. “plumbers in Miami”).",
        report,
      };
    }
  }

  report.researched = raw.length;

  // AI normalization pass over OSM rows to guarantee clean, valid data.
  let rows: ResearchRow[] = [];
  if (report.source === "osm" && isAiConfigured() && raw.length) {
    try {
      const norm = await chatCompletion(
        [
          { role: "system", content: AI_SYSTEM },
          {
            role: "user",
            content: `Clean these OpenStreetMap results and return JSON {"leads":[...]}. Do not invent anything.\n${JSON.stringify(
              raw.slice(0, count)
            )}`,
          },
        ],
        { json: true, temperature: 0.1 }
      );
      const leads = ((norm.json as { leads?: unknown[] } | undefined)?.leads ?? []) as Array<
        Record<string, unknown>
      >;
      rows = leads.map((r) => cleanRow(r, "osm")).filter((x): x is ResearchRow => x !== null);
      if (!rows.length) {
        rows = raw.map((r) => cleanRow(r, "osm")).filter((x): x is ResearchRow => x !== null);
      }
    } catch {
      rows = raw.map((r) => cleanRow(r, "osm")).filter((x): x is ResearchRow => x !== null);
    }
  } else {
    rows = raw
      .map((r) => cleanRow(r, report.source))
      .filter((x): x is ResearchRow => x !== null);
  }

  // Dedupe against existing leads.
  const { data: existing } = await supabase.from("leads").select("phone,email,full_name");
  const existingPhones = new Set((existing ?? []).map((l) => normalizePhone(l.phone ?? "")).filter(Boolean));
  const existingEmails = new Set((existing ?? []).map((l) => normalizeEmail(l.email ?? "")).filter(Boolean));

  const seenNames = new Set<string>();
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();

  const batch: Array<Record<string, unknown>> = [];
  const reasonOf = (r: ResearchRow): string | null => {
    const nameKey = r.full_name.toLowerCase();
    if (seenNames.has(nameKey)) return "Duplicate name";
    if (r.phone && (existingPhones.has(r.phone) || seenPhones.has(r.phone))) return "Duplicate phone";
    if (r.email && (existingEmails.has(r.email) || seenEmails.has(r.email))) return "Duplicate email";
    return null;
  };

  for (const r of rows) {
    const reason = reasonOf(r);
    if (reason) {
      report.skipped++;
      report.skipped_reasons[reason] = (report.skipped_reasons[reason] ?? 0) + 1;
      continue;
    }
    seenNames.add(r.full_name.toLowerCase());
    if (r.phone) seenPhones.add(r.phone);
    if (r.email) seenEmails.add(r.email);

    const { score, reasons } = computeLeadScore({
      website: r.website,
      phone: r.phone,
      email: r.email,
      address: r.address,
      industry: r.industry,
      city: r.city,
      country: r.country,
    });

    batch.push({
      user_id: user.id,
      assigned_to: user.id,
      full_name: r.full_name,
      company: r.company,
      job_title: r.job_title,
      phone: r.phone,
      whatsapp: r.whatsapp,
      email: r.email,
      website: r.website,
      country: r.country,
      state: r.state,
      city: r.city,
      address: r.address,
      industry: r.industry,
      source: r.source,
      tags: parseTags(r.industry),
      status: r.status,
      priority: r.priority,
      notes: r.notes,
      next_follow_up_at: r.next_follow_up_at,
      lead_score: score,
      lead_score_reasons: reasons,
      ...fingerprint({
        name: r.full_name,
        city: r.city,
        address: r.address,
        phone: r.phone,
        website: r.website,
      }),
    });
  }

  if (batch.length) {
    const ins = await insertLeadsDedupe(supabase, batch);
    report.inserted += ins.insertedIds.length;
    report.insertedIds.push(...ins.insertedIds);
    if (ins.duplicates > 0) {
      report.skipped += ins.duplicates;
      report.skipped_reasons["Duplicate (already in CRM)"] =
        (report.skipped_reasons["Duplicate (already in CRM)"] ?? 0) + ins.duplicates;
    }
    for (const err of ins.errors) report.errors.push(`Insert failed: ${err}`);

    if (report.insertedIds.length) {
      await supabase.from("activities").insert(
        report.insertedIds.map((id) => ({
          lead_id: id,
          user_id: user.id,
          type: "imported",
          title: "Lead added by AI research",
          description: `Researched for "${q}" (${report.source === "osm" ? "OpenStreetMap" : "AI"}).`,
        }))
      );
    }
  }

  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/");
  revalidatePath("/research");
  return { ok: true, report };
}