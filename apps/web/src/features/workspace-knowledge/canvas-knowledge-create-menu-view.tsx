import { FileText, Folder, Pin, Scale, StickyNote, Upload, User } from "lucide-react";

import {
  knowledgeCreateIconClass,
  knowledgeCreateKinds,
  knowledgeCreateLabel,
  type KnowledgeCreateKind,
} from "@/features/workspace-knowledge/knowledge-create";
import { Separator } from "@/ui/separator";
import { cn } from "@/lib/utils";

export type CanvasKnowledgeCreateMenuViewProps = {
  open: boolean;
  x: number;
  y: number;
  unplacedCount: number;
  onClose: () => void;
  onSelect: (kind: KnowledgeCreateKind) => void;
  onOpenUnplaced: () => void;
};

function kindIcon(kind: KnowledgeCreateKind) {
  switch (kind) {
    case "note":
      return StickyNote;
    case "decision":
      return Scale;
    case "folder":
      return Folder;
    case "person":
      return User;
    case "source":
      return Upload;
    case "pin":
      return Pin;
    case "document":
      return FileText;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function CanvasKnowledgeCreateMenuView({
  open,
  x,
  y,
  unplacedCount,
  onClose,
  onSelect,
  onOpenUnplaced,
}: CanvasKnowledgeCreateMenuViewProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40"
      onClick={onClose}
      onContextMenu={(event) => event.preventDefault()}
    >
      <ul
        role="menu"
        aria-label="Add to canvas"
        className="absolute z-50 min-w-48 origin-top-left overflow-hidden rounded-2xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10"
        style={{ left: x, top: y }}
        onClick={(event) => event.stopPropagation()}
      >
        {knowledgeCreateKinds.map((kind) => {
          const Icon = kindIcon(kind);
          return (
            <li key={kind} role="none">
              <button
                type="button"
                role="menuitem"
                className="flex min-h-7 w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm outline-hidden hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                onClick={() => onSelect(kind)}
              >
                <Icon className={cn("size-4", knowledgeCreateIconClass(kind))} aria-hidden />
                {knowledgeCreateLabel(kind)}
              </button>
            </li>
          );
        })}
        {unplacedCount > 0 ? (
          <li role="none">
            <Separator className="my-1" />
            <button
              type="button"
              role="menuitem"
              className="flex min-h-7 w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm outline-hidden hover:bg-accent hover:text-accent-foreground"
              onClick={onOpenUnplaced}
            >
              Waiting cards
              <span className="ml-auto text-xs text-muted-foreground">{unplacedCount}</span>
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
