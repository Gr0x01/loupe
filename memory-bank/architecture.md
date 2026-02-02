# Loupe — Architecture

## Overview

Monolith Next.js 16 app (App Router). Background jobs via Inngest. LLM calls via Vercel AI SDK v6 (model-agnostic). Screenshots via Vultr Puppeteer instance with Decodo residential proxy.

## Tech Stack (Active)

| Service | Version | Purpose |
|---------|---------|---------|
| Next.js | 16.1.6 | App framework (App Router, Tailwind v4) |
| React | 19.2.3 | UI |
| Supabase | JS 2.93.3, SSR 0.8.0 | DB + Auth + Storage |
| Vercel AI SDK | 6.0.67 | Model-agnostic LLM calls |
| @ai-sdk/anthropic | 3.0.35 | Anthropic provider |
| @ai-sdk/google | 3.0.20 | Google provider (for evaluation) |
| @ai-sdk/openai | 3.0.25 | OpenAI provider (for evaluation) |
| Inngest | 3.50.0 | Background job processing |
| Tailwind CSS | 4.x | Styling (config in CSS, no tailwind.config) |

## Core Architecture (Phase 1A)

```
User enters URL → POST /api/analyze
                → Creates `analyses` record (status: pending)
                → Sends Inngest event `analysis/created`
                → Inngest function runs:
                    1. Screenshot via Vultr service (with Decodo proxy)
                    2. Upload screenshot to Supabase Storage
                    3. Send screenshot to Sonnet via Vercel AI SDK (vision)
                    4. Parse structured JSON response
                    5. Update `analyses` record (status: complete)
                → Frontend polls GET /api/analysis/[id]
                → Displays results when complete
```

## Screenshot Service (Vultr)

**Server:** 45.63.3.155:3333 (Vultr VPS, New Jersey)
**Stack:** Express + puppeteer-extra + puppeteer-extra-plugin-stealth
**Process manager:** PM2

### Key features
- **Persistent browser pool** — 2 warm Chromium instances (proxy + direct), no cold start per request
- **Decodo residential proxy** — `gate.decodo.com:7000` with username/password auth. Bypasses Vercel Security Checkpoint, Cloudflare, and similar bot protection
- **Stealth plugin** — `puppeteer-extra-plugin-stealth` evades basic headless detection
- **SSRF protection** — blocks private/internal IPs and non-HTTP protocols
- **Concurrency limit** — max 3 concurrent screenshots
- **Page render strategy** — `domcontentloaded` + 2.5s settle delay (faster than `networkidle2`)
- **Request interception** — blocks non-visual resources to save proxy bandwidth: analytics (GA, GTM, Segment, Mixpanel, Amplitude, Heap, Clarity, FullStory, Hotjar), tracking pixels (Facebook), error monitoring (Sentry, Bugsnag), chat widgets (Intercom, Crisp), ads, embedded video, media/websocket/eventsource resource types. Fonts, CSS, images, and documents pass through.

### Endpoints
- `GET /screenshot?url=<url>&proxy=<true|false>` — capture screenshot, returns JPEG binary
- `GET /health` — health check
- `GET /reddit-proxy?sub=<subreddit>` — Reddit JSON proxy (shared with Boost)

### Performance
- Simple sites: ~5s
- JS-heavy / bot-protected sites: ~10-12s
- Browser warm-up eliminates ~5s cold start per request

### Credentials (in .env.local)
- `SCREENSHOT_SERVICE_URL=http://45.63.3.155:3333`
- `SCREENSHOT_API_KEY` — x-api-key header for auth
- Decodo proxy creds hardcoded in service (username: `spnouemsou`)
- Vultr SSH: root / `5xP[83JSF}FsPsiZ`

## Supabase

**Project:** `drift` (ID: `hquufdmuyzetlfhhljcr`, region: us-west-2)
*Note: Supabase project name remains `drift` — this is an external resource ID, not user-facing.*

