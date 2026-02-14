# Loupe — Product

## The Loop

Three data sources, one insight engine:

```
GitHub (what you changed)  ──┐
                              ├──→  Loupe  ──→  "This change helped. That one hurt. Do this next."
PostHog (what happened)    ──┘        ↑
                                      │
Loupe Screenshots + Audits ───────────┘
(what the page looks like)
```

**GitHub** tells you code changed. **PostHog** tells you metrics moved. **Loupe** connects the two: which change caused which metric movement, and what to do about it.

No other tool does this. The closest analogy is Facebook Ad suggestions — "this creative is outperforming that one" — but for your actual landing page, powered by your actual deploy history and your actual analytics.

## Core User Flow

### Free: Audit (lead magnet)
1. Paste a URL → get findings with predicted impact in 30 seconds
2. No signup. Shareable. Unlimited URLs.
3. Each finding is observational + actionable: "Your CTA is below the fold. Expected: moving it up could improve clicks by 10-15%."
4. Headline rewrite with copy-paste value

### Free → Signed in: Track
5. User wants to know if their changes worked
6. Clicks "Track this page" (email required → magic link → signed in)
7. Loupe starts watching: screenshots, metrics, changes
8. **This is the activation moment** — user enters the value loop

### Signed in → Ongoing: The Value Loop
9. Daily/weekly scans detect changes
10. Smart LLM analyzes: What changed? What should they do next? Any correlations?
11. If metrics connected: "Your headline change correlated with -8% bounce rate. Looks like it helped."
12. If not enough data: "Watching metrics. We'll update when we know more."
13. Always suggestions: "Here's what to do next based on current state."

### Intent Capture (Compounding Intelligence)
14. **Metric focus** — User tells Loupe what matters ("signups", "bounce rate") during onboarding or later
15. **Hypothesis** — When a change is detected, email asks "What were you testing?" → user logs their intent
16. **Observations** — When correlations resolve, LLM writes observations referencing hypothesis + metrics
17. These compound: each scan the LLM knows more about the user's goals and their page's behavior

### With Integrations: Full Correlation
14. Connect GitHub → changes linked to specific commits
15. Connect PostHog/GA4 → real metric correlation
16. "Your hero headline change in commit abc123 correlated with a 12% drop in bounce rate"

## The Data Model

Scans chain together via `parent_analysis_id`:

```
Scan 1 (baseline, Jan 15)
  └→ Scan 2 (re-scan, Jan 16) — "Headline changed, CTA moved"
      └→ Scan 3 (auto, deploy abc123, Jan 20) — "Social proof added"
          └→ Scan 4 (scheduled, Jan 27) — "No changes. Metrics stable."
```

