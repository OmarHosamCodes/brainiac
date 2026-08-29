import { CalendarDays } from "lucide-react";
import { useState } from "react";

import {
  agencyTimeEntryIconButtonClass,
  agencyTimeTrackerDateTriggerClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { Calendar } from "@/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

/** Parse draft `YYYY-MM-DD` as a local calendar day (avoid UTC parseISO shifts). */
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

type AgencyTimeEntryDatePickerProps = {
  date: string;
  disabled?: boolean;
  onDateChange: (value: string) => void;
  /** When set, render a labeled trigger (tracker "Today") instead of the calendar icon. */
  label?: string;
};

export function AgencyTimeEntryDatePicker({
  date,
  disabled = false,
  onDateChange,
  label,
}: AgencyTimeEntryDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseLocalDateKey(date);

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={label ? "lg" : "icon"}
          disabled={disabled}
          aria-label={label ? `Entry date, ${label}` : "Entry date"}
          aria-expanded={open}
          className={label ? agencyTimeTrackerDateTriggerClass : agencyTimeEntryIconButtonClass}
        >
          {label ?? <CalendarDays className="size-4" aria-hidden />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-auto p-0" sideOffset={8}>
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={(next) => {
            if (!next) return;
            onDateChange(formatLocalDateKey(next));
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
