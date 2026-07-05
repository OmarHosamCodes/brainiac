import {
  Flag,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  useAgencyProjectJourney,
  type AgencyProjectJourneyStep,
} from "@/lib/agency/hooks/use-agency-project-journey";
import {
  buildCurvedSegmentPath,
  computeVerticalLayout,
  computeCompactZigzagLayout,
  computeZigzagLayout,
  getJourneyStepNumber,
  isJourneySegmentCompleted,
  isJourneyStepLabelEditable,
  isJourneyStepRemovable,
  isJourneyStepReorderable,
} from "@/lib/agency/journey/journey-step-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { agencyFocusRingClass, agencyLabelClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyProjectJourneyStepperProps = {
  teamId: string;
  projectId: string;
  className?: string;
  layout?: "auto" | "horizontal" | "vertical";
  /** Display-only: no edit controls; use with Edit journey dialog for changes. */
  readOnly?: boolean;
  /** Highlights a step in read-only mode (e.g. task-linked milestone). */
  selectedStepId?: string | null;
  /** Tighter graph for read-only horizontal embeds. */
  compact?: boolean;
};

function getNodeTone(step: AgencyProjectJourneyStep) {
  switch (step.status) {
    case "done":
      return {
        ring: "stroke-success",
        fill: "fill-success",
        text: "text-success",
        label: "text-highlighted",
      };
    case "active":
      return {
        ring: "stroke-info",
        fill: "fill-info",
        text: "text-info",
        label: "text-highlighted",
      };
    case "blocked":
      return {
        ring: "stroke-warning",
        fill: "fill-warning",
        text: "text-warning",
        label: "text-highlighted",
      };
    default:
      return {
        ring: "stroke-muted",
        fill: "fill-elevated",
        text: "text-muted",
        label: "text-muted",
      };
  }
}

function getMiddleStepIds(steps: AgencyProjectJourneyStep[]): string[] {
  return steps
    .filter((step) => isJourneyStepReorderable(step.stepKind))
    .map((step) => step.id);
}

