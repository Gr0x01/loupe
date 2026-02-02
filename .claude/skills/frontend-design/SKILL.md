---
name: frontend-design
description: Guidelines for creating distinctive, high-quality frontend UI. Use when building or modifying React components, pages, or visual elements.
---

# Frontend Design Guidelines (2025-2026)

---

## Driftwatch Project: Clean Minimal + Watchful Calm

**For this project, use a clean, minimal aesthetic that feels trustworthy, precise, and quietly confident.**

### The Formula

| Layer | Direction |
|-------|-----------|
| **Visuals** | Clean minimal — generous whitespace, precise typography, subtle borders, muted palette with one accent |
| **Copy** | Watchful, calm, specific — "Your hero text changed" not "ALERT: Change detected!" |
| **Colors** | Cool, professional — slate/charcoal text, light gray backgrounds, one sharp accent for changes/alerts |

### What "Clean Minimal for a Monitoring Tool" Means

Not meditation-app soft. Not dashboard-gray boring. Think: a well-designed report from someone you trust. Precise, readable, confident.

```css
/* Driftwatch card */
.card {
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* Change indicator — the moment something drifted */
.change-badge {
  background: #FEF3C7;
  color: #92400E;
  border: 1px solid #FDE68A;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 2px 8px;
}

/* Stable indicator */
.stable-badge {
  background: #F0FDF4;
  color: #166534;
  border: 1px solid #BBF7D0;
}
```

### Key Patterns

**Cards (page entries, timeline items)**
```jsx
<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
```

**Before/After Screenshots**
```jsx
{/* Side by side, clean separation, subtle labels */}
<div className="grid grid-cols-2 gap-4">
  <div>
    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Before</span>
    <img className="border border-gray-200 rounded-md mt-1" />
  </div>
  <div>
    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">After</span>
    <img className="border border-gray-200 rounded-md mt-1" />
  </div>
</div>
```

**Primary Button**
```jsx
<button className="bg-gray-900 text-white font-medium px-5 py-2.5 rounded-md
                   hover:bg-gray-800 active:bg-gray-950
                   transition-colors duration-100">
  Audit my page
</button>
```

**Change Alert (in timeline)**
```jsx
<div className="border-l-2 border-amber-400 pl-4 py-3">
  <p className="text-sm font-medium text-gray-900">Hero headline changed</p>
  <p className="text-sm text-gray-500 mt-1">
    "2x your conversions" → "AI-powered analytics platform"
  </p>
</div>
```

### Typography

- **Headlines**: Geist or Plus Jakarta Sans — clean, modern, not loud
- **Body**: Geist or DM Sans — readable, professional
- **Monospace** (for code/class references): Geist Mono — when showing DOM changes like `text-5xl → text-3xl`
- **Avoid**: Inter (too generic), Poppins (overused), anything too decorative

### Color Palette

```css
:root {
  --bg: #FAFAFA;           /* Page background */
  --surface: #FFFFFF;       /* Card/panel background */
  --border: #E5E7EB;        /* Borders */
  --text-primary: #111827;  /* Main text */
  --text-secondary: #6B7280; /* Supporting text */
  --text-muted: #9CA3AF;    /* Timestamps, labels */
  --accent: #2563EB;        /* Links, primary actions */
  --change: #D97706;        /* Change indicators (amber) */
  --stable: #059669;        /* Stable/good indicators (green) */
  --issue: #DC2626;         /* Issues/problems (red) */
}
```

### Copy Rules (In-Product)

- **Calm, not alarming** — "3 changes detected this week" not "WARNING: 3 issues found"
- **Specific over general** — "Hero headline changed" not "Content change detected"
- **Before/after always** — show what was and what is
- **No jargon** — "Your page changed" not "Visual regression detected"
- **Human timestamps** — "Last Tuesday" or "2 days ago" not "2026-02-01T14:32:00Z"
- **Empty states are positive** — "No changes this week. Your page is stable." not "No data"

### What to Avoid

- Alarmist red/orange everywhere — amber for changes, red only for actual problems
- Dashboard overload — this isn't Datadog, it's a focused tool
- Dark mode by default — light mode feels more trustworthy for a monitoring tool
- Heavy animations — this tool should feel reliable and fast, not flashy
- Bento grids — oversaturated
- Purple AI gradients — the cliche
- Generic SaaS template look — if it looks like every Vercel template, it's wrong

### The "Memorable Moment"

The audit results page. When someone enters a URL and gets back a specific, actionable analysis of their page with before/after context, DOM references, and concrete suggestions — that's the screenshot-worthy moment. Design it to be shareable.

---

## Generic Design Guidelines (Reference)

For components or pages where the above doesn't specify, use these principles.

## Design Decision Protocol

**Before writing any code, confirm the aesthetic direction is Clean Minimal (as defined above).** For any new page or component, ask: does this feel trustworthy, precise, and calm?

---

## Aesthetic Directions (Reference — other projects)

### 1. Human Scribble
**The antidote to AI-polish.** Hand-drawn doodles, sketch overlays, wobbly lines, marker-style annotations. Feels like a human made it on paper first.

