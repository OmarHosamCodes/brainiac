import { ChevronDown, Plus, UserRound } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/stores/theme";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { projectHueFor } from "@/lib/utils/project-palette";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  clientName: string;
  name: string;
};

type TeamMember = {
  userId: string;
  userName: string;
};

type TaskTitleSuggestionTask = {
  id: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  createdAt: string;
};

export const UNASSIGNED_ASSIGNEE_VALUE = "__unassigned__";

const TASK_TITLE_SUGGESTION_LIMIT = 5;

function normalizeTaskTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function scoreTaskTitleSuggestion(normalizedTitle: string, normalizedQuery: string) {
  if (!normalizedQuery) return 0;
  if (normalizedTitle === normalizedQuery) return 100;
  if (normalizedTitle.startsWith(normalizedQuery)) return 90;
  if (normalizedTitle.split(" ").some((word) => word.startsWith(normalizedQuery))) return 75;
  if (normalizedTitle.includes(normalizedQuery)) return 55;
  return 0;
}

function getTaskTitleSuggestions(
  tasks: TaskTitleSuggestionTask[],
  titleDraft: string,
  selectedProjectId: string,
) {
  const normalizedQuery = normalizeTaskTitle(titleDraft);
  if (!normalizedQuery || !selectedProjectId) return [];

  const seenTitles = new Set<string>();

  return tasks
    .filter((task) => task.projectId === selectedProjectId)
    .map((task) => {
      const normalizedTitle = normalizeTaskTitle(task.title);
      return {
        task,
        normalizedTitle,
        score: scoreTaskTitleSuggestion(normalizedTitle, normalizedQuery),
        createdAtMs: new Date(task.createdAt).getTime(),
      };
    })
    .filter(({ normalizedTitle, score }) => {
      if (!normalizedTitle || score <= 0 || seenTitles.has(normalizedTitle)) return false;
      seenTitles.add(normalizedTitle);
      return true;
    })
    .sort((left, right) => {
      const rightCreatedAt = Number.isNaN(right.createdAtMs) ? 0 : right.createdAtMs;
      const leftCreatedAt = Number.isNaN(left.createdAtMs) ? 0 : left.createdAtMs;
      return (
        right.score - left.score ||
        rightCreatedAt - leftCreatedAt ||
        left.task.title.localeCompare(right.task.title)
      );
    })
    .slice(0, TASK_TITLE_SUGGESTION_LIMIT)
    .map(({ task }) => task);
}

type AgencyTaskCreateInlineProps = {
  expanded: boolean;
  projects: Project[];
  members: TeamMember[];
  titleSuggestionTasks: TaskTitleSuggestionTask[];
  titleDraft: string;
  selectedProjectId: string;
  selectedAssigneeId: string;
  disabled: boolean;
  isCreatingTask: boolean;
  skipProjectStep: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onTitleChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onSubmit: () => void;
};

function ProjectHueDot({ projectId }: { projectId: string }) {
  const { isDark } = useTheme();
  const hue = projectHueFor(projectId);

  return (
    <span
      className="inline-block size-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: isDark ? hue.dark : hue.light }}
      aria-hidden
    />
  );
}

