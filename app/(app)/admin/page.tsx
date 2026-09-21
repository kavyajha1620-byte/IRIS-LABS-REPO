import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTeamSummary } from "@/lib/actions/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UsersManager } from "@/components/admin/users-manager";
import { WorkloadTable } from "@/components/admin/workload-table";

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

  const { data: leadRows } = await supabase
    .from("leads")
    .select("assigned_to, status")
    .limit(10000);
  const leads = (leadRows ?? []).map((l) => ({
    assigned_to: l.assigned_to as string | null,
    status: String(l.status ?? ""),
  }));

  const assignableMembers = members
    .filter((m) => ["owner", "admin", "salesperson"].includes(m.role))
    .map((m) => ({
      id: m.user_id,
      full_name: m.full_name,
      email: m.email,
      role: m.role,
      lead_count: Number(m.lead_count ?? 0),
    }));

  return (
    <>
      <PageHeader
        title="Admin"
        subtitle="Users, roles, team lead counts and workload."
      />
      <div className="space-y-4">
        <Card>
          <CardContent className="p-0 sm:p-0">
            <UsersManager members={members} currentUserId={user.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team workload</CardTitle>
            <CardDescription>
              Assigned leads and status buckets per caller. Batch-assign or round-robin from the
              Leads page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkloadTable members={assignableMembers} leads={leads} />
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