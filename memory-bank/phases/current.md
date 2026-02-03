# Current Phase: MVP Build

## Phase 1A — Free Audit (DONE)
The lead magnet. Paste URL → get scored audit.

- [x] Next.js app scaffolding (Supabase, Vercel AI SDK, Tailwind)
- [x] Supabase schema (`analyses` table + `screenshots` storage bucket)
- [x] Connect screenshot service (Vultr Puppeteer instance)
- [x] Upgrade screenshot service with stealth plugin + Decodo residential proxy
- [x] Build LLM analysis pipeline (single Sonnet call, structured JSON output)
- [x] Inngest background job (`analysis/created` event handler)
- [x] API routes (`POST /api/analyze`, `GET /api/analysis/[id]`)
- [x] Landing page with URL input → analysis results
- [x] Results page (`/analysis/[id]`) with score, categories, findings
- [x] LLM pipeline evaluation → Gemini 3 Pro won (best quality, lowest cost, fast)
- [x] Rate limiting / bot protection
- [x] Auth (Supabase Auth, magic link + Google OAuth)
- [ ] Shareable results card (OG image generation)

**Status:** Complete. Free audit works end-to-end. Auth implemented.

## Phase 1B — Re-scan + Structured Tracking (DONE)
The activation moment. User fixes their page → re-scans → sees progress.

- [x] Add `parent_analysis_id` + `changes_summary` to `analyses` table
- [x] Re-scan API (`POST /api/rescan`, auth-required)
- [x] Pass 2 LLM call: Gemini Flash compares current vs previous findings (resolved/persists/regressed/new)
- [x] Running summary pattern (compressed narrative carried across scans)
- [x] Wire up "Re-scan" button on results page (auth-gated)
- [x] Magic link endpoint (`POST /api/auth/magic-link`) with origin-validated redirects
- [x] Auth callback handles `?rescan=` param → auto-creates re-scan after login
- [x] Before/after comparison view on results page (score delta, finding statuses, category deltas)
- [x] Progress tracking: "2 of 5 issues fixed" with progress bar
- [x] Audit prompt upgraded with methodology grounding (PAS, Fogg, Cialdini, Gestalt, etc.)
- [x] Findings now include `methodology` and `element` fields for trackability
- [ ] Shareable results card (OG image generation) — carried from 1A

**Status:** Complete. Re-scan pipeline works end-to-end. Comparison view renders on results page.

**Known gaps (acceptable for now):**
- No ownership check on re-scan (audits are public/shareable by design)
- LLM JSON responses are not schema-validated at runtime
- Comparison failure is silently swallowed (analysis still completes, just no comparison section)

## Phase 1C-1 — Page History + Scheduled Scans (DONE)
Foundation for integrations. Users can track pages over time.

- [x] `pages` table — users register URLs to track (with RLS)
- [x] Pages API — `GET/POST /api/pages`, `DELETE/PATCH /api/pages/[id]`, `GET /api/pages/[id]/history`
- [x] Auto-update `pages.last_scan_id` when analysis completes
- [x] Auto-register page on re-scan (bridges 1B → 1C naturally)
- [x] Scheduled scans — Inngest cron: weekly (Monday 9am UTC) + daily (9am UTC) re-scans
- [x] Dashboard page (`/dashboard`) — list of monitored pages with scores/deltas
- [x] Page timeline page (`/pages/[id]`) — all scans, score trend chart, re-scan button, frequency selector
- [x] Results page context — shows "Scan #N of domain.com" with prev/next navigation
- [ ] Email notifications — "Your weekly scan is ready" via Resend (stretch goal)

**Status:** Complete. Users can monitor pages, see timeline, scheduled scans work.

## Phase 1C-2 — GitHub + PostHog + Correlation (NOT STARTED)
The integrations and correlation magic.

- [ ] GitHub OAuth App → store access token in `integrations` table
- [ ] GitHub webhook listener (push to main → capture commit, diff, timestamp)
- [ ] Auto-scan after deploy (wait for Vercel, then screenshot + audit)
- [ ] `deploys` table stores commit SHA, message, changed files
- [ ] PostHog API integration (Query API with HogQL)
- [ ] Pull metrics: pageviews, unique visitors, bounce rate, custom events
- [ ] Store metric snapshots on analysis records
- [ ] Correlation engine: LLM call after scan with deploy + metrics context
- [ ] Set up PostHog on getloupe.io

**Done when:** Push to main → Loupe auto-scans → shows "this deploy changed X, metrics moved Y."

## Phase 1D — Billing
Make it a real product.

- [ ] Stripe integration (Pro at $19/mo)
- [ ] Free tier limits: 1 page, weekly scans only
- [ ] Settings page (integrations, email preferences)

**Done when:** Someone can pay and use the pro tier.

## What's NOT in MVP
- Team tier
- Multi-page free tier
- Mobile app
- Deploy previews (scan staging before merge)
- Embedded findings for trend analysis
