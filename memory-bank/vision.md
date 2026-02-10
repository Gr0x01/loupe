# Loupe — Product Vision (Feb 2026)

## The Core Insight

Loupe is a **correlation layer** between page changes and business outcomes.

**Not this:** "Your site changed!" (real-time alert, VisualPing)
**This:** "Your headline changed Jan 28. Since then, bounce rate is up 12%." (retrospective correlation)

The value isn't catching changes fast. It's understanding what caused what — a week later, a month later.

---

## The Problem

Solo founders and small teams ship constantly. Deploys, AI-assisted changes, CMS updates. They never know:
- What actually changed on the page
- Whether changes helped or hurt
- What caused the metric movement they're seeing

They notice conversions dropped. They don't know why. They can't connect the dots.

---

## The Solution

Loupe builds a **timeline of your site** — what changed and when — and overlays it with your metrics.

When metrics move, you can look back and see what changed around that time.
When you ship a change, you can look forward and see what happened after.

```
JANUARY 2026

● Jan 30 — CTA moved below fold
  Bounce rate since: 42% → 48% (↑ worse)

● Jan 28 — Headline changed
  "Start free trial" → "Get started"
  Time on page since: 1:45 → 1:20 (↓ worse)

● Jan 15 — Initial audit
  3 high-impact opportunities identified
```

The changelog + metrics overlaid. That's the product.

---

## The Lead Magnet: Predictions, Not Grades

### Why No Score

Scores train users to play the wrong game. "I got 68, I need to get to 85" is a dead end — they fix things, re-audit, hit 85, and leave.

The correlation product is about: "Did your changes actually help your business?"

A score doesn't answer that. Only metrics can.

### The New Frame: Direct and Outcome-Focused

**Old story:** "Your site has problems. Here's your grade. Fix these to score higher."
**New story:** "Here's what we found. Here's what we expect if you fix it. Let's see if we're right."

No clever labels. Just:
- What we noticed
- What it assumes about your visitors
- What we expect to happen if you change it

Loupe surfaces insights. The product validates them.

---

## The Audit Experience

### The Hero (Replacing the Score Arc)

**Design goal:** Make it screenshot-worthy without a score.

**The Verdict** — enormous, quotable, one line:
> "Your CTA is buried below four screens of scrolling."

**The Impact Bar** — visual representation of potential:
```
━━━━━━━━━━░░░░░░░░░░░░░░░
You now        Potential (+15-30%)
```

**The Count** — secondary, below the bar:
> "3 changes to close the gap"

**The Domain Badge** — makes it feel official:
> "yoursite.com · Audited by Loupe"

**Full hero structure:**
```
[Large, bold text]
Your CTA is buried below four screens of scrolling.

[Visual bar showing gap]
━━━━━━━━━━░░░░░░░░░░░░░░░
You now        Potential (+15-30%)

[Count as preview]
3 changes to close the gap

yoursite.com · Audited by Loupe
```

### The Finding Cards

**Design principle:** Action-first, reasoning expandable. Vibe coders won't read four sections. Show them what to do, let curious users dig deeper.

**Default view (collapsed):**
```
YOUR HEADLINE
"Get more customers with less effort"

Try: "Ship your SaaS in a weekend, not a quarter"
Expected: More people stick around (+8-15%)

[Copy]        [I fixed this]
```

**Expanded view (tap "Why this matters"):**
```
Why this matters:
Vague headlines assume visitors know they need help.
Specific outcomes create curiosity.
Based on: 847 similar pages we've tracked

Metric detail: Bounce rate ↓ 8-15%
```

**Key changes from original design:**
- Lead with the suggestion, not the assumption
- Use plain language ("more people stick around") with metric in detail
- No checkbox buried in card — prominent "I fixed this" button
- Reasoning is expandable, not required reading

Every finding has a **predicted outcome**. That's the hook to the correlation product.

### Instant Value: The Rewrite

Show them better copy, not just problems:

```
YOUR HEADLINE, REWRITTEN

Current: "Welcome to our platform"
         ↑ Generic. Says nothing about what you do.

Try this: "Ship your SaaS in a weekend, not a quarter"
          ↑ Specific outcome + time contrast = curiosity

[Copy to clipboard]
```

Tangible, copy-paste value in seconds.

### The Bridge to Monitoring

**Problem:** "Track this page" asks for commitment before showing ongoing value.

**Solution:** Show them what they're missing before asking for commitment.

