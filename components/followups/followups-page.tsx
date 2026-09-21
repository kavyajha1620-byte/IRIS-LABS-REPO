"use client";

import * as React from "react";
import { CalendarClock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FollowUpsList } from "@/components/followups/followups-list";
import { FollowUpModal } from "@/components/followups/followup-modal";
import { cn, isOverdue, isDueToday } from "@/lib/utils";
import type { FollowUp } from "@/lib/types";

export interface FollowUpWithLead extends FollowUp {
  lead: { full_name: string; id: string } | null;
}

type Tab = "due-today" | "overdue" | "upcoming" | "pending" | "completed";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "due-today", label: "Due today" },
  { id: "overdue", label: "Overdue" },
  { id: "upcoming", label: "Upcoming" },
  { id: "pending", label: "All pending" },
  { id: "completed", label: "Completed" },
];

export function FollowUpsPage({
  followUps,
  leads,
}: {
  followUps: FollowUpWithLead[];
  leads: Array<{ id: string; full_name: string; phone: string | null }>;
}) {
  const [tab, setTab] = React.useState<Tab>("due-today");
  const [createOpen, setCreateOpen] = React.useState(false);

  const leadMap = new Map(
    followUps.filter((f) => f.lead).map((f) => [f.lead!.id, { full_name: f.lead!.full_name }])
  );

  const [nowMs] = React.useState(() => Date.now());
  const in7dMs = nowMs + 7 * 24 * 3600 * 1000;

  const filtered = React.useMemo(() => {
    return followUps.filter((f) => {
      switch (tab) {
        case "due-today":
          return f.status === "Pending" && isDueToday(f.due_at);
        case "overdue":
          return f.status === "Pending" && isOverdue(f.due_at);
        case "upcoming": {
          if (f.status !== "Pending") return false;
          const t = new Date(f.due_at).getTime();
          return t > nowMs && t <= in7dMs;
        }
        case "pending":
          return f.status === "Pending";
        case "completed":
          return f.status !== "Pending";
      }
    });
  }, [followUps, tab, nowMs, in7dMs]);

  const counts: Record<Tab, number> = {
    "due-today": followUps.filter((f) => f.status === "Pending" && isDueToday(f.due_at)).length,
    overdue: followUps.filter((f) => f.status === "Pending" && isOverdue(f.due_at)).length,
    upcoming: followUps.filter((f) => {
      if (f.status !== "Pending") return false;
      const t = new Date(f.due_at).getTime();
      return t > nowMs && t <= in7dMs;
    }).length,
    pending: followUps.filter((f) => f.status === "Pending").length,
    completed: followUps.filter((f) => f.status !== "Pending").length,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.id ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {t.label}
              {counts[t.id] > 0 && (
                <span className={cn("ml-1.5 rounded-full px-1.5 text-[11px]", tab === t.id ? "bg-white/20" : "bg-muted")}>
                  {counts[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>
        <Button onClick={() => setCreateOpen(true)} className="ml-auto">
          <Plus className="h-4 w-4" /> Schedule
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title={
            tab === "completed" ? "No completed follow-ups" : tab === "overdue" ? "Nothing is overdue" : "No follow-ups here"
          }
          description={
            tab === "due-today"
              ? "Callbacks due today will show up here."
              : "Schedule follow-ups so you never miss a callback."
          }
        />
      ) : (
        <div className="mx-auto w-full max-w-2xl">
          <FollowUpsList followUps={filtered} leadMap={leadMap} showLead />
        </div>
      )}

      <FollowUpModal open={createOpen} onClose={() => setCreateOpen(false)} leads={leads} />
    </div>
  );
}