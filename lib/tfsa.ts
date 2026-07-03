import { TFSA_ANNUAL_LIMITS, TFSA_FIRST_YEAR } from "./constants";
import { roundToCents } from "./currency";

export interface TfsaInputs {
  /** Year the person turned 18 or became a Canadian resident, whichever is later. */
  eligibilityYear: number;
  /** Total contributions made in years BEFORE the current calendar year. */
  contributionsBeforeThisYear: number;
  /** Total withdrawals made in years BEFORE the current calendar year. */
  withdrawalsBeforeThisYear: number;
  /** Contributions made so far in the current calendar year. */
  contributionsThisYear: number;
  /** Withdrawals made so far in the current calendar year (do NOT re-add until Jan 1 next year). */
  withdrawalsThisYear: number;
  /** The current calendar year (clamped to the last year with a verified CRA limit). */
  currentYear: number;
}

export interface TfsaResult {
  /** Sum of annual CRA limits from the effective eligibility year through the current year. */
  totalRoomAccumulated: number;
  /** Room available to contribute right now. Negative means overcontributed. */
  availableRoomNow: number;
  /** Contributions made so far this calendar year. */
  roomUsedThisYear: number;
  /** Withdrawals from this year that come back as new room on Jan 1 of next year. */
  withdrawalsReturningNextYear: number;
  /** True when availableRoomNow < 0 — the account holds more than its limit. */
  isOverContributed: boolean;
  /**
   * The excess still sitting in the account after crediting this year's
   * withdrawals (CRA reduces the penalized excess when it's withdrawn, even
   * though *room* stays negative until Jan 1). Assumes withdrawals happened
   * after the excess arose. 0 when not overcontributed.
   */
  excessAfterWithdrawals: number;
  /** Eligibility year after clamping to 2009 (TFSA program start). */
  effectiveEligibilityYear: number;
  /** The year current-year withdrawals are re-added to room. */
  roomReturnsOnJan1Of: number;
}

/**
 * CRA TFSA contribution-room calculation.
 *
 * Room accumulates each January 1 from the year the holder becomes eligible
 * (18+ and a Canadian resident). Withdrawals are re-added to room on January 1
 * of the FOLLOWING year, so only prior-year withdrawals count toward room now.
 * All money values are rounded to cents so float residue can never flip the
 * overcontribution flag on exact-limit inputs.
 */
export function calculateTfsaRoom(inputs: TfsaInputs): TfsaResult {
  const effectiveEligibilityYear = Math.max(inputs.eligibilityYear, TFSA_FIRST_YEAR);

  let totalRoomAccumulated = 0;
  for (let year = effectiveEligibilityYear; year <= inputs.currentYear; year++) {
    totalRoomAccumulated += TFSA_ANNUAL_LIMITS[year] ?? 0;
  }

  const availableRoomNow = roundToCents(
    totalRoomAccumulated -
      inputs.contributionsBeforeThisYear +
      inputs.withdrawalsBeforeThisYear -
      inputs.contributionsThisYear,
  );

  const isOverContributed = availableRoomNow < 0;
  const excessAfterWithdrawals = isOverContributed
    ? Math.max(0, roundToCents(-availableRoomNow - inputs.withdrawalsThisYear))
    : 0;

  return {
    totalRoomAccumulated,
    availableRoomNow,
    roomUsedThisYear: roundToCents(inputs.contributionsThisYear),
    withdrawalsReturningNextYear: roundToCents(inputs.withdrawalsThisYear),
    isOverContributed,
    excessAfterWithdrawals,
    effectiveEligibilityYear,
    roomReturnsOnJan1Of: inputs.currentYear + 1,
  };
}
