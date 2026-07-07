import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { useRef } from "react";

import { AgencySearchHighlight } from "@/components/agency/agency-search-highlight";
import {
  agencyLabelClass,
  getAgencyPageScrollElement,
  useAgencyPageScrollMargin,
} from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { projectHueStyle } from "@/lib/utils/project-palette";

type ProjectRow = {
  id: string;
  name: string;
  clientName: string;
};

type AgencyProjectsVirtualTableProps = {
  projects: ProjectRow[];
  hoursThisWeekByProject: Map<string, number>;
  budgetsByProject: Map<string, unknown>;
  budgetPctFor: (projectId: string) => number;
  budgetToneFor: (projectId: string) => string;
  searchQuery?: string;
  onSelect: (projectId: string) => void;
};

const ROW_HEIGHT = 52;

export function AgencyProjectsVirtualTable({
  projects,
  hoursThisWeekByProject,
  budgetsByProject,
  budgetPctFor,
  budgetToneFor,
  searchQuery = "",
  onSelect,
}: AgencyProjectsVirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollMargin = useAgencyPageScrollMargin(parentRef);

  const virtualizer = useVirtualizer({
    count: projects.length,
    getScrollElement: () => getAgencyPageScrollElement(),
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    scrollMargin,
  });

  return (
    <div ref={parentRef} className="overflow-x-auto rounded-2xl border border-default bg-default">
      <div
        className={cn(
          "grid min-w-[40rem] grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-default bg-muted text-xs",
          agencyLabelClass,
        )}
      >
        <div className="px-4 py-2.5 font-bold">Project</div>
        <div className="px-3 py-2.5 font-bold">Client</div>
        <div className="px-3 py-2.5 font-bold">Budget</div>
        <div className="px-3 py-2.5 text-right font-bold">Hours · this week</div>
      </div>

      <div className="relative min-w-[40rem]" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const project = projects[virtualRow.index];
          if (!project) return null;

          return (
            <div
              key={project.id}
              className="absolute top-0 left-0 grid w-full cursor-pointer grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-default text-xs transition-colors hover:bg-elevated/40"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              role="row"
              tabIndex={0}
              onClick={() => onSelect(project.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(project.id);
                }
              }}
            >
              <div className="px-4 py-3" role="cell">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="agency-projects__dot inline-block size-2 shrink-0 rounded-full"
                    aria-hidden="true"
                    style={projectHueStyle(project.id)}
                  />
                  <span className="truncate font-bold text-highlighted">
                    <AgencySearchHighlight text={project.name} query={searchQuery} />
                  </span>
                </div>
              </div>
              <div className="px-3 py-3 text-muted" role="cell">
                <span className="truncate">
                  <AgencySearchHighlight text={project.clientName} query={searchQuery} />
                </span>
              </div>
              <div className="px-3 py-3" role="cell">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-elevated">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-200 ease-out",
                        budgetsByProject.get(project.id) ? budgetToneFor(project.id) : "bg-muted",
                      )}
                      style={{
                        width: budgetsByProject.get(project.id)
                          ? `${budgetPctFor(project.id)}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[11px] text-muted">
                    {budgetsByProject.get(project.id) ? `${budgetPctFor(project.id)}%` : "Not set"}
                  </span>
                </div>
              </div>
              <div className="px-3 py-3 text-right" role="cell">
                <span
                  className={cn(
                    "font-mono font-bold tabular-nums",
                    (hoursThisWeekByProject.get(project.id) ?? 0) > 0
                      ? "text-highlighted"
                      : "text-dimmed",
                  )}
                >
                  {formatDuration(hoursThisWeekByProject.get(project.id) ?? 0, "short")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
