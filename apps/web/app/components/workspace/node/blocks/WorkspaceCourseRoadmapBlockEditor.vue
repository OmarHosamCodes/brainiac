<script setup lang="ts">
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

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceCourseRoadmapBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getCourseRoadmapSummary(props.block));

const statusOptions: WorkspaceCourseStatus[] = ["planning", "in-progress"];

function mutateCourse(
  courseId: string,
  mutator: (course: WorkspaceCourseRoadmapBlock["courses"][number]) => void,
) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "course-roadmap") {
      return;
    }

    const course = block.courses.find((entry) => entry.id === courseId);

    if (!course) {
      return;
    }

    mutator(course);
  });
}

function addCourse() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "course-roadmap") {
      return;
    }

    block.courses.push(
      createWorkspaceCourseRoadmapCourse({
        name: "New course",
        outcomes: [createWorkspaceCourseRoadmapOutcome({ text: "Learning outcome" })],
      }),
    );
  });
}

function removeCourse(courseId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "course-roadmap") {
      return;
    }

    block.courses = block.courses.filter((course) => course.id !== courseId);
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

function addOutcome(courseId: string) {
  mutateCourse(courseId, (course) => {
    course.outcomes.push(createWorkspaceCourseRoadmapOutcome({ text: "New learning outcome" }));
  });
}

function removeOutcome(courseId: string, outcomeId: string) {
  mutateCourse(courseId, (course) => {
    course.outcomes = course.outcomes.filter((outcome) => outcome.id !== outcomeId);
  });
}

