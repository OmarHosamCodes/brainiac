# Development Guide

Quick reference for common development tasks, workflows, and troubleshooting.

---

## Command Cheat Sheet

### Development Server

| Command                          | Purpose                           |
| -------------------------------- | --------------------------------- |
| `bun run dev`                    | Start all apps (web + server)     |
| `bun run dev:web`                | Frontend only (Vite on port 7001) |
| `bun run dev:server`             | Backend only (Bun on port 7000)   |
| `bun run dev:web -- --port 7002` | Frontend on a different port      |

### Building and Checking

| Command                  | Purpose                        |
| ------------------------ | ------------------------------ |
| `bun run build`          | Build for production           |
| `bun run check-types`    | Check TypeScript types         |
| `bun run check`          | Lint + format (Oxlint + Oxfmt) |
| `bun run test:api:bruno` | Run Bruno API tests            |
| `bun run perf`           | Run frontend perf benchmarks   |

### Database

| Command                  | Purpose                    |
| ------------------------ | -------------------------- |
| `bun run db:start`       | Start PostgreSQL in Docker |
| `bun run db:push`        | Apply schema changes       |
| `bun run db:generate`    | Generate migration files   |
| `bun run db:migrate`     | Run pending migrations     |
| `bun run db:seed`        | Load demo data             |
| `bun run db:seed:agency` | Load agency demo data      |
| `bun run db:studio`      | Open Drizzle Studio UI     |

---

## Where to Find Things

| What                 | Where                              |
| -------------------- | ---------------------------------- |
| Frontend pages       | `apps/web/src/pages/`              |
| Product features     | `apps/web/src/features/<domain>/`  |
| Shared UI            | `apps/web/src/ui/`                 |
| Shell infrastructure | `apps/web/src/features/app-shell/` |
| Frontend hooks       | Feature-local `hooks/` directories |
| oRPC client          | `apps/web/src/lib/orpc.ts`         |
| API routers          | `packages/api/src/routers/`        |
| API procedures       | `packages/api/src/procedures.ts`   |
| Database schema      | `packages/db/src/schema/`          |
| Auth config          | `packages/auth/src/`               |
| Server env           | `packages/env/src/server.ts`       |
| Vite env             | `packages/env/src/vite.ts`         |
| Server setup         | `apps/server/src/app.ts`           |
| Workspace types      | `packages/workspace/src/`          |
| Agent tools          | `packages/agent/src/`              |

The architecture and required layer direction are documented in [`docs/golden-file-pattern.md`](./docs/golden-file-pattern.md). See [`docs/golden-file-refactor-progress.md`](./docs/golden-file-refactor-progress.md) for the current audit state.

---

## App Routes

| Path           | Page               |
| -------------- | ------------------ |
| `/`            | Landing            |
| `/login`       | Login              |
| `/dashboard`   | Canvas workspace   |
| `/agency`      | Agency operations  |
| `/marketplace` | Node marketplace   |
| `/billing`     | Billing            |
| `/node/:id`    | Single node editor |

Routes are defined in `apps/web/src/app.tsx` and `apps/web/src/authenticated-routes.tsx`.

---

## Common Development Workflows

### Hot Reload Not Working

1. Stop the dev server (`Ctrl+C`)
2. Clear cache: `rm -rf apps/web/dist apps/web/.output node_modules/.turbo`
3. Restart: `bun run dev`

### Database Connection Issues

**Issue**: `Error: connect ECONNREFUSED` or similar

**Steps**:

1. Check PostgreSQL is running: `bun run db:start`
2. Verify `.env` has correct `DATABASE_URL`
3. Check Docker: `docker ps` should show the postgres container
4. View logs: `docker logs <container-id>`

**Connection string format** (default Docker setup):

```
postgresql://postgres:password@localhost:5440/brainiac
```

### Port Already in Use

**Issue**: `Address already in use` on 7001 or 7000

```bash
# Kill process on port 7001 (frontend)
lsof -i :7001
kill -9 <PID>

# Or start on a different port
bun run dev:web -- --port 7002
```

---

## Common Tasks

### Add a New Environment Variable

