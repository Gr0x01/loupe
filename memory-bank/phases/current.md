# Current Phase: MVP Build — Beta Mode

## Beta Pricing (Active)

Product is in beta. Beta badge in nav, 50% off pricing locked for life.

| | Free | Pro (Beta) | Scale (Beta) |
|---|:---:|:---:|:---:|
| Price | $0 | $19/mo (was $39) | $49/mo (was $99) |
| Lock | — | For life | For life |

- **Monthly billing only** during beta (annual toggle removed)
- **Stripe coupon**: `BETA_50` (50% off, `duration: "forever"`) auto-applied at checkout
- **Env var**: `STRIPE_BETA_COUPON_ID=BETA_50` (in `.env.local`, needs adding to Vercel)
- **14-day trial still active** alongside beta pricing (trial → then discounted monthly)
- **Nav badge**: "Beta" in violet, next to logo (desktop + mobile)
- **Pricing page**: strikethrough original price, "$X/mo after beta" subtext
- **FAQ**: "Will my beta price go up?" → No, locked for life
- **Script**: `scripts/create-beta-coupon.ts` (already run, coupon exists in Stripe)

### When exiting beta:
1. Remove `STRIPE_BETA_COUPON_ID` env var (stops applying coupon to new checkouts)
2. Existing subscribers keep lifetime discount (Stripe handles this)
3. Remove beta badge from `SiteNav.tsx`, remove `.beta-badge` from `shared.css`
4. Restore annual billing toggle in `PricingContent.tsx`
5. Revert pricing display to use `TIER_INFO` prices directly

---

### Unauthenticated Stripe Checkout (D44, Feb 17, 2026)

Pricing buttons go directly to Stripe — no login required. Webhook creates user account from Stripe-collected email, sends welcome magic link. See `architecture.md` Billing section.

### Instant Page Claim + Activation System (D46, Feb 17, 2026)

6/6 external signups churned — empty dashboards because magic link was prerequisite for page creation.

**Instant claim** (`POST /api/auth/claim-link`): Creates user + claims page + sets trial on email submit. No magic link required. Email is now "sign in to your dashboard". `handleClaim` in auth callback simplified to redirect-only.

**Auto-claim at auth** (`handleEmailAutoClaim` in callback): 0-page users with matching unclaimed analysis get page auto-created on sign-in. Covers OAuth + separate magic link flows.

**Nudge email** (`onboardingNudge` cron, 1pm UTC): Users 4–48h old with no pages get nudge. Idempotency: `profiles.onboarding_nudge_sent_at`.

**PostHog tracking fixes**: `ServerEvent` type union, `is_internal` person property, `page_claim_attempted` (client) vs `page_claimed` (server), `filterTestAccounts: true` on all dashboard insights.

Key files: `src/app/api/auth/claim-link/route.ts`, `src/app/auth/callback/route.ts`, `src/lib/posthog-server.ts`, `src/lib/analytics/track.ts`, `src/lib/inngest/functions/scheduled.ts`.

---

## Architecture Reference

### Cron & Reliability

Inngest crons go stale after Vercel deploys. All critical crons have Vercel Cron backups.

| Cron | Inngest | Vercel Backup | Purpose |
|------|---------|---------------|---------|
| Daily scans | 9:00 UTC | 9:15 UTC (`/api/cron/daily-scans`) | Screenshot + full analysis |
| Checkpoints | 10:30 UTC | 10:45 UTC (`/api/cron/checkpoints`) | Multi-horizon outcome assessment |
| Daily digest | 11:00 UTC | — | Consolidated email (Inngest only, retries: 1) |
| Onboarding nudge | 13:00 UTC | — | Nudge users with no pages (Inngest only, retries: 0) |
| Screenshot health | */30 * * * * | — | Pings screenshot service (Inngest only) |

Backups: `CRON_SECRET` auth, self-healing (creates missing scans), re-syncs Inngest, per-page idempotency.

### RFC-0001: Canonical Change Intelligence

Multi-horizon checkpoint system. Full RFC: `memory-bank/projects/loupe-canonical-change-intelligence-rfc.md`

| Component | What |
|-----------|------|
| Progress composer | `composeProgressFromCanonicalState()` — fail-closed (canonical → fallback → never LLM) |
| Checkpoint engine | `change_checkpoints` table, `resolveStatusTransition()`, D+7/14/30/60/90 horizons |
| LLM-as-analyst | `runCheckpointAssessment()` — all data sources, stored reasoning, confidence |
| Strategy narrative | `runStrategyNarrative()` — non-fatal, deterministic fallback |
| Outcome feedback | `outcome_feedback` table, thumbs up/down calibrates future assessments |
| Suggestions | `tracked_suggestions` endpoints + composer integration |
| Attribution | `formatOutcomeText()` — confidence-banded language (high/medium/low/null) |
| Tests | 74 unit tests (Vitest): checkpoint (33), pipeline (18), progress (8), attribution (15) |
| Launch gates | SQL validation queries in `memory-bank/projects/rfc-0001-launch-gates.md` |

