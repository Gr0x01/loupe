# Current Phase

## Phase 1: MVP — Page Audit + Monitoring (Feb 2, 2026)

**Status: Product defined, ready to build.**

### What We're Building

1. **Free page audit tool** (lead magnet, launch feature)
   - Enter URL → screenshot → LLM CRO analysis → structured results
   - No signup for first audit, email gate for repeat use
   - Shareable audit card
   - Port audit logic from Boost

2. **Page monitoring + email alerts** (core product)
   - User adds pages to monitor (1 free, more on Pro)
   - Weekly screenshots + change detection
   - Email: "Your page changed — here's what's different"
   - Event-triggered upgrade prompts in emails

3. **Dashboard** (authenticated experience)
   - Monitored pages with change timeline
   - Snapshot history and diffs
   - Audit scores

### What's NOT in v1
- GitHub deploy tracking (v2)
- PostHog/GA4 analytics correlation (v2)
- LLM marketing suggestions (Pro, after audit is validated)
- Team tier

### Decisions Still Needed
- Domain (driftwatch.io / driftwatch.dev / other)
- Separate Supabase instance or share with Boost?
- Screenshot approach: reuse Vultr Puppeteer, managed service (Browserless.io), or screenshot API?
- Email provider (Resend? Loops? Postmark?)
