# Current Phase: MVP Build

---

## Inngest Cron Reliability Fix (Feb 16, 2026 — DONE)

Inngest cron registrations go stale after Vercel deploys. Daily scans missed Feb 14 + Feb 16; digest email missed Feb 15 despite successful scans.

### Root Cause
Inngest Cloud cron functions intermittently don't fire. Event-triggered functions work fine. `PUT /api/inngest` re-sync returned `modified: true`, confirming stale registration.

### Fix: Vercel Cron Backup
| What | Detail |
|------|--------|
| Config | `vercel.json` — `GET /api/cron/daily-scans` at `15 9 * * *` (9:15 UTC) |
| Auth | `CRON_SECRET` env var in Vercel |
| Self-healing | If no daily analyses exist today, creates them and triggers Inngest events |
| Alerting | Sentry warning when self-healing activates |
| Prevention | Re-syncs Inngest (`PUT /api/inngest`) on every run |
| Idempotency | Per-page check prevents duplicates if Inngest already ran |

### Key Files
| File | Purpose |
|------|---------|
| `vercel.json` | Vercel Cron schedule |
| `src/app/api/cron/daily-scans/route.ts` | Backup cron handler |

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

### Phase 4.1 Completed (Two-Zone Dashboard → Replaced by V2)

**Original two-zone layout** (ResultsZone, AttentionZone, WatchingZone) replaced by proof-first V2 layout.

### Dashboard V2 Redesign (Feb 2026)

Replaced three-zone dashboard (ResultsZone, AttentionZone, WatchingZone) with proof-first layout. Scales from 1 to 25+ pages.

**New layout:**
- StatsBar: page count, last scan time, attention/watching/wins pills, add page button
- ProofBanner: validated wins with before/after, big metric %, LLM observations (only `status === "validated"`, regressed filtered out)
- PageList: compact rows sorted by urgency, status dots, metric focus badges, status text

**Deleted 7 components:**
- AttentionZone, AttentionCard, WatchingZone, WatchingCard, ResultsZone, ResultCard, EmptySuccessState

**Kept:** EmptyOnboardingState, HypothesisPrompt (still used)

**Design decisions:**
- No delete button on dashboard rows — destructive action belongs in page detail view
- max-w-4xl (896px) — work surface, not a showcase
- Compact ~48px rows with status dot + name + metric badge + status text + chevron
- ProofBanner only shows when validated wins exist (hidden when empty)
- Demo page updated to match V2 layout with static mock data

**CSS:** Old zone/card classes removed from dashboard.css. V2 classes use `v2-` prefix.

**Key file:** `src/app/dashboard/page.tsx` — all V2 components defined inline (StatsBar, ProofBanner, WinCard, PageList, PageRow, StatusDot, StatPill)

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

### Deploy Scan File Filtering (Feb 2026)

Filter deploy scans by `changed_files` so backend-only deploys don't screenshot all pages.

- [x] New `src/lib/utils/deploy-filter.ts` — `couldAffectPage(changedFiles, pageUrl)` categorizes files as non-visual (skip), global (all pages), or route-scoped (match only)
- [x] `deployDetected` fetches `changed_files` from deploys table, filters pages before scanning
- [x] Early return when no pages affected (marks deploy complete)
- [x] `QUICK_DIFF_PROMPT` hardened: "Ignore Screenshot Artifacts" section (JPEG compression, anti-aliasing, tiny shifts)

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

### Dashboard Results Zone (Feb 2026) → Replaced by V2 ProofBanner

Original ResultsZone/ResultCard components replaced by V2 ProofBanner (see Dashboard V2 Redesign above).

**Still active:**
- `src/app/api/changes/route.ts` — API endpoint for detected_changes with stats
- `src/lib/utils/date.ts` — formatDistanceToNow utility
- Email deep links with `?win=` param still work (ProofBanner highlights matching card)

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

### Daily Scan Pipeline Fix (Feb 12, 2026)