export function AgencyProjectJourneyStepper({
  teamId,
  projectId,
  className,
  layout = "auto",
  readOnly = false,
  selectedStepId: selectedStepIdProp,
  compact = false,
}: AgencyProjectJourneyStepperProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const journeyState = useAgencyProjectJourney(teamId, projectId);
  const {
    journey,
    sortedSteps,
    isLoading,
    isError,
    refetch,
    updateStepLabel,
    reorderSteps,
    addMilestone,
    requestRemoveStep,
    cancelRemoveStep,
    confirmRemoveStep,
    pendingRemoveStepId,
    removePreview,
    isRemovePreviewLoading,
    canRemovePendingStep,
    isUpdating,
    isAdding,
    isRemoving,
  } = journeyState;

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [draggingStepId, setDraggingStepId] = useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (readOnly || !journey || selectedStepId) return;
    const activeStep = sortedSteps.find((step) => step.status === "active");
    setSelectedStepId(activeStep?.id ?? sortedSteps[0]?.id ?? null);
  }, [journey, readOnly, selectedStepId, sortedSteps]);

  const [verticalLayout, setVerticalLayout] = useState(false);

  useEffect(() => {
    if (layout === "horizontal") {
      setVerticalLayout(false);
      return;
    }
    if (layout === "vertical") {
      setVerticalLayout(true);
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setVerticalLayout(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [layout]);

  const graphLayout = useMemo(() => {
    const count = sortedSteps.length;
    return verticalLayout ? computeVerticalLayout(count) : computeZigzagLayout(count);
  }, [sortedSteps.length, verticalLayout]);

  const selectedStep = sortedSteps.find((step) => step.id === selectedStepId) ?? null;

  const beginEdit = useCallback((step: AgencyProjectJourneyStep) => {
    if (!isJourneyStepLabelEditable(step.stepKind)) return;
    setEditingStepId(step.id);
    setLabelDraft(step.label);
    setSelectedStepId(step.id);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingStepId(null);
    setLabelDraft("");
  }, []);

  const commitEdit = useCallback(async () => {
    if (!editingStepId) return;
    const stepId = editingStepId;
    const nextLabel = labelDraft;
    cancelEdit();
    await updateStepLabel(stepId, nextLabel);
  }, [cancelEdit, editingStepId, labelDraft, updateStepLabel]);

  const selectRelativeStep = useCallback(
    (delta: number) => {
      if (sortedSteps.length === 0) return;
      const currentIndex = sortedSteps.findIndex((step) => step.id === selectedStepId);
      const startIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = Math.max(0, Math.min(sortedSteps.length - 1, startIndex + delta));
      setSelectedStepId(sortedSteps[nextIndex]?.id ?? null);
      cancelEdit();
    },
    [cancelEdit, selectedStepId, sortedSteps],
  );

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (editingStepId) {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelEdit();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        void commitEdit();
      }
      return;
    }

    const horizontalKey = verticalLayout
      ? event.key === "ArrowUp"
        ? -1
        : event.key === "ArrowDown"
          ? 1
          : null
      : event.key === "ArrowLeft"
        ? -1
        : event.key === "ArrowRight"
          ? 1
          : null;

    if (horizontalKey !== null) {
      event.preventDefault();
      selectRelativeStep(horizontalKey);
      return;
    }

    if (event.key === "Enter" && selectedStep) {
      event.preventDefault();
      beginEdit(selectedStep);
    }
  }

  async function handleAddMilestone() {
    const createdStepId = await addMilestone();
    if (!createdStepId) return;
    setSelectedStepId(createdStepId);
    setEditingStepId(createdStepId);
    setLabelDraft("New milestone");
  }

  function handleDragStart(stepId: string) {
    setDraggingStepId(stepId);
  }

  function handleDragEnd() {
    setDraggingStepId(null);
    setDragOverStepId(null);
  }

  async function handleDrop(targetStepId: string) {
    if (!draggingStepId || draggingStepId === targetStepId) {
      handleDragEnd();
      return;
    }

    const middleIds = getMiddleStepIds(sortedSteps);
    const fromIndex = middleIds.indexOf(draggingStepId);
    const toIndex = middleIds.indexOf(targetStepId);
    if (fromIndex < 0 || toIndex < 0) {
      handleDragEnd();
      return;
    }

    const nextIds = [...middleIds];
    const [moved] = nextIds.splice(fromIndex, 1);
    if (!moved) {
      handleDragEnd();
      return;
    }
    nextIds.splice(toIndex, 0, moved);
    handleDragEnd();
    await reorderSteps(nextIds);
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center px-4 py-16", className)}>
        <Loader2 className="size-5 animate-spin text-muted motion-reduce:animate-none" />
      </div>
    );
  }

  if (isError || !journey) {
    return (
      <div className={cn("px-4 py-8 text-center text-xs text-muted", className)}>
        Couldn&apos;t load journey.
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const progressLabel = `${journey.completedSteps}/${journey.totalSteps}`;

  if (readOnly) {
    const highlightedStepId =
      selectedStepIdProp ??
      sortedSteps.find((step) => step.status === "active")?.id ??
      sortedSteps[0]?.id ??
      null;
    const readOnlyLayout = compact
      ? computeCompactZigzagLayout(sortedSteps.length)
      : computeZigzagLayout(sortedSteps.length);

    return (
      <div className={cn("overflow-x-auto", className)}>
        <HorizontalJourneyGraph
          steps={sortedSteps}
          layout={readOnlyLayout}
          selectedStepId={highlightedStepId}
          prefersReducedMotion={prefersReducedMotion}
          onSelectStep={() => {}}
          interactive={false}
          compact={compact}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <p className={agencyLabelClass}>Journey</p>
          <span className="font-mono text-[11px] tabular-nums text-muted">{progressLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isAdding || isUpdating}
            onClick={() => void handleAddMilestone()}
          >
            {isAdding ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Plus />}
            Add milestone
          </Button>
          {selectedStep && isJourneyStepRemovable(selectedStep.stepKind) ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted hover:text-error"
              disabled={isRemoving}
              onClick={() => requestRemoveStep(selectedStep.id)}
            >
              <Trash2 />
              Remove step
            </Button>
          ) : null}
        </div>
      </div>

      <div
        ref={keyboardRef}
        tabIndex={0}
        className={cn(
          "rounded-2xl border border-default bg-elevated/40 outline-none",
          agencyFocusRingClass,
        )}
        onKeyDown={handleKeyDown}
        aria-label="Project journey stepper"
      >
        {verticalLayout ? (
          <VerticalJourneyList
            steps={sortedSteps}
            selectedStepId={selectedStepId}
            editingStepId={editingStepId}
            labelDraft={labelDraft}
            draggingStepId={draggingStepId}
            dragOverStepId={dragOverStepId}
            onSelectStep={setSelectedStepId}
            onBeginEdit={beginEdit}
            onLabelDraftChange={setLabelDraft}
            onCommitEdit={() => void commitEdit()}
            onCancelEdit={cancelEdit}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={setDragOverStepId}
            onDrop={handleDrop}
          />
        ) : (
          <>
            <HorizontalJourneyGraph
              steps={sortedSteps}
              layout={graphLayout}
              selectedStepId={selectedStepId}
              prefersReducedMotion={prefersReducedMotion}
              onSelectStep={setSelectedStepId}
            />
            <DesktopJourneyReorderStrip
              steps={sortedSteps}
              draggingStepId={draggingStepId}
              dragOverStepId={dragOverStepId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={setDragOverStepId}
              onDrop={handleDrop}
            />
          </>
        )}
      </div>

      {editingStepId && selectedStep ? (
        <div className="flex items-center gap-2 px-1">
          <Input
            value={labelDraft}
            autoFocus
            aria-label="Step label"
            className="h-9 text-sm"
            onChange={(event) => setLabelDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void commitEdit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancelEdit();
              }
            }}
            onBlur={() => void commitEdit()}
          />
          <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
            Cancel
          </Button>
        </div>
      ) : selectedStep ? (
        <p className="px-1 text-[11px] text-dimmed">
          {isJourneyStepLabelEditable(selectedStep.stepKind)
            ? "Press Enter to rename the selected step."
            : "Start and destination labels are fixed."}
        </p>
      ) : null}

      <AgencyProjectJourneyStepRemoveDialog
        open={Boolean(pendingRemoveStepId && canRemovePendingStep)}
        preview={removePreview}
        isLoading={isRemovePreviewLoading}
        isRemoving={isRemoving}
        onCancel={cancelRemoveStep}
        onConfirm={() => void confirmRemoveStep()}
      />
    </div>
  );
}

