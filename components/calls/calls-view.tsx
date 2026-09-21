"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PhoneCall, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";
import { deleteCall } from "@/lib/actions/calls";
import { CALL_OUTCOMES, CALL_OUTCOME_COLORS } from "@/lib/constants";
import { formatDateTime, formatDuration, timeAgo, telHref } from "@/lib/utils";

const PAGE_SIZE = 25;

export interface CallRow {
  id: string;
  called_at: string;
  duration_seconds: number | null;
  outcome: string;
  notes: string | null;
  lead: { full_name: string; phone: string | null; company: string | null; status: string } | null;
}

export function CallsView({ calls }: { calls: CallRow[] }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [outcome, setOutcome] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [deleting, setDeleting] = React.useState<CallRow | null>(null);
  const [pending, setPending] = React.useState(false);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return calls.filter((c) => {
      if (outcome && c.outcome !== outcome) return false;
      if (query && !c.lead?.full_name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [calls, q, outcome]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function onDelete() {
    if (!deleting) return;
    setPending(true);
    const res = await deleteCall(deleting.id);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Call deleted");
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by lead name…"
            className="pl-9"
          />
        </div>
        <Select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="w-44">
          <option value="">All outcomes</option>
          {CALL_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} call{filtered.length === 1 ? "" : "s"} · {calls.length} logged total
      </p>

      {items.length === 0 ? (
        <EmptyState
          icon={<PhoneCall className="h-6 w-6" />}
          title="No calls yet"
          description="Open a lead and use 'Log call' to record your first call."
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((c) => {
                  const color = CALL_OUTCOME_COLORS[c.outcome as keyof typeof CALL_OUTCOME_COLORS] ?? "#64748b";
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1a`, color }}>
                            <PhoneCall className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{c.lead?.full_name ?? "Deleted lead"}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {c.lead?.company ?? "—"}
                              {c.lead?.phone ? ` · ${c.lead.phone}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground" title={formatDateTime(c.called_at)}>
                        {timeAgo(c.called_at)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDuration(c.duration_seconds)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className="border"
                          style={{ color, backgroundColor: `${color}14`, borderColor: `${color}33` }}
                        >
                          {c.outcome}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="block max-w-[240px] truncate">{c.notes || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDeleting(c)}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-red-600"
                          aria-label="Delete call"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="flex flex-col gap-3 md:hidden">
            {items.map((c) => {
              const color = CALL_OUTCOME_COLORS[c.outcome as keyof typeof CALL_OUTCOME_COLORS] ?? "#64748b";
              return (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{c.lead?.full_name ?? "Deleted lead"}</p>
                      <p className="text-xs text-muted-foreground">{c.lead?.company ?? "—"}</p>
                    </div>
                    <Badge
                      className="border"
                      style={{ color, backgroundColor: `${color}14`, borderColor: `${color}33` }}
                    >
                      {c.outcome}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{timeAgo(c.called_at)}</span>
                    <span>·</span>
                    <span>{formatDuration(c.duration_seconds)}</span>
                    {c.lead?.phone && (
                      <a href={telHref(c.lead.phone)} className="font-medium text-primary">
                        Call
                      </a>
                    )}
                  </div>
                  {c.notes && <p className="mt-2 text-sm text-muted-foreground">{c.notes}</p>}
                </div>
              );
            })}
          </div>
        </>
      )}

      <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={pending}
        title="Delete call"
        description="This call record will be removed."
      />
    </div>
  );
}