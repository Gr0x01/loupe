# Project: Page Record (Living Page Intelligence)

**Status:** ARCHIVED — Phases 1-2 complete (superseded by Dashboard V2 + Chronicle Dossier), Phase 3 deferred indefinitely
**Created:** Feb 14, 2026

---

## The Problem

The logged-in experience is linear. Each scan produces a standalone report (Chronicle). Knowledge doesn't compound. Users can't see the big picture of what's being tracked, what's changed over time, or what's been learned. There's no place where user and tool think together.

Reddit feedback confirms the gap:
- "How granular does the change tracking get?"
- "Which metrics are you focusing on?" (users expect to tell Loupe what matters)
- "These outcomes cannot be measured right?" (skepticism — need visible proof)
- "Can you get actionable ideas quickly?"

## The Direction

Shift from **scan reports** to a **living page record** that accumulates knowledge over time. Scans become the engine, not the interface — users never see "Scan #14," they see the effects of scans (new changes, resolved correlations, updated suggestions).

---

## Intent Capture

Two layers of user input, both lightweight and optional:

### Page-Level Focus (persistent)
- Set once at onboarding: "What metric matters most on this page?"
- 4 tap targets: Signups, Bounce Rate, Time on Page, Custom
- Persists across all scans — tells the LLM what lens to evaluate through
- Editable anytime, but never re-prompted
- Stored as `metric_focus` text column on `pages` table (nullable, null = not set)

### Change-Level Hypothesis (reactive, time-bound)
- Captured AFTER Loupe detects a change, not before
- Email notification (primary): "We noticed your headline changed — what were you testing?"
- Also triggered post-deploy: "You shipped commit abc123 — what were you testing?"
- Tied to `detected_changes` lifecycle: watching → validated/regressed
- Once resolved, becomes an observation in the page history
- If user ignores it, Loupe proceeds as normal (intent is a multiplier, not a gate)
- In-app: show prompt on next visit as secondary surface
- Stored as `hypothesis` text + `hypothesis_at` timestamptz on `detected_changes` table

### Key Principle
No extra trips to Loupe. No pre-announcing changes. Intent capture happens:
1. Onboarding (once)
2. Post-detection email (reactive)
3. Post-deploy email (contextual)

The email subject IS the prompt. Keep it lightweight: "We noticed a change. Want to tell us what you were testing? (This helps Loupe give you better insights.)" Not homework.

---

## Layout: Page Record (65/35 Desktop Split)

Designed for desktop — this is where users check metrics. Full-width spatial layout with three simultaneous zones.

```
+------------------------------------------------------------------+
|  TOP BAR                                                          |
|  [domain.com ▾]  Last scanned 6h ago  [+23% signups since Jan 28]|
+------------------------------------------------------------------+
|                                    |                              |
|  MAIN STAGE (65%)                  |  HISTORY (35%)               |
|                                    |                              |
|  +------------------------------+ |  +------------------------+  |
|  |  CURRENT STATE               | |  |  OBSERVATIONS          |  |
|  |  Screenshot + metric overlay | |  |  Specific, dated        |  |
|  +------------------------------+ |  |  insights from resolved |  |
|                                    |  |  correlations           |  |
|  +------------------------------+ |  +------------------------+  |
|  |  STILL WATCHING              | |                              |
|  |  Changes collecting data     | |  +------------------------+  |
|  |  [card] [card] [card]        | |  |  CHANGE TIMELINE       |  |
|  +------------------------------+ |  |  Individual changes     |  |
|                                    |  |  with lifecycle status  |  |
|  +------------------------------+ |  |  Click → Chronicle      |  |
|  |  SUGGESTIONS                 | |  |  drill-down             |  |
|  |  What to do next             | |  +------------------------+  |
|  +------------------------------+ |                              |
+------------------------------------------------------------------+
```

