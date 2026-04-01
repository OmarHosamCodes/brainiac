# Data Model: Team Management Revamp

## Refined Core Entities

The revamp relies on the existing Team and Member entities, but we'll formalize the permissions associated with each role in the frontend logic.

### Member (Frontend State)
| Field | Type | Description |
|-------|------|-------------|
| userId | string | Unique user ID |
| userName | string | User's display name |
| userEmail | string | User's email |
| role | string | One of: `owner`, `editor`, `viewer` |

### Team (Frontend View State)
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique team ID |
| name | string | Display name |
| role | string | Current user's role in this team |
| members | Member[] | Full list of team members |

## Derived Permissions (RBAC)

These are computed in the frontend based on the current user's role:

| Permission | Role Required | Description |
|------------|---------------|-------------|
| canInvite | `owner` | Can add new members |
| canDelete | `owner` | Can delete the team |
| canRename | `owner` | Can change team name |
| canManageMembers | `owner` | Can change roles or remove members |
| canViewMembers | `owner`, `editor`, `viewer` | Can see the member list |

## State Transitions (Optimistic Updates)

### Update Member Role
- **Action**: Select new role for member X.
- **Initial State**: `members: [{ id: X, role: 'viewer' }]`
- **Optimistic State**: `members: [{ id: X, role: 'editor' }]`
- **On Success**: Keep 'editor'.
- **On Failure**: Revert to 'viewer' and notify user.

### Add Member
- **Action**: Invite `user@example.com`.
- **Initial State**: `members: []`
- **Optimistic State**: `members: [{ email: 'user@example.com', role: 'viewer', status: 'pending' }]`
- **On Success**: Sync with server ID and metadata.
- **On Failure**: Remove from list and notify user.
