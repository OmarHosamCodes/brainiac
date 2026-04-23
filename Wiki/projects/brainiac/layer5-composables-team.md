---
title: Layer 5 — Team Composables (useTeamSelection, useTeamManagement)
tags: [layer5, composables, vue, teams, orpc, optimistic-updates]
---

# Layer 5 — Team Composables

## 1. `useTeamSelection`

**Type:** Composable  
**File:** `apps/web/app/composables/useTeamSelection.ts`

Manages the currently selected team and team list state. Two queries:
- `teamListQuery` → `orpc.team.list` (auth-gated)
- `teamDetailQuery` → `orpc.team.get({ teamId: selectedTeamId })` (enabled when `selectedTeamId` is set)

Auto-selects first team when `selectedTeamId` is unset or the selected team is removed. Syncs `teamNameDraft` to `selectedTeam.name` on team change. `refreshTeamData()` refetches both queries in parallel.

### Exported Surface
`teamListQuery`, `teamDetailQuery`, `teams`, `selectedTeam`, `selectedTeamId`, `newTeamName`, `teamNameDraft`, `refreshTeamData`.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `pages/dashboard.vue` | calls `useTeamSelection()`, passes result to `useTeamManagement` + `useNodeSharing` |
| `useTeamManagement` | receives `teamSelection` as option |
| `useNodeSharing` | receives `teamSelection` as option |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@tanstack/vue-query` | `useQuery` for team list + team detail |
| `useOrpc()` | `orpc.team.list.queryOptions()`, `orpc.team.get.queryOptions({ input: { teamId } })` |
| `useAuthSession()` | auth guard for query enabled state |

**Standalone Status:** Not standalone — depends on `useOrpc`, `useAuthSession`, TanStack Vue Query.

---

## 2. `useTeamManagement`

**Type:** Composable  
**File:** `apps/web/app/composables/useTeamManagement.ts`

Full team CRUD with optimistic updates. Accepts `{ teamSelection, workspaceQuery }`. Creates 6 mutations:

| Mutation | oRPC Procedure |
|---|---|
| `createTeamMutation` | `orpc.team.create` |
| `updateTeamMutation` | `orpc.team.update` |
| `deleteTeamMutation` | `orpc.team.delete` |
| `addTeamMemberMutation` | `orpc.team.members.add` |
| `updateTeamMemberRoleMutation` | `orpc.team.members.updateRole` |
| `removeTeamMemberMutation` | `orpc.team.members.remove` |

### Optimistic Update Pattern
- `saveTeamName`: pre-writes updated name to both `teamDetailQueryKey` and `teamListQueryKey` caches; rolls back both on failure
- `addTeamMember`: inserts optimistic member with `pending-{uuid}` id; replaces with real server response; rolls back on failure
- `updateMemberRole`: pre-writes new role to `teamDetailQueryKey`; rolls back on failure
- `removeMember`: pre-filters member from `teamDetailQueryKey`; rolls back on failure

### Permission Guards
Computes `canInvite`, `canDeleteTeam`, `canModifyRoles`, `canRemoveMembers` — all require `selectedTeamRole === "owner"`.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `pages/dashboard.vue` | calls `useTeamManagement({ teamSelection, workspaceQuery })`, destructures all mutations + actions |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@tanstack/vue-query` | `useMutation`, `useQueryClient` for cache manipulation |
| `useOrpc()` | all 6 team mutation options |
| `useAuthSession()` | reads `currentUserId` |
| `~/utils/get-error-message` | `getErrorMessage` for toast errors |
| `useToast()` (Nuxt UI) | success/error notifications |
| `teamSelection.refreshTeamData()` | called in `finally` blocks |
| `workspaceQuery.refetch()` | called after delete + removeMember |

**Standalone Status:** Not standalone — depends on `useOrpc`, `useAuthSession`, TanStack Vue Query, `@brainiac/workspace`, toast.
