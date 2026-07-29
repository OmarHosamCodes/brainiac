---
name: Orch
description: A spatial knowledge workspace with an embedded agent. Quiet instrument, photographic depth. Dual register — dark cinematic marketing, light precise product.
colors:
  operator-violet: "#5b5bd6"
  operator-violet-soft: "#e8e7f8"
  ink: "#2a2a3a"
  ink-muted: "#5c5c72"
  ink-dimmed: "#7a7a90"
  paper: "#f7f7fb"
  paper-pure: "#fbfbfd"
  surface-elevated: "#ececf4"
  surface-sunken: "#e4e4ee"
  hairline: "#d8d8e4"
  hairline-strong: "#c8c8d6"
  ink-inverted: "#f2f2f5"
  paper-inverted: "#1c1c28"
  surface-inverted: "#2a2a38"
  surface-inverted-elevated: "#343444"
  hairline-inverted: "#3f3f50"
  state-success: "#22c55e"
  state-warning: "#f59e0b"
  state-error: "#ef4444"
  state-info: "#3b82f6"
typography:
  display:
    fontFamily: "Poppins, IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.75rem, 7vw, 5.5rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Poppins, IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Poppins, IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Poppins, IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  body-lg:
    fontFamily: "Poppins, IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Poppins, IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
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
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-pure}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.ink-muted}"
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

Orch is a dual-register system. Marketing is dark and cinematic: large type, generous air, aurora atmosphere reserved for the hero. Product shares one cool zinc/violet family across light and dark: a surface ladder, hairlines, monochrome primary CTAs, and one accent used sparingly. Same typographic voice, same component vocabulary, different rhythm and ambient light.

