# Auth, Membership, and Error Audit

Audited 2026-07-10 against the current worktree.

## Verified

- API routers extract the authenticated actor from `context.session.user.id`.
- Resource services perform membership and role checks through `requireTeamMembership` or the agency shared membership boundary.
- Team and workspace mutation services use actor-first inputs and do not trust client-supplied actor IDs.
- Router files under `packages/api/src/routers` contain no direct database or Drizzle imports.
- Generic unexpected-error translation remains centralized in API procedure/dev-error infrastructure and the agent router’s service boundary.

## Remaining Review

- [ ] Complete a static audit for generic `Error` throws used in user-actionable service paths.
- [ ] Complete a web audit proving views receive display-ready error strings rather than raw exceptions.
- [ ] Add naming checks for schema/service/container conventions where static rules can be reliable.
- [ ] Add focused authorization tests for the highest-risk Team and Workspace mutations.
