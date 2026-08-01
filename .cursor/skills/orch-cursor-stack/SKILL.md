---
name: orch-cursor-stack
description: Routes Orch/brainiac work to the best skills, MCP servers, and project rules by domain (UI, UX, feature logic, backend, DB, infra, ship, agent). Use when starting Orch feature work, choosing which tools to attach, cleaning up Cursor environment noise, or when the user asks for the best stack for UI/UX/backend/DB/deploy.
---

# Orch Cursor Stack

Pick the domain first. Load only that stack’s skills/MCP. Do not pull the whole inventory.

## Always-on (every domain)

1. Rules: `core-conventions`, `golden-file-pattern`, globs for the files you touch
2. `AGENTS.md` product prefs + ponytail (reuse first, fewest files)
3. Bun only — never npm/pnpm/yarn
4. Done means: `bun run check` · `bun run check-types` · `bun run check:conventions` (feature/API/web) · `bun run check:golden` when adding/relocating in-scope files

Process lane: **Superpowers** (`brainstorming` → `writing-plans` → implement → `verification-before-completion`). Do not also load Compound Engineering `ce-*` unless the user asks for CE explicitly.

## Domain stacks

### UI / visual

- **Skills:** `impeccable` → `dashboard-ui-design` (Agency analytics) → `deslop` on polish
- **MCP:** `plugin-shadcn-shadcn` · `cursor-ide-browser` · `user-design-inspiration` (sparingly)
- **Rules/prefs:** `web-frontend` · existing DESIGN.md / shadcn tokens · no liquid-glass · no new custom theme tokens
- **Avoid:** regenerating DESIGN.md/tokens via ui-scaffolding on existing Orch surfaces; `nuxt-ui`

### UX / flows

- **Skills:** `cognitive-walkthrough` · `growth-design-review` · `ux-writing`
- **MCP:** `cursor-ide-browser` (prefer over browse) for Agency / Clockify parity
- **Prefs:** Tracker/Reports Clockify parity; waste marks target one entry only; prefer existing task over create

### Feature logic (golden layers)

- **Skills:** `brainstorming` · `writing-plans` · `test-driven-development` when non-trivial logic
- **MCP:** `plugin-context7-plugin-context7` for TanStack/React docs
- **Rules:** `golden-file-pattern` · `web-frontend` — view ← container ← hook ← store ← oRPC; no layer skips

### Backend / API

- **Skills:** `hono` · `bun` · `better-auth-best-practices` / `polar-better-auth` when auth/billing
- **MCP:** context7 · `plugin-sentry-sentry` for prod symptoms
- **Rules:** `api-orpc` · `server-hono` — thin router → `service(actorUserId, input)` → Zod parse; `requireTeamMembership` in services

### Database

- **Skills:** `bun` for scripts
- **MCP:** `user-railway` for prod ops; context7 for Drizzle
- **Rules:** `db-drizzle` — prefixed IDs, team indexes, `bun run db:push` locally

### Infra / deploy

- **Skills:** `use-railway`
- **MCP:** **`user-railway` only** (ready). Ignore `plugin-railway-railway` while status is error
- **Rules:** env via `@orch/env/server` / web `getRpcBaseUrl` — never raw `process.env` in app code

### Debug / ship

- **Skills:** `systematic-debugging` · `fix-ci` / `loop-on-ci` · `review-and-ship` · `review-bugbot` · `review-security` · `babysit`
- **MCP:** Sentry · ide-browser · `user-railway` logs
- **Git:** default base branch `dev`

### Workspace agent / AI

- **Skills:** `openrouter-typescript-sdk` · canvas skill for standalone analytical artifacts
- **Rule:** browser/Vite must not import `@orch/agent` barrel — use `@orch/agent/types` or `@orch/agent/model-routing`

## Attach recipes

| Job                       | Attach                                                                          |
| ------------------------- | ------------------------------------------------------------------------------- |
| Agency Tracker/Reports UI | impeccable · cognitive-walkthrough · dashboard-ui-design · ide-browser · shadcn |
| New API + DB feature      | brainstorming · writing-plans · hono · bun · (context7)                         |
| Prod bug → PR             | systematic-debugging · Sentry · review-and-ship · Bugbot                        |

## Mute for brainiac

| Item                                  | Action                                        |
| ------------------------------------- | --------------------------------------------- |
| `nuxt-ui`, `vue-pinia-best-practices` | Ignore (wrong stack)                          |
| Compound Engineering vs Superpowers   | Superpowers wins unless user says CE          |
| `plugin-railway` (error)              | Use `user-railway`                            |
| `user-open-design` (error)            | Skip until daemon healthy; do not block on it |
| Standalone Mobbin MCP                 | Prefer design-inspiration’s Mobbin tools      |
| ui-scaffolding token regen on Orch    | Skip — keep existing shadcn theme             |

## Detail

For the full inventory canvas (counts, health), see the stack map artifact if present under the workspace canvases folder (`cursor-environment-best-stack.canvas.tsx`). Do not recreate it unless asked.
