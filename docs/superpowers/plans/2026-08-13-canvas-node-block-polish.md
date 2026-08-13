# Canvas Node Block Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise every Canvas node block (42 types + shared chrome) to DESIGN.md Operate-mode craft: quieter, distilled, shadcn-native, with delight and motion only at empty / complete / error / wait.

**Architecture:** Highest NPV is shared. The node shell already wraps each block in a card. Almost every editor then nests another card and a 4-up metric strip. Fix chrome and primitives once, then apply one visual recipe per editor.

**Tech Stack:** React 19, shadcn Checkbox/Select/Label/Button/Input/Textarea/Badge, workspace block registry, CSS transitions with prefers-reduced-motion.

## Global Constraints

- DESIGN.md: quiet instrument; radii 12–16px (no 32px over-round); no nested cards; no hero-metric soup; no gradients/glass/backdrop-blur in product; Operator Violet ≤10%; primary CTAs monochrome; Poppins not serif; weight 600 not font-black; uppercase eyebrows rare; no entrance choreography; prefers-reduced-motion required; no em dashes in UI copy.
- Prefer shadcn primitives over native/Block\* inputs.
- Ponytail: reimplement shared wrappers in place; deletion over addition; no new motion library.
- Golden layers: keep editors as they are; do not invent view/container splits.
- Animate only when it explains state. Do not add hover-lift, stagger, or glow.
- Delight thesis: completing a cell, checking a task, or running a prompt should feel registered, not celebrated.
- Do not merge decision with pros-cons. Do not add Slider/Calendar this pass. Do not rebuild Eisenhower or Talent.

See the attached Cursor plan for the full task list and visual recipe.
