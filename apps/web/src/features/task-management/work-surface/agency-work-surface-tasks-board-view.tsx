import {
  CheckCircle,
  Circle,
  CircleHalf,
  DotsThree,
  HandGrabbing,
  Plus,
  UserPlus,
  Warning,
} from "@phosphor-icons/react";

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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";
import { cn } from "@/lib/utils";

function boardColumnActionIcon(columnId: AgencyWorkBoardColumnId) {
  switch (columnId) {
    case "open":
      return { Icon: Circle, className: "text-toned" };
    case "in_progress":
      return { Icon: CircleHalf, className: "text-primary" };
    case "done":
      return { Icon: CheckCircle, className: "text-success" };
    default: {
      const _exhaustive: never = columnId;
      return _exhaustive;
    }
  }
}

type AgencyWorkSurfaceTasksBoardViewProps = {
  view: AgencyWorkSurfaceTasksBoardViewModel;
};

/** Restrained column washes — accent ≤10%; Open stays tonal, not emerald. */
function columnHeaderWashClass(columnId: AgencyWorkBoardColumnId): string {
  switch (columnId) {
    case "in_progress":
      return "bg-primary/5";
    case "done":
      return "bg-success/5";
    case "open":
      return "bg-elevated/60";
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
            className="flex min-h-0 flex-col gap-2 rounded-xl border border-default bg-elevated/40 p-3"
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

      {view.partialLoadWarning ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-warning/45 bg-warning/15 px-3 py-2">
          <div className="flex min-w-0 items-start gap-2">
            <Warning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <p className="text-xs font-medium text-warning">{view.partialLoadWarning}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-warning hover:bg-warning/10 hover:text-warning"
            onClick={view.onRetryPartialLoad}
          >
            Retry
          </Button>
        </div>
      ) : null}

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
              <p
                className={cn(agencyWorkMetaClass, "min-w-0 truncate font-medium text-highlighted")}
              >
                {view.delegateDraftAssignedToTeam
                  ? "Entire team"
                  : view.members
                      .filter((member) => view.delegateDraftUserIds.includes(member.userId))
                      .map((member) => member.userName)
                      .join(", ")}
              </p>
            ) : (
              <p className={agencyWorkMetaClass}>Add a teammate</p>
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
            className="flex min-h-0 w-[min(100%,20rem)] shrink-0 flex-col overflow-hidden rounded-xl border border-default bg-elevated/40 md:w-auto md:min-w-0 md:flex-1"
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
              <span className="font-mono text-xs font-semibold tabular-nums text-toned">
                {column.count}
              </span>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
              {column.swimlanes.map((swimlane) => {
                const cellKey = agencyWorkBoardCellKey(column.id, swimlane.id);
                const acceptsDrops = !(
                  swimlane.id === "delegated" &&
                  (column.id === "in_progress" || column.id === "done")
                );
                const isDropTarget = acceptsDrops && view.dragOverCellKey === cellKey;
                return (
                  <div
                    key={swimlane.id}
                    className={cn(
                      // shrink-0: min-h-30 alone replaces flex min-height:auto and lets tall
                      // lanes compress so cards paint over the next swimlane.
                      "flex min-h-30 shrink-0 flex-col gap-1.5 rounded-lg bg-muted/50 p-2 transition-[background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
                      isDropTarget && "bg-primary/10 ring-1 ring-primary/30",
                    )}
                    onDragOver={
                      acceptsDrops
                        ? (event) => view.onCellDragOver(column.id, swimlane.id, event)
                        : undefined
                    }
                    onDragLeave={
                      acceptsDrops
                        ? (event) => view.onCellDragLeave(column.id, swimlane.id, event)
                        : undefined
                    }
                    onDrop={
                      acceptsDrops
                        ? (event) => view.onCellDrop(column.id, swimlane.id, event)
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between px-0.5">
                      <span className={cn(agencyWorkMetaClass, "font-medium")}>
                        {swimlane.label}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-toned">
                        {swimlane.cards.length}
                      </span>
                    </div>

                    {swimlane.cards.length === 0 ? (
                      <p className={cn(agencyWorkMetaClass, "px-1 py-3 text-center")}>
                        {swimlane.emptyLabel}
                      </p>
                    ) : (
                      swimlane.cards.map((card) => {
                        const isDragging = view.draggingTaskId === card.taskId;
                        const isEditingDescription = view.editingDescriptionTaskId === card.taskId;
                        const canDrag = !card.readOnly && !card.pending && !isEditingDescription;
                        const showActionsMenu = !card.readOnly;
                        return (
                          <article
                            key={card.taskId}
                            draggable={canDrag}
                            onDragStart={(event) => {
                              if (!canDrag) {
                                event.preventDefault();
                                return;
                              }
                              view.onCardDragStart(card.taskId, card.swimlane, event);
                            }}
                            onDragEnd={view.onCardDragEnd}
                            className={cn(
                              "group rounded-lg border border-default bg-default p-2.5",
                              canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                              "transition-[opacity,transform,border-color,background-color] duration-150 ease-out",
                              "motion-reduce:transition-none motion-reduce:transform-none",
                              card.selected && "border-primary/40 bg-primary/5",
                              card.pending && "opacity-60",
                              isDragging && "scale-[0.98] opacity-50 motion-reduce:scale-100",
                              card.settled && "border-success/50 bg-success/5",
                            )}
                          >
                            <div className="flex items-start gap-1.5">
                              <div className="min-w-0 flex-1">
                                <button
                                  type="button"
                                  className={cn(
                                    "w-full rounded-md text-left",
                                    agencyFocusRingClass,
                                  )}
                                  disabled={isEditingDescription}
                                  onClick={() => {
                                    if (isEditingDescription) return;
                                    view.onSelectTask(card.taskId);
                                  }}
                                >
                                  <p className={cn(agencyWorkTitleClass, "text-balance")}>
                                    {card.title}
                                  </p>
                                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs leading-tight">
                                    <span
                                      className="size-1.5 shrink-0 rounded-full"
                                      style={{ backgroundColor: card.projectHue }}
                                      aria-hidden
                                    />
                                    <span className="truncate font-medium text-highlighted">
                                      {card.clientName}
                                    </span>
                                    <span className="shrink-0 text-toned" aria-hidden>
                                      ·
                                    </span>
                                    <span className="truncate text-muted">{card.projectName}</span>
                                  </p>
                                </button>

                                {isEditingDescription ? (
                                  <div className="mt-1.5">
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
                                      className={cn("h-7 text-xs", agencyInputPlaceholderClass)}
                                      aria-label={`Description for ${card.title}`}
                                      autoFocus
                                    />
                                    <p className={cn(agencyWorkMetaClass, "mt-1")}>
                                      Enter to save · Esc to cancel
                                    </p>
                                  </div>
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
                                      "mt-1.5 text-left text-xs text-muted hover:text-highlighted",
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

                                {card.descriptionSaveState === "saving" ? (
                                  <p className={cn(agencyWorkMetaClass, "mt-1")}>Saving…</p>
                                ) : card.descriptionSaveState === "saved" ? (
                                  <p className="mt-1 text-xs font-medium text-success">Saved</p>
                                ) : null}

                                <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                                  {card.dueLabel ? (
                                    <span
                                      className={cn(
                                        "font-mono text-xs tabular-nums",
                                        card.overdue ? "font-medium text-error" : "text-muted",
                                      )}
                                    >
                                      {card.overdue ? `Overdue ${card.dueLabel}` : card.dueLabel}
                                    </span>
                                  ) : null}
                                  {card.assigneeLabel ? (
                                    <span className="inline-flex max-w-32 truncate rounded-full border border-default bg-elevated px-1.5 py-0.5 text-xs font-medium text-toned">
                                      {card.assigneeLabel}
                                    </span>
                                  ) : null}
                                  {card.canDelegate ? (
                                    <button
                                      type="button"
                                      className={cn(
                                        "ms-auto inline-flex items-center",
                                        "transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
                                        agencyFocusRingClass,
                                        "motion-reduce:transition-none",
                                      )}
                                      disabled={card.pending}
                                      aria-label={`Delegate ${card.title}`}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        view.onRequestDelegate(card.taskId);
                                      }}
                                      onPointerDown={(event) => event.stopPropagation()}
                                    >
                                      <span
                                        className="relative z-0 size-6 shrink-0 rounded-md border border-default bg-elevated"
                                        aria-hidden
                                      />
                                      <span
                                        className={cn(
                                          "relative z-20 -ms-1 flex size-6 shrink-0 items-center justify-center rounded-full",
                                          "border border-dashed border-default bg-elevated text-toned",
                                          "transition-colors hover:border-accented hover:bg-default hover:text-highlighted",
                                          "motion-reduce:transition-none",
                                        )}
                                        aria-hidden
                                      >
                                        <Plus className="size-3" />
                                      </span>
                                    </button>
                                  ) : null}
                                </div>
                              </div>

                              {showActionsMenu ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      className={cn(
                                        "size-7 shrink-0 text-toned hover:text-highlighted",
                                        agencyFocusRingClass,
                                      )}
                                      aria-label={`Actions for ${card.title}`}
                                      disabled={card.pending}
                                    >
                                      <DotsThree className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="min-w-44">
                                    {AGENCY_WORK_BOARD_COLUMNS.map((target) => {
                                      const { Icon, className: iconClass } =
                                        boardColumnActionIcon(target);
                                      return (
                                        <DropdownMenuItem
                                          key={target}
                                          disabled={target === card.column}
                                          onSelect={() =>
                                            view.onMoveTaskStatus(card.taskId, target)
                                          }
                                        >
                                          <Icon className={cn("size-4", iconClass)} weight="fill" />
                                          {moveLabel(card.column, target)}
                                        </DropdownMenuItem>
                                      );
                                    })}
                                    {card.canDelegate || card.canClaim ? (
                                      <DropdownMenuSeparator />
                                    ) : null}
                                    {card.canDelegate ? (
                                      <DropdownMenuItem
                                        onSelect={() => view.onRequestDelegate(card.taskId)}
                                      >
                                        <UserPlus className="size-4 text-info" weight="duotone" />
                                        Delegate…
                                      </DropdownMenuItem>
                                    ) : null}
                                    {card.canClaim ? (
                                      <DropdownMenuItem
                                        onSelect={() => view.onClaimTask(card.taskId)}
                                      >
                                        <HandGrabbing
                                          className="size-4 text-warning"
                                          weight="duotone"
                                        />
                                        Claim…
                                      </DropdownMenuItem>
                                    ) : null}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : null}
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
