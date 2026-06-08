import { WorkspaceNodeShell } from "@/components/workspace/node/shell";

export function NodeDetailSurface(props: { id: string }) {
  return <WorkspaceNodeShell nodeId={props.id} />;
}
