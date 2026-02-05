# Loupe

**Founder**: Rashaad

## What Loupe Does

**When metrics move, know why.**

Loupe connects page changes to business outcomes. We track what changes on your site and show you whether it helped or hurt.

Not this: "Your site changed!" (that's VisualPing)
This: "Your headline changed Jan 28. Since then, bounce rate is up 12%."

The value isn't catching changes fast. It's understanding what caused what — a week later, a month later.

### Who It's For

**Vibe coders** — Non-technical founders using AI-first tools (Lovable, Bolt, Base44). No version control mental model. Most vulnerable to changes, least equipped to notice them.

**Technical solo founders** — Developers shipping fast ($500-$10k MRR). Could build this themselves but won't maintain it. Too busy with features to watch the marketing layer.

Both ship constantly. Both notice conversions dropped without knowing why. Loupe connects the dots.

### The Problem

Sites change constantly. Nobody tracks:
- What actually changed on the page
- Whether changes helped or hurt
- What caused the metric movement they're seeing

### The Solution

Loupe builds a **timeline of your site** — what changed and when — and overlays it with your metrics.

When metrics move, look back and see what changed.
When you ship a change, look forward and see what happened.

### Two Experiences

**Audit 1: Findings + Predictions (Lead Magnet)**
- Paste URL, get findings with expected impact
- Each finding has a prediction: "If you fix this, expect bounce rate down 8-15%"
- No signup required
- Purpose: Get them in the door, plant the seed for validation

**Audit N+1: Chronicle (The Product)**
- Not another audit — a progress report
- Three sections: What changed, What to do next, Progress tracker
- Verdict-first: "You made 2 changes. One helped. Here's what to do next."
- Purpose: Ongoing value, always something actionable

### The Value Loop

```
AUDIT -> SUGGEST -> CHANGE -> WATCH -> CORRELATE -> SUGGEST AGAIN
```

Suggestions get smarter over time because we know what actually moved the needle.

**Domain**: getloupe.io

## Tech Stack

| Service | Purpose |
|---------|---------|
| **Next.js** | App framework |
| **Supabase** | DB + Auth |
| **Vercel AI SDK** | Model-agnostic LLM calls |
| **Playwright / Screenshot API** | Page screenshots |
| **Inngest** | Scheduled jobs + background processing |
| **PostHog / GA4 API** | Analytics data (pageviews, bounce rate) |
| **Supabase API** | User database metrics (signups, orders) |
| **GitHub Webhooks** | Deploy detection (v2) |
| **Stripe** | Billing |

### LLM Model Strategy

Tiered by task, swappable via Vercel AI SDK:
- **Detection** (did something change?): Haiku / Gemini Flash — cheap, fast
- **Description** (what changed?): Sonnet — good vision + clear language
- **Suggestions** (what to do about it): Opus / Sonnet — marketing + design awareness

## Commands

```bash
npm run dev          # local dev at localhost:3002
npm run build        # production build
```

## Doc Map

| Doc | Read when... |
|-----|------------|
| `phases/current.md` | Starting work (ALWAYS read this) |
| `product.md` | Building user-facing features |
| `architecture.md` | Building backend/infra |
| `decisions.md` | You need to understand "why" |
| `icp.md` | Writing copy, designing UI, or marketing work |
| `vision.md` | Understanding the full product direction |
| `phases/vision-pivot.md` | Implementation details for the pivot |
