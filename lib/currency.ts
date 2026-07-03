const cadFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

/** Formats a number as whole Canadian dollars, e.g. -1234.5 → "-$1,235". */
export function formatCAD(amount: number): string {
  return cadFormatter.format(amount);
}

/** Rounds to whole cents — money math must never leak IEEE-754 residue into results. */
export function roundToCents(n: number): number {
  const rounded = Math.round(n * 100) / 100;
  return rounded === 0 ? 0 : rounded; // normalize -0 so it never renders as "-$0"
}

/** Parses a user-typed dollar string ("12,000", "$12000.50") into a number; empty/invalid → 0. */
export function parseDollarInput(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (cleaned === "") return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return 0;
  return roundToCents(value);
}
