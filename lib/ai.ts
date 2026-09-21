export const AI_BASE_URL =
  process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";
export const AI_MODEL =
  process.env.AI_MODEL || "llama-3.3-70b-versatile";

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiChatOptions {
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface AiResult {
  content?: string;
  json?: unknown;
}

/**
 * Minimal OpenAI-compatible chat completions client
 * (works with Groq, OpenAI, OpenRouter, and similar providers).
 */
export async function chatCompletion(
  messages: AiMessage[],
  options: AiChatOptions = {}
): Promise<AiResult> {
  if (!isAiConfigured()) {
    throw new Error(
      "AI is not configured. Add an AI_API_KEY in your environment to enable the researcher and copilot."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  const external = options.signal;
  if (external?.aborted) controller.abort();
  const onAbort = () => controller.abort();
  external?.addEventListener("abort", onAbort);

  try {
    const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 1500,
        ...(options.json
          ? { response_format: { type: "json_object" } }
          : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const detail =
        res.status === 401
          ? "The AI API key is invalid or rejected."
          : res.status === 429
            ? "The AI provider is rate-limiting us. Try again shortly."
            : body.slice(0, 300) || res.statusText;
      throw new Error(`AI request failed (${res.status}): ${detail}`);
    }

    const data = await res.json();
    const content: string | undefined =
      data?.choices?.[0]?.message?.content ?? undefined;

    if (options.json && content) {
      try {
        return { content, json: JSON.parse(content) };
      } catch {
        // Fall back to string if the model didn't return valid JSON
        return { content };
      }
    }
    return { content };
  } finally {
    clearTimeout(timeout);
    external?.removeEventListener("abort", onAbort);
  }
}

/**
 * Split a big prompt into smaller pieces when the user wants many results.
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}