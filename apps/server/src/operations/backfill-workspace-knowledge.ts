/**
 * Idempotent backfill: project dashboard_workspace JSON nodes into the knowledge graph.
 *
 *   bun run --cwd apps/server src/operations/backfill-workspace-knowledge.ts
 */
import { backfillWorkspaceKnowledge } from "@orch/api/routers/workspace/knowledge-service";

const result = await backfillWorkspaceKnowledge("system", {});
console.log(`Backfilled ${result.workspaceCount} workspaces`);
