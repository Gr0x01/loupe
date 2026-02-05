# Vision Pivot: Implementation Plan

Transforming Loupe from "website grader with scores" to "prediction and validation layer."

## Overview

**Goal:** Ship the new vision as the MVP. Not a refactor of the old thing — a rebuild of the core experience.

**Context:** Pre-MVP. No real users. No backward compatibility needed. We can delete/replace freely.

**Primary Headline:** "Did that change work?" — this framing guides all UI and copy decisions.

**Principles:**
- Work backward from the user experience
- Schema changes first (can't build UI without data)
- One piece at a time, always shippable
- Don't preserve old patterns — delete and replace
- No migration paths for old data formats
- **Action-first, reasoning expandable** — show the fix, hide the why
- **Vibe coder language** — "people leaving" not "bounce rate"
- **Empty states = success states** — "All quiet" is the win

---

## Phase 1: Foundation (Schema + Prompts)

The new data structures and LLM outputs. Everything else depends on this.

### 1.1 Schema Migration ✅ COMPLETE

**Removed from UI:**
- `overallScore` display from dashboard and page timeline
- `score` from category displays
- `score_delta` from changes displays
- Leaderboard feature (deleted entirely)
- `hide_from_leaderboard` dead code

**Created:** `src/lib/types/analysis.ts` with canonical types:
```typescript
// New types (ready for Phase 1.2 LLM output)
- Prediction (with friendlyText)
- Finding (with currentValue, suggestion, prediction)
- HeadlineRewrite (with annotations)
- AnalysisResult
- ChangesSummary (with validated/watching/open progress)
- DeployContext

// Legacy types (for backward compat until Phase 1.2)
- LegacyFinding, LegacyCategory, LegacyStructuredOutput, LegacyChangesSummary
```

**Tasks:**
- [x] Update TypeScript types
- [x] Remove score display from all UI
- [x] Delete leaderboard feature
- [x] Remove dead code (hide_from_leaderboard)
- [ ] Clear test data if needed (deferred)

### 1.2 LLM Prompts ✅ COMPLETE

**Initial audit prompt (SYSTEM_PROMPT):**
- Removed all score language
- Brand voice: "observant analyst" with Ouch/Aha/Huh emotional register
- FriendlyText with emotional stakes ("Your button is invisible", "You're losing signups")
- Verdict: 60-80 chars, key observation, triggers emotion
- Findings with id, elementType, prediction with friendlyText
- Renamed: `findingsCount`, `projectedImpactRange`

**Scheduled scan prompt (POST_ANALYSIS_PROMPT):**
- Chronicle format: verdict, changes[], suggestions[], correlation
- Progress states: validated/watching/open (not resolved/improved/regressed)
- First-scan verdict: "Baseline captured. Watching for changes."
- Adaptive confidence based on analytics data

**Tasks:**
- [x] Rewrite initial audit prompt
- [x] Add friendlyText requirement to prediction output
- [x] Add headline annotation fields (currentAnnotation, suggestedAnnotation)
- [x] Rewrite scheduled scan prompt
- [x] Update pipeline.ts to handle new output format
- [x] Add MetricType enum for type safety
- [ ] Test with real pages (manual verification)

---

## Phase 2: Initial Audit Experience

The lead magnet. First thing users see. Must be screenshot-worthy.

### 2.1 Results Page Hero

**Current:** Score arc with number + letter grade
**New:** Verdict + Impact Bar + Count + Domain Badge

```
[Large Instrument Serif]
Your CTA is buried below four screens of scrolling.

[Visual impact bar]
━━━━━━━━━━░░░░░░░░░░░░░░░
You now        Potential (+15-30%)

[Count]
3 changes to close the gap

[Badge]
yoursite.com · Audited by Loupe
```

**Components:**
- `VerdictDisplay` — Instrument Serif, enormous, one line, quotable
- `ImpactBar` — Visual progress bar (current state vs potential)
- `OpportunityCount` — "X changes to close the gap"
- `DomainBadge` — "domain.com · Audited by Loupe"

**Tasks:** ✅ COMPLETE
- [x] Remove ScoreArc component (kept for legacy, conditionally rendered)
- [x] Build VerdictDisplay component (large typography, single line)
- [x] Build ImpactBar component (visual bar showing gap)
- [x] Build OpportunityCount component
- [x] Build DomainBadge component
- [x] Compose into NewHeroSection layout
- [x] Wire up to new structured_output via `isNewAnalysisFormat()` type guard

### 2.2 Findings Cards (Collapsible) ✅ COMPLETE

**Current:** Issue/strength with fix recommendation (4 sections visible)
**New:** Action-first, reasoning expandable

**Default state (collapsed):**
```
YOUR HEADLINE
"Get more customers with less effort"

Try: "Ship your SaaS in a weekend, not a quarter"
Expected: More people stick around (+8-15%)

[Copy]        [I fixed this]
```

**Expanded state (tap "Why this matters"):**
```
Why this matters:
Vague headlines assume visitors know they need help.
Specific outcomes create curiosity.
Based on: 847 similar pages we've tracked

Metric detail: Bounce rate ↓ 8-15%
```

**Tasks:** ✅ COMPLETE
- [x] Redesign FindingCard as NewFindingCard with collapsed/expanded states
- [x] Collapsed state: impact badge + title + prediction mini-badge
- [x] Expanded state: element icon + currentValue + suggestion + prediction line
- [x] "Why this matters" expand/collapse trigger (assumption field)
- [x] "Methodology" expand/collapse trigger
- [x] Add "Copy" button for suggestion text with feedback
- [x] Accessibility: keyboard navigation, aria-expanded, focus-visible styles
- [ ] Add "I fixed this" button (deferred — needs backend support)

### 2.3 Headline Rewrite Section ✅ COMPLETE

**Current:** May or may not exist
**New:** Prominent with inline annotations

```
YOUR HEADLINE, REWRITTEN

Current: "Welcome to our platform"
         ↑ Generic. Says nothing about what you do.

Try this: "Ship your SaaS in a weekend, not a quarter"
          ↑ Specific outcome + time contrast = curiosity

[Copy to clipboard]
```

**Tasks:** ✅ COMPLETE
- [x] Updated HeadlineRewrite section (handles both new and legacy schemas)
- [x] Display currentAnnotation below current headline (when available)
- [x] Display suggestedAnnotation or reasoning for "Why this works"
- [x] Copy button functionality
- [x] Position prominently in results
- [x] Added Summary section with pull-quote card

### 2.4 Bridge CTA ✅ COMPLETE

**Current:** "Re-scan" button
**New:** "Track this page" — but only AFTER showing value

**Tasks:**
- [x] Update CTA copy to "Track this page"
- [x] Position after Value Bridge section (2.5)
- [x] Ensure flow works (auth → page registration → monitoring)

### 2.5 Value Bridge (Historical Demo) ✅ COMPLETE

**Problem:** "Track this page" asks for commitment before showing ongoing value.
**Solution:** Demonstrate what they're missing first.

**Implementation:**
- Built `/api/wayback` proxy endpoint for Wayback CDX API (with SSRF protection)
- `WaybackPreview` component shows grid of historical snapshots
- Graceful fallback: mock timeline when no Wayback history exists
- Positioned before "Track this page" CTA on unclaimed audits

**Tasks:**
- [x] Build /api/wayback endpoint to check for snapshots
- [x] If snapshots exist: fetch and display thumbnail grid
- [x] Build WaybackPreview component
- [x] If no snapshots: show mock timeline fallback
- [x] Position before "Track this page" CTA

### 2.6 Share Flow + OG Images ✅ COMPLETE

**Goal:** Make audits shareable with verdict as the hook.

**Implementation:**
- Created `src/app/analysis/[id]/opengraph-image.tsx` for dynamic OG images
- Card shows: Loupe logo, domain, verdict (quoted), impact range badge, CTA
- Enhanced share buttons: Twitter/X, LinkedIn, Copy link
- Pre-filled tweet with verdict snippet

**Tasks:**
- [x] Build opengraph-image.tsx using next/og ImageResponse
- [x] Extract verdict from structured_output
- [x] Show impact range badge in OG image
- [x] Add Twitter/X share button with pre-populated tweet
- [x] Add LinkedIn share button
- [x] Keep copy link functionality

### 2.7 Email Capture ✅ COMPLETE

**Goal:** Capture emails from anonymous audit users.

**Implementation:**
- Built `PdfDownloadButton` component with email capture modal
- Created `src/lib/pdf/generate-audit-pdf.tsx` using @react-pdf/renderer
- PDF includes: header, verdict, findings (up to 5), headline rewrite, summary
- Created `POST /api/leads` endpoint for email capture (with validation)
- Email is optional — graceful degradation if not provided

**Tasks:**
- [x] "Download PDF" button with optional email capture
- [x] Generate PDF of audit results (client-side)
- [x] Email capture endpoint with validation
- [x] Skip email capture for authenticated users

---

## Phase 3: Chronicle Experience (N+1)

The real product. What users see after initial audit. Distinct from initial audit layout.

### 3.1 Chronicle Layout ✅ COMPLETE

**Current:** Same as initial audit (another audit report)
**New:** Three sections — What changed, What to do next, Progress

```
YOUR PAGE SINCE JAN 15

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What changed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

● Jan 20 — Headline updated          ←───────────────┐
  "Start free" → "Get started"                       │
                                    More people      │
                                    sticking around  │
                                    (+8%)  ──────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What to do next
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

→ Move CTA above fold
  Expected: More people clicking (+10-15%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

● 2 validated · ◐ 1 watching · ○ 2 open
```

**Tasks:**
- [x] Build ChronicleLayout (distinct from AuditLayout)
- [x] Section headers with visual separators
- [x] Detect initial vs N+1 and render appropriate layout

**Components built:**
- `ChronicleLayout.tsx` — Main orchestrator
- `ChronicleHero.tsx` — Verdict + baseline date header
- `WhatChangedSection.tsx` — Timeline with correlation
- `TimelineEntry.tsx` — Before/after with status badges
- `WhatToDoNextSection.tsx` — Prioritized suggestions
- `SuggestionCard.tsx` — Collapsible with accessibility
- `ProgressTracker.tsx` — Inline summary display

**Type guard:** `isChronicleFormat()` in page.tsx detects new ChangesSummary format and conditionally renders Chronicle instead of initial audit layout.

### 3.2 Timeline with Correlation Lines ✅ COMPLETE

**Key insight:** Visually connect changes to metric outcomes. Don't make users compute causation.

**Timeline entry with confirmed correlation:**
```
● Jan 20 — Headline updated          ←───────────────┐
  "Start free" → "Get started"                       │
                                    More people      │
                                    sticking around  │
                                    (+8%)  ──────────┘
  ✓ This change helped.
```

**Timeline entry still watching:**
```
◐ Jan 22 — CTA moved
  Watching for impact. 3 days of data.
  ━━━━━━━━░░░░░░░░░░░ (30% of data needed)
```

**Components:**
- `TimelineEntry` — Single change with correlation display
- `CorrelationLine` — Visual connector from change to metric
- `WatchingProgress` — Data collection progress bar

**States:**
- `confirmed-positive` — Change helped (green)
- `confirmed-negative` — Change hurt (red)
- `watching` — Collecting data (amber)
- `no-data` — No analytics connected (gray)

**Tasks:**
- [x] Build TimelineEntry component
- [x] Build CorrelationLine visual connector
- [x] Build WatchingProgress bar (% of data needed)
- [x] Handle all four states with appropriate styling
- [x] Use friendlyText for metric displays

### 3.3 Progress Tracker ✅ COMPLETE

```
● Validated (2)                              [expand ▼]
  ✓ Headline — More people sticking around (+8%)
  ✓ Social proof — People staying longer (+12%)

◐ Watching (1)                               [expand ▼]
  ◐ CTA placement — collecting data (3 days)

○ Open (2)                                   [expand ▼]
  ○ Pricing clarity
  ○ Mobile optimization

─────────────────────────────────────────────────
2 of 4 changes validated · Impact so far: +20%
```

**Tasks:**
- [x] Build ProgressTracker component
- [x] Three collapsible sections: validated, watching, open
- [x] Visual symbols: ● (validated), ◐ (watching), ○ (open)
- [x] Summary line: "X of Y validated · Impact: +Z%"
- [x] Each validated item shows friendlyText metric
- [x] Each watching item shows days of data collected

**Implementation notes:**
- Added `ValidatedItem`, `WatchingItem`, `OpenItem` types to `analysis.ts`
- Updated POST_ANALYSIS_PROMPT to output `progress.validatedItems[]`, `watchingItems[]`, `openItems[]`
- ProgressTracker shows inline summary + expandable sections when item arrays available

### 3.4 Suggestions Section (N+1) ✅ COMPLETE

Similar to initial audit finding cards, but:
- Context-aware (knows what changed, what's still open)
- Prioritized by impact
- Same collapsible pattern as 2.2

**Tasks:**
- [x] Reuse CollapsibleFindingCard from Phase 2.2
- [x] Filter to show only "open" suggestions
- [x] Sort by impact (high first)

---

## Phase 4: Dashboard ✅ COMPLETE

The home for tracked pages. Two zones, not infinite scroll.

### 4.1 Two-Zone Dashboard ✅ COMPLETE

**Current:** Page list with scores
**New:** Two prioritized zones — attention required vs. watching quietly

```
LOUPE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What needs attention                              1 item
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

yoursite.com/pricing
Headline changed Tuesday → People leaving more (+8%)
[See details]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Watching (no action needed)                     2 pages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

yoursite.com — stable, last checked 2h ago
yoursite.com/features — stable, last checked 2h ago

[+ Watch another page]
```

**Components built:**
- `AttentionZone` — Zone header + sorted AttentionCards (by severity then recency)
- `WatchingZone` — Zone header + WatchingCards + "Add another page" CTA
- `AttentionCard` — Severity dot, domain, headline, subheadline, "See details" link
- `WatchingCard` — Minimal line: name + "stable, last checked X ago"

**API changes:**
- Added `AttentionStatus`, `AttentionReason`, `DashboardPageData` types
- Added `computeAttentionStatus()` function to `/api/pages` route
- Attention categorization priority: scan_failed (high) → no_scans_yet (low) → negative_correlation (high) → recent_change (medium) → high_impact_suggestions (medium) → stable

**Tasks:**
- [x] Build AttentionZone component with zone header
- [x] Build WatchingZone component with zone header
- [x] Build AttentionCard (severity dot + headline + subheadline + action)
- [x] Build WatchingCard (minimal status line)
- [x] Zone headers show item counts
- [x] Attention zone first, watching zone second
- [x] Sort attention items by severity/recency
- [x] Responsive layout (stacks on mobile)

### 4.2 Empty Success States ✅ COMPLETE

**Principle:** Empty = success. "All quiet" is the win state.

**No attention items (ideal state):**
```
All quiet.

Your pages are stable. We'll let you know if anything needs your attention.
```

**No pages yet:**
```
Start watching your site.

Run a free audit to see what's working and what's not.
Then track changes over time to see how your updates affect conversions.

[Audit a page →]
```

**Empty watching zone (pages in attention):**
```
Pages move here when there's nothing left to fix.
Right now, your pages have findings worth addressing.
```

**Tasks:**
- [x] Build EmptySuccessState component ("All quiet")
- [x] Build EmptyOnboardingState component (no pages)
- [x] Empty watching zone explains relationship to attention zone
- [x] Frame as success, not absence
- [x] "Add another page" CTA with card-style button when at limit

---

## Phase 5: Emails ✅ COMPLETE

Update notifications to match new framing. Four email types with smart selection.

### 5.1 Change Detected Email ✅ COMPLETE

**When:** Page changed, correlation available or watching

**Subject Logic:**
- Correlation improved: "Your headline change helped (more people sticking around)"
- Correlation regressed: "Your headline change may need attention"
- Still watching/deploy: "Your domain changed — watching for impact"
- Default: "Your domain changed — here's what we found"

**Content structure:** What changed → What it did (if correlation) → What to do next (if suggestion)

**Tasks:**
- [x] Rewrite change detected email template
- [x] Use friendlyText for metrics
- [x] Include correlation verdict when available
- [x] Include next suggestion
- [x] Remove all score references

### 5.2 All Quiet Email ✅ COMPLETE

**When:** Scheduled scan, no changes detected
**Purpose:** Reassurance + proactive value.

**Subject:** "All quiet on yoursite.com"

**Content structure:** Holding steady message → Proactive suggestion (if available)

**Tasks:**
- [x] Build "all quiet" email template
- [x] Include one proactive suggestion from open items
- [x] Clean visual hierarchy (headline-first, left-aligned CTAs)
- [ ] Track open rate (target: >40%) — post-launch

### 5.3 Correlation Unlocked Email ✅ COMPLETE

**When:** Watching item becomes validated (enough data collected)

**Subject:** "Your headline change helped"

**Content structure:** Reference the change → Show the result → Next suggestion

**Tasks:**
- [x] Build correlation unlocked email template
- [x] Reference the specific change
- [x] Show metric improvement in friendly language
- [x] Include next suggestion

### 5.4 Weekly Digest ✅ COMPLETE

**When:** User monitors 3+ pages, Monday 10am UTC

**Subject:** "Your weekly Loupe report"

**Content:** Per-page status summary (changed/stable/suggestion)

**Tasks:**
- [x] Build weekly digest template
- [x] Aggregate by page
- [x] Show status summary per page
- [x] Inngest cron function (Monday 10am UTC)

---

## Phase 6: Landing Page

Positioning for the new vision.

### 6.1 Hero Copy

**Current:** Score-focused grading language
**New:** "Did that change work?" (primary) / "See what changed. See what it did." (supporting)

**Tasks:**
- [ ] Rewrite hero headline
- [ ] Rewrite subhead
- [ ] Update value props

### 6.2 How It Works

**Current:** Audit → Score → Fix
**New:** Audit → Track → Correlate → Improve

**Tasks:**
- [ ] Redesign "how it works" section
- [ ] Focus on the value loop

### 6.3 Audit Input CTA

**Current:** "Audit your page"
**New:** Could stay similar, but frame as entry point to correlation

**Tasks:**
- [ ] Review CTA copy
- [ ] Ensure bridge to "Track this page" is clear

---

## Implementation Order

**Optimized for growth impact.** Shareability and value demonstration moved earlier.

```
Week 1: Foundation ✅ COMPLETE
├── ✅ Schema migration (types created, scores removed from UI)
├── ✅ TypeScript types (src/lib/types/analysis.ts)
├── ✅ LLM prompts (with vibe coder translations)
└── ✅ Headline annotation fields

Week 2: Initial Audit + Shareability ✅ COMPLETE
├── ✅ Results hero: VerdictDisplay + ImpactBar + Count + Badge
├── ✅ Collapsible FindingCards (action-first)
├── ✅ Headline rewrite with annotations
├── ✅ Dynamic OG image generation (verdict-first)
├── ✅ Share audit flow + pre-filled tweets
└── ✅ Email capture on PDF download

Week 3: Value Bridge + Chronicle ✅ COMPLETE
├── ✅ Wayback Machine integration (/api/wayback)
├── ✅ Value bridge before "Track this page"
├── ✅ Chronicle layout (distinct from audit)
├── ✅ Timeline with correlation lines
├── ✅ Progress tracker with symbols + expandable sections
└── ✅ Suggestions section (reuse collapsible cards)

Week 4: Dashboard + Emails ✅ COMPLETE
├── ✅ Two-zone dashboard (AttentionZone + WatchingZone)
├── ✅ Empty success states ("All quiet")
├── ✅ Change detected email (dynamic subject based on correlation)
├── ✅ All quiet email with proactive suggestions
├── ✅ Correlation unlocked email
└── ✅ Weekly digest for multi-page users (Inngest cron)

Week 5: Landing Page + Polish
├── Hero: "Did that change work?"
├── Subhead: "See what changed. See what it did."
├── How it works section
├── Final QA
└── Ship
```

---

## Success Criteria

**Technical:**
- [x] No score references in UI or emails (Phase 1.1)
- [x] Predictions on every finding with friendlyText (Phase 1.2)
- [x] Correlation displays when data available (Chronicle timeline)
- [x] One smart LLM call per scan working
- [x] Wayback API integration functional

**UX:**
- [x] Initial audit feels valuable (verdict + impact bar + predictions)
- [x] Finding cards are action-first (suggestion visible before reasoning)
- [x] N+1 feels different from initial (chronicle with timeline, not report card)
- [x] Timeline shows correlation lines connecting changes to metrics
- [x] Dashboard uses two-zone structure (attention vs. watching) — Phase 4
- [x] "Nothing changed" feels like success, not emptiness — Phase 4
- [x] Vibe coder language used throughout (friendlyText in predictions)

**Shareability:**
- [x] Dynamic OG images show verdict, not counts
- [x] Share button on results page with pre-filled tweet
- [x] Social card renders correctly on Twitter/LinkedIn

**Activation:**
- [x] Value bridge shows Wayback demo before "Track this page"
- [x] Email capture on PDF download
- [x] Bridge CTA demonstrates ongoing value

**Positioning:**
- [ ] Landing page headline: "Did that change work?" — Phase 6
- [x] CTA is "Track this page" not "Re-scan"
- [x] Emails focus on changes + insights, not scores — Phase 5
- [x] "All quiet" emails include proactive suggestions — Phase 5

**Growth Metrics (targets):**
- [ ] Audit share rate > 5%
- [ ] Shared audit → new audit conversion > 20%
- [ ] Email capture rate > 15% of completed audits
- [ ] "All quiet" email open rate > 40%
- [ ] Wayback demo → "Track this page" conversion > 30%

---

## Risks

1. **LLM consistency** — Predictions need to be specific and realistic, not vague. friendlyText must be natural language, not awkward translations.
2. **Correlation confidence** — Low traffic sites may never get confident correlations. Proxy insights (industry benchmarks) must fill the gap convincingly.
3. **Scope creep** — This is already a significant rebuild. Don't add features beyond what's specified.
4. **Wayback API reliability** — May not have snapshots for all pages. Fallback to hypothetical preview must work well.
5. **Vibe coder language** — Risk of sounding dumbed-down to technical founders. Solution: show friendlyText with metric in parentheses for those who want detail.
6. **Share mechanics** — If verdict isn't quotable/specific enough, sharing won't happen. LLM prompt must enforce specificity.

---

## Notes

- Delete old code, don't preserve it
- No feature flags needed — just ship the new thing
- Test with real pages throughout
- Clear old test data from Supabase when ready
- **Primary headline everywhere:** "Did that change work?"
- **Never use "bounce rate" alone** — always pair with friendlyText or use friendlyText first
