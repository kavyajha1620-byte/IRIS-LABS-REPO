import { createClient } from "@/lib/supabase/server";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const [leadsRes, callsRes, followUpsRes] = await Promise.all([
    supabase.from("leads").select("created_at,status").order("created_at", { ascending: false }).limit(5000),
    supabase.from("calls").select("called_at,outcome,duration_seconds").order("called_at", { ascending: false }).limit(5000),
    supabase.from("follow_ups").select("status,completed_at,updated_at").limit(5000),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Analytics" subtitle="Measure your cold calling results" />
      <AnalyticsView
        leads={leadsRes.data ?? []}
        calls={callsRes.data ?? []}
        followUps={followUpsRes.data ?? []}
      />
    </div>
  );
}