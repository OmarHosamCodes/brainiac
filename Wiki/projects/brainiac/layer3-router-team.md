---
title: Layer 3 — Team Router
tags: [layer3, api, orpc, router, team, members, rbac]
---

# Layer 3 — Team Router

**Entity:** `teamRouter`  
**Type:** ORPC Router  
**File:** `packages/api/src/routers/team/index.ts`

## Inline Schemas (defined in router file)

| Schema              | Shape                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `teamMemberSchema`  | `{ teamId, userId, userName, userEmail (email), role (workspaceTeamRoleSchema), joinedAt (datetime), updatedAt (datetime) }` |
| `teamSummarySchema` | `{ id, name (max 120), role, createdByUserId, updatedAt (datetime) }`                                                        |
| `teamDetailSchema`  | extends `teamSummarySchema` with `members: teamMemberSchema[]`                                                               |

## Procedure Map

| Procedure                 | Auth Level           | Input Schema                  | Handler Summary                                                                                                           |
| ------------------------- | -------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `team.list`               | `protectedProcedure` | none                          | calls `listUserTeams(userId)`, validates with `z.object({ items: z.array(teamSummarySchema) })`                           |
| `team.get`                | `protectedProcedure` | `{ teamId }`                  | calls `getTeam(userId, teamId)`, validates with `teamDetailSchema`                                                        |
| `team.create`             | `protectedProcedure` | `{ name (max 120) }`          | calls `getBillingStateForUser` + `listUserTeams` for limit check; on pass calls `createTeam(userId, name)`                |
| `team.update`             | `protectedProcedure` | `{ teamId, name }`            | calls `updateTeam(userId, input)`, re-fetches membership to resolve actor role, validates with `teamSummarySchema`        |
| `team.delete`             | `protectedProcedure` | `{ teamId }`                  | calls `deleteTeam(userId, input)`, validates with `z.object({ teamId, deleted })`                                         |
| `team.members.list`       | `protectedProcedure` | `{ teamId }`                  | calls `listTeamMembers(userId, teamId)`, validates with `z.object({ items: z.array(teamMemberSchema) })`                  |
| `team.members.add`        | `protectedProcedure` | `{ teamId, userEmail, role }` | calls `addTeamMember(userId, input)`; re-fetches members to resolve full member object; validates with `teamMemberSchema` |
| `team.members.updateRole` | `protectedProcedure` | `{ teamId, userId, role }`    | calls `updateTeamMemberRole(userId, input)`, validates with `z.object({ teamId, userId, role })`                          |
| `team.members.remove`     | `protectedProcedure` | `{ teamId, userId }`          | calls `removeTeamMember(userId, input)`, validates with `z.object({ teamId, userId, removed })`                           |

## Billing Enforcement in `team.create`

- Calls `getBillingStateForUser(userId)` + `listUserTeams(userId)`.
- If `existing.length >= billing.limits.teams` → throws `ORPCError("FORBIDDEN", { data: { limit, current } })`.

## Outgoing Dependencies

| Dependency                                        | Mechanism                                                                                                                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@brainiac/workspace` (`workspaceTeamRoleSchema`) | imported for member role Zod schema                                                                                                                                                      |
| `@orpc/server` (`ORPCError`)                      | dynamically imported inside `team.create` for billing limit error                                                                                                                        |
| `../../billing-guard` (`getBillingStateForUser`)  | called in `team.create` handler                                                                                                                                                          |
| `../../procedures` (`protectedProcedure`)         | base procedure for all routes                                                                                                                                                            |
| `./service`                                       | imports all nine service functions: `addTeamMember`, `createTeam`, `deleteTeam`, `getTeam`, `listUserTeams`, `listTeamMembers`, `removeTeamMember`, `updateTeam`, `updateTeamMemberRole` |

## Incoming Dependents

| Consumer           | Mechanism                                                        |
| ------------------ | ---------------------------------------------------------------- |
| `routers/index.ts` | mounted as `team: teamRouter` on `appRouter`                     |
| `apps/web`         | calls team CRUD and member management procedures via ORPC client |

## Standalone Status

Not standalone — depends on `@brainiac/workspace`, billing-guard, procedures, and service layer.
