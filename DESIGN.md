---
name: Brainiac
description: A spatial knowledge workspace with an embedded agent. Two registers, one quiet visual voice.
colors:
  operator-emerald: "#10b981"
  operator-emerald-deep: "#059669"
  operator-emerald-soft: "#d1fae5"
  ink: "#18181b"
  ink-muted: "#52525b"
  ink-dimmed: "#71717a"
  paper: "#fafafa"
  paper-pure: "#ffffff"
  surface-elevated: "#f4f4f5"
  hairline: "#e4e4e7"
  hairline-strong: "#d4d4d8"
  ink-inverted: "#fafafa"
  paper-inverted: "#09090b"
  hairline-inverted: "#27272a"
  state-success: "#10b981"
  state-warning: "#f59e0b"
  state-error: "#ef4444"
  state-info: "#3b82f6"
typography:
  display:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.5rem, 7vw, 5.5rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  title:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
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
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.18em"
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
  lg: "16px"
  xl: "24px"
  card: "32px"
  full: "9999px"
spacing:
  hairline: "1px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "80px"
  section-lg: "128px"
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

# Design System: Brainiac

## 1. Overview

**Creative North Star: "Two Registers, One Voice"**

Brainiac runs two surfaces inside one product. The Dashboard is spatial: an infinite canvas where users pan, zoom, place, and connect. The Agency is structured: rows, totals, time, execution. The visual system has to speak both dialects without ever sounding like two products bolted together. One typographic voice, one quiet color discipline, one component vocabulary; the layout grammar shifts between registers.

The system rejects the dominant aesthetic of its category. No purple-blue gradient heroes, no animated orbs, no gradient text, no glassmorphism, no AI-tool neon. The agent is a tool, not a personality. The canvas is the product. UI chrome serves the work and gets out of the way the moment a user is thinking. Calm, focused, plain-spoken. Trust earned through restraint, not flash.

The marketing register (landing, pricing, legal) is allowed editorial confidence: large display type, generous breathing room, hairline rules between sections. The product register (canvas, agency, blocks) is allowed density: tight rows, compact toolbars, dense tool traces. Same family. Same components. Different rhythm.

**Key Characteristics:**

- Restrained color: tinted neutrals, one accent (Operator Emerald) used on ≤10% of any product surface.
- Typographic hierarchy carries the system. IBM Plex Sans across roles, IBM Plex Mono for tool traces and metric values.
- Flat by default. Hairlines (1px) separate content; shadows appear only as a response to state (hover, focus, lift).
- Generous radii on containers (32px cards, full pills on buttons and badges) keep the system feeling crafted, not clinical.
- Two registers, one component vocabulary. A button looks the same on the landing page and inside the canvas toolbar.

## 2. Colors

A small, restrained palette built on zinc-tinted neutrals plus a single saturated accent. The accent is rare on purpose; its rarity is what makes it readable as state.

### Primary

- **Operator Emerald** (`#10b981`, `oklch(0.72 0.17 162)`): The single accent across the system. Used on primary CTAs, current selection, system-status indicators, the agent's success affordances, and active navigation. Never decorative.
- **Operator Emerald Deep** (`#059669`, `oklch(0.65 0.16 162)`): Hover state for the accent. Slightly darker, same hue.
- **Operator Emerald Soft** (`#d1fae5`, `oklch(0.94 0.06 162)`): Tinted background for badges and subtle highlights. Never as a hero surface.

### Neutral

- **Ink** (`#18181b`, `oklch(0.18 0.005 285)`): Body text, primary headings, dark surface in inverted contexts.
- **Ink Muted** (`#52525b`, `oklch(0.40 0.005 285)`): Secondary text, supporting copy, dimmer labels.
- **Ink Dimmed** (`#71717a`, `oklch(0.55 0.005 285)`): Tertiary text, eyebrows, timestamps, metadata.
- **Paper** (`#fafafa`, `oklch(0.98 0.002 285)`): Default page background in light theme.
- **Paper Pure** (`#ffffff` rendered, but treated as `oklch(0.99 0.002 285)`): Card and input surface in light theme.
- **Surface Elevated** (`#f4f4f5`, `oklch(0.96 0.003 285)`): Sidebars, toolbars, hover backdrop on ghost buttons.
- **Hairline** (`#e4e4e7`, `oklch(0.91 0.004 285)`): The default separator. Used everywhere borders are needed.
- **Hairline Strong** (`#d4d4d8`, `oklch(0.85 0.005 285)`): Stronger separation when hairline gets lost on a tinted surface.

### Inverted (Dark Theme)

- **Paper Inverted** (`#09090b`, `oklch(0.13 0.005 285)`): Page background.
- **Ink Inverted** (`#fafafa`): Primary text on dark.
- **Hairline Inverted** (`#27272a`, `oklch(0.27 0.005 285)`): Separator in dark theme.

### State

