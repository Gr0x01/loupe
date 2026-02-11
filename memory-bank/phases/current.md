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
| 2.1 Initial Audit | Results page hero redesign | **DONE** |
| 2.2 Initial Audit | Results page body sections | **DONE** |
| 2.4-2.7 | Results page polish & conversion | **DONE** |
| 3 Chronicle | N+1 experience | **DONE** |
| 4.1 Dashboard | Two-zone activity stream | **DONE** |
| 5. Emails | Update templates | **DONE** |
| 6. Landing Page | New positioning | **DONE** |

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

### Phase 2.1 Completed (Hero Redesign)
- [x] Added CSS animation classes for new hero reveal sequence
- [x] Added ImpactBar component styles (gradient fill + striped potential)
- [x] Added `isNewAnalysisFormat()` type guard for detecting new LLM output
- [x] Built new hero components: VerdictDisplay, ImpactBar, OpportunityCount, DomainBadge
- [x] Built NewHeroSection composing all verdict-first components
- [x] Conditional rendering: new hero for new format, legacy ScoreArc hero for old analyses
- [x] Legacy code (ScoreArc, score helpers) preserved for backward compatibility

### Phase 2.2 Completed (Body Sections)
- [x] Added `ELEMENT_ICONS` mapping for all ElementType values (headline, cta, copy, layout, social-proof, form, image, navigation, pricing, other)
- [x] Built `NewFindingCard` component with collapsed/expanded states:
  - Collapsed: impact badge + title + prediction mini-badge
  - Expanded: current value block, suggestion block with copy button, prediction line with friendlyText, expandable "Why this matters" and "Methodology" sections
- [x] Built `FindingsSection` with "What to fix" header, expand/collapse state management
- [x] Updated HeadlineRewrite section to handle both schemas:
  - New: `currentAnnotation` + `suggestedAnnotation`
  - Legacy: `reasoning` field
- [x] Added Summary section for new format (displays `s.summary` in pull-quote card)
- [x] Added CSS: `.new-finding-card`, `.prediction-badge`, `.new-finding-current`, `.new-finding-suggestion`, etc.
- [x] Accessibility: keyboard navigation (Enter/Space), aria-expanded, aria-label, focus-visible styles
- [x] Backward compatible: new sections only render for `isNewAnalysisFormat(s)` analyses

### Phase 3 Completed (Chronicle Experience)

**3.1 Chronicle Layout:**
- [x] Created `isChronicleFormat()` type guard to detect new ChangesSummary format
- [x] Built Chronicle component system in `src/components/chronicle/`:
  - `ChronicleLayout.tsx` — Main orchestrator with three sections
  - `ChronicleHero.tsx` — Verdict + "Your page since {date}" header
  - `WhatChangedSection.tsx` — Timeline of changes with correlation insights
  - `TimelineEntry.tsx` — Individual change with before/after and correlation badges
  - `WhatToDoNextSection.tsx` — Prioritized suggestions sorted by impact
  - `SuggestionCard.tsx` — Collapsible cards with accessibility
  - `ProgressTracker.tsx` — Expandable sections with item details
- [x] Conditional rendering: Chronicle replaces initial audit layout for N+1 scans

**3.2-3.4 Timeline & Progress Polish:**
- [x] Added item-level progress types: `ValidatedItem`, `WatchingItem`, `OpenItem`
- [x] Updated POST_ANALYSIS_PROMPT to output item arrays with details
- [x] Dynamic TimelineEntry bullet states: validated (green), watching (amber), regressed (red), no-data (gray)
- [x] Visual correlation connector with confirmation messages
- [x] Expanded ProgressTracker with collapsible sections showing individual items
- [x] WatchingProgressBar showing data collection progress (X of 7 days)
- [x] CSS: timeline bullets, correlation connector, progress sections, watching bar

### Phase 2.4-2.7 Completed (Results Page Polish & Conversion)

**2.4 Bridge CTAs:**
- [x] Updated hero footer CTA: "Track this page" → "Track" button
- [x] Updated Zone 6 CTA: "Want to know if your changes helped?" messaging
- [x] Updated post-claim success state with specific next-step guidance
- [x] Updated "already watching" state with clearer action guidance

**2.5 Wayback Machine Value Bridge:**
- [x] Created `GET /api/wayback` proxy endpoint for CDX API
- [x] Built `WaybackPreview` component showing historical snapshots
- [x] Graceful fallback: mock timeline when no Wayback history exists
- [x] Only shown for unclaimed initial audits (not Chronicle scans)

