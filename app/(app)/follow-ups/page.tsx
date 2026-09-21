import { createClient } from "@/lib/supabase/server";
import { FollowUpsPage, type FollowUpWithLead } from "@/components/followups/followups-page";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Follow-ups" };

export default async function FollowUpsPageRoute() {
  const supabase = await createClient();
  const { data: followUps } = await supabase
    .from("follow_ups")
    .select("*, lead:leads(id,full_name)")
    .order("due_at", { ascending: true })
    .limit(3000);

  const { data: leads } = await supabase
    .from("leads")
    .select("id,full_name,phone")
    .order("full_name")
    .limit(5000);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Follow-ups" subtitle="Everything you've promised to do" />
      <FollowUpsPage
        followUps={(followUps ?? []) as FollowUpWithLead[]}
        leads={(leads ?? []) as Array<{ id: string; full_name: string; phone: string | null }>}
      />
    </div>
  );
}