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

### 2.4 Bridge CTA

**Current:** "Re-scan" button
**New:** "Track this page" — but only AFTER showing value

**Tasks:**
- [ ] Update CTA copy to "Track this page"
- [ ] Position after Value Bridge section (2.5)
- [ ] Ensure flow works (auth → page registration → monitoring)

### 2.5 Value Bridge (Historical Demo)

**Problem:** "Track this page" asks for commitment before showing ongoing value.
**Solution:** Demonstrate what they're missing first.

**Option A: Wayback Machine Integration (preferred)**
```
Your page was different 30 days ago. Did you know?
[Before/after comparison from Wayback]

Loupe catches changes like this — and tells you if they helped.
[Track this page →]
```

**Option B: Hypothetical Preview (fallback)**
```
What if your headline changed next week?

Here's what we'd tell you:
"Your headline changed Tuesday. Since then, people are sticking around 15% longer."

[Track this page →]
```

**Tasks:**
- [ ] Build /api/wayback endpoint to check for snapshots
- [ ] If snapshots exist: fetch and display before/after
- [ ] Build WaybackComparison component
- [ ] If no snapshots: show hypothetical preview
- [ ] Build HypotheticalPreview component
- [ ] Position before "Track this page" CTA

### 2.6 Share Flow + OG Images

**Goal:** Make audits shareable with verdict as the hook.

**Social Card (verdict-first):**
```
┌─────────────────────────────────────────┐
│  "Your CTA is buried below             │
│   four screens of scrolling."          │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                         │
│  Loupe found 3 fixes worth +15-30%     │
│  yoursite.com                          │
└─────────────────────────────────────────┘
```

**Alternative: Before/After Card (for headline rewrites)**

**Tasks:**
- [ ] Build /api/og/[analysisId]/route.tsx using @vercel/og
- [ ] Extract verdict from structured_output
- [ ] Generate ImpactBar visual in OG image
- [ ] Add meta tags to /analysis/[id] page
- [ ] Build ShareAuditButton component
- [ ] Pre-populated tweet: `"[Verdict]" — Loupe just audited my landing page`
- [ ] Track share events in PostHog

### 2.7 Email Capture

**Goal:** Capture emails from anonymous audit users.

**Tasks:**
- [ ] "Get a copy of this audit" email capture (low friction)
- [ ] Generate PDF of audit results
- [ ] Email gate on second audit attempt
- [ ] Track capture rate in PostHog

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

## Phase 4: Dashboard

The home for tracked pages. Two zones, not infinite scroll.

### 4.1 Two-Zone Dashboard

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

**Components:**
- `AttentionZone` — Items requiring action (changes with negative correlation, new suggestions)
- `WatchingZone` — Stable pages, no action needed
- `AttentionCard` — Full detail: problem + correlation + action link
- `WatchingCard` — Minimal: domain + "stable" + last checked

**Tasks:**
- [ ] Build AttentionZone component with zone header
- [ ] Build WatchingZone component with zone header
- [ ] Build AttentionCard (problem + correlation + action)
- [ ] Build WatchingCard (minimal status line)
- [ ] Zone headers show item counts
- [ ] Attention zone first, watching zone second
- [ ] Sort attention items by severity/recency

### 4.2 Empty Success States

**Principle:** Empty = success. "All quiet" is the win state.

**No attention items (ideal state):**
```
LOUPE

All quiet.

Your 2 pages are stable.
Last checked: 2 hours ago

━━━━━━━━━━━━━━━━━━━━━━━━━━━
No changes this week.
Your site is holding steady.

[+ Watch another page]
```

**No pages yet:**
```
LOUPE

Start watching your site.

Paste a URL to get your first audit.
We'll track changes and tell you what worked.

[Audit a page →]
```

**Tasks:**
- [ ] Build EmptySuccessState component ("All quiet")
- [ ] Build EmptyOnboardingState component (no pages)
- [ ] Include: page count, last check time, reassurance message
- [ ] Frame as success, not absence
- [ ] Apply to both dashboard and chronicle views

---

## Phase 5: Emails

Update notifications to match new framing. Three email types, not two.

### 5.1 Change Detected Email

**When:** Page changed, correlation available or watching

**Subject:** "Your homepage changed — here's what we found"
**Alt subjects:**
- "Your headline change helped (more people sticking around)"
- "Your CTA moved — watching for impact"

**Content:**
```
Your homepage changed Tuesday.

WHAT CHANGED
Your headline: "Start free" → "Get started in 60 seconds"

WHAT IT DID
More people are sticking around (+8%)
✓ This change helped.

WHAT TO DO NEXT
→ Move CTA above fold
  Expected: More people clicking (+10-15%)

[See full report]
```

