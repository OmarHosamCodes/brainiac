# Agency Surface — Design Brief & Craft Plan

Status: phases 1–4 shipped at the impeccable production bar.
Owner: design + frontend.
Anchors: Productive.io (IA, project page, KPI discipline) + Toggl Track (week-grid timesheet UX, keyboard cadence) + Harvest (calmer time entry, in-row budget bar).
Anti-anchors: Salesforce/Jira density, AI-product slop, hero-metric-with-sparkline cards, gradient tints.

---

## 1. Feature summary

Reshape the agency surface into a productive.io-class operations workspace for a small-to-mid-agency PM (10–50 people). New IA, persistent app-wide timer, project-as-first-class navigation, two-theme parity, desktop-first. Aspirational where the schema is thin: empty-state surfaces teach the eventual data model.

## 2. Primary user action

Move between Time, Projects, Clients, Reports, Resourcing, Billing, Settings without losing the running timer or the team context.

## 3. Design direction

- **Color strategy.** Restrained baseline + one earned exception: each project carries an auto-assigned hue (12-color OKLCH palette, deterministic by project-id hash, user-overridable in project settings). Hue appears only as a 6px dot, pill, or chart series, never as a row background. Operator Emerald reserved for primary actions, current selection, running-timer state.
- **Theme.** Inherits global app theme. Both light and dark ship at parity. No agency-local toggle.
  - Light scene: PM at 10am, double monitor, scanning a 200-row weekly report.
  - Dark scene: agency lead at 6pm reconciling timesheets across timezones before EOW invoicing.
- **Image probes:** skipped, harness lacks native image_gen tool. Brief is anchored on named references.

## 4. Scope

Production-ready, end-to-end. Touches the global app shell (timer relocation), the agency page shell, and seven section surfaces. Two-theme parity. Desktop-first responsive (top-bar collapses to popover, week grid scrolls with sticky project column).

## 5. Layout strategy

Drop the left sidebar. Promote a single agency top-bar inside the existing app layout: `[team badge | segmented section nav | inline filters/actions]`. The persistent timer moves to the **global app shell header**, visible across canvas, agency, and settings.

Seven segments, ranked by daily traffic:

| #   | Segment    | Replaces                | Anatomy                                                                                            | Backend status              |
| --- | ---------- | ----------------------- | -------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | Time       | Overview                | Week grid (Mon–Sun) × project rows, inline cells, total column. Running cell mirrors chrome timer. | Wired                       |
| 2   | Projects   | Mgmt → projects         | Dense table: hue dot + name, client, members, in-row budget bar, hours this period, status pill.   | Partially wired (no budget) |
| 3   | Clients    | Mgmt → clients          | Two-pane: client list (left, collapsed), client detail (right) with project sub-list + totals.     | Wired                       |
| 4   | Reports    | Dashboard               | KPI strip (4 mono numerals) → filter rail → chart → breakdown table. No sparklines.                | Wired (existing summary)    |
| 5   | Resourcing | new                     | Member × week capacity heatmap. Empty-state teaches the capacity model.                            | Aspirational                |
| 6   | Billing    | new                     | Invoice pipeline (draft / sent / paid) + period-close checklist. Empty-state teaches the model.    | Aspirational                |
| 7   | Settings   | Mgmt → tags + new slots | Left-rail subnav: Tags, Rates, Members, Integrations, Project hue overrides.                       | Mixed                       |

Page rhythm: 24px outer padding, 36–40px row height for tables, 32px between sections. No nested cards. No 3xl card frame around the workspace.

## 6. Key states

Seven-state contract on every interactive element (default, hover, focus-visible, active, disabled, loading, error) plus surface-specific:

- **Time grid.** Loading skeleton rows. Empty: "No entries yet this week. Press T to start a timer, or click any cell to log hours." Running cell pulses Operator Emerald. Saving: row pulse + checkmark. Error: inline cell retry.
- **Projects table.** Loading skeleton. Empty: first-project teach. Over-budget: bar past 100%, badge in state-warning. Archived: 50% opacity, filter to reveal.
- **Project page.** Hero with hue dot, client crumb, status, members. Sub-tabs: Overview, Time, Budget, Members, Docs. Aspirational sub-tabs render empty-with-shape, never hidden.
- **Reports.** Loading: KPI strip skeletons + chart shimmer. Empty: "No entries matched these filters." First-time: guided no-data-yet.
- **Resourcing.** Empty: "Capacity isn't set. Add weekly hours per member to see utilization here." Once data arrives: heatmap with utilization% per cell, color via state-success/warning/error scale.
- **Billing.** Empty: "No invoices yet. Bill your first period from a closed week." Once data arrives: kanban-shaped pipeline (Draft, Sent, Paid).
- **Persistent timer (app shell).** Idle, running (Operator Emerald, mono ticking), paused, saving, sync-failed (inline retry).
- **Team badge.** Single-team: read-only badge. Multi-team: dropdown. No-team: existing AgencyProUpsell or no-teams card.

## 7. Interaction model

- **Top-bar nav.** Click segments; `g t / g p / g c / g r / g u / g b / g s` keyboard shortcuts. Active segment: Operator Emerald text + tinted backdrop. No underline, no side-stripe.
- **App-shell timer.** Click idle to open start-new popover. Click running to expand for project/tag/note edit. Esc collapses. Survives navigation, including canvas. Mirrors into the agency Time grid in real time.
- **Time grid.** Tab cell-to-cell, Enter commits, ↑↓←→ navigates, type-to-edit, "+" adds tag-scoped sub-row, bulk paste from clipboard.
- **Projects.** Row click to project page. Inline-editable name, client, status. Sortable, sticky header. Filter rail collapses to chip stack when narrow.
- **Project page.** Sub-tabs deep-link. Budget bar hover-detail, not modal. "Log time on this project" inline.
- **Reports.** Filters apply on commit. Chart and breakdown table swap together with one optimistic skeleton. Export = inline progress chip, not modal.
- **Motion.** 150–200ms ease-out-quart. Streaming numbers tween mono digits. No orchestrated entrance. `prefers-reduced-motion` collapses to opacity fades.

