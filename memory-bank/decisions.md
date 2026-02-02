# Driftwatch — Decisions

## D1: Standalone project, not a Boost feature (Feb 2, 2026)

**Decision**: Build Driftwatch as a separate product/repo, not inside Boost.

**Why**:
- Different buyer moment — Boost is "tell me what to do," Driftwatch is "did what I did work?"
- Different workflow — Driftwatch is developer-tool-adjacent (GitHub integration), Boost is marketer-adjacent
- Can share LLM analysis engine later if both gain traction
- Keeps both codebases focused and simple

## D2: Name — Driftwatch (Feb 2, 2026)

**Decision**: Product name is Driftwatch. "Drift" as in visual/content/metric drift. Implies vigilance.

## D3: Reuse Boost's tech patterns (Feb 2, 2026)

**Decision**: Same stack (Next.js, Supabase, Inngest, Stripe) and same dev patterns (agents, skills, memory bank). Reduces context-switching between projects.

## D4: Core product is monitoring + audits, not deploy tracking (Feb 2, 2026)

**Decision**: The MVP is page monitoring + CRO audits + email alerts. Zero setup required — just a URL and email. Deploy tracking and analytics correlation are v2 power-ups.

**Why**:
- Deploy tracking requires GitHub connection + analytics connection = high friction for a "nice to have"
- Monitoring + audits deliver value in 10 seconds with zero integrations
- The audit feature is already proven in Boost
- Catches drift from ALL sources (coding agents, deploys, dependency updates) not just GitHub deploys
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
- Directly demonstrates Driftwatch's core value (LLM page analysis)
- Proven lead magnet model (HubSpot Website Grader, Woorank, etc.)
- Shareable audit cards drive viral distribution
- Cost is trivial (~$0.05-0.10 per audit)
- Natural upsell: "Track this page automatically"
