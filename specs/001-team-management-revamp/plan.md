# Implementation Plan: Team Management Revamp

**Branch**: `001-team-management-revamp` | **Date**: 2026-03-31 | **Spec**: [/specs/001-team-management-revamp/spec.md](spec.md)
**Input**: Feature specification from `/specs/001-team-management-revamp/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

The Team Management Revamp aims to move from inline dashboard forms to a dedicated, high-performance team settings interface. It will provide granular RBAC feedback for users (Owner, Editor, Viewer) and ensure a snappy feel using optimistic updates via TanStack Query and Nuxt UI components.

## Technical Context

**Language/Version**: TypeScript (Bun 1.3.x)
**Primary Dependencies**: Nuxt 4, @nuxt/ui v4, TanStack Vue Query, oRPC
**Storage**: PostgreSQL (via Drizzle ORM)
**Testing**: Bun's native runner (`bun test`) for unit and integration testing.
**Target Platform**: Modern Web Browsers
**Project Type**: Web Application
**Performance Goals**: Sub-200ms for role/member mutations (Success Criteria SC-001)
**Constraints**: Zero full-page reloads for team navigation (Success Criteria SC-002)
**Scale/Scope**: Focus on frontend revamp while reusing existing oRPC team endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Library-First**: The business logic for team management is already somewhat centralized in `useTeamManagement` and `useTeamSelection` composables. The revamp should further decouple UI from these state-management primitives.
- [x] **II. CLI Interface**: N/A for this web-focused feature, though oRPC provides a "CLI-like" structured contract.
- [x] **III. Test-First**: **PASS**: Unit tests for RBAC and optimistic UI will be created in `useTeamManagement.test.ts` before UI implementation.
- [x] **IV. Integration Testing**: Essential for the oRPC contracts and optimistic UI state transitions.
- [x] **V. Simplicity**: Focus on replacing the cramped aside panel with a clean modal or dedicated view.

## Project Structure

### Documentation (this feature)

```text
specs/001-team-management-revamp/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   ├── components/      # New TeamManagement modal/view components
│   ├── composables/     # Refined useTeamManagement/useTeamSelection
│   └── pages/           # dashboard.vue updates
```

**Structure Decision**: Monorepo structure already established. New UI will be added to `apps/web`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
