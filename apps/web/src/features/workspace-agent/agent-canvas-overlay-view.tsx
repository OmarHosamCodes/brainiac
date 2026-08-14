import type { AiUiArtifact } from "@orch/agent/types";
import { X } from "lucide-react";
import { motion } from "motion/react";
import type { RefObject } from "react";

import { AgentArtifactBodyView } from "@/features/workspace-agent/agent-artifact-pane-view";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Full-viewport canvas for one artifact. Esc closes via container hook; focus starts on Close. */
export function AgentCanvasOverlayView({
  artifact,
  onClose,
  closeRef,
}: {
  artifact: AiUiArtifact;
  onClose: () => void;
  closeRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <motion.div
      data-slot="agent-canvas-overlay"
      data-workspace-agent-overlay
      role="dialog"
      aria-modal="true"
      aria-label={`Canvas: ${artifact.title}`}
      className="pointer-events-auto fixed inset-0 z-[60] flex flex-col bg-background"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {artifact.title}
        </p>
        <Badge variant="secondary" className="h-5 px-2 text-[11px]">
          {artifact.kind === "react" ? "Sandbox" : "View"}
        </Badge>
        <Button
          ref={closeRef}
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1"
          onClick={onClose}
        >
          <X className="size-4" aria-hidden />
          Close
          <kbd className="ms-1 text-[10px] text-muted-foreground">Esc</kbd>
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col p-6">
          <AgentArtifactBodyView artifact={artifact} />
        </div>
      </div>
    </motion.div>
  );
}
