---
name: Orch
description: A spatial knowledge workspace with an embedded agent. Quiet instrument, photographic depth. Dual register — dark cinematic marketing, light precise product.
colors:
  operator-emerald: "#10b981"
  operator-emerald-deep: "#059669"
  operator-emerald-soft: "#d1fae5"
  ink: "#18181b"
  ink-muted: "#52525b"
  ink-dimmed: "#71717a"
  paper: "#f2f7f4"
  paper-pure: "#f7fbf8"
  surface-elevated: "#e8f0eb"
  surface-sunken: "#e2ebe6"
  hairline: "#d5e0d9"
  hairline-strong: "#c5d4cb"
  ink-inverted: "#fafafa"
  paper-inverted: "#09090b"
  surface-inverted: "#141416"
  surface-inverted-elevated: "#1c1c1f"
  hairline-inverted: "#27272a"
  state-success: "#10b981"
  state-warning: "#f59e0b"
  state-error: "#ef4444"
  state-info: "#3b82f6"
typography:
  display:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.75rem, 7vw, 5.5rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  body-lg:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  none: "0"
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  card: "16px"
  full: "9999px"
spacing:
  hairline: "1px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "96px"
  section-lg: "144px"
components:
  button-primary:
    backgroundColor: "{colors.operator-emerald}"
    textColor: "{colors.paper-pure}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.operator-emerald-deep}"
    textColor: "{colors.paper-pure}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-outline-hover:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
  badge:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  input:
    backgroundColor: "{colors.paper-pure}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  input-focus:
    backgroundColor: "{colors.paper-pure}"
    textColor: "{colors.ink}"
  card:
    backgroundColor: "{colors.paper-pure}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  eyebrow:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dimmed}"
    typography: "{typography.label}"
---

# Design System: Orch

## 1. Overview

**Creative North Star: "Quiet instrument, photographic depth"**

Orch is a dual-register system. Marketing is dark and cinematic: large type, generous air, aurora atmosphere reserved for the hero. Product is light and precise: a surface ladder of cool zinc neutrals, hairlines, and one accent used sparingly. Same typographic voice, same component vocabulary, different rhythm and ambient light.

