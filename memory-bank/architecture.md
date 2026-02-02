# Driftwatch — Architecture

## Overview

Monolith Next.js app. Scheduled jobs via Inngest. LLM calls via Vercel AI SDK (model-agnostic). Screenshots via existing Vultr Puppeteer instance or managed service.

## Core Architecture

```
User enters URL → Supabase stores page config
                → Inngest schedules monitoring jobs
                → Screenshot service captures page
                → LLM analyzes screenshot (detect changes, audit CRO)
                → Email notification if meaningful change detected
                → Results stored in Supabase, shown in dashboard
```

## LLM Layer

**Vercel AI SDK** for model-agnostic LLM calls. Swap providers with config changes.

### Analysis Agents (Multi-Lens)

Every change is analyzed by 2 specialized agents, each with a different lens. Results are aggregated by an orchestrator.

| Agent | Input | What it catches | Example |
|-------|-------|----------------|---------|
| **Marketing** | Before/after screenshots | Copy quality, messaging, positioning, CTA text, social proof, funnel friction | "Your headline lost the outcome-focused hook. Old: '2x your conversions.' New: 'AI-powered platform.'" |
| **Design** | Before/after screenshots + DOM context | Visual hierarchy, spacing, contrast, layout, typography, structural changes | "CTA contrast ratio dropped. Hero heading changed from `text-5xl` to `text-3xl`. Section spacing collapsed." |

Both agents work from screenshots (vision). The design agent also gets DOM context so it can give specific, actionable feedback referencing actual markup/classes rather than just "the heading looks smaller."

### Model Routing

| Task | Model | Reason |
|------|-------|--------|
| Change detection (did anything change?) | Haiku / Gemini Flash | Cheap, fast, binary decision |
| Design agent | Sonnet | Vision + DOM context + structural reasoning |
| Marketing agent | Sonnet | Vision + copy/positioning knowledge |
| **Orchestrator** | **Opus / Sonnet** | Synthesizes 2 agents into one cohesive report |

The 2 analysis agents run in parallel on cheaper models (vision work). The orchestrator runs once on text-only input (agents' findings), so the expensive model only fires once per change on cheap input.

Evaluate Gemini models for cost savings on detection/agent layers.

### Orchestrator Layer

The orchestrator takes all 3 agents' raw findings and produces one cohesive report:
- **Deduplicates** — design + DOM agent might both flag the same heading change
- **Prioritizes** — ranks by severity (CTA gone > font weight change)
- **Connects dots** — "heading shrunk AND copy got weaker AND 3 new form fields — this page got significantly worse for conversion"
- **Writes the narrative** — one human-voice report, not three bullet lists
- **Sets the product voice** — the agents are analysts, the orchestrator is the senior consultant

## Shared Infrastructure with Boost

Reusable from Boost (actionboost):
- **Screenshot service**: Vultr Puppeteer instance (45.63.3.155:3333) — already running, API key auth, SSRF protection
- **Supabase**: Could share instance or create separate project
- **Inngest**: Background job processing for async screenshot capture + analysis
- **Stripe**: Billing infrastructure
- **Page audit logic**: Already built in Boost, port to Driftwatch

## Key Technical Challenges

1. **Screenshot consistency** — Dynamic content (timestamps, ads, chat widgets) causes false diffs. Need element masking, diff thresholds, and wait-for-idle strategies.
2. **Change detection quality** — Use pixelmatch for visual diff overlay + LLM vision for semantic "what actually changed" description. Pixel diff is the proof, LLM is the explanation.
3. **Deploy detection (v2)** — GitHub `push` to main + Vercel `deployment.ready` webhook. Need debouncing for rapid deploys. Deploy != live — need delay or polling.
4. **Analytics API (v2)** — PostHog first (simple bearer token auth). GA4 second (OAuth is painful, Google review process). GA4 data can be delayed 24-48hr.
5. **Statistical honesty** — Low-traffic sites can't show statistically significant metric changes. Always show confidence levels, raw data alongside LLM narratives. Frame as investigation tool, not causal inference engine.
6. **Cost management** — Free tier costs ~$0.15-0.30/mo per user (weekly checks, 1 page). Must keep free tier lean. LLM suggestions are the paid upgrade trigger.

## Monitoring Job Flow (Inngest)

```
Weekly cron → For each monitored page:
  1. Screenshot the page (desktop + mobile) + capture DOM snapshot
  2. Compare to previous snapshot (pixelmatch for quick diff)
  3. If meaningful change detected:
     a. Store new snapshot + DOM
     b. Run 2 analysis agents in parallel:
        - Marketing agent (before/after screenshots)
        - Design agent (before/after screenshots + DOM context)
     c. Orchestrator synthesizes into single report
     d. Send email alert with aggregated issues
  4. If no change: store snapshot, no alert
```

## Cost Estimates Per User

| Tier | Monthly cost to serve |
|------|---------------------|
| Free (1 page, weekly) | ~$0.15-0.30 |
| Pro (10 pages, weekly + on-demand) | ~$3-5 |

Pro at $19/mo = healthy margins.
