import { useEffect, useRef, useState } from "react";

import { Input } from "@/ui/input";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

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
        className="h-7 rounded-dense text-xs"
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
        "-mx-1 block truncate rounded px-1 transition-colors motion-reduce:transition-none",
        !disabled && "cursor-text hover:bg-muted/60",
        agencyFocusRingClass,
      )}
      title={value || undefined}
      aria-label={value ? `Edit description: ${value}` : "Add description"}
      onDoubleClick={startEditing}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          startEditing();
        }
      }}
    >
      {value || <span className="text-muted">Add description</span>}
    </span>
  );
}
