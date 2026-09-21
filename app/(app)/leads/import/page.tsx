import { ImportWizard } from "@/components/leads/import-wizard";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Import leads" };

export default function ImportLeadsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Import leads" subtitle="Upload a CSV, map the columns, preview and confirm." />
      <ImportWizard />
    </div>
  );
}