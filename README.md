# Brainiac

Modern fullstack AI application platform with end-to-end type safety, built on Nuxt, Hono, and oRPC.

> **New here?** Start with the [Quick Start Guide](#quick-start--5-minutes) below, then check out [CONTRIBUTING.md](./CONTRIBUTING.md) for how to contribute.

## 🚀 Quick Start (5 Minutes)

**Prerequisites**: [Bun](https://bun.sh) v1.3.10+

### Automated Setup (Recommended)

We provide an automated setup script that handles everything:

```bash
git clone <repository-url>
cd brainiac
bun run setup
```

This script will:
- ✅ Copy and setup environment files
- ✅ Install dependencies
- ✅ Start PostgreSQL (if Docker is installed)
- ✅ Apply database schema
- ✅ Optionally load demo data
- ✅ Verify TypeScript types

Then start the dev server:
```bash
bun run dev
```

### Manual Setup

If you prefer to do it step-by-step:

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

Visit [http://localhost:3001](http://localhost:3001) to see the app. The API is at [http://localhost:3000](http://localhost:3000).

**Demo accounts** (if seeded):
- `founder@brainiac.test` / `brainiac1234`
- `ops@brainiac.test` / `brainiac1234`
- `analyst@brainiac.test` / `brainiac1234`

---

## 📚 Documentation

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — How to contribute, code standards, and PR process
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — Dev workflows, common issues, and cheat sheet

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Nuxt 4 + Vue 3 | Modern, reactive UI framework |
| **Backend** | Hono + oRPC | Lightweight API with end-to-end type safety |
| **Database** | PostgreSQL + Drizzle | Type-safe ORM and relational data |
| **Runtime** | Bun v1.3.10 | Fast JavaScript runtime |
| **Build** | Turborepo | Optimized monorepo builds |
| **Styling** | TailwindCSS | Utility-first CSS framework |
| **Auth** | Better-Auth | Modern authentication framework |
| **Tooling** | Oxlint + Oxfmt | Fast Rust-based linting & formatting |
| **Types** | TypeScript | Full type safety across the stack |

## Database Management

### Initial Setup

This project uses PostgreSQL with Drizzle ORM.

```bash
# Start PostgreSQL in Docker
bun run db:start

# Apply the schema to your database
bun run db:push

# Seed demo data (recommended for development)
bun run db:seed
```

### Demo Accounts

If you ran `bun run db:seed`, three demo accounts are created:

| Email | Password | Role |
|-------|----------|------|
| `founder@brainiac.test` | `brainiac1234` | Founder |
| `ops@brainiac.test` | `brainiac1234` | Operations |
| `analyst@brainiac.test` | `brainiac1234` | Analyst |

**Change seed password**: Set `BRAINIAC_SEED_PASSWORD` before running `bun run db:seed`

**Seed into existing account**:
```bash
bun run db:seed -- --email you@example.com
```

This replaces that user's workspace snapshot without creating new users.

### Database Tools

```bash
bun run db:generate    # Generate database client/types
bun run db:migrate     # Run pending migrations
bun run db:studio      # Open Drizzle Studio UI
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for more database workflows.

## 📁 Project Structure

The project is organized as a **Turborepo monorepo** with 2 apps and 7 shared packages:

```
brainiac/
├── apps/
│   ├── web/              # Frontend (Nuxt 4 + Vue 3 + TailwindCSS)
│   │   └── pages/        # Route pages
│   └── server/           # Backend (Hono + oRPC)
│       └── routes/       # API endpoints
│
├── packages/
│   ├── api/              # Shared API types & business logic
│   ├── db/               # Database schema (Drizzle) & queries
│   ├── auth/             # Authentication (Better-Auth) setup
│   ├── env/              # Environment variable validation
│   ├── agent/            # Agent/AI logic
│   ├── workspace/        # Workspace utilities
│   └── config/           # Shared config files
```

**Key principle**: Packages are shared between frontend and backend. Keep them lean and focused.

---

## ⚙️ Available Commands

### Development

```bash
bun run dev              # Start all apps (frontend + backend)
bun run dev:web          # Start frontend only
bun run dev:server       # Start backend only
```

### Building & Checking

```bash
bun run build            # Build all apps
bun run check-types      # Check TypeScript types
bun run check            # Run Oxlint and Oxfmt (linting & formatting)
```

### Database

```bash
bun run db:start         # Start PostgreSQL in Docker
bun run db:push          # Apply schema changes
bun run db:generate      # Generate database types
bun run db:migrate       # Run migrations
bun run db:seed          # Seed demo data
bun run db:studio        # Open Drizzle Studio UI
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for more detailed workflows and common issues.

---

## 🤝 Contributing

This is an open source project and we welcome contributions! Check out [CONTRIBUTING.md](./CONTRIBUTING.md) to learn:

- How to set up your development environment
- Code standards and style guidelines
- How to add features or fix bugs
- The PR review process

---

## 📝 License

Built with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack)
