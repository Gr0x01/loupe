# Loupe

**Founder**: Rashaad

## The Product

**Your site's changing. We're watching.**

Loupe monitors your web pages for meaningful changes — the subtle shifts that slip through when you're shipping fast. Copy that got reworded, hero images that shifted, CTAs that disappeared, trust signals that broke. We screenshot your pages on a schedule, detect meaningful changes, and tell you what shifted and what to do about it. Not error monitoring — that's what Sentry is for. This is the stuff founders miss.

### Target Audience
Solo founders and small teams (1-5 devs) shipping web products who don't have a dedicated marketing or design person watching their site. They deploy frequently, use coding agents, and rarely notice when something customer-facing drifts off.

### The Problem
Sites change constantly — deploys, AI-assisted code changes, dependency updates, third-party scripts. Nobody's watching the marketing and design layer. Your headline changes, your social proof disappears, your CTA gets buried. You don't notice until conversions tank and you're guessing what went wrong.

### The Solution (Layered)

**Core (zero setup):** Enter URLs + email. We watch your pages.
1. **Monitor** — Screenshot pages on a schedule, detect visual/content changes
2. **Analyze** — LLM-powered review of what changed and whether it matters (copy, layout, trust signals, calls to action)
3. **Alert** — Email when something meaningful shifts: "Your homepage hero text changed"
4. **Suggest** — Plain-language recommendations: what changed, why it matters, what to do

**Power-up (connect your stuff):**
5. **Track deploys** — Connect GitHub, tie changes to specific commits
6. **Correlate** — Connect PostHog/GA4, see metric movements after changes

### Product Evolution
- **v1 (MVP)**: Page monitoring + analysis + suggestions + email alerts (URL + email, that's it)
- **v2**: Deploy tracking (GitHub integration) + analytics correlation
- **v3**: Historical trends, deeper pattern recognition across pages
- **Future**: Boost integration (closed-loop marketing optimization)

### Adjacent Product: Boost (aboo.st)
Same founder, same LLM analysis muscle. Boost tells you "what to do," Loupe tells you "if what you did worked." Together they create a closed-loop marketing system for indie founders.

**Domain**: getloupe.io

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
- **Suggestions** (what to do about it): Opus / Sonnet — marketing + design awareness

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
