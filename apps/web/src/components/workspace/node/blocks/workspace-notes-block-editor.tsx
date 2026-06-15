import type { WorkspaceNotesBlock } from "@brainiac/workspace";
import { Eye, Pencil, StickyNote } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function WorkspaceNotesBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceNotesBlock>) {
  const { mutateTypedBlock, isNotePreviewEnabled, toggleNotePreview, renderNotesPreview } =
    useWorkspaceNodeEditorContext();

  const isPreview = isNotePreviewEnabled(block.id);
  const wordCount = useMemo(
    () => block.body.trim().split(/\s+/).filter(Boolean).length,
    [block.body],
  );

  function updateBody(value: string) {
    mutateTypedBlock(tabId, block.id, "notes", (entry) => {
      entry.body = value;
    });
  }

  return (
    <div className="group relative flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-2xl">
            {isPreview ? "Preview" : "Editing"}
          </Badge>
          <Badge variant="secondary" className="rounded-2xl">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Markdown supported
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full px-3"
            aria-label={isPreview ? "Switch to note editing" : "Switch to note preview"}
            onClick={() => toggleNotePreview(block.id)}
          >
            {isPreview ? <Pencil /> : <Eye />}
            {isPreview ? "Edit" : "Preview"}
          </Button>
        </div>
      </div>

      <div
        className={`min-h-[240px] rounded-3xl border border-muted/20 bg-background/40 shadow-sm transition-all focus-within:border-primary/30 focus-within:bg-background/60 ${isPreview ? "p-8" : ""}`}
      >
        {!isPreview ? (
          <Textarea
            value={block.body}
            placeholder="Capture notes, decisions, or raw thinking..."
            rows={12}
            className="min-h-[240px] w-full resize-y border-0 bg-transparent p-8 font-serif text-base leading-relaxed shadow-none focus-visible:ring-0"
            onChange={(event) => updateBody(event.target.value)}
          />
        ) : !block.body.trim() ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <StickyNote className="mb-3 size-8 text-muted-foreground/20" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
              No notes to preview
            </p>
          </div>
        ) : (
          <div
            className="prose prose-primary dark:prose-invert max-w-none text-foreground selection:bg-primary/20 [&_p]:leading-[1.8] [&]:font-serif"
            dangerouslySetInnerHTML={{ __html: renderNotesPreview(block.body) }}
          />
        )}
      </div>
    </div>
  );
}