**2.6 Dynamic OG Images:**
- [x] Created `src/app/analysis/[id]/opengraph-image.tsx` for dynamic OG generation
- [x] Card shows: domain, verdict (quoted), impact range badge, CTA
- [x] Enhanced share buttons: Twitter/X, LinkedIn, Copy link
- [x] Pre-filled tweet text with verdict snippet

**2.7 PDF Downloads with Email Capture:**
- [x] Installed `@react-pdf/renderer` dependency
- [x] Created `src/lib/pdf/generate-audit-pdf.tsx` — full audit PDF generation
- [x] PDF includes: header, verdict section, findings (up to 5), headline rewrite, summary
- [x] Built `PdfDownloadButton` component with email capture modal
- [x] Created `POST /api/leads` endpoint for email capture
- [x] Email is optional — graceful degradation if not provided

### Phase 5 Completed (Email Templates Update)

**5.1 New Context-Aware Templates:**
- [x] `changeDetectedEmail()` — for when scheduled/deploy scans find changes
  - Dynamic subject based on correlation: improved, regressed, or watching
  - Shows primary change with before/after, additional changes count
  - Correlation section when data is available
  - Top suggestion section when available
  - Deploy info section for deploy-triggered scans
- [x] `allQuietEmail()` — for when scheduled scans find no changes
  - Subject: "All quiet on {domain}"
  - Shows last change date and top suggestion if available
- [x] `correlationUnlockedEmail()` — for when watching items become validated
  - Subject: "Your {element} change helped"
  - Shows change details with before/after and metric improvement
- [x] `dailyDigestEmail()` — consolidated daily/weekly scan summary (replaced weeklyDigestEmail)
  - Dynamic subject: "{domain} changed, N pages stable" or "N of M pages changed"
  - Changed pages show before/after detail; stable pages as compact one-liners
  - Only sent if at least 1 page changed

**5.2 Email Selection Logic:**
- [x] Updated `analyzeUrl` in functions.ts to use intelligent email selection
- [x] Uses `changeDetectedEmail` when `changes_summary.changes.length > 0`
- [x] Uses `allQuietEmail` when no changes detected
- [x] Added `extractTopSuggestion()` helper to get top suggestion from Chronicle or initial audit
- [x] Removed legacy templates (`scanCompleteEmail`, `deployScanCompleteEmail`) — no longer needed

**5.3 Correlation Unlock Detection:**
- [x] Added logic to detect when watching item becomes validated
- [x] Compares previous `watchingItems` with current `validatedItems`
- [x] Sends `correlationUnlockedEmail` when correlation is confirmed

**5.4 Daily Scan Digest Function:**
- [x] Replaced `weeklyDigest` with `dailyScanDigest` Inngest function
- [x] Runs daily 11am UTC (2h after scans start at 9am)
- [x] Queries completed analyses from last 3h with daily/weekly trigger
- [x] Groups by user, skips if all pages stable, sends consolidated email
- [x] Per-page emails suppressed for daily/weekly scans (deploy-only now)

**5.5 Email Preview Route:**
- [x] Extended `/api/dev/email-preview` with all new templates
- [x] Multiple variations: change-detected (watching/improved/regressed/deploy), all-quiet (with/without suggestion), correlation-unlocked, daily-digest

**5.6 UI Designer Review:**
- [x] Cleaner visual hierarchy — headline carries the verdict
- [x] Removed heavy bordered sections, using spacing and subtle backgrounds
- [x] Left-aligned CTAs for better scannability
- [x] Simplified footer to just "Manage emails" link
- [x] Added `textMuted` and `borderSubtle` color tokens

### Phase 4.1 Completed (Two-Zone Dashboard)

**Two-Zone Activity Stream:**
- [x] Added `AttentionStatus` and `DashboardPageData` types to `src/lib/types/analysis.ts`
- [x] Created `computeAttentionStatus()` function in `/api/pages` route
- [x] Attention categorization priority: scan_failed → no_scans_yet → negative_correlation → recent_change → high_impact_suggestions → stable
- [x] Built zone components in `src/components/dashboard/`:
  - `AttentionZone.tsx` — Zone header + sorted AttentionCards (by severity then recency)
  - `WatchingZone.tsx` — Zone header + WatchingCards + "Watch another page" button
  - `AttentionCard.tsx` — Severity dot, domain, headline, subheadline, "See details →" link
  - `WatchingCard.tsx` — Minimal line with name + "stable, last checked X ago"
  - `EmptySuccessState.tsx` — "All quiet" message when no attention items
  - `EmptyOnboardingState.tsx` — "Start watching your site" for new users