Each scan tracks:
- Screenshot
- Findings with predictions
- Suggestions (what to do next)
- Changes since last scan
- Correlation insights (when data available)
- Running summary (compressed narrative of the page's evolution)

## Three Trigger Types

| Trigger | When | Who |
|---------|------|-----|
| Manual audit | User pastes URL | Anyone (free) |
| Re-scan | User clicks "Re-scan" | Signed-in user |
| Scheduled scan | Daily/weekly cron | Tracked pages |
| Deploy scan | Push to main (GitHub webhook) | GitHub-connected users |

## Key Screens

### 1. Landing / Audit Tool
- Paste URL, get instant analysis
- Findings with predicted impact
- Headline rewrite
- Bridge CTA: "Track this page"

### 2. Audit Results (Initial)
- **Hero:** Verdict + impact bar + findingsCount + domain badge (no scores — see vision.md)
- **Findings Section ("What to fix"):** NewFindingCard components with:
  - Impact badge (HIGH/MEDIUM/LOW)
  - Current value with element icon
  - Suggestion block with copy button
  - Prediction line (+X-Y% metric with friendlyText)
  - Expandable "Why this matters" (assumption) and "Methodology" sections
  - First finding expanded by default, others collapsed
- **Headline rewrite:** Copy-paste ready with currentAnnotation + suggestedAnnotation
- **Summary:** Pull-quote card with overall assessment
- **CTA:** "Track this page to see if changes help"

### 3. Audit Results (N+1 / Chronicle)
- **Hero:** Verdict ("You made 2 changes. One helped.")
- **What changed:** Timeline of changes with correlation
- **What to do next:** Updated suggestions
- **Progress:** Validated / Watching / Open

### 4. Dashboard
- Three zones: Results (validated/regressed correlations) → Attention → Watching
- Results zone shows correlation wins/losses with big percentage hero
- Attention zone surfaces items needing user action
- Watching zone shows stable pages
- Onboarding: 2-step flow (URL → metric focus selection)
- Hypothesis prompt: inline card when change detected (from email deep link or auto-prompt)

### 5. Settings
- Connected integrations (GitHub, PostHog, GA4)
- Email preferences
- Domain context (company, ICP, brand voice) — future

### 6. Demo Pages (Public)
Showcase Loupe's ideal state with mock data for "xyz.io". No auth required.

**`/demo`** — Demo Dashboard
- Results Zone: 3 validated wins (+23% conversions, -12% bounce, +38% time on page)
- Attention Zone: 1 low-severity suggestion
- Watching Zone: 3 stable pages
- Link to demo scan report

**`/demo/analysis`** — Demo Scan Report (Chronicle view)
- Page header with scan picker (Scan 16 of 20)
- Verdict: "You polished the timeline and added logos, but ignored the messaging friction."
- Progress gauges: 1 watching, 3 open
- Deploy context showing commit trigger
- Changes caught section with 2 detected changes
- "Your next move" with 3 prioritized suggestions

**Implementation:** Uses real components with `demo` prop that renders static (non-navigable) versions. Ensures demos always match actual UI.

## Progressive Value

| Without integrations | With integrations |
|---------------------|-------------------|
| "Your headline changed Tuesday" | "Your headline changed Tuesday → bounce rate up 12%" |
| Expected impact (industry benchmarks) | Actual impact (their data) |
| Timeline of changes | Timeline + metric correlation |
| "We predict this will help" | "Here's what actually happened" |

Most users won't connect PostHog/GA4. The product must be valuable anyway.

## Pricing

| | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| Price | $0 | $12/mo | $29/mo |
| Pages | 1 | 3 | 10 |
| Scans | Weekly | Daily+Deploy | Daily+Deploy |
| Analytics | 0 | 1 | Unlimited |
| Mobile | No | No | Yes |

Founding 50 grandfathered as Starter tier. See `decisions.md` D29.

## Conversion Flywheel

Free → Paid is driven by demonstrated value, not trial expiration:

1. **Free audit** shows the analysis is good (30 seconds to value)
2. **Track this page** enters them into the value loop
3. **First correlation** proves the product works ("Your change helped!")
4. **Upgrade prompts** at moments of demonstrated value

## Target Audience

Solo founders and small teams (1-5 devs) shipping web products. They:
- Deploy frequently (often via coding agents like Cursor/Claude Code)
- Don't have a dedicated marketing or design person watching the site
- Use PostHog or GA4 (often free tier)
- Push to GitHub → auto-deploy via Vercel/Netlify
- Make copy/design changes constantly but never know what actually moved the needle

## Positioning

### Celebration + Curiosity → Compounding Intelligence

**Acquisition (celebration + curiosity):** Solo founders ship fast — that's the hard part. Loupe celebrates their velocity and closes the loop: "You made the change. See what it did." Supportive tone, not fear-based. We have their back.

**Activation (supportive):** "Your next change is coming. This time, you'll know." Future-focused, helpful — not guilt-tripping.

**Retention (compounding):** Show accumulated intelligence — scan counts, prediction accuracy, calibration progress, "since we started watching" summaries. Every scan makes Loupe sharper for their page.

**Category:** Change Intelligence — connecting what you ship to what happens next.

**One-liner:** "Loupe learns what works for your site — by watching every change and measuring what it did."

See `vision.md` for full positioning details, headline hierarchy, and "Only" statement.

## What Loupe Catches

- **Content changes** — copy/messaging shifted
- **Layout changes** — elements moved, sections added/removed
- **Trust signal changes** — social proof appeared/disappeared
- **CTA changes** — button text, placement, visibility
- **Metric movements** — correlation with page changes

## See Also

- `vision.md` — Full product vision with LLM pipeline details
- `architecture.md` — Technical implementation
- `icp.md` — Ideal customer profile and messaging
- `src/lib/types/analysis.ts` — Canonical TypeScript types for analysis data
