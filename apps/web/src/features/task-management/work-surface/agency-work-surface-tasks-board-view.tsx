import { DotsThree } from "@phosphor-icons/react";

import type { AgencyWorkSurfaceTasksBoardViewModel } from "@/features/task-management/work-surface/hooks/use-agency-work-surface-tasks-board";
import {
  AGENCY_WORK_BOARD_COLUMNS,
  agencyWorkBoardCellKey,
  boardColumnLabel,
  type AgencyWorkBoardColumnId,
} from "@/features/task-management/work-surface/agency-work-surface-tasks-board";
import { statusDotClass } from "@/features/task-management/agency-task-status";
import { AgencyMemberChooser } from "@/features/shared/choosers/agency-member-chooser";
import {
  agencyFocusRingClass,
  agencyInputPlaceholderClass,
  agencyWorkMetaClass,
  agencyWorkSurfaceStateClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";
import { cn } from "@/lib/utils";

type AgencyWorkSurfaceTasksBoardViewProps = {
  view: AgencyWorkSurfaceTasksBoardViewModel;
};

function columnHeaderWashClass(columnId: AgencyWorkBoardColumnId): string {
  switch (columnId) {
    case "in_progress":
      return "bg-primary/5";
    case "done":
      return "bg-success/5";
    case "open":
      return "bg-elevated/50";
    default: {
      const _exhaustive: never = columnId;
      return _exhaustive;
    }
  }
}

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

  const canConfirmDelegate =
    view.delegateDraftAssignedToTeam ||
    view.delegateDraftUserIds.some((userId) => userId !== view.currentUserId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
      <div className="sr-only" aria-live="polite">
        {view.statusAnnouncement}
      </div>

      <Dialog
        open={view.delegatePrompt !== null}
        onOpenChange={(open) => {
          if (!open) view.onDismissDelegatePrompt();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delegate task</DialogTitle>
            <DialogDescription>
              {view.delegatePrompt
                ? `Choose who should own "${view.delegatePrompt.taskTitle}".`
                : "Choose an assignee."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 py-3">
            <AgencyMemberChooser
              mode="multiple"
              triggerVariant="stack"
              assignedToTeam={view.delegateDraftAssignedToTeam}
              selectedUserIds={view.delegateDraftUserIds}
              onAssignedToTeamChange={view.onDelegateDraftAssignedToTeamChange}
              onSelectedUserIdsChange={view.onDelegateDraftUserIdsChange}
              members={view.members}
              loading={view.membersLoading}
              placeholder="Assign teammate"
            />
            {canConfirmDelegate ? (
              <p className="min-w-0 truncate text-xs text-muted">
                {view.delegateDraftAssignedToTeam
                  ? "Entire team"
                  : view.members
                      .filter((member) => view.delegateDraftUserIds.includes(member.userId))
                      .map((member) => member.userName)
                      .join(", ")}
              </p>
            ) : (
              <p className="text-xs text-muted">Add a teammate</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={view.onDismissDelegatePrompt}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canConfirmDelegate}
              onClick={view.onConfirmDelegatePrompt}
            >
              Delegate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="-mx-1 flex min-h-0 flex-1 gap-3 overflow-x-auto px-1 pb-1 scrollbar-thin">
        {view.columns.map((column) => (
          <section
            key={column.id}
            className="flex min-h-0 w-[min(100%,20rem)] shrink-0 flex-col rounded-[12px] border border-default bg-elevated/25 md:w-auto md:min-w-0 md:flex-1"
            aria-label={`${column.label}, ${column.count} tasks`}
          >
            <header
              className={cn(
                "flex items-center justify-between gap-2 border-b border-default px-3 py-2.5",
                columnHeaderWashClass(column.id),
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn("size-2 shrink-0 rounded-full", statusDotClass(column.id))}
                  aria-hidden
                />
                <h3 className={agencyWorkTitleClass}>{column.label}</h3>
              </div>
              <span className="font-mono text-xs font-semibold tabular-nums text-muted">
                {column.count}
              </span>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
              {column.swimlanes.map((swimlane) => {
                const cellKey = agencyWorkBoardCellKey(column.id, swimlane.id);
                const isDropTarget = view.dragOverCellKey === cellKey;
                return (
                  <div
                    key={swimlane.id}
                    className={cn(
                      "flex min-h-30 flex-col gap-1.5 rounded-[10px] bg-muted/30 p-2 transition-[background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
                      isDropTarget && "bg-primary/5 ring-1 ring-primary/25",
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
                      swimlane.cards.map((card) => {
                        const isDragging = view.draggingTaskId === card.taskId;
                        const isEditingDescription = view.editingDescriptionTaskId === card.taskId;
                        return (
                          <article
                            key={card.taskId}
                            draggable={!card.pending && !isEditingDescription}
                            onDragStart={(event) =>
                              view.onCardDragStart(card.taskId, card.swimlane, event)
                            }
                            onDragEnd={view.onCardDragEnd}
                            className={cn(
                              "group rounded-[10px] border border-default bg-background p-2.5",
                              "cursor-grab active:cursor-grabbing",
                              "transition-[opacity,transform,border-color,background-color] duration-150 ease-out",
                              "motion-reduce:transition-none motion-reduce:transform-none",
                              card.selected && "border-primary/40 bg-primary/5",
                              card.pending && "opacity-60",
                              isDragging && "scale-[0.98] opacity-50 motion-reduce:scale-100",
                              card.settled && "border-success/50",
                            )}
                          >
                            <div className="flex items-start gap-1.5">
                              <div className="min-w-0 flex-1">
                                <button
                                  type="button"
                                  className={cn(
                                    "w-full rounded-[6px] text-left",
                                    agencyFocusRingClass,
                                  )}
                                  onClick={() => view.onSelectTask(card.taskId)}
                                >
                                  <p className={cn(agencyWorkTitleClass, "text-balance")}>
                                    {card.title}
                                  </p>
                                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] leading-tight">
                                    <span
                                      className="size-1.5 shrink-0 rounded-full"
                                      style={{ backgroundColor: card.projectHue }}
                                      aria-hidden
                                    />
                                    <span
                                      className="truncate font-medium"
                                      style={{ color: card.projectHue }}
                                    >
                                      {card.clientName}
                                    </span>
                                    <span className="shrink-0 text-muted" aria-hidden>
                                      ·
                                    </span>
                                    <span className="truncate text-muted">{card.projectName}</span>
                                  </p>
                                </button>

                                {isEditingDescription ? (
                                  <Input
                                    value={view.descriptionDraft}
                                    onChange={(event) =>
                                      view.onDescriptionDraftChange(event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        view.onCommitDescription();
                                      }
                                      if (event.key === "Escape") {
                                        event.preventDefault();
                                        view.onCancelDescriptionEdit();
                                      }
                                    }}
                                    onBlur={() => view.onCommitDescription()}
                                    placeholder="Add a description"
                                    className={cn(
                                      "mt-1.5 h-7 text-xs",
                                      agencyInputPlaceholderClass,
                                    )}
                                    aria-label={`Description for ${card.title}`}
                                    autoFocus
                                  />
                                ) : card.description ? (
                                  <button
                                    type="button"
                                    className={cn(
                                      "mt-1.5 block w-full truncate text-left text-xs text-muted",
                                      agencyFocusRingClass,
                                      card.canEditDescription && "hover:text-highlighted",
                                    )}
                                    disabled={!card.canEditDescription || card.pending}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      view.onBeginDescriptionEdit(card.taskId);
                                    }}
                                  >
                                    {card.description}
                                  </button>
                                ) : card.canEditDescription ? (
                                  <button
                                    type="button"
                                    className={cn(
                                      "mt-1.5 text-left text-xs text-muted/80 hover:text-muted",
                                      agencyFocusRingClass,
                                    )}
                                    disabled={card.pending}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      view.onBeginDescriptionEdit(card.taskId);
                                    }}
                                  >
                                    Add description
                                  </button>
                                ) : null}

                                <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                                  {card.dueLabel ? (
                                    <span
                                      className={cn(
                                        "font-mono text-[11px] tabular-nums",
                                        card.overdue ? "font-medium text-error" : "text-muted",
                                      )}
                                    >
                                      {card.overdue ? `Overdue ${card.dueLabel}` : card.dueLabel}
                                    </span>
                                  ) : null}
                                  {card.assigneeLabel ? (
                                    <span className="inline-flex max-w-32 truncate rounded-full border border-default bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted">
                                      {card.assigneeLabel}
                                    </span>
                                  ) : null}
                                  {card.canDelegate ? (
                                    <div
                                      className="ms-auto"
                                      onClick={(event) => event.stopPropagation()}
                                      onPointerDown={(event) => event.stopPropagation()}
                                    >
                                      <AgencyMemberChooser
                                        mode="multiple"
                                        triggerVariant="stack"
                                        contentAlign="end"
                                        className="scale-90"
                                        assignedToTeam={card.assignedToTeam}
                                        selectedUserIds={card.assigneeUserIds}
                                        onAssignedToTeamChange={(assignedToTeam) =>
                                          view.onAssigneesChange(
                                            card.taskId,
                                            assignedToTeam,
                                            assignedToTeam ? [] : card.assigneeUserIds,
                                          )
                                        }
                                        onSelectedUserIdsChange={(userIds) =>
                                          view.onAssigneesChange(card.taskId, false, userIds)
                                        }
                                        members={view.members}
                                        loading={view.membersLoading}
                                        disabled={card.pending}
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className={cn(
                                      "size-7 shrink-0 text-muted opacity-70",
                                      "group-focus-within:opacity-100",
                                      "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100",
                                      agencyFocusRingClass,
                                    )}
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
                                  {card.canDelegate ? (
                                    <DropdownMenuItem
                                      onSelect={() => view.onRequestDelegate(card.taskId)}
                                    >
                                      Delegate…
                                    </DropdownMenuItem>
                                  ) : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </article>
                        );
                      })
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
