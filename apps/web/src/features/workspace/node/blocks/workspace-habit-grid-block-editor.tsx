import {
  WORKSPACE_HABIT_GRID_DAYS,
  createWorkspaceHabitGridDays,
  createWorkspaceHabitGridHabit,
  getHabitGridSummary,
  type WorkspaceHabitGridBlock,
} from "@orch/workspace";
import { Check, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

const dayLabels: Record<(typeof WORKSPACE_HABIT_GRID_DAYS)[number], string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export function WorkspaceHabitGridBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceHabitGridBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();
  const summary = useMemo(() => getHabitGridSummary(block), [block]);
  const trackedDayCount = WORKSPACE_HABIT_GRID_DAYS.length;

  function mutateHabit(
    habitId: string,
    mutator: (habit: WorkspaceHabitGridBlock["habits"][number]) => void,
  ) {
    mutateTypedBlock(tabId, block.id, "habit-grid", (entry) => {
      const target = entry.habits.find((candidate) => candidate.id === habitId);
      if (target) {
        mutator(target);
      }
    });
  }

  function addHabit() {
    mutateTypedBlock(tabId, block.id, "habit-grid", (entry) => {
      entry.habits.push(createWorkspaceHabitGridHabit({ name: "" }));
    });
  }

  function resetWeek() {
    if (!window.confirm("Reset all habit checks for this week?")) {
      return;
    }
    mutateTypedBlock(tabId, block.id, "habit-grid", (entry) => {
      entry.habits = entry.habits.map((habit) => ({
        ...habit,
        days: createWorkspaceHabitGridDays(),
      }));
    });
  }

  function removeHabit(habitId: string) {
    mutateTypedBlock(tabId, block.id, "habit-grid", (entry) => {
      entry.habits = entry.habits.filter((candidate) => candidate.id !== habitId);
    });
  }

  function getHabitPercent(days: WorkspaceHabitGridBlock["habits"][number]["days"]) {
    const checked = WORKSPACE_HABIT_GRID_DAYS.filter((day) => days[day]).length;
    return Math.round((checked / trackedDayCount) * 100);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-48 flex-1 space-y-2">
          <p className="text-sm text-toned">
            {summary.totalHabits} habits · {summary.completedChecks}/{summary.possibleChecks} checks
            · {summary.overallPercent}%
          </p>
          <BlockProgressBar
            value={summary.completedChecks}
            max={Math.max(summary.possibleChecks, 1)}
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full px-4"
            disabled={block.habits.length === 0}
            aria-label="Reset all habit checks for the week"
            onClick={resetWeek}
          >
            <RotateCcw />
            Reset week
          </Button>
          {block.habits.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full px-4"
              aria-label="Add tracked habit"
              onClick={addHabit}
            >
              <Plus />
              Add habit
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-muted p-1">
        <table className="min-w-full border-separate border-spacing-y-2">
          <caption className="sr-only">
            Habit grid with {block.habits.length} habits and {trackedDayCount} day toggles per habit
          </caption>
          <thead>
            <tr>
              <th className="min-w-[200px] px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                Habit
              </th>
              {WORKSPACE_HABIT_GRID_DAYS.map((day) => (
                <th
                  key={day}
                  className="w-14 px-1 py-3 text-center text-xs font-semibold text-muted-foreground"
                >
                  {dayLabels[day].slice(0, 3)}
                </th>
              ))}
              <th className="w-20 px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
                %
              </th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          {block.habits.length > 0 ? (
            <tbody>
              {block.habits.map((habit) => (
                <tr key={habit.id}>
                  <td className="px-3">
                    <Input
                      value={habit.name}
                      className="rounded-xl"
                      placeholder="Name..."
                      aria-label={`Habit name for ${habit.name || "new habit"}`}
                      onChange={(event) =>
                        mutateHabit(habit.id, (entry) => {
                          entry.name = event.target.value.slice(0, 120);
                        })
                      }
                    />
                  </td>
                  {WORKSPACE_HABIT_GRID_DAYS.map((day) => (
                    <td key={`${habit.id}-${day}`} className="px-1 text-center">
                      <button
                        type="button"
                        className={cn(
                          "mx-auto flex min-h-9 min-w-9 items-center justify-center rounded-xl border px-2 text-xs font-semibold",
                          habit.days[day]
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-muted bg-background text-muted",
                        )}
                        aria-pressed={habit.days[day]}
                        aria-label={`${habit.days[day] ? "Uncheck" : "Check"} ${dayLabels[day]} for ${habit.name || "this habit"}`}
                        onClick={() =>
                          mutateHabit(habit.id, (entry) => {
                            entry.days[day] = !entry.days[day];
                          })
                        }
                      >
                        <span className="sr-only">{dayLabels[day]}</span>
                        {habit.days[day] ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Minus className="size-3.5" />
                        )}
                      </button>
                    </td>
                  ))}
                  <td className="px-4 text-center">
                    <span className="text-sm font-semibold text-foreground">
                      {getHabitPercent(habit.days)}%
                    </span>
                  </td>
                  <td className="px-3 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg hover:text-destructive/80"
                      aria-label={`Remove ${habit.name || "habit"}`}
                      onClick={() => removeHabit(habit.id)}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          ) : null}
        </table>

        {block.habits.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">No habits yet.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3 rounded-full px-4"
              aria-label="Add tracked habit"
              onClick={addHabit}
            >
              <Plus />
              Add habit
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
