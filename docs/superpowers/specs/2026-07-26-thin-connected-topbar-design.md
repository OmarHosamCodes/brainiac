# Thin Connected Top Bar

Date: 2026-07-26
Status: Implemented — L-frame chrome

## Feature summary

A single L-shaped glass nest holds the left rail and the thin context strip
(breadcrumb, team, notifications). One border, one shadow, one radius — not two
floating cards.

## Topology

```text
┌─────────┬──────────────────────────────┐
│  rail   │  context bar                 │  ← .app-shell__chrome (ui-chrome-glass + L mask)
│         ├──────────────────────────────┘
│         │  main
└─────────┘
```

- `AppShellChrome` wraps `AppShellRail` + `AppShellContextBar`.
- Hover/pin expands `--app-shell-chrome-rail` via `:has()`; main grid stays collapsed until pin.
- Mobile: chrome hidden; hamburger sheet keeps team/notifs/account.