### Schema (Phase 1A)
```sql
analyses (
  id uuid PK default gen_random_uuid(),
  url text NOT NULL,
  email text,
  screenshot_url text,
  output text,                    -- formatted markdown report
  structured_output jsonb,        -- { overallScore, categories[], summary, topActions[] }
  status text NOT NULL DEFAULT 'pending',  -- pending | processing | complete | failed
  error_message text,
  created_at timestamptz DEFAULT now()
)
```

### Storage
- `screenshots` bucket (public) — stores `analyses/{id}.jpg`

### RLS
- Public read on `analyses` (no auth in Phase 1A)
- Service role for insert/update
- Public read on screenshots bucket

## LLM Layer

**Current (Phase 1A):** Single Sonnet call with vision input. Screenshot as base64 image + system prompt requesting structured JSON output.

**Pipeline interface** (`lib/ai/pipeline.ts`): `runAnalysisPipeline(screenshotBase64, url)` returns `{ output, structured }`. Implementation behind this interface is swappable — the API route doesn't care if it's 1 call or 3.

### Structured output schema
```typescript
{
  overallScore: number,        // 1-100
  categories: [{
    name: string,              // e.g. "Messaging & Copy"
    score: number,             // 1-100
    findings: [{
      type: "strength" | "issue" | "suggestion",
      title: string,
      detail: string           // specific to this page
    }]
  }],
  summary: string,             // 2-3 sentence executive summary
  topActions: string[]         // top 3 most impactful changes
}
```

### Categories evaluated
1. Messaging & Copy
2. Call to Action
3. Trust & Social Proof
4. Visual Hierarchy
5. Design Quality
6. Mobile Readiness

### Planned evaluation (Step 4b)
Test against ~10 URLs, compare quality + cost:
- **A**: 1 Sonnet call (current)
- **B**: 2 specialized agents → orchestrator
- **C**: 1 Sonnet + Haiku formatter
- **D**: Non-Anthropic (Gemini 2.5 Pro, GPT-4o)

## Inngest

**Client ID:** `loupe`
**Dev server:** Uses existing Inngest dev server on port 8288 (shared with Boost)
**Registration:** Sync app URL `http://localhost:3002/api/inngest` in Inngest dashboard

### Functions
- `analyze-url` — triggered by `analysis/created` event, retries: 2 (3 total attempts)

## File Structure
```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── analysis/[id]/page.tsx      # Results page
│   ├── api/
│   │   ├── analyze/route.ts        # POST: create analysis
│   │   ├── analysis/[id]/route.ts  # GET: poll results
│   │   └── inngest/route.ts        # Inngest serve
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client (anon key)
│   │   └── server.ts               # Service role client
│   ├── screenshot.ts               # Vultr service client + Supabase upload
│   ├── ai/
│   │   └── pipeline.ts             # LLM analysis (Sonnet vision)
│   └── inngest/
│       ├── client.ts               # Inngest client
│       └── functions.ts            # analysis/created handler
```

## Dev Setup

```bash
npm run dev                    # Next.js on port 3002
# Inngest: sync http://localhost:3002/api/inngest in existing dev server at :8288
```

## Key Technical Challenges

1. **Bot protection on screenshots** — SOLVED with Decodo residential proxy ($4/mo for 2GB). Stealth plugin + residential IP bypasses Vercel/Cloudflare.
2. **Screenshot speed** — MITIGATED with persistent browser pool + domcontentloaded strategy. 5-12s range.
3. **LLM JSON parsing** — Sonnet sometimes wraps JSON in markdown code blocks. Pipeline extracts with regex fallback.
4. **Total pipeline latency** — Screenshot (5-12s) + LLM (15-30s) = 20-40s total. Acceptable for async background job with polling UI.

## Cost Estimates Per Analysis

| Component | Cost |
|-----------|------|
| Screenshot (proxy bandwidth) | ~$0.0002 (100KB × $2/GB) |
| Supabase storage | negligible |
| Sonnet vision call | ~$0.03-0.08 |
| **Total per analysis** | **~$0.03-0.08** |

## Cost Estimates Per User

| Tier | Monthly cost to serve |
|------|---------------------|
| Free (1 page, weekly) | ~$0.15-0.30 |
| Pro (10 pages, weekly + on-demand) | ~$3-5 |

Pro at $19/mo = healthy margins.
