export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export function getSupabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  );
}

export const isSupabaseConfigured = Boolean(SUPABASE_URL && getSupabaseKey());