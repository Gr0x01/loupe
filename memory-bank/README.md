# Driftwatch

**Founder**: Rashaad

## The Product

**Your site's changing. We're watching.**

Driftwatch monitors your web pages for visual and content drift — changes from deploys, coding agents, dependency updates, or copy edits. It screenshots your pages on a schedule, detects meaningful changes, audits pages for CRO best practices, and emails you when something shifts. Connect your analytics to see what those changes did to your numbers.

### Target Audience
Solo founders and small teams (1-5 devs) shipping web products who don't have a dedicated growth/analytics person. They deploy frequently, use coding agents, and rarely notice when something on their site drifts off.

### The Problem
Sites change constantly — deploys, AI-assisted code changes, dependency updates, third-party scripts. Founders ship fast but don't track what changed, when, or whether it helped or hurt. When conversion drops 20%, they panic and guess instead of looking at what shifted.

### The Solution (Layered)

**Core (zero setup):** Enter URLs + email. We watch your pages.
1. **Monitor** — Screenshot pages on a schedule, detect visual/content changes
2. **Audit** — LLM-powered CRO analysis (headline, CTA, trust signals, visual hierarchy)
3. **Alert** — Email when something meaningful changes: "Your homepage hero text changed"

**Power-up (connect your stuff):**
4. **Track deploys** — Connect GitHub, tie changes to specific commits
5. **Correlate** — Connect PostHog/GA4, see metric movements after changes
6. **Suggest** — LLM narration: "You changed the CTA. Signups increased 15%. Try the same pattern on your pricing page."

### Product Evolution
- **v1 (MVP)**: Page monitoring + audits + email alerts (URL + email, that's it)
- **v2**: Deploy tracking (GitHub integration) + analytics correlation
- **v3**: Proactive suggestions, historical trends, deeper CRO intelligence
- **Future**: Boost integration (closed-loop CRO system)

### Adjacent Product: Boost (aboo.st)
Same founder, same LLM analysis muscle. Boost tells you "what to do," Driftwatch tells you "if what you did worked." Together they create a closed-loop CRO system for indie founders.

**Domain**: TBD (driftwatch.io / driftwatch.dev)

## Tech Stack (Planned)

| Service | Purpose |
|---------|---------|
| **Next.js** | App framework |
| **Supabase** | DB + Auth |
| **Vercel AI SDK** | Model-agnostic LLM calls (swap providers freely) |
| **Playwright / Screenshot API** | Page screenshots |
| **Inngest** | Scheduled monitoring jobs + background processing |
| **PostHog / GA4 API** | Analytics data (v2) |
| **GitHub Webhooks** | Deploy detection (v2) |
| **Stripe** | Billing |

### LLM Model Strategy
Tiered by task complexity, swappable via Vercel AI SDK:
- **Detection** (did something change?): Haiku / Gemini Flash — cheap, fast
- **Description** (what changed?): Sonnet — good vision + clear language
- **Suggestions** (what to do about it): Opus / Sonnet — deep marketing knowledge

## Commands
```bash
npm run dev          # local dev
npm run build        # production build
```

## Doc Map

| Doc | Read when... |
|-----|------------|
| `phases/current.md` | Starting work (ALWAYS read this) |
| `product.md` | Building user-facing features |
| `architecture.md` | Building backend/infra |
| `decisions.md` | You need to understand "why" |
