# CLAUDE AI ASSISTANT RULES

## MEMORY BANK – START PROCEDURE

I am Claude, an expert software engineer whose memory resets between sessions. The memory bank is the single source of truth that gets me back up to speed. Read only what is required, keep it lean, and update it when reality changes.

### Memory Bank Layout
```
memory-bank/
├── README.md           → project context, commands, env vars (START HERE)
├── product.md          → user flows, data schema, features
├── architecture.md     → system design, API patterns, tech details
├── decisions.md        → key choices and rationale ("why")
└── phases/
    ├── current.md      → what to work on RIGHT NOW
    └── roadmap.md      → future phases overview
```

### Startup Procedure
1. **Always read first**: `README.md` → `phases/current.md`
2. **When building features**: Also read `product.md`
3. **When building backend/infra**: Also read `architecture.md`
4. **When you need "why"**: Check `decisions.md`

### Documentation Updates
Update the memory bank when:
- You complete a phase → update `phases/current.md` with next phase
- Architecture changes → update `architecture.md`
- New decision made → add to `decisions.md`

Keep docs lean. Intent over implementation. Agents can generate code from descriptions.

## BEHAVIORAL RULES

### Project Context: Solo Developer MVP
**This is a solo developer project building an MVP, not an enterprise application.**
- Prioritize working solutions over perfect architecture
- Avoid over-engineering for theoretical scale problems
- Focus on shipping features that work, not gold-plating
- Safe and solid beats premature optimization

### Communication & Decision Making
- Ask before making major feature or architecture changes.
- Get approval before adding dependencies or altering core workflows.
- Explain your reasoning when proposing changes; surface trade-offs early.

### Minimal First Implementation
1. Ask: "What is the smallest change that solves this?"
2. Implement only that minimum.
3. Stop and check in before layering abstractions, helpers, or advanced error handling.
4. Follow KISS and YAGNI — do not build for hypothetical futures without explicit direction.
5. **Solo dev context**: Skip enterprise patterns unless explicitly needed.

### Codebase Hygiene: Modify, Don't Multiply
**The default action is EDIT, not CREATE.**

1. **Search before creating**: Before making a new file, component, or utility, search the codebase for existing implementations to extend or modify.
2. **Extend existing files**: Add functionality to existing files rather than creating parallel structures.
3. **Clean as you go**: Remove dead code, unused imports, and orphaned files.
4. **No abandoned code**: If you replace a component or approach, delete the old one.
5. **Verify references**: After any file operation, confirm imports and references still resolve.

### CSS Rules
**CSS is split by feature into `src/app/*.css`. Never dump styles into globals.css.**

1. **Use the right file**: `shared.css` (cards, buttons, nav, modals), `chronicle.css`, `dashboard.css`, `landing.css`, `analysis.css`, `pricing.css`. `globals.css` is tokens + imports only.
2. **Reuse before creating**: Check `shared.css` for existing patterns (`.glass-card`, `.btn-primary`, `.btn-secondary`, `.input-glass`, `.element-badge`, `.score-ring-glow-*`). Use Tailwind utilities for one-off styles.
3. **Prefer Tailwind + existing classes**: Don't create new CSS classes for styles achievable with Tailwind or existing shared classes. New CSS classes are for reusable patterns used 3+ times.
4. **Delete when replacing**: If you redesign a component, remove its old CSS classes. Grep to confirm they're unused first.
5. **No orphan CSS**: When deleting/renaming a component, delete its CSS classes too. When removing a CSS class, also remove it from `@media (prefers-reduced-motion)` in globals.css if referenced there.
6. **BEM-style prefixes**: Scope classes to their feature (`chronicle-*`, `landing-hero-*`, `result-card-*`). Never use generic names like `.card` or `.header`.

### LLM Model Usage - CRITICAL
**NEVER change LLM model names or configurations without explicit authorization.**

## SUBAGENTS & DELEGATION

### Available Specialized Subagents

#### Development & Architecture
- **code-reviewer**: Proactive code quality, security, and maintainability reviews
- **code-architect**: Software architecture and folder structure design
- **backend-architect**: Backend system design and architecture guidance
- **frontend-developer**: Elite frontend specialist for modern web development
- **ui-designer**: Visionary UI designer for rapid, implementable interfaces

#### Growth & Marketing
- **brand-guardian**: Brand strategy, positioning, and voice consistency (Loupe-specific)
- **growth-hacker**: Strategic marketing combining positioning, brand, and growth tactics
- **copywriter**: Direct-response copywriting for conversion

#### Compliance & Legal
- **legal-compliance-checker**: Regulatory compliance and legal requirements

### Delegation Triggers
Use judgment — subagents are helpful but not mandatory for every tiny change:

1. **code-reviewer**: Use for significant features or refactors
2. **code-architect**: Use when designing new feature modules
3. **backend-architect**: Use for major architectural decisions
4. **frontend-developer**: Use for complex UI or performance issues
5. **ui-designer**: **MANDATORY for new frontend features/elements**
6. **brand-guardian**: Use for brand positioning, voice, messaging decisions
7. **copywriter**: Use for any customer-facing copy
8. **legal-compliance-checker**: Use before launch or when handling user data

## SKILLS

### Available Skills
- **frontend-design**: Guidelines for creating distinctive, high-quality frontend UI
  - **MANDATORY** for all frontend work
- **copywriter**: Brand voice, copy patterns, and anti-patterns for customer-facing text
  - **MANDATORY** for any customer-facing copy

### Frontend Work Requirements
**Any change to frontend code MUST follow this workflow:**
1. Invoke the `frontend-design` skill FIRST
2. New features → consult `ui-designer` subagent BEFORE implementing
3. Implement following skill guidelines
4. Test thoroughly
