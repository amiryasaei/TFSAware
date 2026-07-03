import Anthropic from "@anthropic-ai/sdk";
import { getCurrentYear } from "@/lib/constants";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const MAX_CHAT_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 2000;

// Basic per-IP rate limiting. In-memory, so it's per-serverless-instance on
// Vercel — a soft guard against abuse, not a billing firewall. Set a spend
// limit on the Anthropic console as the hard backstop.
const hits = new Map<string, number[]>();
function allowRequest(ip: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined;
}

/**
 * Rebuilds the user state from scratch, keeping only known numeric fields.
 * This is the no-PII guarantee: even a tampered client request can only ever
 * put numbers in front of the model.
 */
function sanitizeState(raw: unknown): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  if (typeof raw !== "object" || raw === null) return out;
  const source = raw as Record<string, unknown>;

  const sections: Record<string, string[]> = {
    tfsa: [
      "eligibilityYear",
      "contributionsBeforeThisYear",
      "withdrawalsBeforeThisYear",
      "contributionsThisYear",
      "withdrawalsThisYear",
      "totalRoomAccumulated",
      "availableRoomNow",
    ],
    fhsa: [
      "openYear",
      "lifetimeContributed",
      "participationRoomThisYear",
      "carryForwardIntoThisYear",
      "remainingThisYear",
      "lifetimeRemaining",
    ],
    netWorth: ["totalAssets", "totalLiabilities", "netWorth"],
  };

  for (const [section, keys] of Object.entries(sections)) {
    const rawSection = source[section];
    if (typeof rawSection !== "object" || rawSection === null) continue;
    const clean: Record<string, number> = {};
    for (const key of keys) {
      const value = asNumber((rawSection as Record<string, unknown>)[key]);
      if (value !== undefined) clean[key] = value;
    }
    if (Object.keys(clean).length > 0) out[section] = clean;
  }
  return out;
}

function buildSystemPrompt(stateJson: string): string {
  return `You are a knowledgeable Canadian personal finance assistant embedded in TFSAware, a TFSA/FHSA/HISA tool.
You help Canadians understand their registered account contribution room and savings options.

Rules:
- You are not a licensed financial advisor. For complex tax situations, always recommend consulting a CPA.
- Keep explanations plain, friendly, and specific to Canada (not US financial concepts).
- Always use Canadian dollar amounts.
- Never make up CRA rules — if you're uncertain, say so and point to canada.ca.
- Keep inline explanations to 3–5 sentences. Keep chat responses concise.
- When the user's calculator state is provided, personalize your response to their specific numbers.
- Answer in plain prose. No markdown headings, no bullet lists unless the user asks for a list.
- The current calendar year is ${getCurrentYear()}. TFSA withdrawals come back as room on January 1 of the following year. CRA charges 1% per month on TFSA and FHSA overcontributions.

The user's calculator state (numbers and years only — may be empty if they haven't entered data yet):
${stateJson}`;
}

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

function sanitizeMessages(raw: unknown): IncomingMessage[] {
  if (!Array.isArray(raw)) return [];
  const messages: IncomingMessage[] = [];
  for (const item of raw.slice(-MAX_CHAT_MESSAGES)) {
    if (typeof item !== "object" || item === null) continue;
    const { role, content } = item as Record<string, unknown>;
    if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
      messages.push({ role, content: content.slice(0, MAX_MESSAGE_CHARS) });
    }
  }
  // API requires the conversation to start with a user turn
  while (messages.length > 0 && messages[0].role !== "user") messages.shift();
  return messages;
}

export async function POST(req: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (!allowRequest(ip)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const mode = body.mode === "chat" ? "chat" : "explain";
  const state = sanitizeState(body.state);
  const system = buildSystemPrompt(JSON.stringify(state, null, 2));

  let messages: IncomingMessage[];
  let maxTokens: number;

  if (mode === "chat") {
    messages = sanitizeMessages(body.messages);
    if (messages.length === 0) {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }
    maxTokens = 600;
  } else {
    const moduleKey = body.module === "fhsa" ? "fhsa" : "tfsa";
    if (!state[moduleKey]) {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }
    messages = [
      {
        role: "user",
        content: `Write the inline explanation for my current ${moduleKey.toUpperCase()} numbers shown in the calculator state. 3–5 sentences: lead with the key available-room number, say what I should do about it, and flag any overcontribution risk or timing rules that apply to my situation.`,
      },
    ];
    maxTokens = 400;
  }

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: "disabled" },
    output_config: { effort: "low" },
    system,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("text", (text) => controller.enqueue(encoder.encode(text)));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
