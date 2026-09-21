import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResearchPanel } from "@/components/research/research-panel";
import { isAiConfigured } from "@/lib/ai";
import { getPlacesKey } from "@/lib/places";

export const metadata = { title: "AI Lead Research" };

export default function ResearchPage() {
  const places = Boolean(getPlacesKey());
  const ai = isAiConfigured();

  return (
    <>
      <PageHeader
        title="AI Lead Research"
        subtitle="Research real businesses and add them straight to your cold-call list."
      />
      <div className="space-y-4">
        <Card>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Data sources:</span>
              <Badge className={places ? "" : "border-red-200 bg-red-50 text-red-700"}>
                {places ? "Google Maps connected" : "Google Maps not configured"}
              </Badge>
              <Badge className={ai ? "" : "border-red-200 bg-red-50 text-red-700"}>
                {ai ? "AI cleaning enabled" : "AI not configured"}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Names, phone numbers and websites come from Google Maps so they are real. The AI
              cleans and formats them for your list — it never invents data.
            </p>
          </CardContent>
        </Card>

        <ResearchPanel />
      </div>
    </>
  );
}