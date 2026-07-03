"use client";

import { useEffect, useRef, useState } from "react";
import { formatCAD } from "@/lib/currency";

const DURATION_MS = 650;

/**
 * The signature element: a large monospaced dollar figure that counts up
 * to its value. Animates from the currently displayed value on changes, and
 * exposes only the true final value to assistive technology.
 */
export function CountUpNumber({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState(0);
  const displayedRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const from = displayedRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (value - from) * eased;
      displayedRef.current = current;
      setDisplayed(current);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return (
    <span className={`num-display ${className}`}>
      <span className="sr-only">{formatCAD(value)}</span>
      <span aria-hidden>{formatCAD(Math.round(displayed))}</span>
    </span>
  );
}
