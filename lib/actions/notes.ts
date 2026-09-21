"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./leads";

export async function addNote(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Not authenticated." };

  const leadId = String(formData.get("lead_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!leadId) return { ok: false, error: "Missing lead." };
  if (!content) return { ok: false, error: "Note cannot be empty." };

  const { error } = await supabase.from("notes").insert({
    lead_id: leadId,
    user_id: user.user.id,
    content,
  });
  if (error) return { ok: false, error: `Could not add note: ${error.message}` };

  const { data: lead } = await supabase
    .from("leads")
    .select("full_name")
    .eq("id", leadId)
    .single();

  await supabase.from("activities").insert({
    lead_id: leadId,
    user_id: user.user.id,
    type: "note",
    title: "Note added",
    description: content.length > 140 ? `${content.slice(0, 140)}…` : content,
  });

  void lead;

  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: note } = await supabase
    .from("notes")
    .select("lead_id")
    .eq("id", id)
    .single();
  if (!note) return { ok: false, error: "Note not found." };

  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) return { ok: false, error: `Could not delete note: ${error.message}` };
  revalidatePath(`/leads/${note.lead_id}`);
  return { ok: true };
}