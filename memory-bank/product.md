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
1. Paste a URL → get a full CRO audit in 30 seconds (score, findings, specific recommendations)
2. No signup. Shareable. Unlimited URLs.
3. Each finding is actionable: "Your CTA is below the fold. Move it above the hero."

### Free → Signed in: Re-scan
4. User fixes something based on the audit
5. Clicks "Re-scan" (email required → magic link → signed in)
6. Loupe runs the audit again, compares against baseline
7. Shows progress: "2 of 5 issues fixed. Score: 62 → 78."
8. Each original finding tracked: resolved / persists / regressed / new
9. **This is the activation moment** — user sees the tool working over time

### Signed in → Pro: Connect data
10. "You improved your page. Want to know if it moved conversions?"
11. Connect GitHub (webhook on push to main → auto-scan after deploy)
12. Connect PostHog (API key → pull metrics)
13. Loupe now runs automatically: deploy → screenshot → audit → correlate with metrics
14. "Your hero headline change in commit abc123 correlated with a 12% drop in bounce rate"
15. Ongoing suggestions: "Your social proof section has been missing for 3 deploys. Pages with social proof convert 2x better."

## The Data Model

Every scan produces a full audit. Scans chain together via `parent_analysis_id`:

```
Scan 1 (baseline, Jan 15, score 62)
  └→ Scan 2 (re-scan, Jan 16, score 78) — "Fixed CTA placement, social proof still missing"
      └→ Scan 3 (auto, deploy abc123, Jan 20, score 75) — "Headline changed, slightly weaker"
          └→ Scan 4 (auto, deploy def456, Jan 25, score 82) — "Added testimonials, big improvement"
```

Each scan tracks:
- Full audit (score, findings, screenshot)
- Structured finding status against originals (resolved/persists/regressed/new)
- Running summary (compressed narrative of the page's evolution)
- Deploy context (if triggered by GitHub webhook)
- Metric correlation (if PostHog connected)

## Three Trigger Types

| Trigger | When | Who |
|---------|------|-----|
| Manual audit | User pastes URL | Anyone (free) |
| Re-scan | User clicks "Re-scan" | Signed-in user |
| Auto-scan | Push to main (GitHub webhook) | Pro user |

Weekly scheduled scans are a fallback for users without GitHub connected.

## Key Screens

1. **Landing / Audit Tool** — Paste URL, get instant audit (lead magnet)
2. **Results Page** — Full audit + re-scan CTA + progress tracking
3. **Page Timeline** (Pro) — Chronological view of all scans, score trend, deploy markers, metric overlay
4. **Dashboard** (Pro) — All monitored pages, status, last change, metric summary
5. **Settings** — Connected integrations (GitHub, PostHog), email preferences

## Pricing

| | Free | Pro $19/mo |
|---|---|---|
| Audits | Unlimited | Unlimited |
| Re-scans | 1 page | Multiple pages |
| Auto-scan on deploy | - | GitHub webhook |
| Analytics correlation | - | PostHog integration |
| Suggestions | Basic (from audit) | Contextual (based on history + metrics) |
| Page timeline | - | Full history + trends |

## Conversion Flywheel

Free → Paid is driven by demonstrated value, not trial expiration:

1. **Free audit** shows the tool works (30 seconds to value)
2. **Re-scan** proves changes are tracked (minutes to value)
3. **"Connect GitHub + PostHog"** unlocks the full loop
4. Upgrade prompts at moments of curiosity:
   - "You improved your score. Want to know if it moved conversions?"
   - "We detected 3 deploys this week. See what changed and what it did to your metrics."

## Target Audience

Solo founders and small teams (1-5 devs) shipping web products. They:
- Deploy frequently (often via coding agents like Cursor/Claude Code)
- Don't have a dedicated marketing or design person watching the site
- Use PostHog or GA4 (often free tier)
- Push to GitHub → auto-deploy via Vercel/Netlify
- Make copy/design changes constantly but never know what actually moved the needle

## Positioning

"Like Facebook Ad suggestions, but for your landing page."

You change your page constantly — deploys, CMS updates, AI-generated code. Loupe watches every change, tracks the impact on your actual metrics, and tells you what worked and what didn't. No manual A/B testing, no spreadsheets, no guessing.

## What Loupe Catches

- **Visual changes** — layout/design shifted (deploys, coding agents, dependency updates)
- **Copy changes** — messaging went off-brand (AI rewrites, team edits)
- **Marketing fit drift** — page no longer matches conversion best practices
- **Performance changes** — things that affect load times, mobile experience
- **Metric movements** — conversion, bounce rate, session duration shifts after changes

## Build Order

### Phase 1A — Free Audit (DONE)
The lead magnet. Paste URL → get scored audit.

### Phase 1B — Re-scan + Structured Tracking (DONE)
- Re-scan with finding-level tracking (resolved/persists/regressed/new)
- Progress view ("2 of 5 issues fixed") with comparison UI
- Magic link auth gate on re-scan
- `parent_analysis_id` chain for scan history
- Methodology-grounded findings (PAS, Fogg, Cialdini, Gestalt)

### Phase 1C — GitHub + PostHog Integration (IN PROGRESS)
- GitHub webhook on push to main → auto-scan ✓
- PostHog API → pull metrics ✓ (basic: pageviews, visitors, bounce rate)
- Metrics displayed in audit results ✓
- Correlation engine: LLM with tool calling connects deploys → page changes → metric movements (deferred)
- Page timeline view (not started)

### Phase 1D — Dashboard + Billing
- Dashboard showing all monitored pages
- Stripe integration ($19/mo Pro)
- Settings page (integrations, preferences)

### Future
- Multi-page monitoring
- Embedded findings for trend analysis
- Team tier
- Deploy previews (scan staging before merge)
