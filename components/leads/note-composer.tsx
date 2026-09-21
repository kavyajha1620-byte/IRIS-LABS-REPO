"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Trash2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { addNote, deleteNote } from "@/lib/actions/notes";
import { timeAgo, initials } from "@/lib/utils";

export function NoteComposer({
  leadId,
  authorName,
}: {
  leadId: string;
  authorName: string;
}) {
  const router = useRouter();
  const [content, setContent] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || pending) return;
    setPending(true);
    const fd = new FormData();
    fd.set("lead_id", leadId);
    fd.set("content", content);
    const res = await addNote(fd);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setContent("");
    toast.success("Note added");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`Write a note about this lead (author: ${authorName})…`}
        rows={3}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!content.trim()} loading={pending}>
          <Send className="h-4 w-4" /> Add note
        </Button>
      </div>
    </form>
  );
}

export function NoteList({ notes, authorName }: { notes: Array<{ id: string; content: string; created_at: string }>; authorName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onDelete() {
    if (!deleting) return;
    setPending(true);
    const res = await deleteNote(deleting);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Note deleted");
    setDeleting(null);
    router.refresh();
  }

  if (!notes.length) {
    return (
      <EmptyState
        icon={<StickyNote className="h-5 w-5" />}
        title="No notes yet"
        description="Write the first note to remember key details."
        className="py-8"
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {notes.map((n) => (
        <li key={n.id} className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {initials(authorName)}
              </span>
              <span className="text-xs font-medium">{authorName}</span>
              <span className="text-xs text-muted-foreground">· {timeAgo(n.created_at)}</span>
            </div>
            <button
              onClick={() => setDeleting(n.id)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-red-600"
              aria-label="Delete note"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">{n.content}</p>
        </li>
      ))}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={pending}
        title="Delete note"
        description="Remove this note permanently?"
      />
    </ul>
  );
}