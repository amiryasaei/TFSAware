import {
  FHSA_ANNUAL_LIMIT,
  FHSA_LIFETIME_LIMIT,
  FHSA_MAX_CARRY_FORWARD,
} from "./constants";
import { roundToCents } from "./currency";

export interface FhsaInputs {
  /** Year the first FHSA was opened (2023 or later). */
  openYear: number;
  /** Contributions per calendar year, keyed by year. Missing years count as $0. */
  contributionsByYear: Record<number, number>;
  currentYear: number;
}

export interface FhsaResult {
  /** Total participation room for the current year ($8,000 + carry-forward, capped by lifetime limit, floored at $0). */
  participationRoomThisYear: number;
  /** Carry-forward portion included in this year's room (max $8,000, $0 when prior excess ate it). */
  carryForwardIntoThisYear: number;
  /** Room still available to contribute this year after this year's contributions. */
  remainingThisYear: number;
  /** Total contributed across all years. */
  lifetimeContributed: number;
  /** $40,000 minus lifetime contributions. */
  lifetimeRemaining: number;
  /** True if any year's contributions exceeded that year's participation room. */
  isOverContributed: boolean;
  /** Years where contributions exceeded room (for messaging). */
  overContributedYears: number[];
}

/**
 * CRA FHSA participation-room calculation.
 *
 * Participation room for a year = $8,000 annual limit + carry-forward, where
 * carry-forward = min($8,000, unused participation room at the end of the
 * IMMEDIATELY PRECEDING year). Max room in any single year is therefore
 * $16,000. Room only accumulates from the year the account is opened, and
 * lifetime contributions are capped at $40,000.
 *
 * Unused room is NOT floored at zero: per CRA, an excess contribution carries
 * forward as a negative and is absorbed by the new room that opens each
 * January 1 (which is why an untouched excess eventually stops being an
 * excess). Displayed room is floored at $0.
 *
 * Because carry-forward depends on when contributions were made, this takes
 * per-year contributions rather than a single lifetime total.
 */
export function calculateFhsaRoom(inputs: FhsaInputs): FhsaResult {
  const { openYear, contributionsByYear, currentYear } = inputs;

  // Can be negative: an unabsorbed excess from prior years.
  let carryForward = 0;
  let lifetimeContributed = 0;
  let participationRoomThisYear = 0;
  let carryForwardIntoThisYear = 0;
  const overContributedYears: number[] = [];

  for (let year = openYear; year <= currentYear; year++) {
    const lifetimeRemainingBefore = Math.max(0, FHSA_LIFETIME_LIMIT - lifetimeContributed);
    const roomRaw = Math.min(FHSA_ANNUAL_LIMIT + carryForward, lifetimeRemainingBefore);
    const room = Math.max(0, roundToCents(roomRaw));
    const contributed = roundToCents(contributionsByYear[year] ?? 0);

    if (year === currentYear) {
      participationRoomThisYear = room;
      carryForwardIntoThisYear = Math.max(0, Math.min(roundToCents(carryForward), room));
    }

    if (contributed > room) {
      overContributedYears.push(year);
    }

    const unused = roundToCents(roomRaw - contributed);
    carryForward = Math.min(FHSA_MAX_CARRY_FORWARD, unused);
    lifetimeContributed = roundToCents(lifetimeContributed + contributed);
  }

  const contributedThisYear = roundToCents(contributionsByYear[currentYear] ?? 0);

  return {
    participationRoomThisYear,
    carryForwardIntoThisYear,
    remainingThisYear: roundToCents(participationRoomThisYear - contributedThisYear),
    lifetimeContributed,
    lifetimeRemaining: Math.max(0, roundToCents(FHSA_LIFETIME_LIMIT - lifetimeContributed)),
    isOverContributed: overContributedYears.length > 0,
    overContributedYears,
  };
}