Post-launch bugfix for broken daily scans (Feb 10-11).

- [x] Diagnosed: Gemini text preamble + truncated JSON from low `maxOutputTokens`
- [x] Added `extractJson()` helper with 3-tier fallback (regex → brace-match → closeJson)
- [x] Applied to all 3 LLM parse sites (analysis, post-analysis, quick diff)
- [x] Increased post-analysis `maxOutputTokens` 3000 → 4096
- [x] Fixed duplicate scans: `retries: 0` on cron orchestrators + date-based idempotency guard
- [x] Removed `_error_detail` leak from client-visible `changes_summary`
- [x] Removed debug console.logs from `runQuickDiff`
- [x] Cleaned up `src/app/api/debug/quick-diff/` and `test-quick-diff.mjs`

See `decisions.md` D30 for rationale.

### Anti-Hallucination Guardrails for Correlation (Feb 12, 2026)

LLM was fabricating correlation data (validated items with fake metric percentages) on same-day changes where no analytics tools were called.

- [x] Added `previousScanDate` to `PostAnalysisContext` interface
- [x] Injected temporal context into prompt (current date, previous scan date, days-since-detected per pending change)
- [x] Hardened prompt rules: "validated" requires tools called + data returned + 7+ days old
- [x] Added "Correlation Rules" to prompt: no tools = null correlation, never fabricate numbers
- [x] Server-side enforcement: if no tools called, force `correlation = null` and demote validated → watching
- [x] Server-side enforcement: changes < 7 days old cannot be validated even with tools
- [x] Passed `previousScanDate` from parent analysis `created_at` in inngest caller

See `decisions.md` D31 for rationale.

### Bugfix: Initial scan + rescan failures (Feb 14, 2026)

**Problem:** Adding a page created the record but the initial scan never triggered. "Scan again" button did nothing when history was empty.

**Root cause:** Code wrote `page_id` to `analyses` table — but that column doesn't exist. Insert silently failed → no analysis → no Inngest event → no scan.

**Fixes:**
- Removed `page_id` from 3 write sites: `pages/route.ts` (insert + update), `auth/callback/route.ts` (update)
- Added `pageId`-based branch to `POST /api/rescan` — creates first scan without requiring a parent analysis
- Client sends `{ pageId }` when no complete scan exists, `{ parentAnalysisId }` otherwise
- Optimistic UI: pending scan card injected immediately after API returns (bypasses SWR 30s dedup)
- Added error logging on analysis insert failure + warning in response

**Key pattern:** `analyses` ↔ `pages` linkage is via `pages.last_scan_id`, NOT a `page_id` FK on analyses.

### Key Changes (remaining)
- None — Phase 2A complete

---

## Phase 2C — Chronicle Dossier Redesign (DONE)

Converted single-column Chronicle (N+1 scan view) into two-panel "Dossier" layout with sticky sidebar and scrollable intelligence feed.

### Summary

| Step | What | Status |
|------|------|--------|
| 1 | Create DossierSidebar (desktop + mobile variants) | **DONE** |
| 2 | Create MetricStrip (correlation metric badges) | **DONE** |
| 3 | Create ObservationCard (LLM observations display) | **DONE** |
| 4 | Rewrite ChronicleLayout (two-panel orchestrator) | **DONE** |
| 5 | Update chronicle.css (dossier classes, remove deprecated) | **DONE** |
| 6 | Update barrel exports (index.ts) | **DONE** |
| 7 | Wire up analysis page (new props, breadcrumb nav) | **DONE** |
| 8 | Update demo page (mock correlation, observations, summary) | **DONE** |
| 9 | Cleanup (delete WinCard, WatchingStrip, DotTimeline) | **DONE** |

### Key Changes

**New components:**
- `DossierSidebar.tsx` — Sticky sidebar with screenshot thumbnails (desktop + mobile phone frame), page identity with embedded ScanPicker, 4-row scorecard, running summary
- `MetricStrip.tsx` — Horizontal correlation metric badges (emerald/coral/gray by assessment)
- `ObservationCard.tsx` — LLM observations with violet accent bars, maps changeId to element names

