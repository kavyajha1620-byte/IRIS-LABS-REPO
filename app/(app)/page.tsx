import Link from "next/link";
import {
  Users,
  Sparkles,
  PhoneCall,
  Heart,
  CalendarClock,
  CalendarCheck,
  Trophy,
  TrendingDown,
  LineChart as LineChartIcon,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/queries";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CallsBarChart } from "@/components/charts/calls-bar-chart";
import { LeadsAreaChart } from "@/components/charts/leads-area-chart";
import { StatusDonutChart } from "@/components/charts/status-donut-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { StatusBadge } from "@/components/ui/badge";
import { timeAgo, telHref } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import type { DashboardData } from "@/lib/queries";

export const metadata = { title: "Dashboard" };

async function getData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .single();

  const dash = await getDashboardData(supabase);
  return { firstName: (profile?.full_name ?? user?.user_metadata?.full_name ?? "").split(" ")[0], dash };
}

export default async function DashboardPage() {
  const { firstName, dash } = await getData();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <span>
            Good day, <span className="text-primary">{firstName || "there"}</span>
          </span>
        }
        subtitle={today}
        actions={
          <Link
            href="/leads/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" />
            New Lead
          </Link>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Total leads" value={dash.totalLeads} icon={<Users className="h-5 w-5" />} accent="#4f46e5" />
        <StatCard label="New leads today" value={dash.newLeadsToday} icon={<Sparkles className="h-5 w-5" />} accent="#06b6d4" />
        <StatCard label="Contacted today" value={dash.contactedToday} icon={<PhoneCall className="h-5 w-5" />} accent="#0ea5e9" />
        <StatCard label="Interested" value={dash.interested} icon={<Heart className="h-5 w-5" />} accent="#8b5cf6" />
        <StatCard label="Follow-ups due today" value={dash.followUpsDueToday} icon={<CalendarClock className="h-5 w-5" />} accent="#f59e0b" hint={dash.followUpsOverdue ? `${dash.followUpsOverdue} overdue` : undefined} />
        <StatCard label="Meetings booked" value={dash.meetingsBooked} icon={<CalendarCheck className="h-5 w-5" />} accent="#10b981" />
        <StatCard label="Won deals" value={dash.wonDeals} icon={<Trophy className="h-5 w-5" />} accent="#22c55e" />
        <StatCard label="Lost leads" value={dash.lostLeads} icon={<TrendingDown className="h-5 w-5" />} accent="#ef4444" />
        <StatCard label="Conversion rate" value={`${dash.conversionRate}%`} icon={<LineChartIcon className="h-5 w-5" />} accent="#f97316" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Calls per day</CardTitle>
              <CardDescription>Last 14 days</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <CallsBarChart data={dash.callsPerDay} xKey="day" yKey="count" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads by status</CardTitle>
            <CardDescription>Current distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {dash.leadsByStatus.length ? (
              <StatusDonutChart data={dash.leadsByStatus} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">No leads yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Leads generated</CardTitle>
            <CardDescription>Last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <LeadsAreaChart data={dash.leadsOverTime} xKey="label" yKey="count" color="#06b6d4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion funnel</CardTitle>
            <CardDescription>Pipeline progression</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelChart data={dash.funnel} />
          </CardContent>
        </Card>
      </div>

      {/* Today's follow-ups */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Today&apos;s follow-ups</CardTitle>
            <CardDescription>Callbacks and promises you need to handle today</CardDescription>
          </div>
          <Link href="/follow-ups" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {dash.todayFollowUps.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing due today. Enjoy the quiet window.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {dash.todayFollowUps.map((f) => (
                <TodayFollowUpRow key={f.id} f={f} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TodayFollowUpRow({ f }: { f: DashboardData["todayFollowUps"][number] }) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {f.lead_name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join("")}
        </div>
        <div className="min-w-0">
          <Link href={`/leads/${f.lead_id}`} className="block truncate text-sm font-medium hover:text-primary">
            {f.lead_name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {f.title}
            {f.company ? ` · ${f.company}` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {f.overdue ? (
          <StatusBadge status="Overdue" color="#ef4444" />
        ) : (
          <StatusBadge status="Due today" color="#f59e0b" />
        )}
        <span className="hidden text-sm text-muted-foreground sm:block">{timeAgo(f.due_at)}</span>
        <Link
          href={telHref(f.phone)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
        >
          Call
        </Link>
      </div>
    </li>
  );
}