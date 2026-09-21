import { createClient } from "@/lib/supabase/server";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(5000);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Pipeline" subtitle="Drag & drop leads as they move through your stages" />
      <PipelineBoard initialLeads={leads ?? []} />
    </div>
  );
}