**Option A: Historical demo (preferred)**
If we can pull Wayback Machine data:
> Your page was different 30 days ago. Did you know?
> [Show before/after]
> Loupe catches changes like this — and tells you if they helped.
> **[Track this page →]**

**Option B: Hypothetical preview**
> **What if your headline changed next week?**
>
> Here's what we'd tell you:
> "Your headline changed Tuesday. Since then, people are sticking around 15% longer."
>
> Loupe watches your page. When something shifts, you'll know if it helped.
>
> **[Track this page →]**

**Option C: Fear of the unknown**
> You'll tweak your headline next week. Or your AI tool will change something you didn't notice.
>
> Loupe watches your page. When something shifts, we tell you whether it helped or hurt.
>
> **[Track this page →]**

---

## Two Experiences

### Audit 1: Insights + Predictions (Lead Magnet)
- Paste URL → get findings with expected impact
- "Here's what we found. Here's what we expect if you fix it."
- Each finding has predicted outcome
- No signup required
- **Purpose:** Get them in the door, plant the seed for validation

### Audit N+1: Chronicle (The Real Product)
- Not another audit — a progress report + advisor
- Three sections:
  1. **What changed** — and did it help?
  2. **What to do next** — updated suggestions with predictions
  3. **Still watching** — changes collecting data
- Verdict-first: "You made 2 changes. One helped. Here's what to do next."
- **Purpose:** Ongoing value, always something actionable

The audit makes predictions. The chronicle validates them AND suggests what's next.

---

## The Value Loop

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   AUDIT → SUGGEST → CHANGE → WATCH → CORRELATE     │
│      ↑                                       │      │
│      └───────── SUGGEST AGAIN ←──────────────┘      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

| Layer | What it does |
|-------|--------------|
| **Audit** | Initial findings + suggestions + predictions |
| **Suggest** | What to change, with expected impact |
| **Watch** | Detect changes, build timeline |
| **Correlate** | Did the change help or hurt? |
| **Suggest again** | Updated recommendations based on what worked |

Suggestions get smarter over time because we know what actually moved the needle.

---

## Progress Without Scores

### Tracking What Worked

```
YOUR PROGRESS                                    Since Jan 15

● Validated
  ✓ CTA above fold — Bounce rate dropped 12%
  ✓ Headline rewritten — Time on page +18%

◐ Watching (changed, collecting data)
  ◐ Added testimonials — 3 days of data

○ Open (not yet addressed)
  ○ Pricing clarity

─────────────────────────────────────────────────
2 of 4 changes validated · Impact so far: +22%
```

Progress is measured in **outcomes**, not arbitrary points.

---

## The Dashboard

**Not:** List of pages with scores
**Is:** Activity stream with two zones — action required vs. watching quietly

**Structure:**
```
LOUPE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What needs attention                              1 item
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

yoursite.com/pricing
Headline changed Tuesday → People leaving more (+8%)
[See details]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Watching (no action needed)                     2 pages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

yoursite.com — stable, last checked 2h ago
yoursite.com/features — stable, last checked 2h ago

[+ Watch another page]
```

**Empty state (the goal state):**
```
LOUPE

All quiet.

Your 2 pages are stable.
Last checked: 2 hours ago

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
No changes this week.
Your site is holding steady.
```

Frame empty as success, not absence. "All quiet" is the win state.

The dashboard surfaces: what needs attention + what's being watched. Always prioritized.

---

## Shareability Without a Score

**Key insight:** The verdict is shareable, not the count. People share "can you believe this?" not "3 opportunities found."

### What Gets Shared
- The roast: "Loupe just told me my headline assumes visitors already know what we do. Ouch."
- The reveal: "I audited my landing page and apparently my CTA is invisible on mobile."
- The specific: "4 scroll gestures to find my CTA. No wonder nobody signs up."

### The Social Card (Verdict-First)
```
┌─────────────────────────────────────────┐
│                                         │
│  "Your CTA is buried below             │
│   four screens of scrolling."           │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                         │
│  Loupe found 3 fixes worth +15-30%      │
│  yoursite.com                           │
│                                         │
└─────────────────────────────────────────┘
```

The verdict is the hook. The specific observation ("four screens") is the shareable detail.

### Alternative: The Before/After Card
```
┌─────────────────────────────────────────┐
│  BEFORE                  AFTER          │
│  ──────                  ─────          │
│  "Welcome to            "Ship your      │
│   our platform"          SaaS in a      │
│                          weekend"       │
│                                         │
│  Loupe rewrote my headline.             │
│  yoursite.com                           │
└─────────────────────────────────────────┘
```

