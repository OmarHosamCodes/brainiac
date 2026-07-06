import { ChevronDown, Plus, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencyTaskTitleChooserViewModel } from "@/lib/agency/work/hooks/use-agency-task-title-chooser";
import type { TaskStatus } from "@/lib/schemas/agency-work";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/lib/utils/agency-ui";
import { statusChipClass, statusLabel } from "@/lib/utils/agency-task-status";
import { normalizeTaskTitle } from "@/lib/utils/agency-task-title-filter";
import { cn } from "@/lib/utils";

type AgencyTaskTitleChooserViewProps = {
  view: AgencyTaskTitleChooserViewModel;
};

export function AgencyTaskTitleChooserView({ view }: AgencyTaskTitleChooserViewProps) {
  const {
    value,
    disabled,
    loading,
    placeholder,
    searchPlaceholder,
    className,
    contentAlign,
    autoFocus,
    open,
    searchTerm,
    filteredTasks,
    showCreateRow,
    createRowLabel,
    listboxId,
    activeOptionId,
    activeIndex,
    onOpenChange,
    onSearchChange,
    onSelectTask,
    onCreateFromSearch,
    onActiveIndexChange,
    onSearchKeyDown,
  } = view;

  const hasValue = Boolean(value.trim());

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          autoFocus={autoFocus}
          disabled={disabled || loading}
          className={cn(
            "flex h-7 w-full min-w-0 max-w-full items-center gap-1.5 rounded-full bg-default px-2.5 text-[11px] font-semibold",
            "transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
            agencyFocusRingClass,
            hasValue ? "text-highlighted" : "text-muted",
            "motion-reduce:transition-none",
            className,
          )}
          aria-label="Choose task"
        >
          {loading ? (
            <span className="truncate">Loading…</span>
          ) : hasValue ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
          <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align={contentAlign} className="w-[22rem] max-w-[calc(100vw-2rem)] p-0">
        <div className="border-b border-white/10 p-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
            <Input
              autoFocus
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-activedescendant={activeOptionId}
              className={cn(
                "h-9 rounded-lg border-default bg-default pl-8 text-sm",
                agencyInputPlaceholderClass,
              )}
            />
          </div>
        </div>
        <div
          id={listboxId}
          role="listbox"
          aria-label="Tasks"
          className="max-h-[24rem] overflow-x-hidden overflow-y-auto py-2"
        >
          {loading ? (
            <div className="space-y-2 px-3 py-1">
              {[1, 2, 3, 4].map((rowIndex) => (
                <Skeleton key={rowIndex} className="h-7 rounded-lg" />
              ))}
            </div>
          ) : filteredTasks.length === 0 && !showCreateRow ? (
            <p className="px-4 py-6 text-center text-xs text-muted">
              {searchTerm.trim()
                ? "No matching tasks."
                : "No tasks yet. Type a name to create one."}
            </p>
          ) : (
            <>
              {filteredTasks.map((task, index) => {
                const selected = normalizeTaskTitle(value) === normalizeTaskTitle(task.title);
                const active = index === activeIndex;
                return (
                  <button
                    key={task.id}
                    id={`${listboxId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      "flex w-full min-w-0 items-center gap-2 rounded-lg px-4 py-2 text-left transition-colors hover:bg-default/80",
                      (selected || active) && "bg-primary/10 hover:bg-primary/10",
                      agencyFocusRingClass,
                      "motion-reduce:transition-none",
                    )}
                    onMouseEnter={() => onActiveIndexChange(index)}
                    onClick={() => onSelectTask(task)}
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-xs font-semibold",
                        selected || active ? "text-primary" : "text-highlighted",
                      )}
                    >
                      {task.title}
                    </span>
                    <span
                      className={statusChipClass(task.status as TaskStatus)}
                      aria-label={`${statusLabel(task.status as TaskStatus)} status`}
                    >
                      {statusLabel(task.status as TaskStatus)}
                    </span>
                  </button>
                );
              })}

              {showCreateRow ? (
                <button
                  id={`${listboxId}-create`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === filteredTasks.length}
                  className={cn(
                    "mt-1 flex w-full min-w-0 items-center gap-2 rounded-lg border border-dashed border-default px-4 py-2 text-left transition-colors hover:bg-default/80",
                    activeIndex === filteredTasks.length && "bg-primary/10 hover:bg-primary/10",
                    agencyFocusRingClass,
                    "motion-reduce:transition-none",
                  )}
                  onMouseEnter={() => onActiveIndexChange(filteredTasks.length)}
                  onClick={onCreateFromSearch}
                >
                  <Plus className="size-3.5 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-highlighted">
                    {createRowLabel}
                  </span>
                </button>
              ) : null}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
