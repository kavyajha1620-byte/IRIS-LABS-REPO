"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { runLeadResearch, type ResearchReport } from "@/lib/actions/research";

export function ResearchPanel() {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ResearchReport | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setReport(null);
    try {
      const res = await runLeadResearch(query, count);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.report) setReport(res.report);
      toast.success(
        res.report && res.report.inserted > 0
          ? `Added ${res.report.inserted} lead${res.report.inserted === 1 ? "" : "s"}!`
          : "Research finished — nothing new to add."
      );
    } catch {
      toast.error("Research failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium">
              What are you looking for?
            </label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Italian restaurants in Austin TX, roofing contractors Dallas, dentists near me"
              required
              minLength={4}
            />
          </div>
          <div className="w-full md:w-32">
            <label className="mb-1.5 block text-sm font-medium">How many?</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
          <Button type="submit" loading={busy} className="md:w-auto">
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Researching…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Research &amp; add
              </>
            )}
          </Button>
        </form>

        {busy && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4 animate-pulse" /> Searching Google Maps, cleaning with AI,
            checking for duplicates…
          </p>
        )}

        {report && !busy && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Researched" value={report.researched} tone="text-foreground" />
              <Stat label="Added" value={report.inserted} tone="text-emerald-600" />
              <Stat label="Skipped" value={report.skipped} tone="text-amber-600" />
              <Stat label="Errors" value={report.errors.length} tone="text-red-600" />
            </div>

            {report.insertedIds.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Added to your lead list:</p>
                <div className="flex flex-wrap gap-1.5">
                  {report.insertedIds.map((id, i) => (
                    <Link
                      key={id}
                      href={`/leads/${id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      #{i + 1}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(report.skipped_reasons).length > 0 && (
              <p className="text-xs text-muted-foreground">
                Skipped:{" "}
                {Object.entries(report.skipped_reasons)
                  .map(([reason, n]) => `${reason} (${n})`)
                  .join(" · ")}
              </p>
            )}

            {report.errors.length > 0 && (
              <div className="space-y-1">
                {report.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <p className="text-2xl font-bold tabular-nums">
        <span className={tone}>{value}</span>
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}