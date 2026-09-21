"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { searchBusinesses, mapIndustry, getPlacesKey } from "@/lib/places";
import { chatCompletion, isAiConfigured } from "@/lib/ai";
import { LEAD_STATUSES, LEAD_PRIORITIES, INDUSTRIES, LEAD_SOURCES } from "@/lib/constants";
import type { ActionResult } from "@/lib/actions/leads";

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
  city: string | null;
  industry: string;
  source: string;
  status: string;
  priority: string;
  notes: string | null;
  next_follow_up_at: string | null;
}

export interface ResearchReport {
  query: string;
  source: "google" | "ai";
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

const normalizePhone = (v: string) => (v ?? "").replace(/[^\d]/g, "");
const normalizeEmail = (v: string) => (v ?? "").trim().toLowerCase();

function cleanRow(raw: Record<string, unknown>, source: "google" | "ai"): ResearchRow | null {
  const full_name = String(raw.full_name ?? raw.name ?? "").trim();
  const email = normalizeEmail(String(raw.email ?? ""));
  const phone = normalizePhone(String(raw.phone ?? ""));
  const website = String(raw.website ?? "").trim();
  const city = String(raw.city ?? "").trim();
  const country = String(raw.country ?? "").trim();
  const address = String(raw.address ?? "").trim();

  if (!full_name) return null;
  if (email && !EMAIL_RE.test(email)) return null;
  if (phone && phone.length < 7) return null;

  let industry = String(raw.industry ?? "").trim();
  if (!ALLOWED_INDUSTRIES.includes(industry)) {
    const mapped = mapIndustry((raw.types as string[]) ?? []);
    industry = ALLOWED_INDUSTRIES.includes(mapped) ? mapped : "Other";
  }

  let status = String(raw.status ?? "New").trim();
  if (!ALLOWED_STATUSES.includes(status)) status = "New";

  let priority = String(raw.priority ?? "Medium").trim();
  if (!ALLOWED_PRIORITIES.includes(priority)) priority = "Medium";

  let sourceName = String(raw.source ?? "").trim();
  if (!ALLOWED_SOURCES.includes(sourceName)) sourceName = source === "google" ? "Google Maps" : "AI Research";

  const rating = raw.rating !== null && raw.rating !== undefined ? Number(raw.rating) : null;
  const notes = [
    address ? `Address: ${address}` : "",
    rating ? `Google rating: ${rating}/5` : "",
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
    country: country || (raw.country ? String(raw.country) : null),
    city: city || null,
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
- Industry must be one of the allowed values above (map Google 'types' if needed).
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

  if (getPlacesKey()) {
    try {
      const businesses = await searchBusinesses(q, { limit: count });
      report.source = "google";
      raw = businesses.map((b) => ({ ...b, full_name: b.name, company: b.name }));
    } catch (e) {
      report.errors.push(e instanceof Error ? e.message : "Google Places search failed.");
      // Fall back to AI knowledge if Places failed but AI is available.
      if (!isAiConfigured()) return { ok: false, error: report.errors[0], report };
    }
  } else if (!isAiConfigured()) {
    return {
      ok: false,
      error: "Research needs a GOOGLE_PLACES_API_KEY or an AI_API_KEY in your environment.",
      report,
    };
  }

  if (raw.length && raw.length < count) {
    // AI-assist: fill the remaining slots from knowledge if AI is available.
    if (isAiConfigured()) {
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
    }
  } else if (!raw.length && isAiConfigured()) {
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
  }

  report.researched = raw.length;

  // AI normalization pass over the raw rows to guarantee clean, valid data.
  let rows: ResearchRow[] = [];
  if (report.source === "google" && isAiConfigured() && raw.length) {
    try {
      const norm = await chatCompletion(
        [
          { role: "system", content: AI_SYSTEM },
          {
            role: "user",
            content: `Clean these Google Places results and return JSON {"leads":[...]}. Do not invent anything.\n${JSON.stringify(
              raw.slice(0, count)
            )}`,
          },
        ],
        { json: true, temperature: 0.1 }
      );
      const leads = ((norm.json as { leads?: unknown[] } | undefined)?.leads ?? []) as Array<
        Record<string, unknown>
      >;
      rows = leads.map((r) => cleanRow(r, "google")).filter((x): x is ResearchRow => x !== null);
      if (!rows.length) {
        rows = raw.map((r) => cleanRow(r, "google")).filter((x): x is ResearchRow => x !== null);
      }
    } catch {
      rows = raw.map((r) => cleanRow(r, "google")).filter((x): x is ResearchRow => x !== null);
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
      city: r.city,
      industry: r.industry,
      source: r.source,
      status: r.status,
      priority: r.priority,
      notes: r.notes,
      next_follow_up_at: r.next_follow_up_at,
    });
  }

  if (batch.length) {
    const CHUNK = 100;
    for (let i = 0; i < batch.length; i += CHUNK) {
      const chunk = batch.slice(i, i + CHUNK);
      const { data, error } = await supabase.from("leads").insert(chunk).select("id");
      if (error) {
        report.errors.push(`Insert failed: ${error.message}`);
        report.skipped += chunk.length;
      } else {
        report.inserted += (data ?? []).length;
        if (data) report.insertedIds.push(...data.map((d) => d.id));
      }
    }

    if (report.insertedIds.length) {
      await supabase.from("activities").insert(
        report.insertedIds.map((id) => ({
          lead_id: id,
          user_id: user.id,
          type: "imported",
          title: "Lead added by AI research",
          description: `Researched for "${q}" (${report.source === "google" ? "Google Maps" : "AI"}).`,
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