UI: Checkpoint chips on timeline cards, evidence panel on resolved outcomes, outcome feedback (thumbs up/down).

### Login Page Activation Bridge (D45, Feb 17, 2026)

Login page redesigned from generic "Sign in to Loupe" to contextual activation bridge. Two-column split: left has contextual headline (`?from=audit/pricing/track`) + numbered steps (claim → screenshots → outcome tracking); right has auth card. Domain pill when URL context available. `loupe_pending_domain` persisted to localStorage → dashboard claim suggestions. Pending audit TTL 30min→24h. Pricing links pass `&from=pricing`.

Key files: `src/app/login/page.tsx`, `src/app/dashboard/page.tsx`, `src/components/pricing/PricingContent.tsx`.

### Audit-to-Tracking Education Bridge (D43, Feb 17, 2026)

Category problem: users filed Loupe as "site audit tool" → got findings → bounced. Reframed audit page from finished report to open predictions using Chronicle patterns in empty/future state.

| Element | What |
|---------|------|
| Checkpoint chips on findings | Empty 7d/14d/30d pips below each prediction line |
| "What you get after signup" | Two-panel: verification timeline + example tracked outcome card |
| Outcome preview card | Real finding data in Chronicle validated card style, no fake metrics |
| Language shift | "Claim" → "Track", "What to fix" → "What to change", "opportunities" → "predictions" |
| Loading screen | `OUTCOME_EXAMPLES` — change→outcome pairs, not change-detection alerts |
| Findings section header | Inline horizon chips (Now · 7d · 14d · 30d) next to "What to change" |

Key files: `src/app/analysis/[id]/page.tsx` (JSX), `src/app/analysis.css` (new CSS sections: `finding-checkpoint-*`, `next-proof-*`, `whats-next-*`, `outcome-preview-*`)

Brand guardian updated with pre-PMF stage context (`.claude/agents/brand-guardian.md`).

---

### Dashboard V2 Redesign

Proof-first layout in `src/app/dashboard/page.tsx` (all components inline). Scales from 1 to 25+ pages.

- **StatsBar**: page count, last scan, attention/watching/wins pills, add page button
- **ProofBanner**: validated wins with before/after, metric %, LLM observations (only `status === "validated"`)
- **PageList**: compact ~48px rows, status dots, metric focus badges, sorted by urgency

Design: max-w-4xl, no delete on rows (belongs in page detail), `v2-` CSS prefix. ProofBanner hidden when no validated wins.

### Security

SSRF protection, auth + ownership checks, AES-256-GCM credential encryption, rate limiting, prompt injection hardening. See `architecture.md` Security section.

### Homepage

5-section structure: Hero (SitePreviewCard animation), WorksWithStrip, YourPage, YourResults, UrgencyCloser. Refined brutalism: cool gray palette, multi-color accents, solid 2px borders, 10px radius, offset shadows. See `decisions.md` D27-D28.

### Webhook Reliability (Feb 17, 2026)

Deploy detection silently broke when webhook creation failed during GitHub setup — repo stored as "connected" but `webhook_id = NULL`, so pushes never reached Loupe.

**Three-layer fix:**
- **Prevention**: Webhook failure blocks repo insertion in setup route. Redirects with `?warning=webhook_failed`.
- **Self-healing**: Daily cron (`scheduledScanDaily`) has `heal-missing-webhooks` step. Finds repos with NULL `webhook_id`, delete-and-recreates webhook on GitHub (ensures secret matches), updates DB. Non-fatal — never fails the scan.
- **Transparency**: Settings UI shows "Webhook missing" on repos with `webhook_active === false`. Warning banner on partial setup failure.

Key files: `src/lib/github/app.ts` (`findExistingWebhook()`), `src/lib/inngest/functions/scheduled.ts` (healing step), `src/components/settings/GitHubSection.tsx` (UI warning).

### Deploy Scanning Architecture

Lightweight deploy detection → full daily analysis → multi-horizon correlation. ~60-80% cost savings vs full analysis on every deploy.

| When | What Happens | Cost |
|------|--------------|------|
| Deploy | Screenshot + Haiku vision diff | ~$0.01/page |
| Next day 9am | Full daily analysis (`gemini-3-pro-preview`) | ~$0.06/page |
| D+7/14/30/60/90 | Checkpoint assessment (LLM-as-analyst) | per checkpoint |

