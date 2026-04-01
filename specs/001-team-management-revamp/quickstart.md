# Quickstart: Team Management

## Accessing Team Settings

1. Click the "Teams" panel toggle in the dashboard sidebar.
2. Select a team from the dropdown.
3. Click the "Manage Team" button (newly added) or the "Gear" icon to open the dedicated **Team Settings Modal**.

## Managing Members

### Inviting a New Member (Owners Only)
1. Open the **Team Settings Modal**.
2. Go to the "Members" tab.
3. Enter the email address of the person you want to invite.
4. Select their role (`Owner`, `Editor`, or `Viewer`).
5. Click **Invite**. The member will appear in the list immediately with an optimistic update.

### Changing Member Roles
1. In the "Members" tab, find the member you want to update.
2. Select a new role from the dropdown menu.
3. The change is saved instantly and reflected across the dashboard.

## RBAC Visibility

- **Owners**: Can see all management buttons (Invite, Remove, Delete Team).
- **Editors/Viewers**: Management buttons are either hidden or disabled with a tooltip explaining that "Owner role is required" for that action.
- **Empty States**: If a team has no members yet, a clear invitation prompt is displayed to the Owner.
