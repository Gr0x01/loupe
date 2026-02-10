---
name: frontend-design
description: Guidelines for creating distinctive, high-quality frontend UI. Use when building or modifying React components, pages, or visual elements.
---

# Frontend Design Guidelines (2025-2026)

---

## Loupe Project: Soft Brutalism 2.0

**Aesthetic: Refined brutalism with warmth.**
Solid surfaces, strong borders, minimal shadows. Confident typography with a warm paper palette and signal orange accent.

### The Formula

| Layer | Direction |
|-------|-----------|
| **Visuals** | Solid surfaces — warm paper backgrounds, strong 1.5-2px borders, no blur effects |
| **Typography** | Geometric punch — Space Grotesk for headlines, Inter for body, IBM Plex Mono for data |
| **Copy** | Supportive, celebratory — "You made the change. See what it did." not "Alert detected!" |
| **Colors** | Signal orange (#FF5A36) accent on warm paper (#F7F4EC), ink-dark text |

### Color Palette

```css
:root {
  /* Core palette — Warm brutalism */
  --ink-900: #111111;
  --ink-700: #2a2a2a;
  --ink-500: #555555;
  --ink-300: #888888;

  --paper-0: #F7F4EC;
  --paper-100: #ece7db;
  --paper-200: #e0dace;

  --line: #1a1a1a;
  --line-subtle: rgba(26, 26, 26, 0.12);

  /* Signal — Primary accent */
  --signal: #FF5A36;
  --signal-hover: #E64D2E;
  --signal-subtle: rgba(255, 90, 54, 0.08);
  --signal-border: rgba(255, 90, 54, 0.25);

  /* Semantic colors */
  --success: #15803D;
  --success-subtle: rgba(21, 128, 61, 0.08);
  --warning: #B45309;
  --warning-subtle: rgba(180, 83, 9, 0.08);
  --danger: #B91C1C;
  --danger-subtle: rgba(185, 28, 28, 0.08);

  /* Surfaces */
  --surface: #FFFFFF;
  --surface-elevated: #FFFFFF;
}
```

### Typography

- **Headlines**: Space Grotesk (700 weight, tight tracking) — geometric, confident
- **Body**: Inter (400/500 weight) — readable, professional
- **Data/Code**: IBM Plex Mono — technical precision
- **Avoid**: Instrument Serif, DM Sans, Poppins, Roboto, Open Sans

Font loading via `next/font/google`:
```tsx
// --font-dm-sans → Inter (body)
// --font-display → Space Grotesk (headlines)
// --font-geist-mono → IBM Plex Mono (code)
```

```css
/* Type scale — dramatic jumps */
--text-hero: clamp(2.75rem, 6vw, 4.5rem);    /* 44-72px */
--text-section: clamp(1.75rem, 3vw, 2.5rem);  /* 28-40px */
--text-card-title: 1.25rem;                     /* 20px */
--text-body: 1rem;                              /* 16px */
--text-small: 0.875rem;                         /* 14px */
--text-label: 0.75rem;                          /* 12px */
```

### Visual Rules

| Property | Value |
|----------|-------|
| Border radius | 8px default, 12px for larger elements |
| Border width | 1.5px default, 2px for emphasis |
| Shadows | None or minimal (0 2px 4px rgba(0,0,0,0.04)) |
| Blur | NEVER use backdrop-filter blur on surfaces |
| Motion | 180ms, `cubic-bezier(0.2, 0.8, 0.2, 1)` |

### Typography Weight & Balance

Text needs visual weight to feel authoritative. Small gray body text next to a bold card looks weak and unfinished. Follow these principles:

**Match weight to importance.** If content is the point of a section (an explanation, a key insight), it should be `text-lg` or `text-xl` with `text-ink-900` — not `text-sm text-ink-500`. Reserve small muted text for labels, timestamps, and metadata.

**Use Space Grotesk for pull-quote moments.** When a section has one key statement or insight worth highlighting, render it in Space Grotesk at `text-xl` or larger. This creates editorial weight.

**Labels are small, content is not.** A pattern: tiny uppercase label (`text-xs font-semibold text-ink-500 uppercase tracking-wide`) followed by substantial content (`text-lg` or `text-xl` in `text-ink-900`). The label introduces, the content delivers.

### Spacing System

Sections on the results page use consistent spacing via CSS classes:
- `.result-section` — `64px` top/bottom padding for each content zone
- `.section-header` — `48px` margin-bottom between header and content
- Use these classes instead of arbitrary Tailwind padding on result page sections

### Key Patterns

**Cards (standard — brutalist)**
```jsx
<div className="glass-card p-6">
```
CSS: `background: #FFFFFF`, `border: 1.5px solid var(--line)`, `border-radius: 8px`, no blur

**Cards (elevated — stronger border)**
```jsx
<div className="glass-card-elevated p-8">
```
CSS: `background: #FFFFFF`, `border: 2px solid var(--line)`, `border-radius: 12px`

**Cards (active/selected)**
```jsx
<div className="glass-card-active p-5">
```
CSS: `border: 2px solid var(--signal)`, signal-tinted shadow

**Primary Button (signal orange)**
```jsx
<button className="btn-primary">Watch this page</button>
```
CSS: `background: var(--signal)`, white text, `border: 2px solid var(--line)`, `border-radius: 8px`, `active: scale(0.98)`

**Secondary Button (outlined)**
```jsx
<button className="btn-secondary">Share this audit</button>
```
CSS: `background: var(--paper-0)`, `border: 1.5px solid var(--line)`, no blur

**Ghost Button**
```jsx
<button className="text-signal font-medium px-4 py-2 rounded-lg
                   hover:bg-signal-subtle transition-colors duration-150">
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
      Watch this page
    </button>
  </div>
</div>
```

**Finding Cards (3 types — solid with colored left border)**
```jsx
{/* Issue — danger left border */}
<div className="finding-issue p-5">
  <p className="font-medium text-ink-900">Issue title</p>
  <p className="text-sm text-ink-500 mt-1">Explanation</p>
  <p className="text-sm font-medium text-signal mt-2">Fix: ...</p>
</div>

{/* Suggestion — signal left border */}
<div className="finding-suggestion p-5">
  <p className="font-medium text-ink-900">Suggestion title</p>
  <p className="text-sm text-ink-500 mt-1">Explanation</p>
</div>

{/* Strength — success left border */}
<div className="finding-strength p-5">
  <p className="font-medium text-ink-900">Strength title</p>
  <p className="text-sm text-ink-500 mt-1">Explanation</p>
</div>
```

**Score Arc (SVG half-gauge, animated)**
Uses a gradient arc from signal → paper on a subtle track. Letter grade + numeric score displayed inside.

**Category Score Card (interactive)**
```jsx
<button className={isActive ? "glass-card-active p-5" : "glass-card p-5"}>
  <p className="text-sm font-semibold text-ink-500 uppercase tracking-wide mb-2">
    Category Name
  </p>
  <p className="text-4xl font-black" style={{ fontFamily: 'var(--font-display)' }}>
    68
  </p>
  <div className="progress-track mb-3">
    <div className="progress-fill" style={{ width: '68%', backgroundColor: 'var(--warning)' }} />
  </div>
</button>
```

**Badge/Pill**
```jsx
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md
                 text-sm font-medium bg-paper-100 text-ink-700
                 border border-line-subtle">
  Marketing <span className="font-bold text-ink-900">68</span>
</span>
```

### Page Layouts

**Homepage (landing / free audit tool)**
1. Hero: Space Grotesk headline + subtext + brutalist input card + trust line. Centered on paper-0. No decorative orbs.
2. Example result preview: static mock of a result card (score, categories, sample findings)
3. Closing CTA: Space Grotesk headline + repeated input on paper-100 bg.
4. No nav links, no logo bars, no pricing, no feature grids for MVP.

**Results page (the shareable moment) — 6 zones, max-w-[1080px]**
1. Hero Score Band: Score arc (SVG animated 0→score) + verdict + category breakdown in elevated card. 3-column layout.
2. Quick Diagnosis: Working vs. Leaking two-column grid with check/x icons.
3. Top 3 Actions: Numbered items (1 large + prominent, 2-3 smaller). Ranked by conversion impact.
4. Headline Rewrite: Current (strikethrough) → Suggested (signal-tinted card) with reasoning.
5. Category Grid + Findings Panel: 3×2 interactive cards → clicking filters findings. Sticky sidebar nav + filtered findings.
6. Bottom CTA: Email capture ("Watch this page") in elevated card + share links.

### Copy Rules (In-Product)

- **Celebratory, not alarming** — "You made the change. See what it did." not "WARNING: issues found"
- **Supportive** — "Your next change is coming. This time, you'll know."
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
- **Easing**: `cubic-bezier(0.2, 0.8, 0.2, 1)` for snappy, controlled feel

### What to Avoid

- Glassmorphism (backdrop-blur, translucent rgba backgrounds)
- Violet accent color (#5B2E91) — replaced by signal orange
- Multi-layer soft shadows — use minimal or none
- Decorative blur orbs
- Rounded corners > 12px (no rounded-2xl or rounded-3xl)
- Near-black backgrounds (#0F1117)
- Electric cyan (#00D4FF) accents
- Purple AI gradients
- Bento grids
- Generic SaaS template look
- Heavy animations
- Dashboard overload
- Poppins, Roboto, Lato, Open Sans for anything
- Instrument Serif, DM Sans (old palette)
- Noise texture overlays

### Implementation Checklist

Before shipping, verify:
- [ ] Aesthetic is Soft Brutalism 2.0 (not glass, not generic minimal)
- [ ] Headlines use Space Grotesk, body uses Inter, code uses IBM Plex Mono
- [ ] Accent color is signal #FF5A36 (not violet, not cyan)
- [ ] Cards use solid backgrounds with 1.5-2px borders (no blur)
- [ ] Background is paper-0 #F7F4EC (warm, not cold gray)
- [ ] Border radius is 8px (cards) or 12px (larger elements)
- [ ] No backdrop-filter blur anywhere
- [ ] Light mode is the default
- [ ] Mobile-first responsive (test at 375px)
- [ ] Score colors: success #15803D (80+), warning #B45309 (60-79), danger #B91C1C (<60)
- [ ] Buttons have active:scale-[0.98] for tactile feel
- [ ] Does not look like generic AI startup template

---

## Design Decision Protocol

**Before writing any code, confirm the aesthetic direction is Soft Brutalism 2.0 (as defined above).** For any new page or component, ask: does this feel confident, solid, and distinctive?

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
**Display/Headlines:** Space Grotesk, Clash Display, Cabinet Grotesk, Satoshi
**Body Text:** Inter, Plus Jakarta Sans, General Sans
**Monospace:** IBM Plex Mono, Geist Mono, Berkeley Mono, JetBrains Mono

### Fonts That Feel Dated
**Avoid:** Poppins, Roboto, Open Sans, Lato, Instrument Serif (overused in 2024)