Tangible transformation. This gets shared.

---

## Progressive Value

The product works without integrations. It gets better with them.

| Without integrations | With integrations |
|---------------------|-------------------|
| "Your headline changed Tuesday" | "Your headline changed Tuesday → bounce rate up 12%" |
| Expected impact (industry benchmarks) | Actual impact (their data) |
| Timeline of changes | Timeline + metric correlation |
| "We predict this will help" | "Here's what actually happened" |

Most users won't connect PostHog/GA4. The product must be valuable anyway.

**Proxy value without integrations:**
- "Your CTA moved below fold. Above-fold CTAs convert 2x better (industry data)."
- "You removed social proof. Pages with testimonials convert 38% better."
- Expected impact ranges based on patterns from pages we've tracked

---

## Positioning

### Strategic Frame: Opportunity Cost → Compounding Intelligence

Loupe is not a monitoring tool or a website grader. It's a **compounding intelligence layer** for your site.

**The positioning operates on three levels:**

**1. Curiosity + Celebration (acquisition — the hook):** Solo founders ship fast. That's the hard part. Loupe celebrates their velocity and invites curiosity: "You made the change. See what it did." The tone is supportive — we have their back. They're already doing the work; Loupe helps them see the results. No fear, no guilt about not tracking. Just: you shipped something, here's what happened.

**2. Painkiller (activation):** Lead with loss and urgency at the point of conversion. The user is losing signups right now because of changes they didn't notice. Frame as ongoing threat, not episodic — like Norton (you MIGHT be hacked at any time), not like Tylenol (take when it hurts).

**3. Compounding Intelligence (retention):** Once inside, show the accumulating intelligence. Scan counts, prediction accuracy, calibration progress, "since we started watching" summaries. The product gets smarter about YOUR site with every scan. Canceling means losing that accumulated context.

**The key insight:** Most founders are making changes in the dark. Some changes help. Some hurt. Most do nothing. Without knowing which is which, they can't compound the wins. Loupe turns every change into a data point, so the NEXT change is smarter. That's not protection from loss — that's acceleration toward potential.

This maps to Sarah Tavel's framework:
- **Accruing benefit:** Calibration loop, running summaries, validated predictions, correlation history
- **Mounting loss:** Timeline history, validated findings, calibrated LLM context, integration data

### The Reframe: Detective → Growth Advisor

**Old mental model:** Loupe is a detective you call after the crime (reactive, defensive).
**New mental model:** Loupe is a growth advisor that turns every change into a lesson and every lesson into better revenue (proactive, offensive).

The difference:
- Detective: "Your headline change hurt you." (damage report)
- Advisor: "Your headline change added 30 signups/month. Here's what to try next to keep compounding." (growth engine)

The product already delivers this — Chronicle tracks validated wins, predictions point to what's next, calibration makes every suggestion smarter. The messaging needs to lead with the upside gap, not just the downside risk.

### Headline Hierarchy (ranked by strength)

**Acquisition headlines (celebration + curiosity — for landing page, ads, cold traffic):**

1. **"You made the change. See what it did."** (PRIMARY — curiosity)
   - Celebrates their velocity, invites them to see the outcome
   - Supportive tone — we're here to help, not judge
   - Works for both ICPs

2. **"Your page, through Loupe"** (SECTION — for "what you get")
   - Makes it feel personal — YOUR page, not generic advice
   - Mirror framing: see yourself reflected back

3. **"Your next change is coming. This time, you'll know."** (CLOSER)
   - Future-focused, supportive
   - Positions Loupe as having their back

4. **"Did that change work?"** (SEGMENT-SPECIFIC)
   - Meets users in their internal monologue
   - Strong for the audit experience specifically

**Retention headlines (compounding — for onboarding, emails, dashboard):**

5. **"The longer Loupe watches, the smarter it gets."**
   - Directly communicates accruing benefit
   - Great for onboarding or "why stay" moments

6. **"What changed. What it did. What to do next."**
   - Three-beat rhythm mapping to the full value loop
   - "What to do next" = proactive advisor frame

### One-liner
"Loupe learns what works for your site — by watching every change and measuring what it did."

### The "Only" Statement
> "Loupe is the only tool that learns what works for YOUR site — by connecting every page change to your actual numbers, and using that history to tell you what to do next."

"Learns" (compounding), "YOUR site" (personalization), "history" (accumulated value), "what to do next" (proactive advisor).

