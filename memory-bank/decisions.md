# Loupe — Decisions

## D1: Standalone project, not a Boost feature (Feb 2, 2026)

**Decision**: Build Loupe as a separate product/repo, not inside Boost.

**Why**:
- Different buyer moment — Boost is "tell me what to do," Loupe is "did what I did work?"
- Different workflow — Loupe is developer-tool-adjacent (GitHub integration), Boost is marketer-adjacent
- Can share LLM analysis engine later if both gain traction
- Keeps both codebases focused and simple

## D2: Name — Loupe (Feb 2, 2026, updated)

**Decision**: Product name is Loupe. Domain: getloupe.io. A loupe is a small magnifying lens used to inspect detail — fits the product's role of looking closely at your pages to spot what changed. Broader than the original "Driftwatch" name, which was too narrowly tied to "drift" as a concept. Loupe covers monitoring, analysis, and A/B testing without needing to stretch the metaphor.

**Previous**: Originally named "Driftwatch" — renamed because the scope grew beyond drift detection.

## D3: Reuse Boost's tech patterns (Feb 2, 2026)

**Decision**: Same stack (Next.js, Supabase, Inngest, Stripe) and same dev patterns (agents, skills, memory bank). Reduces context-switching between projects.

## D4: Core product is monitoring + audits, not deploy tracking (Feb 2, 2026)

**Decision**: The MVP is page monitoring + CRO audits + email alerts. Zero setup required — just a URL and email. Deploy tracking and analytics correlation are v2 power-ups.

**Why**:
- Deploy tracking requires GitHub connection + analytics connection = high friction for a "nice to have"
- Monitoring + audits deliver value in 10 seconds with zero integrations
- The audit feature is already proven in Boost
- Catches changes from ALL sources (coding agents, deploys, dependency updates) not just GitHub deploys
- Lower barrier to entry = larger free tier funnel

## D5: Vercel AI SDK for model-agnostic LLM calls (Feb 2, 2026)

**Decision**: Use Vercel AI SDK to abstract LLM provider. Tier models by task: cheap models (Haiku/Gemini Flash) for detection, better models (Sonnet/Opus) for suggestions.

**Why**:
- Swap providers without code changes
- Optimize cost per task (detection is cheap, suggestions are expensive)
- Can evaluate Gemini and other models as they improve
- Avoid vendor lock-in

## D6: Pricing — $19/mo Pro, generous free tier (Feb 2, 2026)

**Decision**: Two tiers. Free (1 page, weekly, basic alerts) and Pro $19/mo (multiple pages, analytics, suggestions). No Team tier at launch.

**Why**:
- Target audience (solo founders) spends $0-100/mo total on analytics tools
- $29-49 is at the upper limit of willingness to pay for this audience
- $19 is below the pain threshold — needs to clearly save time, doesn't need to be a "must have"
- Design Team tier later based on what Pro users actually ask for

## D7: Event-triggered conversion, not time-limited trial (Feb 2, 2026)

**Decision**: Convert free→paid via contextual upgrade prompts at moments of curiosity, not a 7/14-day trial expiration.

**Why**:
- Free weekly emails build habit and stickiness
- Upgrade prompt at "your site just changed, see what it did to metrics" is higher-intent than an arbitrary trial ending
- The "aha moment" for this product depends on a meaningful change happening, not calendar days
- Optional "try Pro for 14 days" button always available as a secondary path

## D8: Page audit as lead magnet / launch feature (Feb 2, 2026)

**Decision**: Ship the free instant page audit first. It's the entry point to the product.

**Why**:
- Already built and proven in Boost — minimal new work
- Zero friction (no signup for first audit)
- Directly demonstrates Loupe's core value (LLM page analysis)
- Proven lead magnet model (HubSpot Website Grader, Woorank, etc.)
- Shareable audit cards drive viral distribution
- Cost is trivial (~$0.05-0.10 per audit)
- Natural upsell: "Track this page automatically"

## D9: Color palette — Dark Tech + Electric Cyan (Feb 2, 2026)

**Decision**: Dark UI with electric cyan (#00D4FF) accent on near-black (#0F1117) background.

**Why**:
- Original coral/warm-white palette was too close to Boost (aboo.st) which already owns that color space
- Dark background communicates tech-forward, developer-tool energy
- Electric cyan accent is distinctive and attention-grabbing without falling into blue-SaaS territory
- Dark card surfaces (#1C1F2E) float naturally on near-black with depth shadows
- Score colors (green/amber/red) read clearly against dark background
- Typography (Instrument Serif + DM Sans) unchanged — the editorial personality carries forward
- Overall feel: bold, confident, precise — fits a tool that inspects your pages closely

## D10: Decodo residential proxy for screenshots (Feb 2, 2026)

**Decision**: Use Decodo (formerly Smartproxy) residential proxy at $4/mo (2GB plan) to bypass bot protection on screenshots. Proxy-first approach — all screenshots go through residential proxy by default.

**Why**:
- Vultr datacenter IP gets blocked by Vercel Security Checkpoint and Cloudflare
- puppeteer-extra stealth plugin alone wasn't enough for Vercel's bot detection
- Residential proxy ($4/mo for 2GB) is cheaper than a managed screenshot API ($17+/mo)
- 2GB is ~20,000+ screenshots at 100KB each — more than enough for MVP
- Proxy-first avoids the 15-20s penalty of trying direct first, detecting block, then retrying
- Can pass `?proxy=false` to skip proxy for known-safe sites if needed

## D11: Single Sonnet call for Phase 1A analysis (Feb 2, 2026)

**Decision**: Start with a single Claude Sonnet call doing the full analysis (marketing + design + suggestions) instead of multi-agent pipeline. Pipeline interface is swappable.

**Why**:
- Simpler to ship and debug
- One call is faster and cheaper than 3 calls + orchestrator
- Sonnet's vision is strong enough for a combined analysis
- The pipeline interface (`runAnalysisPipeline`) abstracts the implementation — can swap to multi-agent later without changing API routes
- Step 4b will evaluate multi-agent vs single-call quality + cost tradeoffs

## D12: Rename from Driftwatch to Loupe (Feb 2, 2026)

**Decision**: Rename product from "Driftwatch" to "Loupe" (domain: getloupe.io).

**Why**:
- "Driftwatch" was too narrowly focused on the "drift" concept — product scope includes monitoring, analysis, auditing, and eventually A/B testing
- "Loupe" (a small magnifying lens for inspecting detail) better represents the core value: looking closely at your pages
- Shorter, more memorable, works as both noun and verb ("loupe your pages")
- Supabase project name (`drift`) left as-is — it's an internal resource ID, not user-facing
- Inngest client ID updated to `loupe`
