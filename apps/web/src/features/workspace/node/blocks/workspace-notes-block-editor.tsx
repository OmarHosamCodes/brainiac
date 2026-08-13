import type { WorkspaceNotesBlock } from "@orch/workspace";
import { Eye, Pencil } from "lucide-react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import { Textarea } from "@/ui/textarea";

export function WorkspaceNotesBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceNotesBlock>) {
  const { mutateTypedBlock, isNotePreviewEnabled, toggleNotePreview, renderNotesPreview } =
    useWorkspaceNodeEditorContext();

  const isPreview = isNotePreviewEnabled(block.id);
  const isEmpty = !block.body.trim();

  function updateBody(value: string) {
    mutateTypedBlock(tabId, block.id, "notes", (entry) => {
      entry.body = value;
    });
  }

  function handleTogglePreview() {
    toggleNotePreview(block.id);
  }

  return (
    <div className="flex flex-col gap-3">
      {isPreview && isEmpty ? null : (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            aria-label={isPreview ? "Switch to note editing" : "Switch to note preview"}
            onClick={handleTogglePreview}
          >
            {isPreview ? <Pencil /> : <Eye />}
            {isPreview ? "Edit" : "Preview"}
          </Button>
        </div>
      )}

      {!isPreview ? (
        <Textarea
          value={block.body}
          placeholder="Capture notes, decisions, or raw thinking..."
          rows={12}
          className="min-h-[240px] resize-y rounded-xl text-base leading-relaxed"
          onChange={(event) => updateBody(event.target.value)}
        />
      ) : isEmpty ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          <Button type="button" className="rounded-full" onClick={handleTogglePreview}>
            Edit
          </Button>
        </div>
      ) : (
        <div
          className="prose prose-primary dark:prose-invert max-w-none text-foreground selection:bg-primary/20 [&_p]:leading-[1.8]"
          dangerouslySetInnerHTML={{ __html: renderNotesPreview(block.body) }}
        />
      )}
    </div>
  );
}
