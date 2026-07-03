"use client";

import { useEffect, useMemo, useState } from "react";
import { AiExplanation } from "@/components/ai/AiExplanation";
import { Card } from "@/components/ui/Card";
import { CountUpNumber } from "@/components/ui/CountUpNumber";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { YearSelect } from "@/components/ui/YearSelect";
import { FHSA_FIRST_YEAR, FHSA_LIFETIME_LIMIT, getCurrentYear } from "@/lib/constants";
import { formatCAD, parseDollarInput } from "@/lib/currency";
import { calculateFhsaRoom } from "@/lib/fhsa";
import { useUserState } from "@/lib/user-state";
import { readUrlParams, writeUrlParams } from "@/lib/url-state";

const CURRENT_YEAR = getCurrentYear();

export function FhsaTracker() {
  const { update } = useUserState();
  const [openYear, setOpenYear] = useState(FHSA_FIRST_YEAR);
  const [contribRaw, setContribRaw] = useState<Record<number, string>>({});

  // One-time restore of shareable state from the URL after hydration (see
  // TfsaCalculator for why setState in a mount effect is right here).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const p = readUrlParams();
    const year = Number(p.get("fo"));
    if (Number.isInteger(year) && year >= FHSA_FIRST_YEAR && year <= CURRENT_YEAR) {
      setOpenYear(year);
    }
    const restored: Record<number, string> = {};
    for (let y = FHSA_FIRST_YEAR; y <= CURRENT_YEAR; y++) {
      const v = p.get(`f${y}`);
      if (v) restored[y] = v;
    }
    if (Object.keys(restored).length > 0) setContribRaw(restored);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const updates: Record<string, string | null> = {
      fo: openYear === FHSA_FIRST_YEAR ? null : String(openYear),
    };
    for (let y = FHSA_FIRST_YEAR; y <= CURRENT_YEAR; y++) {
      updates[`f${y}`] = y >= openYear ? contribRaw[y] || null : null;
    }
    writeUrlParams(updates);
  }, [openYear, contribRaw]);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = openYear; y <= CURRENT_YEAR; y++) list.push(y);
    return list;
  }, [openYear]);

  const result = useMemo(() => {
    const contributionsByYear: Record<number, number> = {};
    for (const y of years) contributionsByYear[y] = parseDollarInput(contribRaw[y] ?? "");
    return calculateFhsaRoom({ openYear, contributionsByYear, currentYear: CURRENT_YEAR });
  }, [openYear, contribRaw, years]);

  useEffect(() => {
    update("fhsa", {
      openYear,
      lifetimeContributed: result.lifetimeContributed,
      participationRoomThisYear: result.participationRoomThisYear,
      carryForwardIntoThisYear: result.carryForwardIntoThisYear,
      remainingThisYear: result.remainingThisYear,
      lifetimeRemaining: result.lifetimeRemaining,
    });
  }, [openYear, result, update]);

  const lifetimePct = Math.min(100, (result.lifetimeContributed / FHSA_LIFETIME_LIMIT) * 100);
  const barColor =
    lifetimePct >= 90 ? "bg-danger" : lifetimePct >= 75 ? "bg-warning" : "bg-accent";

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-display text-lg font-semibold">Your FHSA details</h2>
        <p className="mt-1 text-sm text-subtle">
          Room only starts accumulating once you open an FHSA — it isn&apos;t retroactive.
          Because unused room carries forward (up to $8,000), we ask for contributions by year.
        </p>

        <div className="mt-4 space-y-4">
          <YearSelect
            label="Year you opened your first FHSA"
            value={openYear}
            onChange={setOpenYear}
            minYear={FHSA_FIRST_YEAR}
            maxYear={CURRENT_YEAR}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {years.map((y) => (
              <MoneyInput
                key={y}
                label={y === CURRENT_YEAR ? `Contributions in ${y} so far` : `Contributions in ${y}`}
                value={contribRaw[y] ?? ""}
                onChange={(raw) => setContribRaw((prev) => ({ ...prev, [y]: raw }))}
              />
            ))}
          </div>
        </div>
      </Card>

      <Card className={result.isOverContributed ? "border-danger" : ""}>
        <p className="text-sm font-medium text-subtle">
          You can still contribute this year
        </p>
        <div
          className={`mt-1 text-4xl font-semibold sm:text-5xl ${
            result.remainingThisYear < 0 ? "text-danger" : "text-primary"
          }`}
        >
          <CountUpNumber value={Math.max(0, result.remainingThisYear)} />
        </div>

        {result.isOverContributed && (
          <div className="mt-4 rounded-lg border border-danger bg-danger-soft p-4">
            <p className="text-sm font-semibold text-danger">Overcontribution warning</p>
            <p className="mt-1 text-sm text-ink">
              Your contributions in {result.overContributedYears.join(", ")} exceed the
              participation room for {result.overContributedYears.length > 1 ? "those years" : "that year"}.
              CRA charges 1% per month on the excess — verify your numbers against CRA My Account
              and talk to a CPA if this is real.
            </p>
          </div>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-edge pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-subtle">Room for {CURRENT_YEAR}</dt>
            <dd className="num mt-0.5 font-semibold">
              {formatCAD(result.participationRoomThisYear)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">Incl. carry-forward</dt>
            <dd className="num mt-0.5 font-semibold">
              {formatCAD(result.carryForwardIntoThisYear)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">Lifetime room left</dt>
            <dd className="num mt-0.5 font-semibold">{formatCAD(result.lifetimeRemaining)}</dd>
          </div>
        </dl>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-ink">Lifetime limit used</span>
            <span className="num text-subtle">
              {formatCAD(result.lifetimeContributed)} / {formatCAD(FHSA_LIFETIME_LIMIT)}
            </span>
          </div>
          <div
            className="mt-2 h-3 overflow-hidden rounded-full bg-surface"
            role="progressbar"
            aria-valuenow={Math.round(lifetimePct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="FHSA lifetime limit used"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${lifetimePct}%` }}
            />
          </div>
        </div>

        {result.lifetimeContributed > 0 && (
          <div className="mt-4 rounded-lg border border-edge bg-primary-soft/50 p-4">
            <p className="text-sm text-ink">
              💡 FHSA contributions are <strong>tax-deductible</strong>, like an RRSP. If you
              haven&apos;t claimed your {formatCAD(result.lifetimeContributed)} in contributions on
              your tax returns, you can — deductions can also be carried forward to a
              higher-income year.
            </p>
          </div>
        )}

        <p className="mt-4 text-xs text-subtle">
          Assumes your FHSA participation period is still open (no qualifying home purchase, within
          15 years of opening, and under age 71).
        </p>

        <AiExplanation
          module="fhsa"
          enabled={
            openYear !== FHSA_FIRST_YEAR || years.some((y) => (contribRaw[y] ?? "") !== "")
          }
        />
      </Card>
    </div>
  );
}
