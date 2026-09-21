"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { createFollowUp, updateFollowUp } from "@/lib/actions/followups";
import type { FollowUp } from "@/lib/types";
import { dateInputValue } from "@/lib/utils";

export function FollowUpModal({
  open,
  onClose,
  leadId,
  followUp,
  leads,
}: {
  open: boolean;
  onClose: () => void;
  leadId?: string;
  followUp?: FollowUp | null;
  leads?: Array<{ id: string; full_name: string; phone: string | null }>;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [selectedLead, setSelectedLead] = React.useState(leadId ?? "");
  const isEdit = Boolean(followUp);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    if (!leadId && !selectedLead) {
      setError("Please choose a lead.");
      setPending(false);
      return;
    }
    fd.set("lead_id", selectedLead);
    if (isEdit && followUp) fd.set("id", followUp.id);

    const res = isEdit && followUp ? await updateFollowUp(fd) : await createFollowUp(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success(isEdit ? "Follow-up updated" : "Follow-up scheduled");
    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit follow-up" : "Schedule follow-up"}
      description="Keep your pipeline moving — never lose track of a call back."
      size="sm"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="followup-form" loading={pending}>
            {isEdit ? "Save changes" : "Schedule"}
          </Button>
        </>
      }
    >
      <form id="followup-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {!leadId && leads && (
          <Field label="Lead" required>
            <Select
              value={selectedLead}
              onChange={(e) => setSelectedLead(e.target.value)}
              required={!isEdit}
              disabled={isEdit}
            >
              <option value="">Select lead…</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.full_name}
                  {l.phone ? ` — ${l.phone}` : ""}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Title" required>
          <Input
            name="title"
            defaultValue={followUp?.title ?? ""}
            placeholder="Call back after meeting"
            required
          />
        </Field>
        <Field label="Due date & time" required>
          <Input
            name="due_at"
            type="datetime-local"
            defaultValue={dateInputValue(followUp?.due_at ?? new Date().toISOString())}
            required
          />
        </Field>
        <Field label="Notes">
          <Textarea name="notes" rows={3} defaultValue={followUp?.notes ?? ""} placeholder="Anything to remember…" />
        </Field>
      </form>
    </Modal>
  );
}