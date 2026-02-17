# Emails

## Infrastructure

- **Provider**: Resend | From: `Loupe <team@getloupe.io>` | Env: `RESEND_API_KEY`
- **Utility**: `src/lib/email/resend.ts` — `sendEmail({ to, subject, html })`, fire-and-forget (errors logged, not thrown)
- **Templates**: `src/lib/email/templates.ts` — all use `emailWrapper()` for branded layout
- **Direct sends**: `claimPageEmail` and `welcomeSubscriberEmail` call `resend.emails.send()` directly (need delivery confirmation)
- **Gate**: Notification emails check `profiles.email_notifications = true`. Transactional emails (claim, welcome subscriber) bypass this.
- **Supabase auth**: Custom HTML templates in `supabase/templates/`, sent by Supabase (not our code)

## Resend Emails (8 templates)

| # | Template | Subject | Trigger | Gate | Pattern |
|---|----------|---------|---------|------|---------|
| 1 | `changeDetectedEmail` | `"{domain} changed"` or `"Your {element} change helped/may need attention"` | Deploy quick-diff or full-analysis fallback finds changes | `email_notifications` | fire-and-forget |
| 2 | `allQuietEmail` | `"All quiet on {domain}"` | Full-analysis deploy fallback, no changes | `email_notifications` | fire-and-forget |
| 3 | `correlationUnlockedEmail` | `"Your {element} change helped"` | Checkpoint cron or post-analysis: watching->validated | `email_notifications` | fire-and-forget |
| 4 | `dailyDigestEmail` | `"{domain} changed"` (1 page) / `"{N} of {total} pages changed"` (multi) | Digest cron 11:00 UTC, >=1 page changed | `email_notifications` | fire-and-forget |
| 5 | `claimPageEmail` | `"Your page is being tracked"` | `POST /api/auth/claim-link` | none (transactional) | blocking (awaited) |
| 6 | `welcomeSubscriberEmail` | `"Welcome to Loupe Pro/Scale"` | Stripe `checkout.session.completed`, unauth checkout only | none (transactional) | non-fatal try/catch |
| 7 | `activationNudgeEmail` | `"Your {domain} audit is waiting"` | `onboardingNudge` cron 13:00 UTC | `email_notifications` | fire-and-forget |
| 8 | `genericSetupEmail` | `"One step left to start tracking"` | Same nudge cron, no matching unclaimed analysis | `email_notifications` | fire-and-forget |

### Template Details

**1. changeDetectedEmail** — `deploy.ts` (quick-diff path), `analyze.ts` (deploy fallback)
- Data: primary change before/after, additional count, optional correlation metrics, optional deploy SHA+message, optional top suggestion, optional hypothesis prompt link

**2. allQuietEmail** — `analyze.ts` (deploy fallback only)
- Data: domain, last change date, optional top suggestion
- NOT sent for daily/weekly scans (those use digest; all-stable daily = no email)

**3. correlationUnlockedEmail** — `checkpoints.ts` (10:30 UTC cron), `analyze.ts` (post-analysis)
- Data: change before/after + date, metric name + percentage + direction, confidence-banded attribution via `formatOutcomeText()`, optional next suggestion
- CTA deep-links: `dashboard?win={changeId}`

**4. dailyDigestEmail** — `scheduled.ts` (`dailyScanDigest`)
- Looks back 3h for completed daily/weekly analyses, grouped by user
- All-stable = no email sent

**5. claimPageEmail** — `src/app/api/auth/claim-link/route.ts`
- Uses `resend.emails.send()` directly, returns `{ emailSent: false }` on failure
- Magic link -> `/auth/callback?claim={analysisId}`
- Page already created by claim-link route before email sends

**6. welcomeSubscriberEmail** — `src/app/api/billing/webhook/route.ts`
- Uses `resend.emails.send()` directly
- Magic link -> `/auth/callback?next=/dashboard`

**7. activationNudgeEmail** — `scheduled.ts` (`onboardingNudge`)
- Condition: signed up 4-48h ago, 0 pages, nudge not yet sent, matching unclaimed analysis exists
- Idempotency: `profiles.onboarding_nudge_sent_at` (set in `finally`)
- Magic link -> `/auth/callback?claim={analysisId}` (auto-claims)
- Secondary link: view audit results without claiming

**8. genericSetupEmail** — same `onboardingNudge` cron, no matching unclaimed analysis
- Same idempotency column as activationNudgeEmail
- Magic link -> `/auth/callback?next=/dashboard`

**Magic link pattern (5, 6, 7)**: `admin.generateLink()` server-side (creates token without triggering Supabase's magic-link template), embedded in Resend email.

## Supabase Auth Emails (4 templates)

Sent by Supabase auth system, not our code. Templates in `supabase/templates/`.

| Template | Subject | Trigger |
|----------|---------|---------|
| `magic-link.html` | Sign in to Loupe | `/login` magic link request |
| `confirmation.html` | Welcome to Loupe | Standard email signup |
| `recovery.html` | Reset your password | Password reset |
| `email-change.html` | Confirm your new email | Email address change |

## Cron Schedule

| UTC | Job | Possible Emails |
|-----|-----|-----------------|
| 9:00 | Daily/weekly scans start | -- |
| 10:30 | Checkpoint cron | `correlationUnlockedEmail` |
| 11:00 | Digest cron | `dailyDigestEmail` |
| 13:00 | Onboarding nudge | `activationNudgeEmail` or `genericSetupEmail` |

### Event-Driven Emails

| Event | Email |
|-------|-------|
| Deploy detected | `changeDetectedEmail` or `allQuietEmail` |
| User claims page | `claimPageEmail` |
| Stripe checkout (unauth) | `welcomeSubscriberEmail` |

## Key Files

| File | Role |
|------|------|
| `src/lib/email/resend.ts` | `sendEmail()` utility |
| `src/lib/email/templates.ts` | All 8 templates + `emailWrapper()` |
| `src/lib/inngest/functions/deploy.ts` | changeDetected (quick-diff path) |
| `src/lib/inngest/functions/analyze.ts` | changeDetected, allQuiet, correlationUnlocked (post-analysis) |
| `src/lib/inngest/functions/checkpoints.ts` | correlationUnlocked (cron path) |
| `src/lib/inngest/functions/scheduled.ts` | dailyDigest, activationNudge, genericSetup |
| `src/app/api/auth/claim-link/route.ts` | claimPage |
| `src/app/api/billing/webhook/route.ts` | welcomeSubscriber |
| `supabase/templates/` | Supabase auth email HTML |
