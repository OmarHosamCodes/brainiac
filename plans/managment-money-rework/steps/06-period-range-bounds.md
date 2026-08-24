# Step 06 — Future tenure-period scoreboard bounds

**Date:** 2026-08-24  
**Scope:** Prevent future fiscal-month selections from producing an inverted Money scoreboard range.

## Root cause

`getCurrentTenurePeriodRange` correctly moved `from` into the selected future
tenure month, but still clamped `to` to today. That produced `from > to`, and
the Money scoreboard rejected the request with:

```text
periodStart must be before periodEnd.
```

## What changed

- `apps/web/src/features/resourcing/tenure-utils.ts`
  - Future selections now end at the selected tenure month end.
  - Current/past selections remain clamped to today/month end as before.
- `apps/web/src/features/resourcing/tenure-utils.test.ts`
  - Added a regression case for a selected future fiscal month.

## Verified behavior

- Selecting a future fiscal month always produces ordered bounds.
- The Money scoreboard loads instead of returning a period validation error.
- Existing current-month clamping behavior is unchanged.

## Checks

```bash
bun test apps/web/src/features/resourcing/tenure-utils.test.ts
bun run check-types
```

Browser verification selected the future August tenure period and confirmed the
scoreboard request loaded successfully.