```css
.scribble-underline {
  background-image: url("data:image/svg+xml,...");
  background-repeat: no-repeat;
  background-position: bottom;
}
.sketch-border {
  border: 2px solid currentColor;
  border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
}
```
- **Fonts**: Caveat, Kalam, Patrick Hand, Architects Daughter
- **Colors**: Paper white (#FFFEF9), pencil gray, highlighter accents
- **Details**: Doodle arrows, circled text, crossed-out words, sticky notes

### 2. Nature Distilled
**Muted earthy sophistication.** Palettes of skin, wood, soil, stone. Warm but restrained.

```css
:root {
  --sand: #E8DFD0;
  --clay: #C4A484;
  --bark: #5C4033;
  --moss: #8A9A5B;
  --stone: #787276;
}
```
- **Fonts**: Cormorant, EB Garamond, Libre Baskerville (serifs), DM Sans (clean body)
- **Textures**: Subtle paper grain, linen patterns, organic shapes
- **Motion**: Slow, breathing transitions (600ms+), gentle parallax

### 3. Light Skeuomorphism
**Tactile digital.** Subtle shadows, soft embossing, gentle gradients that suggest real materials.

```css
.card-skeu {
  background: linear-gradient(145deg, #ffffff, #e6e6e6);
  box-shadow: 5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff;
  border-radius: 16px;
}
```
- **Fonts**: SF Pro, Nunito, Quicksand (rounded, friendly)
- **Colors**: Soft whites, gentle grays, one accent color

### 4. Digital Texture
**Jelly, chrome, clay.** Buttons that look squishy. Surfaces that deform. Playful 3D.

```css
.jelly-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50px;
  box-shadow: 0 10px 30px -10px rgba(102, 126, 234, 0.5),
    inset 0 -3px 0 rgba(0,0,0,0.1), inset 0 3px 0 rgba(255,255,255,0.2);
}
```
- **Fonts**: Clash Display, Cabinet Grotesk, Satoshi
- **Colors**: Candy gradients, iridescent effects, soft pastels with pop

### 5. Glow Design
**Futuristic luminescence.** Dark backgrounds with glowing elements, neon accents.

```css
.glow-card {
  background: rgba(20, 20, 30, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
}
```
- **Fonts**: Geist, Instrument Sans, Azeret Mono
- **Colors**: Deep navy/black base, electric blue, violet, cyan accents

### 6. Y2K Revival
**Intentionally chaotic.** Layered text, visual noise, maximalist energy.
- **Fonts**: VT323, Press Start 2P, Orbitron, Plus Jakarta Sans
- **Colors**: Hot pink, electric cyan, lime green, purple gradients

### 7. Glassmorphism (Refined)
**Layered transparency.** Frosted glass panels, subtle blur, floating UI.

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
}
```
- **Fonts**: Inter (allowed here), Outfit, Be Vietnam Pro

### 8. Editorial/Magazine
**Typography-led layouts.** Big type, dramatic hierarchy, generous whitespace.

```css
.editorial-headline {
  font-size: clamp(3rem, 10vw, 8rem);
  font-weight: 300;
  letter-spacing: -0.03em;
  line-height: 0.95;
}
```
- **Fonts**: Newsreader, Fraunces, Instrument Serif

### 9. Brutalist Raw
**Unpolished on purpose.** System fonts, harsh borders, exposed structure.

```css
.brutalist-box {
  border: 3px solid black;
  background: white;
  box-shadow: 8px 8px 0 black;
}
```
- **Fonts**: Courier New, Times New Roman, or ultra-bold sans (Bebas Neue)

### 10. Soft Minimal
**Airy, calming restraint.** Lots of whitespace, muted palette, gentle curves.

```css
.soft-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.04);
}
```
- **Fonts**: Plus Jakarta Sans, General Sans, Switzer

---

## Typography (Updated 2025-2026)

### Fresh Fonts to Use
**Display/Headlines:** Clash Display, Cabinet Grotesk, Satoshi, Outfit, Geist
**Body Text:** Plus Jakarta Sans, General Sans, DM Sans, Geist
**Monospace:** Geist Mono, Berkeley Mono, JetBrains Mono

### Fonts That Feel Dated
**Avoid:** Inter (unless Glassmorphism), Space Grotesk, IBM Plex, Roboto, Open Sans, Lato, Poppins

---

## Motion Principles

### For Driftwatch Specifically
- **Subtle transitions** — fade-ins on page load, smooth expand/collapse on timeline entries
- **No bounces or springs** — feels unreliable for a monitoring tool
- **Loading states** — show progress during audits ("Analyzing headline... Checking visual hierarchy... Reviewing CTA...")
- **Before/after transitions** — smooth crossfade or slider between screenshots

### General Principles
- Micro-delight over micro-interactions — tactile buttons, breathing form fields
- Pick ONE hero animation per page
- Scroll-triggered reveals: staggered fade-ins, 3-5 elements max per viewport

---

## Implementation Checklist

Before shipping, verify:
- [ ] Aesthetic is Clean Minimal (trustworthy, precise, calm)
- [ ] Font is Geist, Plus Jakarta Sans, or DM Sans (not Inter/Roboto/Poppins)
- [ ] Audit results page is the "memorable moment" (shareable, specific, useful)
- [ ] Light mode is the default
- [ ] Mobile-first responsive (test at 375px)
- [ ] Change indicators use amber, not red (calm, not alarming)
- [ ] Before/after is always shown for changes
- [ ] Empty states are positive ("Your page is stable")
- [ ] Doesn't look like a generic SaaS template
