import Link from "next/link";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LeadsView } from "@/components/leads/leads-view";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Leads"
        subtitle={`${leads?.length ?? 0} total · search, filter, import and export`}
        actions={
          <>
            <Link href="/leads/import">
              <Button variant="outline">
                <Upload className="h-4 w-4" /> Import CSV
              </Button>
            </Link>
            <Link href="/leads/new">
              <Button>New Lead</Button>
            </Link>
          </>
        }
      />
      {error ? (
        <EmptyState title="Could not load leads" description={error.message} />
      ) : (
        <LeadsView leads={leads ?? []} userId={user.id} />
      )}
    </div>
  );
}