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
  <div class="space-y-5">
    <!-- Analysis Config Section -->
    <section class="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 class="text-sm font-black text-highlighted tracking-tight">Education Agent</h2>
          <p class="text-xs text-muted mt-0.5">
            Generate outcomes matrix from course roadmap context.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-refresh-ccw"
            size="sm"
            class="rounded-full"
            :disabled="!selectedCourseOption"
            @click="applySuggestedPrompt"
          >
            Suggested
          </UButton>
          <UButton
            color="primary"
            variant="soft"
            icon="i-lucide-sparkles"
            size="sm"
            class="rounded-full"
            :disabled="!selectedCourseOption || !block.prompt.trim()"
            :loading="isRunning"
            @click="runAnalysis"
          >
            Run AI
          </UButton>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]">
        <div class="space-y-1.5">
          <label :for="'course-select'" class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            Selected Course
          </label>
          <USelect
            id="course-select"
            :model-value="selectedCourseOption?.value ?? ''"
            :items="availableCourses"
            variant="subtle"
            size="sm"
            class="rounded-xl"
            :disabled="availableCourses.length === 0"
            @update:model-value="updateSelectedCourse($event)"
          />
          <p class="text-[10px] text-muted/50 leading-relaxed">Lessons and outcomes passed automatically.</p>
        </div>

        <div class="space-y-1.5">
          <label :for="'analysis-prompt'" class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            Analysis Prompt
          </label>
          <UTextarea
            id="analysis-prompt"
            :model-value="block.prompt"
            autoresize
            variant="subtle"
            :rows="3"
            class="rounded-xl"
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
        class="mt-4 rounded-xl"
        color="warning"
        variant="subtle"
        icon="i-lucide-book-open"
        title="No course context found"
        description="Add a Course Roadmap block to this node to enable AI analysis."
      />
    </section>

    <!-- Latest Output -->
    <section class="rounded-2xl border border-muted/20 bg-default/40 p-4">
      <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 class="text-sm font-black text-highlighted tracking-tight">Analysis Output</h2>
          <p class="text-xs text-muted mt-0.5">
            Structured matrix mapping modules to capabilities and behaviors.
          </p>
        </div>

        <p v-if="block.outputHistory[0]?.createdAt" class="text-[10px] font-bold uppercase tracking-widest text-muted/60">
          Updated {{ formatDateTime(block.outputHistory[0].createdAt) }}
        </p>
      </div>

      <div
        class="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-muted/20 bg-elevated/5 p-4 text-sm leading-relaxed text-toned"
        v-html="renderedLatestOutput"
      />
    </section>

    <!-- History -->
    <div v-if="block.outputHistory.length > 1" class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <h3 class="text-sm font-black text-highlighted tracking-tight">Previous Iterations</h3>
        <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-muted/40">
          {{ block.outputHistory.length - 1 }} saved
        </span>
      </div>

      <div class="grid gap-3">
        <template v-for="(entry, index) in block.outputHistory" :key="entry.id">
          <article
            v-if="index > 0"
            class="rounded-xl border border-muted/20 bg-default/40 p-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs font-bold text-highlighted uppercase tracking-wider">
                {{ entry.prompt }}
              </p>
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-muted/60">
                {{ formatDateTime(entry.createdAt) }}
              </span>
            </div>

            <div
              class="prose prose-sm dark:prose-invert mt-3 max-w-none text-xs leading-relaxed text-toned opacity-80"
              v-html="renderSimpleMarkdown(entry.output)"
            />
          </article>
        </template>
      </div>
    </div>
  </div>
</template>
