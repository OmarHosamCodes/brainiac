# Performance Benchmarks

Status: active  
App: [`apps/web`](../../apps/web) (React 19 + Vite 8 SPA)  
Runner: `bun run perf` (local) · `bun run perf:ci` (CI subset)

## Purpose

Synthetic Lighthouse audits against a **production build** with seeded data. Each route gets a composite score (0–100), letter grade (S–F), and pass/fail against tier minimums. CI blocks merges when ratings regress.

## Measurement profile

| Setting | Value |
|---------|-------|
| Tool | Lighthouse 12 via `chrome-launcher` |
| Browser | Chromium (Playwright-managed auth) |
| Build | `bun run build` then `bun run start` (Railway-style proxy) |
| Runs per route | 3, **median** reported |
| Marketing throttling | `mobile` (Moto G Power emulation) |
| App throttling | `desktop` |
| Auth | `founder@brainiac.test` / `brainiac1234` (seed) |

## Rating formula

Composite score (0–100):

| Component | Weight | Scoring |
|-----------|--------|---------|
| Lighthouse Performance score | 40% | Direct 0–100 |
| Core Web Vitals pass rate | 40% | 100% if LCP, INP, and CLS all meet tier thresholds; otherwise proportional (per metric) |
| Bundle budget compliance | 20% | 100% if global JS/CSS budgets pass; penalized proportionally if over |

### Letter grades

| Grade | Score |
|-------|-------|
| S | 95–100 |
| A | 85–94 |
| B | 75–84 |
| C | 65–74 |
| D | 50–64 |
| F | &lt;50 |

### CI gate rules

1. **Bundle budgets** must pass (baseline + 5% headroom in [`budgets.json`](../../apps/web/perf/budgets.json)).
2. **Regression:** no route may regress more than 10% vs [`baseline.json`](../../apps/web/perf/baseline.json) on LCP, INP, CLS, or Lighthouse performance score.
3. **Aspirational targets** (tier minimum grades in the tables above) are reported but do not fail CI until the app meets them.

## Page tiers

| Tier | Routes | LCP | INP | CLS | Lighthouse min | CI min grade |
|------|--------|-----|-----|-----|----------------|--------------|
| **Marketing** | `/`, `/privacy`, `/terms` | ≤ 2.0s | ≤ 200ms | ≤ 0.1 | 90 | A |
| **Auth** | `/login` | ≤ 2.5s | ≤ 200ms | ≤ 0.1 | 85 | B |
| **App Light** | `/billing`, `/billing/success` | ≤ 2.8s | ≤ 200ms | ≤ 0.1 | 85 | B |
| **App Data** | `/marketplace` | ≤ 3.0s | ≤ 250ms | ≤ 0.1 | 80 | B |
| **App Heavy** | `/dashboard`, `/node/:id` | ≤ 3.5s | ≤ 300ms | ≤ 0.1 | 75 | B |
| **Agency** | `/agency?section=*` | ≤ 3.5s | ≤ 300ms | ≤ 0.1 | 75 | B |

Machine-readable thresholds: [`apps/web/perf/budgets.json`](../../apps/web/perf/budgets.json).

## Agency sub-routes

| Section | URL | Notes |
|---------|-----|-------|
| Work | `?section=work` | Default; task threads + timer |
| Dashboard | `?section=dashboard` | KPI charts |
| Clients | `?section=clients` | Two-pane layout |
| Projects | `?section=projects` | Dense table |
| Reports | `?section=reports` | Heaviest data surface |
| Management | `?section=management&manage=resourcing` | Sub-pane routing |
| Settings | `?section=settings` | Forms |

CI audits a subset: work, projects, reports. Local `perf` audits all seven.

## Global bundle budgets (cold load)

| Asset | Gzip budget | Notes |
|-------|-------------|-------|
| Initial JS (entry + vendor chunks) | ≤ 500 KB | Eager route imports today |
| CSS | ≤ 50 KB | Tailwind v4 purge |
| Fonts (transferred) | ≤ 120 KB | Google Fonts CDN; self-host subset recommended |

Budgets are set at **baseline + 5%** after the first run. See `baseline.json` for captured values.

## Optimization backlog

Benchmarks measure current behavior. Likely flags on first run:

1. **No route-level code splitting** — all pages eager-imported in `app.tsx`
2. **Render-blocking Google Fonts** — three IBM Plex families from CDN
3. **Heavy canvas** — `@xyflow/react` on dashboard/node
4. **No RUM** — synthetic only; add `web-vitals` separately for production

## Commands

```bash
bun run perf          # full local suite (~16 route audits)
bun run perf:ci       # CI subset (~10 audits)
bun run perf -- --update-baseline   # refresh baseline.json after intentional changes
```

Reports: `apps/web/perf/perf-report.json`, `apps/web/perf/perf-report.md`
