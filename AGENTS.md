## Learned User Preferences

- Agency work surface / time tracking should match Clockify UI and UX closely (including action parity); avoid inventing custom flows that diverge from Clockify unless explicitly requested.
- Prefer choosing an existing task over creating a new one in task selectors and suggestions.
- Timer and time-entry state must persist on the server (DB or Redis), not browser or device storage, and must survive refresh.
- While a timer is running, fields and actions should stay editable mid-tracking and changes must be durably saved.
- Keep tracker start / stop / save simple; do not overcomplicate that path.
- Optimistic UI must not flicker or diverge from server/cache truth; for critical task/timer CRUD, prefer DB/cache-confirmed updates over local-only optimistic state.
- When verifying agency UX, use the browser; for Clockify-parity work, compare against Clockify in-browser until the goal is met.
- Default git branch for rebase, merge, deploy, and fix PRs is `dev`; when explicitly asked for commits on multi-step work, prefer small micro-commits per logical update.
- Primary app navigation should move to a left sidebar or icon rail rather than the unified top bar; Dashboard and Agency should share one shell chrome topology.
- Time duration edits should use `hh:mm:ss`.
- Tracker description suggestions must never implicitly change or remove the selected task; a suggestion applies only when the user explicitly picks it, and editing the description must not resurrect a previously cleared task.
- When backfilling time entries from chat/work history, new entries must not overlap each other or existing entries, and report before/added/new-total hours.

## Learned Workspace Facts

- This repo is the Orch/brainiac Bun monorepo; agency time tracking is a core product surface (`apps/web` task-management / agency work features).
- Production hosting is on Railway (Postgres; Redis is also used for server-side persistence/cache).
- Clockify data can be imported with `bun run db:import:clockify`.
- Sentry issue fix automation is set up to open fix PRs against `dev`.
- Product features follow the golden-file layer pattern; Agency Time Tracking is the exemplar.
- Authenticated chrome is a unified floating-glass top bar (global ⌘K search, team switcher, agent dock); spatial dashboard canvas uses `app-shell--spatial` and Agency uses `app-shell--execution`, aligned to the same topology.
- The dashboard home is a MagicBento-style bento grid (React Bits + gsap) with adaptive glass cards; auth pages keep their original UI (a bento restyle was reverted).
- A weekly Cursor automation produces a canvas report of Cursor-chat vs tracked-time gaps and the proposed additions/new totals before entries are inserted.