Inspiration (synthesize, don't copy): Apple (whitespace, optical type, glass nav rare), Linear (near-black surface ladder, hairlines), Vercel (hero atmosphere only). Depth comes from tonal steps and light, not from shadow-on-every-card.

The system rejects category defaults. No purple gradient heroes, no animated orbs as brand, no gradient text, no glassmorphism-as-default, no AI neon. The agent is a tool. The canvas is the product.

**Key Characteristics:**

- Restrained color: cool zinc neutrals tinted toward hue ~269 (never true white, never emerald paper). Primary CTAs are monochrome (near-black in light, near-white in dark). Operator Violet is the sole brand accent on ≤10% of any product surface (selection, sidebar active, focus glow).
- Typographic hierarchy carries the system. Poppins for Latin (600 display, not shouty 700), IBM Plex Sans Arabic for Arabic glyphs, IBM Plex Mono for tool traces and metrics.
- Surface ladder, not flat paper. Paper → elevated → sunken → hairline. Shadows only for true float (modals, popovers).
- Radii: 12–16px on cards/inputs; full pills on buttons and badges. No 32px over-round.
- Marketing may use aurora/mesh and blur-text reveals; product stays quiet. `prefers-reduced-motion` is mandatory.

## 2. Colors

### Primary

- **Ink / Paper CTA** (`oklch(0.22 0.02 269)` light / `oklch(0.922 0 0)` dark): Monochrome primary buttons. Light uses cool near-black; dark uses near-white. Not a decorative hue.
- **Operator Violet** (`oklch(0.488 0.243 264.376)`): The single brand accent. Selection, active nav/sidebar, soft glows, canvas minimap. Never decorative wallpaper. Soft tint for badges: `oklch(0.94 0.04 264)`.

### Neutral

- **Ink** (`oklch(0.22 0.02 269)`): Body text, primary headings (light).
- **Ink Muted** (`oklch(0.48 0.02 269)`): Secondary text.
- **Ink Dimmed** (`oklch(0.55 0.01 269)`): Tertiary text, metadata.
- **Paper** (`oklch(0.985 0.006 269)`): Default light page background. Cool violet-tinted off-white, never true white, never emerald.
- **Paper Pure** (`oklch(0.995 0.004 269)`): Cards and inputs in light.
- **Surface Elevated** (`oklch(0.94 0.015 270)`): Sidebars, toolbars, ghost hover.
- **Surface Sunken** (`oklch(0.92 0.012 269)`): Recessed wells, inset panels.
- **Hairline** / **Hairline Strong**: Default and strong separators on hue ~269.

### Inverted (Dark theme + marketing)

- **Paper Inverted** (`oklch(0.15 0.02 269)`): Page / marketing hero ground.
- **Surface Inverted** (`oklch(0.20 0.02 266)`): Raised dark panels.
- **Surface Inverted Elevated** (`oklch(0.30 0.03 271)`): Higher dark surfaces / muted fills.
- **Ink Inverted** / **Hairline Inverted**: Text and borders on dark.

### State

- **Success** (`#22c55e`, `oklch(0.72 0.17 145)`): Confirmations, healthy status. Semantic only — not the brand accent.
- **Warning** (`#f59e0b`): Caution.
- **Error** (`#ef4444`): Failures, destructive.
- **Info** (`#3b82f6`, `oklch(0.62 0.18 252)`): Neutral system messages.

### Named Rules

**The One Voice Rule.** Operator Violet on ≤10% of any product screen. Rarity is the point. Primary CTAs stay monochrome.

**The Soft Paper Rule.** Light mode never uses true `#fff` as the page ground. Paper is cool violet-tinted off-white (hue ~269).

**The Tinted Neutral Rule.** No raw `#000` / `#fff`. Neutrals carry light chroma toward hue ~269.

**The Marketing Atmosphere Exception.** Soft aurora/mesh glow on the dark hero is allowed once. It is not a product pattern.

## 3. Typography

**English (Latin):** Poppins  
**Arabic:** IBM Plex Sans Arabic  
**Stack:** `"Poppins", "IBM Plex Sans Arabic", system-ui, sans-serif`  
**Mono:** IBM Plex Mono

### Hierarchy

- **Display** (`600`, `clamp(2.75rem, 7vw, 5.5rem)`, LH `1.05`, tracking `-0.03em`): Marketing heroes. Floor tracking ≥ `-0.04em`.
- **Headline** (`600`, `clamp(1.875rem, 4vw, 3rem)`, LH `1.1`, tracking `-0.025em`): Section openings, product page titles.
- **Title** (`600`, `1.125rem`, LH `1.3`): Panel and card titles.
- **Body** / **Body Large**: Reading text; cap prose at 65–75ch.
- **Label** (`600`, `0.6875rem`, tracking `0.14em`, uppercase): Sparse use. One deliberate kicker per page max on marketing; never an eyebrow on every section.
- **Mono** (`500`, `0.8125rem`): Tool calls, latencies, IDs, code.

### Named Rules

**The Bilingual Stack Rule.** Poppins covers Latin; IBM Plex Sans Arabic covers Arabic via unicode-range fallback. Hierarchy from weight and size within that stack.

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
- **focus-ring**: `0 0 0 3px oklch(0.556 0 0 / 0.25)` — neutral ring; violet soft glow only where selection needs it.
- **float-low**: Toasts, popovers, dropdowns.
- **float-high**: Modals, command palette.

**Hairline First.** Separation is hairline before tonal step before shadow.

**No Ghost Cards.** Never pair `1px` border with a wide soft drop shadow as decoration. Pick one.

## 5. Components

### Buttons

- Full-pill. Primary: monochrome ink / paper / weight 600. Hover: slightly lighter or darker step on the same ramp. Ghost and outline with elevated hover fill.

### Cards / Containers

- Radius `16px` (card token). Hairline border. Flat at rest. No nested cards.

### Inputs

- Radius `12px`. Focus border + neutral focus-ring.

### Navigation

- **Marketing:** Footer nav; optional frosted top strip only if it earns its place. No sticky chrome by default.
- **Product:** Top-bar or rail. Active: Operator Violet text + soft tint (`bg-sidebar-primary/10`). Never a side-stripe.

### Tool Trace (signature)

Label-scale tool name in mono, violet running indicator while live, hairline separator, mono body for args/results. Selectable. No badge soup.

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

- Use monochrome primary CTAs; reserve Operator Violet for selection, sidebar active, and soft glows.
- Keep accent ≤10% of product screens.
- Walk the surface ladder before reaching for shadow.
- Use 12–16px radii on containers; pills on buttons and badges.
- Put marketing navigation in the footer; product nav in rail/top-bar.
- Make tool traces selectable and plain-prose-shaped.
- Respect `prefers-reduced-motion`.

### Don't

- Don't use SaaS-cream or AI-slop patterns (orbs, gradient text, icon-card grids, hero metrics).
- Don't use true white (`#fff`) as the light page ground.
- Don't tint light paper toward emerald or warm cream.
- Don't ship flat zinc-only UI with no tonal depth.
- Don't use side-stripe borders, gradient text, or glass as default.
- Don't wrap everything in a card; nested cards are always wrong.
- Don't put an uppercase eyebrow on every section.
- Don't orchestrate entrance sequences in product surfaces.
- Don't use em dashes in copy or UI text.
