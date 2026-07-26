## Learned User Preferences

- Agency work surface / time tracking should match Clockify UI and UX closely (including action parity); avoid inventing custom flows that diverge from Clockify unless explicitly requested.
- Prefer choosing an existing task over creating a new one in task selectors and suggestions.
- Timer and time-entry state must persist on the server (DB or Redis), not browser or device storage, must survive refresh, and must stay editable mid-tracking with changes durably saved.
- Keep tracker start / stop / save simple; do not overcomplicate that path.
- Optimistic UI must not flicker or diverge from server/cache truth; for critical task/timer CRUD, prefer DB/cache-confirmed updates over local-only optimistic state.
- When verifying agency UX, use the browser; for Clockify-parity work, compare against Clockify in-browser until the goal is met.
- Default git branch for rebase, merge, deploy, and fix PRs is `dev`; when explicitly asked for commits on multi-step work, prefer small micro-commits per logical update.
- Primary app navigation is a left sidebar rail shared by Canvas and Agency: team controls at the top (not a logo), distinct sidebar background from the main content, notification card at the bottom, reference-style profile card, and the sidebar collapse button in the top bar; no outer padding around sidebar/top bar, no expand-on-hover, and Agency section tabs should remain reachable via hover menu when the rail is collapsed; sidebar and top bar must read as one connected shell surface.
- Styling should stay on the standard shadcn theme tokens (especially in light theme); prefer base theme tokens over custom ones; do not add custom styling to shadcn UI components unless needed; when applying an external theme pack, keep the product fonts.
- Time duration edits should use `hh:mm:ss`.
- Tracker description suggestions must never implicitly change or remove the selected task; a suggestion applies only when the user explicitly picks it, and editing the description must not resurrect a previously cleared task.
- When backfilling time entries from chat/work history, new entries must not overlap each other or existing entries, and report before/added/new-total hours.

## Learned Workspace Facts

- This repo is the Orch/brainiac Bun monorepo; agency time tracking is a core product surface (`apps/web` task-management / agency work features).
- Production hosting is on Railway (Postgres; Redis is also used for server-side persistence/cache).
- Clockify data can be imported with `bun run db:import:clockify`.
- Sentry issue fix automation is set up to open fix PRs against `dev`.
- Product features follow the golden-file layer pattern; Agency Time Tracking is the exemplar.
- Authenticated chrome is a left sidebar rail plus a thin connected top bar (breadcrumb, team switcher, notifications, collapse control) in `apps/web/src/features/app-shell/`; spatial dashboard uses `app-shell--spatial` and Agency uses `app-shell--execution` on the same topology.
- The spatial home route is `/canvas` (formerly `/dashboard`); it is a MagicBento-style bento grid (React Bits + gsap) with adaptive glass cards; auth pages keep their original UI (a bento restyle was reverted).
- Agency’s primary time-tracking nav segment is labeled Tracker (not Work).
- Dashboard and Reports hour breakdown uses a shared Paid / Waste / Internal funnel for filtered range totals.
- A weekly Cursor automation produces a canvas report of Cursor-chat vs tracked-time gaps and the proposed additions/new totals before entries are inserted.
