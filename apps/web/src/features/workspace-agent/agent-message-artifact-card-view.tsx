import type { AiUiArtifact } from "@orch/agent/types";

import { ArtifactCard } from "@/components/elements/artifact-card";
import { cn } from "@/lib/utils";

function artifactMeta(kind: AiUiArtifact["kind"]): string {
  switch (kind) {
    case "react":
      return "Sandbox canvas";
    case "workspaceNode":
      return "Node preview from this reply";
    case "workspaceBlock":
      return "Block preview from this reply";
    case "schema":
      return "Canvas from this reply";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/** Inline message control to reopen a turn's canvas artifact. */
export function AgentMessageArtifactCardView({
  artifact,
  onOpen,
  className,
}: {
  artifact: AiUiArtifact;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <ArtifactCard
      title={artifact.title}
      meta={artifactMeta(artifact.kind)}
      className={cn("max-w-[min(100%,36rem)]", className)}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onOpen();
      }}
    />
  );
}
