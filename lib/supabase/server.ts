import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, getSupabaseKey } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL,
    getSupabaseKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — safe to ignore,
            // middleware already refreshed the session for us.
          }
        },
      },
    }
  );
}