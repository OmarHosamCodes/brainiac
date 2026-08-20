import { describe, expect, test } from "bun:test";

import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";

describe("orchPresence handoff", () => {
  test("thread presence collapses and blocks expand", () => {
    useWorkspaceAgentStore.setState({
      expanded: true,
      orchPresence: "dock",
      scopeModeActive: true,
    });

    useWorkspaceAgentStore.getState().setOrchPresence("thread");
    expect(useWorkspaceAgentStore.getState().orchPresence).toBe("thread");
    expect(useWorkspaceAgentStore.getState().expanded).toBe(false);
    expect(useWorkspaceAgentStore.getState().scopeModeActive).toBe(false);

    useWorkspaceAgentStore.getState().setExpanded(true);
    expect(useWorkspaceAgentStore.getState().expanded).toBe(false);

    useWorkspaceAgentStore.getState().toggleExpanded();
    expect(useWorkspaceAgentStore.getState().expanded).toBe(false);

    useWorkspaceAgentStore.getState().setOrchPresence("dock");
    expect(useWorkspaceAgentStore.getState().orchPresence).toBe("dock");
    useWorkspaceAgentStore.getState().setExpanded(true);
    expect(useWorkspaceAgentStore.getState().expanded).toBe(true);
  });
});