### Top Bar (~80px)
- Page identity: domain + favicon, last scanned timestamp
- Headline metric in large type, **tied to a specific change or time period** ("+23% signups since Jan 28"), colored by trajectory (emerald/coral/neutral)
- **Empty metric state is the onboarding moment**, not a gap:
  - No focus set → "What metric matters to you?" (intent capture prompt)
  - No analytics connected → "Connect analytics to see real numbers" (integration/upgrade trigger)
  - Both prompts live where the number will eventually appear — the empty space does work
- **Multi-page switcher** (Starter/Pro only): domain text gets a `▾` chevron, becomes dropdown
  - Each row: status dot (emerald/amber/gray/red) + domain path + compact metric snippet
  - Max 10 rows at ~48px each (~480px), fits without scrolling
  - Current page highlighted with subtle active indicator
  - Free users: static domain text, no chevron, no dropdown
  - Top bar never changes shape across tiers — only the chevron differs

### Main Stage (left, ~65%)
The "now" — what your page looks like and what to do about it.

- **Current State:** Latest screenshot at useful size. Desktop/mobile toggle for Pro. The proof that anchors everything.
- **Still Watching:** Horizontal row of compact cards for changes collecting correlation data. Each shows element, progress indicator (5/7 days), amber accent. Collapses when empty.
- **Suggestions:** Top 2-3 suggestions from latest scan. Action-first: the fix, predicted impact, copy button. Updates with each scan.

### History (right, ~35%)
The "over time" — what Loupe has observed about this page. **Always rendered, even when sparse.** No progressive reveal — layout shift breaks spatial muscle memory and undermines a product that promises stability.

