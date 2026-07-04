"use client";

import { useEffect, useRef, useState } from "react";
import { ChatWidget } from "@/components/ai/ChatWidget";
import { FhsaTracker } from "@/components/fhsa/FhsaTracker";
import { HisaTable } from "@/components/hisa/HisaTable";
import { NetWorth } from "@/components/networth/NetWorth";
import { TfsaCalculator } from "@/components/tfsa/TfsaCalculator";
import { UserStateProvider } from "@/lib/user-state";
import { readUrlParams, writeUrlParams } from "@/lib/url-state";

const TABS = [
  { id: "tfsa", label: "TFSA Room" },
  { id: "fhsa", label: "FHSA" },
  { id: "hisa", label: "HISA Rates" },
  { id: "networth", label: "Net Worth" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function Dashboard() {
  const [active, setActive] = useState<TabId>("tfsa");
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  // One-time restore of the active tab from the URL after hydration.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const tab = readUrlParams().get("tab");
    if (TABS.some((t) => t.id === tab)) setActive(tab as TabId);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function selectTab(id: TabId) {
    setActive(id);
    writeUrlParams({ tab: id === "tfsa" ? null : id });
  }

  // WAI-ARIA tabs keyboard pattern: arrows move + select, Home/End jump.
  function onTablistKeyDown(e: React.KeyboardEvent) {
    const index = TABS.findIndex((t) => t.id === active);
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    const id = TABS[next].id;
    selectTab(id);
    tabRefs.current[id]?.focus();
  }

  return (
    <UserStateProvider>
      <header className="border-b border-edge bg-card">
        <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-primary">
            TFSAware
          </h1>
          <p className="mt-0.5 text-sm text-subtle">Know your numbers. No login required.</p>
        </div>

        <nav
          className="mx-auto w-full max-w-4xl overflow-x-auto px-4 sm:px-6"
          aria-label="Tools"
        >
          <div role="tablist" className="flex gap-1" onKeyDown={onTablistKeyDown}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={active === tab.id}
                aria-controls={`panel-${tab.id}`}
                tabIndex={active === tab.id ? 0 : -1}
                onClick={() => selectTab(tab.id)}
                className={`whitespace-nowrap rounded-t-lg border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-subtle hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        <div id="panel-tfsa" role="tabpanel" aria-labelledby="tab-tfsa" hidden={active !== "tfsa"}>
          <TfsaCalculator />
        </div>
        <div id="panel-fhsa" role="tabpanel" aria-labelledby="tab-fhsa" hidden={active !== "fhsa"}>
          <FhsaTracker />
        </div>
        <div id="panel-hisa" role="tabpanel" aria-labelledby="tab-hisa" hidden={active !== "hisa"}>
          <HisaTable />
        </div>
        <div
          id="panel-networth"
          role="tabpanel"
          aria-labelledby="tab-networth"
          hidden={active !== "networth"}
        >
          <NetWorth />
        </div>
      </main>

      <footer className="border-t border-edge bg-card">
        <div className="mx-auto w-full max-w-4xl space-y-2 px-4 py-6 text-xs text-subtle sm:px-6">
          <p>
            Not financial advice. For your official contribution room, verify with{" "}
            <a
              href="https://www.canada.ca/en/revenue-agency/services/e-services/cra-login-services.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2"
            >
              CRA My Account
            </a>
            .
          </p>
          <p>
            Your numbers stay in your browser — no accounts, no analytics, no cookies, nothing
            stored on our servers. The optional AI explanations send only anonymous dollar
            amounts and years to generate the text; never your name, email, or anything else.
          </p>
          <p>CRA limits and HISA rates last updated July 2026.</p>
          <p>
            Built by Amir Yasaei ·{" "}
            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2"
            >
              LinkedIn
            </a>
          </p>
        </div>
      </footer>

      <ChatWidget />
    </UserStateProvider>
  );
}
