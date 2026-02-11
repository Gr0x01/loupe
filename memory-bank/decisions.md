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

## D4: Core product is the GitHub + PostHog + Loupe loop (Feb 3, 2026, updated)

**Decision**: Loupe connects three data sources: GitHub (what changed), PostHog (what happened to metrics), and Loupe screenshots/audits (what the page looks like). The product tells you which change caused which metric movement. Free audit is the lead magnet; the paid product is the full loop.

**Previous (Feb 2)**: "MVP is monitoring + audits, deploy tracking is v2." Revised because weekly monitoring is too slow for activation. Re-scan with structured tracking delivers value in minutes, and the GitHub + PostHog integration is the actual product, not a power-up.

**Why**:
- Solo devs make dozens of changes and never know what moved the needle
- Weekly monitoring emails are a bad activation mechanic — users forget in a week
- Re-scan after making a change gives immediate value (minutes, not days)
- GitHub webhook + PostHog API are both free — no cost barrier for the target audience
- "Like Facebook Ad suggestions for your landing page" is a stronger pitch than "we'll email you when something changes"

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

## D12: Gemini Flash for comparison pipeline (Feb 3, 2026)

**Decision**: Use Gemini 2.0 Flash (text-only) for the Pass 2 comparison between scans. Main audit stays on Gemini 3 Pro (vision).

**Why**:
- Comparison is text-only (structured JSON in, structured JSON out) — no vision needed
- ~$0.002 per comparison vs ~$0.03 for the main audit
- Total re-scan cost: ~$0.035 (main audit + comparison)
- Fast enough that comparison adds negligible latency

## D13: Methodology grounding in audit prompt (Feb 3, 2026)

**Decision**: Ground each audit category in specific marketing/design frameworks (PAS, Fogg Behavior Model, Cialdini, Gestalt, Gutenberg/F-pattern, search intent matching). Add `methodology` and `element` fields to each finding.

**Why**:
- Makes re-scan comparison more precise: "Does this element now satisfy the PAS framework?"
- `element` field enables matching findings across scans: "the hero headline" can be tracked
- Methodology references make findings more credible and educational for the user
- Backward compatible — existing analyses without these fields still render fine

## D14: Rename from Driftwatch to Loupe (Feb 2, 2026)

> Note: Originally numbered D12 before D12-D13 were added above.

**Decision**: Rename product from "Driftwatch" to "Loupe" (domain: getloupe.io).

**Why**:
- "Driftwatch" was too narrowly focused on the "drift" concept — product scope includes monitoring, analysis, auditing, and eventually A/B testing
- "Loupe" (a small magnifying lens for inspecting detail) better represents the core value: looking closely at your pages
- Shorter, more memorable, works as both noun and verb ("loupe your pages")
- Supabase project name (`drift`) left as-is — it's an internal resource ID, not user-facing
- Inngest client ID updated to `loupe`

## D15: Launch strategy — Founding 50, skip billing (Feb 3, 2026)

**Decision**: Skip Stripe/billing for launch. Ship free for first 50 users ("Founding 50"), then waitlist. Use constraints to force conversations and learn pricing.

**Founding 50 get**:
- 1 page to monitor
- Daily scans (the good stuff)
- Share to unlock +1 page (instant credit, honor system)

**After 50**:
- Waitlist
- Or weekly scans if we open it up later

**Free audit stays open** — no signup required, acquisition engine keeps running even when Founding 50 is full.

**Why**:
- Ship faster — billing has edge cases that delay launch
- Remove friction — no credit card = more signups = more learning
- Customer development — ask 50 real users "what would you pay?" beats guessing
- Funnel reality: 50 signups → 25 try it → 10 come back → 5 rely on it. Those 5 are the signal.
- Daily scans for Founding 50 makes them feel special without manual upgrades
- 1 page forces the core habit; asking for more = upgrade signal

**Cost analysis**:
- Gemini Pro: ~$0.01/scan
- Daily scans for 50 users × 1 page: ~$15/mo
- LLM cost is a rounding error — Vultr box is more expensive than AI

