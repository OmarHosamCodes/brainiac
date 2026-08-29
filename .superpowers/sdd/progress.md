# SDD Progress

Plan: docs/superpowers/plans/2026-08-14-orch-composer-reliability.md (then search, agency, canvas)

Task 1: complete (commits 17688e06..756f185c, review clean). Minors: enqueue-at-cap untested; cancel missing-id untested.
Task 2: complete (commits 756f185c..bbcdd812, review Approved after attachment-only + send-while-running fixes). Minors/plan-mandated: queue-at-cap silent ignore; DoD checks in Task 10; Enter-to-send while streaming may still be runtime-gated.
Task 3: complete (commits bbcdd812..675696af, review Approved after Important upsert-race / ownership / error-wrap fixes). Minors: redundant ownership queries on upsert; empty upsert still persists a row; no live Postgres CRUD tests.
Task 4: complete (commits 0c0e318c..44616369, review Approved after in-flight restore-chip suppression). Minors: no hook timing tests; redundant isBusy gate.
Task 5: complete (commits 65448d21..d3e931f6, review Ready). Minor: marker guard is if-not instead of exhaustive switch.
Task 6: complete (commits feaed779..729d3fef, review Approved after ComposerDraftBridge lastEmittedRef fix). Minors: projects query always-on when teamId set; no browser E2E.
Task 7: complete (commits 330f1616..4a463c9f, review Ready). Minors only.
Task 8: complete (commits bffc24c2..487bede6, review Ready). Minors only.
Task 9: complete (commits 8728469e..c13907a6, review Ready). Minors only.
Task 10: complete (verify slice: 26 unit tests pass; check / check-types / conventions / golden pass after inventory update). Browser smoke skipped (no authenticated session).

---

Plan: docs/superpowers/plans/2026-08-14-orch-thread-search-and-read-aloud.md

Search Task 1: complete (commits b092fdfd..96f1a11a, review Approved).
Search Task 2: complete (commits 96f1a11a..106e9097, review Ready).
Search Task 3: complete (commits 106e9097..e2b8b42f, review Ready).
Search Task 4: complete (commits e2b8b42f..3e559a90, review Ready).
Search Task 5: complete (commits 3e559a90..ae895d4c, review Approved).
Search Task 6: complete (commit 6db6bdf5 inventory). Browser smoke skipped.

---

Plan: docs/superpowers/plans/2026-08-14-agency-orch-ops.md

Agency Task 1: complete (commits 6db6bdf5..25d13b62, review Approved).
Agency Task 2: complete (commits 25d13b62..24c877c9, review Approved).
Agency Task 3: complete (commits 24c877c9..4f403a5b, review Approved).
Agency Task 4: complete (commits 4f403a5b..cf6713fb, review Approved).
Agency Task 5: complete (commits cf6713fb..646b07f8, review Approved).
Agency Task 6: complete (commits 646b07f8..b3a62d7e, review Approved).
Agency Task 7: complete (commits b3a62d7e..6b5b88fb, review Approved).
Agency Task 8: complete (commit 256e3366 inventory). Browser smoke skipped.

---

Plan: docs/superpowers/plans/2026-08-14-canvas-orch-scope.md

Canvas Task 1+2: complete (commits 256e3366..c4135377, review Approved). Important: agencyRef null clear untested.
Canvas Task 3: complete (commits c4135377..bc67b5ae, review Approved). Important: duplicate scoped note on Canvas-primary dual-surface turns.
Canvas Task 4: complete (commits bc67b5ae..6a07b0bc, review Approved). Important: sniper vs @ draft source asymmetry.
Canvas Task 5: complete (commit 7742ec35 inventory). Browser smoke skipped.

All four plans complete (composer, search, agency, canvas). Prompt library out of scope.

---

Plan: docs/superpowers/plans/2026-08-29-bills-tables.md

Task 1: complete (commits 45d3943e..4650b1a5, review Approved). Minors: tests couple to group builder; missing same-period non-carry uniqueness case; dead `if (!line)` after size===1.
Task 2: complete (commits 4650b1a5..615e2f48, review Approved after prop-boundary + golden inventory fix). Minors: onOpenRow still MoneyBillComposeDisplayRow; PersonBillsTable takes salaryPool on client table; status badge thinner than old chips; three unrelated inventory rows.
Task 3: complete (commits 615e2f48..f1ac3b51, review Approved after salary-pool visibility fix). Minors: salary footer can still render from cached pool on Clients/Adjustments; close-via-effect can flash one frame.
Task 4: complete (commits f1ac3b51..e7817511, review Approved). Minors: compact remaining inlined vs chrome helper; search+status cluster wraps earlier; Select value casts.
Task 5: complete (commits e7817511..474bdb50, review Approved after strip-item id selection). Minor: ExpenseStatusBadge nested ternary vs exhaustive switch in sheet.
Task 6: complete (verify only, no commits; 47 tests, types, golden pass; check/conventions fail only on 8 pre-existing non-Money files). Browser on worktree :7012 at 2534×1426. Salary pool and error state data-blocked.
Final review 45d3943e..474bdb50: With fixes (no Critical). Important: salary-pool leak, paid CTA mismatch, pending-adjustments missing from sheet, sheets not bottom on mobile, party not a Link. Fix pass in flight.
Fix pass: `4c448fba` (68 tests, types pass). Re-review of `45d3943e..4c448fba` in flight.
Re-review: five prior Importants fixed. New Important: unbounded mobile bottom sheet height. Cap-height fix in flight.
Height cap: `d7cd2ba4` (68 tests, types pass). Re-review of `45d3943e..d7cd2ba4` in flight.
Re-review: height cap Fixed. New Important: salary pool ignores status filter and labels partial as Outstanding. Fix in flight.
Salary-pool status: `c22009d0` (76 tests, types pass). Re-review of `45d3943e..c22009d0` in flight.
Re-review: salary-pool Fixed. Important: `use-money-detail-sheet-side.ts` missing from golden inventory. Inventory fix in flight.
Golden inventory: `31130250` (check:golden 1429, exit 0). Re-review of `45d3943e..31130250` in flight.
Re-review: inventory Fixed; no Critical/Important. Merge nits: oxfmt on waste helper, exhaustive ExpenseStatusBadge. Fix in flight.
Fmt/badge: `d7a07492`. Re-review of `45d3943e..d7a07492` in flight.
Final review `45d3943e..d7a07492`: Ready to merge Yes. No Critical/Important remaining.
