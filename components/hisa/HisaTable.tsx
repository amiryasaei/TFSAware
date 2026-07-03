"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatCAD } from "@/lib/currency";
import { HISA_LAST_REVIEWED, HISA_RATES, type HisaRate } from "@/lib/hisa-rates";

const CORRECTIONS_EMAIL = "amiraliyasaei@gmail.com";

type SortKey =
  | "institution"
  | "product"
  | "ratePct"
  | "type"
  | "minBalance"
  | "lastUpdated"
  | "notes";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "institution", label: "Institution" },
  { key: "product", label: "Product" },
  { key: "ratePct", label: "Rate" },
  { key: "type", label: "Type" },
  { key: "minBalance", label: "Min balance" },
  { key: "lastUpdated", label: "Updated" },
  { key: "notes", label: "Notes" },
];

function compare(a: HisaRate, b: HisaRate, key: SortKey): number {
  const va = a[key];
  const vb = b[key];
  if (typeof va === "number" && typeof vb === "number") return va - vb;
  return String(va).localeCompare(String(vb));
}

function formatUpdated(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PromoBadge() {
  return (
    <span className="ml-1.5 inline-block rounded-full bg-warning-soft px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning-strong">
      Promo
    </span>
  );
}

export function HisaTable() {
  const [sortKey, setSortKey] = useState<SortKey>("ratePct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    const sorted = [...HISA_RATES].sort((a, b) => compare(a, b, sortKey));
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "institution" || key === "product" || key === "notes" ? "asc" : "desc");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Best HISA rates in Canada</h2>
            <p className="mt-1 text-sm text-subtle">
              Hand-checked weekly. Last reviewed {formatUpdated(HISA_LAST_REVIEWED)}.
            </p>
          </div>
          <a
            href={`mailto:${CORRECTIONS_EMAIL}?subject=TFSAware%20HISA%20rate%20correction`}
            className="text-sm font-medium text-accent underline underline-offset-2"
          >
            Suggest a correction
          </a>
        </div>

        {/* Desktop: full table */}
        <div className="mt-4 hidden sm:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      sortKey === col.key
                        ? sortDir === "desc"
                          ? "descending"
                          : "ascending"
                        : undefined
                    }
                    className="pb-2 pr-3 font-medium text-subtle"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-ink"
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span aria-hidden>{sortDir === "desc" ? "↓" : "↑"}</span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.institution}-${r.product}`} className="border-b border-edge/60">
                  <td className="py-3 pr-3 font-medium">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="text-accent underline-offset-2 hover:underline"
                    >
                      {r.institution}
                    </a>
                  </td>
                  <td className="py-3 pr-3">{r.product}</td>
                  <td className="num py-3 pr-3 font-semibold">
                    {r.ratePct.toFixed(2)}%
                    {r.type === "promo" && <PromoBadge />}
                  </td>
                  <td className="py-3 pr-3 capitalize">{r.type}</td>
                  <td className="num py-3 pr-3">{formatCAD(r.minBalance)}</td>
                  <td className="num py-3 pr-3 whitespace-nowrap text-subtle">
                    {formatUpdated(r.lastUpdated)}
                  </td>
                  <td className="py-3 text-subtle">{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards, no horizontal scroll */}
        <div className="mt-4 sm:hidden">
          <label htmlFor="hisa-sort" className="text-xs font-medium text-subtle">
            Sort by
          </label>
          <select
            id="hisa-sort"
            className="mt-1 mb-3 w-full rounded-lg border border-edge bg-card px-3 py-2 text-base sm:text-sm"
            value={`${sortKey}:${sortDir}`}
            onChange={(e) => {
              const [key, dir] = e.target.value.split(":");
              setSortKey(key as SortKey);
              setSortDir(dir as "asc" | "desc");
            }}
          >
            <option value="ratePct:desc">Rate (highest first)</option>
            <option value="ratePct:asc">Rate (lowest first)</option>
            <option value="institution:asc">Institution (A–Z)</option>
            <option value="institution:desc">Institution (Z–A)</option>
            <option value="product:asc">Product (A–Z)</option>
            <option value="product:desc">Product (Z–A)</option>
            <option value="type:asc">Type (everyday first)</option>
            <option value="type:desc">Type (promo first)</option>
            <option value="minBalance:asc">Min balance (lowest first)</option>
            <option value="minBalance:desc">Min balance (highest first)</option>
            <option value="lastUpdated:desc">Recently updated</option>
            <option value="lastUpdated:asc">Least recently updated</option>
            <option value="notes:asc">Notes (A–Z)</option>
            <option value="notes:desc">Notes (Z–A)</option>
          </select>

          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={`${r.institution}-${r.product}`}
                className="rounded-lg border border-edge p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="font-medium text-accent"
                  >
                    {r.institution}
                  </a>
                  <span className="num text-lg font-semibold">
                    {r.ratePct.toFixed(2)}%
                    {r.type === "promo" && <PromoBadge />}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-subtle">
                  {r.product} · min {formatCAD(r.minBalance)}
                </p>
                <p className="mt-1 text-sm text-subtle">{r.notes}</p>
                <p className="num mt-1 text-xs text-subtle">
                  Updated {formatUpdated(r.lastUpdated)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-4 text-xs text-subtle">
          Rates change frequently — always confirm on the institution&apos;s site before moving
          money. Promo rates are temporary and usually apply to new deposits only. Some links may
          become referral links, which never affects the rates shown.
        </p>
      </Card>
    </div>
  );
}