**When to add billing**: When we have users begging for more and evidence of what they'd pay.

## D16: Supersede D6 pricing for now (Feb 3, 2026)

**Decision**: D6 ($19/mo Pro tier) is deferred. D15 launch strategy takes precedence. Pricing will be determined after talking to early users.

**Candidates**: $9, $15, $19, or $30/mo — will learn from first 50 users which segment we're actually serving.

## D17: PostHog integration — Pull & Store (Feb 3, 2026)

**Decision**: Option A — Pull metrics at scan time, store in `analyses.metrics_snapshot`. Display alongside audit results.

**What we built**:
- User connects PostHog via API key + Project ID in `/settings/integrations`
- Credentials validated via HogQL test query before storing
- Each scan fetches pageviews, unique visitors, bounce rate (last 7 days)
- Metrics displayed in analysis results header
- No LLM correlation for MVP — just display the data

**Why Option A over B/C**:
- Simpler to ship — no LLM tool calling complexity
- Rate limit safe — one query per scan, not multiple per LLM turn
- Users see value immediately ("here are your metrics") without waiting for AI interpretation
- LLM correlation can be added later as a post-analysis pass if users want it

**Security considerations**:
- API keys stored in `integrations.access_token` (same as GitHub)
- HogQL queries sanitized to prevent injection (domain escaped)
- Host whitelist prevents SSRF (only us.i.posthog.com, eu.i.posthog.com, app.posthog.com)
- 15s request timeout prevents hanging

## D18: Domain claiming — First-come-first-served for now (Feb 4, 2026)

**Decision**: One account owns a domain. If User A claims `example.com`, User B cannot claim it. Show "already being monitored" message.

**Why**:
- Simple to implement and reason about
- Creates ownership feeling ("my page")
- Prevents confusing duplicate monitoring states

**Future considerations**:
- Track claiming patterns by email domain (are most claimers `*@theirdomain.com`?)
- If pattern holds → enforce email-domain matching (only `*@example.com` can claim `example.com`)
- If we hit ~5000 users and squatting becomes a problem → add domain verification (DNS TXT or meta tag)
- For now, observe and ship simple

**Not building yet**: The blocking logic. Currently anyone can claim any domain. Will implement the check when we have evidence it's needed or when abuse appears.

## D19: GitHub Integration Security (Feb 4, 2026)

**Decision**: Implemented targeted security fixes for GitHub webhook/repo connection.

**What we fixed**:
1. **Path manipulation** (Critical): Validate `fullName` format with regex (`^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$`) before using in GitHub API URLs
2. **Token revocation handling** (Medium): Detect 401 responses and return clear "token expired, please reconnect" message
3. **Duplicate webhooks** (Medium): Unique constraint on `deploys(repo_id, commit_sha)` + graceful handling (return 200, log, ignore)

**What we accepted for MVP**:
- **Signature verification after DB lookup**: Per-repo secrets provide isolation; global secret would break existing webhooks; DB query is fast (indexed)
- **Plain text token storage**: Common OAuth practice; DB connection encrypted; key management adds complexity
- **Pages not linked to repos**: Known limitation documented in current.md

**Why these tradeoffs**:
- Solo dev MVP — security fixes should address real attack vectors, not theoretical enterprise concerns
- Per-repo webhook secrets already provide good isolation (attacker needs both repo access AND webhook secret)
- Token encryption adds complexity without meaningfully improving security (attacker with DB access has bigger problems)

## D20: Unified post-analysis pipeline (Feb 4, 2026)

**Decision**: Merge comparison and analytics correlation into a single Gemini 3 Pro call with LLM tools, instead of separate passes.

**Why**:
- Comparison needs full context to evaluate change quality ("did the fix actually help?")
- Flash can do yes/no but Pro can assess nuance ("words shuffled but message unclear")
- Single smart call is simpler than orchestrating multiple passes
- Tools are optional — pipeline runs without analytics, adds tools when credentials exist

## D21: Vision pivot — Predictions not grades (Feb 2026)

