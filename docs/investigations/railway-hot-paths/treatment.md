# Treatment (after deploy)

Empty. Fill this file after a separately authorized production deploy of the hot-path fixes, using the same Railway project/environment/service, the same scenario matrix, and the same sanitization rules as [baseline.md](./baseline.md).

Record:

- Treatment commit SHA and Railway deployment ID (must be `SUCCESS`)
- UTC window comparable to the baseline window
- Replica count and memory limit (must remain unchanged)
- Per-endpoint counts, bytes, errors/aborts, p50/p95 with sample sizes
- Which baseline request sources actually moved
- Rollback triggers
