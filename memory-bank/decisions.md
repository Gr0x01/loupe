# Loupe — Decisions

> **Purpose**: Capture the "why" behind key choices. Implementation details live in `architecture.md`.

---

## Active Decisions

### D1: Standalone project, not a Boost feature (Feb 2, 2026)

Loupe is a separate product/repo from Boost. Different buyer moment ("did what I did work?" vs "tell me what to do"), different workflow (developer-tool-adjacent vs marketer-adjacent). Can share LLM engine later if both gain traction.

### D2: Name — Loupe (Feb 2, 2026)

Domain: getloupe.io. A loupe is a small magnifying lens for inspecting detail — fits the product's role of looking closely at pages to spot what changed. Broader than the original "Driftwatch" name, which was too narrowly tied to drift detection. Supabase project name (`drift`) left as-is (internal resource ID).

### D7: Event-triggered conversion, not time-limited trial (Feb 2, 2026)

Convert free→paid via contextual upgrade prompts at moments of curiosity, not trial expiration. The "aha moment" depends on a meaningful change happening, not calendar days. Free weekly emails build habit; upgrade prompt at "your site just changed, see what it did to metrics" is higher-intent. 14-day trial exists as a secondary path.

### D8: Page audit as lead magnet (Feb 2, 2026)

Free instant page audit is the entry point — zero friction (no signup), demonstrates core value (LLM page analysis), proven model (HubSpot Website Grader, Woorank). Cost: ~$0.05-0.10 per audit. Natural upsell: "Track this page automatically."

### D9: Color palette — Dark Tech + Electric Cyan (Feb 2, 2026)

