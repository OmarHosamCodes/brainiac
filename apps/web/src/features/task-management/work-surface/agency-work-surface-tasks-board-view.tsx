import { DotsThree } from "@phosphor-icons/react";

import type { AgencyWorkSurfaceTasksBoardViewModel } from "@/features/task-management/work-surface/hooks/use-agency-work-surface-tasks-board";
import {
  AGENCY_WORK_BOARD_COLUMNS,
  agencyWorkBoardCellKey,
  boardColumnLabel,
  type AgencyWorkBoardColumnId,
} from "@/features/task-management/work-surface/agency-work-surface-tasks-board";
import {
  agencyWorkMetaClass,
  agencyWorkSurfaceStateClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Skeleton } from "@/ui/skeleton";
import { cn } from "@/lib/utils";

type AgencyWorkSurfaceTasksBoardViewProps = {
  view: AgencyWorkSurfaceTasksBoardViewModel;
};

export function AgencyWorkSurfaceTasksBoardView({ view }: AgencyWorkSurfaceTasksBoardViewProps) {
  if (view.status === "unsigned") {
    return (
      <div className={agencyWorkSurfaceStateClass}>
        <p className={agencyWorkMetaClass}>Sign in to manage tasks.</p>
      </div>
    );
  }

  if (view.status === "loading") {
    return (
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-3">
        {AGENCY_WORK_BOARD_COLUMNS.map((column) => (
          <div
            key={column}
            className="flex min-h-0 flex-col gap-2 rounded-[12px] border border-default bg-elevated/40 p-3"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full rounded-[10px]" />
            <Skeleton className="h-20 w-full rounded-[10px]" />
          </div>
        ))}
      </div>
    );
  }

  if (view.status === "error") {
    return (
      <div className={agencyWorkSurfaceStateClass}>
        <p className={agencyWorkTitleClass}>Could not load tasks</p>
        <p className={cn(agencyWorkMetaClass, "mt-1")}>{view.message}</p>
        <Button type="button" variant="outline" className="mt-3" onClick={view.onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
      <div className="sr-only" aria-live="polite">
        {view.statusAnnouncement}
      </div>

      <div className="-mx-1 flex min-h-0 flex-1 gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {view.columns.map((column) => (
          <section
            key={column.id}
            className="flex min-h-0 w-[min(100%,20rem)] shrink-0 flex-col rounded-[12px] border border-default bg-elevated/30 md:w-auto md:min-w-0 md:flex-1"
            aria-label={`${column.label}, ${column.count} tasks`}
          >
            <header className="flex items-center justify-between gap-2 border-b border-default px-3 py-2.5">
              <h3 className={agencyWorkTitleClass}>{column.label}</h3>
              <span className="font-mono text-xs font-semibold tabular-nums text-muted">
                {column.count}
              </span>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
              {column.swimlanes.map((swimlane) => {
                const cellKey = agencyWorkBoardCellKey(column.id, swimlane.id);
                const isDropTarget = view.dragOverCellKey === cellKey;
                return (
                  <div
                    key={swimlane.id}
                    className={cn(
                      "flex min-h-[7.5rem] flex-col gap-1.5 rounded-[10px] border border-default bg-muted/35 p-2 transition-colors duration-150 motion-reduce:transition-none",
                      isDropTarget && "border-primary/40 bg-primary/5",
                    )}
                    onDragOver={(event) => view.onCellDragOver(column.id, swimlane.id, event)}
                    onDragLeave={(event) => view.onCellDragLeave(column.id, swimlane.id, event)}
                    onDrop={(event) => view.onCellDrop(column.id, swimlane.id, event)}
                  >
                    <div className="flex items-center justify-between px-0.5">
                      <span className={agencyWorkMetaClass}>{swimlane.label}</span>
                      <span className="font-mono text-[10px] tabular-nums text-muted">
                        {swimlane.cards.length}
                      </span>
                    </div>

                    {swimlane.cards.length === 0 ? (
                      <p className="px-1 py-3 text-center text-xs text-muted">
                        {swimlane.emptyLabel}
                      </p>
                    ) : (
                      swimlane.cards.map((card) => (
                        <article
                          key={card.taskId}
                          draggable={!card.pending}
                          onDragStart={(event) =>
                            view.onCardDragStart(card.taskId, card.swimlane, event)
                          }
                          onDragEnd={view.onCardDragEnd}
                          className={cn(
                            "group rounded-[10px] border border-default bg-background p-2.5 transition-opacity duration-150 motion-reduce:transition-none",
                            card.selected && "border-primary/40 bg-primary/5",
                            card.pending && "opacity-60",
                            view.draggingTaskId === card.taskId && "opacity-50",
                          )}
                        >
                          <div className="flex items-start gap-1.5">
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => view.onSelectTask(card.taskId)}
                            >
                              <p className={cn(agencyWorkTitleClass, "text-balance")}>
                                {card.title}
                              </p>
                              <p className={cn(agencyWorkMetaClass, "mt-1 truncate")}>
                                {card.projectName}
                                {card.dueLabel ? ` · ${card.dueLabel}` : ""}
                                {card.assigneeLabel ? ` · ${card.assigneeLabel}` : ""}
                              </p>
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-7 shrink-0 text-muted opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
                                  aria-label={`Move ${card.title}`}
                                  disabled={card.pending}
                                >
                                  <DotsThree className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-40">
                                {AGENCY_WORK_BOARD_COLUMNS.map((target) => (
                                  <DropdownMenuItem
                                    key={target}
                                    disabled={target === card.column}
                                    onSelect={() => view.onMoveTaskStatus(card.taskId, target)}
                                  >
                                    {moveLabel(card.column, target)}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function moveLabel(from: AgencyWorkBoardColumnId, to: AgencyWorkBoardColumnId): string {
  if (from === to) return boardColumnLabel(to);
  return `Move to ${boardColumnLabel(to)}`;
}
