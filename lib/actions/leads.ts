"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STATUSES, LEAD_PRIORITIES } from "@/lib/constants";
import { validatePhone } from "@/lib/validation";
import { insertLeadsDedupe } from "@/lib/insert-leads";
import {
  fingerprint,
  computeLeadScore,
  parseTags,
  mapToAllowedIndustry,
  normalizePhone,
  normalizeEmail,
} from "@/lib/leads-utils";

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

  const industry = mapToAllowedIndustry(String(values.industry ?? "").trim());
  const base = {
    full_name: String(values.full_name),
    company: String(values.company ?? "").trim() || null,
    job_title: String(values.job_title ?? "").trim() || null,
    phone: String(values.phone ?? "").trim() || null,
    whatsapp: String(values.whatsapp ?? "").trim() || null,
    email: String(values.email ?? "").trim().toLowerCase() || null,
    website: String(values.website ?? "").trim() || null,
    country: String(values.country ?? "").trim() || null,
    state: String(values.state ?? "").trim() || null,
    city: String(values.city ?? "").trim() || null,
    address: String(values.address ?? "").trim() || null,
    industry,
    source: String(values.source ?? "").trim() || null,
    tags: parseTags(String(values.tags ?? "")),
    status: String(values.status ?? "New"),
    priority: String(values.priority ?? "Medium"),
    notes: String(values.notes ?? "").trim() || null,
  };
  const { score, reasons } = computeLeadScore(base);
  return {
    errors: null,
    insert: {
      ...base,
      lead_score: score,
      lead_score_reasons: reasons,
      ...fingerprint(base),
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

  // Only update fields the form actually sent, so edits never wipe data the
  // form doesn't know about (tags, scores, fingerprints, coordinates…).
  const present = new Set(Object.keys(Object.fromEntries(formData.entries())));
  const payload = Object.fromEntries(
    Object.entries(parsed.insert).filter(([k]) => present.has(k))
  );

  const { error } = await supabase.from("leads").update(payload).eq("id", id);
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

export async function setLeadFollowUp(id: string, date: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id,user_id,next_follow_up_at")
    .eq("id", id)
    .single();
  if (fetchError || !lead) return { ok: false, error: "Lead not found." };

  const trimmed = (date ?? "").trim();
  let iso: string | null = null;
  if (trimmed) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return { ok: false, error: "Invalid date." };
    iso = parsed.toISOString();
  }

  const { error } = await supabase
    .from("leads")
    .update({ next_follow_up_at: iso })
    .eq("id", id);
  if (error) return { ok: false, error: `Could not update follow-up: ${error.message}` };

  await supabase.from("activities").insert({
    lead_id: id,
    user_id: lead.user_id,
    type: "followup",
    title: iso ? "Follow-up scheduled" : "Follow-up cleared",
    description: iso
      ? `Next follow-up set to ${iso.slice(0, 10)}.`
      : "Cleared the follow-up date.",
    metadata: { next_follow_up_at: iso },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/follow-ups");
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
  state?: string;
  city: string;
  address?: string;
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

function computeImportRowScore(raw: ImportRow, industry: string | null) {
  const { score, reasons } = computeLeadScore({
    website: (raw.website ?? "").trim() || undefined,
    phone: normalizePhone(raw.phone) ?? undefined,
    email: normalizeEmail(raw.email) ?? undefined,
    address: (raw.address ?? "").trim() || undefined,
    industry,
    city: (raw.city ?? "").trim() || undefined,
    country: (raw.country ?? "").trim() || undefined,
  });
  return { lead_score: score, lead_score_reasons: reasons };
}

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

    const industry = mapToAllowedIndustry((raw.industry ?? "").trim());
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
      state: (raw.state ?? "").trim() || null,
      city: (raw.city ?? "").trim() || null,
      address: (raw.address ?? "").trim() || null,
      industry,
      source: (raw.source ?? "").trim() || "Imported",
      tags: parseTags(industry),
      status: "New",
      priority: "Medium",
      ...(computeImportRowScore(raw, industry)),
      ...fingerprint({
        name: fullName,
        city: (raw.city ?? "").trim(),
        address: (raw.address ?? "").trim(),
        phone: phone ?? undefined,
        website: (raw.website ?? "").trim(),
      }),
    });
  });

  if (batch.length) {
    const ins = await insertLeadsDedupe(supabase, batch);
    report.inserted += ins.insertedIds.length;
    report.insertedIds.push(...ins.insertedIds);
    if (ins.duplicates > 0) {
      report.errors.push({
        row: 0,
        reason: `${ins.duplicates} duplicate(s) skipped — already in the CRM (matched by domain, phone or name+location).`,
      });
      report.skipped += ins.duplicates;
    }
    for (const err of ins.errors)
      report.errors.push({ row: 0, reason: `Import failed: ${err}` });

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

// ---------------------------------------------------------------------------
// Assignment & bulk operations (admin / owner only)
// ---------------------------------------------------------------------------

export interface AssignableUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  lead_count: number;
}

