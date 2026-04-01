# Internal Contract: Team Management oRPC

## Endpoints Summary

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `team.list` | N/A | `{ items: TeamSummary[] }` | List teams current user is a member of. |
| `team.get` | `{ teamId: string }` | `TeamDetail` (includes members) | Get full team details and member list. |
| `team.create` | `{ name: string }` | `TeamSummary` | Create a new team. |
| `team.update` | `{ teamId: string, name: string }` | `TeamSummary` | Rename an existing team. |
| `team.delete` | `{ teamId: string }` | `{ teamId: string, deleted: boolean }` | Delete a team and detach shared nodes. |
| `team.members.add` | `{ teamId: string, userEmail: string, role: Role }` | `TeamMember` | Invite a new member by email. |
| `team.members.updateRole` | `{ teamId: string, userId: string, role: Role }` | `{ teamId, userId, role }` | Change a member's role. |
| `team.members.remove` | `{ teamId: string, userId: string }` | `{ teamId, userId, removed: boolean }` | Remove a member from the team. |

## Optimistic UI Mapping

### Member Role Update
- **Mutation**: `team.members.updateRole`
- **Trigger**: Dropdown change in member list.
- **Cache Update**: `queryClient.setQueryData(['team', 'get', { teamId }], ...)`
- **Logic**: Update `role` for the specific `userId` in the `members` array.

### Add Member
- **Mutation**: `team.members.add`
- **Trigger**: Click "Add" in invitation form.
- **Cache Update**: `queryClient.setQueryData(['team', 'get', { teamId }], ...)`
- **Logic**: Append a temporary member object with `status: 'pending'` and the target `email`.

### Team Renaming
- **Mutation**: `team.update`
- **Trigger**: Click "Save" after editing team name.
- **Cache Update**: 
  - `queryClient.setQueryData(['team', 'list'], ...)` (Update name in summary list)
  - `queryClient.setQueryData(['team', 'get', { teamId }], ...)` (Update name in detail view)
