"use client";

import { useEffect, useRef, useState } from "react";
import { streamAi, type ChatMessage } from "@/lib/ai-client";
import { useUserState } from "@/lib/user-state";

const STORAGE_KEY = "tfsaware:chat:v1";

const SUGGESTIONS = [
  "What happens if I withdraw $3,000 from my TFSA this year?",
  "Should I prioritize FHSA or TFSA this year?",
  "I moved to Canada in 2018 — how does that affect my room?",
  "What's the difference between CDIC and CIPF insurance?",
];

/**
 * Mode B of the AI layer: a corner chat assistant with the user's calculator
 * state passed as context. History persists for the session (sessionStorage),
 * and the panel is hidden — not unmounted — so open/close never loses state.
 */
export function ChatWidget() {
  const { state } = useUserState();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function openChat() {
    setOpen(true);
    // move focus into the dialog once it's visible
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function closeChat() {
    setOpen(false);
    toggleRef.current?.focus();
  }

  // One-time restore of session chat history after hydration.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      // ignore corrupted storage
    }
    loadedRef.current = true;
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // storage may be unavailable (private mode) — chat still works in-memory
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  async function send(question: string) {
    const content = question.trim().slice(0, 1000);
    if (!content || busy) return;
    setError(null);
    setInput("");
    setBusy(true);

    const history: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);

    try {
      await streamAi({ mode: "chat", state, messages: history }, (chunk) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      });
    } catch (err) {
      setMessages(history); // drop the empty assistant bubble
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("503")) {
        setError("Chat isn't set up yet — the site owner needs to add an AI API key.");
      } else if (msg.includes("429")) {
        setError("You're sending messages quickly — give it a minute and try again.");
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        ref={toggleRef}
        onClick={() => (open ? closeChat() : openChat())}
        aria-expanded={open}
        aria-label={open ? "Close assistant" : "Ask the assistant"}
        className="fixed bottom-4 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
      >
        {open ? (
          <span aria-hidden className="text-xl leading-none">×</span>
        ) : (
          <span aria-hidden className="text-lg leading-none">✦</span>
        )}
      </button>

      <div
        className={`fixed bottom-20 right-4 z-40 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-xl border border-edge bg-card shadow-xl sm:bottom-24 sm:right-6 ${
          open ? "" : "hidden"
        }`}
        style={{ height: "min(30rem, 70vh)" }}
        role="dialog"
        aria-label="Finance assistant chat"
        onKeyDown={(e) => {
          if (e.key === "Escape") closeChat();
        }}
      >
        <div className="border-b border-edge bg-primary px-4 py-3 text-white">
          <p className="text-sm font-semibold">Ask about your numbers</p>
          <p className="text-xs text-white/80">
            ✦ AI-generated — not financial advice. Verify with CRA.
          </p>
        </div>

        <div ref={scrollRef} role="log" className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-subtle">
                I can see the numbers you&apos;ve entered in the calculators. Try one of these:
              </p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="block w-full rounded-lg border border-edge bg-surface px-3 py-2 text-left text-sm text-ink transition-colors hover:border-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-8 rounded-lg bg-primary px-3 py-2 text-sm text-white"
                  : "mr-4 whitespace-pre-wrap rounded-lg bg-surface px-3 py-2 text-sm text-ink"
              }
            >
              {m.content || (busy && i === messages.length - 1 ? "…" : "")}
            </div>
          ))}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <form
          className="flex gap-2 border-t border-edge p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            type="text"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            aria-label="Your question"
            maxLength={1000}
            className="min-w-0 flex-1 rounded-lg border border-edge px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
}
