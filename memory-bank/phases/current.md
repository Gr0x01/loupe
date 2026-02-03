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

## Phase 1C-2 — Launch Prep (IN PROGRESS)
Ship free for Founding 50, learn, then build billing with evidence.

### Founding 50 constraints
- [ ] User cap: 50 users max (check on signup, show waitlist after)
- [ ] Page limit: 1 page per user (check in `POST /api/pages`)
- [ ] Scan frequency: Daily scans for Founding 50

### Share to unlock
- [ ] Share mechanic: +1 page per share (instant credit, honor system)
- [ ] UI: "Share to unlock more pages" with Twitter/LinkedIn/copy link
- [ ] Track shares in user record (`bonus_pages` column)

### Waitlist (after 50)
- [ ] Waitlist table + form + API
- [ ] Landing page shows waitlist state when cap is hit
- [ ] Free audit stays accessible (acquisition engine)

### Landing page updates
- [ ] "Founding 50" messaging
- [ ] Progress indicator ("X/50 spots claimed")

**Done when:** Can sign up, hit limits, share to unlock, and waitlist after 50.

---

## Phase 1C-3 — GitHub + PostHog + Correlation (GITHUB DONE)
The integrations and correlation magic.

### GitHub Integration (DONE)
- [x] GitHub OAuth App → store access token in `integrations` table
- [x] GitHub webhook listener (push to main → capture commit, diff, timestamp)
- [x] Auto-scan after deploy (wait 45s for Vercel, then screenshot + audit)
- [x] `deploys` table stores commit SHA, message, changed files
- [x] Settings page UI (`/settings/integrations`) for connecting GitHub
- [x] Repo management (add/remove repos, webhook creation)
- [x] `deploy-detected` Inngest function for auto-scan flow
- [ ] Link pages to repos (page settings UI) — minor UI addition
- [ ] Show deploy info on analysis results — minor UI addition

### PostHog Integration (NOT STARTED)
- [ ] PostHog API integration (Query API with HogQL)
- [ ] Pull metrics: pageviews, unique visitors, bounce rate, custom events
- [ ] Store metric snapshots on analysis records
- [ ] Correlation engine: LLM call after scan with deploy + metrics context
- [ ] Set up PostHog on getloupe.io

**Done when:** Push to main → Loupe auto-scans → shows "this deploy changed X, metrics moved Y."

## Phase 1D — Billing (DEFERRED)
Build after learning from first 50 users.

- [ ] Stripe integration (price TBD based on user feedback)
- [ ] Grandfather early users
- [ ] Settings page (integrations, email preferences)

**Done when:** Someone can pay and use the pro tier.

## What's NOT in MVP
- Team tier
- Multi-page free tier
- Mobile app
- Deploy previews (scan staging before merge)
- Embedded findings for trend analysis
