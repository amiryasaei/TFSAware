"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { CountUpNumber } from "@/components/ui/CountUpNumber";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { formatCAD, parseDollarInput } from "@/lib/currency";
import { useUserState } from "@/lib/user-state";

const STORAGE_KEY = "tfsaware:networth:v1";

const ASSET_FIELDS = [
  { key: "tfsa", label: "TFSA balance" },
  { key: "fhsa", label: "FHSA balance" },
  { key: "rrsp", label: "RRSP balance" },
  { key: "cash", label: "Chequing & savings" },
  { key: "investments", label: "Other investments" },
  { key: "car", label: "Car value (optional)" },
  { key: "property", label: "Property value (optional)" },
] as const;

const LIABILITY_FIELDS = [
  { key: "creditCards", label: "Credit card debt" },
  { key: "studentLoans", label: "Student loans" },
  { key: "otherDebt", label: "Other debt" },
] as const;

const DONUT_COLORS = [
  "#1b4332",
  "#2d6a4f",
  "#40916c",
  "#52b788",
  "#74c69d",
  "#95d5b2",
  "#b7e4c7",
];

type Values = Record<string, string>;

export function NetWorth() {
  const { update } = useUserState();
  const [values, setValues] = useState<Values>({});
  const [loaded, setLoaded] = useState(false);

  // One-time restore from localStorage after hydration. setState in this mount
  // effect is intentional — reading localStorage during render breaks SSR.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setValues(JSON.parse(saved));
    } catch {
      // corrupted or unavailable storage — start fresh
    }
    setLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      // storage full/unavailable — totals still work in-memory
    }
  }, [values, loaded]);

  const { totalAssets, totalLiabilities, netWorth, assetBreakdown } = useMemo(() => {
    const assets = ASSET_FIELDS.map((f) => ({
      label: f.label.replace(" (optional)", ""),
      amount: parseDollarInput(values[f.key] ?? ""),
    }));
    const liabilities = LIABILITY_FIELDS.map((f) => parseDollarInput(values[f.key] ?? ""));
    const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
    const totalLiabilities = liabilities.reduce((sum, v) => sum + v, 0);
    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      assetBreakdown: assets.filter((a) => a.amount > 0),
    };
  }, [values]);

  useEffect(() => {
    update("netWorth", { totalAssets, totalLiabilities, netWorth });
  }, [totalAssets, totalLiabilities, netWorth, update]);

  const setField = (key: string) => (raw: string) =>
    setValues((prev) => ({ ...prev, [key]: raw }));

  // SVG donut geometry: r=42 circle with pathLength normalized to 100
  const segments = useMemo(
    () =>
      assetBreakdown.map((a, i) => {
        const pct = totalAssets > 0 ? (a.amount / totalAssets) * 100 : 0;
        const offset = assetBreakdown
          .slice(0, i)
          .reduce((sum, prev) => sum + (totalAssets > 0 ? (prev.amount / totalAssets) * 100 : 0), 0);
        return { ...a, pct, offset, color: DONUT_COLORS[i % DONUT_COLORS.length] };
      }),
    [assetBreakdown, totalAssets],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-semibold">What you own</h2>
          <p className="mt-1 text-sm text-subtle">
            All fields optional — empty counts as $0. Saved in your browser only.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {ASSET_FIELDS.map((f) => (
              <MoneyInput
                key={f.key}
                label={f.label}
                value={values[f.key] ?? ""}
                onChange={setField(f.key)}
              />
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold">What you owe</h2>
          <p className="mt-1 text-sm text-subtle">Balances, not monthly payments.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {LIABILITY_FIELDS.map((f) => (
              <MoneyInput
                key={f.key}
                label={f.label}
                value={values[f.key] ?? ""}
                onChange={setField(f.key)}
              />
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-medium text-subtle">Your net worth</p>
            <div className="mt-1 text-4xl font-semibold text-primary sm:text-5xl">
              <CountUpNumber value={netWorth} />
            </div>
            {netWorth < 0 && (
              <p className="mt-2 max-w-md text-sm text-subtle">
                A negative number is common early on — student loans and first cars do that. The
                trend over time matters more than today&apos;s snapshot.
              </p>
            )}

            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-edge pt-4">
              <div>
                <dt className="text-xs text-subtle">Total assets</dt>
                <dd className="num mt-0.5 font-semibold">{formatCAD(totalAssets)}</dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Total liabilities</dt>
                <dd className="num mt-0.5 font-semibold">{formatCAD(totalLiabilities)}</dd>
              </div>
            </dl>
          </div>

          <div className="justify-self-center">
            <svg width="180" height="180" viewBox="0 0 100 100" role="img" aria-label="Asset breakdown chart">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="12" />
              {segments.map((s) => (
                <circle
                  key={s.label}
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={s.color}
                  strokeWidth="12"
                  pathLength={100}
                  strokeDasharray={`${s.pct} ${100 - s.pct}`}
                  strokeDashoffset={-s.offset + 25}
                  transform="rotate(0 50 50)"
                  style={{ transition: "stroke-dasharray 300ms, stroke-dashoffset 300ms" }}
                />
              ))}
              <text
                x="50"
                y="53"
                textAnchor="middle"
                className="num"
                fontSize="9"
                fill="#64748b"
              >
                {totalAssets > 0 ? "Assets" : "No data"}
              </text>
            </svg>
          </div>
        </div>

        {segments.length > 0 && (
          <ul className="mt-4 grid gap-2 border-t border-edge pt-4 sm:grid-cols-2">
            {segments.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="flex-1 text-ink">{s.label}</span>
                <span className="num text-subtle">
                  {formatCAD(s.amount)} · {s.pct.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
