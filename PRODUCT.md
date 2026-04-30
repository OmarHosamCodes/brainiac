# Product

## Register

product

## Users

Knowledge workers — researchers, analysts, PMs, founders — managing complex, interconnected information across projects. They use Brainiac during focused work sessions on desktop, often for hours at a time. Their job to be done is to externalize thinking onto a spatial canvas, structure it into nodes and blocks, and collaborate with an AI agent that can read and mutate the workspace alongside them.

The canvas surface (Dashboard) is for spatial knowledge work — the user is exploring, organizing, and reshaping ideas. The Agency surface is for time and operations tracking — the user is structured and execution-focused there.

## Product Purpose

Brainiac is a spatial knowledge workspace where every piece of work has a place on an infinite canvas. Nodes hold tabs, tabs hold blocks (task lists, notes, kanban boards, decision matrices, AI prompts, and more). An embedded AI agent can read and mutate the workspace through tools, turning conversation into structural changes the user can see appear on the canvas in real time.

Success looks like a user thinking out loud to the agent, watching their workspace reshape itself, and ending the session with a more structured, more useful map of what they're working on than they could have built by clicking alone.

## Brand Personality

Calm, focused, quiet. The interface should feel like a well-made tool that a serious operator trusts — not a flashy AI product trying to impress. Voice is direct, plain-spoken, technically precise. No exclamation marks, no marketing puffery, no "magical" or "delightful" copy. The agent speaks the same way: useful, specific, never performative.

Emotionally: confidence without strain. Users should feel that they're in control of a powerful tool that respects their attention.

## Anti-references

- **SaaS-cream cliché.** No purple/blue gradient heroes, hero-metric-with-sparkline cards, identical icon-and-heading card grids, or "Built for modern teams" template energy.
- **AI-product slop.** No neon glows, gradient text, sparkle-everywhere decoration, robot mascot avatars, animated orbs, or breathless "AI-powered" copy. The agent is a tool, not a personality.
- **Enterprise heaviness.** No Salesforce/Jira density, no nested tabs of nested tabs, no dropdowns with 30 options, no chrome-heavy navigation that competes with the canvas.

## Design Principles

1. **The canvas is the product.** UI chrome serves the canvas. Panels, rails, and modals collapse out of the way when the user is working in the spatial surface. Anything that doesn't help the user think on the canvas is overhead.
2. **Show the work, not the magic.** When the agent does something — reads nodes, fetches a URL, mutates a block — make that visible as plain, factual lines. Tool calls are not magic; they are the agent's working notes. Users should always be able to inspect what happened.
3. **Speed is a feature.** No loading shimmer where a result could already be there. Stream tokens. Optimistically update. Snap, don't fade.
4. **Quiet by default, dense on demand.** The default surface is calm and uncrowded. Density appears where users earn it: tables, dense panels, dense tool traces. Don't decorate empty space; don't crowd dense space.
5. **Two registers within one product.** Dashboard is spatial and exploratory (Miro-adjacent — pan, zoom, place, connect). Agency is structured and execution-shaped (Clockify-adjacent — rows, totals, time). Don't homogenize them; let each surface speak its own dialect of the same shared language.

## Accessibility & Inclusion

- WCAG 2.1 AA across all product surfaces. Contrast, focus visibility, keyboard navigation are non-negotiable.
- Full keyboard control of the agent rail, canvas pan/zoom, and node interactions. Spatial tools must not become unusable for keyboard-only users.
- Respect `prefers-reduced-motion` for the rail expand/collapse, streaming animations, and any canvas transitions.
- Text in tool traces and agent messages must remain selectable and screen-reader-readable. Tool call summaries should make sense as plain prose, not just visual badges.
