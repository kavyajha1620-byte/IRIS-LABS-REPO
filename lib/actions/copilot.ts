"use server";

import { createClient } from "@/lib/supabase/server";
import { chatCompletion, isAiConfigured } from "@/lib/ai";
import type { ActionResult } from "@/lib/actions/leads";

const SYSTEM = `You are the IrisLabs CRM AI copilot for cold callers and SDRs.

You help with practical daily sales tasks, using ONLY the lead context provided:
- Drafting cold call scripts and follow-up messages
- Advising what to say next for a specific lead (based on their status, industry, priority)
- Planning today's outreach and follow-ups
- Summarizing a lead's story and best next step
- Answering sales-process questions

Rules:
- Only talk about leads that appear in the provided context. If the user asks about a lead you cannot see, say you do not have that lead in view.
- NEVER invent phone numbers, emails, websites or facts about a lead. If unknown, say so.
- Keep answers concise, specific and actionable. Use short lists where helpful.
- Be friendly but professional.`;

interface ContextLead {
  full_name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  industry: string | null;
  source: string | null;
  status: string;
  priority: string;
  notes: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
}

export async function askCopilot(message: string): Promise<ActionResult & { reply?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const msg = (message ?? "").trim();
  if (!msg) return { ok: false, error: "Ask me something first." };
  if (!isAiConfigured()) {
    return {
      ok: false,
      error: "AI isn't configured yet. Add an AI_API_KEY to your environment to talk to me.",
    };
  }

  // Gather context about the caller's own leads and pending follow-ups.
  const { data: leads } = await supabase
    .from("leads")
    .select(
      "full_name,company,phone,email,city,industry,source,status,priority,notes,last_contacted_at,next_follow_up_at"
    )
    .order("created_at", { ascending: false })
    .limit(15);

  const { data: followUps } = await supabase
    .from("follow_ups")
    .select("title,due_at,status,notes")
    .order("due_at", { ascending: true })
    .limit(8);

  const leadLines = ((leads ?? []) as ContextLead[]).map((l, i) => {
    const note = (l.notes ?? "").slice(0, 140);
    return [
      `${i + 1}. ${l.full_name}${l.company ? ` — ${l.company}` : ""}`,
      `   Status: ${l.status} | Priority: ${l.priority} | Source: ${l.source ?? "—"} | Industry: ${l.industry ?? "—"}`,
      `   Phone: ${l.phone ?? "—"} | Email: ${l.email ?? "—"} | City: ${l.city ?? "—"}`,
      `   Last contact: ${l.last_contacted_at ?? "—"} | Next follow-up: ${l.next_follow_up_at ?? "—"}`,
      note ? `   Notes: ${note}` : "",
    ].join("\n");
  });

  const fuLines = (followUps ?? [])
    .map((f, i) => `${i + 1}. [${f.status}] ${f.title} — due ${f.due_at}${f.notes ? ` (${f.notes.slice(0, 80)})` : ""}`)
    .join("\n");

  const context = [
    "=== YOUR LEADS (recent 15) ===",
    leadLines.length ? leadLines.join("\n") : "(no leads yet)",
    "=== PENDING FOLLOW-UPS ===",
    fuLines || "(none)",
  ].join("\n");

  try {
    const res = await chatCompletion(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: `${context}\n\n=== === ===\n\nUser question: ${msg}` },
      ],
      { temperature: 0.5, maxTokens: 800 }
    );
    if (!res.content) return { ok: false, error: "The AI returned an empty response." };
    return { ok: true, reply: res.content.trim() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Copilot request failed." };
  }
}