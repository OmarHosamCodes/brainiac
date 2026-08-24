# Restored local DB snapshot

**When:** 2026-08-24 ~15:50 UTC+3  
**How:** `pg_dump` production (custom format, `--no-owner --no-acl`) → `docker compose down -v` in `packages/db` → restore into `orch`  
**Dump file:** `/tmp/brainiac-prod-20260824-154920.dump` (1.2 MB)  
**Local URL:** `postgresql://postgres:password@localhost:5440/orch`  
**Verified:** 62 public tables, Redis up (`orch-postgres`, `orch-redis`)

Restart `bun run dev` if it was running during the restore. This copy is real production data — be careful with writes.

## Team and people

| | |
| --- | --- |
| Team | School Of Marketing (`team-aabe75dc-1a60-4330-a92f-2ff3e0258455`) |
| Users | 21 |
| `workspace_team_member` | 13 owners (no non-owner members in this table) |

Tenure policy is **enabled**. Fiscal year starts 26 Dec. Required daily hours 8, week starts Saturday, weekend duration 1 day, monthly min hours 175, off-day reduce hours 8.

## Money tables (what the surface will hit)

| Table | Rows | Notes |
| --- | ---: | --- |
| `agency_ops_money_settings` | 1 | Currency **USD**, locked 2026-08-13 10:26 |
| `agency_ops_fx_rate` | 0 | No team FX pairs |
| `agency_ops_invoice` | 0 | Compose-on-demand; nothing persisted |
| `agency_ops_invoice_line_item` | 0 | |
| `agency_ops_money_pending_adjustment` | 0 | |
| `agency_ops_payout_run` | 6 | All `draft` USD; periods span 2026-06-26 → 2026-08-06 |
| `agency_ops_payout_section` | 6 | Each run has only `salaries` |
| `agency_ops_payout_line` | 0 | Empty salary sections |
| `agency_ops_expense` | 4 | All `due`, paid_amount 0 (see below) |
| `agency_ops_member_rate` | 1 | Abdelrahman Abozied: billable 216 / cost 216 **EGP** |

### Money settings (summary)

Enabled rules: `profit-loss-share`, `rent-allowance`, custom `TRANSPORTATION` (`custom_mt761e9h`, cohort `TRANS`, 5 member ids).

System formulas present and enabled: Remaining, Team profit, ROI, Profit/Loss share, Paid vacation, Device compensation (0), Charity (0), PBC (0). Paid-vacation option value `200`.

### Expenses (amounts are integer minor units; currency column is USD)

| Name | Kind | Amount | When |
| --- | --- | ---: | --- |
| مناديل واوكسي لغسيل المواعين | one_time | 23,000 | occurred 2026-08-24 |
| اشتراك adobe school account | subscription monthly | 178,000 | next due 2026-08-24 |
| فاتورة الماية | one_time | 78,000 | occurred 2026-08-24 |
| Catering | one_time | 500,000 | occurred 2026-08-24 |

These look like local (EGP-scale) figures stored on a USD-locked ledger. Scoreboard expense totals will treat them as USD minor units unless the rework changes that.

## Clients and time (feeds compose-on-demand bills)

| | |
| --- | --- |
| Clients | 18 active external, 3 active internal, 96 archived (all archived are external) |
| Live time entries | 9,140 / 7,623.07 hours (`deleted_at` null) |
| August 2026 | 2,049 entries / 1,094.67 hours |

Largest all-time clients by hours: School Of Marketing (internal 4,273.5h), THARAA (external 653.8h), DR El Nazzer (external 562.5h).

August 2026 mix (joined through project → client):

| Category | Waste | Billable | Hours |
| --- | --- | --- | ---: |
| external | no | yes | 299.46 |
| external | yes | yes | 5.20 |
| internal | no | no | 3.89 |
| internal | no | yes | 784.20 |
| internal | yes | yes | 1.92 |

Default Money period is **this calendar month** (August 2026), so the first paint is this mix plus the four expenses. Client bills default to **external only**, so the large internal School Of Marketing hours stay hidden until that badge is dismissed.

## What this snapshot implies for the current UI

- Stats cards can be live (scoreboard from time + expenses + formulas) but salaries/payouts have almost no rate coverage (1 of 13 members).
- Bills list will be composed from period obligations, not invoice rows.
- Expenses card will show Adobe as the only subscription plus three one-time rows, all unpaid.
- Currency lock is USD while the only member rate is EGP and several expense names are local-ops spend.
