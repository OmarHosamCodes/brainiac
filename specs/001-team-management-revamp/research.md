# Research: Team Management Revamp

## Decisions & Findings

### 1. Testing Strategy
- **Decision**: Use `bun:test` for unit and integration testing.
- **Rationale**: The project already uses Bun as its runtime and package manager, and existing tests (e.g., in `packages/agent`) use `bun:test`.
- **Alternatives considered**: Vitest (rejected as Bun's native runner is faster and already in use).
- **Action**: Create `apps/web/app/composables/useTeamManagement.test.ts` to verify RBAC logic and optimistic updates.

### 2. Optimistic Update Pattern
- **Decision**: Use `queryClient.setQueryData` within `onMutate` or after `mutateAsync` (for simpler flows) to provide instant feedback.
- **Rationale**: This is the established pattern in `useDashboardAgentChat.ts`.
- **Implementation**:
  - Store the previous state in `onMutate`.
  - Update the cache with the new value immediately.
  - Rollback in `onError` using the saved previous state.
  - Refetch in `onSettled` to ensure synchronization.

### 3. UI/UX Components (@nuxt/ui v4)
- **Decision**: Use `UModal` for the primary Team Settings interface and `UTable` for member management.
- **Rationale**: 
  - A modal decouples management from the main canvas interaction, providing the requested "dedicated" interface.
  - `UTable` provides a structured way to show members, emails, and role dropdowns.
  - Use `UBadge` and `UTooltip` for RBAC feedback (e.g., "Owner Only").
- **Alternatives considered**: Separate route (rejected to keep the "SPA" feel of the dashboard), Slideover (considered, but Modal is better for focused management tasks).

### 4. RBAC Frontend Implementation
- **Decision**: Centralize permission checks in `useTeamManagement` as computed properties.
- **Rationale**: Simplifies UI logic. Components just check `canInvite`, `canDelete`, etc.
- **Logic**:
  - `Owner`: All permissions.
  - `Editor`: Can view members, cannot invite/remove/rename/delete.
  - `Viewer`: Can view members, cannot perform any mutations.
