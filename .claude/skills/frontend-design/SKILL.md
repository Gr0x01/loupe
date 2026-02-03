---
name: frontend-design
description: Guidelines for creating distinctive, high-quality frontend UI. Use when building or modifying React components, pages, or visual elements.
---

# Frontend Design Guidelines (2025-2026)

---

## Loupe Project: Luminous Glass + Editorial Punch

**Aesthetic: Light glass UI + Editorial hybrid.**
Bright, airy, confident. Frosted glass cards on a soft gray canvas with deep violet accents and editorial serif headlines.

### The Formula

| Layer | Direction |
|-------|-----------|
| **Visuals** | Luminous glass — frosted white cards on light gray canvas, subtle noise texture, generous whitespace |
| **Typography** | Editorial punch — Instrument Serif for hero headlines, DM Sans for everything else |
| **Copy** | Watchful, calm, specific — "Your hero text changed" not "ALERT: Change detected!" |
| **Colors** | Confident — dark text on light backgrounds, deep violet (#5B2E91) accent |

### Color Palette

```css
:root {
  /* Backgrounds — Luminous depth */
  --bg-primary: #F5F5F7;         /* Light gray — page canvas */
  --bg-secondary: #EFEFEF;       /* Slightly darker — alternate sections */
  --surface: rgba(255, 255, 255, 0.6);  /* Frosted glass card surface */
  --surface-solid: #FFFFFF;      /* Solid white surface */
  --surface-hover: rgba(255, 255, 255, 0.8);  /* Card hover */

  /* Text */
  --text-primary: #111118;       /* Near-black */
  --text-secondary: #55556D;     /* Body copy, descriptions */
  --text-muted: #8E8EA0;         /* Labels, timestamps, hints */

  /* Accent — Deep Violet */
  --accent: #5B2E91;             /* Primary CTA, links, key highlights */
  --accent-hover: #4A2577;       /* Darker on hover */
  --accent-subtle: rgba(91, 46, 145, 0.08); /* Violet tint background */
  --accent-border: rgba(91, 46, 145, 0.2);  /* Violet border */
  --accent-glow: rgba(91, 46, 145, 0.15);   /* Violet glow */

  /* Borders — glass style */
  --border: rgba(255, 255, 255, 0.5);      /* Inner glass border */
  --border-outer: rgba(0, 0, 0, 0.06);     /* Outer subtle border */
  --border-strong: rgba(0, 0, 0, 0.1);     /* Stronger border for emphasis */
  --border-subtle: #E4E4EB;                /* Subtle solid border */

  /* Surfaces — specific */
  --bg-inset: #F0F0F3;          /* Inset/recessed background */

  /* Semantic — Scores */
  --score-high: #1A8C5B;         /* Green — good scores (80+) */
  --score-mid: #D4940A;          /* Amber — okay scores (60-79) */
  --score-low: #C23B3B;          /* Red — problem scores (<60) */
}
```

### Typography

- **Hero Headlines**: Instrument Serif (400 weight, tight tracking) — serif with editorial presence
- **Section Headlines / UI**: DM Sans (700 weight) — clean, geometric, modern
- **Body**: DM Sans (400 weight) — readable, professional
- **Monospace**: Geist Mono — for DOM changes like `text-5xl -> text-3xl`
- **Avoid**: Inter, Poppins, Roboto, Open Sans, Lato, Space Grotesk, Geist (for headlines)

Both Instrument Serif and DM Sans load via `next/font/google`.

```css
/* Type scale — dramatic jumps */
--text-hero: clamp(2.75rem, 6vw, 4.5rem);    /* 44-72px */
--text-section: clamp(1.75rem, 3vw, 2.5rem);  /* 28-40px */
--text-card-title: 1.25rem;                     /* 20px */
--text-body: 1rem;                              /* 16px */
--text-small: 0.875rem;                         /* 14px */
--text-label: 0.75rem;                          /* 12px */
```

### Typography Weight & Balance

Text needs visual weight to feel authoritative. Small gray body text next to a bold card looks weak and unfinished. Follow these principles:

**Match weight to importance.** If content is the point of a section (an explanation, a key insight), it should be `text-lg` or `text-xl` with `text-text-primary` — not `text-sm text-text-secondary`. Reserve small muted text for labels, timestamps, and metadata.

**Use Instrument Serif for pull-quote moments.** When a section has one key statement or insight worth highlighting, render it in Instrument Serif at `text-xl` or larger. This creates editorial weight — the eye is drawn to it.

**Labels are small, content is not.** A pattern: tiny uppercase label (`text-xs font-semibold text-text-muted uppercase tracking-wide`) followed by substantial content (`text-lg` or `text-xl` in `text-text-primary`). The label introduces, the content delivers.

**Balance across columns.** In a two-column layout, both sides need comparable visual weight. If the left column has a card with bold headlines, the right column can't be a small gray paragraph — it needs presence. Options:
- Larger text size (`text-lg` or `text-xl`)
- Primary color (`text-text-primary`) instead of secondary
- Instrument Serif for the key line
- A mix: Instrument Serif headline-sized pull quote + smaller supporting text below

**Anti-patterns:**
- `text-sm text-text-secondary` as the main content of a section — too weak
- Body text that's the same size/weight as labels — no hierarchy
- A bold left column paired with a whisper-quiet right column — unbalanced
- Everything at `text-base` — flat, no drama

### Spacing System

Sections on the results page use consistent spacing via CSS classes:
- `.result-section` — `64px` top/bottom padding for each content zone
- `.section-header` — `48px` margin-bottom between header and content
- Use these classes instead of arbitrary Tailwind padding on result page sections

### Key Patterns

**Cards (standard — glass)**
```jsx
<div className="glass-card p-6">
```
CSS: `background: rgba(255, 255, 255, 0.55)`, `backdrop-filter: blur(20px) saturate(1.4)`, `border: 1px solid rgba(255, 255, 255, 0.6)`, `border-radius: 16px`

**Cards (elevated — hero input, score display)**
```jsx
<div className="glass-card-elevated p-8">
```
CSS: `background: rgba(255, 255, 255, 0.65)`, `backdrop-filter: blur(24px) saturate(1.5)`, `border-radius: 20px`, deeper shadow

**Cards (active/selected)**
```jsx
<div className="glass-card-active p-5">
```
CSS: violet border `rgba(91, 46, 145, 0.25)`, violet glow shadow

**Primary Button (violet)**
```jsx
<button className="btn-primary">Audit this page</button>
```
CSS: `background: #5B2E91`, white text, `border-radius: 12px`, violet shadow, `active: scale(0.98)`

**Secondary Button (glass)**
```jsx
<button className="btn-secondary">Share this audit</button>
```
CSS: `background: rgba(255, 255, 255, 0.6)`, backdrop-blur, subtle border

**Ghost Button**
```jsx
<button className="text-accent font-medium px-4 py-2 rounded-lg
                   hover:bg-[rgba(91,46,145,0.08)] transition-colors duration-150">
  Audit another page
</button>
```

**Hero Input Card**
```jsx
<div className="glass-card-elevated p-4">
  <div className="flex flex-col sm:flex-row items-stretch gap-3">
    <input
      type="text"
      inputMode="url"
      placeholder="https://yoursite.com"
      className="input-glass flex-1 text-lg"
    />
    <button className="btn-primary whitespace-nowrap">
      Audit this page
    </button>
  </div>
</div>
```

**Finding Cards (3 types — glass variants with colored left border)**
```jsx
{/* Issue — red left border */}
<div className="finding-issue p-5">
  <p className="font-medium text-text-primary">Issue title</p>
  <p className="text-sm text-text-secondary mt-1">Explanation</p>
  <p className="text-sm font-medium text-accent mt-2">Fix: ...</p>
</div>

{/* Suggestion — violet left border */}
<div className="finding-suggestion p-5">
  <p className="font-medium text-text-primary">Suggestion title</p>
  <p className="text-sm text-text-secondary mt-1">Explanation</p>
</div>

{/* Strength — green left border */}
<div className="finding-strength p-5">
  <p className="font-medium text-text-primary">Strength title</p>
  <p className="text-sm text-text-secondary mt-1">Explanation</p>
</div>
```

**Score Arc (SVG half-gauge, animated)**
Uses a gradient arc from `#7B3FA0` → `#6366B8` → `#7BA4D4` on a `#E4E3EF` track with blurred shadow underneath. Letter grade + numeric score displayed inside.

**Category Score Card (interactive)**
```jsx
<button className={isActive ? "glass-card-active p-5" : "glass-card p-5"}>
  <p className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">
    Category Name
  </p>
  <p className="text-4xl font-black" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
    68
  </p>
  <div className="progress-track mb-3">
    <div className="progress-fill" style={{ width: '68%', backgroundColor: 'var(--score-mid)' }} />
  </div>
</button>
```

**Badge/Pill**
```jsx
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                 text-sm font-medium bg-[rgba(255,255,255,0.5)] text-text-secondary
                 border border-border-subtle">
  Marketing <span className="font-bold text-text-primary">68</span>
</span>
```

### Page Layouts

**Homepage (landing / free audit tool)**
1. Hero: Instrument Serif headline + subtext + elevated glass input card + trust line. Centered on #F5F5F7. Nothing else above fold.
2. Example result preview: static mock of a result card (score, categories, sample findings)
3. Closing CTA: Instrument Serif italic + repeated input on #EFEFEF bg.
4. No nav links, no logo bars, no pricing, no feature grids for MVP.

**Results page (the shareable moment) — 6 zones, max-w-[1080px]**
1. Hero Score Band: Score arc (SVG animated 0→score) + verdict + category breakdown in glass-card-elevated. 3-column layout.
2. Quick Diagnosis: Working vs. Leaking two-column grid with check/x icons.
3. Top 3 Actions: Numbered items (1 large + prominent, 2-3 smaller). Ranked by conversion impact.
4. Headline Rewrite: Current (strikethrough) → Suggested (violet-tinted card) with reasoning.
5. Category Grid + Findings Panel: 3×2 interactive glass cards → clicking filters findings. Sticky sidebar nav + filtered findings.
6. Bottom CTA: Email capture ("Watch this page") in glass-card-elevated + share links.

### Copy Rules (In-Product)

- **Calm, not alarming** — "3 changes detected this week" not "WARNING: 3 issues found"
- **Specific over general** — "Hero headline changed" not "Content change detected"
- **Before/after always** — show what was and what is
- **No jargon** — "Your page changed" not "Visual regression detected"
- **Human timestamps** — "Last Tuesday" or "2 days ago" not ISO timestamps
- **Empty states are positive** — "No changes this week. Your page is stable."

### Motion Principles

- **ONE hero animation per page**: Score arc fill + stagger reveal on results page. That is it.
- **Subtle transitions**: fade-ins on section reveal, smooth expand/collapse
- **Tactile buttons**: `active:scale-[0.98]` on all buttons
- **Loading states**: stepped progress ("Screenshotting your page... Reading headlines and CTAs... Writing your audit...")
- **No bounces or springs** — feels unreliable for a monitoring tool
- **Progress bars**: animate width with `transition-all duration-700`

### What to Avoid

- Coral/orange/warm-red accents — too close to Boost (aboo.st)
- Dark mode by default — this is a light glass UI product
- Near-black backgrounds (#0F1117) — we moved away from dark tech
- Electric cyan (#00D4FF) accents — replaced by deep violet
- Purple AI gradients — the cliche (our violet is solid, not gradient)
- Bento grids — oversaturated
- Generic SaaS template look
- Heavy animations — one hero moment, everything else is subtle
- Dashboard overload — this is a focused tool, not Datadog
- Inter, Poppins, Roboto, Geist for headlines (Geist Mono is fine for code)
- `rounded-md` for cards — use `rounded-xl` or `rounded-2xl`
- Hardcoded Tailwind padding on result sections — use `.result-section` and `.section-header` classes

### Implementation Checklist

Before shipping, verify:
- [ ] Aesthetic is Luminous Glass + Editorial (not dark, not generic minimal)
- [ ] Hero headlines use Instrument Serif, UI uses DM Sans
- [ ] Accent color is deep violet #5B2E91 (not cyan, not coral, not blue-500)
- [ ] Cards use glass-card / glass-card-elevated classes (frosted white on #F5F5F7)
- [ ] Background is #F5F5F7 (light gray), NOT near-black or warm white
- [ ] Audit results page has animated score arc (the memorable moment)
- [ ] Light mode is the default
- [ ] Mobile-first responsive (test at 375px)
- [ ] Score colors: green #1A8C5B (80+), amber #D4940A (60-79), red #C23B3B (<60)
- [ ] Buttons have active:scale-[0.98] for tactile feel
- [ ] Does not look like Boost (no coral, no warm white)
- [ ] Does not look like a generic SaaS template
- [ ] Result sections use `.result-section` class for consistent spacing

---

## Design Decision Protocol

**Before writing any code, confirm the aesthetic direction is Luminous Glass + Editorial (as defined above).** For any new page or component, ask: does this feel bright, airy, confident, and distinctive?

---

## Aesthetic Directions (Reference -- other projects)

### 1. Human Scribble
**The antidote to AI-polish.** Hand-drawn doodles, sketch overlays, wobbly lines.
- **Fonts**: Caveat, Kalam, Patrick Hand
- **Colors**: Paper white (#FFFEF9), pencil gray, highlighter accents

### 2. Nature Distilled
**Muted earthy sophistication.** Warm but restrained.
- **Fonts**: Cormorant, EB Garamond (serifs), DM Sans (body)
- **Colors**: Sand, clay, bark, moss, stone

### 3. Light Skeuomorphism
**Tactile digital.** Subtle shadows, soft embossing, gentle gradients.
- **Fonts**: SF Pro, Nunito, Quicksand
- **Colors**: Soft whites, gentle grays, one accent

### 4. Digital Texture
**Jelly, chrome, clay.** Playful 3D surfaces.
- **Fonts**: Clash Display, Cabinet Grotesk, Satoshi
- **Colors**: Candy gradients, iridescent effects

### 5. Glow Design
**Futuristic luminescence.** Dark backgrounds with neon.
- **Fonts**: Geist, Instrument Sans, Azeret Mono
- **Colors**: Deep navy/black, electric blue, violet, cyan

### 6. Y2K Revival
**Intentionally chaotic.** Maximalist energy.
- **Fonts**: VT323, Press Start 2P, Orbitron
- **Colors**: Hot pink, electric cyan, lime green

### 7. Glassmorphism (Refined)
**Layered transparency.** Frosted glass panels.
- **Fonts**: Inter (allowed here), Outfit, Be Vietnam Pro

### 8. Editorial/Magazine
**Typography-led layouts.** Big type, dramatic hierarchy.
- **Fonts**: Newsreader, Fraunces, Instrument Serif

### 9. Brutalist Raw
**Unpolished on purpose.** System fonts, harsh borders.
- **Fonts**: Courier New, Times New Roman, Bebas Neue

### 10. Soft Minimal
**Airy, calming restraint.** Lots of whitespace, muted palette.
- **Fonts**: Plus Jakarta Sans, General Sans, Switzer

---

## Typography (Updated 2025-2026)

### Fresh Fonts to Use
**Display/Headlines:** Clash Display, Cabinet Grotesk, Satoshi, Instrument Serif, Fraunces
**Body Text:** Satoshi, Plus Jakarta Sans, General Sans, DM Sans
**Monospace:** Geist Mono, Berkeley Mono, JetBrains Mono

### Fonts That Feel Dated
**Avoid:** Inter (unless Glassmorphism), Space Grotesk, IBM Plex, Roboto, Open Sans, Lato, Poppins
