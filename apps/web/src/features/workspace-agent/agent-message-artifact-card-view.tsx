import type { AiUiArtifact } from "@orch/agent/types";
import { Maximize2 } from "lucide-react";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";

/** Inline message control to reopen a turn's canvas artifact. */
export function AgentMessageArtifactCardView({
  artifact,
  onOpen,
}: {
  artifact: AiUiArtifact;
  onOpen: () => void;
}) {
  return (
    <div className="flex max-w-[min(100%,36rem)] items-center gap-2 rounded-xl border border-border bg-muted/40 px-2.5 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{artifact.title}</p>
        <p className="text-xs text-muted-foreground">Canvas from this reply</p>
      </div>
      <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px] font-medium">
        {artifact.kind === "react" ? "Sandbox" : "View"}
      </Badge>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-7 shrink-0 gap-1 px-2"
        onClick={onOpen}
      >
        <Maximize2 className="size-3.5" aria-hidden />
        Open canvas
      </Button>
    </div>
  );
}
