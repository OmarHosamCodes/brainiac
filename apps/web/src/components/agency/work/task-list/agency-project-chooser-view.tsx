import { ChevronDown, Search } from "lucide-react";

import { AgencyProjectHueDot } from "@/components/agency/agency-project-hue-dot";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencyProjectChooserViewModel } from "@/lib/agency/work/hooks/use-agency-project-chooser";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyProjectChooserViewProps = {
  view: AgencyProjectChooserViewModel;
};

export function AgencyProjectChooserView({ view }: AgencyProjectChooserViewProps) {
  const {
    value,
    disabled,
    loading,
    placeholder,
    searchPlaceholder,
    className,
    contentAlign,
    autoFocus,
    allowEmpty,
    emptyLabel,
    open,
    searchTerm,
    selectedProject,
    groupedProjects,
    onOpenChange,
    onSearchChange,
    onSelectProject,
    onClearSelection,
  } = view;

  const triggerLabel = loading
    ? "Loading…"
    : selectedProject
      ? selectedProject.name
      : allowEmpty
        ? emptyLabel
        : placeholder;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          autoFocus={autoFocus}
          disabled={disabled || loading}
          className={cn(
            "inline-flex h-7 min-w-0 max-w-[13rem] overflow-hidden items-center gap-1.5 rounded-full bg-default px-2.5 text-[11px] font-semibold",
            "transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
            agencyFocusRingClass,
            selectedProject ? "text-highlighted" : "text-muted",
            "motion-reduce:transition-none",
            className,
          )}
          aria-label="Choose project"
        >
          {loading ? (
            <span className="truncate">Loading…</span>
          ) : (
            <>
              {selectedProject ? (
                <AgencyProjectHueDot projectId={selectedProject.id} />
              ) : null}
              <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
            </>
          )}
          <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align={contentAlign} className="w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden p-0">
        <div className="border-b border-default bg-elevated p-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
            <Input
              autoFocus
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                "h-9 rounded-lg border-default bg-default pl-8 text-sm",
                agencyInputPlaceholderClass,
              )}
            />
          </div>
        </div>
        <div className="max-h-[24rem] overflow-x-hidden overflow-y-auto bg-elevated px-2 py-2">
          {loading ? (
            <div className="space-y-2 py-1">
              {[1, 2, 3, 4].map((rowIndex) => (
                <Skeleton key={rowIndex} className="h-7 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {allowEmpty ? (
                <button
                  type="button"
                  className={cn(
                    "mb-1 flex w-full min-w-0 items-center rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors hover:bg-default/80",
                    !value ? "bg-primary/10 text-primary hover:bg-primary/10" : "text-highlighted",
                    agencyFocusRingClass,
                    "motion-reduce:transition-none",
                  )}
                  onClick={onClearSelection}
                >
                  {emptyLabel}
                </button>
              ) : null}

              {groupedProjects.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted">
                  {searchTerm.trim() ? "No matching projects." : "No projects available."}
                </p>
              ) : (
                groupedProjects.map((group) => (
                  <div key={group.clientName} className="min-w-0 py-1 first:pt-0">
                    <div className="mb-1 flex min-w-0 items-center justify-between gap-2 px-2 text-[11px] font-semibold text-muted">
                      <span className="min-w-0 truncate uppercase tracking-[0.12em]">
                        {group.clientName}
                      </span>
                      <span className="shrink-0 font-mono tabular-nums">
                        {group.projects.length}{" "}
                        {group.projects.length === 1 ? "Project" : "Projects"}
                      </span>
                    </div>

                    {group.projects.map((project) => {
                      const selected = project.id === value;
                      return (
                        <button
                          key={project.id}
                          type="button"
                          className={cn(
                            "flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-default/80",
                            selected && "bg-primary/10 hover:bg-primary/10",
                            agencyFocusRingClass,
                            "motion-reduce:transition-none",
                          )}
                          onClick={() => onSelectProject(project.id)}
                        >
                          <AgencyProjectHueDot projectId={project.id} />
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-xs font-semibold",
                              selected ? "text-primary" : "text-highlighted",
                            )}
                          >
                            {project.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
