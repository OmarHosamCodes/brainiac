# Feature Specification: Team Management Revamp

**Feature Branch**: `001-team-management-revamp`  
**Created**: 2026-03-31  
**Status**: Draft  
**Input**: User description: "I want to revamp the team management feature implemented in this branch to improve UI/UX User journey, RBAC Frontend, performance and clarity."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Centralized Member Management (Priority: P1)

As a Team Owner, I want a dedicated and clear interface to manage my team members so that I can easily invite new people, see who is on the team, and change their access levels without cluttering my main workspace.

**Why this priority**: Managing people is the core of team collaboration. The current inline form is too cramped for larger teams and lacks clarity.

**Independent Test**: Can be tested by opening the new "Team Settings" UI, inviting a member by email, and verifying they appear in the list with the correct role.

**Acceptance Scenarios**:

1. **Given** I am a Team Owner, **When** I open the Team Management view, **Then** I see a well-organized list of all current members with their names, emails, and roles.
2. **Given** I am a Team Owner, **When** I invite a new member, **Then** the UI updates immediately to show the invitation/member in the list.

---

### User Story 2 - Granular RBAC Feedback (Priority: P2)

As a Team Member (Editor or Viewer), I want to see clearly what actions I can and cannot perform in the team settings so that I don't get confused by "disabled" buttons without explanation or attempt actions that will fail.

**Why this priority**: Improves "Frontend RBAC" by making permissions transparent to the user, reducing frustration and "trial and error" interactions.

**Independent Test**: Log in as a 'Viewer' and verify that management actions (Add Member, Delete Team, Rename Team) are either hidden or clearly marked as restricted with a reason (e.g., tooltip).

**Acceptance Scenarios**:

1. **Given** I have a 'Viewer' role, **When** I view the Team Settings, **Then** the "Add Member" and "Delete Team" options are hidden or disabled with a "Requires Owner role" hint.
2. **Given** I have an 'Editor' role, **When** I view the Team Settings, **Then** I can see member list but cannot change roles of other members.

---

### User Story 3 - High-Performance Switching & Updates (Priority: P3)

As a user active in multiple teams, I want to switch between teams and update member settings instantly so that my flow isn't interrupted by loading spinners or full-page refreshes.

**Why this priority**: Addresses the "performance" and "clarity" requirement by ensuring the UI feels "alive" and responsive.

**Independent Test**: Measure the time between clicking "Save" on a team name or role change and the UI reflecting the new state. It should be sub-200ms using optimistic updates.

**Acceptance Scenarios**:

1. **Given** I am updating a member's role, **When** I select a new role from the dropdown, **Then** the UI reflects the change immediately while the request happens in the background.
2. **Given** I switch teams from the selector, **Then** the team-specific data (members, shared nodes) updates smoothly without a full component remount.

---

### Edge Cases

- **Self-Removal**: What happens when an Owner tries to remove themselves or demote themselves if they are the only Owner? (System MUST prevent leaving a team without an owner).
- **Network Failure**: How does the system handle optimistic updates when the backend request fails? (UI MUST rollback to the previous state and show a clear error toast).
- **Large Teams**: How does the member list handle 100+ members? (Should consider virtualization or pagination if the list grows too large).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated "Team Settings" UI (e.g., Modal or separate route) that is distinct from the team selection/switching UI.
- **FR-002**: System MUST implement granular frontend RBAC checks: `canInvite`, `canDeleteTeam`, `canModifyRoles`, `canRemoveMembers`.
- **FR-003**: System MUST use optimistic updates for role changes and member additions to ensure "instant" feel.
- **FR-004**: System MUST display clear "empty states" when a team has no members or when no team is selected.
- **FR-005**: System MUST validate that at least one 'Owner' remains in the team at all times.
- **FR-006**: System MUST provide clear visual feedback (tooltips/badges) explaining why certain actions are restricted based on the current user's role.

### Key Entities

- **Team**: Represents the collaborative unit. Attributes: Name, ID, List of Members.
- **Member**: A User associated with a Team. Attributes: UserID, Email, Name, Role (Owner, Editor, Viewer).
- **Permission**: A set of capabilities derived from the Role.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Role updates and member invitations reflect in the UI in under 200ms (via optimistic UI).
- **SC-002**: User navigation from "Workspace" to "Team Management" involves zero full-page reloads.
- **SC-003**: 100% of "restricted" actions for non-owners have associated "Permission" feedback (e.g., tooltips or disabled states with explanation).
- **SC-004**: Zero instances of "Owner-less" teams created via management UI.

## Assumptions

- **Existing Backend**: Assumes the `orpc.team.*` endpoints already support the necessary mutations (Create, Update, Delete, AddMember, etc.).
- **Auth System**: Assumes `useAuthSession` provides reliable user identity and that the backend enforces RBAC (this revamp is for the *Frontend* layer).
- **Styling**: Will use `@nuxt/ui` components for consistency with the existing dashboard.
- **Global State**: The `useTeamSelection` composable will continue to be the "source of truth" for the currently active team across the application.