- **Success** (`#10b981`): Same hue as primary; semantic overlap is intentional. Confirmations, healthy states.
- **Warning** (`#f59e0b`, `oklch(0.78 0.16 70)`): Caution, non-blocking issues.
- **Error** (`#ef4444`, `oklch(0.65 0.22 25)`): Failures, destructive confirmations.
- **Info** (`#3b82f6`, `oklch(0.62 0.18 252)`): Neutral system messages.

### Named Rules

**The One Voice Rule.** Operator Emerald is used on ≤10% of any given screen. Its rarity is the point. If a surface looks emerald-heavy, it is wrong. Demote to neutral, promote one element back.

**The Tinted Neutral Rule.** No `#000` and no `#fff` raw. Every neutral is zinc-tinted (chroma ~0.005). The page is paper, not glare.

**The Semantic Reuse Rule.** Success and Operator Emerald share a hue family. This is a feature, not a bug. The product equates "primary action" and "successful state" by design.

## 3. Typography

**Display Font:** IBM Plex Sans (with `system-ui, -apple-system, sans-serif` fallback)
**Mono Font:** IBM Plex Mono (with `ui-monospace, monospace` fallback)

**Character:** IBM Plex Sans is a quiet, modern sans with neutral letterforms. It carries display, headline, body, and label without needing a paired serif or display face. IBM Plex Mono shows up where structure matters: tool call traces in the agent rail, latency values in the system status, code blocks in notes, numeric data in agency tables.

### Hierarchy

- **Display** (`700`, `clamp(2.5rem, 7vw, 5.5rem)`, line-height `1.02`, letter-spacing `-0.02em`): Marketing hero headlines. Tight tracking, near-overlapping leading.
- **Headline** (`700`, `clamp(1.875rem, 4vw, 3rem)`, line-height `1.1`, letter-spacing `-0.015em`): Section openings on marketing pages, page titles in product surfaces.
- **Title** (`600`, `1.125rem`, line-height `1.3`): Card titles, panel headers, modal titles.
- **Body** (`400`, `1rem`, line-height `1.6`): Default reading text. Capped at 65–75ch on prose surfaces; data tables and dense panels are exempt.
- **Body Large** (`400`, `1.125rem`, line-height `1.6`): Hero supporting copy, marketing introductions.
- **Label** (`700`, `0.6875rem`, letter-spacing `0.18em`, uppercase): Eyebrows, section markers, tool-trace badges, status indicators. The system's spoken-quiet voice.
- **Mono** (`500`, `0.8125rem`, line-height `1.5`): Tool calls, latencies, metric values, code, kbd shortcuts.

### Named Rules

**The Eyebrow Rule.** Section eyebrows (the small uppercase line above a heading) are rendered in Label scale at `text-neutral-400` / `dark:text-neutral-500`. Never colored, never emerald, never bolder. They are the system's whisper.

**The Single Family Rule.** No display/serif pairing. IBM Plex Sans across the entire scale. Hierarchy comes from weight (400/600/700) and size (1.25× minimum step ratio).

**The Mono For Truth Rule.** IBM Plex Mono is reserved for things the system reports, not things the system says. Latencies, IDs, paths, code, tool calls. Never running prose, never headings.

## 4. Elevation

The system is flat at rest. Surfaces lie on the page; depth is established through hairlines and tonal layering, not shadow. Shadows appear only as a response to state — hover lift on interactive elements, ambient glow on a focused input, container shadow on a floating modal or dropdown. No decorative depth. No "card with shadow" as the default container.

### Shadow Vocabulary

- **state-lift** (`box-shadow: 0 1px 2px oklch(0.18 0.005 285 / 0.05), 0 4px 12px oklch(0.18 0.005 285 / 0.06)`): Hover state on primary CTAs and interactive cards.
- **focus-ring** (`box-shadow: 0 0 0 3px oklch(0.72 0.17 162 / 0.20)`): Keyboard focus on inputs, buttons, links. The accent at low opacity, never a 1px outline.
- **float-low** (`box-shadow: 0 4px 16px oklch(0.18 0.005 285 / 0.08)`): Toasts, popovers, dropdowns.
- **float-high** (`box-shadow: 0 12px 48px oklch(0.18 0.005 285 / 0.18)`): Modals, command palette.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. If you reach for `box-shadow` to make something "pop" without a state change, stop. Use a hairline border or a tonal step instead.

**The Hairline First Rule.** Separation is hairline (`1px solid var(--hairline)`) before it is tonal layering, and tonal layering before it is shadow. Walk the ladder; do not skip rungs.

## 5. Components

### Buttons

- **Shape:** Full-pill (radius `9999px`). Enforced via shared `Button` variants in `apps/web/src/components/ui/` and Tailwind utilities.
- **Primary:** Operator Emerald background, white text, weight `700` (bold). Padding scales with size (`sm` 8×16px, `md` 10×20px, `lg` 12×24px, `xl` 14×28px).
- **Hover / Focus:** Background shifts to Operator Emerald Deep. Focus shows the focus-ring at 20% opacity. No transform on hover; no scale-up.
- **Ghost:** Transparent background, ink text, hover fills Surface Elevated. Used for tertiary actions.
- **Outline:** 1px hairline border, transparent background, ink text. Used for secondary CTAs in marketing surfaces.
- **Subtle:** Surface Elevated background, ink text. Used inside cards where outline would compete with the card border.

