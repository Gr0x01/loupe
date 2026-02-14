---
name: frontend-design
description: Guidelines for creating distinctive, high-quality frontend UI. Use when building or modifying React components, pages, or visual elements.
---

# Frontend Design Guidelines (2025-2026)

---

## Loupe Project: Light Brutalist 2.0

**Aesthetic: Refined brutalism — clean SaaS with personality.**
Cool gray surfaces, solid 2px borders, offset shadows, multi-color accents. Confident typography with a cool paper palette and coral CTA.

### The Formula

| Layer | Direction |
|-------|-----------|
| **Visuals** | Solid surfaces — cool gray backgrounds, 2px borders, offset shadows, no blur effects |
| **Typography** | Geometric punch — Space Grotesk for headlines, Inter for body, IBM Plex Mono for data |
| **Copy** | Supportive, celebratory — "You made the change. See what it did." not "Alert detected!" |
| **Colors** | Coral (#FF6B4A) primary CTA on cool paper (#F8FAFC), multi-color accents for sections |

### Color Palette

```css
:root {
  /* ===== REFINED BRUTALISM — CLEAN SAAS ===== */

  /* Ink — Text hierarchy */
  --ink-900: #0F172A;
  --ink-700: #334155;
  --ink-500: #64748B;
  --ink-300: #94A3B8;

  /* Paper — Cool gray backgrounds */
  --paper-0: #F8FAFC;
  --paper-100: #F1F5F9;
  --paper-200: #E2E8F0;

  /* Line — Borders (muted gray, never black) */
  --line: #9AAABD;
  --line-subtle: rgba(100, 116, 139, 0.34);

  /* Multi-color accent palette */
  --coral: #FF6B4A;
  --coral-hover: #F85A38;
  --coral-subtle: rgba(255, 107, 74, 0.1);
  --coral-border: rgba(255, 107, 74, 0.3);

  --blue: #3B82F6;
  --blue-subtle: rgba(59, 130, 246, 0.1);

  --violet: #8B5CF6;
  --violet-subtle: rgba(139, 92, 246, 0.1);

  --emerald: #10B981;
  --emerald-subtle: rgba(16, 185, 129, 0.1);

  --amber: #F59E0B;
  --amber-subtle: rgba(245, 158, 11, 0.1);

  /* Signal — Primary CTA (coral) */
  --signal: var(--coral);
  --signal-hover: var(--coral-hover);
  --signal-subtle: var(--coral-subtle);

  /* Semantic colors */
  --success: #059669;
  --success-subtle: rgba(5, 150, 105, 0.1);
  --warning: #D97706;
  --warning-subtle: rgba(217, 119, 6, 0.1);
  --danger: #DC2626;
  --danger-subtle: rgba(220, 38, 38, 0.1);

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
| Border radius | 10px default, 12px for larger/elevated elements |
| Border width | 2px (consistent across cards and buttons) |
| Border color | `var(--line)` (#9AAABD) — muted gray, never black |
| Shadows | Offset: `2px 2px 0 rgba(51, 65, 85, 0.14)` (standard), `4px 4px 0` (elevated) |
| Blur | NEVER use backdrop-filter blur on surfaces |
| Motion | 180ms, `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| Section accents | Use colored badges (blue, violet, emerald, amber) to differentiate sections |

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

**Cards (standard — brutalist with offset shadow)**
```jsx
<div className="glass-card p-6">
```
CSS: `background: #FFFFFF`, `border: 2px solid var(--line)`, `border-radius: 10px`, `box-shadow: 2px 2px 0 rgba(51, 65, 85, 0.14)`

**Cards (elevated — stronger shadow)**
```jsx
<div className="glass-card-elevated p-8">
```
CSS: `background: #FFFFFF`, `border: 2px solid var(--line)`, `border-radius: 12px`, `box-shadow: 4px 4px 0 rgba(51, 65, 85, 0.16)`

**Cards (active/selected)**
```jsx
<div className="glass-card-active p-5">
```
CSS: `border: 2px solid var(--signal)`, signal-tinted shadow

**Primary Button (coral)**
```jsx
<button className="btn-primary">Watch this page</button>
```
CSS: `background: var(--signal)` (#FF6B4A), white text, `border: 2px solid var(--line)`, `border-radius: 10px`, `active: scale(0.98)`

**Secondary Button (outlined)**
```jsx
<button className="btn-secondary">Share this audit</button>
```
CSS: `background: var(--paper-0)`, `border: 2px solid var(--line)`, no blur

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

**Badge/Pill**
```jsx
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md
                 text-sm font-medium bg-paper-100 text-ink-700
                 border border-line-subtle">
  Label
</span>
```

**Section Accent Badges** — Use colored backgrounds to differentiate sections:
```jsx
{/* Blue badge for "Your page" section */}
<span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
      style={{ background: 'var(--blue-subtle)', color: 'var(--blue)' }}>
  Your page
</span>

{/* Violet badge for "Your results" section */}
<span style={{ background: 'var(--violet-subtle)', color: 'var(--violet)' }}>
  Your results
</span>
```

### Page Layouts

**Homepage (landing / free audit tool)**
1. Hero: Space Grotesk headline + subtext + brutalist input card + trust line. Centered on paper-0. No decorative orbs.
2. Your Page: Audit preview showing what Loupe sees (findings, predictions)
3. Your Results: Feature grid (timeline, verdicts, metrics, history)
4. Closer: Space Grotesk headline + CTA on paper-100 bg.

**Results page (the shareable moment) — 6 zones, max-w-[1080px]**
1. Hero: Verdict-first display with impact bar + opportunity count
2. Quick Diagnosis: Working vs. Leaking two-column grid
3. Top 3 Actions: Ranked by conversion impact
4. Headline Rewrite: Current → Suggested with reasoning
5. Findings: Collapsible cards with predictions + methodology
6. Bottom CTA: "Watch this page" + share links

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
- Warm paper backgrounds (#F7F4EC) — old palette, use cool gray #F8FAFC
- Signal orange (#FF5A36) — old accent, use coral #FF6B4A
- Dark borders (#1a1a1a) — old line color, use muted gray #9AAABD
- Multi-layer soft shadows — use offset shadows only
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
- [ ] Aesthetic is Light Brutalist 2.0 (not glass, not generic minimal)
- [ ] Headlines use Space Grotesk, body uses Inter, code uses IBM Plex Mono
- [ ] Primary CTA color is coral #FF6B4A (not orange #FF5A36, not violet, not cyan)
- [ ] Cards use solid white backgrounds with 2px borders in `var(--line)` (#9AAABD)
- [ ] Cards have offset shadows (`2px 2px 0` or `4px 4px 0`)
- [ ] Background is paper-0 #F8FAFC (cool gray, not warm #F7F4EC)
- [ ] Border radius is 10px (cards) or 12px (elevated elements)
- [ ] Section accents use multi-color palette (blue, violet, emerald, amber badges)
- [ ] No backdrop-filter blur anywhere
- [ ] Light mode is the default
- [ ] Mobile-first responsive (test at 375px)
- [ ] Buttons have active:scale-[0.98] for tactile feel
- [ ] Does not look like generic AI startup template

---

## Design Decision Protocol

**Before writing any code, confirm the aesthetic direction is Light Brutalist 2.0 (as defined above).** For any new page or component, ask: does this feel confident, solid, and distinctive?

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
