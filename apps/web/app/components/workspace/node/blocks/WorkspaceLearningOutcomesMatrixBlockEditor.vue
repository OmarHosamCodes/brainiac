<script setup lang="ts">
import {
  buildLearningOutcomesMatrixPrompt,
  type WorkspaceCourseRoadmapBlock,
  type WorkspaceLearningOutcomesMatrixBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { formatDateTime } from "~/utils/format-date-time";
import { getErrorMessage } from "~/utils/get-error-message";
import { renderSimpleMarkdown } from "~/utils/render-simple-markdown";

const props = defineProps<{
  block: WorkspaceLearningOutcomesMatrixBlock;
  tabId: string;
}>();

const toast = useToast();
const { currentNode, mutateBlock, runBlockAgentPrompt } = useWorkspaceNodeEditorContext();

const isRunning = ref(false);

const availableCourses = computed(() => {
  const courses: Array<{
    value: string;
    label: string;
    blockId: string;
    courseId: string;
    course: WorkspaceCourseRoadmapBlock["courses"][number];
  }> = [];

  if (!currentNode.value) {
    return courses;
  }

  for (const tab of currentNode.value.tabs) {
    for (const block of tab.blocks) {
      if (block.type !== "course-roadmap") {
        continue;
      }

      for (const course of block.courses) {
        courses.push({
          value: `${block.id}:${course.id}`,
          label: `${course.name} · ${tab.title}`,
          blockId: block.id,
          courseId: course.id,
          course,
        });
      }
    }
  }

  return courses;
});

const selectedCourseOption = computed(() => {
  return (
    availableCourses.value.find(
      (entry) =>
        entry.blockId === props.block.courseBlockId && entry.courseId === props.block.courseId,
    ) ??
    availableCourses.value[0] ??
    null
  );
});

const renderedLatestOutput = computed(() =>
  renderSimpleMarkdown(props.block.latestOutput || "No analysis saved yet."),
);

watch(
  availableCourses,
  (courses) => {
    if (courses.length === 0) {
      return;
    }

    const selected = courses.find(
      (entry) =>
        entry.blockId === props.block.courseBlockId && entry.courseId === props.block.courseId,
    );

    if (selected) {
      return;
    }

    const firstCourse = courses[0]!;
    mutateBlock(props.tabId, props.block.id, (block) => {
      if (block.type !== "learning-outcomes-matrix") {
        return;
      }

      block.courseBlockId = firstCourse.blockId;
      block.courseId = firstCourse.courseId;

      if (!block.prompt.trim()) {
        block.prompt = `Design a learning outcomes matrix for my ${firstCourse.course.name} course.`;
      }
    });
  },
  { immediate: true },
);

function updateSelectedCourse(value: string) {
  const selected = availableCourses.value.find((entry) => entry.value === value);

  if (!selected) {
    return;
  }

  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "learning-outcomes-matrix") {
      return;
    }

    block.courseBlockId = selected.blockId;
    block.courseId = selected.courseId;
  });
}

function applySuggestedPrompt() {
  const selected = selectedCourseOption.value;

  if (!selected) {
    return;
  }

  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "learning-outcomes-matrix") {
      return;
    }

    block.prompt = `Design a learning outcomes matrix for my ${selected.course.name} course. Map modules to skills, knowledge, behaviors, and assessment ideas.`;
  });
}

