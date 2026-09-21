import type { SupabaseClient } from "@supabase/supabase-js";
import { format, startOfWeek, subDays, subWeeks, parseISO } from "date-fns";
import { STATUS_COLORS } from "./constants";

export interface DashboardData {
  totalLeads: number;
  newLeadsToday: number;
  contactedToday: number;
  interested: number;
  followUpsDueToday: number;
  followUpsOverdue: number;
  meetingsBooked: number;
  wonDeals: number;
  lostLeads: number;
  conversionRate: number;
  callsPerDay: Array<{ day: string; count: number }>;
  leadsByStatus: Array<{ name: string; value: number; color: string }>;
  leadsOverTime: Array<{ label: string; count: number }>;
  funnel: Array<{ stage: string; count: number }>;
  todayFollowUps: Array<{
    id: string;
    title: string;
    due_at: string;
    lead_id: string;
    lead_name: string;
    company: string | null;
    phone: string | null;
    overdue: boolean;
  }>;
}

const INTERESTED_STATUSES = ["Interested", "Follow-up", "Meeting Booked", "Proposal Sent", "Negotiation"];
const LOST_STATUSES = ["Lost", "Not Interested", "Wrong Number"];

export async function getDashboardData(supabase: SupabaseClient): Promise<DashboardData> {
  const [leadsRes, callsRes, followUpsRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id,status,created_at,last_contacted_at,company,full_name,phone")
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase
      .from("calls")
      .select("id,called_at,outcome")
      .gte("called_at", subDays(new Date(), 13).toISOString())
      .order("called_at", { ascending: true }),
    supabase
      .from("follow_ups")
      .select("id,title,due_at,lead_id,status")
      .in("status", ["Pending"])
      .order("due_at", { ascending: true }),
  ]);

  const leads = (leadsRes.data ?? []) as Array<{
    id: string;
    status: string;
    created_at: string;
    last_contacted_at: string | null;
    company: string | null;
    full_name: string;
    phone: string | null;
  }>;
  const calls = callsRes.data ?? [];
  const followUps = followUpsRes.data ?? [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const totalLeads = leads.length;
  const newLeadsToday = leads.filter((l) => {
    const d = parseISO(l.created_at);
    return !Number.isNaN(d.getTime()) && d >= todayStart;
  }).length;

  const contactedToday = leads.filter((l) => {
    if (!l.last_contacted_at) return false;
    const d = parseISO(l.last_contacted_at);
    return !Number.isNaN(d.getTime()) && d >= todayStart;
  }).length;

  const interested = leads.filter((l) => INTERESTED_STATUSES.includes(l.status)).length;
  const meetingsBooked = leads.filter((l) => l.status === "Meeting Booked").length;
  const wonDeals = leads.filter((l) => l.status === "Won").length;
  const lostLeads = leads.filter((l) => LOST_STATUSES.includes(l.status)).length;
  const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 1000) / 10 : 0;

  // Calls per day (last 14 days)
  const callMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = subDays(new Date(), i);
    callMap.set(format(d, "yyyy-MM-dd"), 0);
  }
  for (const c of calls) {
    const key = format(parseISO(c.called_at), "yyyy-MM-dd");
    if (callMap.has(key)) callMap.set(key, (callMap.get(key) ?? 0) + 1);
  }
  const callsPerDay = [...callMap.entries()].map(([key, count]) => ({
    day: format(parseISO(`${key}T00:00:00`), "EEE d"),
    count,
  }));

  // Leads by status
  const statusCount = new Map<string, number>();
  for (const l of leads) statusCount.set(l.status, (statusCount.get(l.status) ?? 0) + 1);
  const leadsByStatus = [...statusCount.entries()]
    .map(([name, value]) => ({
      name,
      value,
      color: STATUS_COLORS[name as keyof typeof STATUS_COLORS] ?? "#64748b",
    }))
    .sort((a, b) => b.value - a.value);

  // Leads over time (last 8 weeks)
  const weekMap = new Map<string, number>();
  const weekLabels = new Map<string, string>();
  for (let i = 7; i >= 0; i--) {
    const start = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    const key = format(start, "yyyy-MM-dd");
    weekMap.set(key, 0);
    weekLabels.set(key, format(start, "MMM d"));
  }
  for (const l of leads) {
    const d = parseISO(l.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const start = format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (weekMap.has(start)) weekMap.set(start, (weekMap.get(start) ?? 0) + 1);
  }
  const leadsOverTime = [...weekMap.keys()].map((key) => ({
    label: weekLabels.get(key) ?? key,
    count: weekMap.get(key) ?? 0,
  }));

  // Conversion funnel
  const band = (list: string[]) => leads.filter((l) => list.includes(l.status)).length;
  const funnel = [
    { stage: "New / Not Called", count: band(["New", "Not Called"]) },
    { stage: "Contacted", count: band(["Called", "No Answer"]) },
    { stage: "Interested", count: band(["Interested", "Follow-up"]) },
    { stage: "Meeting", count: band(["Meeting Booked"]) },
    { stage: "Proposal", count: band(["Proposal Sent"]) },
    { stage: "Negotiation", count: band(["Negotiation"]) },
    { stage: "Won", count: band(["Won"]) },
  ];

  // Today's follow-ups (due today incl. overdue)
  const today = new Date(todayStart.getTime());
  const endOfToday = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  const leadMeta = new Map(leads.map((l) => [l.id, l]));
  const todayFollowUps = followUps.flatMap((f) => {
    const due = parseISO(f.due_at);
    if (Number.isNaN(due.getTime())) return [];
    if (!(due >= today && due <= endOfToday)) return [];
    const meta = f.lead_id ? leadMeta.get(f.lead_id) : undefined;
    return [
      {
        id: f.id,
        title: f.title,
        due_at: f.due_at,
        lead_id: f.lead_id,
        lead_name: meta?.full_name ?? "Unknown lead",
        company: meta?.company ?? null,
        phone: meta?.phone ?? null,
        overdue: due < today,
      },
    ];
  });

  return {
    totalLeads,
    newLeadsToday,
    contactedToday,
    interested,
    followUpsDueToday: todayFollowUps.length,
    followUpsOverdue: todayFollowUps.filter((f) => f.overdue).length,
    meetingsBooked,
    wonDeals,
    lostLeads,
    conversionRate,
    callsPerDay,
    leadsByStatus,
    leadsOverTime,
    funnel,
    todayFollowUps,
  };
}