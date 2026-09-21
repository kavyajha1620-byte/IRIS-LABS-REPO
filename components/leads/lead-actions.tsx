"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Phone,
  MessageCircle,
  Mail,
  CalendarClock,
  PhoneCall,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CallLogModal } from "@/components/calls/call-log-modal";
import { FollowUpModal } from "@/components/followups/followup-modal";
import { LeadForm } from "@/components/leads/lead-form";
import { StatusDropdown } from "@/components/leads/status-dropdown";
import { deleteLead } from "@/lib/actions/leads";
import { telHref, whatsappHref, mailtoHref } from "@/lib/utils";
import type { Lead } from "@/lib/types";

export function LeadActions({ lead, userId }: { lead: Lead; userId: string }) {
  const router = useRouter();
  const [callOpen, setCallOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  async function onDelete() {
    setDeletePending(true);
    const res = await deleteLead(lead.id);
    setDeletePending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Lead deleted");
    router.push("/leads");
    router.refresh();
  }

  const hrefPhone = telHref(lead.phone);
  const hrefWhats = whatsappHref(lead.whatsapp || lead.phone);
  const hrefMail = mailtoHref(lead.email);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusDropdown leadId={lead.id} status={lead.status} />

      <div className="hidden h-6 w-px bg-border sm:block" />

      {lead.phone && (
        <a href={hrefPhone} className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-500">
          <Phone className="h-4 w-4" />
          <span className="hidden sm:inline">Call</span>
        </a>
      )}
      {(lead.whatsapp || lead.phone) && (
        <a
          href={hrefWhats}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#25D366] px-3 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      )}
      {lead.email && (
        <a href={hrefMail} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted">
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Email</span>
        </a>
      )}

      <Button variant="outline" size="sm" onClick={() => setCallOpen(true)}>
        <PhoneCall className="h-4 w-4" />
        <span className="hidden sm:inline">Log call</span>
      </Button>
      <Button variant="outline" size="sm" onClick={() => setFollowUpOpen(true)}>
        <CalendarClock className="h-4 w-4" />
        <span className="hidden sm:inline">Follow-up</span>
      </Button>

      <Dropdown
        trigger={
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted">
            <Pencil className="h-4 w-4" />
          </button>
        }
      >
        {(close) => (
          <>
            <DropdownItem
              onClick={() => {
                setEditOpen(true);
                close();
              }}
            >
              <Pencil className="h-4 w-4" /> Edit lead
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                setDeleteOpen(true);
                close();
              }}
              destructive
            >
              <Trash2 className="h-4 w-4" /> Delete lead
            </DropdownItem>
          </>
        )}
      </Dropdown>

      <CallLogModal open={callOpen} onClose={() => setCallOpen(false)} leadId={lead.id} />
      <FollowUpModal open={followUpOpen} onClose={() => setFollowUpOpen(false)} leadId={lead.id} />
      <LeadForm open={editOpen} onClose={() => setEditOpen(false)} lead={lead} userId={userId} />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={onDelete}
        loading={deletePending}
        title="Delete lead"
        description={`Delete ${lead.full_name}? Related calls, notes and activities will also be removed.`}
      />
    </div>
  );
}