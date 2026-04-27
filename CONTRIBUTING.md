# Contributing to Brainiac

Thank you for your interest in contributing to Brainiac! This guide will help you get started.

## Prerequisites

Before you begin, ensure you have:

- **Bun** v1.3.10+ ([install here](https://bun.sh))
- **Git** for version control
- **Docker** (optional, for PostgreSQL; we can use a local instance)
- **TypeScript** knowledge (for backend and shared packages)
- **Vue 3** or **React** knowledge (for frontend)

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/brainiac.git
cd brainiac
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Setup Local Environment

Copy `.env.example` to `.env` files in both `apps/server` and `apps/web`:

```bash
cp .env.example apps/server/.env
cp .env.example apps/web/.env
```

### 4. Setup Database

```bash
bun run db:start      # Start PostgreSQL in Docker
bun run db:push       # Apply schema
bun run db:seed       # Load demo data (optional)
```

### 5. Start Development

```bash
bun run dev
```

Visit [http://localhost:3001](http://localhost:3001) to see the app. The API runs at [http://localhost:3000](http://localhost:3000).

---

## Project Structure

Understanding the layout helps you know where to make changes:

```
brainiac/
├── apps/web/            # Frontend (Nuxt 4)
│   ├── app/             # Pages, components, layouts
│   ├── server/          # Nuxt server routes
│   └── public/          # Static files
│
├── apps/server/         # Backend (Hono)
│   └── src/
│       ├── app.ts       # Main Hono app setup
│       ├── lib/         # Utilities and helpers
│       └── seed.ts      # Database seeding
│
├── packages/
│   ├── api/             # API types and logic (shared)
│   ├── db/              # Database schema & ORM (shared)
│   ├── auth/            # Auth setup & utilities (shared)
│   └── env/             # Environment validation (shared)
```

**Key**: Packages are shared—changes affect both frontend and backend.

---

## Common Workflows

### Adding a Backend Endpoint

Backend endpoints are defined using Hono + oRPC for end-to-end type safety.

#### 1. Define Your API in `packages/api/src`

```typescript
// packages/api/src/routes/myFeature.ts
import { createRouter } from '@brainiac/api';

export const myFeatureRouter = createRouter({
  getItems: router.query({
    input: z.object({ workspaceId: z.string() }),
    resolve: async ({ input }) => {
      // Your logic here
      return items;
    },
  }),

  createItem: router.mutation({
    input: z.object({ name: z.string() }),
    resolve: async ({ input }) => {
      // Your logic here
      return newItem;
    },
  }),
});
```

#### 2. Register in Backend (`apps/server/src/app.ts`)

```typescript
import { myFeatureRouter } from '@brainiac/api/routes/myFeature';

app.rpc('/my-feature', myFeatureRouter);
```

#### 3. Use in Frontend (Nuxt)

The types are automatically inferred:

```vue
<script setup lang="ts">
const items = await $rpc.myFeature.getItems({
  workspaceId: 'workspace-123',
});
</script>
```

### Adding a Frontend Component

Components go in `apps/web/app/components/`:

```vue
<!-- apps/web/app/components/MyComponent.vue -->
<template>
  <div class="flex flex-col gap-4">
    <h2>{{ title }}</h2>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>
```

Use it in pages or other components:

```vue
<template>
  <MyComponent title="Example">
    <p>Content goes here</p>
  </MyComponent>
</template>
```

### Adding a Database Table

Database schema is defined using Drizzle ORM in `packages/db/src/schema/`.

#### 1. Create the Schema

```typescript
// packages/db/src/schema/myTable.ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const myTable = pgTable('my_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

#### 2. Generate & Migrate

```bash
bun run db:generate    # Generate types
bun run db:push        # Apply to database
```

#### 3. Use in Queries

```typescript
import { db } from '@brainiac/db';
import { myTable } from '@brainiac/db/schema';

const items = await db.select().from(myTable);
```

### Adding an Environment Variable

1. Add to `packages/env/src/index.ts`:

```typescript
export const env = z.object({
  DATABASE_URL: z.string(),
  MY_NEW_VAR: z.string(),
});
```

2. Use in code:

```typescript
import { env } from '@brainiac/env';

console.log(env.MY_NEW_VAR);
```

---

## Code Standards

### TypeScript

- Use **strict mode** (`"strict": true` in tsconfig.json)
- Type all function parameters and returns
- Avoid `any` type—use generics or unions instead

### Formatting & Linting

```bash
bun run check          # Run Oxlint and Oxfmt
```

This automatically fixes formatting issues. We use:

- **Oxlint** for linting (fast, Rust-based)
- **Oxfmt** for formatting (compatible with Prettier)

### Commits

Follow conventional commits for clarity:

```
feat: Add user dashboard page
fix: Resolve database connection timeout
docs: Update getting started guide
refactor: Simplify API response handling
```

---

## Pull Request Process

### Before You Submit

1. **Create a branch** from `main`:

```bash
git checkout -b feat/my-feature
```

2. **Make your changes** and test locally:

```bash
bun run dev              # Start dev server
bun run check-types      # Check TypeScript
bun run check            # Lint & format
```

3. **Commit with clear messages**:

```bash
git add .
git commit -m "feat: Add user dashboard"
```

4. **Push and open a PR**:

```bash
git push origin feat/my-feature
```

### PR Checklist

- [ ] Code follows style guide (`bun run check` passes)
- [ ] TypeScript types are correct (`bun run check-types` passes)
- [ ] Tests pass (if applicable)
- [ ] Commit messages follow conventions
- [ ] PR description explains what and why

### What We Look For

- **Clarity**: Code is easy to understand
- **Type Safety**: Full TypeScript coverage
- **Consistency**: Follows project patterns
- **Testing**: Changes are validated
- **Documentation**: Complex logic is explained

---

## Getting Help

- **Stuck on setup?** Check [DEVELOPMENT.md](./DEVELOPMENT.md) for troubleshooting
- **Questions about architecture?** See the [Project Structure](#project-structure) section
- **Found a bug?** Open an issue on GitHub
- **Want to discuss ideas?** Start a discussion or ping maintainers

---

## Thank You

Your contributions help make Brainiac better. We appreciate your effort!
