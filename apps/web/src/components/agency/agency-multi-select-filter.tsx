import { Check, ChevronDown } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

export type AgencyFilterOption = {
  value: string;
  label: string;
};

type AgencyMultiSelectFilterProps = {
  label: string;
  values: string[];
  options: AgencyFilterOption[];
  onValuesChange: (values: string[]) => void;
  disabled?: boolean;
};

export function AgencyMultiSelectFilter({
  label,
  values,
  options,
  onValuesChange,
  disabled,
}: AgencyMultiSelectFilterProps) {
  const selected = new Set(values);
  const selectedOptions = options.filter((option) => selected.has(option.value));
  const buttonLabel =
    selectedOptions.length === 0
      ? label
      : selectedOptions.length === 1
        ? selectedOptions[0]!.label
        : `${selectedOptions.length} selected`;

  function toggleValue(value: string) {
    if (selected.has(value)) {
      onValuesChange(values.filter((entry) => entry !== value));
      return;
    }
    onValuesChange([...values, value]);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex h-9 min-w-32 max-w-44 items-center justify-between gap-2 rounded-xl border border-default bg-default px-3 text-left text-xs font-semibold text-highlighted transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
            agencyFocusRingClass,
          )}
          aria-label={label}
        >
          <span className="truncate">{buttonLabel}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        <div className="max-h-72 overflow-y-auto p-1">
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold transition-colors hover:bg-elevated",
              values.length === 0 ? "text-primary" : "text-muted hover:text-highlighted",
              agencyFocusRingClass,
            )}
            onClick={() => onValuesChange([])}
          >
            <span>{label}</span>
            {values.length === 0 ? <Check className="size-3.5" /> : null}
          </button>

          {options.length === 0 ? (
            <p className="px-2.5 py-3 text-xs text-muted">No options.</p>
          ) : (
            options.map((option) => {
              const checked = selected.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold transition-colors hover:bg-elevated",
                    checked ? "text-primary" : "text-muted hover:text-highlighted",
                    agencyFocusRingClass,
                  )}
                  onClick={() => toggleValue(option.value)}
                  aria-pressed={checked}
                >
                  <span className="truncate">{option.label}</span>
                  {checked ? <Check className="size-3.5 shrink-0" /> : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
