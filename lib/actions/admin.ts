"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/leads";

const ROLES = ["owner", "admin", "salesperson"] as const;
export type Role = (typeof ROLES)[number];

export interface TeamMember {
  user_id: string;
  email: string | null;
  full_name: string;
  role: string;
  lead_count: number;
  created_at: string;
}

export async function getTeamSummary(): Promise<TeamMember[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.rpc("admin_team_summary");
  if (!Array.isArray(data)) return [];
  return data as TeamMember[];
}

export async function setUserRole(userId: string, role: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  if (!(ROLES as readonly string[]).includes(role)) {
    return { ok: false, error: "Invalid role." };
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!me || (me.role !== "owner" && me.role !== "admin")) {
    return { ok: false, error: "Admins only." };
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id,role")
    .eq("id", userId)
    .single();
  if (!target) return { ok: false, error: "User not found." };

  // The owner role is reserved for the owner account.
  if (me.role !== "owner") {
    if (target.role === "owner" || role === "owner") {
      return { ok: false, error: "Only the owner can manage the owner role." };
    }
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: `Could not update role: ${error.message}` };

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}