import type { KnowledgeAction } from "@orch/agent/knowledge-actions";
import { knowledgeActionLabel } from "@orch/agent/knowledge-actions";
import { isAgencyObjectType } from "@orch/workspace";

import { createKnowledgeProposalRecord } from "../agent/agency-proposals";
import { applyKnowledgeAction, getKnowledgeObject } from "./knowledge-service";

function objectIdFromAction(action: KnowledgeAction): string | null {
  switch (action.type) {
    case "object.create":
      return action.id ?? null;
    case "object.update":
    case "object.delete":
    case "placement.upsert":
      return action.objectId;
    case "relation.create":
      return action.fromObjectId;
    case "relation.delete":
      return null;
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export async function captureKnowledgeAction(
  actorUserId: string,
  input: { action: KnowledgeAction; teamId?: string | null; label?: string },
) {
  const action = input.action;
  const teamId = input.teamId ?? null;
  const label = input.label?.trim() || knowledgeActionLabel(action);

  if (action.type === "object.create") {
    const visibility = action.visibility ?? (action.teamId ? "team" : "private");
    if (visibility === "team") {
      const proposal = await createKnowledgeProposalRecord(actorUserId, {
        action,
        label,
        teamId: action.teamId ?? teamId,
      });
      return {
        status: "pending" as const,
        proposalId: proposal.proposalId,
        objectId: objectIdFromAction(action),
        before: proposal.before,
        after: proposal.after,
        label: proposal.label,
      };
    }
    const applied = await applyKnowledgeAction(actorUserId, { action, teamId });
    return {
      status: "applied" as const,
      proposalId: null,
      objectId: applied.objectId,
      before: applied.before,
      after: applied.after,
      label,
    };
  }

  if (
    action.type === "placement.upsert" &&
    action.objectType &&
    isAgencyObjectType(action.objectType)
  ) {
    const applied = await applyKnowledgeAction(actorUserId, { action, teamId });
    return {
      status: "applied" as const,
      proposalId: null,
      objectId: applied.objectId,
      before: applied.before,
      after: applied.after,
      label,
    };
  }

  if (action.type === "relation.delete") {
    const applied = await applyKnowledgeAction(actorUserId, { action, teamId });
    return {
      status: "applied" as const,
      proposalId: null,
      objectId: applied.objectId,
      before: applied.before,
      after: applied.after,
      label,
    };
  }

  const lookupId =
    action.type === "relation.create" ? action.fromObjectId : objectIdFromAction(action);
  if (lookupId) {
    const detail = await getKnowledgeObject(actorUserId, {
      id: lookupId,
      teamId: teamId ?? undefined,
    });
    if (detail.object?.visibility === "team") {
      const proposal = await createKnowledgeProposalRecord(actorUserId, {
        action,
        label,
        teamId: detail.object.teamId ?? teamId,
      });
      return {
        status: "pending" as const,
        proposalId: proposal.proposalId,
        objectId: lookupId,
        before: proposal.before,
        after: proposal.after,
        label: proposal.label,
      };
    }
  }

  const applied = await applyKnowledgeAction(actorUserId, { action, teamId });
  return {
    status: "applied" as const,
    proposalId: null,
    objectId: applied.objectId,
    before: applied.before,
    after: applied.after,
    label,
  };
}
