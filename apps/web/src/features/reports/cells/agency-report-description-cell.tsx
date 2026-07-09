import { useEffect, useState } from "react";

import { Input } from "@/ui/input";
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

  useEffect(() => {
    if (!editing) {
      setDraft(value);
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
            void saveEdit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancelEdit();
          }
        }}
        disabled={disabled}
        autoFocus
        className="h-7 text-xs"
        aria-label="Description"
      />
    );
  }

  return (
    <span
      className={cn("block truncate", !disabled && "cursor-text")}
      title={value || undefined}
      onDoubleClick={() => {
        if (disabled) return;
        setDraft(value);
        setEditing(true);
      }}
    >
      {value || "—"}
    </span>
  );
}
