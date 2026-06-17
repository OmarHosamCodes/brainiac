import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/hooks/use-theme";
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

export const UNASSIGNED_ASSIGNEE_VALUE = "__unassigned__";

type AgencyTaskCreateInlineProps = {
  expanded: boolean;
  projects: Project[];
  members: TeamMember[];
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
  const zoneId = useId();
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  const canSubmit = Boolean(titleDraft.trim() && selectedProjectId && !disabled && !isCreatingTask);

  useEffect(() => {
    if (!expanded) return;

    titleInputRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCollapse();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded, onCollapse]);

  if (!expanded) {
    return (
      <div className="shrink-0 border-y border-default">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-muted",
            "transition-colors hover:bg-default/60 hover:text-highlighted",
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
      className="shrink-0 space-y-2 border-y border-default px-3 py-3"
    >
      <Input
        ref={titleInputRef}
        value={titleDraft}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="What needs doing?"
        aria-label="Task name"
        className="h-9"
        onKeyDown={(event) => {
          if (event.key === "Enter" && canSubmit) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        {skipProjectStep && selectedProject ? (
          <span className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-default bg-default px-2.5 text-[11px] font-semibold text-muted">
            <ProjectHueDot projectId={selectedProject.id} />
            <span className="truncate">{selectedProject.name}</span>
          </span>
        ) : (
          <Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex h-8 max-w-[10rem] items-center gap-1.5 rounded-full border border-default bg-default px-2.5 text-[11px] font-semibold",
                  "transition-colors hover:bg-elevated",
                  agencyFocusRingClass,
                  selectedProjectId ? "text-highlighted" : "text-muted",
                )}
                aria-label="Choose project"
              >
                {selectedProject ? (
                  <>
                    <ProjectHueDot projectId={selectedProject.id} />
                    <span className="truncate">{selectedProject.name}</span>
                  </>
                ) : (
                  <span className="truncate">Project</span>
                )}
                <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-56 w-64 overflow-y-auto p-1">
              <ul role="listbox" aria-label="Projects">
                {projects.map((project) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={project.id === selectedProjectId}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold",
                        "transition-colors hover:bg-elevated",
                        agencyFocusRingClass,
                        project.id === selectedProjectId ? "text-highlighted" : "text-muted",
                      )}
                      onClick={() => {
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

        <select
          value={selectedAssigneeId}
          onChange={(e) => onAssigneeChange(e.target.value)}
          className="h-8 min-w-0 max-w-[9rem] flex-1 rounded-full border border-default bg-default px-2.5 text-[11px] font-semibold text-muted"
          aria-label="Assignee"
        >
          <option value={UNASSIGNED_ASSIGNEE_VALUE}>Unassigned</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.userName}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted"
            onClick={onCollapse}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            {isCreatingTask ? "Adding…" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
