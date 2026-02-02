---
name: frontend-design
description: Guidelines for creating distinctive, high-quality frontend UI. Use when building or modifying React components, pages, or visual elements.
---

# Frontend Design Guidelines (2025-2026)

---

## Loupe Project: Dark Tech + Editorial Punch

**Aesthetic: Dark UI + Editorial hybrid.**
Bold, tech-forward, confident. Like a sharp developer tool with editorial flair. Dark backgrounds, electric cyan accent, bold serif headlines, crisp hierarchy.

### The Formula

| Layer | Direction |
|-------|-----------|
| **Visuals** | Dark tech — dark cards on near-black canvas, subtle borders, generous whitespace |
| **Typography** | Editorial punch — Instrument Serif for hero headlines, DM Sans for everything else |
| **Copy** | Watchful, calm, specific — "Your hero text changed" not "ALERT: Change detected!" |
| **Colors** | Cool, confident — light text on dark backgrounds, electric cyan (#00D4FF) accent |

### Color Palette

```css
:root {
  /* Backgrounds — Cool Dark */
  --bg-primary: #0F1117;         /* Near-black — page canvas */
  --bg-secondary: #161922;       /* Slightly lighter — alternate sections */
  --surface: #1C1F2E;            /* Dark card surface */
  --surface-hover: #252838;      /* Card hover / elevated surface */

  /* Text */
  --text-primary: #F0F0F3;       /* Near-white */
  --text-secondary: #9BA1B0;     /* Body copy, descriptions */
  --text-muted: #5C6170;         /* Labels, timestamps, hints */

  /* Accent — Electric Cyan */
  --accent: #00D4FF;             /* Primary CTA, links, key highlights */
  --accent-hover: #00B8E0;       /* Darker on hover */
  --accent-muted: rgba(0, 212, 255, 0.12); /* Cyan tint background */

  /* Borders */
  --border: #252838;             /* Standard border */
  --border-strong: #363A4A;      /* Stronger border for emphasis */

  /* Semantic — Scores */
  --score-high: #34D399;         /* Green — good scores (80+) */
  --score-mid: #FBBF24;          /* Amber — okay scores (60-79) */
  --score-low: #F87171;          /* Red — problem scores (<60) */
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

### Key Patterns

**Cards (standard)**
```jsx
<div className="bg-[#1C1F2E] rounded-xl border border-[#252838] p-6
                shadow-[0_2px_20px_rgba(0,0,0,0.3)]">
```

**Cards (elevated — hero input, score display)**
```jsx
<div className="bg-[#1C1F2E] rounded-2xl border border-[#252838] p-8
                shadow-[0_4px_32px_rgba(0,0,0,0.4)]">
```

**Primary Button (cyan)**
```jsx
<button className="bg-[#00D4FF] text-[#0F1117] font-semibold px-6 py-3 rounded-xl
                   hover:bg-[#00B8E0] active:scale-[0.98]
                   transition-all duration-150">
  Audit this page
</button>
```

**Secondary Button (outline)**
```jsx
<button className="bg-transparent text-[#F0F0F3] font-medium px-6 py-3 rounded-xl
                   border border-[#363A4A] hover:border-[#F0F0F3]
                   hover:bg-[#252838] active:scale-[0.98]
                   transition-all duration-150">
  Share this audit
</button>
```

**Ghost Button**
```jsx
<button className="text-[#00D4FF] font-medium px-4 py-2 rounded-lg
                   hover:bg-[rgba(0,212,255,0.12)] transition-colors duration-150">
  Audit another page
</button>
```

**Hero Input Card**
```jsx
<div className="bg-[#1C1F2E] rounded-2xl border border-[#252838] p-4
                shadow-[0_4px_32px_rgba(0,0,0,0.4)]">
  <div className="flex flex-col sm:flex-row items-stretch gap-3">
    <input
      type="text"
      inputMode="url"
      placeholder="https://yoursite.com"
      className="flex-1 bg-transparent text-[#F0F0F3] placeholder-[#5C6170]
                 text-lg px-3 py-3 outline-none"
    />
    <button className="bg-[#00D4FF] text-[#0F1117] font-semibold px-8 py-3 rounded-xl
                       hover:bg-[#00B8E0] active:scale-[0.98]
                       transition-all duration-150 whitespace-nowrap">
      Audit this page
    </button>
  </div>
</div>
```

**Finding Cards (3 types — dark variants with colored left border)**
```jsx
{/* Issue — red left border */}
<div className="bg-[#1C1F2E] border border-[#252838] border-l-4 border-l-[#F87171] rounded-xl p-5">
  <p className="font-medium text-[#F0F0F3]">Issue title</p>
  <p className="text-sm text-[#9BA1B0] mt-1">Explanation</p>
  <p className="text-sm font-medium text-[#F87171] mt-2">Suggestion: ...</p>
</div>

{/* Suggestion — cyan left border */}
<div className="bg-[#1C1F2E] border border-[#252838] border-l-4 border-l-[#00D4FF] rounded-xl p-5">
  <p className="font-medium text-[#F0F0F3]">Suggestion title</p>
  <p className="text-sm text-[#9BA1B0] mt-1">Explanation</p>
</div>

{/* Strength — green left border */}
<div className="bg-[#1C1F2E] border border-[#252838] border-l-4 border-l-[#34D399] rounded-xl p-5">
  <p className="font-medium text-[#F0F0F3]">Strength title</p>
  <p className="text-sm text-[#9BA1B0] mt-1">Explanation</p>
</div>
```

**Score Ring (SVG-based, animated)**
```jsx
<svg viewBox="0 0 140 140" className="w-[140px] h-[140px]">
  <circle cx="70" cy="70" r="60" fill="none" stroke="#252838" strokeWidth="10" />
  <circle cx="70" cy="70" r="60" fill="none" stroke={scoreColor} strokeWidth="10"
          strokeDasharray={`${(score / 100) * 377} 377`}
          strokeLinecap="round" transform="rotate(-90 70 70)"
          className="transition-all duration-1000" />
</svg>
```

**Category Score Card (interactive)**
```jsx
<div className="bg-[#1C1F2E] rounded-xl border border-[#252838] p-5 cursor-pointer
                hover:border-[#363A4A] transition-colors">
  <span className="text-xs font-medium text-[#5C6170] uppercase tracking-wide">
    Marketing
  </span>
  <span className="text-3xl text-[#F0F0F3]" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
    68
  </span>
  <div className="h-1.5 bg-[#252838] rounded-full overflow-hidden mt-2">
    <div className="h-full rounded-full transition-all duration-700"
         style={{ width: '68%', backgroundColor: '#FBBF24' }} />
  </div>
</div>
```

**Badge/Pill**
```jsx
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                 text-sm font-medium bg-[#252838] text-[#9BA1B0] border border-[#363A4A]">
  Marketing <span className="font-bold text-[#F0F0F3]">68</span>
</span>
```

### Page Layouts

**Homepage (landing / free audit tool)**
1. Hero: Instrument Serif headline + subtext + elevated input card + trust line. Centered on #0F1117. Nothing else above fold.
2. Example result preview: static mock of a result card (score, categories, sample findings)
3. Closing CTA: Instrument Serif italic + repeated input on #161922 bg.
4. No nav links, no logo bars, no pricing, no feature grids for MVP.

**Results page (the shareable moment) — 5 zones, full-width (max-w-[1400px])**
1. Hero Score Band: Score ring (SVG animated 0->score) + summary + screenshot in browser chrome. 2 columns.
2. Top 3 Actions: 3 cards with cyan left border + numbered badges. The quick wins.
3. Category Grid: 3x2 interactive cards. Clicking filters findings. Active card gets cyan glow.
4. Findings Panel: 2-col layout — sticky sidebar nav left + filtered findings right. Sorted: issues → suggestions → strengths.
5. Bottom CTA: email capture ("Watch this page") + share links + audit another ghost button.

### Copy Rules (In-Product)

- **Calm, not alarming** — "3 changes detected this week" not "WARNING: 3 issues found"
- **Specific over general** — "Hero headline changed" not "Content change detected"
- **Before/after always** — show what was and what is
- **No jargon** — "Your page changed" not "Visual regression detected"
- **Human timestamps** — "Last Tuesday" or "2 days ago" not ISO timestamps
- **Empty states are positive** — "No changes this week. Your page is stable."

### Motion Principles

- **ONE hero animation per page**: Score ring fill on results page. That is it.
- **Subtle transitions**: fade-ins on section reveal, smooth expand/collapse
- **Tactile buttons**: `active:scale-[0.98]` on all buttons
- **Loading states**: stepped progress ("Screenshotting your page... Reading headlines and CTAs... Writing your audit...")
- **No bounces or springs** — feels unreliable for a monitoring tool
- **Progress bars**: animate width with `transition-all duration-700`

### What to Avoid

- Coral/orange/warm-red accents — too close to Boost (aboo.st)
- Warm white backgrounds (#FDFCFA) — too close to Boost
- Stone/paper aesthetic — too soft for a tech tool
- Light mode by default — this is a dark UI product
- Purple AI gradients — the cliche
- Bento grids — oversaturated
- Generic SaaS template look
- Heavy animations — one hero moment, everything else is subtle
- Dashboard overload — this is a focused tool, not Datadog
- Inter, Poppins, Roboto, Geist for headlines (Geist Mono is fine for code)
- `rounded-md` for cards — use `rounded-xl` or `rounded-2xl`

### Implementation Checklist

Before shipping, verify:
- [ ] Aesthetic is Dark Tech + Editorial (not generic minimal, not light/papery)
- [ ] Hero headlines use Instrument Serif, UI uses DM Sans
- [ ] Accent color is electric cyan #00D4FF (not coral, not teal, not blue-500)
- [ ] Cards use bg-[#1C1F2E] on #0F1117 dark background with rounded-xl
- [ ] Background is #0F1117 (cool dark), NOT white, stone gray, or warm white
- [ ] Audit results page has animated score ring (the memorable moment)
- [ ] Dark mode is the default
- [ ] Mobile-first responsive (test at 375px)
- [ ] Score colors: green #34D399 (80+), amber #FBBF24 (60-79), red #F87171 (<60)
- [ ] Buttons have active:scale-[0.98] for tactile feel
- [ ] Does not look like Boost (no coral, no warm white)
- [ ] Does not look like a generic SaaS template

---

## Design Decision Protocol

**Before writing any code, confirm the aesthetic direction is Dark Tech + Editorial (as defined above).** For any new page or component, ask: does this feel bold, tech-forward, and distinctive?

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
