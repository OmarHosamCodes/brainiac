import type { AiUiArtifact } from "@orch/agent/types";
import type { KeyboardEvent } from "react";

import { ArtifactCard } from "@/components/elements/artifact-card";
import { cn } from "@/lib/utils";

function artifactMeta(kind: AiUiArtifact["kind"]): string {
  switch (kind) {
    case "react":
      return "Sandbox canvas";
    case "workspaceNode":
      return "Node preview";
    case "workspaceBlock":
      return "Block preview";
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
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen();
  };

  return (
    <ArtifactCard
      role="button"
      tabIndex={0}
      title={artifact.title}
      meta={artifactMeta(artifact.kind)}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className={cn("max-w-[min(100%,36rem)]", className)}
    />
  );
}