type HorizontalJourneyGraphProps = {
  steps: AgencyProjectJourneyStep[];
  layout: ReturnType<typeof computeZigzagLayout>;
  selectedStepId: string | null;
  prefersReducedMotion: boolean;
  onSelectStep: (stepId: string) => void;
  interactive?: boolean;
  compact?: boolean;
};

function JourneyFlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M3 2v12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 2h9l-2.5 3 2.5 3H3z" fill="currentColor" />
    </svg>
  );
}

function HorizontalJourneyGraph({
  steps,
  layout,
  selectedStepId,
  prefersReducedMotion,
  onSelectStep,
  interactive = true,
  compact = false,
}: HorizontalJourneyGraphProps) {
  return (
    <div className={cn("overflow-x-auto px-2", compact ? "py-1.5" : "py-4")}>
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMid meet"
        className={compact ? "h-[160px] w-full" : "min-w-full"}
        role="img"
        aria-label="Journey path"
      >
        {steps.slice(0, -1).map((step, index) => {
          const from = layout.points[index];
          const to = layout.points[index + 1];
          if (!from || !to) return null;
          const completed = isJourneySegmentCompleted(steps[index + 1]!.status);
          const path = buildCurvedSegmentPath(from, to);
          return (
            <path
              key={`${step.id}-segment`}
              d={path}
              fill="none"
              strokeWidth={completed ? 3 : 2}
              strokeDasharray={completed ? undefined : "6 6"}
              className={cn(
                completed ? "stroke-success" : "stroke-muted",
                !prefersReducedMotion &&
                  "transition-[stroke,stroke-dashoffset] duration-300 motion-reduce:transition-none",
              )}
            />
          );
        })}

        {steps.map((step, index) => {
          const point = layout.points[index];
          if (!point) return null;
          const tone = getNodeTone(step);
          const isSelected = step.id === selectedStepId;
          const stepNumber = getJourneyStepNumber(steps, step.id);
          const isEndpoint = step.stepKind === "start" || step.stepKind === "destination";

          return (
            <g
              key={step.id}
              transform={`translate(${point.x} ${point.y})`}
              className={interactive ? "cursor-pointer" : undefined}
              onClick={interactive ? () => onSelectStep(step.id) : undefined}
            >
              <circle
                r={compact ? (isSelected ? 14 : 12) : isSelected ? 18 : 16}
                className={cn(
                  "fill-elevated",
                  tone.ring,
                  isSelected && (compact ? "stroke-[2.5px]" : "stroke-[3px]"),
                  !prefersReducedMotion && "transition-[r,stroke-width] duration-200 motion-reduce:transition-none",
                )}
              />
              {isEndpoint ? (
                <foreignObject
                  x={compact ? -6 : -8}
                  y={compact ? -6 : -8}
                  width={compact ? 12 : 16}
                  height={compact ? 12 : 16}
                  className="pointer-events-none"
                >
                  <JourneyFlagIcon className={cn(compact ? "size-3" : "size-4", tone.text)} />
                </foreignObject>
              ) : (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn(
                    "fill-current font-bold",
                    compact ? "text-[10px]" : "text-[11px]",
                    tone.text,
                  )}
                >
                  {stepNumber}
                </text>
              )}
              <text
                y={compact ? 22 : 28}
                textAnchor="middle"
                className={cn(
                  "fill-current font-semibold",
                  compact ? "text-[9px]" : "text-[10px]",
                  isSelected ? "text-highlighted" : tone.label,
                )}
              >
                {step.label.length > 18 ? `${step.label.slice(0, 16)}…` : step.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

type DesktopJourneyReorderStripProps = {
  steps: AgencyProjectJourneyStep[];
  draggingStepId: string | null;
  dragOverStepId: string | null;
  onDragStart: (stepId: string) => void;
  onDragEnd: () => void;
  onDragOver: (stepId: string | null) => void;
  onDrop: (stepId: string) => void;
};

function DesktopJourneyReorderStrip({
  steps,
  draggingStepId,
  dragOverStepId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: DesktopJourneyReorderStripProps) {
  const middleSteps = steps.filter((step) => isJourneyStepReorderable(step.stepKind));
  if (middleSteps.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-default px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-dimmed">Reorder</span>
      {middleSteps.map((step) => (
        <div
          key={step.id}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-default bg-default px-2 py-1 text-[11px] font-semibold text-muted",
            dragOverStepId === step.id && "border-info/40 bg-info/5",
          )}
          onDragOver={(event) => {
            if (!draggingStepId) return;
            event.preventDefault();
            onDragOver(step.id);
          }}
          onDragLeave={() => onDragOver(null)}
          onDrop={(event) => {
            event.preventDefault();
            void onDrop(step.id);
          }}
        >
          <button
            type="button"
            draggable
            aria-label={`Reorder ${step.label}`}
            className="inline-flex cursor-grab items-center text-dimmed hover:text-highlighted active:cursor-grabbing"
            onDragStart={() => onDragStart(step.id)}
            onDragEnd={onDragEnd}
          >
            <GripVertical className="size-3.5" />
          </button>
          <span className="max-w-[8rem] truncate text-highlighted">{step.label}</span>
        </div>
      ))}
    </div>
  );
}

type VerticalJourneyListProps = {
  steps: AgencyProjectJourneyStep[];
  selectedStepId: string | null;
  editingStepId: string | null;
  labelDraft: string;
  draggingStepId: string | null;
  dragOverStepId: string | null;
  onSelectStep: (stepId: string) => void;
  onBeginEdit: (step: AgencyProjectJourneyStep) => void;
  onLabelDraftChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDragStart: (stepId: string) => void;
  onDragEnd: () => void;
  onDragOver: (stepId: string | null) => void;
  onDrop: (stepId: string) => void;
};

function VerticalJourneyList({
  steps,
  selectedStepId,
  editingStepId,
  labelDraft,
  draggingStepId,
  dragOverStepId,
  onSelectStep,
  onBeginEdit,
  onLabelDraftChange,
  onCommitEdit,
  onCancelEdit,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: VerticalJourneyListProps) {
  return (
    <ul className="divide-y divide-default px-2 py-2">
      {steps.map((step, index) => {
        const tone = getNodeTone(step);
        const isSelected = step.id === selectedStepId;
        const stepNumber = getJourneyStepNumber(steps, step.id);
        const reorderable = isJourneyStepReorderable(step.stepKind);
        const previousStep = steps[index - 1];
        const segmentCompleted =
          index > 0 && previousStep
            ? isJourneySegmentCompleted(step.status)
            : false;

        return (
          <li
            key={step.id}
            className={cn(
              "flex items-start gap-3 px-2 py-3",
              dragOverStepId === step.id && reorderable && "bg-primary/5",
              isSelected && "bg-default/60",
            )}
            onDragOver={(event) => {
              if (!reorderable || !draggingStepId) return;
              event.preventDefault();
              onDragOver(step.id);
            }}
            onDragLeave={() => onDragOver(null)}
            onDrop={(event) => {
              if (!reorderable) return;
              event.preventDefault();
              void onDrop(step.id);
            }}
          >
            <div className="flex flex-col items-center gap-1 pt-0.5">
              {index > 0 ? (
                <span
                  aria-hidden
                  className={cn(
                    "h-3 w-px",
                    segmentCompleted ? "bg-success" : "border-l border-dashed border-muted",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full border-2 bg-elevated text-[11px] font-bold",
                  tone.ring,
                  tone.text,
                )}
              >
                {step.stepKind === "start" || step.stepKind === "destination" ? (
                  <Flag className="size-3.5" />
                ) : (
                  stepNumber
                )}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {editingStepId === step.id ? (
                <Input
                  value={labelDraft}
                  autoFocus
                  className="h-8 text-sm"
                  onChange={(event) => onLabelDraftChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onCommitEdit();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      onCancelEdit();
                    }
                  }}
                  onBlur={onCommitEdit}
                />
              ) : (
                <button
                  type="button"
                  className={cn(
                    "w-full text-left",
                    agencyFocusRingClass,
                    "rounded-md px-1 py-0.5",
                  )}
                  onClick={() => onSelectStep(step.id)}
                  onDoubleClick={() => {
                    onSelectStep(step.id);
                    if (isJourneyStepLabelEditable(step.stepKind)) {
                      onBeginEdit(step);
                    }
                  }}
                >
                  <p className={cn("text-sm font-semibold", tone.label)}>{step.label}</p>
                  <p className="text-[10px] capitalize text-dimmed">{step.status}</p>
                </button>
              )}
            </div>

            {reorderable ? (
              <button
                type="button"
                draggable
                aria-label={`Reorder ${step.label}`}
                className={cn(
                  "mt-1 inline-flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted hover:bg-default hover:text-highlighted active:cursor-grabbing",
                  agencyFocusRingClass,
                )}
                onDragStart={() => onDragStart(step.id)}
                onDragEnd={onDragEnd}
              >
                <GripVertical className="size-4" />
              </button>
            ) : (
              <span className="size-8 shrink-0" aria-hidden />
            )}
          </li>
        );
      })}
    </ul>
  );
}

type AgencyProjectJourneyStepRemoveDialogProps = {
  open: boolean;
  preview: {
    label: string;
    timeEntryCount: number;
  } | null;
  isLoading: boolean;
  isRemoving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function AgencyProjectJourneyStepRemoveDialog({
  open,
  preview,
  isLoading,
  isRemoving,
  onCancel,
  onConfirm,
}: AgencyProjectJourneyStepRemoveDialogProps) {
  const entryCount = preview?.timeEntryCount ?? 0;
  const label = preview?.label ?? "this step";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {label}?</DialogTitle>
          <DialogDescription>
            {isLoading ? (
              "Checking linked time entries…"
            ) : (
              <>
                {entryCount} time {entryCount === 1 ? "entry" : "entries"} will be unlinked from
                this step. Logs are kept; they won&apos;t appear on this milestone path.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isRemoving}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isLoading || isRemoving}
            onClick={onConfirm}
          >
            {isRemoving ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : null}
            Remove step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
