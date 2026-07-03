"use client";

import { useEffect, useRef, useState } from "react";
import { streamAi } from "@/lib/ai-client";
import { useUserState } from "@/lib/user-state";

// Avoids re-billing identical requests when users flip between tabs.
const responseCache = new Map<string, string>();

const DEBOUNCE_MS = 1200;

type Status = "idle" | "loading" | "streaming" | "done" | "error" | "unconfigured";

/**
 * Mode A of the AI layer: a plain-English explanation generated automatically
 * whenever a calculation result settles. Debounced so typing doesn't spam the
 * API, and gated on `enabled` so nothing is requested (or billed) until the
 * user has actually entered something.
 */
export function AiExplanation({
  module,
  enabled,
}: {
  module: "tfsa" | "fhsa";
  enabled: boolean;
}) {
  const { state } = useUserState();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const abortRef = useRef<AbortController | null>(null);

  const moduleState = state[module];
  const key = enabled && moduleState ? `${module}:${JSON.stringify(moduleState)}` : null;

  useEffect(() => {
    if (!key || !moduleState) return;

    const cached = responseCache.get(key);
    // All state changes happen inside the timer callback (async), never
    // synchronously in the effect body.
    const timer = setTimeout(
      async () => {
        if (cached) {
          setText(cached);
          setStatus("done");
          return;
        }
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setText("");
        setStatus("loading");
        try {
          let firstChunk = true;
          const full = await streamAi(
            { mode: "explain", module, state: { [module]: moduleState } },
            (chunk) => {
              if (firstChunk) {
                firstChunk = false;
                setStatus("streaming");
              }
              setText((prev) => prev + chunk);
            },
            controller.signal,
          );
          responseCache.set(key, full);
          setStatus("done");
        } catch (err) {
          if (controller.signal.aborted) return;
          setStatus(err instanceof Error && err.message.includes("503") ? "unconfigured" : "error");
        }
      },
      cached ? 0 : DEBOUNCE_MS,
    );

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!enabled || !moduleState || status === "idle") return null;

  return (
    <div className="mt-4 rounded-lg border border-edge bg-primary-soft/50 p-4">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
          ✦ AI
        </span>
        <span className="text-xs text-subtle">Plain-English explanation</span>
      </div>
      {status === "loading" && <p className="text-sm text-subtle">Reading your numbers…</p>}
      {(status === "streaming" || status === "done") && (
        <p className="text-sm leading-relaxed text-ink">{text}</p>
      )}
      {status === "error" && (
        <p className="text-sm text-subtle">Explanation unavailable — check your numbers above.</p>
      )}
      {status === "unconfigured" && (
        <p className="text-sm text-subtle">
          AI explanations aren&apos;t set up yet. Your numbers above are still exact.
        </p>
      )}
      {/* Announce once when complete instead of streaming token-by-token to AT */}
      <p className="sr-only" aria-live="polite">
        {status === "done"
          ? `Explanation updated: ${text}`
          : status === "error"
            ? "Explanation unavailable — check your numbers above."
            : ""}
      </p>
    </div>
  );
}
