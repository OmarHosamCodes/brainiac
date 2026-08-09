# Phase 0 — SSR migration profile (Vite SPA baseline)

Captured from `apps/web` production build before TanStack Start migration.

## Bundle snapshot (top gzip)

| Chunk               | Raw     | Gzip    | Notes                                       |
| ------------------- | ------- | ------- | ------------------------------------------- |
| `exceljs.min-*.js`  | ~908 KB | ~249 KB | Already dynamic-imported from report export |
| `index-*.js`        | ~896 KB | ~245 KB | Main SPA entry — primary public-route cost  |
| `agency-page-*.js`  | ~480 KB | ~118 KB | Lazy Agency surface                         |
| `react-vendor-*.js` | ~216 KB | ~69 KB  | React + react-router                        |
| `xyflow-*.js`       | ~173 KB | ~55 KB  | Canvas — correctly split                    |
| `landing-page-*.js` | ~37 KB  | ~12 KB  | Lazy marketing page                         |

Total bundle budget today: `apps/web/perf/budgets.json` → `jsGzipKb: 719`.

## HTML / TTFB findings

- Marketing “prerender” is a **static HTML shell** injected by [`vite-marketing-prerender.ts`](../apps/web/vite-marketing-prerender.ts), not React SSG.
- Public routes still wait on JS (`LogoLoader`) before real content hydrates; shell is dismissed in [`main.tsx`](../apps/web/src/main.tsx).
- Authenticated app is client-only: session → Query → Agency/Canvas waterfalls after SPA boot.
- Railway serves static `dist/` via generated [`.output/server/index.mjs`](../apps/web/scripts/write-railway-server.mjs) and proxies `/rpc`, `/api/auth`, `/uploads`, `/billing` to Hono.

## Quick wins that survive migration

1. Replace fake marketing shell with real prerendered React HTML for `/`, `/privacy`, `/terms`, `/login`.
2. Keep Agency / Canvas / exceljs / xyflow behind route-level lazy boundaries (already mostly true).
3. Do **not** SSR Tracker/Reports trees day one — shell + boot prefetch only.
4. Migrate router to TanStack Router (Start prerequisite) with a thin URLSearchParams compat layer for existing Agency query-string UX.
5. Keep Hono oRPC API separate; Start only owns document SSR + assets.

## Decision gate

Most SEO/LCP pain is marketing blank HTML + large `index` JS. Real SSG (Phase 1) + Start document SSR (Phase 3) address “all” goals without an RSC rewrite.