function getCourseClasses(status: WorkspaceCourseStatus) {
  return status === "in-progress"
    ? "border-primary/25 bg-primary/5"
    : "border-muted/40 bg-elevated/20";
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Courses</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-primary">{{ summary.courseCount }}</p>
      </div>

      <div class="rounded-[28px] bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">Recorded</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-success">
          {{ summary.recordedLessons }}/{{ summary.lessonCount }}
        </p>
      </div>

      <div class="rounded-[28px] bg-warning/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-warning/70">Average</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-warning">
          {{ summary.averageCompletionPercent }}%
        </p>
      </div>

      <div class="rounded-[28px] bg-secondary/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary/80">Active</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-secondary">
          {{ summary.inProgressCount }}
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-start justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Course roadmap</p>
        <p class="text-sm text-muted">
          Track lesson recording progress per course and keep the promised outcomes visible.
        </p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        class="rounded-full px-4"
        @click="addCourse"
      >
        Add Course
      </UButton>
    </div>

    <div
      v-if="block.courses.length === 0"
      class="rounded-[32px] border border-dashed border-muted/40 bg-elevated/10 py-14 text-center"
    >
      <p class="text-sm font-semibold text-muted">No courses mapped yet.</p>
    </div>

    <div v-else class="space-y-5">
      <article
        v-for="course in block.courses"
        :key="course.id"
        class="rounded-[34px] border p-5"
        :class="getCourseClasses(course.status)"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 flex-1 space-y-3">
            <div class="flex flex-wrap items-center gap-3">
              <UInput
                :model-value="course.name"
                variant="none"
                placeholder="Course name"
                class="min-w-[14rem] flex-1"
                :ui="{ base: 'px-0 text-lg font-bold text-highlighted placeholder:text-muted/60' }"
                @update:model-value="
                  mutateCourse(course.id, (entry) => {
                    entry.name = ($event ?? '').slice(0, 120);
                  })
                "
              />

              <div class="flex flex-wrap gap-2">
                <UButton
                  v-for="status in statusOptions"
                  :key="`${course.id}-${status}`"
                  size="sm"
                  :color="course.status === status ? 'primary' : 'neutral'"
                  :variant="course.status === status ? 'soft' : 'outline'"
                  class="rounded-full px-4"
                  @click="
                    mutateCourse(course.id, (entry) => {
                      entry.status = status;
                    })
                  "
                >
                  {{ workspaceCourseStatusLabels[status] }}
                </UButton>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              <span>{{ getCourseRoadmapCourseProgress(course).recordedLessons }}/{{ getCourseRoadmapCourseProgress(course).lessonCount }} recorded</span>
              <span>{{ getCourseRoadmapCourseProgress(course).completionPercent }}% complete</span>
            </div>

            <UProgress
              :model-value="getCourseRoadmapCourseProgress(course).recordedLessons"
              :max="Math.max(getCourseRoadmapCourseProgress(course).lessonCount, 1)"
              color="primary"
              class="rounded-full"
            />
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            class="rounded-xl hover:bg-error/10 hover:text-error"
            @click="removeCourse(course.id)"
          />
        </div>

        <div class="mt-5 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Lesson Flow</p>
            <UButton
              color="neutral"
              variant="soft"
              size="xs"
              icon="i-lucide-plus"
              class="rounded-full"
              @click="addLesson(course.id)"
            >
              Add Lesson
            </UButton>
          </div>

          <div class="flex gap-2 overflow-x-auto pb-1">
            <button
              v-for="(lesson, lessonIndex) in course.lessons"
              :key="lesson.id"
              type="button"
              class="flex min-w-[9rem] items-center gap-2 rounded-2xl border px-3 py-2 text-left transition"
              :class="
                lesson.recorded
                  ? 'border-success/35 bg-success/10 text-success'
                  : 'border-muted/35 bg-default/70 text-muted hover:border-primary/20 hover:text-highlighted'
              "
              @click="toggleLesson(course.id, lesson.id)"
            >
              <span
                class="flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold"
                :class="lesson.recorded ? 'border-success/40 bg-success/15' : 'border-muted/40 bg-elevated/40'"
              >
                <UIcon v-if="lesson.recorded" name="i-lucide-check" class="size-3.5" />
                <span v-else>{{ lessonIndex + 1 }}</span>
              </span>
              <span class="truncate text-sm font-semibold">
                {{ lesson.title.trim() || `Lesson ${lessonIndex + 1}` }}
              </span>
            </button>
          </div>

          <div class="grid gap-3 xl:grid-cols-2">
            <div
              v-for="(lesson, lessonIndex) in course.lessons"
              :key="`${course.id}-${lesson.id}-editor`"
              class="flex items-center gap-3 rounded-2xl border border-muted/25 bg-default/65 px-3 py-3"
            >
              <UButton
                :color="lesson.recorded ? 'success' : 'neutral'"
                :variant="lesson.recorded ? 'soft' : 'outline'"
                size="xs"
                class="rounded-full"
                @click="toggleLesson(course.id, lesson.id)"
              >
                {{ lesson.recorded ? "Recorded" : "Pending" }}
              </UButton>

              <UInput
                :model-value="lesson.title"
                placeholder="Lesson title"
                class="flex-1 rounded-2xl"
                @update:model-value="
                  mutateCourse(course.id, (entry) => {
                    const target = entry.lessons.find((candidate) => candidate.id === lesson.id);
                    if (!target) return;
                    target.title = ($event ?? '').slice(0, 120);
                  })
                "
              />

              <span class="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                {{ lessonIndex + 1 }}
              </span>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="xs"
                class="rounded-lg hover:bg-error/10 hover:text-error"
                @click="removeLesson(course.id, lesson.id)"
              />
            </div>
          </div>
        </div>

        <div class="mt-6 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Learning Outcomes</p>
            <UButton
              color="neutral"
              variant="soft"
              size="xs"
              icon="i-lucide-plus"
              class="rounded-full"
              @click="addOutcome(course.id)"
            >
              Add Outcome
            </UButton>
          </div>

          <div class="space-y-3">
            <div
              v-for="outcome in course.outcomes"
              :key="outcome.id"
              class="flex items-start gap-3 rounded-2xl border border-muted/25 bg-default/65 px-3 py-3"
            >
              <div class="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                <UIcon name="i-lucide-check" class="size-4" />
              </div>

              <UInput
                :model-value="outcome.text"
                placeholder="Expected learning outcome"
                class="flex-1 rounded-2xl"
                @update:model-value="
                  mutateCourse(course.id, (entry) => {
                    const target = entry.outcomes.find((candidate) => candidate.id === outcome.id);
                    if (!target) return;
                    target.text = ($event ?? '').slice(0, 200);
                  })
                "
              />

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="xs"
                class="rounded-lg hover:bg-error/10 hover:text-error"
                @click="removeOutcome(course.id, outcome.id)"
              />
            </div>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
