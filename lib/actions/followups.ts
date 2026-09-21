"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FOLLOWUP_STATUSES } from "@/lib/constants";
import type { ActionResult } from "./leads";

function parseDue(value: string): string | null {
  if (!value) return null;
  const iso = new Date(value).toISOString();
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

export async function createFollowUp(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Not authenticated." };

  const leadId = String(formData.get("lead_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const dueAt = parseDue(String(formData.get("due_at") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!leadId) return { ok: false, error: "Missing lead." };
  if (!title) return { ok: false, error: "Title is required." };
  if (!dueAt) return { ok: false, error: "A due date is required." };

  const { error } = await supabase.from("follow_ups").insert({
    lead_id: leadId,
    user_id: user.user.id,
    title,
    due_at: dueAt,
    notes,
    status: "Pending",
  });
  if (error) return { ok: false, error: `Could not schedule follow-up: ${error.message}` };

  await supabase.from("leads").update({ next_follow_up_at: dueAt }).eq("id", leadId);

  const { data: lead } = await supabase
    .from("leads")
    .select("full_name")
    .eq("id", leadId)
    .single();

  await supabase.from("activities").insert({
    lead_id: leadId,
    user_id: user.user.id,
    type: "followup",
    title: "Follow-up scheduled",
    description: `${title} — due ${new Date(dueAt).toLocaleString()}.`,
  });

  const dueInMs = new Date(dueAt).getTime() - Date.now();
  if (dueInMs <= 24 * 60 * 60 * 1000 && dueInMs > 0) {
    await supabase.from("notifications").insert({
      user_id: user.user.id,
      lead_id: leadId,
      type: "followup_due",
      title: "Follow-up due soon",
      message: `${title} with ${lead?.full_name ?? "lead"} due ${new Date(dueAt).toLocaleString()}.`,
    });
  }

  revalidatePath("/follow-ups");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function updateFollowUp(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const dueAt = parseDue(String(formData.get("due_at") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!id) return { ok: false, error: "Missing follow-up." };
  if (!title) return { ok: false, error: "Title is required." };
  if (!dueAt) return { ok: false, error: "A due date is required." };

  const { data: fu } = await supabase
    .from("follow_ups")
    .select("lead_id")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("follow_ups")
    .update({ title, due_at: dueAt, notes })
    .eq("id", id);
  if (error) return { ok: false, error: `Could not update: ${error.message}` };

  if (fu) {
    await supabase
      .from("leads")
      .update({ next_follow_up_at: dueAt })
      .eq("id", fu.lead_id);
  }

  revalidatePath("/follow-ups");
  if (fu) revalidatePath(`/leads/${fu.lead_id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function completeFollowUp(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: fu } = await supabase
    .from("follow_ups")
    .select("lead_id,title,user_id")
    .eq("id", id)
    .single();
  if (!fu) return { ok: false, error: "Follow-up not found." };

  const { error } = await supabase
    .from("follow_ups")
    .update({ status: "Completed", completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: `Could not complete: ${error.message}` };

  await supabase.from("activities").insert({
    lead_id: fu.lead_id,
    user_id: fu.user_id,
    type: "followup",
    title: "Follow-up completed",
    description: fu.title,
  });

  revalidatePath("/follow-ups");
  revalidatePath(`/leads/${fu.lead_id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function cancelFollowUp(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: fu } = await supabase
    .from("follow_ups")
    .select("lead_id")
    .eq("id", id)
    .single();
  if (!fu) return { ok: false, error: "Follow-up not found." };

  const { error } = await supabase
    .from("follow_ups")
    .update({ status: "Cancelled" })
    .eq("id", id);
  if (error) return { ok: false, error: `Could not cancel: ${error.message}` };

  revalidatePath("/follow-ups");
  revalidatePath(`/leads/${fu.lead_id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteFollowUp(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("follow_ups").delete().eq("id", id);
  if (error) return { ok: false, error: `Could not delete: ${error.message}` };
  revalidatePath("/follow-ups");
  revalidatePath("/");
  return { ok: true };
}

export async function isFollowUpStatus(value: string) {
  return (FOLLOWUP_STATUSES as readonly string[]).includes(value);
}