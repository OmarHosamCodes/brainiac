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
    <!-- Analysis Config Section -->
    <section
      class="rounded-3xl border border-primary/20 bg-primary/5 p-6"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 class="text-sm font-bold text-highlighted uppercase tracking-wider">Education Agent</h3>
          <p class="text-xs text-muted mt-1">
            Pick a course, tune the analysis request, and generate a full outcomes matrix from the
            current roadmap context.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-lucide-refresh-ccw"
            class="rounded-full px-4"
            size="sm"
            :disabled="!selectedCourseOption"
            @click="applySuggestedPrompt"
          >
            Suggested
          </UButton>
          <UButton
            color="primary"
            variant="subtle"
            icon="i-lucide-sparkles"
            class="rounded-full px-4"
            size="sm"
            :disabled="!selectedCourseOption || !block.prompt.trim()"
            :loading="isRunning"
            @click="runAnalysis"
          >
            Run AI
          </UButton>
        </div>
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)]">
        <div class="space-y-2">
          <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 px-1">Selected Course</label>
          <USelect
            :model-value="selectedCourseOption?.value ?? ''"
            :items="availableCourses"
            variant="subtle"
            class="rounded-xl"
            :disabled="availableCourses.length === 0"
            @update:model-value="updateSelectedCourse($event)"
          />
          <p class="text-[10px] text-muted/40 leading-relaxed px-1">Lessons and outcome context are passed automatically.</p>
        </div>

        <div class="space-y-2">
          <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 px-1">Analysis Prompt</label>
          <UTextarea
            :model-value="block.prompt"
            autoresize
            variant="subtle"
            :rows="4"
            class="rounded-2xl"
            :ui="{ base: 'bg-default/60 leading-relaxed' }"
            placeholder="Design a learning outcomes matrix..."
            @update:model-value="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'learning-outcomes-matrix') return;
                entry.prompt = ($event ?? '').slice(0, 4000);
              })
            "
          />
        </div>
      </div>

      <UAlert
        v-if="availableCourses.length === 0"
        class="mt-6 rounded-2xl"
        color="warning"
        variant="subtle"
        icon="i-lucide-book-open"
        title="No course context found"
        description="Add a Course Roadmap block to this node to enable AI analysis."
      />
    </section>

    <!-- Latest Output -->
    <section class="rounded-3xl border border-muted/20 bg-default/40 p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold text-highlighted uppercase tracking-wider">Analysis output</h3>
          <p class="text-xs text-muted mt-1">
            The Education agent returns a structured matrix mapping modules to capabilities and behaviors.
          </p>
        </div>

        <p v-if="block.outputHistory[0]?.createdAt" class="text-[10px] font-bold uppercase tracking-widest text-muted/60">
          Last updated {{ formatDateTime(block.outputHistory[0].createdAt) }}
        </p>
      </div>

      <div
        class="prose prose-sm dark:prose-invert mt-6 max-w-none rounded-2xl border border-muted/20 bg-elevated/5 p-5 text-sm leading-relaxed text-toned shadow-sm"
        v-html="renderedLatestOutput"
      />
    </section>

    <!-- History -->
    <div v-if="block.outputHistory.length > 1" class="space-y-4">
      <div class="flex items-center justify-between px-1">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Previous Iterations</p>
        <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-muted/40">
          {{ block.outputHistory.length - 1 }} saved
        </span>
      </div>

      <div class="grid gap-4">
        <template v-for="(entry, index) in block.outputHistory" :key="entry.id">
          <article
            v-if="index > 0"
            class="rounded-2xl border border-muted/20 bg-default/40 p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-xs font-bold text-highlighted uppercase tracking-wider">
                {{ entry.prompt }}
              </p>
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-muted/60">
                {{ formatDateTime(entry.createdAt) }}
              </span>
            </div>

            <div
              class="prose prose-sm dark:prose-invert mt-4 max-w-none text-xs leading-relaxed text-toned opacity-80"
              v-html="renderSimpleMarkdown(entry.output)"
            />
          </article>
        </template>
      </div>
    </div>
  </div>
</template>
