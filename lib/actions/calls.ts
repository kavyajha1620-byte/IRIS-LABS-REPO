"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CALL_OUTCOMES, OUTCOME_TO_STATUS } from "@/lib/constants";
import type { ActionResult } from "./leads";

export async function logCall(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Not authenticated." };

  const leadId = String(formData.get("lead_id") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const calledAtRaw = String(formData.get("called_at") ?? "");
  const duration = String(formData.get("duration_seconds") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const followUpRequired = formData.get("follow_up_required") === "on";
  const nextFollowUpRaw = String(formData.get("next_follow_up_at") ?? "");
  const callAgain = formData.get("call_again") === "on";

  if (!leadId) return { ok: false, error: "Missing lead." };
  if (!(CALL_OUTCOMES as readonly string[]).includes(outcome))
    return { ok: false, error: "Please choose a valid call outcome." };

  const calledAt = calledAtRaw ? new Date(calledAtRaw).toISOString() : new Date().toISOString();
  const durationSeconds = parseInt(duration, 10);
  const validDuration = Number.isFinite(durationSeconds) && durationSeconds >= 0 ? durationSeconds : null;

  const nextFollowUpAt = nextFollowUpRaw ? new Date(nextFollowUpRaw).toISOString() : null;

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id,status,user_id,full_name")
    .eq("id", leadId)
    .single();
  if (leadError || !lead) return { ok: false, error: "Lead not found." };

  const { error: callError } = await supabase.from("calls").insert({
    lead_id: leadId,
    user_id: user.user.id,
    called_at: calledAt,
    duration_seconds: validDuration,
    outcome,
    notes,
    follow_up_required: followUpRequired || callAgain || !!nextFollowUpAt,
    next_follow_up_at: nextFollowUpAt,
  });
  if (callError) return { ok: false, error: `Could not save call: ${callError.message}` };

  // Reflect outcome on the lead
  const newStatus = OUTCOME_TO_STATUS[outcome as keyof typeof OUTCOME_TO_STATUS];
  await supabase
    .from("leads")
    .update({
      status: newStatus ?? lead.status,
      last_contacted_at: calledAt,
      ...(nextFollowUpAt ? { next_follow_up_at: nextFollowUpAt } : {}),
    })
    .eq("id", leadId);

  await supabase.from("activities").insert({
    lead_id: leadId,
    user_id: user.user.id,
    type: "call",
    title: `Called ${lead.full_name}`,
    description: notes ? `${outcome}. ${notes}` : outcome,
    metadata: { outcome, duration_seconds: validDuration },
  });

  // Schedule follow-up when requested
  if ((followUpRequired || callAgain) && nextFollowUpAt) {
    const { error: fuError } = await supabase
      .from("follow_ups")
      .insert({
        lead_id: leadId,
        user_id: user.user.id,
        title: `Follow up after call (${outcome})`,
        due_at: nextFollowUpAt,
        status: "Pending",
        notes,
      })
      .select("id")
      .single();
    if (!fuError) {
      await supabase.from("activities").insert({
        lead_id: leadId,
        user_id: user.user.id,
        type: "followup",
        title: "Follow-up scheduled",
        description: `Scheduled for ${new Date(nextFollowUpAt).toLocaleString()}.`,
      });
    }
  }

  // Notifications
  if (outcome === "Meeting Booked") {
    await supabase.from("notifications").insert({
      user_id: user.user.id,
      lead_id: leadId,
      type: "meeting",
      title: "Meeting booked",
      message: `Meeting booked with ${lead.full_name}.`,
    });
  }
  if (nextFollowUpAt) {
    const dueInMs = new Date(nextFollowUpAt).getTime() - Date.now();
    if (dueInMs <= 24 * 60 * 60 * 1000) {
      await supabase.from("notifications").insert({
        user_id: user.user.id,
        lead_id: leadId,
        type: "followup_due",
        title: "Follow-up due soon",
        message: `Follow-up with ${lead.full_name} due ${new Date(nextFollowUpAt).toLocaleString()}.`,
      });
    }
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/calls");
  revalidatePath("/follow-ups");
  revalidatePath("/pipeline");
  revalidatePath("/analytics");
  revalidatePath("/");
  return { ok: true, message: "Call logged." };
}

export async function deleteCall(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("calls").delete().eq("id", id);
  if (error) return { ok: false, error: `Could not delete call: ${error.message}` };
  revalidatePath("/calls");
  revalidatePath("/analytics");
  revalidatePath("/");
  return { ok: true };
}

export async function getCallById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("calls").select("*").eq("id", id).single();
  return data;
}