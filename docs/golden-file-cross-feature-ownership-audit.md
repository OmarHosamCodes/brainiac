# Cross-Feature Ownership Audit

Audited 2026-07-10 against the agency API routers and services.

| Consumer domain | Cross-feature dependency                                      | Boundary                                                                                                                                           | Evidence                                         |
| --------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Reports         | Reporting includes admin time-entry listing and editing       | `reports/service.ts` exposes named `listAllAgencyTimeEntries` and `updateAnyAgencyTimeEntry` wrappers; the router imports only the reports service | `reports/router.ts`, `reports/service.ts`        |
| Billing         | Rates, budgets, and invoices                                  | Domain-local `billing/service.ts`; no imports from reports, resourcing, or time-tracking services                                                  | `billing/router.ts`, `billing/service.ts`        |
| Resourcing      | Capacity and tenure                                           | Domain-local `resourcing/service.ts` and `tenure-service.ts`; no imports from reports, billing, or time-tracking services                          | `resourcing/router.ts`, `resourcing/*.ts`        |
| Reports UI      | Report views consume normalized time-entry/report view models | Hook and service boundaries normalize errors and records before views render                                                                       | `features/reports/hooks/*`, `reports/*-view.tsx` |

## Decision

The Reports-to-Time-Tracking dependency is an intentional reporting admin boundary, not an accidental router import. Its named wrappers keep the router thin and make the cross-feature permission surface explicit. No additional cross-feature service extraction is required by this audit.
