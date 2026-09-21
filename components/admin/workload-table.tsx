"use client";

import * as React from "react";
import { UserCircle2 } from "lucide-react";
import type { AssignableUser } from "@/lib/actions/leads";

const BUCKETS: Array<{ key: string; label: string; match: (s: string) => boolean }> = [
  { key: "total", label: "Leads", match: () => true },
  { key: "new", label: "New", match: (s) => s === "New" || s === "Not Called" },
  { key: "active", label: "In play", match: (s) =>
    ["Called", "Interested", "Qualified", "Follow-up", "Meeting Booked", "Proposal Sent", "Negotiation"].includes(s) },
  { key: "won", label: "Won", match: (s) => s === "Won" },
  { key: "lost", label: "Lost", match: (s) => ["Lost", "Not Interested", "Wrong Number", "Do Not Contact"].includes(s) },
];

export function WorkloadTable({
  members,
  leads,
}: {
  members: AssignableUser[];
  leads: Array<{ assigned_to: string | null; status: string }>;
}) {
  const rows = React.useMemo(() => {
    return members
      .map((m) => {
        const mine = leads.filter((l) => l.assigned_to === m.id);
        const totals: Record<string, number> = { total: mine.length };
        for (const bucket of BUCKETS.slice(1)) {
          totals[bucket.key] = mine.filter((l) => bucket.match(l.status)).length;
        }
        return { member: m, totals };
      })
      .filter((r) => r.totals.total > 0)
      .sort((a, b) => b.totals.total - a.totals.total);
  }, [members, leads]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No assigned leads yet. Assign leads (or run round-robin) from the Leads page to distribute
        the workload.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Caller</th>
            {BUCKETS.map((b) => (
              <th key={b.key} className="px-4 py-3 text-right">
                {b.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(({ member, totals }) => (
            <tr key={member.id} className="hover:bg-muted/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <UserCircle2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{member.full_name ?? "Unnamed"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email ?? member.id.slice(0, 8)} · {member.role}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {totals.total}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{totals.new}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{totals.active}</td>
              <td className="px-4 py-3 text-right tabular-nums text-emerald-600">{totals.won}</td>
              <td className="px-4 py-3 text-right tabular-nums text-red-600">{totals.lost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}