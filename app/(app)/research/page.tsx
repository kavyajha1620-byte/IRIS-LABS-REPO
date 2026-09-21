import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai";
import { isApifyConfigured, FREE_MODE, maxLeadsPerJob } from "@/lib/apify";
import { GenerationForm } from "@/components/research/generation-form";
import { GenerationHistory } from "@/components/research/generation-history";
import { ResearchPanel } from "@/components/research/research-panel";

export const metadata = { title: "Lead Generation" };

export default async function ResearchPage() {
  const ai = isAiConfigured();
  const apify = isApifyConfigured();
  const freeMode = FREE_MODE;
  const cap = maxLeadsPerJob();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let jobs: Array<Record<string, unknown>> = [];
  if (user) {
    const { data } = await supabase
      .from("lead_generation_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);
    jobs = (data ?? []) as Array<Record<string, unknown>>;
  }

  return (
    <>
      <PageHeader
        title="Lead Generation"
        subtitle="Tell us where and what to find — the system discovers real businesses, checks for duplicates, scores each lead and imports them."
      />
      <div className="space-y-4">
        <Card>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Discovery pipeline:</span>
              <Badge className={apify ? "" : "border-muted bg-muted/40 text-muted-foreground"}>
                {apify ? "Apify ready" : "Apify not configured"}
              </Badge>
              <Badge>OpenStreetMap (free)</Badge>
              <Badge className={ai ? "" : "border-muted bg-muted/40 text-muted-foreground"}>
                {ai ? "AI fallback" : "AI not configured"}
              </Badge>
              <Badge>{freeMode ? "Free mode — never auto-purchases credits" : "Billing allowed"}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Businesses are discovered (Apify when configured, otherwise OpenStreetMap — free, no
              key, no billing), deduped by domain / phone / name+city / name+address, scored out of
              50 with visible reasons, and imported with your current filters intact. If a provider
              can&apos;t run within the free allowance, the run falls back instead of buying credits.
            </p>
          </CardContent>
        </Card>

        <GenerationForm
          apifyReady={apify}
          freeMode={freeMode}
          aiReady={ai}
          maxPerJob={cap}
        />

        <GenerationHistory
          jobs={(jobs as Array<Record<string, unknown>>).map(jobToClient)}
        />

        <Card>
          <CardContent className="pt-4">
            <h3 className="text-base font-semibold tracking-tight">Quick research</h3>
            <p className="mb-3 mt-0.5 text-sm text-muted-foreground">
              One-free-text-query search on OpenStreetMap with AI cleaning — great for a quick list.
            </p>
            <ResearchPanel />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function jobToClient(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    provider: String(row.provider ?? "apify"),
    country: (row.country as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    city: String(row.city ?? ""),
    industry: String(row.industry ?? ""),
    requested_count: Number(row.requested_count ?? 0),
    found_count: Number(row.found_count ?? 0),
    valid_count: Number(row.valid_count ?? 0),
    duplicate_count: Number(row.duplicate_count ?? 0),
    imported_count: Number(row.imported_count ?? 0),
    failed_count: Number(row.failed_count ?? 0),
    status: String(row.status ?? "running") as "running" | "succeeded" | "failed",
    error: (row.error as string | null) ?? null,
    progress_log: Array.isArray(row.progress_log)
      ? (row.progress_log as Array<{ label: string; ts: string; count?: number }>)
      : [],
    actor_run_id: (row.actor_run_id as string | null) ?? null,
    created_at: String(row.created_at),
    completed_at: (row.completed_at as string | null) ?? null,
  };
}