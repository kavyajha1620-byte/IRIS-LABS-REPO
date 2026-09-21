"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Sparkles,
  MapPin,
  Building2,
  Scale,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { generateLeads, type GenerationJob, type GenerationRequest } from "@/lib/actions/generation";
import { INDUSTRIES, COUNTRIES } from "@/lib/constants";

export function GenerationForm({
  apifyReady,
  freeMode,
  aiReady,
  maxPerJob,
}: {
  apifyReady: boolean;
  freeMode: boolean;
  aiReady: boolean;
  maxPerJob: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [job, setJob] = React.useState<GenerationJob | null>(null);
  const [country, setCountry] = React.useState("");
  const [state, setState] = React.useState("");
  const [city, setCity] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [count, setCount] = React.useState(50);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!city.trim()) {
      toast.error("Enter a city to search in.");
      return;
    }
    setBusy(true);
    setJob(null);
    try {
      const req: GenerationRequest = {
        country,
        state: state.trim(),
        city: city.trim(),
        industry,
        count,
      };
      const res = await generateLeads(req);
      if (!res.ok) {
        toast.error(res.error);
        if (res.job) setJob(res.job);
        return;
      }
      if (res.job) setJob(res.job);
      toast.success(
        res.job && res.job.imported_count > 0
          ? `Imported ${res.job.imported_count} new lead${res.job.imported_count === 1 ? "" : "s"}!`
          : "Generation finished — nothing new to add."
      );
      router.refresh();
    } catch {
      toast.error("Lead generation failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold tracking-tight">Generate leads</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Discover real businesses, dedupe against your list, score each lead and import in one run.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge className={apifyReady ? "" : "border-muted bg-muted/40 text-muted-foreground"}>
            Apify {apifyReady ? "ready" : "not configured"}
          </Badge>
          <Badge className={freeMode ? "" : ""}>Free mode</Badge>
          {aiReady && <Badge>AI fallback</Badge>}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7"
      >
        <div className="lg:col-span-1">
          <Field label="Country">
            <Select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">Any country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="lg:col-span-2">
          <Field label="City" required>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Miami"
                className="pl-9"
                required
              />
            </div>
          </Field>
        </div>
        <div className="lg:col-span-1">
          <Field label="State / Region">
            <Input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Florida"
            />
          </Field>
        </div>
        <div className="lg:col-span-2">
          <Field label="Business type">
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="pl-9"
              >
                <option value="">Choose…</option>
                {INDUSTRIES.filter((i) => i !== "Other").map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </Select>
            </div>
          </Field>
        </div>
        <div className="lg:col-span-1">
          <Field label={`How many (max ${maxPerJob})`}>
            <Input
              type="number"
              min={1}
              max={maxPerJob}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </Field>
        </div>
        <div className="flex items-end lg:col-span-7">
          <Button type="submit" loading={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Working…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate &amp; import
              </>
            )}
          </Button>
        </div>
      </form>

      {freeMode && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Free mode is on: the app never buys Apify credits. If a paid Actor can&apos;t be used, the
          search falls back to OpenStreetMap (free) and then AI. Results land on your dashboard with
          a transparent score.
        </p>
      )}

      {busy && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Loader2 className="h-4 w-4 animate-spin" /> Generating… this can take up to a minute
          </p>
        </div>
      )}

      {job && !busy && <GenerationResult job={job} />}
    </div>
  );
}

export function GenerationResult({ job }: { job: GenerationJob }) {
  const ok = job.status === "succeeded";
  const running = job.status === "running";

  return (
    <div className="mt-5 space-y-4 border-t border-border pt-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ResultStat label="Found" value={job.found_count} />
        <ResultStat label="Valid" value={job.valid_count} tone="text-foreground" />
        <ResultStat label="Duplicates" value={job.duplicate_count} tone="text-amber-600" />
        <ResultStat label="Imported" value={job.imported_count} tone="text-emerald-600" />
      </div>

      {job.status === "failed" && job.error && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {job.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {job.progress_log.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {running && i === job.progress_log.length - 1 ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : ok || i !== job.progress_log.length - 1 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span className="text-muted-foreground">
              {p.label}
              {typeof p.count === "number" ? ` — ${p.count}` : ""}
            </span>
          </div>
        ))}
      </div>

      {job.imported_count > 0 && (
        <Link
          href="/leads"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View imported leads →
        </Link>
      )}
    </div>
  );
}

function ResultStat({
  label,
  value,
  tone = "text-muted-foreground",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <p className={`text-2xl font-bold tabular-nums ${value > 0 ? tone : "text-muted-foreground"}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}