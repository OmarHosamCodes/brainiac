import { Tag } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import {
  agencyFocusRingClass,
  agencyTimeTrackerIconActionClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

export type AgencyTagOption = {
  id: string;
  name: string;
};

type AgencyTagChooserProps = {
  value: string[];
  tags: AgencyTagOption[];
  onValueChange: (tagIds: string[]) => void;
  onCreateTag?: (name: string) => void;
  creating?: boolean;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

/** Presentational tag multi-select; tags + create come from the parent hook. */
export function AgencyTagChooser({
  value,
  tags,
  onValueChange,
  onCreateTag,
  creating = false,
  disabled = false,
  compact = false,
  className,
}: AgencyTagChooserProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = useMemo(() => {
    const byId = new Map(tags.map((tag) => [tag.id, tag]));
    return value.map((id) => byId.get(id)).filter((tag): tag is AgencyTagOption => Boolean(tag));
  }, [tags, value]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(q));
  }, [tags, search]);

  const exactMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return tags.find((tag) => tag.name.toLowerCase() === q) ?? null;
  }, [tags, search]);

  const label =
    selected.length === 0
      ? "Add tags"
      : selected.length === 1
        ? selected[0]!.name
        : `${selected.length} tags`;

  function toggleTag(tagId: string) {
    if (value.includes(tagId)) {
      onValueChange(value.filter((id) => id !== tagId));
      return;
    }
    onValueChange([...value, tagId]);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            agencyTimeTrackerIconActionClass,
            compact ? "min-w-8 px-0" : "h-auto min-w-0 max-w-[9rem] gap-1 rounded-none px-1",
            selected.length > 0 ? "text-highlighted" : "text-muted",
            className,
          )}
          aria-label={
            selected.length > 0 ? `Choose tags, ${selected.length} selected` : "Choose tags"
          }
        >
          <Tag className="size-3.5 shrink-0" />
          {compact ? null : <span className="truncate text-sm font-normal">{label}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search or create tag"
          className={cn("mb-2 h-8", agencyFocusRingClass)}
          aria-label="Search tags"
        />
        <ul className="max-h-48 space-y-0.5 overflow-y-auto">
          {filtered.map((tag) => {
            const checked = value.includes(tag.id);
            return (
              <li key={tag.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                    checked ? "bg-elevated text-highlighted" : "text-muted hover:bg-elevated",
                  )}
                  onClick={() => toggleTag(tag.id)}
                >
                  <span
                    className={cn(
                      "flex size-3.5 items-center justify-center rounded-sm border",
                      checked
                        ? "border-highlighted bg-highlighted text-background"
                        : "border-default",
                    )}
                    aria-hidden
                  >
                    {checked ? "✓" : null}
                  </span>
                  {tag.name}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && !search.trim() ? (
            <li className="px-2 py-3 text-xs text-muted">No tags yet</li>
          ) : null}
        </ul>
        {search.trim() && !exactMatch && onCreateTag ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start"
            disabled={creating}
            onClick={() => {
              onCreateTag(search.trim());
              setSearch("");
            }}
          >
            Create “{search.trim()}”
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
