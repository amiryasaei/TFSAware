"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Snapshot of what the user has entered/calculated, shared with the AI layer
 * so explanations and chat answers are personalized.
 *
 * PRIVACY INVARIANT: every field is a number (dollar amounts and years).
 * No names, emails, institutions, or free text ever goes in here — this is the
 * only user data sent to the AI API, and the server re-sanitizes it too.
 */
export interface AiUserState {
  tfsa?: {
    eligibilityYear: number;
    contributionsBeforeThisYear: number;
    withdrawalsBeforeThisYear: number;
    contributionsThisYear: number;
    withdrawalsThisYear: number;
    totalRoomAccumulated: number;
    availableRoomNow: number;
  };
  fhsa?: {
    openYear: number;
    lifetimeContributed: number;
    participationRoomThisYear: number;
    carryForwardIntoThisYear: number;
    remainingThisYear: number;
    lifetimeRemaining: number;
  };
  netWorth?: {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
  };
}

interface UserStateContextValue {
  state: AiUserState;
  update: <K extends keyof AiUserState>(key: K, value: AiUserState[K]) => void;
}

const UserStateContext = createContext<UserStateContextValue | null>(null);

export function UserStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AiUserState>({});

  const update = useCallback(
    <K extends keyof AiUserState>(key: K, value: AiUserState[K]) => {
      setState((prev) => {
        // avoid re-render loops from effect-driven updates with equal values
        if (JSON.stringify(prev[key]) === JSON.stringify(value)) return prev;
        return { ...prev, [key]: value };
      });
    },
    [],
  );

  const value = useMemo(() => ({ state, update }), [state, update]);
  return <UserStateContext.Provider value={value}>{children}</UserStateContext.Provider>;
}

export function useUserState(): UserStateContextValue {
  const ctx = useContext(UserStateContext);
  if (!ctx) throw new Error("useUserState must be used inside UserStateProvider");
  return ctx;
}
