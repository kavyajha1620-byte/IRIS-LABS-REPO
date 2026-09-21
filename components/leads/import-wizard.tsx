"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  UploadCloud,
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Download,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { download } from "@/lib/utils";
import { importLeads, type ImportRow, type ImportReport } from "@/lib/actions/leads";

type Step = "upload" | "map" | "preview" | "done";

const CRM_FIELDS: Array<{ key: keyof ImportRow; label: string; required?: boolean }> = [
  { key: "full_name", label: "Full name", required: true },
  { key: "company", label: "Company" },
  { key: "job_title", label: "Job title" },
  { key: "phone", label: "Phone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "industry", label: "Industry" },
  { key: "source", label: "Lead source" },
];

const normalize = (h: string) =>
  h.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

const HEADER_HINTS: Record<string, [keyof ImportRow, boolean?]> = {
  name: ["full_name", true],
  fullname: ["full_name", true],
  fullnameprojectlead: ["full_name", true],
  leadname: ["full_name", true],
  contact: ["full_name", true],
  company: ["company"],
  companyname: ["company"],
  organization: ["company"],
  jobtitle: ["job_title", true],
  job: ["job_title"],
  title: ["job_title"],
  designation: ["job_title"],
  phone: ["phone"],
  phonenumber: ["phone"],
  mobile: ["phone"],
  cell: ["phone"],
  telephone: ["phone"],
  whatsapp: ["whatsapp"],
  wa: ["whatsapp"],
  email: ["email"],
  emailaddress: ["email"],
  website: ["website"],
  url: ["website"],
  country: ["country"],
  city: ["city"],
  industry: ["industry"],
  source: ["source"],
  leadsource: ["source"],
  leadtype: ["source"],
};

export function ImportWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("upload");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [rawHeaders, setRawHeaders] = React.useState<string[]>([]);
  const [rawRows, setRawRows] = React.useState<string[][]>([]);
  const [mapping, setMapping] = React.useState<Partial<Record<keyof ImportRow, string>>>({});
  const [fileErrors, setFileErrors] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState(false);
  const [report, setReport] = React.useState<ImportReport | null>(null);

  const readFile = (file: File) => {
    setFileErrors([]);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileErrors(["Please choose a .csv file."]);
      return;
    }
    Papa.parse(file, {
      skipEmptyLines: "greedy",
      complete(results) {
        const rows = (results.data as string[][]).filter((r) => r.some((c) => c.trim()));
        if (!rows.length) {
          setFileErrors(["The file appears to be empty."]);
          return;
        }
        const headers = rows[0].map((h) => h.trim());
        if (rows.length < 2) {
          setFileErrors(["The file has a header but no data rows."]);
          return;
        }
        const parsedErrors = (results.errors ?? []).filter((e) => e.message && e.row != null);
        if (parsedErrors.length) {
          setFileErrors(parsedErrors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`));
        }
        setFileName(file.name);
        setRawHeaders(headers);
        setRawRows(rows.slice(1));
        setMapping(guessMapping(headers));
        setStep("map");
      },
    });
  };

  const guessMapping = (headers: string[]): Partial<Record<keyof ImportRow, string>> => {
    const m: Partial<Record<keyof ImportRow, string>> = {};
    headers.forEach((h, idx) => {
      const hint = HEADER_HINTS[normalize(h)];
      if (hint && !m[hint[0]]) m[hint[0]] = headers[idx];
    });
    return m;
  };

  const rowsAsImport: Array<{ index: number; row: ImportRow; error?: string }> = React.useMemo(() => {
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();
    const out: Array<{ index: number; row: ImportRow; error?: string }> = [];

    for (let i = 0; i < rawRows.length; i++) {
      const cells = rawRows[i];
      const get = (field?: string) => {
        if (field == null || field === "") return "";
        const idx = rawHeaders.findIndex((h) => h === field);
        return idx >= 0 ? (cells[idx] ?? "").trim() : "";
      };

      const row: ImportRow = {
        full_name: get(mapping.full_name),
        company: get(mapping.company),
        job_title: get(mapping.job_title),
        phone: get(mapping.phone),
        whatsapp: get(mapping.whatsapp),
        email: get(mapping.email),
        website: get(mapping.website),
        country: get(mapping.country),
        city: get(mapping.city),
        industry: get(mapping.industry),
        source: get(mapping.source),
      };

      let error: string | undefined;
      if (!row.full_name) error = "Full name is required.";
      else {
        const email = row.email.trim().toLowerCase();
        if (email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email))
          error = `Invalid email "${email}".`;
        else if (seenEmails.has(email) && email) error = "Duplicate email in file.";
        else if (email) seenEmails.add(email);

        const phone = row.phone.replace(/\D/g, "");
        if (!error && phone && phone.length < 7) error = `Phone "${row.phone}" looks invalid.`;
        else if (!error && phone && seenPhones.has(phone)) error = "Duplicate phone in file.";
        else if (phone) seenPhones.add(phone);
      }
      out.push({ index: i, row, error });
    }
    return out;
  }, [rawRows, rawHeaders, mapping]);

  const validCount = rowsAsImport.filter((r) => !r.error).length;
  const invalidCount = rowsAsImport.length - validCount;

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  }

  async function confirmImport() {
    setPending(true);
    const validRows = rowsAsImport.filter((r) => !r.error).map((r) => r.row);
    const res = await importLeads(validRows);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (!res.report) {
      toast.error("Import finished without a summary.");
      return;
    }
    setReport(res.report);
    setStep("done");
    router.refresh();
  }

  function downloadTemplate() {
    const headers = CRM_FIELDS.map((f) => f.label).join(",");
    const rows = [
      "Sarah Mitchell,BrightPath Logistics,Operations Director,+1 (202) 555-0134,+12025550134,sarah.mitchell@brightpath.com,https://brightpath.com,United States,Chicago,Logistics,Cold List",
      "James Osei,KROIM,Founder,+233 24 555 0198,233245550198,j.osei@kroim.io,https://kroim.io,Ghana,Accra,Software,LinkedIn",
    ];
    download("leads-import-template.csv", [headers, ...rows].join("\n"));
  }

  const reset = () => {
    setStep("upload");
    setFileName(null);
    setRawHeaders([]);
    setRawRows([]);
    setMapping({});
    setReport(null);
  };

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Import leads from CSV</CardTitle>
        <CardDescription>Preview, validate and confirm before anything is added. Duplicates are skipped, never silently created.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Steps indicator */}
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {(["upload", "map", "preview", "done"] as Step[]).map((s, i) => {
            const active = step === s;
            const done = ["upload", "map", "preview", "done"].indexOf(step) > i;
            return (
              <React.Fragment key={s}>
                <span className={active ? "text-primary" : done ? "text-emerald-600" : ""}>
                  {done ? (
                    <CheckCircle2 className="inline h-3.5 w-3.5" />
                  ) : (
                    <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px]">
                      {i + 1}
                    </span>
                  )}
                  {s[0].toUpperCase() + s.slice(1)}
                </span>
                {i < 3 && <span className="h-px w-6 bg-border" />}
              </React.Fragment>
            );
          })}
        </div>

        {step === "upload" && (
          <div className="flex flex-col gap-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 px-6 py-14 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03]">
              <UploadCloud className="h-10 w-10 text-muted-foreground" />
              <span className="text-sm font-medium">Drop your CSV here or click to browse</span>
              <span className="text-xs text-muted-foreground">
                Columns: Name, Company, Job Title, Phone, WhatsApp, Email, Website, Country, City, Industry, Lead Source
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onFileChange}
              />
            </label>
            {fileErrors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {fileErrors.map((e) => (
                  <p key={e}>{e}</p>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">No file handy?</p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4" /> Download template
              </Button>
            </div>
          </div>
        )}

        {step === "map" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="font-medium">{fileName}</span>
              <span className="text-muted-foreground">
                · {rawHeaders.length} columns · {rawRows.length} rows
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CRM_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {f.label}
                    {f.required && <span className="text-red-500"> *</span>}
                  </label>
                  <Select
                    value={mapping[f.key] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value || undefined }))}
                  >
                    <option value="">— skip —</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h || "(empty header)"}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>
                <ArrowLeft className="h-4 w-4" /> Re-upload
              </Button>
              <Button onClick={() => setStep("preview")}>
                Preview <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                {validCount} valid
              </Badge>
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                {invalidCount} with errors
              </Badge>
              <span className="ml-auto text-sm text-muted-foreground">
                Showing first {Math.min(rowsAsImport.length, 8)} of {rowsAsImport.length} rows
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-left text-muted-foreground">
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Company</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rowsAsImport.slice(0, 8).map((r) => (
                    <tr key={r.index}>
                      <td className="px-3 py-2 text-muted-foreground">{r.index + 1}</td>
                      <td className="px-3 py-2 font-medium">{r.row.full_name || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.row.company || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.row.phone || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.row.email || "—"}</td>
                      <td className="px-3 py-2">
                        {r.error ? (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <AlertTriangle className="h-3 w-3" /> {r.error}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidCount > 0 && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {invalidCount} row{invalidCount === 1 ? "" : "s"} will be skipped. Fix them in your file and re-upload if needed.
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={reset}>
                <Trash2 className="h-4 w-4" /> Start over
              </Button>
              <Button variant="outline" onClick={() => setStep("map")}>
                <ArrowLeft className="h-4 w-4" /> Adjust mapping
              </Button>
              <Button onClick={confirmImport} loading={pending} disabled={validCount === 0}>
                Import {validCount} lead{validCount === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && report && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-semibold tabular-nums">{report.inserted}</p>
                <p className="text-xs text-muted-foreground">Imported</p>
              </div>
              <div className="rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-semibold tabular-nums">{report.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
            </div>

            {report.errors.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="mb-2 text-xs font-semibold text-amber-800">
                  Skipped rows — duplicates or invalid data (not imported)
                </p>
                <table className="w-full text-xs text-amber-800">
                  <tbody className="divide-y divide-amber-200">
                    {report.errors.slice(0, 50).map((e, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5 pr-6 align-top font-medium">
                          {e.row > 0 ? `Row ${e.row}` : "—"}
                        </td>
                        <td className="px-2 py-1.5 align-top">{e.lead ?? ""}</td>
                        <td className="px-2 py-1.5 align-top">{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={reset}>
                Import another file
              </Button>
              <Link href="/leads">
                <Button>View my leads</Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}