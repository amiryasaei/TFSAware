// HISA rate table — maintained manually. Update rates weekly and bump
// lastUpdated per row. Swap `url` values for referral links once affiliate
// accounts are approved (EQ Bank and Wealthsimple referral programs first).
//
// ⚠️ These are the PRD's illustrative starting values. Verify every rate
// against the institution's site before launch.

export interface HisaRate {
  institution: string;
  product: string;
  ratePct: number;
  rateNote?: string; // e.g. promo details appended to the displayed rate
  type: "everyday" | "promo";
  minBalance: number;
  notes: string;
  lastUpdated: string; // ISO date of last manual verification
  url: string; // TODO(amir): replace with referral links at launch
}

export const HISA_LAST_REVIEWED = "2026-07-03";

export const HISA_RATES: HisaRate[] = [
  {
    institution: "Oaken Financial",
    product: "Savings Account",
    ratePct: 3.4,
    type: "everyday",
    minBalance: 0,
    notes: "CDIC insured",
    lastUpdated: "2026-07-03",
    url: "https://www.oaken.com/",
  },
  {
    institution: "EQ Bank",
    product: "Personal Account",
    ratePct: 3.0,
    type: "everyday",
    minBalance: 0,
    notes: "No fees",
    lastUpdated: "2026-07-03",
    url: "https://www.eqbank.ca/",
  },
  {
    institution: "Wealthsimple",
    product: "Cash Account",
    ratePct: 3.0,
    type: "everyday",
    minBalance: 0,
    notes: "3.5% with Premium",
    lastUpdated: "2026-07-03",
    url: "https://www.wealthsimple.com/en-ca/cash",
  },
  {
    institution: "KOHO",
    product: "KOHO Save",
    ratePct: 3.0,
    type: "everyday",
    minBalance: 0,
    notes: "Requires a KOHO plan",
    lastUpdated: "2026-07-03",
    url: "https://www.koho.ca/",
  },
  {
    institution: "Neo Financial",
    product: "Neo Money",
    ratePct: 3.0,
    type: "everyday",
    minBalance: 0,
    notes: "—",
    lastUpdated: "2026-07-03",
    url: "https://www.neofinancial.com/",
  },
  {
    institution: "Simplii Financial",
    product: "HISA",
    ratePct: 0.1,
    rateNote: "promo rates change often",
    type: "promo",
    minBalance: 0,
    notes: "Watch for new-deposit promo offers",
    lastUpdated: "2026-07-03",
    url: "https://www.simplii.com/",
  },
];