**Decision**: Reposition from "website grader with scores" to "correlation layer with predictions." Remove scores entirely from UI. Every finding predicts impact, Chronicle tracks what actually happened.

**Why**:
- Scores are vanity metrics — users want to know "did my change help?"
- Predictions are actionable — "expected +8-15% conversion" beats "score: 72"
- Chronicle format (N+1 scans) creates ongoing value vs one-time audit
- Differentiates from competitors (Hotjar, VisualPing) who don't correlate

**What changed**:
- Removed score display from all UI (dashboard, results, emails)
- Deleted leaderboard feature (no scores = no ranking)
- New types: Finding with Prediction, ChangesSummary with Correlation
- Brand voice: "observant analyst" with emotional register (Ouch/Aha/Huh)

## D22: Context-aware email templates (Feb 2026)

**Decision**: Replace generic "scan complete" emails with context-aware templates based on what the scan found. Four templates: changeDetected, allQuiet, correlationUnlocked, weeklyDigest.

**Why**:
- Generic "your scan is ready" wastes user attention
- Subject line should convey the finding: "Your headline change helped" vs "Scan complete"
- All-quiet emails reduce anxiety ("nothing broke")
- Correlation unlock is a celebration moment worth a dedicated email
- Weekly digest for power users (3+ pages) reduces email fatigue

**What we removed**:
- `scanCompleteEmail` and `deployScanCompleteEmail` — no fallback needed
- Scheduled/deploy scans always have `changes_summary` from post-analysis pipeline

**Email selection**:
1. Skip if manual trigger
2. Skip if email_notifications disabled
3. Changes detected → changeDetectedEmail (dynamic subject based on correlation)
4. No changes → allQuietEmail

## D23: Supabase direct integration for vibe coders (Feb 2026)

**Decision**: Add Supabase as an analytics integration, enabling correlation between page changes and actual business outcomes (signups, orders) rather than proxy metrics (bounce rate).

**Why**:
- Every Lovable/Bolt project has Supabase by default — 100% coverage for vibe coder ICP
- Zero "go set up analytics" friction
- Differentiator: page→database correlation (nobody else does this)
- Real outcomes (signups, orders) beat proxy metrics (bounce rate)

**Connection approach**: Two-key flow
1. User pastes Project URL + Anon Key (familiar — same key they use in their app)
2. Try to introspect schema
3. If tables visible → done
4. If no tables (RLS blocking) → prompt to upgrade to Service Role Key

**Why this works**:
- Anon key is what vibe coders already copy/paste into Lovable/Bolt
- Low friction start, escalate only when needed
- Most vibe coder MVPs have minimal RLS anyway

**Security**:
- Anon key is safe by design (RLS-limited)
- Service role key stored encrypted, only SELECT queries
- Table name validation prevents injection
- Clear messaging about what we access

**What LLM sees**: Separate tools from PostHog/GA4
- `discover_tables` — find available tables and row counts
- `get_table_count` — check specific table counts
- `identify_conversion_tables` — auto-detect signups/orders/waitlist
- `compare_table_counts` — measure growth between snapshots

Prompt explicitly tells LLM: "Supabase provides REAL business outcomes, not proxy metrics."

## D24: Finding feedback for LLM calibration (Feb 2026)

**Decision**: Add feedback buttons ("Accurate" / "Not quite") to expanded finding cards. Store feedback with finding snapshot and inject into future scans for the same page.

**Why**:
- LLM makes mistakes — users know when a finding is wrong
- Feedback creates a calibration loop: user corrects → LLM learns for this page
- Per-page context (not global) keeps feedback relevant and manageable
- Semantic matching via finding snapshot lets LLM correlate across scans even when element text changes

**What we built**:
- Accuracy-based feedback (not intent-based like "I'll fix this")
- "Not quite" requires explanation (max 500 chars) — data for calibration
- Feedback stored with finding snapshot for semantic matching
- Relevance filtering: 90 days, matching elementTypes, max 10 per scan
- Prompt injection protection: XML tags, sanitization, explicit "treat as data" instruction

