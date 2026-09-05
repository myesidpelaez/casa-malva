# Design System — Casa Malva

> **LOGIC:** When building a specific page, first check `design-system/casa-malva/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
>
> **SINGLE SOURCE OF TRUTH:** The canonical tokens live in `src/app/globals.css`.
> This file is a human-readable mirror. If they diverge, `globals.css` wins.

---

**Project:** Casa Malva · Estudio de Belleza
**Curated:** 2026-08-26 (from UI/UX Pro Max output + real code audit)
**Category:** Luxury Beauty/Spa/Wellness Service
**Location:** Medellín, Colombia

---

## Global Rules

### Color Palette — Escala Malva (marca)

| Stop | Hex (Light) | Hex (Dark) | CSS Variable |
|------|-------------|------------|--------------|
| 50 | `#faf5f8` | `#2a1b26` | `--cm-malva-50` |
| 100 | `#f3eaf0` | `#3b2435` | `--cm-malva-100` |
| 200 | `#e8d5e1` | `#523049` | `--cm-malva-200` |
| 300 | `#d4b3c8` | `#703f64` | `--cm-malva-300` |
| 400 | `#b98aa8` | `#965786` | `--cm-malva-400` |
| 500 | `#9c6489` | `#b878a6` | `--cm-malva-500` |
| 600 | `#7b4b6e` | `#c9a3ba` | `--cm-malva-600` |
| **700** | **`#663D5B`** | `#dcbacf` | `--cm-malva-700` — **Brand Primary** |
| 800 | `#52324a` | `#ebdce4` | `--cm-malva-800` |
| 900 | `#3d2537` | `#f7f0f4` | `--cm-malva-900` |
| 950 | `#2a1525` | — | `--color-malva-950` |

### Accent Colors

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Blush** | `#e8c4cf` | `--color-blush` | Soft backgrounds, aurora blobs |
| **Champagne** | `#e6d5bd` | `--color-champagne` | Warm accents, surface tints |
| **Sage** | `#c3d0c4` | `--color-sage` | Success-adjacent, wellness |
| **Oro Editorial** | `#c5a059` | `--color-oro-editorial` | Headline gradient terminus |

### Neutrals — Ink Scale (warm-tinted, never pure gray)

| Stop | Hex (Light) | Hex (Dark) | Usage |
|------|-------------|------------|-------|
| 900 | `#1a1618` | `#efe8ec` | Primary text |
| 700 | `#453d43` | `#ded5da` | Secondary text |
| 500 | `#6b6268` | `#a89aa4` | Tertiary / captions |
| 400 | `#8d848a` | `#8d848a` | Placeholder text |
| 300 | `#b5abb1` | `#6b6268` | Borders (strong) |
| 200 | `#ded5da` | `#453d43` | Borders (subtle) |
| 100 | `#efe8ec` | `#2a2228` | Dividers, card borders |
| 50 | `#faf8f9` | `#221c21` | Subtle backgrounds |

### Surfaces

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--canvas` | `#faf8f9` | `#171316` | Page background |
| `--card` | `#ffffff` | `#221c21` | Card / elevated surface |

### Semantic Status Colors

| Role | Light | Dark |
|------|-------|------|
| Success | `#2f7d5b` | `#48bb78` |
| Warning | `#9a6a1f` | `#ecc94b` |
| Danger | `#b4462f` | `#f56565` |
| Info | `#3d5a80` | `#63b3ed` |

---

## Typography

- **Heading Font:** **Fraunces** (variable, optical size) → `--font-display`
- **Body Font:** **Inter** (variable) → `--font-sans`
- **Mood:** Elegant, editorial, botanical, warm, premium
- **Best For:** Luxury beauty, spa, editorial wellness

> ⚠️ **NOT Playfair Display.** Fraunces was chosen for its optical size axis and
> softer personality. This was a deliberate design decision from `DISENO.md`.

### Font Scale (used in components)

| Element | Size | Weight | Font |
|---------|------|--------|------|
| Hero H1 | `44px` / `68px` (sm) | 600 | Fraunces |
| Section H2 | `32px` / `46px` (sm) | 600 | Fraunces |
| Card Title | `17-19px` | 600 | Fraunces |
| Body | `14-16px` | 400 | Inter |
| Caption | `11-13px` | 500-600 | Inter |
| Button | `14-15px` | 600 | Inter |

---

