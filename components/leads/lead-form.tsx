"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { createLead, updateLead, type ActionResult } from "@/lib/actions/leads";
import {
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  INDUSTRIES,
  COUNTRIES,
} from "@/lib/constants";
import type { Lead } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function LeadForm({
  open = false,
  onClose = () => undefined,
  lead,
  userId,
  asPage = false,
}: {
  open?: boolean;
  onClose?: () => void;
  lead?: Lead | null;
  userId: string;
  asPage?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const isEdit = Boolean(lead);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    let result: ActionResult;
    if (isEdit && lead) {
      fd.set("id", lead.id);
      result = await updateLead(fd);
    } else {
      fd.set("assigned_to", userId);
      result = await createLead(fd);
    }
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(isEdit ? "Lead updated" : "Lead created");
    onClose();
    router.refresh();
    if (!isEdit && result.id) {
      router.push(`/leads/${result.id}`);
    }
  }

  const formBody = (
    <>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" required>
          <Input name="full_name" defaultValue={lead?.full_name ?? ""} placeholder="Jane Doe" required />
        </Field>
        <Field label="Company">
          <Input name="company" defaultValue={lead?.company ?? ""} placeholder="Acme Inc." />
        </Field>
        <Field label="Job title">
          <Input name="job_title" defaultValue={lead?.job_title ?? ""} placeholder="Procurement Manager" />
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={lead?.phone ?? ""} placeholder="+1 (555) 010-1234" inputMode="tel" />
        </Field>
        <Field label="WhatsApp number">
          <Input name="whatsapp" defaultValue={lead?.whatsapp ?? ""} placeholder="+1 (555) 010-1234" inputMode="tel" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={lead?.email ?? ""} placeholder="jane@acme.com" />
        </Field>
        <Field label="Website">
          <Input name="website" defaultValue={lead?.website ?? ""} placeholder="https://acme.com" />
        </Field>
        <Field label="Country">
          <Select name="country" defaultValue={lead?.country ?? ""}>
            <option value="">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="City">
          <Input name="city" defaultValue={lead?.city ?? ""} placeholder="Chicago" />
        </Field>
        <Field label="Industry">
          <Select name="industry" defaultValue={lead?.industry ?? ""}>
            <option value="">Select industry</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lead source">
          <Select name="source" defaultValue={lead?.source ?? ""}>
            <option value="">Select source</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={lead?.status ?? "New"}>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select name="priority" defaultValue={lead?.priority ?? "Medium"}>
            {LEAD_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        {isEdit && lead && (
          <Field label="Created">
            <Input value={formatDate(lead.created_at)} disabled />
          </Field>
        )}
      </div>

      <Field label="Notes">
        <Textarea
          name="notes"
          defaultValue={lead?.notes ?? ""}
          placeholder="Anything important about this lead…"
          rows={3}
        />
      </Field>
    </>
  );

  if (asPage) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">{isEdit ? "Edit lead" : "New lead"}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {isEdit ? "Update this lead's information." : "Add a new cold-call lead. Required fields are marked."}
        </p>
        <form id="lead-form" onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          {formBody}
          <div className="mt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => (isEdit && lead ? router.push(`/leads/${lead.id}`) : router.push("/leads"))}
            >
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {isEdit ? "Save changes" : "Create lead"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit lead" : "New lead"}
      description={isEdit ? "Update this lead's information." : "Add a new cold-call lead."}
      size="lg"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="lead-form" loading={pending}>
            {isEdit ? "Save changes" : "Create lead"}
          </Button>
        </>
      }
    >
      <form id="lead-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formBody}
      </form>
    </Modal>
  );
}