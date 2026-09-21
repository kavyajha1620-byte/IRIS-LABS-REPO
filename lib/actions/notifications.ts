"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./leads";

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false)
    .eq("user_id", user.user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearNotifications(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("read", true)
    .eq("user_id", user.user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}