**Tasks:**
- [ ] Rewrite change detected email template
- [ ] Use friendlyText for metrics
- [ ] Include correlation verdict when available
- [ ] Include next suggestion
- [ ] Remove all score references

### 5.2 All Quiet Email (Critical for Retention)

**When:** Scheduled scan, no changes detected
**Purpose:** This is NOT a throwaway email. It's reassurance + proactive value.

**Subject:** "All quiet on yoursite.com"

**Content:**
```
Your homepage hasn't changed this week.

YOUR PAGE IS HOLDING STEADY
Last checked: Today at 9am
No changes detected since Jan 15.

WHILE YOU'RE HERE
Here's what we'd still improve:

→ Move CTA above fold
  Expected: More people clicking (+10-15%)
  Based on 847 similar pages we've tracked.

[See suggestion details]
```

**Why this matters:**
1. Reassurance (value: peace of mind)
2. Proactive suggestion (value: always actionable)
3. Keeps Loupe top of mind

**Tasks:**
- [ ] Build "all quiet" email template
- [ ] Include one proactive suggestion from open items
- [ ] Include credibility marker ("Based on X pages")
- [ ] Track open rate (target: >40%)

### 5.3 Correlation Unlocked Email

**When:** Enough data collected to confirm correlation

**Subject:** "Your headline change helped"

**Content:**
```
Remember when you changed your headline on Jan 20?

WE NOW HAVE ENOUGH DATA
More people are sticking around (+8%)

Your change from "Start free" to "Get started in 60 seconds" worked.

WHAT TO DO NEXT
→ Move CTA above fold (expected: +10-15% clicks)

[See what worked]
```

**Tasks:**
- [ ] Build correlation unlocked email template
- [ ] Reference the specific change
- [ ] Show metric improvement in friendly language
- [ ] Include next suggestion

### 5.4 Weekly Digest (Multi-Page Users)

**When:** User monitors 3+ pages, weekly summary

**Subject:** "Your weekly Loupe report"

**Content:**
```
LOUPE WEEKLY

yoursite.com — 1 change, helped ✓
yoursite.com/pricing — stable
yoursite.com/features — 1 suggestion

[View dashboard]
```

**Tasks:**
- [ ] Build weekly digest template
- [ ] Aggregate by page
- [ ] Show status summary per page
- [ ] Prevents email fatigue from multiple single-page emails

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
Week 1: Foundation
├── ✅ Schema migration (types created, scores removed from UI)
├── ✅ TypeScript types (src/lib/types/analysis.ts)
├── 🔄 LLM prompts (with vibe coder translations) — IN PROGRESS
└── Headline annotation fields

Week 2: Initial Audit + Shareability
├── Results hero: VerdictDisplay + ImpactBar + Count + Badge
├── Collapsible FindingCards (action-first)
├── Headline rewrite with annotations
├── Dynamic OG image generation (verdict-first)
├── Share audit flow + pre-filled tweets
└── Email capture on audit complete

Week 3: Value Bridge + Chronicle
├── Wayback Machine integration (/api/wayback)
├── Value bridge before "Track this page"
├── ✅ Chronicle layout (distinct from audit)
├── ✅ Timeline with correlation lines
├── ✅ Progress tracker with symbols + expandable sections
└── ✅ Suggestions section (reuse collapsible cards)

Week 4: Dashboard + Emails
├── Two-zone dashboard (AttentionZone + WatchingZone)
├── Empty success states ("All quiet")
├── Change detected email
├── All quiet email with proactive suggestions
├── Correlation unlocked email
└── Weekly digest for multi-page users

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
- [ ] Predictions on every finding with friendlyText (Phase 1.2)
- [ ] Correlation displays when data available
- [ ] One smart LLM call per scan working
- [ ] Wayback API integration functional

**UX:**
- [x] Initial audit feels valuable (verdict + impact bar + predictions)
- [x] Finding cards are action-first (suggestion visible before reasoning)
- [x] N+1 feels different from initial (chronicle with timeline, not report card)
- [x] Timeline shows correlation lines connecting changes to metrics
- [ ] Dashboard uses two-zone structure (attention vs. watching)
- [ ] "Nothing changed" feels like success, not emptiness
- [ ] Vibe coder language used throughout (no raw metric names)

**Shareability:**
- [ ] Dynamic OG images show verdict, not counts
- [ ] Share button on results page with pre-filled tweet
- [ ] Social card renders correctly on Twitter/LinkedIn

**Activation:**
- [ ] Value bridge shows Wayback demo before "Track this page"
- [ ] Email capture on audit complete
- [ ] Bridge CTA demonstrates ongoing value

**Positioning:**
- [ ] Landing page headline: "Did that change work?"
- [ ] CTA is "Track this page" not "Re-scan"
- [ ] Emails focus on changes + insights, not scores
- [ ] "All quiet" emails include proactive suggestions

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
