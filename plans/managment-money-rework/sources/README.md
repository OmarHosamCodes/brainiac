# Management Money Rework — sources

Knowledge base for this task only. [`../PLAN.md`](../PLAN.md) tracks the
current roadmap, while [`../steps/`](../steps/README.md) records executed local
changes.

Captured 2026-08-24 after wiping local Postgres and restoring production into `localhost:5440/orch`.

| File | What it is |
| --- | --- |
| [restored-local-db.md](./restored-local-db.md) | Team, money tables, August time mix, quirks in the restored copy |
| [money-surface-feature.md](./money-surface-feature.md) | Route, golden-file layout, hook queries, UI sections, API folder |
| [product-constraints.md](./product-constraints.md) | Locked Money product rules and earlier plan/spec pointers |
| [finsheet-latest-month-equations.md](./finsheet-latest-month-equations.md) | `/home/omar/Downloads/FinSheet.csv` column BF (July) equations vs Orch |
| [finsheet-july-equations.canvas.tsx](./finsheet-july-equations.canvas.tsx) | Same July chain as a canvas. Open beside chat from [the live copy](/home/omar/.cursor/projects/home-omar-Projects-brainiac/canvases/finsheet-july-equations.canvas.tsx) |

Do not treat this folder as the live schema. Code under `apps/web/src/features/money/` and `packages/api/src/routers/agency-ops/billing/` wins if they disagree.