- [x] Refactored dashboard page to split pages into attention vs watching arrays
- [x] Added `.zone-header` and `.zone-count` CSS classes

### Security Audit Completed (Feb 2026)

Full security review with fixes:
- [x] SSRF protection in screenshot service (IPv4 + IPv6 + encoding bypasses)
- [x] Auth + ownership checks on feedback, analysis, rescan routes
- [x] Credential encryption (AES-256-GCM) for all integrations
- [x] Rate limiting on authenticated routes (pages, rescan, feedback)
- [x] Prompt injection sanitization hardening

See `architecture.md` Security section for details.

### Phase 6 Completed (Homepage Redesign)

**6.1 Homepage Structure:**
- [x] 4-section "Your" structure: Hero, YourPage, YourResults, UrgencyCloser
- [x] Hero with SitePreviewCard animation (headline change → notification → +23%)
- [x] YourPage section — audit preview showing what Loupe sees
- [x] YourResults section — feature grid with timeline, verdicts, metrics, history
- [x] UrgencyCloser — final CTA with trust badges

**6.2 New Components:**
- [x] `SitePreviewCard.tsx` — animated hero visual
- [x] `YourPage.tsx` — two-column audit preview
- [x] `YourResults.tsx` — feature grid with ChangeTimeline, VerdictCard, MetricsCard, HistoryCard
- [x] `UrgencyCloser.tsx` — final CTA

