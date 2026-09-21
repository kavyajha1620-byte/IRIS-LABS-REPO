"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Upload,
  SlidersHorizontal,
  Download,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Phone,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PriorityBadge } from "@/components/ui/badge";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LeadForm } from "@/components/leads/lead-form";
import { deleteLead, changeLeadStatus, setLeadFollowUp } from "@/lib/actions/leads";
import {
  PRIORITY_COLORS,
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  INDUSTRIES,
  COUNTRIES,
} from "@/lib/constants";
import {
  formatDate,
  formatDateTime,
  timeAgo,
  telHref,
  whatsappHref,
  download,
  isOverdue,
  isDueToday,
  initials,
} from "@/lib/utils";
import type { Lead } from "@/lib/types";

const PAGE_SIZE = 25;
type SortKey = "newest" | "oldest" | "contacted" | "followup" | "priority";

export function LeadsView({ leads, userId }: { leads: Lead[]; userId: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [priority, setPriority] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [source, setSource] = React.useState("");
  const [followUpWindow, setFollowUpWindow] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [nowMs] = React.useState(() => Date.now());
  const [page, setPage] = React.useState(1);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Lead | null>(null);
  const [deleting, setDeleting] = React.useState<Lead | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    const in7dMs = nowMs + 7 * 24 * 3600 * 1000;
    const list = leads.filter((l) => {
      if (
        query &&
        ![l.full_name, l.company ?? "", l.phone ?? "", l.email ?? ""].some((v) =>
          v.toLowerCase().includes(query)
        )
      ) {
        return false;
      }
      if (status && l.status !== status) return false;
      if (priority && l.priority !== priority) return false;
      if (country && l.country !== country) return false;
      if (industry && l.industry !== industry) return false;
      if (source && l.source !== source) return false;
      if (followUpWindow) {
        if (followUpWindow === "overdue" && !isOverdue(l.next_follow_up_at)) return false;
        if (followUpWindow === "today" && !isDueToday(l.next_follow_up_at)) return false;
        if (followUpWindow === "upcoming") {
          const d = l.next_follow_up_at ? new Date(l.next_follow_up_at).getTime() : null;
          if (!d || d < nowMs || d > in7dMs) return false;
        }
        if (followUpWindow === "none" && l.next_follow_up_at) return false;
      }
      return true;
    });

    const parse = (d: string | null | undefined) => {
      const t = d ? new Date(d).getTime() : 0;
      return Number.isNaN(t) ? 0 : t;
    };

    const prioRank = { High: 0, Medium: 1, Low: 2 };

    list.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return parse(a.created_at) - parse(b.created_at);
        case "contacted":
          return parse(b.last_contacted_at) - parse(a.last_contacted_at);
        case "followup":
          return (parse(a.next_follow_up_at) || Infinity) - (parse(b.next_follow_up_at) || Infinity);
        case "priority":
          return (prioRank[a.priority] ?? 1) - (prioRank[b.priority] ?? 1);
        default:
          return parse(b.created_at) - parse(a.created_at);
      }
    });
    return list;
  }, [leads, q, status, priority, country, industry, source, followUpWindow, sort, nowMs]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function exportCsv() {
    if (!filtered.length) {
      toast.error("Nothing to export with the current filters.");
      return;
    }
    const headers = [
      "Name",
      "Company",
      "Job Title",
      "Phone",
      "WhatsApp",
      "Email",
      "Website",
      "Country",
      "City",
      "Industry",
      "Lead Source",
      "Status",
      "Priority",
    ];
    const rows = filtered.map((l) =>
      [
        l.full_name,
        l.company ?? "",
        l.job_title ?? "",
        l.phone ?? "",
        l.whatsapp ?? "",
        l.email ?? "",
        l.website ?? "",
        l.country ?? "",
        l.city ?? "",
        l.industry ?? "",
        l.source ?? "",
        l.status,
        l.priority,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    download(`leads-${new Date().toISOString().slice(0, 10)}.csv`, [headers.join(","), ...rows].join("\n"));
    toast.success(`Exported ${filtered.length} leads.`);
  }

  async function onDelete() {
    if (!deleting) return;
    setDeletePending(true);
    const res = await deleteLead(deleting.id);
    setDeletePending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Lead deleted");
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, company, phone, email…"
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => setFiltersOpen((o) => !o)}>
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {(status || priority || country || industry || source || followUpWindow) && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                {[status, priority, country, industry, source, followUpWindow].filter(Boolean).length}
              </span>
            )}
          </Button>
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-auto">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="contacted">Recently contacted</option>
            <option value="followup">Follow-up date</option>
            <option value="priority">Priority</option>
          </Select>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Lead</span>
          </Button>
        </div>

        {filtersOpen && (
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-3 lg:grid-cols-6">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">All priorities</option>
              {LEAD_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">All countries</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select value={industry} onChange={(e) => setIndustry(e.target.value)}>
              <option value="">All industries</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
            <Select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">All sources</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select value={followUpWindow} onChange={(e) => setFollowUpWindow(e.target.value)}>
              <option value="">Follow-up: any</option>
              <option value="today">Due today</option>
              <option value="overdue">Overdue</option>
              <option value="upcoming">Next 7 days</option>
              <option value="none">No follow-up</option>
            </Select>
          </div>
        )}
      </div>

      {/* Result count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} lead{filtered.length === 1 ? "" : "s"} found
      </p>

      {pageItems.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No leads match"
          description={
            leads.length === 0
              ? "Add your first cold-calling lead or import a CSV to get started."
              : "Try adjusting your search or filters."
          }
          action={
            leads.length === 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" /> Add lead
                </Button>
                <Link href="/leads/import">
                  <Button variant="outline">
                    <Upload className="h-4 w-4" /> Import CSV
                  </Button>
                </Link>
              </div>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Last contact</th>
                  <th className="px-4 py-3">Next follow-up</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageItems.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/leads/${l.id}`} className="group flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(l.full_name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium group-hover:text-primary">{l.full_name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {l.company ?? "—"}
                            {l.job_title ? ` · ${l.job_title}` : ""}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
  <InlineStatusSelect leadId={l.id} status={l.status} />
</td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={l.priority} color={PRIORITY_COLORS[l.priority]} />
                    </td>
                    <td className="px-4 py-3">
                      {l.phone ? (
                        <a href={telHref(l.phone)} className="font-medium text-foreground hover:text-primary">
                          {l.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {l.email ? (
                        <span className="block max-w-[180px] truncate text-muted-foreground">{l.email}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(l.last_contacted_at)}</td>
                    <td className="px-4 py-3">
  <InlineFollowUp lead={l} />
</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(l.created_at)}</td>
                    <td className="px-4 py-3">
                      <LeadRowActions
                        lead={l}
                        onEdit={() => setEditing(l)}
                        onDelete={() => setDeleting(l)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {pageItems.map((l) => (
              <div key={l.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/leads/${l.id}`} className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(l.full_name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{l.full_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{l.company ?? "—"}</span>
                    </span>
                  </Link>
                  <LeadRowActions
                    lead={l}
                    onEdit={() => setEditing(l)}
                    onDelete={() => setDeleting(l)}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
  <InlineStatusSelect leadId={l.id} status={l.status} />
  <PriorityBadge priority={l.priority} color={PRIORITY_COLORS[l.priority]} />
  <span className="text-xs text-muted-foreground">· {timeAgo(l.created_at)}</span>
</div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  {l.phone && (
                    <a href={telHref(l.phone)} className="font-medium text-foreground hover:text-primary">
                      {l.phone}
                    </a>
                  )}
                  {l.email && <span className="max-w-[160px] truncate">{l.email}</span>}
                  <span className="ml-auto">
                    <InlineFollowUp lead={l} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />

      <LeadForm open={formOpen} onClose={() => setFormOpen(false)} userId={userId} />
      <LeadForm open={Boolean(editing)} onClose={() => setEditing(null)} lead={editing} userId={userId} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={deletePending}
        title="Delete lead"
        description={`Delete ${deleting?.full_name ?? "this lead"}? Related calls, notes and activities will also be removed.`}
      />
    </div>
  );
}

function FollowUpText({ date }: { date: string }) {
  if (isOverdue(date)) return <span className="font-medium text-red-600">overdue {timeAgo(date)}</span>;
  if (isDueToday(date)) return <span className="font-medium text-amber-600">today {timeAgo(date)}</span>;
  return <span>{formatDateTime(date)}</span>;
}

function InlineStatusSelect({ leadId, status }: { leadId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (next === status || busy) return;
    setBusy(true);
    try {
      const res = await changeLeadStatus(leadId, next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Status changed to ${next}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Select
      value={status}
      onChange={onChange}
      disabled={busy}
      className="h-8 w-[136px] rounded-lg text-xs font-medium"
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </Select>
  );
}

function InlineFollowUp({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const date = e.target.value;
    if (busy) return;
    setBusy(true);
    try {
      const res = await setLeadFollowUp(lead.id, date);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(date ? "Follow-up date saved" : "Follow-up cleared");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {lead.next_follow_up_at && <FollowUpText date={lead.next_follow_up_at} />}
      <Input
        type="date"
        value={lead.next_follow_up_at?.slice(0, 10) ?? ""}
        onChange={onChange}
        disabled={busy}
        className="h-8 w-[150px] rounded-lg text-xs"
        aria-label="Set follow-up date"
      />
    </span>
  );
}

function LeadRowActions({
  lead,
  onEdit,
  onDelete,
}: {
  lead: Lead;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Dropdown
      trigger={
        <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <MoreVertical className="h-4 w-4" />
        </button>
      }
    >
      {(close) => (
        <>
          <Link
            href={`/leads/${lead.id}`}
            onClick={close}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            <Eye className="h-4 w-4" /> View
          </Link>
          <DropdownItem onClick={onEdit}>
            <Pencil className="h-4 w-4" /> Edit
          </DropdownItem>
          {lead.phone && (
            <a
              href={telHref(lead.phone)}
              onClick={close}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#0ea5e9] hover:bg-muted"
            >
              <Phone className="h-4 w-4" /> Call
            </a>
          )}
          {(lead.whatsapp || lead.phone) && (
            <a
              href={whatsappHref(lead.whatsapp)}
              onClick={close}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-emerald-600 hover:bg-muted"
            >
              <Phone className="h-4 w-4" /> WhatsApp
            </a>
          )}
          <DropdownItem onClick={onDelete} destructive>
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}