- **Observations:** Ordered by confidence + recency (strong patterns first, not just chronological). Grows over time — the product visibly gets smarter. This is the most differentiating zone. See [Observation Voice Guide](#observation-voice-guide) for format.
- **Change Timeline:** Reverse-chronological list of individual changes (not scans). Each entry: date, element, one-line description, status dot (watching/validated/regressed). Scrolls independently within the panel. Clicking a timeline entry opens the Chronicle detail as a drill-down (not a separate page navigation).

**Day-one empty state:** One timeline entry (baseline scan). Observations zone shows: *"Observations appear as Loupe learns what works for your page."* in muted text. Sparse sidebar is intentional — communicates trajectory, not emptiness.

### Day-One Experience
After the baseline scan, the page record has:
- **Screenshot:** Yes, from the baseline
- **Suggestions:** Yes, findings from the initial audit (this is the primary day-one value)
- **Still Watching:** Empty (collapses — nothing has changed yet)
- **Sidebar:** One timeline entry (baseline scan), observation empty state text
- **Top bar metric:** Onboarding prompts — "What metric matters?" and/or "Connect analytics to see real numbers"

The main stage is well-populated from the start. Suggestions are the day-one value. The top bar empty state drives onboarding actions (intent + analytics connection).

### How Scan Data Flows In
- Change detected → new entry in Still Watching + Change Timeline
- Correlation resolves → change moves from Still Watching to timeline (status updated), new observation generated and stored, headline metric recalculates
- No changes → last scanned timestamp updates, suggestions may refresh, everything else stays
- Chronicle scan reports become drill-downs behind timeline entries, not the primary experience

### Quiet Period (no changes for 2+ weeks)
- Top bar: metric shows current state, stable
- Main stage: screenshot sits calmly, no active watches (zone collapses), suggestions lead
- Sidebar: observations persist, timeline shows last change with age
- Feel: confident stillness

### Responsive
- Tablet: sidebar collapses below main stage
- Mobile: sequential layout, metric moves into top bar

---

## For Free Users (1 Page)

The page record IS the logged-in home. No intermediary dashboard. User logs in and sees their page directly.

## For Multi-Page Users (Future)

Lightweight page switcher dropdown in the top bar — not a separate dashboard screen. The "dashboard" becomes a UI control (dropdown), not a page.

---

## Technical: Schema Changes

**4 new columns, 0 new tables:**

```sql
-- Page-level intent
ALTER TABLE pages ADD COLUMN metric_focus text;

-- Change-level intent
ALTER TABLE detected_changes ADD COLUMN hypothesis text;
ALTER TABLE detected_changes ADD COLUMN hypothesis_at timestamptz;

-- Observation text (generated when correlation resolves)
ALTER TABLE detected_changes ADD COLUMN observation_text text;
```

- `metric_focus`: plain text, not enum. UI tap targets enforce the 4 choices; custom is free text. Null = user hasn't set a focus.
- `hypothesis`: plain text. User's stated intent for a specific change. Most will be null (optional).
- `hypothesis_at`: when the hypothesis was provided.
- `observation_text`: generated by the correlation cron when a change resolves. Template-based from real data, no extra LLM call.

---

## Technical: LLM Prompt Integration

### Data Flow: DB → Inngest → Pipeline → Prompt

1. **Inngest (`analyzeUrl`):** Fetch `metric_focus` from the `pages` row (already queried). Fetch `hypothesis` from `detected_changes` rows that have one.

2. **PostAnalysisContext:** Add two new fields:
   ```
   pageFocus?: string | null
   changeHypotheses?: Array<{ changeId, element, hypothesis }> | null
   ```

3. **Prompt injection** (same pattern as existing user feedback):
   - Page focus: `"The user cares most about: [metric]. Evaluate all changes and suggestions through this lens."`
   - Change hypotheses: `"The user told us what they were testing: [element]: [hypothesis]. Use this to evaluate whether the change achieved its goal."`
   - Both sanitized with `sanitizeUserInput()`, wrapped in XML data tags

---

## Technical: Observation Generation

**Generated by `checkCorrelations` cron (not the LLM).** When a change resolves to validated/regressed, the cron already has all the data: change details, correlation metrics, dates. It generates `observation_text` from a template and stores it on the `detected_changes` row.

**Frontend query for Observations zone:**
```
SELECT id, element, observation_text, correlation_unlocked_at, status, hypothesis
FROM detected_changes
WHERE page_id = ? AND status IN ('validated', 'regressed') AND observation_text IS NOT NULL
ORDER BY correlation_unlocked_at DESC
```

Ordering in the UI: by confidence + recency (strong patterns first, recent above old, repeated patterns above individual data points).

---

## Observation Voice Guide

### Tone
Clinical warmth. A doctor delivering results — respectful of the reader's time, confident in the data, never overselling. Not cold, not chatty. The Sage archetype.

### Structure
Every observation follows: `[What changed] + [when] + [metric movement] + [timeframe]`

One sentence standard. Two sentences only for repeated patterns. Never three.

### Examples

**Validated win:**
> Headline rewritten to outcome language on Jan 28. Signups up 18% over the following 14 days.

**Regressed change:**
> Pricing section removed on Feb 3. Bounce rate increased 11% over 10 days.

**Inconclusive:**
> Testimonial section added on Feb 8. No clear signal on signups after 14 days — other changes may be contributing.

**With user intent:**
> Tested as a social proof experiment: Customer logos added to hero on Jan 20. Signups up 15% over 21 days.

**Without user intent:**
> CTA button text changed from "Start free trial" to "Get started" on Feb 1. Time on page down 8% over 12 days.

**Repeated pattern:**
> Second time outcome-focused headlines outperformed feature-focused on this page. First observed Jan 28 (+18% signups), confirmed Feb 15 (+11% signups).

### Rules
- The change is the subject. Not "we" and not "you."
- Always include the date and measurement timeframe in days.
- State metric movements directly: "up 18%" not "correlated with an increase."
- For inconclusive: "No clear signal on [metric] after [N] days."
- When user provided hypothesis, prefix: "Tested as [intent]:"
- When no hypothesis, no prefix — observation simply exists.
- "On this page" when stating patterns — ground in specifics, never generic advice.

### Never use
- "We learned/found/discovered" — don't narrate Loupe's process
- "significantly/dramatically/notably" — let numbers speak
- "best practice/industry standard" — observations are about THIS page only
- "proved/confirmed/caused" — too strong
- "unfortunately/great news" — no emotional editorializing (status dot handles that)

### LLM Prompt Block (ready to paste)

```
## Observation Format

Write observations as one-sentence field notes. Occasionally two sentences when showing a repeated pattern.

Structure: [What changed] + [when] + [metric movement] + [measurement timeframe]

Example: "Headline rewritten to outcome language on Jan 28. Signups up 18% over the following 14 days."

Rules:
- The change is the subject. Not "we" and not "you."
- Always include the date of the change and the measurement timeframe in days.
- State metric movements directly: "up 18%" not "correlated with an increase."
- For inconclusive results: "No clear signal on [metric] after [N] days" + brief reason if known.
- For repeated patterns: Two sentences. State the pattern, then cite both instances with dates and numbers.
- When user provided a hypothesis, prefix with "Tested as [intent]:" before the observation.
- When no hypothesis exists, write the observation without any prefix.

Never use:
- "We learned/found/discovered"
- "significantly/dramatically/notably"
- "best practice/industry standard"
- "proved/confirmed/caused"
- "unfortunately/great news"

The tone is a precise, unhurried observer. Not cold, not warm. A doctor delivering results.
```

---

## Sequencing

| Phase | What | Why first |
|-------|------|-----------|
| 1 | Intent capture (page-level metric + reactive change annotation) | **DONE** — Phase 2B in current.md |
| 2 | Page Record view | **DONE (superseded)** — Dashboard V2 + Chronicle Dossier fulfill the same goals with a better layout |
| 3 | Cross-page patterns | Future — only after users complete intent→outcome loops |

---

## Strategic Notes

### From Brand Guardian (Review 1)
- Living page intelligence fulfills the brand promise ("When metrics move, know why" is inherently longitudinal)
- Intent doesn't dilute the brand — it completes the correlation story (adds the hypothesis that was missing)
- Caution: don't let intent become a requirement; tool must still work for users who say nothing
- Caution: don't become a general analytics tool; boundary is changes and their effects, not dashboards and metrics
- Language: "correlated with" not "caused"; "looks like it helped" not "this worked"

### From Brand Guardian (Review 2)
- Drop crisis-coded naming — Loupe is calm Sage archetype, not command center
- Use consistent language from existing Chronicle: "Still watching" not "Active watches"
- Observations must be specific and dated, never generic advice — the value is specificity
- Intent notification should be email-first (users don't live in Loupe)
- Chronicle reports become drill-downs behind timeline entries
- Risk: layout must feel simpler than scan-hopping, not more complex — avoid "too many panels" feeling
- Risk: metric focus could make Loupe feel like a metrics dashboard; keep changes primary, metrics secondary

### From Growth Hacker
- Intent creates the strongest upgrade trigger: "You said you care about signups. Connect analytics to see if your change worked."
- Living intelligence retains better than periodic reports (canceling = losing accumulated context)
- Cross-page patterns create real switching costs (personalized empirical knowledge no competitor can replicate)
- Sequence: validate participation first (do users provide intent?), then build the living view

---

## Resolved Questions

- [x] What triggers the "What were you testing?" notification? → **Email primary, in-app secondary**
- [x] How do Chronicle reports relate to the page record? → **Drill-down behind timeline entries**
- [x] What exactly goes in "Observations"? → **Specific, dated correlations about THIS page. Never generic advice.**
- [x] How does intent text flow into the LLM prompt? → **New fields on PostAnalysisContext (`pageFocus`, `changeHypotheses`), injected as prompt sections with sanitized user input in XML tags**
- [x] DB schema: page-level metric preference? → **`pages.metric_focus` text column, nullable**
- [x] DB schema: change-level hypothesis? → **`detected_changes.hypothesis` text + `hypothesis_at` timestamptz, nullable**
- [x] How does the Observations zone get populated? → **Correlation cron generates `observation_text` on `detected_changes` row when status resolves. Template-based, no extra LLM call.**
- [x] Progressive sidebar reveal? → **No. Always show sidebar. Sparse is fine — layout shift breaks trust.**
- [x] Multi-page switcher? → **Dropdown from domain text in top bar. Status dot + domain + metric snippet per row. Chevron only for multi-page tiers.**
