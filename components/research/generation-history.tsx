"use client";

import * as React from "react";
import Link from "next/link";
import { History, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { GenerationJob } from "@/lib/actions/generation";
import { formatDateTime } from "@/lib/utils";

export function GenerationHistory({ jobs }: { jobs: GenerationJob[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold tracking-tight">Generation history</h3>
        <span className="ml-auto text-xs text-muted-foreground">{jobs.length} run{jobs.length === 1 ? "" : "s"}</span>
      </div>

      {jobs.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          No runs yet. Run a generation above and it will show up here — including progress, counts and errors.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {jobs.map((job) => (
            <li key={job.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <StatusIcon status={job.status} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {job.industry} in {job.city}
                    {job.state ? `, ${job.state}` : ""}
                    {job.country ? `, ${job.country}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    via {job.provider === "apify" ? "Apify" : job.provider === "ai" ? "AI research" : "OpenStreetMap"}
                    {" · "}
                    {formatDateTime(job.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5 text-xs">
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  Found {job.found_count}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  Imports {job.imported_count}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  Dups {job.duplicate_count}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: GenerationJob["status"] }) {
  if (status === "succeeded")
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
  if (status === "failed") return <XCircle className="h-4 w-4 shrink-0 text-red-500" />;
  return <Clock className="h-4 w-4 shrink-0 animate-pulse text-amber-500" />;
}

export function HistoryEmpty() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export function HistoryLink({ job }: { job: GenerationJob }) {
  const label = `${job.imported_count} imported via ${job.provider}`;
  return (
    <Link href="/leads" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
      {label}
    </Link>
  );
}