async function requireAdminRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<"owner" | "admin" | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  const role = data?.role ?? null;
  return role === "owner" || role === "admin" ? role : null;
}

export async function getAssignableUsers(): Promise<
  ActionResult & { users?: AssignableUser[] }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  const role = await requireAdminRole(supabase, user.id);
  if (!role) return { ok: false, error: "Admins only." };

  const { data } = await supabase.rpc("admin_team_summary");
  const users: AssignableUser[] = Array.isArray(data)
    ? data.filter((m) => ["owner", "admin", "salesperson"].includes(m.role))
    : [];
  return { ok: true, users };
}

async function logAssigned(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  await supabase
    .rpc("insert_activity", {
      p_lead_id: id,
      p_type: "assigned",
      p_title: "Lead assigned",
      p_description: "Lead assigned to this caller by an admin.",
    })
    .throwOnError();
}

export async function assignLead(id: string, toUserId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (!(await requireAdminRole(supabase, user.id)))
    return { ok: false, error: "Admins only." };

  const { data: target } = await supabase
    .from("profiles")
    .select("id,role")
    .eq("id", toUserId)
    .maybeSingle();
  if (!target || !["owner", "admin", "salesperson"].includes(target.role))
    return { ok: false, error: "Pick a team member to assign to." };

  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!lead) return { ok: false, error: "Lead not found." };

  const { error } = await supabase
    .from("leads")
    .update({ user_id: toUserId, assigned_to: toUserId })
    .eq("id", id);
  if (error) return { ok: false, error: `Could not assign lead: ${error.message}` };

  await logAssigned(supabase, id);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function assignManyLeads(ids: string[], toUserId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (!(await requireAdminRole(supabase, user.id)))
    return { ok: false, error: "Admins only." };
  if (!ids.length) return { ok: false, error: "Select at least one lead." };

  const { error } = await supabase
    .from("leads")
    .update({ user_id: toUserId, assigned_to: toUserId })
    .in("id", ids);
  if (error) return { ok: false, error: `Could not assign leads: ${error.message}` };

  for (const id of ids) await logAssigned(supabase, id);
  revalidatePath("/leads");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function assignRoundRobin(ids: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (!(await requireAdminRole(supabase, user.id)))
    return { ok: false, error: "Admins only." };
  if (!ids.length) return { ok: false, error: "Select at least one lead." };

  const { data } = await supabase.rpc("admin_team_summary");
  const agents: AssignableUser[] = Array.isArray(data)
    ? data.filter((m) => ["owner", "admin", "salesperson"].includes(m.role))
    : [];
  if (!agents.length) return { ok: false, error: "No team members to assign to." };
  agents.sort((a, b) => a.lead_count - b.lead_count);

  const buckets = new Map<string, string[]>();
  ids.forEach((id, i) => {
    const agent = agents[i % agents.length];
    const list = buckets.get(agent.id) ?? [];
    list.push(id);
    buckets.set(agent.id, list);
  });

  for (const [agentId, list] of buckets) {
    const { error } = await supabase
      .from("leads")
      .update({ user_id: agentId, assigned_to: agentId })
      .in("id", list);
    if (error) return { ok: false, error: `Could not assign leads: ${error.message}` };
    for (const id of list) await logAssigned(supabase, id);
  }

  revalidatePath("/leads");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteManyLeads(ids: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (!(await requireAdminRole(supabase, user.id)))
    return { ok: false, error: "Admins only." };
  if (!ids.length) return { ok: false, error: "Select at least one lead." };

  const { error } = await supabase.from("leads").delete().in("id", ids);
  if (error) return { ok: false, error: `Could not delete leads: ${error.message}` };

  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/analytics");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}