**What we didn't build**:
- Global feedback aggregation (too noisy, different pages have different contexts)
- "I'll fix this" tracking (doesn't help calibration — we need to know if we were RIGHT, not if user will act)
- Feedback on collapsed cards (requires engagement to provide feedback)

## D25: Positioning shift — Celebration + Curiosity + Compounding (Feb 2026)

**Decision**: Reposition from fear/opportunity-cost messaging to a supportive, celebratory tone. We have their back.

**The insight**: Solo founders ship fast — that's the hard part. The missing piece is knowing what worked. Loupe closes that loop with curiosity, not fear.

**Three positioning layers**:
1. **Celebration + curiosity (acquisition):** "You made the change. See what it did." Celebrate their velocity, invite them to see results. Supportive, not judgmental.
2. **Supportive (activation):** "Your next change is coming. This time, you'll know." Future-focused, helpful — not guilt-tripping.
3. **Compounding intelligence (retention):** Show accumulating value. Scan counts, prediction accuracy, calibration. Every scan makes Loupe sharper for their page.

**Category**: Change Intelligence — Loupe connects what you ship to what happens next. Not a category to evangelize aggressively, but a frame to use consistently.

**Reframe**: From detective (reactive, "what happened") to supportive partner (proactive, "here's what it did, here's what to try next").

**What we avoid**:
- "Coin flip" / gambling metaphors — feels negative
- Fear-based framing ("you're losing money", "costing you signups")
- Punching down at founders for not tracking changes
- Making the reader feel bad about their current workflow

**Why the shift**:
- Original opportunity-cost framing felt punishing, not supportive
- Our ICP is already doing the hard work (shipping) — we're here to help them see results
- Celebration + curiosity converts better than fear for builders who are proud of their velocity
- Tone should match the product experience: helpful advisor, not judgmental auditor

## D26: Hide founding count until 10+ users (Feb 2026)

**Decision**: Don't display the "X of 50 spots claimed" counter until at least 10 users have signed up. Counter auto-appears once threshold is crossed.

**Why**:
- "2/50 claimed" looks empty, not exclusive
- Low numbers hurt social proof instead of creating urgency
- At 10+, the counter actually works ("38 remaining" feels real)
- Simple threshold check — no messaging changes needed

**Where hidden**:
- Homepage hero progress bar
- Homepage closing section ("X remaining")
- Analysis page claim modals (founding dots)

**What still works**: Waitlist logic (triggers at `isFull`), founding member benefits, page limits — all independent of display threshold.

## D27: Homepage redesign — 4-section "Your" structure (Feb 2026)

**Decision**: Complete homepage rebuild with 4 sections, each framed around "your" — Hero, YourPage, YourResults, UrgencyCloser.

**Structure**:
1. **Hero**: "You made the change. See what it did." + SitePreviewCard animation (headline change → notification → +23%)
2. **YourPage**: Audit preview showing what Loupe sees (headline, findings, predictions)
3. **YourResults**: Feature grid (timeline, verdicts, metrics, compounding history)
4. **UrgencyCloser**: "Your next change is coming. This time, you'll know."

**New components** (`src/components/landing/`):
- `SitePreviewCard.tsx` — Animated hero visual
- `YourPage.tsx` — Two-column audit preview
- `YourResults.tsx` — Feature grid with ChangeTimeline, VerdictCard, MetricsCard, HistoryCard
- `UrgencyCloser.tsx` — Final CTA with trust badges

**Why**:
- Previous homepage explained Loupe's process; new homepage shows outcomes
- "Your page, through Loupe" vs "How it works" — outcome-focused, not mechanism-focused
- Every section uses "your" framing to make examples feel personal
- SitePreviewCard animation demonstrates the value loop in 3 seconds
- Removed old pattern of showing "other people's scenarios" (via Lovable, via Bolt)

**What was removed**:
- Old HowItWorks sections (mechanism-focused)
- ScenarioShowcase (third-party examples)
- Gap section (alone vs with Loupe)
- Hero orbs/decorative elements

See `homepage-story.md` for copy rules and language guidelines.

## D28: Refined Brutalism design system (Feb 2026)

**Decision**: Visual overhaul from "Luminous Glass + Editorial Punch" to "Refined Brutalism" — cool gray SaaS feel with multi-color accent palette.

**Color palette**:
- Paper: `#F8FAFC` (cool gray background)
- Ink: `#0F172A` (text)
- Line: `#9AAABD` (borders)
- Multi-color accents: coral, blue, violet, emerald, amber
- Signal (primary CTA): coral (`#FF6B4A`)

**Surface treatment**:
- `.glass-card`: White bg, 2px solid border, 10px radius, `2px 2px 0` offset shadow
- No blur effects (`backdrop-filter: blur()` removed)
- No gradients on surfaces
- Section colors via accent badges (blue for "Your page", violet for "Your results")

**Why**:
- Previous warm paper (#F7F4EC) felt dated; cool gray is cleaner SaaS
- Multi-color accents allow visual variety without competing with content
- Solid borders (not blurred) are easier to parse and more "honest"
- Offset shadows add depth without complexity
- Clean, confident, precise — matches the tool's personality

**Key files updated**:
- `src/app/globals.css` (all CSS variables and component classes)
- `src/app/hero-bg.css` (removed orbs)
- `.claude/agents/*.md` (ui-designer, frontend-developer, brand-guardian)
- `.claude/skills/frontend-design/SKILL.md`

## D29: Pricing tiers — 4-tier structure (Feb 2026)

**Decision**: Four pricing tiers based on competitor research and margin analysis. Supersedes D6 and D16.

**Tiers**:

| | **Free** | **Starter** | **Pro** | **Business** |
|---|:---:|:---:|:---:|:---:|
| **Price** | $0 | $12/mo | $29/mo | $79/mo |
| **Pages** | 1 | 3 | 10 | 25 |
| **Scans** | Weekly | Daily + Deploy | Daily + Deploy | Daily + Deploy |
| **Integrations** | — | 1 analytics + GitHub | All | All |
| **Alerts** | Email | Email | Email + Slack | Email + Slack |
| **Mobile** | — | — | ✓ | ✓ |
| **Support** | Community | Community | Email | Priority |
| **Team seats** | — | — | — | 3 |

**Page limits**: Total pages across any domains (not per-domain). User with 3-page limit can track 3 pages on one domain, or 1 page each on 3 domains — their choice.

**Competitor research** (Feb 2026):
- VisualPing: Free (5 pages) → $10/mo (25 pages) → $50/mo → $100+/mo
- ChangeTower: Free → $9/mo (500 URLs) → $299/mo enterprise
- Hexometer: $12/mo starting
- UptimeRobot: $10-14/mo

**Margin analysis**:

| Tier | Price | Est. Monthly Cost | Margin |
|------|-------|-------------------|--------|
| Starter | $12 | ~$1.30 | 89% |
| Pro | $29 | ~$5.40 | 81% |
| Business | $79 | ~$18.50 | 77% |

Cost assumptions: $0.06/full scan, $0.01/deploy scan, 4 weekly scans, 20-50 deploys/month.

**Value ladder**:
- Free → Starter: "I want daily scans" or "more pages"
- Starter → Pro: "I need Supabase integration" or "mobile access"
- Pro → Business: "I need my team on this"

**Why these prices**:
- $12 entry: Validated by market (VisualPing $10, ChangeTower $9, Hexometer $12)
- $29 mid-tier: Sweet spot for solo founders ($1-10k MRR)
- $79 business: Room for team features without enterprise complexity
- Mobile as paid differentiator: Low effort, natural upgrade path

**Open for later**:
- Deploy scan caps on Starter (currently unlimited)
- Overage pricing vs hard limits

**Implemented (Feb 11, 2026)**:
- Stripe integration with checkout, portal, webhooks
- Annual discount: 17% off ($120/yr Starter, $290/yr Pro)
- Business tier deferred — launching with Free/Starter/Pro only
- Slack alerts marked as "Coming soon" on Pro tier
- Mobile access gated by viewport check + tier
- Founding 50 users migrated to Starter tier (grandfathered)
