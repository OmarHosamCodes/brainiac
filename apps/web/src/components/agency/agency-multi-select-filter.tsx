import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

export type AgencyFilterOption = {
  value: string;
  label: string;
  searchText?: string;
};

export type AgencyFilterOptionSection = {
  sectionLabel: string;
  options: AgencyFilterOption[];
};

export type AgencyFilterOptionGroup = {
  groupLabel: string;
  options?: AgencyFilterOption[];
  sections?: AgencyFilterOptionSection[];
};

type AgencyMultiSelectFilterProps = {
  label: string;
  values: string[];
  options?: AgencyFilterOption[];
  groups?: AgencyFilterOptionGroup[];
  onValuesChange: (values: string[]) => void;
  disabled?: boolean;
  searchPlaceholder?: string;
};

function optionMatchesQuery(option: AgencyFilterOption, query: string): boolean {
  const haystack = [option.label, option.searchText ?? ""].join(" ").toLowerCase();
  return haystack.includes(query);
}

function filterFlatOptions(options: AgencyFilterOption[], query: string): AgencyFilterOption[] {
  if (!query) return options;
  return options.filter((option) => optionMatchesQuery(option, query));
}

function filterGroupedOptions(
  groups: AgencyFilterOptionGroup[],
  query: string,
): AgencyFilterOptionGroup[] {
  if (!query) return groups;

  return groups
    .map((group) => {
      if (group.groupLabel.toLowerCase().includes(query)) {
        return group;
      }

      if (group.sections) {
        const sections = group.sections
          .map((section) => {
            if (section.sectionLabel.toLowerCase().includes(query)) {
              return section;
            }
            const options = section.options.filter((option) => optionMatchesQuery(option, query));
            return options.length > 0 ? { ...section, options } : null;
          })
          .filter((section): section is AgencyFilterOptionSection => Boolean(section));

        return sections.length > 0 ? { ...group, sections } : null;
      }

      const options = (group.options ?? []).filter((option) => optionMatchesQuery(option, query));
      return options.length > 0 ? { ...group, options } : null;
    })
    .filter((group): group is AgencyFilterOptionGroup => Boolean(group));
}

export function AgencyMultiSelectFilter({
  label,
  values,
  options = [],
  groups,
  onValuesChange,
  disabled,
  searchPlaceholder,
}: AgencyMultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const selected = new Set(values);
  const query = searchTerm.trim().toLowerCase();

  const flatOptions = useMemo(() => {
    if (groups) {
      return groups.flatMap((group) => [
        ...(group.options ?? []),
        ...(group.sections?.flatMap((section) => section.options) ?? []),
      ]);
    }
    return options;
  }, [groups, options]);

  const filteredFlatOptions = useMemo(
    () => filterFlatOptions(flatOptions, query),
    [flatOptions, query],
  );
  const filteredGroups = useMemo(
    () => (groups ? filterGroupedOptions(groups, query) : []),
    [groups, query],
  );

  const selectedOptions = flatOptions.filter((option) => selected.has(option.value));
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

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchTerm("");
    }
  }

  const hasResults = groups ? filteredGroups.length > 0 : filteredFlatOptions.length > 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex h-9 min-w-32 max-w-44 overflow-hidden items-center justify-between gap-2 rounded-xl border border-default bg-default px-3 text-left text-xs font-semibold text-highlighted transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
            agencyFocusRingClass,
          )}
          aria-label={label}
        >
          <span className="min-w-0 flex-1 truncate">{buttonLabel}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
      >
        <div className="border-b border-white/10 p-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
            <Input
              autoFocus
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={searchPlaceholder ?? `Search ${label.toLowerCase()}`}
              className={cn(
                "h-9 rounded-lg border-default bg-default pl-8 text-sm",
                agencyInputPlaceholderClass,
              )}
            />
          </div>
        </div>
        <div className="max-h-72 overflow-x-hidden overflow-y-auto px-2 py-2">
          <button
            type="button"
            className={cn(
              "flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold transition-colors hover:bg-default/80",
              values.length === 0 ? "bg-primary/10 text-primary hover:bg-primary/10" : "text-muted hover:text-highlighted",
              agencyFocusRingClass,
            )}
            onClick={() => onValuesChange([])}
          >
            <span>{label}</span>
            {values.length === 0 ? <Check className="size-3.5" /> : null}
          </button>

          {!hasResults ? (
            <p className="px-4 py-4 text-center text-xs text-muted">
              {query ? "No matching options." : "No options."}
            </p>
          ) : groups ? (
            filteredGroups.map((group) => (
              <div key={group.groupLabel} className="min-w-0 py-1 first:pt-0">
                <div className="mb-1 flex min-w-0 items-center justify-between gap-2 px-2 text-[11px] font-semibold text-muted">
                  <span className="min-w-0 truncate uppercase tracking-[0.12em]">
                    {group.groupLabel}
                  </span>
                </div>

                {group.sections
                  ? group.sections.map((section) => (
                      <div key={`${group.groupLabel}-${section.sectionLabel}`} className="pb-1">
                        <p className="min-w-0 truncate px-2 py-1 text-[11px] font-semibold text-muted">
                          {section.sectionLabel}
                        </p>
                        {section.options.map((option) => {
                          const checked = selected.has(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={cn(
                                "flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold transition-colors hover:bg-default/80",
                                checked ? "bg-primary/10 text-primary hover:bg-primary/10" : "text-muted hover:text-highlighted",
                                agencyFocusRingClass,
                              )}
                              onClick={() => toggleValue(option.value)}
                              aria-pressed={checked}
                            >
                              <span className="min-w-0 truncate">{option.label}</span>
                              {checked ? <Check className="size-3.5 shrink-0" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    ))
                  : (group.options ?? []).map((option) => {
                      const checked = selected.has(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={cn(
                            "flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold transition-colors hover:bg-default/80",
                            checked ? "bg-primary/10 text-primary hover:bg-primary/10" : "text-muted hover:text-highlighted",
                            agencyFocusRingClass,
                          )}
                          onClick={() => toggleValue(option.value)}
                          aria-pressed={checked}
                        >
                          <span className="min-w-0 truncate">{option.label}</span>
                          {checked ? <Check className="size-3.5 shrink-0" /> : null}
                        </button>
                      );
                    })}
              </div>
            ))
          ) : (
            filteredFlatOptions.map((option) => {
              const checked = selected.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold transition-colors hover:bg-default/80",
                    checked ? "bg-primary/10 text-primary hover:bg-primary/10" : "text-muted hover:text-highlighted",
                    agencyFocusRingClass,
                  )}
                  onClick={() => toggleValue(option.value)}
                  aria-pressed={checked}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
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
