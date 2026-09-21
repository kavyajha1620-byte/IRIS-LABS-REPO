import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  MessageCircle,
  Mail,
  Globe,
  Building2,
  User as UserIcon,
  MapPin,
  Layers,
  UserPlus,
  Clock,
  CalendarCheck,
  History,
  ArrowLeft,
  Briefcase,
  Star,
  Tag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { LeadActions } from "@/components/leads/lead-actions";
import { Timeline } from "@/components/leads/timeline";
import { FollowUpsList } from "@/components/followups/followups-list";
import { NoteComposer, NoteList } from "@/components/leads/note-composer";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { STATUS_COLORS, PRIORITY_COLORS, type LeadStatus, type LeadPriority } from "@/lib/constants";
import { formatDate, formatDateTime, telHref, whatsappHref, mailtoHref, initials } from "@/lib/utils";

export const metadata = { title: "Lead" };

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} className="block truncate text-sm font-medium hover:text-primary">
            {value}
          </a>
        ) : (
          <p className="truncate text-sm font-medium">{value || "—"}</p>
        )}
      </div>
    </div>
  );
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).single();
  if (!lead) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .single();
  const authorName = profile?.full_name || (user?.user_metadata?.full_name as string) || "You";

  const { data: assigneeProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", lead.assigned_to ?? "")
    .maybeSingle();
  const assigneeName = assigneeProfile?.full_name ?? null;

  const [followUpsRes, notesRes, activitiesRes, callsRes] = await Promise.all([
    supabase.from("follow_ups").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("notes").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }).limit(40),
    supabase.from("calls").select("*").eq("lead_id", id).order("called_at", { ascending: false }).limit(20),
  ]);

  const followUps = followUpsRes.data ?? [];
  const notes = notesRes.data ?? [];
  const activities = activitiesRes.data ?? [];
  const calls = callsRes.data ?? [];

  const leadMap = new Map([[lead.id, { full_name: lead.full_name }]]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Link href="/leads" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            Lead details
          </span>
        }
      />

      {/* Header card */}
      <Card className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
                {initials(lead.full_name)}
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight">{lead.full_name}</h1>
                <p className="text-sm text-muted-foreground">
                  {lead.job_title ? `${lead.job_title} · ` : ""}
                  {lead.company ?? "No company"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={lead.status} color={STATUS_COLORS[lead.status as LeadStatus]} />
                  <PriorityBadge priority={lead.priority} color={PRIORITY_COLORS[lead.priority as LeadPriority]} />
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                      (lead.lead_score ?? 0) >= 30
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : (lead.lead_score ?? 0) >= 15
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-border bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    {<Star className="h-3 w-3" />} Score {(lead.lead_score ?? 0)}/50
                  </span>
                </div>
                {lead.lead_score_reasons && lead.lead_score_reasons.length > 0 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Why: {lead.lead_score_reasons.join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <LeadActions lead={lead} userId={user!.id} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col">
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={lead.phone} href={telHref(lead.phone)} />
                <InfoRow icon={<MessageCircle className="h-4 w-4" />} label="WhatsApp" value={lead.whatsapp || lead.phone} href={whatsappHref(lead.whatsapp || lead.phone)} />
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={lead.email} href={mailtoHref(lead.email)} />
                <InfoRow icon={<Globe className="h-4 w-4" />} label="Website" value={lead.website} href={lead.website ? (lead.website.startsWith("http") ? lead.website : `https://${lead.website}`) : undefined} />
              </CardContent>
            </Card>

            {/* Company */}
            <Card>
              <CardHeader>
                <CardTitle>Company</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col">
                <InfoRow icon={<Building2 className="h-4 w-4" />} label="Company" value={lead.company} />
                <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Job title" value={lead.job_title} />
                <InfoRow icon={<Layers className="h-4 w-4" />} label="Industry" value={lead.industry} />
                <InfoRow icon={<UserPlus className="h-4 w-4" />} label="Lead source" value={lead.source} />
                <InfoRow icon={<Globe className="h-4 w-4" />} label="Source URL" value={lead.source_url} href={lead.source_url || undefined} />
                <InfoRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="Location"
                  value={[lead.address, lead.city, lead.state, lead.country].filter(Boolean).join(", ")}
                />
                {(lead.tags ?? []).length > 0 && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Tag className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Tags</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {lead.tags!.map((t: string) => (
                          <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/60 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><UserPlus className="h-3.5 w-3.5" /> Created</p>
                <p className="mt-1 text-sm font-medium">{formatDate(lead.created_at)}</p>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3.5 w-3.5" /> Last contacted</p>
                <p className="mt-1 text-sm font-medium">{formatDate(lead.last_contacted_at)}</p>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarCheck className="h-3.5 w-3.5" /> Next follow-up</p>
                <p className="mt-1 text-sm font-medium">{formatDateTime(lead.next_follow_up_at)}</p>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Calls logged</p>
                <p className="mt-1 text-sm font-medium">{calls.length}</p>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><UserIcon className="h-3.5 w-3.5" /> Assigned to</p>
                <p className="mt-1 text-sm font-medium">{assigneeName ?? "Unassigned"}</p>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><History className="h-3.5 w-3.5" /> Updated</p>
                <p className="mt-1 text-sm font-medium">{formatDate(lead.updated_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity timeline</CardTitle>
              <CardDescription>Everything that happened with this lead</CardDescription>
            </CardHeader>
            <CardContent>
              <Timeline activities={activities} />
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Follow-ups</CardTitle>
              <CardDescription>
                {followUps.filter((f) => f.status === "Pending").length} pending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FollowUpsList followUps={followUps} leadMap={leadMap} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>{notes.length} note{notes.length === 1 ? "" : "s"}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <NoteComposer leadId={lead.id} authorName={authorName} />
              <NoteList notes={notes} authorName={authorName} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}