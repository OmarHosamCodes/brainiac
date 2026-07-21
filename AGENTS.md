## Learned User Preferences

- Agency work surface / time tracking should match Clockify UI and UX closely (including action parity); avoid inventing custom flows that diverge from Clockify unless explicitly requested.
- Prefer choosing an existing task over creating a new one in task selectors and suggestions.
- Timer and time-entry state must persist on the server (DB or Redis), not browser or device storage, and must survive refresh.
- While a timer is running, fields and actions should stay editable mid-tracking and changes must be durably saved.
- Keep tracker start / stop / save simple; do not overcomplicate that path.
- Optimistic UI must not flicker or diverge from server/cache truth; for critical task/timer CRUD, prefer DB/cache-confirmed updates over local-only optimistic state.
- When verifying agency UX, use the browser; for Clockify-parity work, compare against Clockify in-browser until the goal is met.
- Default git branch for rebase, merge, deploy, and fix PRs is `dev`.
- When explicitly asked for commits on multi-step work, prefer small micro-commits per logical update.
- Time duration edits should use `hh:mm:ss`.

## Learned Workspace Facts

- This repo is the Orch/brainiac Bun monorepo; agency time tracking is a core product surface (`apps/web` task-management / agency work features).
- Production hosting is on Railway (Postgres; Redis is also used for server-side persistence/cache).
- Clockify data can be imported with `bun run db:import:clockify`.
- Sentry issue fix automation is set up to open fix PRs against `dev`.
- Product features follow the golden-file layer pattern; Agency Time Tracking is the exemplar.
