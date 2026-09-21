"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GripVertical, Search, Phone, CalendarClock, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { changeLeadStatus } from "@/lib/actions/leads";
import { PIPELINE_COLUMNS, PRIORITY_COLORS, STATUS_COLORS, type LeadStatus } from "@/lib/constants";
import { cn, formatDateTime, telHref } from "@/lib/utils";
import type { Lead } from "@/lib/types";

export function PipelineBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const router = useRouter();
  const [leads, setLeads] = React.useState<Lead[]>(initialLeads);
  const [q, setQ] = React.useState("");
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [overCol, setOverCol] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const visible = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return leads;
    return leads.filter(
      (l) =>
        l.full_name.toLowerCase().includes(query) ||
        (l.company ?? "").toLowerCase().includes(query) ||
        (l.phone ?? "").toLowerCase().includes(query)
    );
  }, [leads, q]);

  async function handleDrop(status: string) {
    if (!draggingId || busy) return;
    const lead = leads.find((l) => l.id === draggingId);
    if (!lead || lead.status === status) {
      setDraggingId(null);
      setOverCol(null);
      return;
    }
    setOverCol(null);
    setLeads((prev) => prev.map((l) => (l.id === draggingId ? { ...l, status: status as LeadStatus } : l)));
    setDraggingId(null);
    setBusy(true);
    const res = await changeLeadStatus(draggingId, status);
    setBusy(false);
    if (!res.ok) {
      setLeads((prev) => prev.map((l) => (l.id === draggingId ? { ...l, status: lead.status } : l)));
      toast.error(res.error);
      return;
    }
    toast.success(`${lead.full_name} moved to ${status}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by name, company or phone…"
            className="pl-9"
          />
        </div>
        <Link href="/leads/new" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New lead
        </Link>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<GripVertical className="h-6 w-6" />}
          title="No leads to show"
          description="Drag cards between columns to update their status."
        />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4">
          <div className="flex min-w-max gap-4">
            {PIPELINE_COLUMNS.map((col) => {
              const color = STATUS_COLORS[col.status] ?? "#64748b";
              const items = visible.filter((l) => l.status === col.status);
              const isOver = overCol === col.status;
              return (
                <div
                  key={col.status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverCol(col.status);
                  }}
                  onDragLeave={() => setOverCol((v) => (v === col.status ? null : v))}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(col.status);
                  }}
                  className={cn(
                    "flex h-[calc(100vh-230px)] w-72 shrink-0 flex-col rounded-2xl border border-border bg-muted/50 transition-colors",
                    isOver && "border-primary/60 bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 px-3.5 pt-3.5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <h3 className="text-sm font-semibold">{col.title}</h3>
                      <span className="rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-3.5 pb-3.5">
                    {items.map((l) => (
                      <div
                        key={l.id}
                        draggable
                        onDragStart={() => setDraggingId(l.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setOverCol(null);
                        }}
                        className={cn(
                          "group cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing",
                          draggingId === l.id && "opacity-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/leads/${l.id}`} className="min-w-0">
                            <p className="truncate text-sm font-semibold hover:text-primary">{l.full_name}</p>
                            <p className="truncate text-xs text-muted-foreground">{l.company ?? "No company"}</p>
                          </Link>
                          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-opacity group-hover:text-muted-foreground" />
                        </div>

                        <div className="mt-2.5 flex items-center gap-2">
                          <span
                            className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                            style={{
                              color: PRIORITY_COLORS[l.priority],
                              backgroundColor: `${PRIORITY_COLORS[l.priority]}14`,
                            }}
                          >
                            {l.priority}
                          </span>
                          {l.next_follow_up_at && <CalendarClock className="h-3 w-3 text-muted-foreground" />}
                          {l.next_follow_up_at && (
                            <span className="text-[11px] text-muted-foreground">
                              {formatDateTime(l.next_follow_up_at)}
                            </span>
                          )}
                        </div>

                        {l.phone && (
                          <div className="mt-2 flex items-center text-xs text-muted-foreground">
                            <a href={telHref(l.phone)} className="flex items-center gap-1 font-medium text-primary">
                              <Phone className="h-3 w-3" /> {l.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                        Drop a card here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}