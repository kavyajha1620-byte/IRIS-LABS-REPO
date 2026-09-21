"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TASK_PRIORITIES } from "@/lib/constants";
import type { ActionResult } from "./leads";

export async function createTask(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Not authenticated." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const dueRaw = String(formData.get("due_at") ?? "");
  const priority = String(formData.get("priority") ?? "Medium");
  const leadId = String(formData.get("lead_id") ?? "") || null;

  if (!title) return { ok: false, error: "Task title is required." };
  if (!(TASK_PRIORITIES as readonly string[]).includes(priority))
    return { ok: false, error: "Invalid priority." };

  const dueAt = dueRaw ? new Date(dueRaw).toISOString() : null;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.user.id,
      lead_id: leadId,
      title,
      description,
      due_at: dueAt,
      priority,
      status: "Pending",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: `Could not create task: ${error.message}` };

  if (leadId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("full_name")
      .eq("id", leadId)
      .single();
    await supabase.from("activities").insert({
      lead_id: leadId,
      user_id: user.user.id,
      type: "task",
      title: "Task added",
      description: `${title}${lead ? ` for ${lead.full_name}` : ""}.`,
    });
  }

  if (dueAt) {
    const dueInMs = new Date(dueAt).getTime() - Date.now();
    if (dueInMs <= 24 * 60 * 60 * 1000 && dueInMs > 0) {
      await supabase.from("notifications").insert({
        user_id: user.user.id,
        lead_id: leadId,
        type: "task_due",
        title: "Task due soon",
        message: title,
      });
    }
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true, id: task.id };
}

export async function updateTask(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const dueRaw = String(formData.get("due_at") ?? "");
  const priority = String(formData.get("priority") ?? "Medium");
  const status = String(formData.get("status") ?? "Pending");

  if (!id) return { ok: false, error: "Missing task." };
  if (!title) return { ok: false, error: "Task title is required." };
  if (!(TASK_PRIORITIES as readonly string[]).includes(priority))
    return { ok: false, error: "Invalid priority." };

  const dueAt = dueRaw ? new Date(dueRaw).toISOString() : null;

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description,
      due_at: dueAt,
      priority,
      status,
      completed_at: status === "Completed" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: `Could not update task: ${error.message}` };

  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true };
}

export async function setTaskStatus(id: string, status: string): Promise<ActionResult> {
  const supabase = await createClient();
  if (!["Pending", "Completed"].includes(status)) return { ok: false, error: "Invalid status." };
  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      completed_at: status === "Completed" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: `Could not update task: ${error.message}` };
  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: `Could not delete task: ${error.message}` };
  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true };
}