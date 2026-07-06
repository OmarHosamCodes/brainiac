# Contributing to Brainiac

Thank you for your interest in contributing. This guide covers setup, project layout, and common workflows.

## Prerequisites

- **Bun** v1.3.10+ ([install here](https://bun.sh))
- **Git**
- **Docker** (optional; for local PostgreSQL)
- **TypeScript** knowledge
- **React** knowledge (frontend is React 19 + Vite, not Nuxt)

## Getting Started

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/brainiac.git
cd brainiac
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Setup Local Environment

```bash
cp .env.example .env
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Review the `.env` files. At minimum, set `BETTER_AUTH_SECRET` (32+ chars) and `OPENROUTER_API_KEY` if you need the agent.

### 4. Setup Database

```bash
bun run db:start
bun run db:push
bun run db:seed       # optional
```

### 5. Start Development

```bash
bun run dev
```

Visit [http://localhost:7001](http://localhost:7001). The API runs at [http://localhost:7000](http://localhost:7000).

---

## Project Structure

```
brainiac/
├── apps/web/                    # Frontend (React + Vite)
│   └── src/
│       ├── pages/               # Route pages
│       ├── components/          # UI (dashboard, agency, canvas, ui, …)
│       ├── lib/                 # oRPC client, hooks, utilities
│       └── stores/              # Zustand stores
│
├── apps/server/                 # Backend (Hono on Bun)
│   └── src/
│       ├── app.ts               # Hono app, auth, RPC, WebSocket
│       └── seed.ts              # Database seeding
│
├── packages/
│   ├── api/                     # oRPC routers and business logic
│   ├── db/                      # Drizzle schema and migrations
│   ├── auth/                    # Better-Auth setup
│   ├── env/                     # Environment validation
│   ├── agent/                   # AI agent tools
│   ├── workspace/               # Workspace types and block schemas
│   └── config/                  # Shared TS config
```

Packages are shared between frontend and backend.

---

## Common Workflows

### Adding a Backend Endpoint

Routers live in `packages/api/src/routers/` and are composed in `packages/api/src/routers/index.ts`.

#### 1. Define the router

```typescript
// packages/api/src/routers/my-feature.ts
import { z } from "zod";
import { protectedProcedure } from "../procedures";

export const myFeatureRouter = {
  list: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .handler(async ({ input, context }) => {
      return { items: [], teamId: input.teamId };
    }),

  create: protectedProcedure
    .input(z.object({ teamId: z.string(), name: z.string() }))
    .handler(async ({ input, context }) => {
      return { id: "new-id", name: input.name };
    }),
};
```

#### 2. Register in the app router

```typescript
// packages/api/src/routers/index.ts
import { myFeatureRouter } from "./my-feature";

export const appRouter = {
  // ...
  myFeature: myFeatureRouter,
};
```

The server picks this up automatically via `handleAppRouterRequest` at `/rpc`.

#### 3. Use in the frontend

```tsx
import { useQuery, useMutation } from "@tanstack/react-query";
import { orpc, orpcClient } from "@/lib/orpc";

function MyFeatureList({ teamId }: { teamId: string }) {
  const { data } = useQuery(
    orpc.myFeature.list.queryOptions({ input: { teamId } }),
  );

  const create = useMutation(orpc.myFeature.create.mutationOptions());

  return (
    <ul>
      {data?.items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### Adding a Frontend Component

Components go in `apps/web/src/components/`:

```tsx
// apps/web/src/components/my-component.tsx
type MyComponentProps = {
  title: string;
  children?: React.ReactNode;
};

export function MyComponent({ title, children }: MyComponentProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-title font-semibold">{title}</h2>
      {children}
    </div>
  );
}
```

Use `@/` imports for app-local modules. Match existing Tailwind patterns and the design rules in [DESIGN.md](./DESIGN.md).

### Adding a Database Table

#### 1. Create the schema

```typescript
// packages/db/src/schema/my-table.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const myTable = pgTable("my_table", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

Export it from `packages/db/src/schema/index.ts`.

#### 2. Apply

```bash
bun run db:push
```

#### 3. Query

```typescript
import { db } from "@brainiac/db";
import { myTable } from "@brainiac/db/schema";

const items = await db.select().from(myTable);
```

### Adding an Environment Variable

1. Add to `packages/env/src/server.ts` (backend) or `packages/env/src/vite.ts` (frontend `VITE_PUBLIC_*` vars)
2. Document in `.env.example`
3. Use via `@brainiac/env/server` or `@/lib/env`

---

## Code Standards

### TypeScript

- Strict mode enabled
- Type function parameters and returns
- Avoid `any`; use generics or unions

### Formatting and Linting

```bash
bun run check
```

Uses **Oxlint** for linting and **Oxfmt** for formatting.

### Commits

Follow conventional commits:

```
feat: add agency client filter
fix: resolve timer drift on stop
docs: update development guide
refactor: simplify workspace save path
```

---

## Pull Request Process

### Before You Submit

```bash
git checkout -b feat/my-feature
bun run dev
bun run check-types
bun run check
git commit -m "feat: add my feature"
git push origin feat/my-feature
```

### PR Checklist

- [ ] `bun run check` passes
- [ ] `bun run check-types` passes
- [ ] Commit messages follow conventions
- [ ] PR description explains what and why

### What We Look For

- **Clarity**: Code is easy to follow
- **Type safety**: Full TypeScript coverage
- **Consistency**: Matches existing patterns
- **Documentation**: Complex logic is explained where needed

---

## Getting Help

- **Setup issues**: [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Product context**: [PRODUCT.md](./PRODUCT.md)
- **Visual rules**: [DESIGN.md](./DESIGN.md)
- **Bugs**: Open a GitHub issue

---

## Thank You

Your contributions help make Brainiac better.
