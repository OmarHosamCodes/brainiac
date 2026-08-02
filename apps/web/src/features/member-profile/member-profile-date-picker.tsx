import { CalendarDays } from "lucide-react";
import { useState } from "react";

import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Calendar } from "@/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

function parseLocalDateKey(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDay(value: string): string {
  const date = parseLocalDateKey(value);
  if (!date) return value || "Pick a date";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type MemberProfileDatePickerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  "aria-label": string;
};

export function MemberProfileDatePicker({
  id,
  value,
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
}: MemberProfileDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDateKey(value);

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-start gap-2 px-3 font-normal transition-[transform,background-color] duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
            agencyFocusRingClass,
          )}
          aria-label={ariaLabel}
          aria-expanded={open}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-sm text-foreground">{formatDisplayDay(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" sideOffset={8}>
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected ?? new Date()}
          onSelect={(next) => {
            if (!next) return;
            onChange(formatLocalDateKey(next));
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
