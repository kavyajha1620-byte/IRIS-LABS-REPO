"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./leads";

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Not authenticated." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { ok: false, error: "Full name is required." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.user.id);
  if (error) return { ok: false, error: `Could not update profile: ${error.message}` };

  const { error: metaError } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });
  if (metaError) return { ok: false, error: `Could not update user: ${metaError.message}` };

  revalidatePath("/settings", "layout");
  return { ok: true };
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const newPassword = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (newPassword.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (newPassword !== confirm) return { ok: false, error: "Passwords do not match." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Password updated." };
}