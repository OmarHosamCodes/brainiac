import { useEffect, useRef, useState } from "react";

import { Input } from "@/ui/input";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

/** Stretch interactive control to the full table-cell hit area (cancels td px-4 py-3). */
const reportCellHitClass =
  "-mx-4 -my-3 flex w-[calc(100%+2rem)] min-h-10 items-center px-4 py-3 text-start";

type AgencyReportDescriptionCellProps = {
  value: string;
  disabled?: boolean;
  onSave: (description: string) => void | Promise<void>;
};

export function AgencyReportDescriptionCell({
  value,
  disabled = false,
  onSave,
}: AgencyReportDescriptionCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const readRef = useRef<HTMLSpanElement>(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    if (!editing) {
      setDraft(value);
      if (restoreFocusRef.current) {
        restoreFocusRef.current = false;
        readRef.current?.focus();
      }
    }
  }, [editing, value]);

  const cancelEdit = () => {
    setDraft(value);
    setEditing(false);
  };

  const saveEdit = async () => {
    const trimmed = draft.trim();
    if (trimmed === value.trim()) {
      cancelEdit();
      return;
    }

    try {
      await onSave(trimmed);
      setEditing(false);
    } catch {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void saveEdit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            restoreFocusRef.current = true;
            void saveEdit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            restoreFocusRef.current = true;
            cancelEdit();
          }
        }}
        disabled={disabled}
        autoFocus
        dir="auto"
        className={cn(
          "-mx-4 -my-3 h-auto min-h-10 w-[calc(100%+2rem)] rounded-none border-0 bg-transparent px-4 py-3 text-start text-xs shadow-none focus-visible:bg-muted/40 focus-visible:ring-0",
        )}
        aria-label="Description"
      />
    );
  }

  const startEditing = () => {
    if (disabled) return;
    setDraft(value);
    setEditing(true);
  };

  return (
    <span
      ref={readRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={cn(
        reportCellHitClass,
        "rounded-none transition-colors motion-reduce:transition-none",
        !disabled && "cursor-text hover:bg-muted/60",
        agencyFocusRingClass,
      )}
      title={value || undefined}
      aria-label={value ? `Edit description: ${value}` : "Add description"}
      onClick={startEditing}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          startEditing();
        }
      }}
    >
      <span className="min-w-0 flex-1 truncate text-start">
        {value || <span className="text-muted">Add description</span>}
      </span>
    </span>
  );
}