## 8. Content requirements

- **Eyebrows.** DESIGN.md Label scale, never colored. Examples: `THIS WEEK`, `BUDGET`, `BILLABLE`, `UTILIZATION`.
- **Empty states.** Plain-spoken, instructional, no exclamation marks (authored in §6).
- **Errors.** Specific subject, specific action. "Couldn't save 0:45 to Acme · Onboarding. Retry."
- **Numbers.** Durations in `H:MM`, currency in `$1,240`, both JetBrains Mono per the Mono For Truth rule.
- **Banned.** Em dashes, "magical / powerful / AI-powered", exclamation marks, sparkle emoji. The agent has no presence on this surface.
- **Dynamic ranges.** Projects 0/12/200+. Time entries per week 0/30/250+. Members 1/12/80+. Reports rows 0/100/5000+. Virtual scroll above 100.

## 9. Cross-cutting work

- **App shell header gains the persistent timer module.** New global state for the running entry. Timer composable shared between shell and agency Time grid.
- **Project palette utility.** `tokens/project-palette.ts` (or similar) — 12-color OKLCH set + `projectHueFor(id)` deterministic hash. Consumed by dots, pills, chart series, and the project hero.
- **Agency oRPC surface gaps.** Identify and stub: budgets, billable rates, capacity, invoices. Empty-states must read these stubs and render the teach-the-shape copy.

## 10. Resolved questions

1. Team = agency. Team selector is agency-local; degrades to read-only badge when single-team.
2. Aspirational sections (Resourcing, Billing) ship as production-quality empty-state surfaces.
3. Theme inherits global app theme; no agency-local toggle.
4. Project hue auto-assigned from 12-color OKLCH palette, deterministic by project id, user-overridable in settings.
5. Desktop-first, with documented degradations below `lg`.
6. Persistent timer lives in the global app shell, visible app-wide.

---

## Craft phasing

The full brief is multi-PR. Each phase is its own craft pass at the impeccable production bar (semantic, all states, two themes, browser-verified, critique-and-fix loop).

### Phase 1 (this pass)

- Project palette utility (`projectHueFor` + 12-color OKLCH set, shared module).
- Persistent timer composable + global app shell header module (idle / running / paused / saving / sync-failed).
- Agency app-shell reshape: top-bar with team badge + segmented nav + inline actions, sidebar retired.
- Time surface: week grid (Mon–Sun × project rows), inline cell entry, keyboard model, all states, mirrors persistent timer.
- Projects surface: dense table with hue dot, in-row budget bar (aspirational, reads stub), hours, status, all states.
- Two-theme parity for everything above.

### Phase 2

- Clients surface: two-pane layout, list + detail.
- Reports surface: KPI strip + filter rail + chart + breakdown table (replaces existing AgencyTimeSummary internals).
- Settings surface: left-rail subnav covering Tags / Rates / Members / Integrations / Project hue overrides.

### Phase 3

- Project drill-down page: hero + sub-tabs (Overview, Time, Budget, Members, Docs).
- Resourcing surface: aspirational empty state + heatmap composition once capacity data lands.
- Billing surface: aspirational empty state + invoice pipeline composition once invoice primitives land.

### Phase 4 — shipped

- oRPC stubs added under `agencyOps`: `budgets.list`, `rates.list`, `capacity.list`, `invoices.summary`, `invoices.list`, `integrations.list`. Each returns shaped-but-empty data so the surfaces below render the production composition with honest empty states (no fake numbers).
- Resourcing: `AgencyResourcingSurface.vue` reads `capacity.list` and renders a member × week heatmap shell. Empty rows fall through to a teach-the-shape state inside the grid; once capacity rows arrive each cell colors green / amber / red by `(logged + booked) / capacity`.
- Billing: `AgencyBillingSurface.vue` reads `invoices.summary` + `invoices.list` and renders a 4-card summary band over a Draft / Sent / Paid pipeline. Period-close hint hangs below the empty pipeline.
- Settings: rates and integrations promoted from aspirational copy to live stubs. Rates section renders a table that fills as rows arrive. Integrations section renders Slack / Calendar / QuickBooks · Xero / Webhooks with status pills and Connect / Manage actions.
- Project surfaces: `AgencyProjectsTable.vue` and `AgencyProjectDetail.vue` budget bars now read `budgets.list` and tween a real percentage with seven-state coloring (primary < 85% < warning < 100% < error). Falls back to honest "Not set" when no row exists.
- `AgencyPlaceholderSurface.vue` retired from `pages/agency.vue` (kept in repo as a primitive in case future segments need it).
- Type-check (`vue-tsc --noEmit`) and lint (`oxlint`) clean.

---

## Recommended craft references

- `reference/spatial-design.md` — week grid + KPI strip rhythm.
- `reference/interaction-design.md` — table editing, keyboard model, timer popover.
- `reference/motion-design.md` — timer tick, segment switch, KPI tween.
- `reference/typography.md` — Mono numerals in tables and KPIs.
- `reference/harden.md` — seven-state contract, two-theme parity, error and edge cases.
