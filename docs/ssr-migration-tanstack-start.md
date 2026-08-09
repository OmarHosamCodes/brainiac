# TanStack Start migration notes

Orch `apps/web` now uses **TanStack Start** (Vite + TanStack Router) for document SSR/SSG. The Bun/Hono API in `apps/server` remains the source of truth for auth, oRPC, uploads, and live WS.

## Architecture

- Public routes (`/`, `/privacy`, `/terms`, `/login`) are prerendered at build time.
- Authenticated layout (`/_authenticated`) SSR-gates via `fetchBootSession` and warms `team.list` into the Query cache.
- Agency / Canvas / Tracker data stays client-fetched (TanStack Query + oRPC).
- Production web process: generated `.output/server/index.mjs` serves `dist/client` assets, proxies `/rpc` `/api/auth` `/uploads` `/billing` to Hono, and forwards other requests to `dist/server/server.js` (Start handler).

## Routing conventions

- File routes live in [`apps/web/src/routes/`](../apps/web/src/routes/).
- Feature code should import navigation helpers from [`@/lib/navigation`](../apps/web/src/lib/navigation.ts) (`Link`, `Navigate`, `Outlet`, `useNavigate`, `useSearchParams`, `useLocation`, `useParams`) — not `react-router-dom`.
- Free-form Agency query strings use `validateLooseSearch` on route modules.

## Perf baselines

- Phase 0 profile: [`docs/ssr-migration-phase-0-profile.md`](./ssr-migration-phase-0-profile.md)
- Keep measuring with `bun run perf` after deploy; marketing LCP should improve from real HTML vs the old dismissible shell.

## Sentry

Browser Sentry uses `browserTracingIntegration` (no React Router v7 integration). Attach router instrumentation later if TanStack-specific helpers are adopted.
