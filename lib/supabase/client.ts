import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, getSupabaseKey } from "@/lib/env";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, getSupabaseKey());
}