**6.3 Refined Brutalism Design System:**
- [x] Cool gray palette (paper-0: #F8FAFC)
- [x] Multi-color accents (coral, blue, violet, emerald, amber)
- [x] Solid 2px borders, 10px radius, offset shadows
- [x] Removed blur effects and hero orbs

**What was removed:**
- Old HowItWorks sections
- ScenarioShowcase
- Gap section (alone vs with Loupe)
- Hero decorative elements

See `decisions.md` D27-D28 and `homepage-story.md` for details.

### Deploy Scanning & Correlation System Fix (Feb 2026)

Major refactor to reduce deploy scan costs and fix correlation windows.

**Problem solved:**
- Every GitHub push triggered full LLM analysis (~$0.06/page)
- Each deploy shifted parent reference, breaking correlation windows
- Analytics tools only supported relative windows, not absolute dates
- `daysOfData` was LLM-guessed, not calculated from timestamps

**New architecture:**
1. **Lightweight deploy detection** — Haiku vision diff (~$0.01) instead of full Sonnet analysis
2. **Stable baseline** — Daily/weekly scans set `stable_baseline_id`, deploys compare against it
3. **Persistent change registry** — `detected_changes` table with `first_detected_at` timestamp
4. **Absolute date correlation** — `comparePeriodsAbsolute()` on analytics providers
5. **Correlation cron** — `checkCorrelations` runs every 6h to unlock watching → validated

**New user flow:**
| When | What Happens | User Sees |
|------|--------------|-----------|
| Deploy | Screenshot + Haiku diff | "We noticed your headline changed. Watching for impact." |
| Next day 9am | Full daily analysis | Changes documented, new suggestions, findings |
| 7+ days later | Correlation cron | "Your headline change helped — signups up 12%" |

**Database changes:**
- New `detected_changes` table (page_id, element, scope, before/after, status, correlation_metrics)
- Added `stable_baseline_id` column to pages table

**Key files modified:**
- `src/lib/inngest/functions.ts` — Modified `deployDetected`, added `checkCorrelations` cron
- `src/lib/ai/pipeline.ts` — Added `runQuickDiff()` for Haiku vision comparison
- `src/lib/analytics/provider.ts` — Added `comparePeriodsAbsolute()` interface
- `src/lib/analytics/posthog-adapter.ts` — Implemented absolute date queries
- `src/lib/analytics/ga4-adapter.ts` — Implemented absolute date queries
- `src/lib/analytics/correlation.ts` — New file for `correlateChange()` utility
- `src/lib/analysis/baseline.ts` — New file for `getStableBaseline()` utility
- `src/lib/types/analysis.ts` — Added `DetectedChange`, `QuickDiffResult`, updated `WatchingItem`

**Cost reduction:** ~60-80% savings on deploy scans for active deployers.

### Dashboard Results Zone (Feb 2026)

Surfaced validated/regressed correlations in the dashboard UI. The flywheel is now complete:

```
Free audit → Track page → First correlation proves it works → Upgrade
                                    ↑
                           NOW VISIBLE IN DASHBOARD
```

**New files:**
- `src/app/api/changes/route.ts` — API endpoint for detected_changes with stats
- `src/components/dashboard/ResultsZone.tsx` — Zone with header, grid, "see all" link
- `src/components/dashboard/ResultCard.tsx` — Individual validated/regressed change card
- `src/lib/utils/date.ts` — formatDistanceToNow utility

**Modified files:**
- `src/app/dashboard/page.tsx` — Added ResultsZone at TOP, ?win= highlight param
- `src/lib/email/templates.ts` — Correlation email deep links to dashboard with ?win= param
- `src/lib/inngest/functions.ts` — Pass changeId to email template
- `src/components/dashboard/index.ts` — Export new components
- `src/app/globals.css` — Result card CSS (emerald/coral accents, big percentage)

**User flow:**
1. User deploys change → detected_changes record created with status "watching"
2. 7 days later → correlation cron runs → status "validated" or "regressed"
3. Email sent → "Your headline change helped" with deep link
4. User clicks → Dashboard shows ResultsZone at top with their win highlighted
5. Card shows: element, before/after, big percentage, metric name

**Design decisions:**
- ResultsZone at TOP of dashboard (before Attention) — wins ARE the proof
- Emerald accent for validated, coral for regressed
- Big percentage number is hero moment (shareable)
- Hidden when empty — appears organically on first correlation
- Max 4 cards in grid, "See all X results" link if more

### Mobile Screenshots (Feb 2026)

Added 390px mobile viewport screenshot to the full pipeline: capture → store → LLM analysis → UI display.

**Pipeline changes:**
- [x] DB migration: `mobile_screenshot_url text` nullable column on `analyses`
- [x] `captureScreenshot()` accepts optional `width` param; `uploadScreenshot()` accepts `suffix` (stored as `{id}_mobile.jpg`)
- [x] `analyzeUrl` captures desktop + mobile in parallel (`Promise.all`), mobile failure non-fatal (try/catch)
- [x] `runAnalysisPipeline()` sends both images to LLM with labels; system prompt includes "Mobile Experience" evaluation section
- [x] `runQuickDiff()` sends 2 or 4 images depending on baseline mobile availability
- [x] `deployDetected` captures mobile only when baseline has it (avoids wasted work), parallel capture
- [x] `StableBaseline` interface includes `mobile_screenshot_url`, all 3 select queries updated

**UI changes:**
- [x] `HeroScreenshot` shows desktop (browser chrome) + mobile (phone frame) side by side
- [x] `ScreenshotModal` has Desktop/Mobile toggle tabs with `aria-pressed`
- [x] `showScreenshot` state: `false | "desktop" | "mobile"` (opens modal to correct view)
- [x] `SnapshotCollapsible` shows mobile phone frame alongside desktop when expanded
- [x] Image error handling on all screenshot elements (graceful hide on broken URL)
- [x] Click targets use `<button>` elements for keyboard accessibility

**Backward compatible:** Old analyses with `NULL` mobile_screenshot_url render exactly as before.

**Note:** Mobile screenshots are captured for ALL tiers (not gated). The "Mobile" Pro feature in pricing refers to viewport-based access gate (`MobileUpgradeGate`), not screenshot capture. Consider gating LLM mobile image sending by tier to save ~$0.01/analysis for Free/Starter.

### Key Changes (remaining)
- None — Phase 2A complete

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
- [x] Shareable results card (OG image generation) — completed in Phase 2.6

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

### Supabase Direct Integration (DONE)
- [x] Connection flow: Project URL + Anon Key (upgrade to Service Role if RLS blocks)
- [x] API routes: `POST /api/integrations/supabase/connect`, `DELETE /api/integrations/supabase`
- [x] Schema introspection: list tables with row counts
- [x] SupabaseAdapter with `getSchema()`, `getTableRowCount()`, `identifyConversionTables()`
- [x] LLM database tools: `discover_tables`, `get_table_count`, `identify_conversion_tables`, `compare_table_counts`, `get_table_structure`
- [x] Separate from analytics tools — both can be connected simultaneously
- [x] Table name validation (injection prevention)
- [x] Settings UI: SupabaseConnectModal with key type toggle, table discovery display
- [x] POST_ANALYSIS_PROMPT updated to explain database metrics vs proxy metrics
- [x] Pipeline passes `databaseCredentials` alongside `analyticsCredentials`

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

---

## What's NOT in MVP
- Team tier
- Multi-page free tier
- Mobile app
- Deploy previews (scan staging before merge)
- Embedded findings for trend analysis
- Mobile screenshot LLM cost gated by tier (all tiers currently get mobile analysis)