Inspiration (synthesize, don't copy): Apple (whitespace, optical type, glass nav rare), Linear (near-black surface ladder, hairlines), Vercel (hero atmosphere only). Depth comes from tonal steps and light, not from shadow-on-every-card.

The system rejects category defaults. No purple gradient heroes, no animated orbs as brand, no gradient text, no glassmorphism-as-default, no AI neon. The agent is a tool. The canvas is the product.

**Key Characteristics:**

- Restrained color: cool zinc neutrals with a soft emerald-tinted paper (never true white), one accent (Operator Emerald) on ≤10% of any product surface.
- Typographic hierarchy carries the system. IBM Plex Sans (600 display, not shouty 700), IBM Plex Mono for tool traces and metrics.
- Surface ladder, not flat paper. Paper → elevated → sunken → hairline. Shadows only for true float (modals, popovers).
- Radii: 12–16px on cards/inputs; full pills on buttons and badges. No 32px over-round.
- Marketing may use aurora/mesh and blur-text reveals; product stays quiet. `prefers-reduced-motion` is mandatory.

## 2. Colors

### Primary

- **Operator Emerald** (`#10b981`, `oklch(0.72 0.17 162)`): The single brand accent. Primary CTAs, selection, active nav, focus rings. Never decorative wallpaper. Light UI uses a deeper step (`oklch(0.55 0.15 162)`) for contrast on soft paper.
- **Operator Emerald Deep** (`#059669`, `oklch(0.65 0.16 162)`): Hover for the accent.
- **Operator Emerald Soft** (`#d1fae5`, `oklch(0.94 0.06 162)`): Soft tint for badges and subtle highlights. Never a hero surface.

### Neutral

- **Ink** (`#18181b`, `oklch(0.18 0.005 285)`): Body text, primary headings.
- **Ink Muted** (`#52525b`, `oklch(0.40 0.005 285)`): Secondary text.
- **Ink Dimmed** (`#71717a`, `oklch(0.55 0.005 285)`): Tertiary text, metadata.
- **Paper** (`#f2f7f4`, `oklch(0.96 0.008 162)`): Default light page background. Soft emerald-tinted paper, never true white.
- **Paper Pure** (`#f7fbf8`, `oklch(0.98 0.004 162)`): Cards and inputs in light. Still off-white.
- **Surface Elevated** (`#e8f0eb`, `oklch(0.94 0.01 162)`): Sidebars, toolbars, ghost hover.
- **Surface Sunken** (`#e2ebe6`, `oklch(0.92 0.012 162)`): Recessed wells, inset panels.
- **Hairline** / **Hairline Strong**: Default and strong separators.

### Inverted (Dark theme + marketing)

- **Paper Inverted** (`#09090b`): Page / marketing hero ground.
- **Surface Inverted** (`#141416`): Raised dark panels.
- **Surface Inverted Elevated** (`#1c1c1f`): Higher dark surfaces.
- **Ink Inverted** / **Hairline Inverted**: Text and borders on dark.

### State

- **Success** (`#10b981`, `oklch(0.72 0.17 162)`): Confirmations, healthy status. Not the brand accent.
- **Warning** (`#f59e0b`): Caution.
- **Error** (`#ef4444`): Failures, destructive.
- **Info** (`#3b82f6`, `oklch(0.62 0.18 252)`): Neutral system messages.

### Named Rules

**The One Voice Rule.** Operator Emerald on ≤10% of any product screen. Rarity is the point.

**The Soft Paper Rule.** Light mode never uses true `#fff` as the page ground. Paper is emerald-tinted off-white.

**The Tinted Neutral Rule.** No raw `#000` / `#fff`. Neutrals carry light chroma toward the brand hue.

**The Marketing Atmosphere Exception.** Soft aurora/mesh glow on the dark hero is allowed once. It is not a product pattern.

## 3. Typography

**Display / Body:** IBM Plex Sans  
**Mono:** IBM Plex Mono

### Hierarchy

- **Display** (`600`, `clamp(2.75rem, 7vw, 5.5rem)`, LH `1.05`, tracking `-0.03em`): Marketing heroes. Floor tracking ≥ `-0.04em`.
- **Headline** (`600`, `clamp(1.875rem, 4vw, 3rem)`, LH `1.1`, tracking `-0.025em`): Section openings, product page titles.
- **Title** (`600`, `1.125rem`, LH `1.3`): Panel and card titles.
- **Body** / **Body Large**: Reading text; cap prose at 65–75ch.
- **Label** (`600`, `0.6875rem`, tracking `0.14em`, uppercase): Sparse use. One deliberate kicker per page max on marketing; never an eyebrow on every section.
- **Mono** (`500`, `0.8125rem`): Tool calls, latencies, IDs, code.

### Named Rules

**The Single Family Rule.** IBM Plex Sans across the scale. Hierarchy from weight and size.

**The Mono For Truth Rule.** Mono for what the system reports, never running prose or headings.

**The Eyebrow Restraint Rule.** Uppercase labels are rare. Identical section eyebrows across a page are banned.

## 4. Elevation

Depth is a surface ladder first, hairlines second, shadow last.

### Surface ladder (light)

1. Paper (page)
2. Paper Pure (cards/inputs)
3. Surface Elevated (chrome)
4. Surface Sunken (wells)

### Surface ladder (dark / marketing)

1. Paper Inverted
2. Surface Inverted
3. Surface Inverted Elevated

### Shadow vocabulary

- **state-lift**: Hover on interactive CTAs only.
- **focus-ring**: `0 0 0 3px oklch(0.55 0.15 162 / 0.25)` — emerald at low opacity.
- **float-low**: Toasts, popovers, dropdowns.
- **float-high**: Modals, command palette.

**Hairline First.** Separation is hairline before tonal step before shadow.

**No Ghost Cards.** Never pair `1px` border with a wide soft drop shadow as decoration. Pick one.

## 5. Components

### Buttons

- Full-pill. Primary: Operator Emerald / white / weight 600. Hover: Emerald Deep. Ghost and outline as before with elevated hover fill.

### Cards / Containers

- Radius `16px` (card token). Hairline border. Flat at rest. No nested cards.

### Inputs

- Radius `12px`. Focus border + focus-ring in emerald.

### Navigation

- **Marketing:** Footer nav; optional frosted top strip only if it earns its place. No sticky chrome by default.
- **Product:** Top-bar or rail. Active: emerald text + soft tint (`bg-primary/10`). Never a side-stripe.

### Tool Trace (signature)

Label-scale tool name in mono, emerald running indicator while live, hairline separator, mono body for args/results. Selectable. No badge soup.

## 6. Marketing motion

Allowed on marketing only, and sparingly (≤3 animated pieces per page):

- Aurora / soft mesh atmosphere behind the hero
- BlurText or equivalent headline reveal
- Magnet / soft CTA attraction
- SpotlightCard for at most two feature moments
- AnimatedContent scroll reveals

All must degrade under `prefers-reduced-motion` to opacity or instant.

## 7. Do's and Don'ts

### Do

- Use Operator Emerald on primary actions, selection, and focus only.
- Keep accent ≤10% of product screens.
- Walk the surface ladder before reaching for shadow.
- Use 12–16px radii on containers; pills on buttons/badges.
- Put marketing navigation in the footer; product nav in rail/top-bar.
- Make tool traces selectable and plain-prose-shaped.
- Respect `prefers-reduced-motion`.

### Don't

- Don't use SaaS-cream or AI-slop patterns (orbs, gradient text, icon-card grids, hero metrics).
- Don't use true white (`#fff`) as the light page ground.
- Don't ship flat zinc-only UI with no tonal depth.
- Don't use side-stripe borders, gradient text, or glass as default.
- Don't wrap everything in a card; nested cards are always wrong.
- Don't put an uppercase eyebrow on every section.
- Don't orchestrate entrance sequences in product surfaces.
- Don't use em dashes in copy or UI text.
