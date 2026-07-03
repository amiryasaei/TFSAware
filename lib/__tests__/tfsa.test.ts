import { describe, expect, it } from "vitest";
import { calculateTfsaRoom, type TfsaInputs } from "../tfsa";

const base: TfsaInputs = {
  eligibilityYear: 2009,
  contributionsBeforeThisYear: 0,
  withdrawalsBeforeThisYear: 0,
  contributionsThisYear: 0,
  withdrawalsThisYear: 0,
  currentYear: 2026,
};

describe("calculateTfsaRoom — CRA test matrix", () => {
  it("eligible since 2009, never contributed: $109,000 as of 2026 (2009–2025 = $102,000 + $7,000 for 2026)", () => {
    const r = calculateTfsaRoom(base);
    expect(r.totalRoomAccumulated).toBe(109000);
    expect(r.availableRoomNow).toBe(109000);
    expect(r.isOverContributed).toBe(false);
  });

  it("eligible since 2009, maxed every year including 2026: $0 available", () => {
    const r = calculateTfsaRoom({
      ...base,
      contributionsBeforeThisYear: 102000,
      contributionsThisYear: 7000,
    });
    expect(r.availableRoomNow).toBe(0);
    expect(r.isOverContributed).toBe(false);
  });

  it("became eligible in 2020: $45,500 (6k+6k+6k+6.5k+7k+7k+7k)", () => {
    const r = calculateTfsaRoom({ ...base, eligibilityYear: 2020 });
    expect(r.totalRoomAccumulated).toBe(45500);
  });

  it("became eligible in 2015 (partial-year eligibility): $78,000", () => {
    const r = calculateTfsaRoom({ ...base, eligibilityYear: 2015 });
    expect(r.totalRoomAccumulated).toBe(78000);
  });

  it("new resident eligible from 2022: $33,500 (6k+6.5k+7k+7k+7k)", () => {
    const r = calculateTfsaRoom({ ...base, eligibilityYear: 2022 });
    expect(r.totalRoomAccumulated).toBe(33500);
  });

  it("prior-year withdrawals are added back to room", () => {
    const r = calculateTfsaRoom({
      ...base,
      contributionsBeforeThisYear: 30000,
      withdrawalsBeforeThisYear: 5000,
    });
    expect(r.availableRoomNow).toBe(109000 - 30000 + 5000);
  });

  it("current-year withdrawals are NOT added back until Jan 1 of next year", () => {
    const r = calculateTfsaRoom({ ...base, withdrawalsThisYear: 5000 });
    expect(r.availableRoomNow).toBe(109000);
    expect(r.withdrawalsReturningNextYear).toBe(5000);
    expect(r.roomReturnsOnJan1Of).toBe(2027);
  });

  it("overcontribution yields negative room and a warning flag", () => {
    const r = calculateTfsaRoom({
      ...base,
      eligibilityYear: 2024,
      contributionsBeforeThisYear: 14000,
      contributionsThisYear: 8000,
    });
    // Room 2024–2026 = 21,000; contributed 22,000
    expect(r.totalRoomAccumulated).toBe(21000);
    expect(r.availableRoomNow).toBe(-1000);
    expect(r.isOverContributed).toBe(true);
  });

  it("eligibility years before 2009 clamp to the TFSA program start", () => {
    const r = calculateTfsaRoom({ ...base, eligibilityYear: 1995 });
    expect(r.effectiveEligibilityYear).toBe(2009);
    expect(r.totalRoomAccumulated).toBe(109000);
  });

  it("this year's contributions reduce available room in real time", () => {
    const r = calculateTfsaRoom({ ...base, contributionsThisYear: 4000 });
    expect(r.availableRoomNow).toBe(105000);
    expect(r.roomUsedThisYear).toBe(4000);
  });

  it("cent-level inputs summing exactly to the limit never trigger a false overcontribution flag", () => {
    // Raw IEEE-754 math leaves ~-5e-12 here; rounding to cents must absorb it.
    const r = calculateTfsaRoom({
      ...base,
      contributionsBeforeThisYear: 108999.99,
      contributionsThisYear: 0.01,
    });
    expect(r.availableRoomNow).toBe(0);
    expect(r.isOverContributed).toBe(false);
  });

  it("current-year withdrawals reduce the actionable excess (CRA stops penalizing withdrawn excess)", () => {
    // Room $21,000 (2024–2026), contributed $22,000 → $1,000 excess.
    const over = calculateTfsaRoom({
      ...base,
      eligibilityYear: 2024,
      contributionsBeforeThisYear: 14000,
      contributionsThisYear: 8000,
    });
    expect(over.availableRoomNow).toBe(-1000);
    expect(over.excessAfterWithdrawals).toBe(1000);

    // The user follows the advice and withdraws $1,000 — room stays negative
    // until Jan 1, but there is nothing left to withdraw.
    const cured = calculateTfsaRoom({
      ...base,
      eligibilityYear: 2024,
      contributionsBeforeThisYear: 14000,
      contributionsThisYear: 8000,
      withdrawalsThisYear: 1000,
    });
    expect(cured.availableRoomNow).toBe(-1000);
    expect(cured.isOverContributed).toBe(true);
    expect(cured.excessAfterWithdrawals).toBe(0);
  });

  it("excessAfterWithdrawals is 0 when not overcontributed", () => {
    const r = calculateTfsaRoom({ ...base, withdrawalsThisYear: 5000 });
    expect(r.excessAfterWithdrawals).toBe(0);
  });
});
