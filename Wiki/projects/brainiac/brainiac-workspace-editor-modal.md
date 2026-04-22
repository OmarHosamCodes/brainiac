---
title: Workspace Editor Modal
category: projects/brainiac
tags: [vue, nuxt, modal, ux]
summary: "Modal for editing workspace node settings; redesigned to match TeamSettingsModal pattern with swatch-only tint picker."
sources:
  - ~/.codex/sessions/2026/04/13/rollout-2026-04-13T22-13-16.jsonl
provenance:
  extracted: 0.85
  inferred: 0.15
  ambiguous: 0.0
updated: 2026-04-23
---

# Workspace Editor Modal

File: `apps/web/app/components/workspace/WorkspaceEditorModal.vue`

## Purpose

Modal for editing workspace **node** settings — title, tint color, and other node-level configuration.

## Design Reference

Rebuilt using `TeamSettingsModal.vue` (`apps/web/app/components/team/TeamSettingsModal.vue`) as a structural and visual reference.

## Tint Color Picker

- Uses **swatch-only buttons** — no visible text labels
- Accessible: labels preserved via `aria-label` and `title` attributes
- Selected color gets a **checkmark overlay**

## Related

- [[brainiac]]
