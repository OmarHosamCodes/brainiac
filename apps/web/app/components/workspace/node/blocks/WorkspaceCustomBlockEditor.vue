<script setup lang="ts">
import type { WorkspaceCustomBlock, WorkspaceCustomBlockField } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { formatDateTime } from "~/utils/format-date-time";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  block: WorkspaceCustomBlock;
  tabId: string;
}>();

const {
  mutateTypedBlock,
  getCustomTemplate,
  getCustomFormulaResult,
  formatFormulaResult,
  getCustomPromptPreview,
  runCustomPrompt,
  getBlockOperationState,
} = useWorkspaceNodeEditorContext();

const runError = ref<string | null>(null);

const template = computed(() => getCustomTemplate(props.block.definitionId));
const operationState = computed(() => getBlockOperationState(props.tabId, props.block.id));
const formulaResult = computed(() => (template.value ? getCustomFormulaResult(props.block) : null));

const fieldTotal = computed(() => template.value?.fields.length ?? 0);

const completedFieldCount = computed(() => {
  if (!template.value) {
    return 0;
  }

  return template.value.fields.filter((field) => hasFieldValue(field)).length;
});

const incompleteFieldCount = computed(() =>
  Math.max(0, fieldTotal.value - completedFieldCount.value),
);

const completionPercent = computed(() => {
  if (fieldTotal.value === 0) {
    return 0;
  }

  return Math.round((completedFieldCount.value / fieldTotal.value) * 100);
});

const hasPromptTemplate = computed(() => Boolean(template.value?.aiPromptTemplate?.trim()));

const hasLatestOutput = computed(() => props.block.latestAiOutput.trim().length > 0);
const latestOutputEntry = computed(() => props.block.outputHistory[0] ?? null);

const blockStatus = computed(() => {
  if (!template.value) {
    return {
      label: "Template missing",
      tone: "error" as const,
      description: "This block no longer has a valid template definition.",
    };
  }

  if (operationState.value.pending) {
    return {
      label: operationState.value.label || "Running template",
      tone: "primary" as const,
      description: "Generating output with the current field values.",
    };
  }

  if (runError.value) {
    return {
      label: "Prompt run failed",
      tone: "error" as const,
      description: runError.value,
    };
  }

  if (fieldTotal.value === 0) {
    return {
      label: "Template incomplete",
      tone: "warning" as const,
      description: "No fields are configured in this custom template.",
    };
  }

  if (incompleteFieldCount.value > 0) {
    return {
      label: "Capture remaining inputs",
      tone: "warning" as const,
      description: `${incompleteFieldCount.value} field${incompleteFieldCount.value === 1 ? "" : "s"} still need values.`,
    };
  }

  if (hasPromptTemplate.value && !hasLatestOutput.value) {
    return {
      label: "Ready to generate",
      tone: "primary" as const,
      description: "Run the template prompt to produce your first output.",
    };
  }

  return {
    label: "Block ready",
    tone: "success" as const,
    description: "Inputs and outputs are in sync for this template.",
  };
});

const summaryCards = computed(() => [
  {
    key: "status",
    label: "Block state",
    value: blockStatus.value.label,
    supporting: blockStatus.value.description,
    accentClass:
      blockStatus.value.tone === "success"
        ? "text-success"
        : blockStatus.value.tone === "warning"
          ? "text-warning"
          : blockStatus.value.tone === "error"
            ? "text-error"
            : "text-primary",
  },
  {
    key: "fields",
    label: "Field coverage",
    value: `${completedFieldCount.value}/${fieldTotal.value}`,
    supporting: `${completionPercent.value}% completion`,
    accentClass: "text-highlighted",
  },
  {
    key: "formula",
    label: "Formula",
    value: template.value?.formula ? formatFormulaResult(formulaResult.value) : "No formula",
    supporting: template.value?.formula?.label || "Optional computed metric",
    accentClass: template.value?.formula ? "text-primary" : "text-muted",
  },
  {
    key: "ai",
    label: "AI outputs",
    value: hasPromptTemplate.value ? String(props.block.outputHistory.length) : "Disabled",
    supporting: latestOutputEntry.value
      ? `Last run ${formatDateTime(latestOutputEntry.value.createdAt)}`
      : hasPromptTemplate.value
        ? "No output generated yet"
        : "Template has no AI prompt",
    accentClass: hasPromptTemplate.value ? "text-highlighted" : "text-muted",
  },
]);

