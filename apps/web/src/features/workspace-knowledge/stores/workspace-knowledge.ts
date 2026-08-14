import { create } from "zustand";

import { orpc, orpcClient } from "@/lib/orpc";
import { getQueryClient } from "@/lib/query-client";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { KnowledgeAction } from "@orch/agent/knowledge-actions";

type CaptureResult = {
  status: "applied" | "pending";
  proposalId: string | null;
  objectId: string | null;
  label: string;
};

type WorkspaceKnowledgeState = {
  capturePending: boolean;
  captureError: string | null;
  captureKnowledge: (input: {
    action: KnowledgeAction;
    teamId?: string | null;
    label?: string;
    silent?: boolean;
  }) => Promise<CaptureResult>;
};

async function invalidateKnowledgeQueries() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.workspace.knowledge.board.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.workspace.knowledge.get.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.workspace.knowledge.query.key() }),
  ]);
}

export const useWorkspaceKnowledgeStore = create<WorkspaceKnowledgeState>((set) => ({
  capturePending: false,
  captureError: null,
  captureKnowledge: async (input) => {
    if (!input.silent) set({ capturePending: true, captureError: null });
    try {
      const result = await orpcClient.workspace.knowledge.capture(input);
      await invalidateKnowledgeQueries();
      if (!input.silent) set({ capturePending: false });
      return result;
    } catch (error) {
      const message = getErrorMessage(error, "Could not save knowledge.");
      set({ capturePending: false, captureError: message });
      throw error;
    }
  },
}));