async function runAnalysis() {
  const selected = selectedCourseOption.value;

  if (!selected) {
    toast.add({
      title: "No course available",
      description: "Add or keep a Course Roadmap block in this node before running analysis.",
      color: "warning",
      icon: "i-lucide-book-open",
    });
    return;
  }

  isRunning.value = true;

  try {
    const response = await runBlockAgentPrompt(
      props.tabId,
      props.block.id,
      buildLearningOutcomesMatrixPrompt(selected.course, props.block.prompt),
    );

    mutateBlock(props.tabId, props.block.id, (block, _tab, _node, timestamp) => {
      if (block.type !== "learning-outcomes-matrix") {
        return;
      }

      block.courseBlockId = selected.blockId;
      block.courseId = selected.courseId;
      block.latestOutput = response;
      block.outputHistory.unshift({
        id: `output-${timestamp}`,
        prompt: block.prompt,
        output: response,
        createdAt: timestamp,
      });
      block.outputHistory = block.outputHistory.slice(0, 8);
    });

    toast.add({
      title: "Outcomes matrix saved",
      description: "The education analysis was added to this block.",
      color: "success",
      icon: "i-lucide-sparkles",
    });
  } catch (error) {
    toast.add({
      title: "Analysis failed",
      description: getErrorMessage(
        error,
        "The Education agent could not generate the outcomes matrix.",
      ),
      color: "error",
      icon: "i-lucide-alert-circle",
    });
  } finally {
    isRunning.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <section
      class="rounded-[34px] border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-default p-6"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">
            Education Agent
          </p>
          <p class="mt-2 text-sm text-muted">
            Pick a course, tune the analysis request, and generate a full outcomes matrix from the
            current roadmap context.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-refresh-ccw"
            class="rounded-full px-4"
            :disabled="!selectedCourseOption"
            @click="applySuggestedPrompt"
          >
            Use Suggested Prompt
          </UButton>
          <UButton
            color="primary"
            variant="soft"
            icon="i-lucide-sparkles"
            class="rounded-full px-4"
            :disabled="!selectedCourseOption || !block.prompt.trim()"
            :loading="isRunning"
            @click="runAnalysis"
          >
            Run AI Analysis
          </UButton>
        </div>
      </div>

      <div class="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)]">
        <UFormField
          label="Course"
          description="The selected roadmap course is passed to the Education agent with lesson and outcome context."
        >
          <USelect
            :model-value="selectedCourseOption?.value ?? ''"
            :items="availableCourses"
            class="rounded-2xl"
            :disabled="availableCourses.length === 0"
            @update:model-value="updateSelectedCourse($event)"
          />
        </UFormField>

        <UFormField
          label="Prompt"
          description="This is the visible request. The full course structure is appended automatically."
        >
          <UTextarea
            :model-value="block.prompt"
            autoresize
            :rows="4"
            class="rounded-[26px]"
            :ui="{ base: 'rounded-[26px] bg-default/85 leading-7' }"
            placeholder="Design a learning outcomes matrix for my Content Marketing Mastery course..."
            @update:model-value="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'learning-outcomes-matrix') return;
                entry.prompt = ($event ?? '').slice(0, 4000);
              })
            "
          />
        </UFormField>
      </div>

      <UAlert
        v-if="availableCourses.length === 0"
        class="mt-4"
        color="warning"
        variant="soft"
        icon="i-lucide-book-open"
        title="No course context found"
        description="Add a Course Roadmap block to this node to make a course selectable for AI analysis."
      />
    </section>

    <section class="rounded-[32px] border border-muted/30 bg-default/70 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-highlighted">Analysis output</p>
          <p class="text-sm text-muted">
            The Education agent returns a structured matrix that maps modules to capabilities and
            behaviors.
          </p>
        </div>

        <p v-if="block.outputHistory[0]?.createdAt" class="text-xs font-medium text-muted">
          Last run {{ formatDateTime(block.outputHistory[0].createdAt) }}
        </p>
      </div>

      <div
        class="prose prose-sm dark:prose-invert mt-4 max-w-none rounded-[24px] border border-muted/30 bg-elevated/20 p-5 text-sm leading-7 text-toned"
        v-html="renderedLatestOutput"
      />
    </section>

    <div v-if="block.outputHistory.length > 0" class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Previous Runs</p>
        <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
          {{ block.outputHistory.length }} saved
        </span>
      </div>

      <div class="grid gap-3">
        <article
          v-for="entry in block.outputHistory"
          :key="entry.id"
          class="rounded-[24px] border border-muted/25 bg-default/60 p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-xs font-semibold text-highlighted">
              {{ entry.prompt }}
            </p>
            <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
              {{ formatDateTime(entry.createdAt) }}
            </span>
          </div>

          <div
            class="prose prose-sm dark:prose-invert mt-3 max-w-none text-sm leading-7 text-toned"
            v-html="renderSimpleMarkdown(entry.output)"
          />
        </article>
      </div>
    </div>
  </div>
</template>