### Category: Change Intelligence

Loupe owns the **Change Intelligence** category:

- **Change monitoring** (VisualPing) = what changed
- **Web analytics** (PostHog/GA4) = what are the numbers
- **CRO tools** (VWO/Optimizely) = formal A/B experiments
- **Change Intelligence** (Loupe) = which change caused which movement, and what to do next

Don't lead with the category name. Let it emerge naturally:
> "Loupe is change intelligence for your site — connecting what you ship to what happens next."

Use the phrase consistently across touchpoints until people use it to describe us.

---

## Language: Vibe Coder Translations

**The tension:** Two ICPs with different sophistication. Don't force vibe coders to learn analytics vocabulary.

**Rule:** Lead with outcomes, follow with metrics for those who want them.

| Technical Term | Vibe Coder Translation |
|---------------|----------------------|
| Bounce rate | People leaving immediately |
| Bounce rate ↓ | More people stick around |
| Conversion rate | People signing up |
| Time on page | How long people stay |
| CTR | People clicking |
| Session duration | How long visits last |

**In copy:**
- Bad: "Expected: Bounce rate ↓ 8-15%"
- Good: "Expected: More people stick around (+8-15%)"
- Good: "More people sticking around (bounce rate ↓ 8-15%)" — for both audiences

**Prediction framing:**
- Bad: "Expected: X%" — sounds like a guarantee
- Good: "Pages like yours typically see..." — frames as pattern
- Good: "Based on 847 similar pages we've tracked" — adds credibility

---

## What This Changes

### Navigation
- ~~Leaderboard~~ (removed — conflicts with correlation positioning)
- Your pages → Settings (logged in)
- Sign in (logged out)

### Audit Results Page
- No score arc — verdict + count + expected impact
- Findings with predictions ("If you fix this, expect X")
- Rewrite suggestions with copy button
- Bridge CTA: "Track this page"

### Results Page (N+1)
- Progress tracker: validated / watching / open
- Timeline of changes with correlation
- Verdict-first: "2 changes validated. Your fixes helped."

### Dashboard
- Activity stream, not page grid
- Empty state: "All quiet. Your homepage is being watched."
- Changes surface when they happen

### Scheduled Scans
- Purpose is building historical record for future correlation
- Daily/weekly cadence creates the timeline data

---

## Future: Contextual Intelligence

Domain-level settings that make suggestions smarter:

```
DOMAIN SETTINGS: yoursite.com

Company: B2B SaaS for freelancers
ICP: Solo consultants, $50-200k revenue
Brand voice: Casual, direct, no corporate speak
Key differentiator: AI-powered invoicing
```

**How it changes suggestions:**

| Generic | Contextualized |
|---------|----------------|
| "Add social proof" | "Your ICP trusts peer stories. Add a testimonial from another freelancer." |
| "Clarify headline" | "Your brand is casual. 'Invoicing that doesn't suck' fits better than 'Streamlined solutions.'" |
| "CTA is weak" | "Freelancers are time-poor. 'Send your first invoice in 60 seconds' beats 'Get started.'" |

The LLM knows who you're talking to and how you talk. Suggestions get sharper over time as we learn what works for YOUR page.

---

## LLM Pipeline

Every scan uses the smart model. One call per scan. Value at every touch.

### Initial Audit

```
User pastes URL
    ↓
Screenshot
    ↓
Smart LLM sees: screenshot + page content
    ↓
LLM outputs:
  - Findings (what we noticed)
  - Suggestions (what to change)
  - Predictions (expected impact)
  - Rewrites (copy they can use)
    ↓
Store as baseline
```

### Scheduled Scan

```
Cron triggers scan
    ↓
Screenshot
    ↓
Pull metrics (if connected)
    ↓
Smart LLM sees:
  - Previous screenshot/analysis
  - Current screenshot
  - Metrics history (if available)
  - Domain context (company, ICP, voice - future)
    ↓
LLM outputs:
  - What changed (if anything)
  - Suggestions (always, based on current state)
  - Correlation insights (when data supports it)
    ↓
Store, notify user if needed
```

### One LLM Call Per Scan

The smart model sees everything:
- Before and after
- Metrics timeline
- Context

It outputs everything:
- Changes
- Suggestions
- Correlation

No separate passes. One smart call that does the job.

### Example Prompt Structure

