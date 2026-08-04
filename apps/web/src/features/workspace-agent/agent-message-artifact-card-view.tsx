import type { AiUiArtifact } from "@orch/agent/types";
import { Maximize2 } from "lucide-react";

import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

/** Inline message control to reopen a turn's canvas artifact — Approach A pill chip. */
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
    <div
      className={cn(
        "inline-flex max-w-[min(100%,36rem)] items-center gap-2 rounded-full border border-border bg-card py-1.5 ps-3 pe-1.5",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium tracking-tight text-foreground">
          {artifact.title}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {artifact.kind === "react" ? "Sandbox canvas" : "Canvas from this reply"}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        className="h-8 shrink-0 gap-1 rounded-full px-3 font-medium"
        onClick={onOpen}
      >
        <Maximize2 className="size-3.5" aria-hidden />
        Open canvas
      </Button>
    </div>
  );
}
