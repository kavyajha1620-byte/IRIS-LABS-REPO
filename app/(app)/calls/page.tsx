import { createClient } from "@/lib/supabase/server";
import { CallsView } from "@/components/calls/calls-view";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Calls" };

export default async function CallsPage() {
  const supabase = await createClient();
  const { data: calls } = await supabase
    .from("calls")
    .select("*, lead:leads(full_name,phone,company,status)")
    .order("called_at", { ascending: false })
    .limit(2000);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Calls" subtitle="Every call you log, in one place" />
      <CallsView
        calls={(calls ?? []) as unknown as Array<{
          id: string;
          called_at: string;
          duration_seconds: number | null;
          outcome: string;
          notes: string | null;
          lead: { full_name: string; phone: string | null; company: string | null; status: string } | null;
        }>}
      />
    </div>
  );
}