```
You are analyzing a landing page for [company].

PREVIOUS STATE (Jan 15):
[previous screenshot]
[previous findings]

CURRENT STATE (Jan 22):
[current screenshot]

METRICS (if available):
- Jan 15-18: Bounce 42%, Time on page 1:20
- Jan 19-22: Bounce 38%, Time on page 1:45

TASK:
1. What changed between previous and current?
2. What should they do next? (suggestions with expected impact)
3. Any correlations between changes and metrics?

Output as structured JSON.
```

### Correlation Logic

- Adaptive window based on traffic volume
- Low traffic: directional guidance with industry benchmarks
- High traffic: confident correlation with their data
- LLM decides confidence level based on data available

**No penny-pinching.** At MVP scale, LLM costs are irrelevant. The product being great is what matters.

---

## Email Strategy

Emails are context-aware, not generic notifications. The subject line tells you what happened.

### Email Types

| Email | When | Subject example |
|-------|------|-----------------|
| **Change detected** | Scheduled/deploy scan finds changes | "Your headline change helped" or "may need attention" |
| **All quiet** | Scheduled scan, no changes | "All quiet on yoursite.com" |
| **Correlation unlocked** | Watching item becomes validated | "Your headline change helped" |
| **Weekly digest** | Monday, for users with 3+ pages | "Your weekly Loupe report" |

### Design Principles
- **Subject = verdict** — "Your headline change helped" not "Scan complete"
- **Headline-first** — The main message is the first thing you see
- **One focal point** — Don't compete for attention
- **Left-aligned CTAs** — Less "marketing email" feeling
- **All quiet = success** — Stability is reassuring, not boring

### Change Detected Email Structure
```
[Headline: verdict based on correlation]
This change helped.
More people sticking around (+8%)

[Gray box: the change]
YOUR HEADLINE
"Start free" → "Get started in 60 seconds"

[If suggestion exists]
Next up: Move CTA above fold — +10-15%

[CTA: See full report]
```

### All Quiet Email Structure
```
Your page is stable.
yoursite.com — no changes since Jan 15

[If suggestion exists, gray box]
While things are quiet:
CTA Button: More people clicking — +10-15%

[CTA: See suggestion / View your page]
```

---

## Open Questions

1. **How do we generate predictions?** Industry benchmarks? Our own data from tracked pages? LLM estimates?
   - *Guidance:* Be honest about source. "Based on 847 similar pages" if true. "Based on CRO best practices" if LLM-generated. Don't fake precision.

2. **What triggers the "connect your analytics" moment?**
   - *Guidance:* Show correlation they *almost* have: "Your headline changed Tuesday. We think it helped — but we can't confirm. Connect PostHog to see the actual impact."

3. ~~**How does "nothing changed" feel valuable?**~~
   - *Resolved:* allQuietEmail frames stability as success. "Your page is stable." + optional suggestion gives proactive value.

4. **Landing page:** Does the audit input stay the hero, or do we lead with the correlation story?
   - *Guidance:* Keep audit as hero — it's the lead magnet. But subhead should hint at correlation: "See what's wrong. Fix it. Know if it worked."

5. ~~**Can we show historical changes using Wayback Machine?**~~
   - *Resolved:* WaybackPreview component shows historical snapshots from Wayback CDX API.

---

## Design Principles

1. **Answer "what do I do?" in 3 seconds** — users won't read instructions
2. **Action-first, reasoning expandable** — show the fix, hide the why
3. **Empty states = success states** — "All quiet" is the win
4. **Detect changes automatically** — don't rely on checkboxes users won't return to click
5. **Verdicts are shareable, numbers aren't** — the roast gets shared, not the count
6. **Progressive disclosure** — visible: verdict, change, action, impact. Hidden: reasoning, methodology, technical details
7. **Two zones, not infinite scroll** — "needs attention" vs. "watching quietly"

---

## Next Steps

1. Rewrite landing page copy: "Did that change work?" as primary headline
2. ~~Redesign audit results page: verdict + impact bar + collapsed finding cards~~ ✓
3. ~~Redesign N+1 results page: chronicle with timeline + correlation lines~~ ✓
4. ~~Redesign dashboard: two-zone activity stream (attention needed / watching)~~ ✓
5. ~~Redesign social card: verdict-first, specific observation as the hook~~ ✓ (dynamic OG images)
6. ~~Add prediction logic to findings (with honest credibility markers)~~ ✓
7. ~~Explore Wayback Machine integration for historical demo~~ ✓ (WaybackPreview component)
8. ~~Context-aware email templates~~ ✓
