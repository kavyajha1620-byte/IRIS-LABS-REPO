"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";
import { logCall } from "@/lib/actions/calls";
import { CALL_OUTCOMES, CALL_OUTCOME_COLORS } from "@/lib/constants";
import { dateInputValue } from "@/lib/utils";

export function CallLogModal({
  open,
  onClose,
  leadId,
}: {
  open: boolean;
  onClose: () => void;
  leadId: string;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [followUp, setFollowUp] = React.useState(false);
  const [outcome, setOutcome] = React.useState("Interested");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    fd.set("lead_id", leadId);
    if (!followUp) {
      fd.delete("next_follow_up_at");
    }
    const res = await logCall(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success("Call logged");
    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log a call"
      description="Record the outcome — it's added to the activity timeline automatically."
      size="md"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="call-form" loading={pending}>
            Save call
          </Button>
        </>
      }
    >
      <form id="call-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date & time">
            <Input
              name="called_at"
              type="datetime-local"
              defaultValue={dateInputValue(new Date())}
            />
          </Field>
          <Field label="Duration (mm:ss)">
            <div className="flex items-center gap-1.5">
              <Input name="duration_mm" type="number" min={0} placeholder="12" className="tabular-nums" />
              <span className="text-muted-foreground">:</span>
              <Input name="duration_ss" type="number" min={0} max={59} placeholder="30" className="tabular-nums" />
            </div>
          </Field>
        </div>

        <Field label="Call outcome" required>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CALL_OUTCOMES.map((o) => {
              const active = outcome === o;
              const color = CALL_OUTCOME_COLORS[o];
              return (
                <label
                  key={o}
                  className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2.5 text-center text-xs font-medium transition-colors ${
                    active ? "ring-2 ring-offset-1" : "hover:bg-muted"
                  }`}
                  style={
                    active
                      ? { borderColor: color, color, backgroundColor: `${color}14`, "--tw-ring-color": color } as React.CSSProperties
                      : undefined
                  }
                >
                  <input
                    type="radio"
                    name="outcome"
                    value={o}
                    checked={outcome === o}
                    onChange={() => setOutcome(o)}
                    className="sr-only"
                    required
                  />
                  {o}
                </label>
              );
            })}
          </div>
        </Field>

        <Field label="Notes">
          <Textarea name="notes" rows={3} placeholder="How did the call go?" />
        </Field>

        <div className="rounded-xl border border-border p-4">
          <Toggle
            checked={followUp}
            onChange={setFollowUp}
            label="Schedule a follow-up"
            description="Remind yourself to call back"
          />
          {followUp && (
            <div className="mt-3">
              <Field label="Follow-up date & time" required>
                <Input name="next_follow_up_at" type="datetime-local" required />
              </Field>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}