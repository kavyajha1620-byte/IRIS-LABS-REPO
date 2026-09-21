"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { TASK_PRIORITIES } from "@/lib/constants";
import { dateInputValue } from "@/lib/utils";
import type { Task } from "@/lib/types";

export function TaskModal({
  open,
  onClose,
  task,
  leads,
}: {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  leads: Array<{ id: string; full_name: string }>;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const isEdit = Boolean(task);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    if (isEdit && task) fd.set("id", task.id);
    const res = isEdit && task ? await updateTask(fd) : await createTask(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success(isEdit ? "Task updated" : "Task created");
    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit task" : "New task"}
      description="Stay on top of your day — one action at a time."
      size="sm"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" loading={pending}>
            {isEdit ? "Save changes" : "Create task"}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {isEdit && task && <input type="hidden" name="status" value={task.status} />}
        <div>
          <Label htmlFor="task-title">Title</Label>
          <Input id="task-title" name="title" defaultValue={task?.title ?? ""} placeholder="Follow up with James" required />
        </div>
        <div>
          <Label htmlFor="task-desc">Details</Label>
          <Textarea id="task-desc" name="description" rows={2} defaultValue={task?.description ?? ""} placeholder="Optional notes…" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="task-due">Due date & time</Label>
            <Input
              id="task-due"
              name="due_at"
              type="datetime-local"
              defaultValue={task?.due_at ? dateInputValue(task.due_at) : ""}
            />
          </div>
          <div>
            <Label htmlFor="task-priority">Priority</Label>
            <Select id="task-priority" name="priority" defaultValue={task?.priority ?? "Medium"}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="task-lead">Related lead (optional)</Label>
          <Select id="task-lead" name="lead_id" defaultValue={task?.lead_id ?? ""} disabled={isEdit}>
            <option value="">None</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.full_name}
              </option>
            ))}
          </Select>
        </div>
      </form>
    </Modal>
  );
}