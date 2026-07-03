"use client";

import { useEffect, useMemo, useState } from "react";
import { AiExplanation } from "@/components/ai/AiExplanation";
import { Card } from "@/components/ui/Card";
import { CountUpNumber } from "@/components/ui/CountUpNumber";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { YearSelect } from "@/components/ui/YearSelect";
import { getCurrentYear, TFSA_FIRST_YEAR } from "@/lib/constants";
import { formatCAD, parseDollarInput } from "@/lib/currency";
import { calculateTfsaRoom } from "@/lib/tfsa";
import { useUserState } from "@/lib/user-state";
import { readUrlParams, writeUrlParams } from "@/lib/url-state";

const CURRENT_YEAR = getCurrentYear();

export function TfsaCalculator() {
  const { update } = useUserState();
  const [eligibilityYear, setEligibilityYear] = useState(TFSA_FIRST_YEAR);
  const [contribBefore, setContribBefore] = useState("");
  const [withdrawBefore, setWithdrawBefore] = useState("");
  const [contribThisYear, setContribThisYear] = useState("");
  const [withdrawThisYear, setWithdrawThisYear] = useState("");

  // One-time restore of shareable state from the URL after hydration. setState
  // in this mount effect is intentional — reading window.location during
  // render would break SSR hydration.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const p = readUrlParams();
    const year = Number(p.get("ty"));
    if (Number.isInteger(year) && year >= TFSA_FIRST_YEAR && year <= CURRENT_YEAR) {
      setEligibilityYear(year);
    }
    if (p.get("tcb")) setContribBefore(p.get("tcb")!);
    if (p.get("twb")) setWithdrawBefore(p.get("twb")!);
    if (p.get("tcy")) setContribThisYear(p.get("tcy")!);
    if (p.get("twy")) setWithdrawThisYear(p.get("twy")!);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    writeUrlParams({
      ty: eligibilityYear === TFSA_FIRST_YEAR ? null : String(eligibilityYear),
      tcb: contribBefore || null,
      twb: withdrawBefore || null,
      tcy: contribThisYear || null,
      twy: withdrawThisYear || null,
    });
  }, [eligibilityYear, contribBefore, withdrawBefore, contribThisYear, withdrawThisYear]);

  const result = useMemo(
    () =>
      calculateTfsaRoom({
        eligibilityYear,
        contributionsBeforeThisYear: parseDollarInput(contribBefore),
        withdrawalsBeforeThisYear: parseDollarInput(withdrawBefore),
        contributionsThisYear: parseDollarInput(contribThisYear),
        withdrawalsThisYear: parseDollarInput(withdrawThisYear),
        currentYear: CURRENT_YEAR,
      }),
    [eligibilityYear, contribBefore, withdrawBefore, contribThisYear, withdrawThisYear],
  );

  // Share the latest numbers with the AI layer (numbers and years only)
  useEffect(() => {
    update("tfsa", {
      eligibilityYear: result.effectiveEligibilityYear,
      contributionsBeforeThisYear: parseDollarInput(contribBefore),
      withdrawalsBeforeThisYear: parseDollarInput(withdrawBefore),
      contributionsThisYear: parseDollarInput(contribThisYear),
      withdrawalsThisYear: parseDollarInput(withdrawThisYear),
      totalRoomAccumulated: result.totalRoomAccumulated,
      availableRoomNow: result.availableRoomNow,
    });
  }, [result, contribBefore, withdrawBefore, contribThisYear, withdrawThisYear, update]);

  const withdrawnThisYear = parseDollarInput(withdrawThisYear);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-display text-lg font-semibold">Your TFSA details</h2>
        <p className="mt-1 text-sm text-subtle">
          Add up contributions and withdrawals across <em>all</em> your TFSAs, at every
          institution. CRA tracks one limit per person, not per account.
        </p>

        <div className="mt-4 space-y-4">
          <YearSelect
            label={`Year you turned 18 (or became a Canadian resident, whichever is later)`}
            hint={`Pick ${TFSA_FIRST_YEAR} if that happened in ${TFSA_FIRST_YEAR} or earlier — TFSA room started in ${TFSA_FIRST_YEAR}.`}
            value={eligibilityYear}
            onChange={setEligibilityYear}
            minYear={TFSA_FIRST_YEAR}
            maxYear={CURRENT_YEAR}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyInput
              label={`Contributions before ${CURRENT_YEAR}`}
              hint="Everything you've ever put in, up to Dec 31 last year"
              value={contribBefore}
              onChange={setContribBefore}
            />
            <MoneyInput
              label={`Withdrawals before ${CURRENT_YEAR}`}
              hint="Everything you've ever taken out, up to Dec 31 last year"
              value={withdrawBefore}
              onChange={setWithdrawBefore}
            />
            <MoneyInput
              label={`Contributions in ${CURRENT_YEAR} so far`}
              value={contribThisYear}
              onChange={setContribThisYear}
            />
            <MoneyInput
              label={`Withdrawals in ${CURRENT_YEAR} so far`}
              hint={`These only come back as room on Jan 1, ${CURRENT_YEAR + 1}`}
              value={withdrawThisYear}
              onChange={setWithdrawThisYear}
            />
          </div>
        </div>
      </Card>

      <Card className={result.isOverContributed ? "border-danger" : ""}>
        <p className="text-sm font-medium text-subtle">
          {result.isOverContributed
            ? "You appear to be over your limit by"
            : `Available TFSA room right now`}
        </p>
        <div
          className={`mt-1 text-4xl font-semibold sm:text-5xl ${
            result.isOverContributed ? "text-danger" : "text-primary"
          }`}
        >
          <CountUpNumber value={Math.abs(result.availableRoomNow)} />
        </div>

        {result.isOverContributed && result.excessAfterWithdrawals > 0 && (
          <div className="mt-4 rounded-lg border border-danger bg-danger-soft p-4">
            <p className="text-sm font-semibold text-danger">Overcontribution warning</p>
            <p className="mt-1 text-sm text-ink">
              CRA charges a penalty of 1% per month on your highest excess amount until it&apos;s
              withdrawn. Consider withdrawing{" "}
              <strong className="num">{formatCAD(result.excessAfterWithdrawals)}</strong> as soon
              as possible, and double-check your figures against CRA My Account.
              {withdrawnThisYear > 0 && (
                <>
                  {" "}
                  (We&apos;ve already credited the {formatCAD(withdrawnThisYear)} you withdrew
                  this year, assuming it came after the excess.)
                </>
              )}
            </p>
          </div>
        )}

        {result.isOverContributed && result.excessAfterWithdrawals === 0 && (
          <div className="mt-4 rounded-lg border border-warning bg-warning-soft p-4">
            <p className="text-sm font-semibold text-ink">Excess likely already withdrawn</p>
            <p className="mt-1 text-sm text-ink">
              If your {formatCAD(withdrawnThisYear)} withdrawal came after the excess arose, the
              1%/month penalty stopped when you withdrew it. Your room still shows negative until
              January 1, {result.roomReturnsOnJan1Of} — don&apos;t recontribute before then, and
              confirm the timing with CRA My Account.
            </p>
          </div>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-edge pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-subtle">
              Total room since {result.effectiveEligibilityYear}
            </dt>
            <dd className="num mt-0.5 font-semibold">{formatCAD(result.totalRoomAccumulated)}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">Contributed in {CURRENT_YEAR}</dt>
            <dd className="num mt-0.5 font-semibold">{formatCAD(result.roomUsedThisYear)}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">
              More you can add in {CURRENT_YEAR}
            </dt>
            <dd className="num mt-0.5 font-semibold">
              {formatCAD(Math.max(0, result.availableRoomNow))}
            </dd>
          </div>
        </dl>

        {withdrawnThisYear > 0 && !result.isOverContributed && (
          <div className="mt-4 rounded-lg border border-warning bg-warning-soft p-4">
            <p className="text-sm text-ink">
              Heads up: the <strong className="num">{formatCAD(withdrawnThisYear)}</strong> you
              withdrew this year is <em>not</em> part of today&apos;s room. It comes back on{" "}
              <strong>January 1, {result.roomReturnsOnJan1Of}</strong> — recontributing it before
              then counts as a new contribution and can put you over your limit.
            </p>
          </div>
        )}

        <AiExplanation
          module="tfsa"
          enabled={
            contribBefore !== "" ||
            withdrawBefore !== "" ||
            contribThisYear !== "" ||
            withdrawThisYear !== "" ||
            eligibilityYear !== TFSA_FIRST_YEAR
          }
        />
      </Card>
    </div>
  );
}