function mutateCustomBlock(mutator: (block: WorkspaceCustomBlock) => void) {
  mutateTypedBlock(props.tabId, props.block.id, "custom", mutator);
}

function hasFieldValue(field: WorkspaceCustomBlockField) {
  const value = props.block.values[field.key];

  if (field.type === "checkbox") {
    return typeof value === "boolean";
  }

  if (field.type === "number") {
    if (typeof value === "number") {
      return Number.isFinite(value);
    }

    if (typeof value === "string") {
      return value.trim().length > 0 && Number.isFinite(Number(value));
    }

    return false;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function getTextValue(field: WorkspaceCustomBlockField) {
  const value = props.block.values[field.key];
  return typeof value === "string" ? value : "";
}

function getNumericValue(field: WorkspaceCustomBlockField) {
  const value = props.block.values[field.key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function getCheckedValue(field: WorkspaceCustomBlockField) {
  return Boolean(props.block.values[field.key]);
}

function toNumberValue(value: string | number | undefined) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return numeric;
}

function updateFieldValue(
  field: WorkspaceCustomBlockField,
  value: string | number | boolean | undefined,
) {
  mutateCustomBlock((block) => {
    if (field.type === "checkbox") {
      block.values[field.key] = Boolean(value);
      return;
    }

    if (field.type === "number") {
      block.values[field.key] = toNumberValue(value as string | number | undefined);
      return;
    }

    block.values[field.key] = String(value ?? "");
  });

  runError.value = null;
}

function updateNotes(value: string | number | undefined) {
  mutateCustomBlock((block) => {
    block.notes = String(value ?? "");
  });
}

async function handleRunPrompt() {
  if (!template.value || !hasPromptTemplate.value || operationState.value.pending) {
    return;
  }

  runError.value = null;

  try {
    await Promise.resolve(runCustomPrompt(props.tabId, props.block.id));
  } catch (error) {
    runError.value = getErrorMessage(error, "Could not run this template prompt.");
  }
}
</script>

<template>
  <UAlert
    v-if="!template"
    color="warning"
    variant="soft"
    icon="i-lucide-alert-triangle"
    title="Template removed"
    description="This block template no longer exists. Delete this block or recreate the template definition."
  />

  <div v-else class="space-y-6">
    <section class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge color="warning" variant="soft" class="rounded-full">Legacy block</UBadge>
            <UBadge color="neutral" variant="soft" class="rounded-full">{{ template.name }}</UBadge>
            <UBadge :color="blockStatus.tone" variant="soft" class="rounded-full">{{
              blockStatus.label
            }}</UBadge>
          </div>
          <p class="mt-2 text-sm text-muted">{{ blockStatus.description }}</p>
        </div>

        <UBadge v-if="operationState.pending" color="primary" variant="soft" class="rounded-full">
          <span class="inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-loader-2" class="size-3.5 animate-spin" />
            {{ operationState.label || "Running" }}
          </span>
        </UBadge>
      </div>
    </section>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in summaryCards"
        :key="card.key"
        class="rounded-3xl border border-muted/20 bg-elevated/10 p-5"
      >
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          {{ card.label }}
        </p>
        <p class="mt-2 text-2xl font-black tracking-tight sm:text-3xl" :class="card.accentClass">
          {{ card.value }}
        </p>
        <p class="mt-1 text-sm text-muted">{{ card.supporting }}</p>
      </div>
    </div>

    <section class="space-y-4 rounded-3xl border border-muted/20 bg-elevated/10 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold text-highlighted">Template inputs</h3>
          <p class="mt-1 text-sm text-muted">
            Fill each field to keep formula outputs and AI responses grounded in real context.
          </p>
        </div>
        <UBadge color="neutral" variant="soft" class="rounded-full">
          {{ completedFieldCount }} / {{ fieldTotal }} complete
        </UBadge>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <article
          v-for="field in template.fields"
          :key="field.id"
          class="rounded-2xl border border-muted/20 bg-default/50 p-4"
        >
          <div class="mb-3 flex items-center justify-between gap-2">
            <p class="text-sm font-semibold text-highlighted">{{ field.label }}</p>
            <UBadge color="neutral" variant="soft" class="rounded-full capitalize">
              {{ field.type }}
            </UBadge>
          </div>

          <UTextarea
            v-if="field.type === 'textarea'"
            :model-value="getTextValue(field)"
            :rows="4"
            autoresize
            class="w-full"
            :ui="{ base: 'rounded-2xl' }"
            :aria-label="field.label"
            @update:model-value="
              updateFieldValue(field, $event as string | number | boolean | undefined)
            "
          />

          <label
            v-else-if="field.type === 'checkbox'"
            class="flex items-center justify-between gap-3 rounded-2xl border border-muted/20 bg-default/70 px-3 py-2"
          >
            <span class="text-sm text-toned">{{
              getCheckedValue(field) ? "Enabled" : "Disabled"
            }}</span>
            <UCheckbox
              :model-value="getCheckedValue(field)"
              :aria-label="field.label"
              @update:model-value="updateFieldValue(field, $event as boolean | string | undefined)"
            />
          </label>

          <UInput
            v-else
            :model-value="field.type === 'number' ? getNumericValue(field) : getTextValue(field)"
            :type="field.type === 'number' ? 'number' : 'text'"
            class="w-full"
            :ui="{ base: 'rounded-2xl' }"
            :aria-label="field.label"
            @update:model-value="
              updateFieldValue(field, $event as string | number | boolean | undefined)
            "
          />
        </article>
      </div>
    </section>

    <section v-if="template.formula" class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            {{ template.formula.label }}
          </p>
          <p class="mt-2 text-2xl font-black tracking-tight text-highlighted sm:text-3xl">
            {{ formatFormulaResult(formulaResult) }}
          </p>
        </div>

        <div class="rounded-2xl border border-muted/20 bg-default/50 px-3 py-2 text-xs text-muted">
          Expression: {{ template.formula.expression }}
        </div>
      </div>
    </section>

    <section
      v-if="template.includeNotes"
      class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-5"
    >
      <h3 class="text-sm font-semibold text-highlighted">Notes</h3>
      <UTextarea
        :model-value="block.notes"
        :rows="4"
        autoresize
        class="w-full"
        :ui="{ base: 'rounded-2xl' }"
        aria-label="Template notes"
        @update:model-value="updateNotes($event as string | number | undefined)"
      />
    </section>

    <section
      v-if="template.aiPromptTemplate"
      class="space-y-4 rounded-3xl border border-muted/20 bg-default/40 p-5"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-2">
          <p class="text-sm font-semibold text-highlighted">AI prompt template</p>
          <p class="text-sm text-muted">
            {{ getCustomPromptPreview(block) }}
          </p>
          <p class="text-xs text-muted">
            {{
              hasLatestOutput
                ? "Regenerate after important field changes."
                : "Generate an initial draft once key fields are filled."
            }}
          </p>
        </div>

        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-play"
          class="rounded-full px-4"
          :loading="operationState.pending"
          :disabled="operationState.pending"
          @click="handleRunPrompt"
        >
          {{ operationState.pending ? "Running" : "Run" }}
        </UButton>
      </div>

      <UAlert
        v-if="runError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        title="Could not run template"
        :description="runError"
      />

      <div class="rounded-2xl border border-muted/20 bg-elevated/10 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            Latest output
          </p>
          <span v-if="latestOutputEntry" class="text-xs text-muted">
            {{ formatDateTime(latestOutputEntry.createdAt) }}
          </span>
        </div>
        <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-toned">
          {{ block.latestAiOutput || "Run the template to capture output." }}
        </p>
      </div>

      <div v-if="block.outputHistory.length > 0" class="space-y-2">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Recent runs</p>
        <div class="grid gap-2">
          <article
            v-for="entry in block.outputHistory.slice(0, 3)"
            :key="entry.id"
            class="rounded-2xl border border-muted/20 bg-default/60 p-3"
          >
            <p class="text-[11px] text-muted">{{ formatDateTime(entry.createdAt) }}</p>
            <p class="mt-1 line-clamp-2 text-xs italic text-toned/80">"{{ entry.prompt }}"</p>
            <p class="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-toned">
              {{ entry.output }}
            </p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>
