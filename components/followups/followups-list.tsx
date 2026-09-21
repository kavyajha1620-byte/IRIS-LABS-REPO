"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarClock,
  Check,
  Pencil,
  X,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FollowUpModal } from "@/components/followups/followup-modal";
import {
  completeFollowUp,
  cancelFollowUp,
  deleteFollowUp,
} from "@/lib/actions/followups";
import { formatDateTime, isOverdue, isDueToday } from "@/lib/utils";
import type { FollowUp } from "@/lib/types";

export function FollowUpsList({
  followUps,
  leadMap,
  showLead = true,
}: {
  followUps: FollowUp[];
  leadMap: Map<string, { full_name: string }>;
  showLead?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<FollowUp | null>(null);
  const [confirming, setConfirming] = React.useState<FollowUp | null>(null);
  const [action, setAction] = React.useState<"complete" | "cancel" | "delete">("delete");
  const [pending, setPending] = React.useState(false);

  async function run(fu: FollowUp, act: typeof action) {
    setPending(true);
    const res =
      act === "complete"
        ? await completeFollowUp(fu.id)
        : act === "cancel"
          ? await cancelFollowUp(fu.id)
          : await deleteFollowUp(fu.id);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(act === "complete" ? "Follow-up completed" : act === "cancel" ? "Follow-up cancelled" : "Follow-up deleted");
    setConfirming(null);
    router.refresh();
  }

  if (!followUps.length) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-5 w-5" />}
        title="No follow-ups"
        description="Schedule one to stop losing callbacks."
        className="py-8"
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {followUps.map((fu) => {
        const meta = fu.lead_id ? leadMap.get(fu.lead_id) : undefined;
        const overdue = fu.status === "Pending" && isOverdue(fu.due_at);
        const dueToday = fu.status === "Pending" && isDueToday(fu.due_at);
        return (
          <li
            key={fu.id}
            className={`rounded-xl border p-3.5 ${
              overdue ? "border-red-200 bg-red-50/60" : "border-border bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{fu.title}</p>
                {showLead && meta && (
                  <Link href={`/leads/${fu.lead_id}`} className="mt-0.5 flex items-center gap-1 text-xs text-primary hover:underline">
                    {meta.full_name} <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
                {fu.notes && <p className="mt-1 text-xs text-muted-foreground">{fu.notes}</p>}
              </div>
              {fu.status === "Pending" ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => void run(fu, "complete")}
                    className="rounded-lg bg-emerald-600 p-1.5 text-white transition-colors hover:bg-emerald-500"
                    title="Complete"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setEditing(fu);
                    }}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                    title="Reschedule / edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setAction("cancel");
                      setConfirming(fu);
                    }}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                    title="Cancel follow-up"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setAction("delete");
                      setConfirming(fu);
                    }}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-red-600"
                    title="Delete follow-up"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    fu.status === "Completed"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {fu.status}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              <span className={overdue ? "font-medium text-red-600" : dueToday ? "font-medium text-amber-600" : ""}>
                {formatDateTime(fu.due_at)}
              </span>
              {overdue && <span className="font-medium text-red-600">Overdue</span>}
            </div>
          </li>
        );
      })}

      <FollowUpModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        leadId={editing?.lead_id ?? ""}
        followUp={editing}
      />
      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={() => confirming && run(confirming, action)}
        loading={pending}
        title={action === "cancel" ? "Cancel follow-up" : action === "delete" ? "Delete follow-up" : "Complete follow-up"}
        description={
          action === "cancel"
            ? "This follow-up will be marked as cancelled."
            : action === "delete"
              ? "This follow-up will be removed permanently."
              : undefined
        }
        confirmLabel={action === "complete" ? "Complete" : action === "cancel" ? "Cancel" : "Delete"}
      />
    </ul>
  );
}