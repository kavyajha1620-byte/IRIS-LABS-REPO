"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { askCopilot } from "@/lib/actions/copilot";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm your AI copilot. I can see your recent leads and follow-ups, so ask me things like:\n\n• \"Write a cold call script for lead #3\"\n• \"Draft a follow-up message for everyone in Follow-up status\"\n• \"What's on my plate today?\"\n• \"Summarize my new leads\"",
};

export function CopilotDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [open, messages, pending]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setPending(true);
    try {
      const res = await askCopilot(text);
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${res.error}` },
        ]);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply ?? "" }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Something went wrong. Please try again." },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" /> AI Copilot
        </span>
      }
      description="Your personal cold-calling assistant. It sees your leads and follow-ups."
      size="lg"
      footer={
        <div className="flex w-full items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about a lead, a call script, a follow-up…"
            rows={2}
            className="flex-1 resize-none"
          />
          <Button onClick={send} loading={pending} className="shrink-0">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      }
    >
      <div ref={scrollRef} className="flex max-h-[52vh] flex-col gap-3 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-white"
                : "mr-auto max-w-[90%] rounded-2xl rounded-bl-md border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-foreground whitespace-pre-wrap"
            }
          >
            {m.content}
          </div>
        ))}
        {pending && (
          <div className="mr-auto flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>
    </Modal>
  );
}