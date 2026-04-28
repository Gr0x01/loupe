# Loupe Sunset — April 2026

Status: shut down 2026-04-28/29. Code archived in this repo. Data dumped to `~/Documents/coding_projects/loupe-archive/loupe-final-2026-04-28.dump`. Supabase project deleted. Vultr screenshot service destroyed (snapshot retained: `798b7f81-d11a-4044-a342-0b1f87ad2d43`).

## What the data said

PostHog, last 90 days:

- 7 `signup_completed` events, 14 `page_claimed`, 18 `profiles` rows in DB.
- WAU: 188 (mid-Feb post-launch peak) → 15 (last week before sunset). ~92% drop.
- New audit starters by week: 19 → 26 → 4 → 1 → 2 → 1 → 1 → 1.
- Last 30d: 3 unique users started a new audit; only 1–2 of the "heavy" users were real (the rest were single-session evaluators bouncing in <12 min).
- 0 paying subscriptions. 0 trial conversions.

Diagnosis: not a marketing-fatigue problem; a distribution-model problem. There was no reason for new users to arrive after the launch wave, and no retention loop to keep evaluators around long enough to convert.

## Why we shut down rather than pushed harder

- Recurring infra cost was real (~$45/mo: Vultr $20, Supabase Pro $25, plus LLM API spend on crons).
- Fixing acquisition would be a re-pivot, not a campaign — different ICP, different distribution surface (e.g., free public tool with viral hook → upgrade) — which is a bigger swing than continuing to iterate on Loupe-as-built.
- Better project opportunities elsewhere on the docket. Sunk-cost fallacy avoided.

## What was built (worth harvesting if reviving any change-intelligence direction)

| Capability | File | Why it's interesting |
|---|---|---|
| 3-tier LLM JSON extraction | `src/lib/ai/pipeline-utils.ts` (`extractJson`) | Robust against the usual LLM JSON failure modes; portable to any project hitting the same problem |
| Multi-horizon checkpoint engine | `src/lib/analytics/checkpoints.ts` | D+7/14/30/60/90 horizons with status-machine transitions including a terminal `superseded` state. Pattern transfers to any "track outcome over multiple windows" use case |
| LLM-as-analyst with deterministic fallback | `src/lib/ai/checkpoint-assessment.ts`, `src/lib/ai/pipeline.ts` | Calls LLM for nuanced judgment but degrades gracefully to a deterministic path when the LLM fails. Worth re-using anywhere we want LLM-quality with no SLA risk |
| Canonical state composer (fail-closed) | `src/lib/analysis/progress.ts` | Pattern: derive UI state from a single canonical source, never let LLM hallucination leak into user-visible state |
| Inngest cron + Vercel cron belt-and-suspenders | (sunset removed both) | Lesson: Inngest crons are unreliable on their own; production critical paths need a backup trigger |
| Reconciliation as non-fatal | `src/lib/analytics/reconciliation.ts` | Pattern: enrichment passes should never fail the primary write path |

## Research corpus on disk

The pg_dump preserves what the engine actually produced in production:

- 1,244 analyses (real scans across 12 pages, 18 profiles)
- 117 change_checkpoints (LLM-as-analyst calibration — judgments + later outcomes, the rarest data here)
- 157 detected_changes
- 662 analytics_snapshots (GA4/PostHog correlation pulls)
- 26 change_lifecycle_events (supersession + reconciliation evidence)

If revisiting any change-intelligence direction, replay this corpus against new approaches before regenerating from scratch.

## What I'd do differently if reviving

1. **Distribution before product.** Don't build the canonical-state engine first; build the free public hook first (something shareable, indexable, viral) and bolt the engine on as the upgrade path.
2. **Compute economics from day one.** A $20/mo always-on Puppeteer VPS is fine for a working product, dead weight for an unproven one. Browserless / `@sparticuz/chromium` on serverless is the right starting point at low/spiky volume.
3. **One anchor metric.** Loupe had pages, claims, audits, checkpoints, outcomes — all instrumented. None told a single clear retention story. Pick one ("did the user come back to look at a checkpoint after we sent them an email?") and let everything else inform that.
4. **Don't ship 7 RFC phases before validating with paying users.** RFC-0001's full 7 phases shipped before we had any paying signal. The engine is impressive; the reason no one paid wasn't engine quality.

## Sunset checklist (what was done)

- [x] Vultr screenshot-service destroyed; snapshot `798b7f81…` retained
- [x] Code archive at `memory-bank/projects/screenshot-service-archive/`
- [x] `vercel.json` cron schedules removed
- [x] Inngest cron triggers replaced with `sunset.disabled` sentinel events
- [x] Inngest SDK bumped 3.50.0 → 3.54.1 (CVE-2026-42047 unblocked deploy)
- [x] Vercel deploy of sunset code (`2c9e812`)
- [x] `PUT /api/inngest` re-sync (registrations now reflect cron-less code)
- [x] Stripe: confirmed 0 active subs / trials
- [x] pg_dump → `~/Documents/coding_projects/loupe-archive/loupe-final-2026-04-28.dump`
- [x] Supabase project deleted (Pro tier, ~$25/mo recovered)
- [x] Public site scrubbed (2026-04-29): `src/app/page.tsx` → static shutdown notice; `SiteNav` + `SiteFooter` removed from `layout.tsx` (killed dead links + client Supabase calls); metadata + JSON-LD replaced with shutdown copy and `robots: noindex,nofollow`
- [ ] GitHub App: deactivate webhooks / uninstall (pending)
- [ ] Inngest dashboard: delete Loupe app (optional, schedules already cron-less)
- [ ] `src/app/robots.ts` still allows crawling — flip to disallow if you want belt-and-suspenders with the noindex meta

Recurring monthly cost recovered: ~$45 ($20 Vultr + $25 Supabase Pro) plus Anthropic API spend from cron-driven analyses.
