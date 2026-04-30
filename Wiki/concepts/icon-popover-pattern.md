---
title: Icon + Popover Action Pattern
category: concepts
tags: [ux, vue, component-pattern, nuxt]
summary: "UI pattern where an icon button reveals a popover for inline data entry or display, used consistently across workspace blocks in Brainiac."
sources:
  - ~/.claude/projects/-home-omar-Projects-brainiac/ac9367d2-e5c0-4596-98b6-ea191f8ožt2.jsonl
  - ~/.codex/sessions/2026/04/22/rollout-2026-04-22T17-33-59.jsonl
provenance:
  extracted: 0.75
  inferred: 0.25
  ambiguous: 0.0
updated: 2026-04-23
---

# Icon + Popover Action Pattern

A recurring UI pattern in [[brainiac]] where **icon buttons trigger popovers** for inline data entry or display, rather than opening modals or navigating.

## Pattern Rules

1. Icon button is always visible (not gated by `v-if` on data presence)
2. Icon is styled **primary/colored** when the field has a value; **ghost** when empty
3. The popover contains the full interaction: input, display, and action buttons
4. In **read-only contexts** (e.g., log entries), the popover shows data + a link-out action instead of an edit form

## Examples in Brainiac

| Field                | Icon            | Popover content                  |
| -------------------- | --------------- | -------------------------------- |
| Entry link (tracker) | `i-lucide-link` | URL input + save                 |
| Entry link (log)     | `i-lucide-link` | URL display + "Open link" button |
| Tags (tracker + log) | `i-lucide-tag`  | Searchable tag toggles           |

## Key Implementation Notes

- Tag button must **not** use `v-if="tags.length > 0"` — always render it so users can see the affordance
- The link and tag buttons are placed in a shared `flex items-center gap-1` row
- Disabled state mirrors other inline actions in the same context (e.g., hidden when no active tracker)

## Related

- [[brainiac-agency-time-tracker]]
- [[brainiac-eisenhower-matrix]]