1. Add to `packages/env/src/server.ts` (backend) or `packages/env/src/vite.ts` (frontend):

```typescript
// packages/env/src/server.ts
export const env = createEnv({
  server: {
    MY_NEW_VAR: z.string().min(1),
    // ...
  },
});
```

2. Add to `.env.example` and the relevant app `.env.example`

3. Use in server code:

```typescript
import { env } from "@brainiac/env/server";

const value = env.MY_NEW_VAR;
```

Frontend vars use the `VITE_PUBLIC_` prefix and are read via `@/lib/env`.

### Update Database Schema

1. Modify schema in `packages/db/src/schema/`
2. Push changes: `bun run db:push`
3. For a migration file: `bun run db:generate` then `bun run db:migrate`

### Add an oRPC Endpoint

1. Create or extend a router in `packages/api/src/routers/`:

```typescript
import { z } from "zod";
import { protectedProcedure } from "../../procedures";

export const myFeatureRouter = {
  list: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .handler(async ({ input, context }) => {
      return { items: [], teamId: input.teamId, userId: context.session.user.id };
    }),
};
```

2. Register in `packages/api/src/routers/index.ts`:

```typescript
import { myFeatureRouter } from "./my-feature";

export const appRouter = {
  // ...
  myFeature: myFeatureRouter,
};
```

No server wiring needed beyond that; `apps/server/src/lib/handlers.ts` serves the full `appRouter` at `/rpc`.

3. Use in the frontend:

```typescript
import { orpc, orpcClient } from "@/lib/orpc";
import { useQuery, useMutation } from "@tanstack/react-query";

// Query
const { data } = useQuery(orpc.myFeature.list.queryOptions({ input: { teamId } }));

// Mutation
const create = useMutation(orpc.myFeature.create.mutationOptions());
await orpcClient.myFeature.create({ teamId, name: "Example" });
```

### Run Database Studio

```bash
bun run db:studio
```

Opens at `https://local.drizzle.studio`.

---

## Optional Services

### Redis (agency live sync)

Agency task thread updates use Redis pub/sub. Without Redis, live sync falls back to polling.

```env
REDIS_URL=redis://localhost:6379
```

### S3 (task attachments)

Agency task attachments need S3-compatible storage:

```env
S3_ENDPOINT=https://s3.example.com
S3_REGION=auto
S3_BUCKET=brainiac-task-attachments
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

### AI agent

Set `OPENROUTER_API_KEY` in `apps/server/.env`. The agent rail on the dashboard requires it.

---

## Troubleshooting

### Build Fails with Module Not Found

```bash
bun install
bun run check-types
```

### Seed Data Doesn't Load

```bash
bun run db:push
bun run db:seed
```

**Custom password**:

```bash
BRAINIAC_SEED_PASSWORD=mypassword bun run db:seed
```

**Seed into existing account**:

```bash
bun run db:seed -- --email your@email.com
```

### Frontend Can't Reach Backend

1. Is the backend running? `curl http://localhost:7000`
2. Is the frontend at `http://localhost:7001`?
3. Vite proxies `/rpc` and `/api/auth` to port 7000 in dev (see `apps/web/vite.config.ts`)

In production, RPC and auth route through the web origin. `getRpcBaseUrl()` in `apps/web/src/lib/env.ts` handles this.

### Performance Issues During Development

```bash
rm -rf node_modules apps/web/dist apps/web/.output .turbo bun.lock
bun install
bun run dev
```

---

## Useful Debug Tips

```bash
docker ps              # Database container
lsof -i :7000          # Backend
lsof -i :7001          # Frontend
bun run check-types    # Type check
bun run check          # Lint + format
```

---

## Related Documentation

- **[README.md](./README.md)** — Project overview and quick start
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — How to contribute, code standards
- **[PRODUCT.md](./PRODUCT.md)** — Product purpose and principles
- **[DESIGN.md](./DESIGN.md)** — Visual system and component rules

---

## Still Stuck?

1. Check terminal logs for the failing service
2. Clear caches and restart
3. Search GitHub issues
4. Open an issue with what you tried and the error output
