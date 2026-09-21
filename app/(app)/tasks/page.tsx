import { createClient } from "@/lib/supabase/server";
import { TasksView } from "@/components/tasks/tasks-view";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: tasks } = await supabase.from("tasks").select("*").order("due_at", { ascending: true }).limit(2000);
  const { data: leads } = await supabase.from("leads").select("id,full_name").order("full_name").limit(5000);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tasks"
        subtitle={`${tasks?.filter((t) => t.status === "Pending").length ?? 0} open · ${tasks?.filter((t) => t.status === "Completed").length ?? 0} completed`}
      />
      <TasksView tasks={tasks ?? []} leads={(leads ?? []) as Array<{ id: string; full_name: string }>} />
    </div>
  );
}