## Spacing — Fibonacci Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-fib-1` | `8px` | Tight gaps, icon spacing |
| `--spacing-fib-2` | `13px` | Small padding |
| `--spacing-fib-3` | `21px` | Standard padding |
| `--spacing-fib-4` | `34px` | Section padding |
| `--spacing-fib-5` | `55px` | Large section gaps |
| `--spacing-fib-6` | `89px` | Hero / hero-level spacing |

---

## Border Radii — Continuous corners (Apple-style)

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | `8px` | Badges, small chips |
| `--radius-sm` | `12px` | Inputs, small cards |
| `--radius-md` | `16px` | Medium cards |
| `--radius-lg` | `22px` | Large cards, panels |
| `--radius-xl` | `28px` | Modals |
| `--radius-2xl` | `36px` | Hero elements |

---

## Shadows — Layered, low opacity (never a single hard shadow)

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-e1` | `0 1px 2px rgba(26,22,24,0.04), 0 1px 1px rgba(26,22,24,0.03)` | Subtle lift |
| `--shadow-e2` | `0 2px 4px rgba(26,22,24,0.04), 0 4px 12px rgba(26,22,24,0.05)` | Cards, buttons |
| `--shadow-e3` | `0 4px 8px rgba(26,22,24,0.04), 0 12px 28px rgba(26,22,24,0.07)` | Modals, dropdowns |
| `--shadow-e4` | `0 8px 16px rgba(26,22,24,0.05), 0 24px 56px rgba(26,22,24,0.1)` | Hero images |
| `--shadow-malva` | brand-tinted purple glow | Featured / highlighted |

---

## Glass / Frost Material System

Casa Malva uses a **glassmorphism material layer** with semantic tokens:

| Token | Light | Dark |
|-------|-------|------|
| `--glass-blur` | `20px` | `20px` |
| `--glass-saturate` | `180%` | `180%` |
| `--glass-tint` | `rgba(255,255,255,0.62)` | `rgba(34,28,33,0.65)` |
| `--glass-border` | `rgba(255,255,255,0.7)` | `rgba(201,163,186,0.2)` |

---

## Animation Curves

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances, reveals |
| `--ease-in-out-soft` | `cubic-bezier(0.4, 0, 0.2, 1)` | Hover transitions |
| `--duration-fast` | `160ms` | Hover color changes |
| `--duration-base` | `260ms` | Standard transitions |
| `--duration-slow` | `420ms` | Page transitions |

---

## Style Guidelines

**Style:** Soft UI Evolution + Editorial Magazine (hybrid)

**Keywords:** Evolved soft UI, editorial luxury, botanical wellness, subtle depth,
accessibility-focused, improved shadows, warm neutrals

**Best For:** Premium beauty studios, luxury wellness, botanical skincare,
high-end appointment booking

**Key Effects:** Layered shadows, glass materials, gradient headlines (malva→oro),
organic aurora backgrounds (`blur-[110px]`), micro-zoom on hover

### Bimodal Theme System

Casa Malva supports **both Light and Dark modes** via `data-theme` attribute.

```css
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

> ⚠️ **NEVER** use `@media (prefers-color-scheme: dark)` or bare `dark:` utilities.
> All dark mode is controlled via `data-theme` on the root element.

### Page Pattern

**Pattern Name:** Hero-Centric + Editorial Lookbook

- **CTA Placement:** Above fold
- **Section Order:** Hero > Specialty Selector > Service Grid > Trust/Policy > CTA

---

## Anti-Patterns (Do NOT Use)

- ❌ **Bright neon colors** — Use the malva/blush/champagne palette
- ❌ **Harsh animations** — Always ease-out-expo or ease-in-out-soft
- ❌ **Emojis as icons** — Use Lucide React icons exclusively
- ❌ **Missing cursor:pointer** — All clickable elements must have it
- ❌ **Layout-shifting hovers** — Avoid transforms that reflow
- ❌ **Low contrast text** — 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always 160-420ms transitions
- ❌ **Invisible focus states** — Focus must be visible for a11y
- ❌ **Pure gray neutrals** — Always warm-tinted (ink scale)
- ❌ **`@media (prefers-color-scheme)`** — Use `data-theme` variant only
- ❌ **Fallback defaults for missing data** — Fail closed (CODIGO.md rule 3)
- ❌ **Server-timezone dates** — Always `America/Bogota` (CODIGO.md rule 4)

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (Lucide only)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (160-420ms)
- [ ] Text contrast 4.5:1 minimum (both themes)
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
- [ ] Dark mode renders correctly via `data-theme`
- [ ] All colors from token scale, no raw hex in components
- [ ] `npx tsc --noEmit` passes with 0 errors
