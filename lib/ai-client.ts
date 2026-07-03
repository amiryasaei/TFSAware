import type { AiUserState } from "./user-state";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Calls the streaming AI endpoint and feeds text chunks to onDelta.
 * Throws on non-OK responses; the caller renders the graceful error state.
 */
export async function streamAi(
  body: {
    mode: "explain" | "chat";
    module?: "tfsa" | "fhsa";
    state: AiUserState;
    messages?: ChatMessage[];
  },
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`AI request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onDelta(chunk);
  }
  return full;
}
