import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,role,avatar_url,created_at")
    .eq("id", user.id)
    .single();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(15);

  return { user, profile, notifications: notifications ?? [] };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, notifications } = await getUser();
  if (!user) return null;

  const userName = profile?.full_name || (user.user_metadata?.full_name as string) || "";

  return (
    <div className="flex min-h-full bg-background">
      <Sidebar userName={userName} userEmail={user.email ?? ""} role={profile?.role} />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar userName={userName} userEmail={user.email ?? ""} notifications={notifications} />
        <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-8 lg:pt-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
      <MobileNav role={profile?.role} />
    </div>
  );
}