# Agency Time-Changer UX Design

**Status:** Confirmed 2026-07-28  
**Surface:** Agency Tracker + entries log time fields  
**Register:** Product (quiet instrument)

## Problem

Editing start / end / duration fights live timer and cache updates (stutter, lost edits). Keyboard flow is incomplete: Tab/Enter/Escape are inconsistent, and there is no Clockify-style arrow nudge.

## Goals

- Focus lock: while a time field is focused, remote `primaryEntry` / active-timer sync must not overwrite the draft.
- Keyboard parity with Clockify: Enter commit, Escape cancel (scoped to the time edit), Tab commit-and-move, ↑/↓ nudge.
- Same interaction model on tracker (running elapsed + start-time popover) and entry-log rows.
- Second-precise duration end-to-end; clocks remain Clockify-style without seconds in the label.
- Errors visible and recoverable; no silent no-ops.

## Non-goals

- Visual redesign of the time rail.
- Multi-entry bulk time editing (stays read-only range).
- Replacing idle-manual native `type="time"` inputs (browser handles those).
- New modals or date/time picker chrome.

## Interaction contract

| Action  | Behavior                                                                                                                               |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Focus   | Select-all; mark field session active (focus lock on).                                                                                 |
| Type    | Local draft only until commit.                                                                                                         |
| Enter   | Parse → normalize → persist → blur.                                                                                                    |
| Escape  | Restore last committed values for the time edit; clear time error; blur. Do not cancel description edit unless description is focused. |
| Tab     | Commit current field; move to next control.                                                                                            |
| ↑ / ↓   | Clock: ±1 minute (Shift: ±5). Duration / elapsed: ±1 second (Shift: ±1 minute). Keep focus; update linked fields.                      |
| Blur    | Same as Enter commit path.                                                                                                             |
| Invalid | Inline error; revert display to last good; stay recoverable.                                                                           |

## Root cause (entry rows)

Sync effect in `use-agency-time-entry-row.ts` skips overwrite only when `editingDuration || timeEditorOpen`, but start/end inputs never set `timeEditorOpen` on focus. Cache updates to `primaryEntry` therefore stomp in-progress typing.

## Success

An operator can type or nudge times on a running timer and on log rows without lost keystrokes, with predictable commit/cancel and clear errors — Clockify muscle memory, Orch precision.