Key concepts:
- **Stable baseline**: Daily/weekly scans set `stable_baseline_id`; deploys compare against it
- **Persistent change registry**: `detected_changes` table with `first_detected_at` timestamp
- **File filtering**: `couldAffectPage()` skips backend-only deploys (`src/lib/utils/deploy-filter.ts`)
- **Absolute date correlation**: `comparePeriodsAbsolute()` on analytics providers

Database: `detected_changes` table (page_id, element, scope, before/after, status, correlation_metrics), `stable_baseline_id` on pages.

### Mobile Screenshots

390px mobile viewport captured in parallel with desktop. Mobile failure non-fatal. LLM receives both images. UI shows desktop (browser chrome) + mobile (phone frame) side by side with modal toggle.

**Note:** All tiers capture mobile screenshots. "Mobile" pricing feature = viewport access gate (`MobileUpgradeGate`), not screenshot capture.

### Anti-Hallucination Guardrails

LLM correlation fabrication prevented by:
- Temporal context in prompt (current date, previous scan date, days-since-detected)
- Prompt rules: "validated" requires tools called + data returned + 7+ days old
- Server-side enforcement: no tools called → force `correlation = null`
- Observation IDs validated against sent IDs set (prevents hallucinated changeIds)

### Key Patterns

- `extractJson(text)` — 3-tier LLM JSON parsing fallback (regex → brace-match → closeJson)
- `analyses` ↔ `pages` linkage via `pages.last_scan_id`, NOT a `page_id` FK on analyses
- Single domain per account: `profiles.account_domain` (www-normalized, first-write-wins)
- Metric focus + hypothesis + observations compound knowledge across scans

---

### Chronicle Dossier

Two-panel layout: sticky sidebar + scrollable intelligence feed.

| Component | File | Purpose |
|-----------|------|---------|
| DossierSidebar | `src/components/chronicle/DossierSidebar.tsx` | Screenshots, ScanPicker, scorecard, summary |
| ChronicleLayout | `src/components/chronicle/ChronicleLayout.tsx` | Two-panel orchestrator, outcome grouping |
| MetricStrip | `src/components/chronicle/MetricStrip.tsx` | Correlation metric badges |
| ObservationCard | `src/components/chronicle/ObservationCard.tsx` | LLM observations display |
| UnifiedTimelineCard | `src/components/chronicle/UnifiedTimelineCard.tsx` | Checkpoint chips, evidence, feedback |

Outcome groups: "Paid off" (wins), "Backfired" (regressions), "Still measuring" (watching), "Other changes".

Design: ScanPicker inside sidebar (not top nav), sidebar sticky at `5.5rem`, breadcrumb-only context bar. MetricStrip may need filtering (LLM can hallucinate metric names).

### Email Templates

| Template | Trigger |
|----------|---------|
| `changeDetectedEmail()` | Scan finds changes (dynamic subject: improved/regressed/watching) |
| `allQuietEmail()` | Scan finds no changes |
| `correlationUnlockedEmail()` | Watching → validated transition |
| `dailyDigestEmail()` | Daily 11am UTC digest (only if ≥1 page changed) |

Selection (deploy scans only): `changes_summary.changes.length > 0` → changeDetected, else → allQuiet. Scheduled scans use digest instead of per-page emails.

### Intent Capture (Phase 2B)

Three knowledge-compounding capabilities:
- **Metric focus**: `pages.metric_focus` — user's primary metric, injected into LLM prompt via `formatPageFocus()`
- **Hypothesis**: `detected_changes.hypothesis` — why user made a change, captured via email deep link or in-app prompt (`?hypothesis=` URL param)
- **Observations**: LLM-generated `observations: [{ changeId, text }]` for resolved correlations, stored in `detected_changes.observation_text`

Both `formatPageFocus()` and `formatChangeHypotheses()` use `sanitizeUserInput()` for prompt injection defense.

---

## Completed Phases (Summary)

| Phase | What |
|-------|------|
| 1A | Free Audit — lead magnet, LLM pipeline, results page |
| 1B | Re-scan + Structured Tracking — comparison view, progress |
| 1C-1 | Page History + Scheduled Scans — dashboard, cron, email |
| 1C-3 | Integrations — GitHub deploys, PostHog, GA4, Supabase direct |
| 1C-5 | Marketing Frameworks + Comparison View |
| 1D | Billing — Stripe, Free/Pro($39)/Scale($99), 14-day trial |
| 2A | Vision Pivot — predictions not grades, full UI + email rewrite |
| 2B | Intent Capture — metric focus, hypothesis, observations |
| 2C | Chronicle Dossier — two-panel layout |
| 2E | Single Domain Per Account |
| RFC-0001 | Canonical Change Intelligence — 7 phases, checkpoints |

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
- Mobile screenshot LLM cost gated by tier (all tiers currently get mobile analysis)
