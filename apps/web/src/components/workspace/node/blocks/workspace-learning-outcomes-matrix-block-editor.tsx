import {
  buildLearningOutcomesMatrixPrompt,
  type WorkspaceCourseRoadmapBlock,
  type WorkspaceLearningOutcomesMatrixBlock,
} from "@brainiac/workspace";
import { BookOpen, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { BlockSelect } from "@/components/workspace/node/blocks/shared/block-select";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils/format-date-time";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { renderSimpleMarkdown } from "@/lib/utils/render-simple-markdown";

type CourseOption = {
  value: string;
  label: string;
  blockId: string;
  courseId: string;
  course: WorkspaceCourseRoadmapBlock["courses"][number];
};

export function WorkspaceLearningOutcomesMatrixBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceLearningOutcomesMatrixBlock>) {
  const { currentNode, mutateBlock, runBlockAgentPrompt } = useWorkspaceNodeEditorContext();
  const [isRunning, setIsRunning] = useState(false);

  const availableCourses = useMemo(() => {
    const courses: CourseOption[] = [];

    if (!currentNode) {
      return courses;
    }

    for (const tab of currentNode.tabs) {
      for (const tabBlock of tab.blocks) {
        if (tabBlock.type !== "course-roadmap") {
          continue;
        }

        for (const course of tabBlock.courses) {
          courses.push({
            value: `${tabBlock.id}:${course.id}`,
            label: `${course.name} · ${tab.title}`,
            blockId: tabBlock.id,
            courseId: course.id,
            course,
          });
        }
      }
    }

    return courses;
  }, [currentNode]);

  const selectedCourseOption = useMemo(() => {
    return (
      availableCourses.find(
        (entry) => entry.blockId === block.courseBlockId && entry.courseId === block.courseId,
      ) ??
      availableCourses[0] ??
      null
    );
  }, [availableCourses, block.courseBlockId, block.courseId]);

  const renderedLatestOutput = useMemo(
    () => renderSimpleMarkdown(block.latestOutput || "No analysis saved yet."),
    [block.latestOutput],
  );

  useEffect(() => {
    if (availableCourses.length === 0) {
      return;
    }

    const selected = availableCourses.find(
      (entry) => entry.blockId === block.courseBlockId && entry.courseId === block.courseId,
    );

    if (selected) {
      return;
    }

    const firstCourse = availableCourses[0]!;

    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "learning-outcomes-matrix") {
        return;
      }

      entry.courseBlockId = firstCourse.blockId;
      entry.courseId = firstCourse.courseId;

      if (!entry.prompt.trim()) {
        entry.prompt = `Design a learning outcomes matrix for my ${firstCourse.course.name} course.`;
      }
    });
  }, [availableCourses, block.courseBlockId, block.courseId, block.id, mutateBlock, tabId]);

  function updateSelectedCourse(value: string) {
    const selected = availableCourses.find((entry) => entry.value === value);

    if (!selected) {
      return;
    }

    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "learning-outcomes-matrix") {
        return;
      }

      entry.courseBlockId = selected.blockId;
      entry.courseId = selected.courseId;
    });
  }

  function applySuggestedPrompt() {
    const selected = selectedCourseOption;

    if (!selected) {
      return;
    }

    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "learning-outcomes-matrix") {
        return;
      }

      entry.prompt = `Design a learning outcomes matrix for my ${selected.course.name} course. Map modules to skills, knowledge, behaviors, and assessment ideas.`;
    });
  }

  async function runAnalysis() {
    const selected = selectedCourseOption;

    if (!selected) {
      toast.warning("No course available", {
        description: "Add or keep a Course Roadmap block in this node before running analysis.",
      });
      return;
    }

    setIsRunning(true);

    try {
      const response = await runBlockAgentPrompt(
        tabId,
        block.id,
        buildLearningOutcomesMatrixPrompt(selected.course, block.prompt),
      );

      mutateBlock(tabId, block.id, (entry, _tab, _node, timestamp) => {
        if (entry.type !== "learning-outcomes-matrix") {
          return;
        }

        entry.courseBlockId = selected.blockId;
        entry.courseId = selected.courseId;
        entry.latestOutput = response;
        entry.outputHistory.unshift({
          id: `output-${timestamp}`,
          prompt: entry.prompt,
          output: response,
          createdAt: timestamp,
        });
        entry.outputHistory = entry.outputHistory.slice(0, 8);
      });

      toast.success("Outcomes matrix saved", {
        description: "The education analysis was added to this block.",
      });
    } catch (error) {
      toast.error("Analysis failed", {
        description: getErrorMessage(
          error,
          "The Education agent could not generate the outcomes matrix.",
        ),
      });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black tracking-tight text-foreground">Education Agent</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Generate outcomes matrix from course roadmap context.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              disabled={!selectedCourseOption}
              onClick={applySuggestedPrompt}
            >
              <RefreshCcw />
              Suggested
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              disabled={!selectedCourseOption || !block.prompt.trim() || isRunning}
              onClick={runAnalysis}
            >
              {isRunning ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Run AI
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]">
          <div className="space-y-1.5">
            <Label
              htmlFor="course-select"
              className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
            >
              Selected Course
            </Label>
            <BlockSelect
              value={selectedCourseOption?.value ?? ""}
              options={availableCourses}
              className="rounded-xl"
              aria-label="Selected course"
              onValueChange={updateSelectedCourse}
            />
            <p className="text-[10px] leading-relaxed text-muted-foreground/50">
              Lessons and outcomes passed automatically.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="analysis-prompt"
              className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
            >
              Analysis Prompt
            </Label>
            <Textarea
              id="analysis-prompt"
              value={block.prompt}
              rows={3}
              className="rounded-xl bg-background/60 leading-relaxed"
              placeholder="Design a learning outcomes matrix..."
              onChange={(event) =>
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== "learning-outcomes-matrix") {
                    return;
                  }
                  entry.prompt = event.target.value.slice(0, 4000);
                })
              }
            />
          </div>
        </div>

        {availableCourses.length === 0 ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-warning">
            <BookOpen className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">No course context found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add a Course Roadmap block to this node to enable AI analysis.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-muted/20 bg-background/40 p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black tracking-tight text-foreground">Analysis Output</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Structured matrix mapping modules to capabilities and behaviors.
            </p>
          </div>

          {block.outputHistory[0]?.createdAt ? (
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Updated {formatDateTime(block.outputHistory[0].createdAt)}
            </p>
          ) : null}
        </div>

        <div
          className="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-muted/20 bg-muted/5 p-4 text-sm leading-relaxed text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: renderedLatestOutput }}
        />
      </section>

      {block.outputHistory.length > 1 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black tracking-tight text-foreground">Previous Iterations</h3>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/40">
              {block.outputHistory.length - 1} saved
            </span>
          </div>

          <div className="grid gap-3">
            {block.outputHistory.map((entry, index) => {
              if (index === 0) {
                return null;
              }

              return (
                <article
                  key={entry.id}
                  className="rounded-xl border border-muted/20 bg-background/40 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {entry.prompt}
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>

                  <div
                    className="prose prose-sm dark:prose-invert mt-3 max-w-none text-xs leading-relaxed text-muted-foreground opacity-80"
                    dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(entry.output) }}
                  />
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
