"use client";

import { useId } from "react";

/**
 * A labelled dollar input. Uses inputMode="decimal" for the right mobile
 * keyboard, blocks negative/non-numeric entry at the keystroke level, and
 * normalizes pasted bank-formatted values like "$5,000.00".
 */
export function MoneyInput({
  label,
  hint,
  value,
  onChange,
  placeholder = "0",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-xs text-subtle">
          {hint}
        </p>
      )}
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-subtle">
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-describedby={hint ? hintId : undefined}
          className="num w-full rounded-lg border border-edge bg-card py-2.5 pl-7 pr-3 text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            // normalize pastes like "$5,000.00" instead of silently rejecting them
            const cleaned = e.target.value.replace(/[$\s]/g, "");
            // allow digits, commas, one decimal point — nothing else
            if (/^[\d,]*\.?\d*$/.test(cleaned)) {
              onChange(cleaned);
            }
          }}
        />
      </div>
    </div>
  );
}
