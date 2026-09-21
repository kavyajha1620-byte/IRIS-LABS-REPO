import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTeamSummary } from "@/lib/actions/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { UsersManager } from "@/components/admin/users-manager";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
    redirect("/");
  }

  const members = await getTeamSummary();

  return (
    <>
      <PageHeader
        title="Admin"
        subtitle="Users, roles and team lead counts."
      />
      <div className="space-y-4">
        <Card>
          <CardContent className="p-0 sm:p-0">
            <UsersManager members={members} currentUserId={user.id} />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Roles:</span>{" "}
              <span className="font-medium text-foreground">Owner</span> manages everything and
              can assign the owner role · <span className="font-medium text-foreground">Admin</span>{" "}
              manages users and roles (except the owner) ·{" "}
              <span className="font-medium text-foreground">Salesperson</span> works their own leads,
              calls, follow-ups and research.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}