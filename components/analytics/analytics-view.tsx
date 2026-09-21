"use client";

import * as React from "react";
import { subDays, format } from "date-fns";
import { PhoneCall, Users, CalendarCheck, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CallsBarChart } from "@/components/charts/calls-bar-chart";
import { LeadsAreaChart } from "@/components/charts/leads-area-chart";
import { StatusDonutChart } from "@/components/charts/status-donut-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { STATUS_COLORS, PIPELINE_COLUMNS, type LeadStatus } from "@/lib/constants";
import { cn, pct } from "@/lib/utils";

type Range = "14d" | "30d" | "90d" | "12m" | "all";

type LeadRow = { created_at: string; status: LeadStatus };
type CallRow = { called_at: string; outcome: string; duration_seconds: number | null };
type FollowUpRow = { status: string; completed_at: string | null; updated_at: string };

const RANGES: Array<{ id: Range; label: string }> = [
  { id: "14d", label: "14 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "12m", label: "12 months" },
  { id: "all", label: "All time" },
];

function rangeToDays(r: Range): number | null {
  if (r === "all") return null;
  return { "14d": 14, "30d": 30, "90d": 90, "12m": 365 }[r] ?? 30;
}

export function AnalyticsView({
  leads,
  calls,
  followUps,
}: {
  leads: LeadRow[];
  calls: CallRow[];
  followUps: FollowUpRow[];
}) {
  const [range, setRange] = React.useState<Range>("30d");

  const days = rangeToDays(range);
  const cutoff = days ? subDays(new Date(), days - 1).getTime() : 0;

  const inRange = (iso: string) => (days ? new Date(iso).getTime() >= cutoff : true);

  const leadsIn = leads.filter((l) => inRange(l.created_at));
  const callsIn = calls.filter((c) => inRange(c.called_at));
  const followUpsDone = followUps.filter((f) => f.status !== "Pending");
  const followUpsIn = followUpsDone.filter((f) => inRange(f.completed_at ?? f.updated_at));

  const won = leadsIn.filter((l) => l.status === "Won").length;
  const meetings = callsIn.filter((c) => c.outcome === "Meeting Booked").length;
  const totalMinutes = Math.round(callsIn.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60);

  const conversion = pct(won, leadsIn.length);

  const series = React.useMemo(() => {
    if (!days) return null;
    const perDay: Record<string, { label: string; calls: number; leads: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const key = format(subDays(new Date(), i), "yyyy-MM-dd");
      perDay[key] = { label: format(subDays(new Date(), i), "MMM d"), calls: 0, leads: 0 };
    }
    for (const c of callsIn) {
      const key = format(new Date(c.called_at), "yyyy-MM-dd");
      if (perDay[key]) perDay[key].calls++;
    }
    for (const l of leadsIn) {
      const key = format(new Date(l.created_at), "yyyy-MM-dd");
      if (perDay[key]) perDay[key].leads++;
    }
    return Object.values(perDay);
  }, [callsIn, leadsIn, days]);

  const statusData = React.useMemo(() => {
    const grouped = new Map<string, number>();
    for (const l of leadsIn) grouped.set(l.status, (grouped.get(l.status) ?? 0) + 1);
    return Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        color: STATUS_COLORS[name as keyof typeof STATUS_COLORS] ?? "#64748b",
      }))
      .filter((d) => d.value > 0);
  }, [leadsIn]);

  const funnelData = React.useMemo(() => {
    const order = [
      "New",
      "Called",
      "Interested",
      "Follow-up",
      "Meeting Booked",
      "Proposal Sent",
      "Negotiation",
      "Won",
    ];
    const depth = new Map<string, number>(order.map((s, i) => [s, i]));
    const counts = new Array(order.length).fill(0);
    for (const l of leadsIn) {
      const d = depth.get(l.status);
      if (d == null) continue;
      for (let i = 0; i <= d; i++) counts[i]++;
    }
    return order
      .map((stage, i) => ({ stage, count: counts[i] }))
      .filter((s) => s.count > 0);
  }, [leadsIn]);

  const activeCols = PIPELINE_COLUMNS.filter((c) => c.status !== "Lost");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                range === r.id ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Leads" value={leadsIn.length} hint={`${leads.length} total`} accent="#4f46e5" />
        <StatCard icon={<PhoneCall className="h-5 w-5" />} label="Calls" value={callsIn.length} hint={`${totalMinutes} min total`} accent="#0ea5e9" />
        <StatCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Follow-ups done"
          value={followUpsIn.length}
          hint={`${meetings} meetings booked`}
          accent="#f59e0b"
        />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Won" value={won} hint={`${conversion}% conversion`} accent="#22c55e" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calls per day</CardTitle>
            <CardDescription>Outbound activity over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {series ? <CallsBarChart data={series} xKey="label" yKey="calls" color="#0ea5e9" /> : <p className="text-sm text-muted-foreground">Pick a date range.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Leads created</CardTitle>
            <CardDescription>New leads entering the pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {series ? <LeadsAreaChart data={series} xKey="label" yKey="leads" color="#4f46e5" /> : <p className="text-sm text-muted-foreground">Pick a date range.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status breakdown</CardTitle>
            <CardDescription>Where your leads sit right now</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDonutChart data={statusData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pipeline funnel</CardTitle>
            <CardDescription>Cumulative leads through each stage</CardDescription>
          </CardHeader>
          <CardContent>
            {funnelData.length ? <FunnelChart data={funnelData} primaryColor="#4f46e5" /> : <p className="text-sm text-muted-foreground">No leads yet.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {activeCols.map((c) => {
          const count = leadsIn.filter((l) => l.status === c.status).length;
          return (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                {c.title}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{count}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}