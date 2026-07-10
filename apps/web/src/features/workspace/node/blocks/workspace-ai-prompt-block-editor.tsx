import type { WorkspaceAiPromptBlock } from "@orch/workspace";
import { AlertCircle, History, Sparkles, Terminal, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { BlockCheckbox } from "@/features/workspace/node/blocks/shared/block-checkbox";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Textarea } from "@/ui/textarea";
import { formatDateTime } from "@/lib/utils/format-date-time";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export function WorkspaceAiPromptBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceAiPromptBlock>) {
  const { mutateTypedBlock, runPromptBlock, getBlockOperationState } =
    useWorkspaceNodeEditorContext();
  const [runError, setRunError] = useState<string | null>(null);

  const operationState = getBlockOperationState(tabId, block.id);
  const hasPrompt = block.prompt.trim().length > 0;
  const contextModeLabel = useMemo(
    () => (block.includeContext ? "Uses current node" : "Standalone prompt"),
    [block.includeContext],
  );

  async function handleRun() {
    if (operationState.pending || !hasPrompt) {
      return;
    }
    setRunError(null);
    try {
      await runPromptBlock(tabId, block.id);
    } catch (error) {
      setRunError(getErrorMessage(error, "Could not run this prompt."));
    }
  }

  return (
    <div className="space-y-6">
      <div className="group relative">
        <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 opacity-30 blur-xl transition-all group-focus-within:opacity-60" />
        <div className="relative rounded-3xl border border-primary/20 bg-background/80 p-5 backdrop-blur-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="size-5" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">AI Strategist</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-2xl">
                  {contextModeLabel}
                </Badge>
                {operationState.pending ? (
                  <Badge variant="secondary" className="rounded-2xl">
                    {operationState.label || "Running prompt"}
                  </Badge>
                ) : null}
              </div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                <BlockCheckbox
                  checked={block.includeContext}
                  onCheckedChange={(checked) =>
                    mutateTypedBlock(tabId, block.id, "ai-prompt", (entry) => {
                      entry.includeContext = checked;
                    })
                  }
                />
                <span>Include current node context</span>
              </label>
            </div>
            <Button
              type="button"
              size="sm"
              className="rounded-full px-5 shadow-lg shadow-primary/20"
              disabled={!hasPrompt || operationState.pending}
              onClick={handleRun}
            >
              <Zap />
              {operationState.pending ? "Running prompt" : "Run prompt"}
            </Button>
          </div>
          <Textarea
            value={block.prompt}
            placeholder="Ask for a structured summary, next actions, critique, or standalone answer..."
            className="min-h-[120px] w-full resize-y border-0 bg-transparent p-0 text-base leading-relaxed font-medium shadow-none focus-visible:ring-0"
            onChange={(event) =>
              mutateTypedBlock(tabId, block.id, "ai-prompt", (entry) => {
                entry.prompt = event.target.value;
              })
            }
          />
        </div>
      </div>

      {runError ? (
        <div className="flex items-start gap-3 rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm font-medium">{runError}</p>
        </div>
      ) : null}

      {block.latestOutput ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-muted-foreground/60" />
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Latest result
              </h4>
            </div>
            <Badge variant="secondary" className="rounded-2xl">
              {contextModeLabel}
            </Badge>
          </div>
          <div className="rounded-3xl border border-muted/20 bg-muted/10 p-6 shadow-sm">
            <div className="prose prose-sm max-w-none leading-relaxed whitespace-pre-wrap text-foreground">
              {block.latestOutput}
            </div>
          </div>
        </div>
      ) : null}

      {block.outputHistory.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <History className="size-4 text-muted-foreground/60" />
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Prompt history
              </h4>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
              {block.outputHistory.length} entries
            </span>
          </div>
          <div className="grid gap-3">
            {block.outputHistory.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-muted/20 bg-background/40 p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-foreground/80 italic">"{entry.prompt}"</p>
                <div className="mt-2 line-clamp-4 text-xs leading-relaxed whitespace-pre-wrap text-foreground">
                  {entry.output}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
