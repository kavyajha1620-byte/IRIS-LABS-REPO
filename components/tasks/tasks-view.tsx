"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TaskModal } from "@/components/tasks/task-form";
import { setTaskStatus, deleteTask } from "@/lib/actions/tasks";
import { PRIORITY_COLORS } from "@/lib/constants";
import { cn, isOverdue, formatDate } from "@/lib/utils";
import type { Task } from "@/lib/types";

export function TasksView({
  tasks,
  leads,
}: {
  tasks: Task[];
  leads: Array<{ id: string; full_name: string }>;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [view, setView] = React.useState<"open" | "done">("open");
  const [editTask, setEditTask] = React.useState<Task | null | undefined>(undefined);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Task | null>(null);
  const [pending, setPending] = React.useState(false);
  const [toggling, setToggling] = React.useState<string | null>(null);

  const leadName = new Map(leads.map((l) => [l.id, l.full_name]));

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (view === "open" && t.status !== "Pending") return false;
      if (view === "done" && t.status !== "Completed") return false;
      if (query && !t.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [tasks, q, view]);

  const openCount = tasks.filter((t) => t.status === "Pending").length;
  const doneCount = tasks.filter((t) => t.status === "Completed").length;

  async function onToggle(task: Task) {
    setToggling(task.id);
    const res = await setTaskStatus(task.id, task.status === "Completed" ? "Pending" : "Completed");
    setToggling(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(task.status === "Completed" ? "Task reopened" : "Task completed");
    router.refresh();
  }

  async function onDelete() {
    if (!deleting) return;
    setPending(true);
    const res = await deleteTask(deleting.id);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Task deleted");
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className="pl-9" />
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          <button
            onClick={() => {
              setView("open");
              setQ("");
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              view === "open" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
            )}
          >
            Open · {openCount}
          </button>
          <button
            onClick={() => {
              setView("done");
              setQ("");
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              view === "done" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
            )}
          >
            Completed · {doneCount}
          </button>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6" />}
          title={view === "open" ? "All clear" : "Nothing completed yet"}
          description={view === "open" ? "Create tasks to stay on top of your calls and follow-ups." : "Completed tasks land here."}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => {
            const overdue = t.status === "Pending" && t.due_at && isOverdue(t.due_at);
            const color = PRIORITY_COLORS[t.priority];
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-colors hover:bg-muted/40"
              >
                <button
                  onClick={() => onToggle(t)}
                  disabled={toggling === t.id}
                  className="shrink-0 text-muted-foreground hover:text-primary"
                  aria-label="Toggle task"
                >
                  {t.status === "Completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-medium", t.status === "Completed" && "text-muted-foreground line-through")}>
                    {t.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                      style={{ color, backgroundColor: `${color}14` }}
                    >
                      {t.priority}
                    </span>
                    {t.due_at && (
                      <span className={cn(overdue && "font-semibold text-red-600")}>
                        Due {formatDate(t.due_at)}
                        {overdue ? " · overdue" : ""}
                      </span>
                    )}
                    {t.lead_id && leadName.has(t.lead_id) && <span>· {leadName.get(t.lead_id)}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditTask(t)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Edit task"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(t)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-red-600"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskModal open={createOpen} onClose={() => setCreateOpen(false)} task={null} leads={leads} />
      <TaskModal
        open={Boolean(editTask)}
        onClose={() => setEditTask(undefined)}
        task={editTask}
        leads={leads}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={pending}
        title="Delete task"
        description="This task will be removed."
      />
    </div>
  );
}