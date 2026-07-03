"use client";

import { useId } from "react";

export function YearSelect({
  label,
  hint,
  value,
  onChange,
  minYear,
  maxYear,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (year: number) => void;
  minYear: number;
  maxYear: number;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

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
        <select
          id={id}
          aria-describedby={hint ? hintId : undefined}
          className="num w-full appearance-none rounded-lg border border-edge bg-card py-2.5 pl-3 pr-9 text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {/* dropdown affordance (appearance-none removes the native chevron) */}
        <svg
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>
    </div>
  );
}
