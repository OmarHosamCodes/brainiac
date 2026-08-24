# Fin-Sheet latest month (column BF = July)

Source file: `/home/omar/Downloads/FinSheet.csv`  
Canvas: [`finsheet-july-equations.canvas.tsx`](./finsheet-july-equations.canvas.tsx) (open the live copy beside chat: [Fin-Sheet July equations](/home/omar/.cursor/projects/home-omar-Projects-brainiac/canvases/finsheet-july-equations.canvas.tsx))  
Parsed 2026-08-24. Column **BF** is the last headed month (`July`). **BE** is June (more clients filled). Amounts are sheet units (same scale as salaries 240,000 — not Orch minor units).

Row 1 is the header. Client income is rows 2–81. Totals and equations start at row 82.

## Row map

| Cell | Label in col A | Role |
| --- | --- | --- |
| BF82 | Total Income | Sum of client estimates |
| BF83 | Received | Cash collected (empty in May–July) |
| BF84 | Remaining | Uncollected (empty in May–July) |
| BF85 | Salaries | Payroll out |
| BF86 | Expensis | Ops spend (sheet spelling) |
| BF87 | Debt / Discount | Adjustments |
| BF88 | Device Compensation | Device stipend |
| BF89 | 200H Paid Vacation | Vacation accrual |
| BF90 | ROI | Return on **cost**, not on income |
| BF91 | Team Profit | **Mislabelled.** This is profit-share ÷ salaries (a % of payroll) |
| BF92 | *(blank)* | Team profit **amount** |
| BF93 | Profit share/ Loss share | Half of (amount − charity) |
| BF94 | Charity | Taken off before the 50/50 split |
| BF95 | PBC | Empty in July |
| BF96 | PAC | Empty in July |

## Equations (as given) with July numbers

Let

```text
cost = salaries + expenses + device + vacation + debt
     = BF85 + BF86 + BF88 + BF89 + BF87
```

BF90 uses that same set with debt last; BF92 uses `85+86+87+88+89`. Same five addends.

| Cell | Formula | July stored | Check |
| --- | --- | ---: | --- |
| BF82 | `SUM(BF2:BF81)` | 306,323 | Exact. 8 clients: Tano 86,170; Tharaa 86,016; Mesh Madrsa 47,309; DR El Nazer 43,418; Interface 18,022; Coaching 15,000; OGMs 8,750; Lucent 1,638 |
| BF90 | `(BF82 − cost) / cost` | −28.1% | −119,823 / 426,146 = −28.12% (display round) |
| BF92 | `BF82 − (BF85+BF86+BF87+BF88+BF89)` | −119,823 | Exact |
| BF93 | `(BF92 − BF94) / 2` | −59,911 | Charity empty → −119,823 / 2 = −59,911.5 (truncated toward 0) |
| BF91 | `BF93 / BF85` | −25.0% | −59,911 / 240,000 = −24.96% (display round) |

July inputs: salaries 240,000; expenses 139,646; debt 20,000; device 24,000; vacation 2,500. Received/Remaining/Charity/PBC/PAC empty.

Plain language:

1. **Total income** = sum of per-client estimated income for the month.
2. **Team profit amount** (unnamed row 92) = income minus the five cost buckets (salaries, expenses, debt/discount, device, paid vacation).
3. **ROI** = that profit **divided by the same cost total** (return on cost). Negative when the month loses money.
4. **Profit/loss share** = half of (team profit amount − charity). Charity comes off the top; the remainder splits 50/50.
5. The cell labelled **Team Profit** (row 91) is **not** row 92 as a percent of income. It is profit-share ÷ salaries.

Older filled months often showed row 91 ≈ ROI/2. That was coincidence when share ≈ profit/2 and the denominator was cost-like. The live formula is `BF93/BF85`.

## Vs current Orch Money formulas

From restored `agency_ops_money_settings.calc_options_json`:

| Fin-Sheet | Orch today |
| --- | --- |
| ROI = profit / **cost** | `sys_roi` = `team_profit / total_income` |
| Team profit amount subtracts **device comp** | `sys_team_profit` = income − (salaries + expenses + debt + paid vacation) — **no device** |
| Profit share = `(profit − charity) / 2` | `sys_profit_loss_share` = `team_loss` only |
| Row 91 “Team Profit” = share / salaries | No matching metric (product “team-profit” is the amount) |

June (BE) is a fuller month if July still looks partial (8 vs 12 client lines; June income 543,374).
