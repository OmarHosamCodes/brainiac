import {
  buildHookBankGenerationPrompt,
  createWorkspaceHookBankItem,
  getHookBankSummary,
  sortHookBankItems,
  type WorkspaceHookBankBlock,
} from "@brainiac/workspace";
import { Link, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { BlockSelect } from "@/components/workspace/node/blocks/shared/block-select";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils/format-date-time";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { cn } from "@/lib/utils";

export function WorkspaceHookBankBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceHookBankBlock>) {
  const { mutateBlock, runBlockAgentPrompt } = useWorkspaceNodeEditorContext();
  const summary = useMemo(() => getHookBankSummary(block), [block]);
  const sortedHooks = useMemo(() => sortHookBankItems(block.hooks), [block.hooks]);
  const [isGenerating, setIsGenerating] = useState(false);

  function addHook() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "hook-bank") {
        return;
      }
      entry.hooks.unshift(
        createWorkspaceHookBankItem({
          category: "",
          text: "",
          score: 5,
        }),
      );
    });
  }

  function removeHook(hookId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "hook-bank") {
        return;
      }
      entry.hooks = entry.hooks.filter((hook) => hook.id !== hookId);
    });
  }

  function mutateHook(
    hookId: string,
    mutator: (hook: WorkspaceHookBankBlock["hooks"][number]) => void,
  ) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "hook-bank") {
        return;
      }
      const target = entry.hooks.find((hook) => hook.id === hookId);
      if (!target) {
        return;
      }
      mutator(target);
    });
  }

  function parseHookPayload(content: string) {
    const candidates = [
      content.trim(),
      ...[...content.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(
        (match) => match[1]?.trim() ?? "",
      ),
    ].filter(Boolean);

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate) as
          | { hooks?: Array<{ category?: string; text?: string; score?: number }> }
          | Array<{ category?: string; text?: string; score?: number }>;
        const hooks = Array.isArray(parsed) ? parsed : parsed.hooks;

        if (!Array.isArray(hooks)) {
          continue;
        }

        return hooks
          .map((hook) =>
            createWorkspaceHookBankItem({
              category: String(hook.category ?? "").slice(0, 40),
              text: String(hook.text ?? "").slice(0, 320),
              score: Math.min(10, Math.max(1, Math.round(Number(hook.score ?? 5)))),
            }),
          )
          .filter((hook) => hook.text.trim().length > 0)
          .slice(0, 5);
      } catch {
        // try next candidate
      }
    }

    return [];
  }

  async function generateHooks() {
    setIsGenerating(true);

    try {
      const response = await runBlockAgentPrompt(
        tabId,
        block.id,
        buildHookBankGenerationPrompt(block),
      );
      const generatedHooks = parseHookPayload(response);

      if (generatedHooks.length === 0) {
        throw new Error("The Brand agent did not return valid hook JSON.");
      }

      mutateBlock(tabId, block.id, (entry, _tab, _node, timestamp) => {
        if (entry.type !== "hook-bank") {
          return;
        }
        const existingTexts = new Set(entry.hooks.map((hook) => hook.text.trim().toLowerCase()));
        const deduped = generatedHooks.filter((hook) => {
          const key = hook.text.trim().toLowerCase();
          if (existingTexts.has(key)) {
            return false;
          }
          existingTexts.add(key);
          return true;
        });
        entry.hooks.unshift(...deduped);
        entry.lastGeneratedAt = timestamp;
      });

      toast.success("Hooks generated", {
        description: "Five new hook candidates were added to the bank.",
      });
    } catch (error) {
      toast.error("Generation failed", {
        description: getErrorMessage(error, "The Brand agent could not generate hooks."),
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Hooks</p>
          <p className="mt-2 text-xl font-black tracking-tight text-primary sm:text-2xl">
            {summary.hookCount}
          </p>
        </div>
        <div className="rounded-2xl border border-warning/10 bg-warning/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/60">Avg Score</p>
          <p className="mt-2 text-xl font-black tracking-tight text-warning sm:text-2xl">
            {summary.averageScore}/10
          </p>
        </div>
        <div className="rounded-2xl border border-secondary/10 bg-secondary/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/60">
            Top Category
          </p>
          <p className="mt-2 truncate text-lg font-black tracking-tight text-secondary sm:text-xl">
            {summary.topCategory || "None"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-black tracking-tight text-foreground">Hook Bank</h2>
          <p className="text-xs text-muted-foreground">
            Hooks sorted by score to surface the strongest opening angles.
          </p>
          {block.lastGeneratedAt ? (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Last generated {formatDateTime(block.lastGeneratedAt)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={addHook}>
            <Plus />
            Add Hook
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            disabled={isGenerating}
            onClick={generateHooks}
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
            AI Generate
          </Button>
        </div>
      </div>

      {sortedHooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-muted/20 bg-muted/5 py-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted/10 text-muted-foreground/30">
            <Link className="size-6" />
          </div>
          <p className="mt-3 text-xs font-bold text-muted-foreground">No hooks stored yet</p>
          <Button type="button" variant="secondary" size="sm" className="mt-3 rounded-full" onClick={addHook}>
            <Plus />
            Add first hook
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedHooks.map((hook) => (
            <article
              key={hook.id}
              className="rounded-2xl border border-muted/20 bg-background/40 p-4 transition-all hover:border-muted/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <Label
                      htmlFor={`category-${hook.id}`}
                      className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
                    >
                      Category
                    </Label>
                    <Input
                      id={`category-${hook.id}`}
                      value={hook.category}
                      placeholder="e.g. curiosity"
                      className="w-full rounded-xl font-bold sm:w-48"
                      onChange={(event) =>
                        mutateHook(hook.id, (entry) => {
                          entry.category = event.target.value.slice(0, 40);
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor={`score-${hook.id}`}
                      className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
                    >
                      Hook Score ({hook.score}/10)
                    </Label>
                    <div className="flex items-center gap-2">
                      <BlockSelect
                        value={String(hook.score)}
                        options={Array.from({ length: 10 }, (_, index) => ({
                          label: String(index + 1),
                          value: String(index + 1),
                        }))}
                        className="w-20 rounded-xl"
                        aria-label="Hook score"
                        onValueChange={(value) =>
                          mutateHook(hook.id, (entry) => {
                            entry.score = Number(value);
                          })
                        }
                      />
                      <div className="flex flex-1 items-center gap-1">
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                          <div
                            key={`${hook.id}-${score}`}
                            className={cn(
                              "h-1.5 flex-1 rounded-full transition-all",
                              score <= hook.score ? "bg-primary" : "bg-muted/20",
                            )}
                            aria-label={`Score ${score}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor={`text-${hook.id}`}
                      className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
                    >
                      Hook Text
                    </Label>
                    <Textarea
                      id={`text-${hook.id}`}
                      value={hook.text}
                      rows={2}
                      className="rounded-2xl bg-muted/5"
                      placeholder="Write the hook..."
                      onChange={(event) =>
                        mutateHook(hook.id, (entry) => {
                          entry.text = event.target.value.slice(0, 320);
                        })
                      }
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remove hook"
                  onClick={() => removeHook(hook.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
