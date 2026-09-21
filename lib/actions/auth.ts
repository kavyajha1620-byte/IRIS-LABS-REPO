"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthResult = { ok: true; message?: string } | { ok: false; error: string };

export async function loginUser(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: friendlyAuthError(error.message) };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function signupUser(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!email || !password) return { ok: false, error: "Email and password are required." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || email.split("@")[0] },
    },
  });

  if (error) {
    return { ok: false, error: friendlyAuthError(error.message) };
  }

  if (!data.session) {
    // Email confirmation required.
    return { ok: true, message: "Account created. Check your inbox to confirm your email, then sign in." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function logoutUser() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function sendPasswordReset(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Email is required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/reset-password`,
  });
  if (error) {
    return { ok: false, error: friendlyAuthError(error.message) };
  }
  return { ok: true, message: "If that email exists, a reset link has been sent." };
}

export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: friendlyAuthError(error.message) };
  return { ok: true, message: "Password updated. You can now sign in with your new password." };
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Invalid email or password.";
  if (m.includes("already registered")) return "An account with this email already exists.";
  if (m.includes("email not confirmed")) return "Please confirm your email address first.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  return message;
}