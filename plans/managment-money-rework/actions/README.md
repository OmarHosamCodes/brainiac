# Management Money rework — actions

Operational runbooks for the restored local DB (and later prod, only if named). These are not product slices.

| Action | When |
| --- | --- |
| [01-relabel-agency-currency-egp.md](./01-relabel-agency-currency-egp.md) | Local `orch` copy: ledger says USD, Fin-Sheet and rates are EGP. Relabel, do not FX-convert. |
| [02-production-deploy.md](./02-production-deploy.md) | Ship Money rework steps 01–08 to Railway: migrations 0055–0057, deploy smoke. |

Implementation slices stay in [`../slices/`](../slices/README.md). Run this
currency action on local data **before** judging whether stats match Fin-Sheet
July.
