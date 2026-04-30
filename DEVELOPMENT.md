# Development Guide

Quick reference for common development tasks, workflows, and troubleshooting.

---

## ⚡ Command Cheat Sheet

### Development Server

| Command                      | Purpose                       |
| ---------------------------- | ----------------------------- |
| `bun run dev`                | Start all apps (web + server) |
| `bun run dev:web`            | Frontend only (Nuxt)          |
| `bun run dev:server`         | Backend only (Hono)           |
| `bun run dev:web -- -p 3002` | Frontend on different port    |

### Building & Checking

| Command               | Purpose                        |
| --------------------- | ------------------------------ |
| `bun run build`       | Build for production           |
| `bun run check-types` | Check TypeScript types         |
| `bun run check`       | Lint + format (Oxlint + Oxfmt) |

### Database

| Command               | Purpose                    |
| --------------------- | -------------------------- |
| `bun run db:start`    | Start PostgreSQL in Docker |
| `bun run db:push`     | Apply schema changes       |
| `bun run db:generate` | Generate database types    |
| `bun run db:migrate`  | Run pending migrations     |
| `bun run db:seed`     | Load demo data             |
| `bun run db:studio`   | Open Drizzle Studio UI     |

---

## 📍 Where to Find Things

| What             | Where                       |
| ---------------- | --------------------------- |
| Frontend pages   | `apps/web/app/pages/`       |
| Components       | `apps/web/app/components/`  |
| API routes       | `packages/api/src/routes/`  |
| Database schema  | `packages/db/src/schema/`   |
| Auth config      | `packages/auth/src/`        |
| Environment vars | `packages/env/src/index.ts` |
| Server setup     | `apps/server/src/app.ts`    |

---

## 🔄 Common Development Workflows

### Debugging TypeScript Errors

**Issue**: Type errors appear in editor but `bun run check-types` passes

**Solution**: TypeScript in Bun can be stricter in some cases. Run:

```bash
bun run check-types --force    # Force clear cache
```

### Hot Reload Not Working

**Issue**: Changes don't reflect without restarting

**Solution**: This should work automatically. If stuck:

1. Stop the dev server (`Ctrl+C`)
2. Clear cache: `rm -rf .nuxt node_modules/.turbo`
3. Restart: `bun run dev`

### Database Connection Issues

**Issue**: `Error: connect ECONNREFUSED` or similar

**Steps**:

1. Check PostgreSQL is running: `bun run db:start`
2. Verify `.env` has correct `DATABASE_URL`
3. Check Docker: `docker ps` should show postgres container
4. View logs: `docker logs <container-id>`

**Connection string format**:

```
postgresql://user:password@localhost:5432/dbname
```

### Port Already in Use

**Issue**: `Address already in use` on 3001 or 3000

**Solution**:

```bash
# Kill process on port 3001 (frontend)
lsof -i :3001
kill -9 <PID>

# Or start on different port
bun run dev:web -- -p 3002
```

---

## 📝 Common Tasks

### Add a New Environment Variable

1. Update `packages/env/src/index.ts`:

```typescript
export const env = z.object({
  DATABASE_URL: z.string(),
  API_KEY: z.string(), // Add new var
  // ... other vars
});
```

2. Add to `.env` and `.env.example`:

```env
API_KEY=your_key_here
```

3. Use in code:

```typescript
import { env } from "@brainiac/env";

const apiKey = env.API_KEY;
```

### Update Database Schema

1. Modify schema in `packages/db/src/schema/`:

```typescript
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  newColumn: text("new_column"), // Add new column
});
```

2. Push changes:

```bash
bun run db:push
```

3. If you need a migration file (not generated):

```bash
bun run db:migrate
```

### Add an oRPC Endpoint

1. Create or update router in `packages/api/src/routes/`:

```typescript
import { createRouter } from "@brainiac/api";
import { z } from "zod";

export const meRouter = createRouter({
  getProfile: router.query({
    input: z.void(),
    resolve: async () => {
      // Logic here
      return profile;
    },
  }),
});
```

2. Register in `apps/server/src/app.ts`:

```typescript
import { meRouter } from "@brainiac/api/routes/me";

app.rpc("/me", meRouter);
```

3. Use in frontend (types are automatic):

```typescript
const profile = await $rpc.me.getProfile();
```

### Run Database Studio UI

Drizzle Studio is a visual tool for browsing your database:

```bash
bun run db:studio
```

This opens a web interface at `https://local.drizzle.studio` where you can browse tables and run queries.

---

## 🐛 Troubleshooting

### Build Fails with Module Not Found

**Issue**: `Error: Cannot find module '@brainiac/...'`

**Solution**:

```bash
bun install              # Reinstall dependencies
bun run check-types      # Verify types are correct
```

### Seed Data Doesn't Load

**Issue**: `bun run db:seed` fails or doesn't create data

**Solution**:

```bash
# Check if database exists
bun run db:studio

# Re-push schema
bun run db:push

# Try seeding again
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

**Issue**: Network request fails (CORS, connection refused)

**Check**:

1. Is backend running? `curl http://localhost:3000`
2. Is frontend at correct URL? (`http://localhost:3001`)
3. Check `.env` in `apps/web` for correct API URL

**Common fix**:

```env
# apps/web/.env
NUXT_PUBLIC_API_BASE=http://localhost:3000
```

### TypeScript Strict Mode Errors

**Issue**: Type errors even in working code

**Solution**: Ensure `tsconfig.json` has `strict: true` and fix the type:

```typescript
// Before (error)
const data = response.data;

// After (fixed)
const data: MyType = response.data;
```

### Performance Issues During Development

**Issue**: Dev server slow, rebuilds take forever

**Try**:

```bash
# Rebuild from scratch
rm -rf node_modules .nuxt .turbo bun.lock
bun install
bun run dev

# Or just clear cache
bun run check -- --cache=false
```

---

## 🔍 Useful Debug Tips

### Check All Services Running

```bash
# Database
docker ps

# Ports in use
lsof -i :3000      # Backend
lsof -i :3001      # Frontend

# Git status
git status
```

### View Database Logs

```bash
docker logs <postgres-container-id>
```

### Check Environment Variables

```typescript
// In any file
import { env } from "@brainiac/env";
console.log(env);
```

### TypeScript Help

```bash
# Check all types
bun run check-types

# Show unused code
bun run check
```

---

## 📚 Related Documentation

- **[README.md](./README.md)** — Project overview and quick start
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — How to contribute, code standards
- **Tech Stack**: Nuxt, Hono, oRPC, Drizzle, PostgreSQL

---

## Still Stuck?

1. **Check logs**: Most errors are in terminal output
2. **Clear cache**: `bun run build --cache=false`
3. **Restart everything**: Stop, delete `.nuxt/.turbo`, restart
4. **Search GitHub issues**: Your problem might be solved there
5. **Open an issue**: Describe what you tried, share errors
