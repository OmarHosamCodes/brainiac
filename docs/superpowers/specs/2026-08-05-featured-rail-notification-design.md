# Featured rail notification card

**Date:** 2026-08-05  
**Status:** Approved for implementation  
**Follows:** [Notification productivity redesign](./2026-08-04-notification-productivity-design.md)

## Goal

Surface the next Needs-action notification in the primary rail footer as an actionable promo-style card, without replacing the top-bar inbox.

## Decisions

- Client featured queue from `notifications.list` + `isNeedsActionNotification` (no `nextAction` API).
- Expanded rail (`railPinned`): one featured card above the account menu.
- Collapsed rail: compact badge only; opens the top-bar inbox.
- Empty Needs-action queue: no footer notification chrome.
- Top-bar bell remains the full Needs action / Updates inbox + prefs.
- Dismiss (X): mark read and advance to the next unread Needs-action item.
- Primary CTA: type-aware (Start timer / Open task / Review alert / Open).
- “N more” when Needs-action count > 1 opens the top-bar inbox via a small UI store bridge.
- Mobile nav drawer always uses the expanded card (not the collapsed badge).

## Card chrome

- Rounded card using sidebar tokens (`bg-sidebar-accent`, `border-sidebar-border`).
- “New” pill + dismiss X.
- Short type title + one-line body + pill CTA with arrow affordance.
- Quiet “N more” text when count > 1.

## Non-goals

- Server curated endpoint, snooze, email.
- Cardifying the top-bar inbox.
- Product toasts / liquid-glass.
