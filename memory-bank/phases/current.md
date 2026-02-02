# Current Phase: MVP Build

## Phase 1A — Free Analysis Tool (lead magnet)
Get something live and shareable.

- [x] Next.js app scaffolding (Supabase, Vercel AI SDK, Tailwind)
- [x] Supabase schema (`analyses` table + `screenshots` storage bucket)
- [x] Connect screenshot service (Vultr Puppeteer instance)
- [x] Upgrade screenshot service with stealth plugin + Decodo residential proxy
- [x] Build LLM analysis pipeline (single Sonnet call, structured JSON output)
- [x] Inngest background job (`analysis/created` event handler)
- [x] API routes (`POST /api/analyze`, `GET /api/analysis/[id]`)
- [x] Landing page with URL input → analysis results
- [x] Results page (`/analysis/[id]`) with score, categories, findings
- [ ] LLM pipeline evaluation (test configs A-D against ~10 URLs)
- [ ] Shareable results card (OG image generation)
- [ ] Email gate on second use
- [ ] Rate limiting / bot protection (before launch)

**Done when:** Someone can enter a URL and get a useful analysis back.

**Status:** Core pipeline works end-to-end. Screenshot → Upload → LLM analysis → Results display. UI has been styled with Instrument Serif + DM Sans, dark tech aesthetic with electric cyan accent (D9).

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
