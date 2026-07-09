import {
  createWorkspaceCourseRoadmapCourse,
  createWorkspaceCourseRoadmapLesson,
  createWorkspaceCourseRoadmapOutcome,
  getCourseRoadmapCourseProgress,
  getCourseRoadmapSummary,
  workspaceCourseStatusLabels,
  type WorkspaceCourseRoadmapBlock,
  type WorkspaceCourseStatus,
} from "@brainiac/workspace";
import { Check, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

const statusOptions: WorkspaceCourseStatus[] = ["planning", "in-progress"];

function getCourseClasses(status: WorkspaceCourseStatus) {
  return status === "in-progress"
    ? "border-primary/20 bg-primary/5"
    : "border-muted/20 bg-muted/10";
}

export function WorkspaceCourseRoadmapBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceCourseRoadmapBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getCourseRoadmapSummary(block), [block]);
  const totalOutcomeCount = useMemo(
    () => block.courses.reduce((count, course) => count + course.outcomes.length, 0),
    [block.courses],
  );

  function mutateCourse(
    courseId: string,
    mutator: (course: WorkspaceCourseRoadmapBlock["courses"][number]) => void,
  ) {
    mutateTypedBlock(tabId, block.id, "course-roadmap", (entry) => {
      const course = entry.courses.find((candidate) => candidate.id === courseId);
      if (!course) {
        return;
      }
      mutator(course);
    });
  }

  function addCourse() {
    mutateTypedBlock(tabId, block.id, "course-roadmap", (entry) => {
      entry.courses.push(
        createWorkspaceCourseRoadmapCourse({
          name: "New course",
          outcomes: [
            createWorkspaceCourseRoadmapOutcome({
              text: "Learning outcome",
            }),
          ],
        }),
      );
    });
  }

  function removeCourse(courseId: string) {
    mutateTypedBlock(tabId, block.id, "course-roadmap", (entry) => {
      entry.courses = entry.courses.filter((course) => course.id !== courseId);
    });
  }

  function addLesson(courseId: string) {
    mutateCourse(courseId, (course) => {
      course.lessons.push(
        createWorkspaceCourseRoadmapLesson({
          title: `Lesson ${course.lessons.length + 1}`,
        }),
      );
    });
  }

  function removeLesson(courseId: string, lessonId: string) {
    mutateCourse(courseId, (course) => {
      course.lessons = course.lessons.filter((lesson) => lesson.id !== lessonId);
    });
  }

  function toggleLesson(courseId: string, lessonId: string) {
    mutateCourse(courseId, (course) => {
      const lesson = course.lessons.find((entry) => entry.id === lessonId);
      if (!lesson) {
        return;
      }
      lesson.recorded = !lesson.recorded;
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Courses
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {summary.courseCount}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Total curriculum units</p>
        </div>

        <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Recorded
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {summary.recordedLessons}/{summary.lessonCount}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Production progress</p>
        </div>

        <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Average
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {summary.averageCompletionPercent}%
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Overall completion rate</p>
        </div>

        <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Active
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {summary.inProgressCount}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Courses currently in progress</p>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-muted/20 bg-muted/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Course roadmap</p>
            <p className="text-sm text-muted-foreground">
              Track lesson recording progress per course and keep the promised outcomes visible.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="rounded-full px-4"
            aria-label="Add course roadmap course"
            onClick={addCourse}
          >
            <Plus />
            Add Course
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-2xl">
            {summary.courseCount} courses
          </Badge>
          <Badge variant="secondary" className="rounded-2xl">
            {summary.lessonCount} lessons
          </Badge>
          <Badge variant="secondary" className="rounded-2xl">
            {totalOutcomeCount} outcomes
          </Badge>
          <Badge className="rounded-2xl">
            {summary.averageCompletionPercent}% average completion
          </Badge>
        </div>
      </div>

      {block.courses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-muted/20 bg-muted/5 py-12 text-center">
          <p className="text-sm font-semibold text-muted-foreground">No courses mapped yet.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {block.courses.map((course) => {
            const progress = getCourseRoadmapCourseProgress(course);

            return (
              <article
                key={course.id}
                className={cn("rounded-3xl border p-5", getCourseClasses(course.status))}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        value={course.name}
                        placeholder="Course name"
                        className="min-w-56 flex-1 border-0 bg-transparent px-0 text-lg font-bold shadow-none focus-visible:ring-0"
                        onChange={(event) =>
                          mutateCourse(course.id, (entry) => {
                            entry.name = event.target.value.slice(0, 120);
                          })
                        }
                      />

                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map((status) => (
                          <Button
                            key={`${course.id}-${status}`}
                            type="button"
                            size="sm"
                            variant={course.status === status ? "secondary" : "outline"}
                            className="rounded-full px-4"
                            aria-label={`Set ${course.name || "course"} status to ${workspaceCourseStatusLabels[status]}`}
                            onClick={() =>
                              mutateCourse(course.id, (entry) => {
                                entry.status = status;
                              })
                            }
                          >
                            {workspaceCourseStatusLabels[status]}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-2xl">
                        {progress.recordedLessons}/{progress.lessonCount} recorded
                      </Badge>
                      <Badge variant="secondary" className="rounded-2xl">
                        {progress.completionPercent}% complete
                      </Badge>
                      <Badge variant="secondary" className="rounded-2xl">
                        {course.outcomes.length} outcomes
                      </Badge>
                    </div>

                    <BlockProgressBar
                      value={progress.recordedLessons}
                      max={Math.max(progress.lessonCount, 1)}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-2xl hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${course.name || "course"}`}
                    onClick={() => removeCourse(course.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                      Lesson Flow
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                      onClick={() => addLesson(course.id)}
                    >
                      <Plus />
                      Add Lesson
                    </Button>
                  </div>

                  <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
                    {course.lessons.map((lesson, lessonIndex) => (
                      <button
                        key={lesson.id}
                        type="button"
                        className={cn(
                          "flex min-w-40 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition",
                          lesson.recorded
                            ? "border-success/20 bg-success/10 text-success"
                            : "border-muted/20 bg-background/40 text-muted-foreground/60 hover:border-primary/30 hover:text-foreground",
                        )}
                        onClick={() => toggleLesson(course.id, lesson.id)}
                      >
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                            lesson.recorded
                              ? "border-success/20 bg-success/10"
                              : "border-muted/20 bg-muted/10",
                          )}
                        >
                          {lesson.recorded ? <Check className="size-3.5" /> : lessonIndex + 1}
                        </span>
                        <span className="truncate text-sm font-semibold">
                          {lesson.title.trim() || `Lesson ${lessonIndex + 1}`}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-3 xl:grid-cols-2">
                    {course.lessons.map((lesson, lessonIndex) => (
                      <div
                        key={`${course.id}-${lesson.id}-editor`}
                        className="flex items-center gap-3 rounded-2xl border border-muted/20 bg-background/40 px-3 py-3"
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant={lesson.recorded ? "secondary" : "outline"}
                          className={cn(
                            "rounded-full",
                            lesson.recorded &&
                              "border-success/40 bg-success/10 text-success hover:bg-success/15",
                          )}
                          onClick={() => toggleLesson(course.id, lesson.id)}
                        >
                          {lesson.recorded ? "Recorded" : "Pending"}
                        </Button>

                        <Input
                          value={lesson.title}
                          placeholder="Lesson title"
                          className="flex-1 rounded-2xl"
                          onChange={(event) =>
                            mutateCourse(course.id, (entry) => {
                              const target = entry.lessons.find(
                                (candidate) => candidate.id === lesson.id,
                              );
                              if (!target) {
                                return;
                              }
                              target.title = event.target.value.slice(0, 120);
                            })
                          }
                        />

                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                          {lessonIndex + 1}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${lesson.title || `Lesson ${lessonIndex + 1}`}`}
                          onClick={() => removeLesson(course.id, lesson.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                      Learning Outcomes
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                      onClick={() =>
                        mutateCourse(course.id, (entry) => {
                          entry.outcomes.push(
                            createWorkspaceCourseRoadmapOutcome({
                              text: "New learning outcome",
                            }),
                          );
                        })
                      }
                    >
                      <Plus />
                      Add Outcome
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {course.outcomes.map((outcome) => (
                      <div
                        key={outcome.id}
                        className="flex items-start gap-3 rounded-2xl border border-muted/20 bg-background/40 px-3 py-3"
                      >
                        <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                          <Check className="size-4" />
                        </div>

                        <Input
                          value={outcome.text}
                          placeholder="Expected learning outcome"
                          className="flex-1 rounded-2xl"
                          onChange={(event) =>
                            mutateCourse(course.id, (entry) => {
                              const target = entry.outcomes.find(
                                (candidate) => candidate.id === outcome.id,
                              );
                              if (!target) {
                                return;
                              }
                              target.text = event.target.value.slice(0, 200);
                            })
                          }
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${outcome.text || "learning outcome"}`}
                          onClick={() =>
                            mutateCourse(course.id, (entry) => {
                              entry.outcomes = entry.outcomes.filter(
                                (candidate) => candidate.id !== outcome.id,
                              );
                            })
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