Dark UI with electric cyan (#00D4FF) accent on near-black (#0F1117). Previous coral/warm-white was too close to Boost (aboo.st). Dark background communicates tech-forward energy; cyan is distinctive without falling into blue-SaaS territory. Score colors (green/amber/red) read clearly against dark. Typography: Instrument Serif + DM Sans.

### D13: Methodology grounding in audit prompt (Feb 3, 2026)

Each audit category grounded in specific frameworks (PAS, Fogg Behavior Model, Cialdini, Gestalt, Gutenberg/F-pattern, search intent matching). Makes re-scan comparison more precise ("Does this element now satisfy the PAS framework?"), findings more credible, and `element` field enables matching findings across scans.

### D21: Vision pivot — Predictions not grades (Feb 2026)

Repositioned from "website grader with scores" to "correlation layer with predictions." Scores are vanity metrics — users want "did my change help?" Every finding predicts impact; Chronicle tracks what actually happened. Differentiates from competitors (Hotjar, VisualPing) who don't correlate. Removed scores, leaderboard, and grading from all UI.

### D25: Positioning — Celebration + Curiosity + Compounding (Feb 2026)

Three layers: (1) Celebration + curiosity for acquisition ("You made the change. See what it did."), (2) Supportive for activation ("Your next change is coming. This time, you'll know."), (3) Compounding intelligence for retention (scan counts, prediction accuracy). Category: Change Intelligence. Tone: supportive partner, not judgmental auditor. Avoid fear-based framing, gambling metaphors, or punching down at founders.

### D28: Refined Brutalism design system (Feb 2026)

Cool gray SaaS palette with multi-color accents. Paper: `#F8FAFC`, Ink: `#0F172A`, Line: `#9AAABD`, Signal (primary CTA): coral `#FF6B4A`. Surfaces: white bg, 2px solid border, 10px radius, `2px 2px 0` offset shadow. No blur effects, no gradients on surfaces. Previous warm paper (#F7F4EC) felt dated.

### D29: Pricing — Free/Pro($39)/Scale($99) (Feb 2026)

Supersedes D6 ($19/mo) and D16. Three tiers — see `current.md` for full table. Key rationale: original $12/$29 was 2-3x underpriced for unique value (visual monitoring + metric correlation + AI analysis). Killed Starter tier (decision paralysis). $99 Scale anchors $39 Pro via Goldilocks effect. Impact follow-up horizon (30 vs 90 days) is the natural Pro/Scale differentiator. Margins: 62-92% depending on tier and page count. Trial economics: ~$5/non-converting user, break-even at ~18% conversion.

### D44: Unauthenticated Stripe checkout (Feb 17, 2026)

Pricing page buttons required login before payment — broken UX. Now: click button → Stripe Checkout directly (no account needed). Stripe collects the email. Webhook creates Supabase user via `admin.createUser()`, sends branded magic link to sign in. Dual-path: authenticated users get email pre-filled + redirect to billing settings; unauthenticated users get Stripe-collected email + redirect to `/checkout/success`. Subscription metadata patched with `user_id` after user creation; `handleSubscriptionUpdated`/`handleSubscriptionDeleted` fall back to `stripe_subscription_id` lookup if metadata patch failed. Rate limited by IP (10/hr).

### D43: Audit-to-tracking education bridge (Feb 17, 2026)

Users mentally file Loupe as "another site audit tool" — get findings, feel done, bounce. Reframed audit page from "finished report" to "open predictions" using Chronicle visual patterns in empty/future state. Empty checkpoint chips (7d/14d/30d), "Claim→Track" language, outcome-connection loading examples. Category Loupe should own: "Did that change work?" Key principle: the audit should feel like chapter one, not the whole book.

### D45: Login page as activation bridge (Feb 17, 2026)

Users create accounts but never claim pages. Login page was a momentum killer — generic "Sign in to Loupe" with no continuity from the prior step.

**Redesign**: Two-column split layout. Left panel has contextual headline (via `?from=` param) + numbered steps explaining what happens after sign-in (claim a page → daily screenshots → outcome tracking at day 7/14/30). Right panel is the auth card. Domain pill shown when URL context is available (from query params or localStorage).

**Contextual copy**: `?from=audit` (audit findings headline), `?from=pricing` (trial headline), `?from=track` (domain-specific headline). Default: "See what changed. Know if it worked."

**Domain persistence**: `loupe_pending_domain` in localStorage, read by dashboard on mount, added to claim suggestions ("From your signup"). Pending audit TTL extended from 30min to 24h.

**Pricing links**: Both `/login` links in `PricingContent.tsx` now pass `&from=pricing`.

Key files: `src/app/login/page.tsx`, `src/app/dashboard/page.tsx`, `src/components/pricing/PricingContent.tsx`.

### D46: Instant page claim + activation nudge (Feb 17, 2026)

**Problem**: 6/6 external signups saw empty dashboards and churned. Magic link was a prerequisite for page creation — if link opened in different browser, localStorage context lost, user lands on blank dashboard.

**Fix 1 — Instant claim** (`POST /api/auth/claim-link`): Creates user via `admin.createUser()` + claims page + sets trial immediately on email submit. No magic link click required. Email becomes "sign in to your dashboard" (not "click to claim"). Same pattern as D44 unauthenticated Stripe checkout. PostHog events: `signup_completed` (method: `instant_claim`), `page_claimed`, `page_tracked`.

**Fix 2 — Auto-claim at auth** (`handleEmailAutoClaim` in auth callback): If user has 0 pages and unclaimed analysis matches their email, creates page on sign-in. Covers Google OAuth / separate magic link signups.

**Fix 3 — Nudge email** (`onboardingNudge` Inngest cron, 1pm UTC): Users 4–48h old with no pages get `activationNudgeEmail` or `genericSetupEmail`. Idempotency: `profiles.onboarding_nudge_sent_at`.

**Auth callback simplified**: `handleClaim()` is now redirect-only (looks up existing page, redirects to `/pages/:id`). Page creation removed since it happens in claim-link route.

**PostHog fixes**: `user_signed_up` → `signup_completed`, `is_internal` person property for test filtering, `ServerEvent` type union for compile-time safety, `page_claimed` split into client `page_claim_attempted` + server `page_claimed`.

### D47: Change magnitude classification & reconciliation (Feb 17, 2026)

**Problem**: Over-granular change detection — a single pricing page redesign generated 47 "watching" `detected_changes` records. Noise drowns signal, breaks the value loop ("47 things changed" vs "your pricing page got an overhaul").

**Solution**: LLM reconciliation pass (Haiku 4.5, ~$0.001/call) classifies changes as incremental (1-4) or overhaul (5+). Overhauls consolidate into 1-2 aggregate records with `scope: "page"`, superseding fine-grained originals via `status: "superseded"` + `superseded_by` FK. Both analyze.ts and deploy.ts run reconciliation when raw changes + watching changes exist.

**Key design choices**:
- `superseded` is terminal (like `reverted`) — checkpoints skip it
- Non-fatal: reconciliation failure falls back to legacy fingerprint upsert
- Skip guard: deploy-overhaul → full analysis → checks for existing overhaul records before re-reconciling
- All LLM-proposed IDs validated against sent candidate set (hallucination guard)
- Supabase `{ error }` checked on all write paths with Sentry reporting

See `current.md` Reconciliation section for details.

---

## Implemented & Documented Elsewhere

Decisions below are fully implemented. See `architecture.md` for details.

| ID | Summary | See |
|----|---------|-----|
| D3 | Same stack as Boost (Next.js, Supabase, Inngest, Stripe) | `README.md` |
| D4 | Core product = GitHub + Analytics + Loupe correlation loop | `README.md` |
| D5 | Vercel AI SDK for model-agnostic LLM calls | `architecture.md` LLM Layer |
| D10 | Decodo residential proxy for screenshots ($4/mo) | `architecture.md` Screenshot Service |
| D11 | Single LLM call for analysis (swappable pipeline interface) | `architecture.md` Pipeline |
| D12 | Gemini Flash for comparison, Pro for main audit | `architecture.md` Pipeline |
| D17 | PostHog integration — pull & store at scan time | `architecture.md` PostHog |
| D18 | Domain claiming — first-come-first-served | Coexists with D34 |
| D19 | GitHub webhook security (path validation, dedup, token handling) | `architecture.md` Security |
| D20 | Unified post-analysis pipeline (comparison + correlation in one call) | `architecture.md` LLM Layer |
| D22 | Context-aware email templates (4 types based on scan results) | `architecture.md` Email |
| D23 | Supabase direct integration for vibe coders | `architecture.md` Supabase Integration |
| D24 | Finding feedback for LLM calibration | `architecture.md` Finding Feedback |
| D27 | Homepage 4-section "Your" structure | `current.md` Homepage |
| D30 | `extractJson()` 3-tier fallback + cron idempotency | `architecture.md` LLM JSON Parsing |
| D31 | Anti-hallucination guardrails (temporal + prompt + enforcement) | `architecture.md` Anti-Hallucination |
| D32 | Cap screenshot height to 7500px before vision API | `architecture.md` Screenshot Service |
| D33 | Intent capture — metric focus, hypotheses, observations | `architecture.md` LLM Layer |
| D34 | Single domain per account (`profiles.account_domain`) | `architecture.md` Schema |
| D35 | Multi-layer fix for false mobile findings | `architecture.md` Screenshot Service |
| D36 | RFC-0001: Multi-horizon checkpoints (all 7 phases shipped) | `architecture.md` RFC-0001 |
| D37 | Fingerprint matching — LLM-proposed, deterministically validated | `architecture.md` Deploy Scanning |
| D38 | LLM-as-analyst for checkpoint assessment | `architecture.md` RFC-0001 |
| D39 | Outcome feedback for LLM calibration | `architecture.md` RFC-0001 |
| D40 | Attribution language — confidence bands with null fallthrough | `current.md` RFC-0001 |
| D41 | Daily backup cron — always run per-page, never early-exit | `current.md` Cron & Reliability |
| D42 | Respect page-level scan frequency alongside tier | `current.md` Cron & Reliability |

---

## Removed

| ID | What | Why removed |
|----|------|-------------|
| D15 | Founding 50 launch strategy | Fully removed from codebase (Feb 14, 2026). Replaced by Stripe billing. |
| D16 | Defer D6 pricing for Founding 50 | Superseded by D29. |
| D26 | Hide founding count until 10+ users | Removed with Founding 50 code. |
