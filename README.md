# Brainiac

Spatial knowledge workspace with an embedded AI agent and agency operations surface. End-to-end type safety across a Turborepo monorepo built on React, Hono, and oRPC.

> **New here?** Start with the [Quick Start Guide](#quick-start--5-minutes) below, then check out [CONTRIBUTING.md](./CONTRIBUTING.md) for how to contribute.

## Quick Start (5 Minutes)

**Prerequisites**: [Bun](https://bun.sh) v1.3.10+

### Automated Setup (Recommended)

```bash
git clone https://github.com/OmarHosamCodes/brainiac.git
cd brainiac
bun run setup
```

This script will:

- Copy and setup environment files
- Install dependencies
- Start PostgreSQL (if Docker is installed)
- Apply database schema
- Optionally load demo data
- Verify TypeScript types

Then start the dev server:

```bash
bun run dev
```

### Manual Setup

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd brainiac
bun install

# 2. Setup environment files (copy from examples)
cp .env.example .env
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env

# 3. Start the database (PostgreSQL in Docker)
bun run db:start

# 4. Setup the database schema
bun run db:push

# 5. Seed demo data (optional but recommended)
bun run db:seed

# 6. Run the dev server
bun run dev
```

Visit [http://localhost:7001](http://localhost:7001) for the web app. The API runs at [http://localhost:7000](http://localhost:7000). Vite proxies `/api/auth` and `/rpc` to the API in development.

**Demo accounts** (if seeded):

- `founder@brainiac.test` / `brainiac1234`
- `ops@brainiac.test` / `brainiac1234`
- `analyst@brainiac.test` / `brainiac1234`

---

## Documentation

- **[PRODUCT.md](./PRODUCT.md)** — Product purpose, users, and design principles
- **[DESIGN.md](./DESIGN.md)** — Visual system, tokens, and component rules
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — How to contribute, code standards, and PR process
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — Dev workflows, common issues, and cheat sheet

---

## Product Surfaces

| Surface         | Route          | Purpose                                                                   |
| --------------- | -------------- | ------------------------------------------------------------------------- |
| **Dashboard**   | `/dashboard`   | Infinite canvas for spatial knowledge work: nodes, blocks, and agent chat |
| **Agency**      | `/agency`      | Time tracking, projects, clients, reports, and team operations            |
| **Marketplace** | `/marketplace` | Shared workspace node templates                                           |
| **Billing**     | `/billing`     | Subscription and plan management                                          |

---

## Tech Stack

| Layer        | Technology                   | Purpose                                     |
| ------------ | ---------------------------- | ------------------------------------------- |
| **Frontend** | React 19 + Vite + Tailwind 4 | SPA with utility-first styling              |
| **Backend**  | Hono + oRPC                  | Lightweight API with end-to-end type safety |
| **Database** | PostgreSQL + Drizzle         | Type-safe ORM and relational data           |
| **Runtime**  | Bun v1.3.10                  | Fast JavaScript runtime                     |
| **Build**    | Turborepo                    | Optimized monorepo builds                   |
| **Data**     | TanStack Query + oRPC client | Typed queries and mutations in the UI       |
| **Auth**     | Better-Auth                  | Session auth with Google OAuth              |
| **Tooling**  | Oxlint + Oxfmt               | Fast Rust-based linting and formatting      |
| **Types**    | TypeScript                   | Full type safety across the stack           |

---

## Database Management

### Initial Setup

PostgreSQL runs in Docker on port `5440` by default.

```bash
bun run db:start    # Start PostgreSQL in Docker
bun run db:push     # Apply the schema
bun run db:seed     # Seed demo data (recommended)
```

### Demo Accounts

| Email                   | Password       | Role       |
| ----------------------- | -------------- | ---------- |
| `founder@brainiac.test` | `brainiac1234` | Founder    |
| `ops@brainiac.test`     | `brainiac1234` | Operations |
| `analyst@brainiac.test` | `brainiac1234` | Analyst    |

**Change seed password**: Set `BRAINIAC_SEED_PASSWORD` before running `bun run db:seed`

**Seed into existing account**:

```bash
bun run db:seed -- --email you@example.com
```

### Database Tools

```bash
bun run db:generate    # Generate migration files from schema
bun run db:migrate     # Run pending migrations
bun run db:studio      # Open Drizzle Studio UI
bun run db:seed:agency # Seed agency demo data
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for more database workflows.

---

## Project Structure

Turborepo monorepo with 2 apps and 7 shared packages:

```
brainiac/
├── apps/
│   ├── web/                    # Frontend (React + Vite + Tailwind)
│   │   └── src/
│   │       ├── pages/          # Route composition and static pages
│   │       ├── features/       # Product features: hooks, stores, containers, views
│   │       ├── ui/             # Shared presentational primitives
│   │       ├── components/     # Approved shared/static presentation only
│   │       └── lib/            # Shared infrastructure (oRPC, env, utilities)
│   └── server/                 # Backend (Hono + oRPC on Bun)
│       └── src/
│           ├── app.ts          # Hono app, auth, RPC, WebSocket
│           └── operations/     # Seeds, imports, backfills, maintenance
│
├── packages/
│   ├── api/                    # oRPC routers, procedures, business logic
│   ├── db/                     # Drizzle schema, migrations, queries
│   ├── auth/                   # Better-Auth setup
│   ├── env/                    # Environment validation (server + Vite)
│   ├── agent/                  # AI agent tools and model config
│   ├── workspace/              # Workspace types, block schemas, constants
│   └── config/                 # Shared TypeScript config
```

**Key principle**: Packages are shared between frontend and backend. Keep them lean and focused.

---

## Available Commands

### Development

```bash
bun run dev              # Start all apps (frontend + backend)
bun run dev:web          # Start frontend only (port 7001)
bun run dev:server       # Start backend only (port 7000)
```

### Building and Checking

```bash
bun run build            # Build all apps
bun run check-types      # Check TypeScript types
bun run check            # Run Oxlint and Oxfmt
bun run test:api:bruno   # Run API integration tests (Bruno)
bun run perf             # Run frontend performance benchmarks
```

### Database

```bash
bun run db:start         # Start PostgreSQL in Docker
bun run db:push          # Apply schema changes
bun run db:generate      # Generate migration files
bun run db:migrate       # Run migrations
bun run db:seed          # Seed demo data
bun run db:seed:agency   # Seed agency demo data
bun run db:studio        # Open Drizzle Studio UI
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed workflows and troubleshooting.

---

## Optional Services

Some features need additional infrastructure beyond PostgreSQL:

| Service                   | Used for                     | Env var              |
| ------------------------- | ---------------------------- | -------------------- |
| **Redis**                 | Agency task thread live sync | `REDIS_URL`          |
| **S3-compatible storage** | Agency task attachments      | `S3_*`               |
| **OpenRouter**            | AI agent                     | `OPENROUTER_API_KEY` |
| **Polar**                 | Billing                      | `POLAR_*`            |

See `.env.example` and `apps/server/.env.example` for the full list.

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, code standards, and the PR process.

---

## License

Built with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack)
