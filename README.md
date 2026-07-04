# TFSAware

**Know your numbers. No login required.**

Free Canadian personal finance tools: TFSA contribution room calculator, FHSA tracker, HISA
rate comparison, and net worth snapshot — with optional AI plain-English explanations.

## Run locally

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### Enable the AI features (optional)

Everything works without this; AI explanations and chat show a graceful fallback until a key
is configured.

```bash
cp .env.example .env.local
```

Put your Anthropic API key (from [console.anthropic.com](https://console.anthropic.com)) in
`.env.local`, then restart `npm run dev`.
