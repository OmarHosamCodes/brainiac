import { lazy, Suspense } from "react";

const WorkspaceAgent = lazy(() =>
  import("@/features/workspace-agent/workspace-agent").then((module) => ({
    default: module.WorkspaceAgent,
  })),
);

export function WorkspaceAgentHost() {
  return (
    <Suspense fallback={null}>
      <WorkspaceAgent />
    </Suspense>
  );
}
