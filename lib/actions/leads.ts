"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STATUSES, LEAD_PRIORITIES } from "@/lib/constants";
import { validatePhone } from "@/lib/validation";

export type ActionResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string };

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function validateLeadInput(data: Record<string, FormDataEntryValue | null>) {
  const errors: Record<string, string> = {};
  const fullName = String(data.full_name ?? "").trim();
  if (!fullName) errors.full_name = "Full name is required.";

  const email = String(data.email ?? "").trim().toLowerCase();
  if (email && !EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  const phone = String(data.phone ?? "").trim();
  if (phone && !validatePhone(phone)) errors.phone = "Enter a valid phone number.";

  const whatsapp = String(data.whatsapp ?? "").trim();
  if (whatsapp && !validatePhone(whatsapp)) errors.whatsapp = "Enter a valid WhatsApp number.";

  const status = String(data.status ?? "");
  if (status && !(LEAD_STATUSES as readonly string[]).includes(status))
    errors.status = "Invalid status.";

  const prio = String(data.priority ?? "Medium");
  if (!(LEAD_PRIORITIES as readonly string[]).includes(prio)) errors.priority = "Invalid priority.";

  return {
    errors,
    values: {
      ...data,
      full_name: fullName,
      email: email || null,
    } as Record<string, string | number | File> & { full_name: string; email: string | null },
  };
}

function rowToLeadInput(data: Record<string, FormDataEntryValue | null>) {
  const { errors, values } = validateLeadInput(data);
  if (Object.keys(errors).length) return { errors };
  return {
    errors: null,
    insert: {
      full_name: String(values.full_name),
      company: String(values.company ?? "").trim() || null,
      job_title: String(values.job_title ?? "").trim() || null,
      phone: String(values.phone ?? "").trim() || null,
      whatsapp: String(values.whatsapp ?? "").trim() || null,
      email: String(values.email ?? "").trim().toLowerCase() || null,
      website: String(values.website ?? "").trim() || null,
      country: String(values.country ?? "").trim() || null,
      city: String(values.city ?? "").trim() || null,
      industry: String(values.industry ?? "").trim() || null,
      source: String(values.source ?? "").trim() || null,
      status: String(values.status ?? "New"),
      priority: String(values.priority ?? "Medium"),
      notes: String(values.notes ?? "").trim() || null,
    },
  };
}

export async function createLead(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const parsed = rowToLeadInput(Object.fromEntries(formData.entries()));
  if (parsed.errors) {
    return { ok: false, error: Object.values(parsed.errors)[0] };
  }

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Not authenticated." };

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({ ...parsed.insert, user_id: user.user.id, assigned_to: user.user.id })
    .select("id")
    .single();

  if (error) return { ok: false, error: `Could not create lead: ${error.message}` };

  await supabase.from("activities").insert({
    lead_id: lead.id,
    user_id: user.user.id,
    type: "lead_created",
    title: "Lead created",
    description: `Created from form with status ${parsed.insert.status}.`,
  });

  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/");
  return { ok: true, id: lead.id };
}

export async function updateLead(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing lead id." };

  const parsed = rowToLeadInput(Object.fromEntries(formData.entries()));
  if (parsed.errors) return { ok: false, error: Object.values(parsed.errors)[0] };

  const { error } = await supabase.from("leads").update(parsed.insert).eq("id", id);
  if (error) return { ok: false, error: `Could not update lead: ${error.message}` };

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/pipeline");
  revalidatePath("/");
  return { ok: true, id };
}

export async function deleteLead(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return { ok: false, error: `Could not delete lead: ${error.message}` };
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/");
  return { ok: true };
}

export async function changeLeadStatus(id: string, status: string): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id,status,user_id")
    .eq("id", id)
    .single();
  if (fetchError || !lead) return { ok: false, error: "Lead not found." };

  const { error } = await supabase.from("leads").update({ status }).eq("id", id);
  if (error) return { ok: false, error: `Could not update status: ${error.message}` };

  await supabase.from("activities").insert({
    lead_id: id,
    user_id: lead.user_id,
    type: "status",
    title: `Status changed to ${status}`,
    description: `Moved from ${lead.status} to ${status}.`,
    metadata: { from: lead.status, to: status },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/pipeline");
  revalidatePath("/calls");
  revalidatePath("/analytics");
  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export interface ImportRow {
  full_name: string;
  company: string;
  job_title: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  country: string;
  city: string;
  industry: string;
  source: string;
}

export interface ImportReport {
  total: number;
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; reason: string; lead?: string }>;
  insertedIds: string[];
}

const normalizePhone = (v: string) => (v ?? "").replace(/[^\d]/g, "") || null;

const normalizeEmail = (v: string) =>
  (v ?? "").trim().toLowerCase() || null;

export async function importLeads(rows: ImportRow[]): Promise<ActionResult & { report?: ImportReport }> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Not authenticated." };

  const report: ImportReport = { total: rows.length, inserted: 0, skipped: 0, errors: [], insertedIds: [] };

  if (!rows.length) return { ok: false, error: "No rows to import." };

  // Existing phones/emails for duplicate detection (do not silently create duplicates).
  const { data: existing } = await supabase
    .from("leads")
    .select("id,phone,email,full_name,company");
  const existingPhones = new Set((existing ?? []).map((l) => normalizePhone(l.phone) ?? "").filter(Boolean));
  const existingEmails = new Set((existing ?? []).map((l) => normalizeEmail(l.email) ?? "").filter(Boolean));

  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  const batch: Array<Record<string, unknown>> = [];

  rows.forEach((raw, i) => {
    const rowNum = i + 2; // +1 for header row
    const fullName = (raw.full_name ?? "").trim();
    const phone = normalizePhone(raw.phone);
    const email = normalizeEmail(raw.email);

    if (!fullName) {
      report.errors.push({ row: rowNum, reason: "Full name is required." });
      report.skipped++;
      return;
    }
    if (email && !EMAIL_RE.test(email)) {
      report.errors.push({ row: rowNum, reason: `Invalid email "${email}".`, lead: fullName });
      report.skipped++;
      return;
    }
    if (phone && phone.length < 7) {
      report.errors.push({ row: rowNum, reason: `Phone "${raw.phone}" looks invalid.`, lead: fullName });
      report.skipped++;
      return;
    }
    if (phone && (existingPhones.has(phone) || seenPhones.has(phone))) {
      report.errors.push({ row: rowNum, reason: "Duplicate phone number.", lead: fullName });
      report.skipped++;
      return;
    }
    if (email && (existingEmails.has(email) || seenEmails.has(email))) {
      report.errors.push({ row: rowNum, reason: "Duplicate email address.", lead: fullName });
      report.skipped++;
      return;
    }

    if (phone) {
      existingPhones.add(phone);
      seenPhones.add(phone);
    }
    if (email) {
      existingEmails.add(email);
      seenEmails.add(email);
    }

    batch.push({
      user_id: user.user.id,
      assigned_to: user.user.id,
      full_name: fullName,
      company: (raw.company ?? "").trim() || null,
      job_title: (raw.job_title ?? "").trim() || null,
      phone,
      whatsapp: normalizePhone(raw.whatsapp) || phone,
      email,
      website: (raw.website ?? "").trim() || null,
      country: (raw.country ?? "").trim() || null,
      city: (raw.city ?? "").trim() || null,
      industry: (raw.industry ?? "").trim() || null,
      source: (raw.source ?? "").trim() || "Imported",
      status: "New",
      priority: "Medium",
    });
  });

  if (batch.length) {
    const CHUNK = 500;
    for (let i = 0; i < batch.length; i += CHUNK) {
      const chunk = batch.slice(i, i + CHUNK);
      const { data, error } = await supabase.from("leads").insert(chunk).select("id");
      if (error) {
        report.errors.push({ row: 0, reason: `Import failed: ${error.message}` });
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
          user_id: user.user.id,
          type: "imported",
          title: "Lead imported",
          description: `Imported from CSV with ${report.inserted} total.`,
        }))
      );
    }
  }

  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/");
  return { ok: true, report };
}