# Current Phase: MVP Build

---

## Phase 2A — Vision Pivot: Predictions Not Grades (IN PROGRESS)

Major repositioning from "website grader with scores" to "correlation layer with predictions."

**Full implementation plan:** `phases/vision-pivot.md`
**Vision details:** `vision.md`
**Decision rationale:** `decisions.md` D21

### Summary

| Phase | What | Status |
|-------|------|--------|
| 1.1 Foundation | Schema migration (types) | **DONE** |
| 1.2 Foundation | LLM prompts update | **DONE** |
| 2. Initial Audit | Results page redesign | Not started |
| 3. Chronicle | N+1 experience | Not started |
| 4. Dashboard | Activity stream | Not started |
| 5. Emails | Update templates | Not started |
| 6. Landing Page | New positioning | Not started |

### Phase 1.1 Completed
- [x] Created canonical types file (`src/lib/types/analysis.ts`)
- [x] Removed score display from dashboard and page timeline
- [x] Deleted leaderboard feature entirely (routes, pages, nav links, sitemap)
- [x] Removed score fields from API responses
- [x] Simplified email templates (removed score display)
- [x] Removed `hide_from_leaderboard` dead code
- [x] Legacy types kept for UI (will be updated in Phase 2)

### Phase 1.2 Completed
- [x] Rewrote SYSTEM_PROMPT: predictions not scores, brand voice, FriendlyText
- [x] Rewrote POST_ANALYSIS_PROMPT: Chronicle format (verdict, changes, suggestions, correlation)
- [x] New Finding type: id, elementType, prediction with friendlyText
- [x] New ChangesSummary type: verdict, changes[], suggestions[], correlation, progress
- [x] MetricType enum for type-safe predictions
- [x] Renamed: opportunityCount → findingsCount, expectedImpactRange → projectedImpactRange
- [x] Brand voice: "observant analyst" with Ouch/Aha/Huh emotional register
- [x] FriendlyText phrases with stakes ("Your button is invisible", "You're losing signups")

### Key Changes (remaining)
- Chronicle experience for N+1 (Phase 3)
- Dashboard as activity stream (Phase 4)
- Results page UI update for new types (Phase 2)

---

## Phase 1A — Free Audit (DONE)
The lead magnet. Paste URL → get findings with predictions.

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
- [x] Before/after comparison view on results page (finding statuses, category deltas)
- [x] Progress tracking: "2 of 5 issues fixed" with progress bar
- [x] **UPDATED (Phase 1.1):** Scores removed from UI. Predictions coming in Phase 1.2.
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
- [x] Dashboard page (`/dashboard`) — list of monitored pages
- [x] Page timeline page (`/pages/[id]`) — all scans, re-scan button, frequency selector
- [ ] **NEEDS UPDATE:** Redesign as activity stream (Phase 2A.4)
- [x] Results page context — shows "Scan #N of domain.com" with prev/next navigation
- [x] Email notifications — scan complete emails via Resend (daily/weekly/deploy scans, not manual)

**Status:** Complete. Users can monitor pages, see timeline, scheduled scans work, email notifications sent.

## Phase 1C-2 — Launch Prep (DONE)
Ship free for Founding 50, learn, then build billing with evidence.

### Founding 50 constraints
- [x] User cap: 50 users max (check on signup, show waitlist after)
- [x] Page limit: 1 page per user (check in `POST /api/pages`)
- [x] Scan frequency: Daily scans for Founding 50

### Share to unlock
- [x] Share mechanic: +1 page per share (instant credit, honor system)
- [x] UI: "Share to unlock more pages" with Twitter/LinkedIn/copy link
- [x] Track shares in user record (`bonus_pages` column)

### Waitlist (after 50)
- [x] Waitlist table + form + API
- [x] Landing page shows waitlist state when cap is hit
- [x] Free audit stays accessible (acquisition engine)

### Landing page updates
- [x] "Founding 50" messaging
- [x] Progress indicator ("X/50 spots claimed")

**Status:** Complete. Founding 50 system implemented with page limits, share-to-unlock, and waitlist.

### Implementation Details
- DB: `profiles.bonus_pages` + `profiles.is_founding_50` columns, `waitlist` table
- APIs: `/api/founding-status`, `/api/share-credit`, `/api/waitlist`
- Page limit enforced in `POST /api/pages` (403 with `error: "page_limit_reached"`)
- Auth callback redirects to `/waitlist` when cap reached and user is not founding member
- Landing page shows X/50 progress bar or waitlist message
- Dashboard shows slot count, opens ShareModal when at limit
- Login page shows waitlist form when founding 50 is full

---

## Phase 1C-3 — GitHub + PostHog + Correlation (DONE)
The integrations and correlation magic.

### GitHub Integration (DONE)
- [x] GitHub OAuth App → store access token in `integrations` table
- [x] GitHub webhook listener (push to main → capture commit, diff, timestamp)
- [x] Auto-scan after deploy (wait 45s for Vercel, then screenshot + audit)
- [x] `deploys` table stores commit SHA, message, changed files
- [x] Settings page UI (`/settings/integrations`) for connecting GitHub
- [x] Repo management (add/remove repos, webhook creation)
- [x] `deploy-detected` Inngest function for auto-scan flow
- [x] Simplified deploy scans — all user pages scanned on any repo push (MVP: 1 domain per user)
- [x] Delete page feature — dashboard delete with confirmation, cascades to analyses
- [x] Show deploy info on analysis results — deploy context passed to LLM + UI with expandable dropdown
- [x] `deploy_id` + `trigger_type` columns on analyses table
- [x] Deploy context passed to LLM for code↔page correlation

