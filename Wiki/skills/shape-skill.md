---
title: Shape Skill — Design Brief Workflow
category: skills
tags: [agent-skill, design, ux-planning]
summary: "Agent skill for planning UX/UI features before coding; runs a discovery interview and produces a design brief."
sources:
  - ~/.claude/projects/-home-omar-Projects-brainiac/926d20e4-e292-4dea-9e98-d6d47b794d6c.jsonl
provenance:
  extracted: 0.9
  inferred: 0.1
  ambiguous: 0.0
updated: 2026-04-23
---

# Shape Skill — Design Brief Workflow

The `shape` agent skill is used **before writing code** to plan a feature's UX and UI.

## Workflow

1. Invoke: `/shape <feature description>`
2. The skill runs a structured **discovery interview** — asks clarifying questions about scope, users, and constraints
3. Produces a **design brief** that guides implementation

## Observed Usage

In the brainiac project, `shape` was invoked to plan a **global user styling settings** feature with node-level style overrides:
- Per-user preferences vs. per-workspace configuration
- Node tint/styling customization

## Related

- [[brainiac]]
- [[icon-popover-pattern]]
