import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { authClient } from "@/lib/auth-client";
import { useWorkspaceQuery } from "@/stores/workspace";

export function useWorkspaceBoard() {
  const authSession = authClient.useSession();
  const navigate = useNavigate();
  const workspace = useWorkspaceQuery();

  useEffect(() => {
    void workspace.preloadWorkspace();
  }, [workspace.preloadWorkspace]);

  async function openNodePage(payload: { nodeId: string }) {
    navigate(`/node/${payload.nodeId}`);
  }

  return {
    authSession,
    ...workspace,
    openNodePage,
  };
}
