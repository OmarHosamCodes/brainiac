import type { DashboardAgentToolPreset, DashboardConversationMessage } from "@orch/agent";
import { useCallback, useState } from "react";

export function useDashboardAgentConversationState() {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [pendingMessages, setPendingMessages] = useState<DashboardConversationMessage[]>([]);
  const [selectedToolPreset, setSelectedToolPreset] = useState<DashboardAgentToolPreset>("ask");
  const [conversationDraftModelId, setConversationDraftModelId] = useState<string | undefined>();
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");

  const resetConversation = useCallback(() => {
    setDraft("");
    setPendingMessages([]);
    setError(null);
    setSelectedNodeIds([]);
  }, []);

  return {
    draft,
    setDraft,
    error,
    setError,
    activeConversationId,
    setActiveConversationId,
    selectedNodeIds,
    setSelectedNodeIds,
    pendingMessages,
    setPendingMessages,
    selectedToolPreset,
    setSelectedToolPreset,
    conversationDraftModelId,
    setConversationDraftModelId,
    isRenameDialogOpen,
    setIsRenameDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    renameDraft,
    setRenameDraft,
    resetConversation,
  };
}
