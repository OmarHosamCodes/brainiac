# Sidebar Rail Shell

Date: 2026-07-26
Status: Approved (shape) — ready for implementation

## Feature summary

Replace the unified floating top bar with a left icon rail on every authenticated
route. The rail is the single navigation and chrome surface for both the Dashboard
(spatial) and Agency (execution) modes, sharing one topology. It reuses the
already-defined `shellRail*` tokens and the `ui-chrome-glass` surface.

## Primary user action

Move between surfaces (Dashboard / Agency / Agency segments) and reach
search / team / notifications / account without the navigation competing with the
work canvas.

## Design direction

- Register: product. Color strategy: Restrained (quiet instrument).
- Operator Violet only for the active nav state (`bg-primary/10 text-primary`), kept
  under the 10% accent budget. Primary chrome stays monochrome.
- Surface: floating-glass card (`ui-chrome-glass`), 16px radius, inset from the
  viewport edges like the retired top bar.
- Anchors: Linear rail, VSCode activity bar, Raycast footer cluster.

## Behavior (committed)

- Collapsed by default at 52px in both modes.
- Hover / keyboard focus (`:focus-within`) expands to a ~14rem overlay drawer. The
  rail is `position: fixed`, so the grid content column does not reflow — the canvas
  never jumps.
- A persisted pin toggle (`railPinned`, localStorage) reserves the ~14rem column
  permanently; content reflows once when toggled.
- Mobile (`< md`): rail hidden; a floating hamburger opens the existing left `Sheet`.
- Agent dock (`Cmd+J`) and command palette (`Cmd+K`) behavior unchanged.

## Rail contents (top to bottom)

1. Brand mark -> `/dashboard`.
2. Primary nav from `APP_NAV_ITEMS`: Dashboard (`layout-dashboard`), Agency
   (`briefcase`). Agency segments: collapsed -> flyout `Popover` to the right;
   expanded/pinned -> nested list under Agency. `g w/d/c/p/r/m` shortcuts preserved.
3. Search -> opens the command palette.
4. Footer (`mt-auto`): team control, notifications, account avatar, pin toggle.

## Key states

- Collapsed (icons only, tooltips).
- Hover-expanded (overlay, labels revealed, lift shadow).
- Pinned-expanded (reserved column, no overlay).
- Active nav item (violet tint + border).
- Agency segment flyout (collapsed) / nested list (expanded).
- Mobile sheet.
- Dock open (unchanged).

## Layout / files

- New `app-shell-rail.tsx` — rail nav + mobile hamburger + Sheet.
- `app-shell.tsx` — mount rail instead of top bar; add `app-shell--rail-pinned` class.
- `app-shell-agency-nav.tsx` — add `variant="rail"`.
- `app-shell-ui.ts` — repurpose `shellRail*` tokens for the rail links.
- `index.css` — rail grid column + fixed overlay drawer + pinned/collapsed + mobile
  hide; remove `.app-shell__topbar*` rules; dock/backdrop no longer offset by the
  top bar slot.
- `app-shell-store.ts` — add persisted `railPinned`; drop the now-dead
  context/pageCrumb/subtitle/actions/hideAgent slot machinery.
- `agency-page.tsx` — render `AgencySubtitleBreadcrumb` inline in the page header.
- Retire `app-shell-topbar.tsx` and `app-shell-breadcrumbs.tsx`.

## Accessibility & motion

- Rail is `<nav aria-label="Primary">`; links use `aria-current`; focus ring on all
  controls; expansion also triggers on `:focus-within` for keyboard users.
- Reuses `--motion-*-rail`; `prefers-reduced-motion` disables the width transition.
- WCAG AA contrast on rail icons (muted -> highlighted on hover/active).

## Out of scope

- Agent dock position / behavior.
- Agency segment routes and `g` shortcut keys.
- New navigation destinations.