export function AgencyTaskCreateInline({
  expanded,
  projects,
  members,
  titleSuggestionTasks,
  titleDraft,
  selectedProjectId,
  selectedAssigneeId,
  disabled,
  isCreatingTask,
  skipProjectStep,
  onExpand,
  onCollapse,
  onTitleChange,
  onProjectChange,
  onAssigneeChange,
  onSubmit,
}: AgencyTaskCreateInlineProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const projectPickerTriggerRef = useRef<HTMLButtonElement>(null);
  const zoneId = useId();
  const titleSuggestionsListId = useId();
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [titleInputFocused, setTitleInputFocused] = useState(false);
  const [activeTitleSuggestionIndex, setActiveTitleSuggestionIndex] = useState(-1);
  const [dismissedTitleSuggestionDraft, setDismissedTitleSuggestionDraft] = useState("");

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const titleSuggestions = useMemo(
    () => getTaskTitleSuggestions(titleSuggestionTasks, titleDraft, selectedProjectId),
    [selectedProjectId, titleDraft, titleSuggestionTasks],
  );
  const titleSuggestionDismissed =
    normalizeTaskTitle(dismissedTitleSuggestionDraft) === normalizeTaskTitle(titleDraft);
  const showTitleSuggestions =
    titleInputFocused && titleSuggestions.length > 0 && !titleSuggestionDismissed;
  const activeTitleSuggestion =
    activeTitleSuggestionIndex >= 0 ? titleSuggestions[activeTitleSuggestionIndex] : undefined;
  const activeTitleSuggestionOptionId = activeTitleSuggestion
    ? `${titleSuggestionsListId}-option-${activeTitleSuggestionIndex}`
    : undefined;

  const canSubmit = Boolean(titleDraft.trim() && selectedProjectId && !disabled && !isCreatingTask);

  function selectTitleSuggestion(task: TaskTitleSuggestionTask) {
    setDismissedTitleSuggestionDraft(task.title);
    setActiveTitleSuggestionIndex(-1);
    onTitleChange(task.title);
    titleInputRef.current?.focus();
  }

  useEffect(() => {
    if (!expanded) return;

    if (skipProjectStep) {
      titleInputRef.current?.focus();
      setTitleInputFocused(true);
    } else {
      projectPickerTriggerRef.current?.focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCollapse();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded, onCollapse, skipProjectStep]);

  useEffect(() => {
    if (expanded) return;
    setTitleInputFocused(false);
    setActiveTitleSuggestionIndex(-1);
    setDismissedTitleSuggestionDraft("");
  }, [expanded]);

  useEffect(() => {
    setActiveTitleSuggestionIndex(-1);
  }, [selectedProjectId, titleDraft, titleSuggestions.length]);

  if (!expanded) {
    return (
      <div className="shrink-0 border-y border-default">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-muted",
            "transition-colors hover:bg-default/70 hover:text-highlighted",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
          )}
          onClick={onExpand}
          disabled={disabled}
          aria-controls={zoneId}
          aria-expanded={false}
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          New task
        </button>
      </div>
    );
  }

  return (
    <div
      id={zoneId}
      role="region"
      aria-label="New task"
      className="shrink-0 border-y border-default bg-default/55 px-3 py-3"
    >
      <div className="rounded-2xl border border-default bg-elevated p-2.5">
        <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
          {skipProjectStep && selectedProject ? (
            <span className="inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-full bg-default px-2.5 text-[11px] font-semibold text-muted">
              <ProjectHueDot projectId={selectedProject.id} />
              <span className="truncate">{selectedProject.name}</span>
            </span>
          ) : (
            <Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  ref={projectPickerTriggerRef}
                  type="button"
                  className={cn(
                    "inline-flex h-7 min-w-0 max-w-[13rem] items-center gap-1.5 rounded-full bg-default px-2.5 text-[11px] font-semibold",
                    "transition-colors hover:bg-muted",
                    agencyFocusRingClass,
                    selectedProjectId ? "text-highlighted" : "text-muted",
                    "motion-reduce:transition-none",
                  )}
                  aria-label="Choose project"
                >
                  {selectedProject ? (
                    <>
                      <ProjectHueDot projectId={selectedProject.id} />
                      <span className="truncate">{selectedProject.name}</span>
                    </>
                  ) : (
                    <span className="truncate">Choose project</span>
                  )}
                  <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="max-h-56 w-72 overflow-y-auto p-1">
                <ul role="listbox" aria-label="Projects">
                  {projects.map((project) => (
                    <li key={project.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={project.id === selectedProjectId}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold",
                          "transition-colors hover:bg-elevated",
                          agencyFocusRingClass,
                          project.id === selectedProjectId
                            ? "bg-primary/10 text-highlighted"
                            : "text-muted",
                          "motion-reduce:transition-none",
                        )}
                        onClick={() => {
                          setDismissedTitleSuggestionDraft("");
                          onProjectChange(project.id);
                          setProjectPickerOpen(false);
                        }}
                      >
                        <ProjectHueDot projectId={project.id} />
                        <span className="min-w-0 flex-1 truncate">
                          {project.clientName} · {project.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          )}

          <span className="shrink-0 text-[11px] font-semibold text-muted">New task</span>
        </div>

        <div className="space-y-1.5">
          <Input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => {
              setDismissedTitleSuggestionDraft("");
              onTitleChange(e.target.value);
            }}
            onFocus={() => setTitleInputFocused(true)}
            onBlur={() => {
              setTitleInputFocused(false);
              setActiveTitleSuggestionIndex(-1);
            }}
            placeholder="What needs doing?"
            aria-label="Task name"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showTitleSuggestions}
            aria-controls={showTitleSuggestions ? titleSuggestionsListId : undefined}
            aria-activedescendant={activeTitleSuggestionOptionId}
            autoComplete="off"
            className={cn(
              "h-10 rounded-xl border-default bg-default px-3 text-sm font-semibold text-highlighted",
              "placeholder:text-muted focus-visible:border-ring",
            )}
            onKeyDown={(event) => {
              if (showTitleSuggestions && event.key === "ArrowDown") {
                event.preventDefault();
                setActiveTitleSuggestionIndex((current) =>
                  current < titleSuggestions.length - 1 ? current + 1 : 0,
                );
                return;
              }

              if (showTitleSuggestions && event.key === "ArrowUp") {
                event.preventDefault();
                setActiveTitleSuggestionIndex((current) =>
                  current > 0 ? current - 1 : titleSuggestions.length - 1,
                );
                return;
              }

              if (showTitleSuggestions && event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setDismissedTitleSuggestionDraft(titleDraft);
                setActiveTitleSuggestionIndex(-1);
                return;
              }

              if (event.key === "Enter") {
                if (showTitleSuggestions && activeTitleSuggestion) {
                  event.preventDefault();
                  selectTitleSuggestion(activeTitleSuggestion);
                  return;
                }

                if (canSubmit) {
                  event.preventDefault();
                  onSubmit();
                }
              }
            }}
          />

          {showTitleSuggestions ? (
            <div
              id={titleSuggestionsListId}
              role="listbox"
              aria-label="Matching task names"
              className="max-h-40 overflow-y-auto rounded-xl border border-default bg-default p-1"
            >
              {titleSuggestions.map((task, index) => (
                <button
                  id={`${titleSuggestionsListId}-option-${index}`}
                  key={task.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeTitleSuggestionIndex}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold",
                    "transition-colors motion-reduce:transition-none",
                    index === activeTitleSuggestionIndex
                      ? "bg-primary/10 text-highlighted"
                      : "text-muted hover:bg-elevated hover:text-highlighted",
                  )}
                  onMouseEnter={() => setActiveTitleSuggestionIndex(index)}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    selectTitleSuggestion(task);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold capitalize text-muted">
                    {task.status.replace("_", " ")}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1 sm:max-w-[11rem]">
            <span className="sr-only">Assignee</span>
            <UserRound
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <select
              value={selectedAssigneeId}
              onChange={(e) => onAssigneeChange(e.target.value)}
              className={cn(
                "h-8 w-full appearance-none rounded-full border border-default bg-default py-0 pl-7 pr-7 text-[11px] font-semibold text-muted",
                "transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20",
                "motion-reduce:transition-none",
              )}
            >
              <option value={UNASSIGNED_ASSIGNEE_VALUE}>Unassigned</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.userName}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-muted opacity-70"
              aria-hidden
            />
          </label>

          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-2.5 text-xs text-muted hover:text-highlighted"
              onClick={onCollapse}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-full px-3 text-xs"
              disabled={!canSubmit}
              onClick={onSubmit}
            >
              {isCreatingTask ? "Adding…" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
