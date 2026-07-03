# TFSAware

**Know your numbers. No login required.**

A fast, no-login web app that gives Canadians one place to understand their registered-account
contribution room, compare savings rates, and track their net worth.

- **TFSA Room** — exact CRA contribution-room math, including the withdrawal timing rule
  (withdrawals only come back as room on January 1 of the following year)
- **FHSA** — participation room with the $8,000 carry-forward rule and the $40,000 lifetime cap
- **HISA Rates** — a hand-maintained comparison table of Canadian high-interest savings rates
- **Net Worth** — a manual snapshot with an asset-breakdown chart, saved in the browser only
- **AI layer** — plain-English explanations of every result plus a chat assistant, powered by
  the Claude API with the user's calculator numbers (and nothing else) as context

**Privacy:** no login, no database, no analytics, no cookies. Calculator inputs live in the URL
and localStorage. The only data sent to a server is the numbers themselves, to generate AI
explanations — never names, emails, or any personal information.

## Running locally

```bash
npm install
npm run dev
```

AI explanations and chat need an Anthropic API key (everything else works without one):

```bash
cp .env.example .env.local
# then put your key in .env.local
```

## Tests

The CRA calculation logic is pure TypeScript in `lib/` with a vitest suite covering the full
test matrix (eligibility years, withdrawal timing, carry-forward, lifetime caps,
overcontribution):

```bash
npm test
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com), **Add New Project** → import the repo → deploy
   (no configuration needed; defaults are correct).
3. In **Project → Settings → Environment Variables**, add `ANTHROPIC_API_KEY` with a key from
   [console.anthropic.com](https://console.anthropic.com) → redeploy.
4. Set a **spend limit** in the Anthropic console — the AI endpoint is public, and the built-in
   rate limit is a soft guard, not a billing firewall.

## Maintenance

| What | Where | When |
|---|---|---|
| HISA rates | `lib/hisa-rates.ts` | Weekly — update `ratePct` and `lastUpdated` per row |
| Referral links | `lib/hisa-rates.ts` (`url` fields) | When affiliate accounts are approved |
| TFSA annual limit | `lib/constants.ts` (`TFSA_ANNUAL_LIMITS` + `MAX_SUPPORTED_YEAR`) | Once a year, when CRA announces it (mid-November) |
| Corrections email | `components/hisa/HisaTable.tsx` | If it changes |
| LinkedIn/GitHub links | `components/Dashboard.tsx` footer | Before launch |

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Anthropic Claude API (`claude-sonnet-4-6`)
· vitest · deployed on Vercel. No other runtime dependencies — the chart and count-up animation
are hand-rolled SVG/rAF to keep the bundle small.
