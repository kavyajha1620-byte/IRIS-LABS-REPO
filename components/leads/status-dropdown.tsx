"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { changeLeadStatus } from "@/lib/actions/leads";
import { LEAD_STATUSES, STATUS_COLORS } from "@/lib/constants";

export function StatusDropdown({ leadId, status }: { leadId: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? "#64748b";

  async function change(newStatus: string) {
    if (newStatus === status) return;
    setPending(true);
    const res = await changeLeadStatus(leadId, newStatus);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Status changed to ${newStatus}`);
    router.refresh();
  }

  return (
    <Dropdown
      trigger={
        <button
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          style={{ color, borderColor: `${color}44`, backgroundColor: `${color}1a` }}
        >
          {pending ? "Saving…" : status}
          <ChevronDown className="h-4 w-4 opacity-60" />
        </button>
      }
    >
      {(close) => (
        <div className="max-h-72 overflow-y-auto">
          {LEAD_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                void change(s);
                close();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[s] }}
              />
              <span className={s === status ? "font-semibold" : ""}>{s}</span>
            </button>
          ))}
        </div>
      )}
    </Dropdown>
  );
}