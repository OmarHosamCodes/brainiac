# Notification productivity redesign (balanced)

**Date:** 2026-08-04  
**Status:** Approved for implementation  
**Policy:** Interrupt only personal action items; batch awareness.

## Goal

Reduce attention residue and interrupt tax while keeping accountable work from stalling. Delivery is chosen by expected loss from delay, not by “an event happened.”

## Delivery classes (server-owned)

| Class        | Meaning                                                   | Default channel                                          |
| ------------ | --------------------------------------------------------- | -------------------------------------------------------- |
| `interrupt`  | Accountable recipient; near-term work stalls without them | Center + push when offline (respect quiet hours / focus) |
| `breakpoint` | Actionable but short delay OK                             | Center immediately; push deferred until Orch breakpoint  |
| `center`     | Useful history / awareness                                | In-app only (no push)                                    |
| `digest`     | Low urgency / repetitive                                  | Scheduled digest; optional center entry                  |

## Type → class mapping (v1)

| Type                | Class                                                                | Defaults (`inApp` / `push`)                           | Notes                                                                                                                  |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `task.assigned`     | `interrupt` when assigned to you; `center` when whole-team broadcast | true / true (personal); true / false (team broadcast) | Prefer assignee list over `assignedToTeam` spam                                                                        |
| `task.message`      | `interrupt` to thread participants                                   | true / true                                           | `notifyTaskMessage` ready; task threads were removed (migration 0024), so no write-path caller until messaging returns |
| `journey.milestone` | `center`                                                             | true / **false**                                      | May summarize in digest                                                                                                |
| `timer.activity`    | off / awareness                                                      | false / false                                         | Do not promote to interrupt                                                                                            |
| `team.digest`       | `digest`                                                             | true / **false**                                      | Local-morning schedule; durable dedupe                                                                                 |

## Center-first rule

1. Persist the notification row when `inApp` is on.
2. Decide push from delivery class + prefs + quiet/focus + live presence.
3. Never push without a durable center row.

## Timing controls

- **Quiet hours** — user×team local clock window; suppress all push; center still fills.
- **Focus mode** — `focusUntil` timestamp; same push suppression as quiet hours.
- **Breakpoint** — if recipient has an active timer, treat otherwise-interruptible items as `breakpoint`: push held until timer stop or max deferral (~15 min).

## UI

- Bell inbox sections: **Needs action** vs **Updates**.
- Badge prioritizes Needs action (unread interrupt/message/assigned).
- Prefs: per-type channels + quiet hours + timezone + focus.
- Push prompt: “only when something needs you.”

## Non-goals (v1)

- Email / SMS
- ML urgency classifier
- Product toasts for notifications
- New event types (approvals, resourcing SLAs) — follow-on
- Full OS Focus Assist integration beyond in-app Focus + quiet hours

## Follow-on event contracts

Future workflows (time-entry cutoffs, approvals, capacity) should declare owner, urgency, due/expiry, and dedupe key before choosing push — see research blueprint in `notification-productivity-science.json`.
