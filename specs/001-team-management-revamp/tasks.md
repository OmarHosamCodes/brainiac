# Tasks: Team Management Revamp

**Input**: Design documents from `/specs/001-team-management-revamp/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit tests for composables are requested in the plan.md (Constitution Check III).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create component directory at `apps/web/app/components/team/`
- [X] T002 [P] Configure `bun test` environment for web composables in `apps/web/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core logic and state management that MUST be complete before ANY UI work

- [X] T003 Update `apps/web/app/composables/useTeamManagement.ts` to include RBAC computed properties (`canInvite`, `canDeleteTeam`, `canModifyRoles`, `canRemoveMembers`)
- [X] T004 Update `apps/web/app/composables/useTeamManagement.ts` to expose `queryClient` for upcoming optimistic updates
- [X] T005 [P] Create `apps/web/app/composables/useTeamManagement.test.ts` with failing tests for RBAC logic
- [X] T006 Implement RBAC logic in `apps/web/app/composables/useTeamManagement.ts` and pass T005 tests

**Checkpoint**: RBAC logic verified - UI implementation can now begin

---

## Phase 3: User Story 1 - Centralized Member Management (Priority: P1) 🎯 MVP

**Goal**: Provide a dedicated modal for team settings and member management.

**Independent Test**: Open the new modal via the dashboard, view the member list, and verify the dedicated UI is functional.

### Implementation for User Story 1

- [X] T007 [P] [US1] Create `apps/web/app/components/team/TeamMemberList.vue` using `UTable` to display current members
- [X] T008 [P] [US1] Create `apps/web/app/components/team/TeamSettingsModal.vue` using `UModal` as the container for management views
- [X] T009 [US1] Integrate `TeamMemberList.vue` into `TeamSettingsModal.vue`
- [X] T010 [US1] Add "Manage Team" trigger button to the sidebar in `apps/web/app/pages/dashboard.vue`
- [X] T011 [US1] Implement "Add Member" form within `TeamSettingsModal.vue` using existing logic from `useTeamManagement`

**Checkpoint**: User Story 1 is functional - team settings are moved to a dedicated modal.

---

## Phase 4: User Story 2 - Granular RBAC Feedback (Priority: P2)

**Goal**: Hide or disable management actions for non-owners with clear explanations.

**Independent Test**: Log in as a 'Viewer' and verify that management buttons are restricted and show "Requires Owner" hints.

### Implementation for User Story 2

- [X] T012 [P] [US2] Update `apps/web/app/components/team/TeamSettingsModal.vue` to hide "Add Member" and "Delete Team" for non-owners
- [X] T013 [P] [US2] Update `apps/web/app/components/team/TeamMemberList.vue` to disable role changes and "Remove" for non-owners
- [X] T014 [US2] Add `UTooltip` or `UBadge` to restricted actions in `TeamSettingsModal.vue` explaining the role requirement

**Checkpoint**: User Story 2 is functional - frontend RBAC is transparent and prevents unauthorized actions.

---

## Phase 5: User Story 3 - High-Performance Switching & Updates (Priority: P3)

**Goal**: Implement optimistic updates for an "instant" feel when managing the team.

**Independent Test**: Change a member's role and verify the UI updates immediately before the server responds.

### Tests for User Story 3

- [X] T015 [P] [US3] Add failing tests to `apps/web/app/composables/useTeamManagement.test.ts` for optimistic role updates and member removal

### Implementation for User Story 3

- [X] T016 [US3] Implement optimistic update for `updateMemberRole` in `apps/web/app/composables/useTeamManagement.ts`
- [X] T017 [US3] Implement optimistic update for `addTeamMember` in `apps/web/app/composables/useTeamManagement.ts`
- [X] T018 [US3] Implement optimistic update for `removeMember` in `apps/web/app/composables/useTeamManagement.ts`
- [X] T019 [US3] Implement optimistic update for `saveTeamName` in `apps/web/app/composables/useTeamManagement.ts`

**Checkpoint**: User Story 3 is functional - all mutations feel instant.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and final validation

- [X] T020 [P] Implement "Empty States" for the member list in `apps/web/app/components/team/TeamMemberList.vue`
- [X] T021 [P] Remove deprecated inline team management code from `apps/web/app/pages/dashboard.vue`
- [X] T022 Run full test suite `bun test` in `apps/web/`
- [ ] T023 Manual validation of `quickstart.md` scenarios on the dev server

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** & **Foundational (Phase 2)**: MUST be complete before UI work (Phase 3+).
- **User Stories (Phase 3, 4, 5)**: Can technically proceed in parallel once the foundation is ready, but recommended order is P1 → P2 → P3.
- **Polish (Phase 6)**: Final step after all stories are verified.

### Parallel Opportunities

- T003, T005 (RBAC Logic and Tests) can be started together.
- T007, T008 (Base Components) can be built in parallel.
- T012, T013 (RBAC Visibility) can be applied in parallel across components.

---

## Parallel Example: User Story 1

```bash
# Developer A: Create the member table
Task: "Create apps/web/app/components/team/TeamMemberList.vue"

# Developer B: Create the modal container
Task: "Create apps/web/app/components/team/TeamSettingsModal.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2 (Logic & Infrastructure).
2. Complete Phase 3 (Dedicated Modal UI).
3. **STOP and VALIDATE**: Verify team management works in the new modal.

### Incremental Delivery

1. Foundation ready (Phase 2).
2. Add Dedicated UI (Phase 3) -> Better UX.
3. Add RBAC Feedback (Phase 4) -> Better Security/Clarity.
4. Add Optimistic Updates (Phase 5) -> Better Performance.

---

## Notes

- Use `queryClient.setQueryData` for all optimistic updates.
- Use `@nuxt/ui` v4 components (`UModal`, `UTable`, `UBadge`, `UTooltip`).
- Ensure no owner-less teams can be created (verify in `useTeamManagement` logic).
