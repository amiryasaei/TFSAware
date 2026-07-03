import { describe, expect, it } from "vitest";
import { calculateFhsaRoom } from "../fhsa";

describe("calculateFhsaRoom — CRA participation-room rules", () => {
  it("opened 2023, no contributions: $16,000 room in 2025 ($8k + $8k carry-forward, capped)", () => {
    const r = calculateFhsaRoom({ openYear: 2023, contributionsByYear: {}, currentYear: 2025 });
    expect(r.participationRoomThisYear).toBe(16000);
    expect(r.carryForwardIntoThisYear).toBe(8000);
    expect(r.lifetimeRemaining).toBe(40000);
  });

  it("carry-forward never exceeds $8,000 no matter how many years are skipped", () => {
    const r = calculateFhsaRoom({ openYear: 2023, contributionsByYear: {}, currentYear: 2026 });
    expect(r.participationRoomThisYear).toBe(16000);
  });

  it("opened 2023, contributed $8,000 in 2023 only: $16,000 room in 2025 (2024's unused $8k carries forward)", () => {
    // Note: the PRD expected $8,000 here, but CRA's carry-forward rule gives $16,000 —
    // the unused 2024 room (max $8k) carries into 2025 on top of 2025's $8k annual limit.
    const r = calculateFhsaRoom({
      openYear: 2023,
      contributionsByYear: { 2023: 8000 },
      currentYear: 2025,
    });
    expect(r.participationRoomThisYear).toBe(16000);
    expect(r.lifetimeContributed).toBe(8000);
    expect(r.lifetimeRemaining).toBe(32000);
  });

  it("maxing room every year leaves $8,000/year with no carry-forward", () => {
    const r = calculateFhsaRoom({
      openYear: 2023,
      contributionsByYear: { 2023: 8000, 2024: 8000, 2025: 8000 },
      currentYear: 2026,
    });
    expect(r.participationRoomThisYear).toBe(8000);
    expect(r.carryForwardIntoThisYear).toBe(0);
    expect(r.lifetimeContributed).toBe(24000);
    expect(r.lifetimeRemaining).toBe(16000);
  });

  it("using a $16,000 catch-up year resets carry-forward to zero", () => {
    const r = calculateFhsaRoom({
      openYear: 2023,
      contributionsByYear: { 2025: 16000 },
      currentYear: 2026,
    });
    expect(r.participationRoomThisYear).toBe(8000);
    expect(r.lifetimeContributed).toBe(16000);
  });

  it("current-year contributions reduce remaining room this year", () => {
    const r = calculateFhsaRoom({
      openYear: 2024,
      contributionsByYear: { 2026: 5000 },
      currentYear: 2026,
    });
    expect(r.participationRoomThisYear).toBe(16000);
    expect(r.remainingThisYear).toBe(11000);
  });

  it("flags overcontribution in the year it happened", () => {
    const r = calculateFhsaRoom({
      openYear: 2024,
      contributionsByYear: { 2024: 20000 },
      currentYear: 2026,
    });
    expect(r.isOverContributed).toBe(true);
    expect(r.overContributedYears).toEqual([2024]);
  });

  it("lifetime $40,000 cap zeroes out room once fully contributed", () => {
    const r = calculateFhsaRoom({
      openYear: 2023,
      contributionsByYear: { 2023: 8000, 2024: 8000, 2025: 8000, 2026: 8000, 2027: 8000 },
      currentYear: 2028,
    });
    expect(r.participationRoomThisYear).toBe(0);
    expect(r.lifetimeRemaining).toBe(0);
    expect(r.isOverContributed).toBe(false);
  });

  it("lifetime cap can truncate a year's room below $8,000 (legal contribution path)", () => {
    // Maxed 2023–2026 ($32k) + $4k in 2027 → lifetime $36k. 2028 raw room would
    // be $8k + $4k carry, but only $4k of lifetime room remains.
    const r = calculateFhsaRoom({
      openYear: 2023,
      contributionsByYear: { 2023: 8000, 2024: 8000, 2025: 8000, 2026: 8000, 2027: 4000 },
      currentYear: 2028,
    });
    expect(r.lifetimeContributed).toBe(36000);
    expect(r.participationRoomThisYear).toBe(4000);
    expect(r.lifetimeRemaining).toBe(4000);
    expect(r.isOverContributed).toBe(false);
  });

  it("an excess contribution is absorbed by the following January's new room (CRA), not forgotten", () => {
    // $16,000 into a first-year account with only $8,000 room: $8,000 excess.
    // On Jan 1, 2024 the new $8,000 annual limit absorbs it → $0 room in 2024.
    const r = calculateFhsaRoom({
      openYear: 2023,
      contributionsByYear: { 2023: 16000 },
      currentYear: 2024,
    });
    expect(r.isOverContributed).toBe(true);
    expect(r.overContributedYears).toEqual([2023]);
    expect(r.participationRoomThisYear).toBe(0);
    expect(r.remainingThisYear).toBe(0);
  });

  it("a large excess keeps reducing room across multiple years until absorbed", () => {
    // $20,000 in 2023 (room $8,000): $12,000 excess. 2024 absorbs $8,000 (room $0),
    // 2025 absorbs the last $4,000 (room $4,000).
    const in2024 = calculateFhsaRoom({
      openYear: 2023,
      contributionsByYear: { 2023: 20000 },
      currentYear: 2024,
    });
    expect(in2024.participationRoomThisYear).toBe(0);

    const in2025 = calculateFhsaRoom({
      openYear: 2023,
      contributionsByYear: { 2023: 20000 },
      currentYear: 2025,
    });
    expect(in2025.participationRoomThisYear).toBe(4000);
    expect(in2025.carryForwardIntoThisYear).toBe(0);
  });
});
