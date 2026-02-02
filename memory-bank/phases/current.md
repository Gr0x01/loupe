# Current Phase: MVP Build

## Phase 1A — Free Analysis Tool (lead magnet)
Get something live and shareable.

- [ ] Next.js app scaffolding (Supabase, Vercel AI SDK, Tailwind)
- [ ] Connect screenshot service (Vultr Puppeteer instance)
- [ ] Build LLM analysis pipeline (marketing agent + design agent + orchestrator)
- [ ] Landing page with URL input → screenshot → analysis results
- [ ] Shareable results card
- [ ] Email gate on second use

**Done when:** Someone can enter a URL and get a useful analysis back.

## Phase 1B — Monitoring + Alerts
The actual product loop.

- [ ] Auth (Supabase Auth, magic link or Google)
- [ ] Save pages to monitor (1 free)
- [ ] Inngest scheduled jobs — weekly screenshots
- [ ] Change detection (pixelmatch + LLM description of what shifted)
- [ ] Email alerts: "Your page changed — here's what shifted and what to do"
- [ ] Upgrade prompts in emails

**Done when:** A user adds a page, we catch a change next week, and they get an email about it.

## Phase 1C — Dashboard + Billing
Make it a real product.

- [ ] Dashboard — list of monitored pages with status
- [ ] Page detail — snapshot history, change diffs, analysis results
- [ ] Stripe integration (Pro at $19/mo)
- [ ] Pro tier: multiple pages, unlimited on-demand analysis

**Done when:** Someone can pay you money and see their change history.

## What's NOT in MVP
- GitHub deploy tracking (v2)
- PostHog/GA4 analytics correlation (v2)
- Team tier
- Mobile app