**Rewritten:**
- `ChronicleLayout.tsx` — Two-panel dossier orchestrator. Groups items by outcome: "Paid off" (wins), "Backfired" (regressions), "Still measuring" (watching), "Other changes". New props: `scanNumber, totalScans, pageId, currentAnalysisId, metricFocus`

**Modified:**
- `chronicle.css` — Added `.dossier-*` classes (layout grid, sidebar sticky, feed, verdict, scorecard, metric badges, observations, outcome groups, phone frame). Removed deprecated `.chronicle-layout`, `.chronicle-verdict*`, `.chronicle-proof-zone*`, `.chronicle-win-card*`, `.chronicle-watching-strip*`
- `analysis/[id]/page.tsx` — Context bar simplified to breadcrumb only; ScanPicker moved into DossierSidebar; passes scanNumber/totalScans/pageId/currentAnalysisId to ChronicleLayout
- `demo/analysis/page.tsx` — Added mock correlation (3 metrics), observations (2 analyst notes), running_summary; passes dossier props

**Deleted:**
- `WinCard.tsx` — Replaced by grouped outcome sections
- `WatchingStrip.tsx` — Replaced by grouped outcome sections
- `DotTimeline.tsx` — Created then deleted (doesn't scale to 365+ dots/year)

### Design Decisions
- ScanPicker lives inside sidebar (not top nav) — reduces chrome, keeps navigation contextual
- DotTimeline removed — daily scans = too many dots; ScanPicker + scorecard handle navigation/tally
- Sidebar sticky top: `5.5rem` to clear 72px sticky nav; `max-height: calc(100vh - 6.5rem)`
- Mobile phone frame: smaller inset next to desktop screenshot with matching offset shadow
- MetricStrip may need filtering — LLM can hallucinate metric names (e.g., "COMPLETED ANALYSES")
- Context bar reduced to breadcrumb ("Your pages / domain") — sidebar handles all identity/navigation

### Key Files
| File | Purpose |
|------|---------|
| `src/components/chronicle/DossierSidebar.tsx` | Sticky sidebar (desktop + mobile) |
| `src/components/chronicle/MetricStrip.tsx` | Correlation metric badges |
| `src/components/chronicle/ObservationCard.tsx` | LLM observation display |
| `src/components/chronicle/ChronicleLayout.tsx` | Two-panel dossier orchestrator |
| `src/app/chronicle.css` | All dossier CSS |

---

## Phase 2E — Single Domain Per Account (DONE)

Lock accounts to one domain. First page sets it, subsequent pages must match.

| Step | What | Status |
|------|------|--------|
| 1 | Schema: `account_domain` on profiles | **DONE** |
| 2 | API: Domain enforcement in POST /api/pages (www-normalized, first-write-wins) | **DONE** |
| 3 | API: Expose `account_domain` in GET /api/profile | **DONE** |
| 4 | Utility: `getPath()` in url.ts | **DONE** |
| 5 | Dashboard: AddPageModal path-only input when domain set | **DONE** |
| 6 | Dashboard: PageRow shows path not domain | **DONE** |
| 7 | Dashboard: StatsBar shows domain in subtitle | **DONE** |
| 8 | Dashboard: Remove domain from WinCard | **DONE** |
| 9 | Dashboard: Wire up accountDomain state from profile | **DONE** |
| 10 | DossierSidebar: Show path in identity, keep domain in chrome bar | **DONE** |
| 11 | Demo page: Match new display patterns | **DONE** |

### Key Files Modified
| File | What |
|------|------|
| `src/app/api/pages/route.ts` | Domain enforcement + auto-set |
| `src/app/api/profile/route.ts` | Expose `account_domain` |
| `src/lib/utils/url.ts` | Added `getPath()` |
| `src/app/dashboard/page.tsx` | AddPageModal, PageRow, StatsBar, WinCard, state wiring |
| `src/components/chronicle/DossierSidebar.tsx` | Path display, import shared getDomain |
| `src/app/demo/page.tsx` | Match new display |

See `decisions.md` D34 for rationale.

---

## Phase 2B — Intent Capture (DONE)

Three new capabilities to compound knowledge across scans: metric focus, change hypothesis, and LLM-generated observations.

**Plan file:** `.claude/plans/jaunty-popping-quasar.md`

### Summary

| Step | What | Status |
|------|------|--------|
| 1. Schema | 4 new columns (pages.metric_focus, detected_changes.hypothesis/hypothesis_at/observation_text) | **DONE** |
| 2. Types | Extended DetectedChange, ChangesSummary, DashboardPageData | **DONE** |
| 3. APIs | metric_focus on pages endpoints, new PATCH /api/changes/[id]/hypothesis | **DONE** |
| 4. Metric Focus UI | 2-step onboarding (URL → metric focus), editable | **DONE** |
| 5. Email Hypothesis | "What were you testing?" link in change detection emails | **DONE** |
| 6. In-App Hypothesis | HypothesisPrompt component, ?hypothesis= deep link | **DONE** |
| 7. LLM Prompt | formatPageFocus(), formatChangeHypotheses(), injected into post-analysis | **DONE** |
| 8. Observations | LLM generates observations in post-analysis + fallback in correlation cron | **DONE** |

### Step 1: Schema Migration
- [x] `pages.metric_focus text` — user's primary metric (e.g., "signups", "bounce rate")
- [x] `detected_changes.hypothesis text` — why the user made this change
- [x] `detected_changes.hypothesis_at timestamptz` — when hypothesis was set
- [x] `detected_changes.observation_text text` — LLM-generated observation when correlation resolves

### Step 2: Type Updates
- [x] Added `hypothesis`, `hypothesis_at`, `observation_text` to `DetectedChange` interface
- [x] Added `observations?: Array<{ changeId: string; text: string }>` to `ChangesSummary`
- [x] Added `metric_focus: string | null` to `DashboardPageData`

### Step 3: API Changes
- [x] `GET /api/pages` and `GET /api/pages/[id]` return `metric_focus`
- [x] `PATCH /api/pages/[id]` accepts `metric_focus` (trim, max 200 chars, blocks `__custom__` sentinel)
- [x] New `PATCH /api/changes/[id]/hypothesis` — auth + rate limiting + UUID validation + ownership check
- [x] `GET /api/changes` returns `hypothesis`, `hypothesis_at`, `observation_text`; supports `?status=watching` filter

### Step 4: Metric Focus UI
- [x] `EmptyOnboardingState` rewritten with 2-step flow: URL input → metric focus selection
- [x] 4 guided tap targets: Signups, Bounce Rate, Time on Page, Custom (free-form text)
- [x] Auto-save on non-custom selection; "Skip" link for later
- [x] `onAddPage` returns page ID for metric focus step
- [x] CSS: `.metric-focus-grid`, `.metric-focus-option`, `.metric-focus-option-selected` in `dashboard.css`

### Step 5: Email Hypothesis Link
- [x] `hypothesisChangeId?: string` added to `ChangeDetectedEmailParams`
- [x] "What were you testing? Tell Loupe →" link after change detail
- [x] Links to `https://getloupe.io/dashboard?hypothesis={changeId}`
- [x] Passed from both deploy and scheduled scan email flows

### Step 6: In-App Hypothesis Prompt
- [x] `HypothesisPrompt` component: inline card with text input + submit/dismiss
- [x] Dashboard reads `?hypothesis=` from URL params (UUID-validated)
- [x] On submit/dismiss: `router.replace` clears URL param (prevents re-show on refresh)
- [x] 404 response auto-dismisses (change no longer exists)

### Step 7: LLM Prompt Integration
- [x] Extended `PostAnalysisContext` with `pageFocus` and `changeHypotheses`
- [x] `formatPageFocus()` — wraps in `<page_focus_data>` XML tags with UNTRUSTED warning
- [x] `formatChangeHypotheses()` — wraps in `<change_hypotheses_data>` XML tags
- [x] Both use `sanitizeUserInput()` for prompt injection defense
- [x] Injected into post-analysis prompt after pending changes, before findings
- [x] Inngest feeds `pageFocus` from `pages.metric_focus` and `changeHypotheses` from watching changes with non-null hypothesis

### Step 8: Observation Generation
- [x] Added observations section to `POST_ANALYSIS_PROMPT` with voice guide
- [x] LLM outputs `observations: [{ changeId, text }]` for resolved correlations
- [x] Stored after post-analysis: validates changeId against sent IDs set (prevents hallucinated IDs)
- [x] Fallback in `checkCorrelations` cron: generates one-liner observation from metrics data with friendly metric names
- [x] Every resolved change gets at least a basic observation

### Code Reviews (2 rounds)
Security and correctness fixes applied:
- Rate limiting on hypothesis endpoint (`RATE_LIMITS.changes`)
- `user_id` constraint on UPDATE query (defense-in-depth)
- `__custom__` sentinel blocked server-side
- Single timestamp for `hypothesis_at`/`updated_at`
- Observation changeIds validated against sent IDs set
- Client-side UUID validation on `?hypothesis=` param
- URL param cleanup via `router.replace`
- Malformed JSON handling (try/catch → 400)
- 404 auto-dismiss in HypothesisPrompt

### Key Files Modified
| File | What |
|------|------|
| `src/lib/types/analysis.ts` | DetectedChange, ChangesSummary, DashboardPageData types |
| `src/app/api/pages/route.ts` | metric_focus in GET response |
| `src/app/api/pages/[id]/route.ts` | metric_focus in GET/PATCH |
| `src/app/api/changes/route.ts` | hypothesis/observation fields, watching filter |
| `src/app/api/changes/[id]/hypothesis/route.ts` | NEW: hypothesis endpoint |
| `src/components/dashboard/EmptyOnboardingState.tsx` | 2-step onboarding |
| `src/components/dashboard/HypothesisPrompt.tsx` | NEW: hypothesis capture |
| `src/app/dashboard/page.tsx` | ?hypothesis= deep link, metric focus flow |
| `src/lib/email/templates.ts` | "What were you testing?" link |
| `src/lib/ai/pipeline.ts` | formatPageFocus, formatChangeHypotheses, observations prompt |
| `src/lib/inngest/functions.ts` | Feed data to pipeline, store observations, email changeIds |
| `src/app/dashboard.css` | Metric focus tap target styles |

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

## Phase 1C-2 — Launch Prep (DONE → SUPERSEDED)

> **Superseded (Feb 14, 2026):** Founding 50, share-to-unlock, and waitlist systems fully removed from codebase and database. Replaced by Stripe billing tiers (Free/Starter/Pro) in Phase 1D. Page limits now enforced via `getPageLimit(tier)` from `src/lib/permissions.ts`. When users hit their page limit, they're redirected to `/pricing`.
>
> **Deleted:** ShareModal, FoundingCounter, constants.ts, founding-status API, share-credit API, waitlist page + API, waitlist email template. DB artifacts dropped: `waitlist` table, `claim_founding_50` RPC, `increment_bonus_pages` RPC, `profiles.bonus_pages`, `profiles.is_founding_50`.

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

## Phase 1D — Billing (DONE)

- [x] Stripe integration (Free/Starter $12/Pro $29)
- [x] Checkout, portal, webhook routes (`/api/billing/*`)
- [x] Tier-based page limits via `getPageLimit(tier)` — Free: 1, Starter: 3, Pro: 10
- [x] Settings page (integrations, email preferences, billing) — `/settings/integrations`, `/settings/billing`
- [x] Pricing page (`/pricing`)

**Status:** Complete. Users can subscribe via Stripe, manage billing, upgrade/downgrade.

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
