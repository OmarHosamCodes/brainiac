import type { AiUiArtifact } from "@orch/agent/types";
import { Maximize2, X } from "lucide-react";

import { AgentUiReactSandboxView } from "@/features/workspace-agent/agent-ui-react-sandbox-view";
import { AgentUiSchemaRendererView } from "@/features/workspace-agent/agent-ui-schema-renderer-view";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

export function AgentArtifactBodyView({ artifact }: { artifact: AiUiArtifact }) {
  switch (artifact.kind) {
    case "schema":
      return <AgentUiSchemaRendererView doc={artifact.schema} />;
    case "react":
      return (
        <AgentUiReactSandboxView
          title={artifact.title}
          code={artifact.code}
          props={artifact.props}
        />
      );
    default: {
      const _exhaustive: never = artifact;
      void _exhaustive;
      return null;
    }
  }
}

/** Dock-side preview: header actions + scrollable artifact body. */
export function AgentArtifactPaneView({
  artifact,
  onExpand,
  onDismiss,
  className,
}: {
  artifact: AiUiArtifact;
  onExpand: () => void;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <section
      aria-label={`Canvas: ${artifact.title}`}
      className={cn("flex min-h-0 flex-col", className)}
    >
      <header className="flex min-h-11 shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-3">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-foreground">
          {artifact.title}
        </p>
        <Badge variant="secondary" className="h-5 px-2 text-[10px] font-medium">
          {artifact.kind === "react" ? "Sandbox" : "View"}
        </Badge>
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1 rounded-full px-3 font-medium"
          onClick={onExpand}
        >
          <Maximize2 className="size-3.5" aria-hidden />
          Open canvas
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Dismiss canvas"
          className="size-8 rounded-full text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      </header>
      <div className={cn("min-h-0 flex-1 overflow-auto p-3", artifact.kind === "react" && "flex")}>
        <AgentArtifactBodyView artifact={artifact} />
      </div>
    </section>
  );
}
