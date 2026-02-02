# Loupe — Product

## Core User Flow (MVP)

1. **Enter URL** — User provides page URL(s) to monitor
2. **Get Audit** — Instant LLM-powered CRO audit (headline, CTA, trust signals, visual hierarchy)
3. **Monitor** — We screenshot the page weekly (free) and detect meaningful changes
4. **Alert** — Email notification: "Your homepage changed — here's what's different"
5. **Upgrade prompt** — "Your bounce rate shifted after this change. Connect analytics to see details."

## Key Screens (TBD)

1. **Landing / Audit Tool** — Enter a URL, get instant CRO audit (lead magnet, zero friction)
2. **Dashboard** — Monitored pages with change timeline and status
3. **Page Detail** — Screenshot history, change diffs, audit scores, metric overlay (Pro)
4. **Settings** — Email preferences, connected integrations

## Pricing

**Two tiers at launch. Simple.**

| | Free | Pro $19/mo |
|---|---|---|
| Pages | 1 (homepage) | Multiple (10-25) |
| Monitoring | Weekly | Weekly + on deploy |
| Audits | 1 on-demand/month | Unlimited |
| Change alerts | Basic change detection | Full multi-agent report on every change |
| Analytics | - | PostHog/GA4 correlation |
| Deploy tracking | - | GitHub integration |
| LLM suggestions | - | Full CRO suggestions |

Team tier: design later based on what Pro users actually ask for.

## Conversion Flywheel

**Free → Paid is event-triggered, not time-limited.**

Free users get weekly checks + "something changed" emails. The habit builds. Then when something meaningful happens, we show the edge of the paid value:

- "Your homepage changed significantly. **See what this did to your metrics →**"
- "We detected 3 changes this month. **See the full CRO analysis →**"
- "Your bounce rate shifted after this change. **Connect analytics to see details →**"

Upgrade prompts come at the moment of curiosity — not on an arbitrary trial expiration day.

Optional: "Try Pro free for 14 days" button always available for users who want to explore.

## Lead Magnet: Free Page Audit

Instant, free, no-signup full-quality page analysis. The audit IS the product demo — no watered-down version.

Runs the full multi-agent pipeline:
- Marketing agent: copy, messaging, positioning, with specific rewrites
- Design agent: visual hierarchy, spacing, contrast, with specific fixes
- Code/DOM agent: structural issues, accessibility, performance
- Orchestrator: synthesizes into one actionable report

The audit is a point-in-time snapshot. The paid product is ongoing monitoring.

- First audit: no email required (zero friction for viral sharing)
- Second audit: email gate ("enter email for 3 free audits")
- Natural upsell: "Track this page automatically with Loupe"
- Shareable audit card for Twitter/IndieHackers distribution
- Cost: ~$0.10-0.20 per audit (3 agents + orchestrator)

## What Loupe Catches

Loupe detects multiple types of page changes:
- **Visual changes** — layout/design shifted (deploys, coding agents, dependency updates)
- **Copy changes** — messaging went off-brand (AI rewrites, team edits)
- **Marketing fit drift** — page no longer matches conversion best practices
- **Performance changes** — things that affect load times, mobile experience

## Multi-Agent Analysis

Every detected change is analyzed through 3 lenses, run in parallel:

**Marketing agent** — Copy, messaging, positioning, CTA quality, social proof, funnel friction. Works from screenshots. "Your headline lost the outcome-focused hook."

**Design agent** — Visual hierarchy, spacing, contrast, layout, typography, structural changes. Works from screenshots + DOM context. "CTA contrast ratio dropped. Hero heading changed from `text-5xl` to `text-3xl`. Section spacing collapsed."

Results are aggregated into one report. The key insight: feedback is **contextual to the page's own history**, not generic best practices. We compare the page against itself — "you used to do X, now you're doing Y, here's why that matters."

Email format: "Your pricing page changed — 1 marketing issue, 2 design issues detected."

## Data Schema (TBD)

Core entities:
- **sites** — User's monitored websites
- **pages** — Specific URLs to monitor per site
- **snapshots** — Screenshot captures at points in time
- **audits** — LLM analysis results per snapshot
- **changes** — Detected differences between snapshots
- **deploys** — Detected deploys tied to changes (v2, GitHub integration)
- **metrics_snapshots** — Analytics data tied to time windows (v2)