### PostHog Integration (DONE)
- [x] PostHog API integration (Query API with HogQL via PostHogAdapter)
- [x] Pull metrics: pageviews, unique visitors, bounce rate, custom events (via LLM tools)
- [x] Store tool call results in `analytics_snapshots` table
- [x] Unified post-analysis pipeline: comparison + correlation in one Gemini 3 Pro pass
- [x] LLM tools: discover_metrics, get_page_stats, query_trend, query_custom_event, get_funnel, compare_periods
- [x] Set up PostHog on getloupe.io (production tracking)

### Scan Trigger Context (DONE)
- [x] `trigger_type` column: 'manual' | 'daily' | 'weekly' | 'deploy' | null
- [x] UI shows trigger labels: "Daily scan" / "Weekly scan" / "Triggered by deploy abc1234"
- [x] Deploy-triggered scans show expandable commit info (SHA, message, author, changed files)

### Google Analytics 4 Integration (DONE)
- [x] GA4 API integration (Data API v1beta)
- [x] OAuth flow for GA4 connection (with refresh token handling)
- [x] Pull metrics: pageviews, users, bounce rate, session duration
- [x] Two-step flow: OAuth → property selection modal
- [x] Settings UI for connecting GA4 property
- [x] GA4 adapter implements same AnalyticsProvider interface as PostHog
- [x] Pipeline auto-detects PostHog or GA4 and uses appropriate adapter

**Status:** Complete. Full deploy→scan→correlation loop works end-to-end.

## Phase 1C-5 — Marketing Frameworks + Comparison View (DONE)
Strengthen LLM analysis quality and redesign the "What changed" UI.

### Marketing Framework Improvements (DONE)
- [x] Added Jobs-to-be-Done (JTBD) evaluation to audit prompt
- [x] Added Message-Market Match (does copy resonate with specific audience?)
- [x] Added Differentiation / "Only" test (could competitor say the same thing?)
- [x] Added Awareness Stages (Schwartz) — problem-aware vs solution-aware messaging
- [x] Added Risk Reversal evaluation (guarantees, objection handling)
- [x] Post-analysis prompt now has stricter quality criteria for "resolved" vs "improved"

### Comparison View Redesign (DONE)
- [x] 5 evaluation states: resolved (green), improved (amber), unchanged (gray), regressed (red), new (red)
- [x] `quality_assessment` field now displayed — shows WHY the LLM gave each evaluation
- [x] Expandable evaluation cards with progressive disclosure
- [x] Segmented progress bar showing all states (not just resolved)
- [x] Analytics insights card when PostHog connected
- [x] Deploy context banner showing commit info within "What changed" section
- [x] Element badges that highlight when changed files match finding elements

**Status:** Complete. LLM provides nuanced quality evaluation, UI displays full context.

## Phase 1D — Billing (DEFERRED)
Build after learning from first 50 users.

- [ ] Stripe integration (price TBD based on user feedback)
- [ ] Grandfather early users
- [x] Settings page (integrations, email preferences) — `/settings/integrations` done

**Done when:** Someone can pay and use the pro tier.

## Phase 1C-4 — Leaderboard (DELETED)
~~Public leaderboard showing top-scoring sites with backlinks.~~

**Status:** Deleted in Phase 2A vision pivot. Score-based leaderboard doesn't fit the new predictions model. Code removed: routes, pages, nav links, sitemap entry, `hide_from_leaderboard` column references.

---

## Phase 1E — SEO Landing Pages (PAUSED)

12 SEO landing pages to capture traffic from AI coding tool users.

### Tier 1: Core SEO Pages (DONE)
- [x] `/monitor-website-changes` — reviewed, ICP-aligned
- [x] `/website-audit` — reviewed, ICP-aligned
- [x] `/alternatives/visualping` — reviewed, ICP-aligned, honest comparison

### Tier 2: Tool Pages (DONE)
- [x] `/for/lovable`, `/for/bolt`, `/for/cursor`, `/for/v0`, `/for/replit`, `/for/base44`
- [x] Tool-specific pain points (not generic AI complaints)
- [x] Dynamic template uses tool name in headers

### Tier 3: Integration Guides (NEEDS WORK)
- [ ] `/guides/posthog` — currently marketing fluff, needs to be actual documentation
- [ ] `/guides/ga4` — same issue
- [ ] `/guides/github` — same issue

**Problem with guides:** They're SEO landing pages pretending to be documentation. Someone clicking "PostHog Integration Guide" expects HOW to connect, not WHY they should.

**TODO for guides:**
1. Add actual screenshots of the settings/connection flow
2. Show what permissions are requested
3. Explain what data syncs and what doesn't
4. Add troubleshooting section
5. Make "steps" actual user actions, not feature descriptions

**Alternative:** Kill these pages and handle integration setup in-app or actual docs.

---

## What's NOT in MVP
- Team tier
- Multi-page free tier
- Mobile app
- Deploy previews (scan staging before merge)
- Embedded findings for trend analysis
