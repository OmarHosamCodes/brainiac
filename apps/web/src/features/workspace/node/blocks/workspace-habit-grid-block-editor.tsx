import {
  WORKSPACE_HABIT_GRID_DAYS,
  createWorkspaceHabitGridDays,
  createWorkspaceHabitGridHabit,
  getHabitGridSummary,
  type WorkspaceHabitGridBlock,
} from "@brainiac/workspace";
import { Check, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
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
    <div className="space-y-6">
      <div className="space-y-4 rounded-3xl border border-muted/20 bg-muted/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Habit Tracking
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Review weekly consistency, update each habit quickly, and keep daily progress easy to
              scan.
            </p>
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
              Reset Week
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full px-4"
              aria-label="Add tracked habit"
              onClick={addHabit}
            >
              <Plus />
              Add Habit
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-3xl border border-muted/20 bg-muted/5 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Habits
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {summary.totalHabits}
            </p>
          </div>
          <div className="rounded-3xl border border-muted/20 bg-muted/5 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Weekly Checks
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {summary.completedChecks}/{summary.possibleChecks}
            </p>
          </div>
          <div className="rounded-3xl border border-primary/10 bg-primary/5 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">
              Overall
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight text-primary sm:text-3xl">
              {summary.overallPercent}%
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
              {trackedDayCount} tracked days
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-2xl">
            {summary.totalHabits} habits
          </Badge>
          <Badge variant="secondary" className="rounded-2xl">
            {summary.completedChecks} checks completed
          </Badge>
          <Badge className="rounded-2xl">{summary.overallPercent}% overall</Badge>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-muted/20 bg-background/40 p-1">
        <table className="min-w-full border-separate border-spacing-y-2">
          <caption className="sr-only">
            Habit grid with {block.habits.length} habits and {trackedDayCount} day toggles per habit
          </caption>
          <thead>
            <tr>
              <th className="min-w-[200px] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                Habit
              </th>
              {WORKSPACE_HABIT_GRID_DAYS.map((day) => (
                <th
                  key={day}
                  className="w-14 px-1 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50"
                >
                  {dayLabels[day].slice(0, 3)}
                </th>
              ))}
              <th className="w-20 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                %
              </th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          {block.habits.length > 0 ? (
            <tbody>
              {block.habits.map((habit) => (
                <tr key={habit.id} className="group">
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
                          "mx-auto flex min-h-9 min-w-9 items-center justify-center rounded-xl border px-2 text-[10px] font-bold transition-all hover:scale-105 active:scale-95",
                          habit.days[day]
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-muted/20 bg-muted/5 text-muted-foreground/50 hover:border-muted/40",
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
                    <span className="text-sm font-black text-foreground">
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
          <div className="mx-3 mb-3 rounded-2xl border border-dashed border-muted/20 bg-muted/5 py-12 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              No habits tracked yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add the first habit to start logging daily consistency.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4 rounded-full px-4"
              onClick={addHabit}
            >
              <Plus />
              Add First Habit
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
