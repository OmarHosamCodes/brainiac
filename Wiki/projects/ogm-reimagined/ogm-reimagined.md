---
title: OGM Reimagined
category: projects
tags: [react, tanstack, admin-panel, platform-branding]
summary: "Admin panel application for platform and community management; uses React with TanStack Router."
sources:
  - ~/.codex/sessions/2026/04/13/rollout-2026-04-13T22-35-36.jsonl
  - ~/.codex/sessions/2026/04/13/rollout-2026-04-13T22-51-24.jsonl
provenance:
  extracted: 0.85
  inferred: 0.15
  ambiguous: 0.0
updated: 2026-04-23
---

# OGM Reimagined

Path: `/home/omar/Projects/ogm-reimagined`

An admin panel application for platform and community management.

## Stack

- **React** with **TanStack Router** (file-based routing under `apps/admin-panel/src/routes/`)
- Admin panel lives under `apps/admin-panel/`

## Platform Branding

File: `apps/admin-panel/src/routes/_admin.settings.tsx`

Renders `PlatformBrandingCard` (`apps/admin-panel/src/component/platform-branding-card.tsx`).

### Community Name Field Removal

Previously the platform branding card had an editable `communityName` field. This was removed:
- The field is no longer stored as part of shared platform branding
- In the admin form it is replaced by a **derived, non-editable** value:
  - Uses the **active admin community** name when one is active
  - Falls back to the platform branding `fullName` when no community is active
- The community name field was also removed from the underlying data model and API

## Related

- [[brainiac]] — separate project by the same developer