### Badges

- **Shape:** Full-pill (radius `9999px`). Bold weight.
- **Default:** Surface Elevated background, ink-muted text. Tiny (≤12px) padding.
- **Variant:** Tinted-soft variants per state (emerald-soft, warning-soft, error-soft) with the corresponding state-color text at high contrast.

### Cards / Containers

- **Corner Style:** Generous (`32px` radius). Defined in `apps/web/src/index.css` and shared card primitives; overriding to a smaller radius is a deliberate choice, not a default.
- **Background:** Paper Pure in light, surface-darkest in dark.
- **Shadow Strategy:** None at rest. See Elevation: shadows on state only.
- **Border:** 1px hairline at 20% opacity (`border-muted/20`). Visible enough to define, quiet enough to recede.
- **Internal Padding:** `24px` default; dense variants drop to `16px`.

### Inputs / Fields

- **Shape:** `16px` radius (input scale, not card scale). Bold-weight text inside the field.
- **Background:** Paper Pure in light, ink-9 (deepest neutral) in dark.
- **Default Border:** 1px hairline.
- **Focus:** Hairline shifts to Operator Emerald, focus-ring shadow at 20% opacity. No inset shadow. No border thickness change (that would shift layout).
- **Error:** Border shifts to state-error, helper text in state-error, focus-ring in error-color at 20%.
- **Disabled:** Opacity 50%, cursor not-allowed, no hover.

### Navigation

- **Marketing register (landing/legal/pricing):** Navigation lives in the footer. No floating navbar, no sticky chrome.
- **Product register (dashboard/agency/marketplace):** A standard top-bar or rail. Active state is text in Operator Emerald with a soft tinted backdrop (`bg-primary/10`). Hover is Surface Elevated. Never a side-stripe.

### System Status Indicator

- **Style:** Inline label (Label typography) with a 6px circular dot. Dot is Operator Emerald when healthy, Hairline Strong when unknown, state-error when failing.
- **Placement:** Footer in marketing register. Status rail or app shell in product register.
- **Animation:** No pulse by default. Add a 2.5s ease-in-out glow only when the user has explicitly opted into "live status" detail.

### Tool Trace (Signature Component)

The agent rail's tool-call rendering. A multi-line block with: a small Label-scale tool name in mono, an Operator Emerald running indicator while live, a hairline separator, and a IBM Plex Mono body for arguments and results. Tool traces are plain prose-shaped; they are the agent's working notes, not a magic trick. Selectable text. No badge soup. No icon explosion.

## 6. Do's and Don'ts

### Do:

- **Do** use Operator Emerald on primary actions, current selection, and system-status indicators only.
- **Do** keep the accent on ≤10% of any given screen. The One Voice Rule.
- **Do** use hairlines (`1px solid var(--hairline)`) as the default separator. Walk the elevation ladder before reaching for shadow.
- **Do** render every interactive element with all seven states: default, hover, focus-visible, active, disabled, loading, error.
- **Do** use full-pill radii for buttons and badges, generous (32px) radii for cards. Set them globally.
- **Do** use IBM Plex Sans for everything that speaks; use IBM Plex Mono for everything the system reports.
- **Do** put a quiet inline system-status indicator in the footer (marketing) or rail (product), never a floating chrome.
- **Do** place navigation in the footer on marketing surfaces and in a standard top-bar or rail in product surfaces.
- **Do** make tool traces selectable, plain-prose-shaped, and free of decorative badges.
- **Do** respect `prefers-reduced-motion`: strip animation, keep opacity fades only.

### Don't:

- **Don't** use SaaS-cream clichés: purple/blue gradient heroes, hero-metric-with-sparkline cards, identical icon-and-heading card grids, or "Built for modern teams" template energy.
- **Don't** ship AI-product slop: neon glows, gradient text, sparkle decoration, robot mascot avatars, animated orbs, breathless "AI-powered" copy. The agent is a tool, not a personality.
- **Don't** apply enterprise heaviness: Salesforce/Jira density, nested tabs of nested tabs, dropdowns with 30 options, chrome-heavy navigation that competes with the canvas.
- **Don't** use `#000` or `#fff` raw. Every neutral is zinc-tinted.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe. The Side-Stripe Ban.
- **Don't** use `background-clip: text` with a gradient. The Gradient Text Ban.
- **Don't** use blur or glassmorphism as a default. Rare and purposeful, or nothing.
- **Don't** wrap everything in a card. Most things don't need one. Nested cards are always wrong.
- **Don't** orchestrate page-load entrance sequences in product surfaces. Speed is a feature; users load into a task, not a show.
- **Don't** decorate empty space. The default surface is calm and uncrowded.
- **Don't** use em dashes anywhere in copy or UI text. Use commas, colons, semicolons, periods, or parentheses.
- **Don't** use loading spinners in the middle of content where a skeleton or optimistic update would do.
- **Don't** build a modal as a first thought. Exhaust inline and progressive alternatives first.
