<script setup lang="ts">
import {
  createWorkspaceStrategicAssumption,
  getAssumptionTrackerSummary,
  resolveStrategicAssumptionLinkLabel,
  workspaceBusinessModelCanvasCellLabels,
  workspaceStrategicAssumptionStatusLabels,
  type WorkspaceAssumptionTrackerBlock,
  type WorkspaceBusinessModelCanvasCellKey,
  type WorkspaceStrategicAssumption,
  type WorkspaceStrategicAssumptionFilter,
  type WorkspaceStrategicAssumptionLinkType,
  type WorkspaceStrategicAssumptionStatus,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceAssumptionTrackerBlock;
  tabId: string;
}>();

const { currentNode, mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getAssumptionTrackerSummary(props.block));

const filterOptions: Array<{
  label: string;
  value: WorkspaceStrategicAssumptionFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Validating", value: "validating" },
  { label: "Confirmed", value: "confirmed" },
  { label: "At Risk", value: "at-risk" },
  { label: "False", value: "false" },
];

const statusOptions: WorkspaceStrategicAssumptionStatus[] = [
  "validating",
  "confirmed",
  "at-risk",
  "false",
];

const baseLinkOptions = computed(() => {
  const options: Array<{ label: string; value: string }> = [{ label: "Unlinked", value: "none" }];

  if (!currentNode.value) {
    return options;
  }

  for (const tab of currentNode.value.tabs) {
    for (const block of tab.blocks) {
      if (block.type === "okr-tracker") {
        for (const objective of block.objectives) {
          options.push({
            label: `OKR: ${objective.title.trim() || "Untitled objective"}`,
            value: `okr:${objective.id}`,
          });
        }
      }

      if (block.type === "decision-matrix") {
        options.push({
          label: `Decision: ${block.question.trim() || block.title.trim() || "Untitled decision"}`,
          value: `decision:${block.id}`,
        });
      }
    }
  }

  for (const key of Object.keys(
    workspaceBusinessModelCanvasCellLabels,
  ) as WorkspaceBusinessModelCanvasCellKey[]) {
    options.push({
      label: `BMC: ${workspaceBusinessModelCanvasCellLabels[key]}`,
      value: `bmc:${key}`,
    });
  }

  return options;
});

const visibleAssumptions = computed(() => {
  if (props.block.filter === "all") {
    return props.block.assumptions;
  }

  return props.block.assumptions.filter((assumption) => assumption.status === props.block.filter);
});

function getFilterCount(filter: WorkspaceStrategicAssumptionFilter) {
  if (filter === "all") {
    return props.block.assumptions.length;
  }

  return props.block.assumptions.filter((assumption) => assumption.status === filter).length;
}

function getStatusClasses(status: WorkspaceStrategicAssumptionStatus) {
  switch (status) {
    case "confirmed":
      return "border-success/40 bg-success/5 text-success";
    case "at-risk":
      return "border-error/40 bg-error/5 text-error";
    case "false":
      return "border-muted/40 bg-muted/10 text-muted";
    default:
      return "border-warning/40 bg-warning/5 text-warning";
  }
}

function clampConfidence(value: string) {
  const numeric = Number(value || 3);
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

function getInputValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.value ?? "3";
}

function getAssumptionLinkValue(assumption: WorkspaceStrategicAssumption) {
  if (assumption.linkType === "none" || !assumption.linkId) {
    return "none";
  }

  return `${assumption.linkType}:${assumption.linkId}`;
}

function getLinkOptions(assumption: WorkspaceStrategicAssumption) {
  const currentValue = getAssumptionLinkValue(assumption);

  if (baseLinkOptions.value.some((option) => option.value === currentValue)) {
    return baseLinkOptions.value;
  }

  return [
    {
      label: currentValue === "none" ? "Unlinked" : "Missing link",
      value: currentValue,
    },
    ...baseLinkOptions.value,
  ];
}

function parseLinkValue(value: string): {
  linkType: WorkspaceStrategicAssumptionLinkType;
  linkId: string | null;
} {
  if (!value || value === "none") {
    return {
      linkType: "none",
      linkId: null,
    };
  }

  const [rawLinkType, rawLinkId] = value.split(":");

  if ((rawLinkType === "okr" || rawLinkType === "decision" || rawLinkType === "bmc") && rawLinkId) {
    return {
      linkType: rawLinkType,
      linkId: rawLinkId,
    };
  }

  return {
    linkType: "none",
    linkId: null,
  };
}

function addAssumption() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "assumption-tracker") {
      return;
    }

    block.assumptions.unshift(createWorkspaceStrategicAssumption());
  });
}

function removeAssumption(assumptionId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "assumption-tracker") {
      return;
    }

    block.assumptions = block.assumptions.filter((assumption) => assumption.id !== assumptionId);
  });
}
</script>

<template>
  <div class="space-y-5">
    <!-- Summary Stats -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-2xl bg-primary/10 border border-primary/20 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Tracked</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-primary">
          {{ summary.total }}
        </p>
      </div>

      <div class="rounded-2xl bg-error/10 border border-error/20 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-error/70">At Risk</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-error">
          {{ summary.atRiskCount }}
        </p>
      </div>

      <div class="rounded-2xl bg-warning/10 border border-warning/20 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/70">
          Avg Confidence
        </p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-warning">
          {{ summary.averageConfidence }}/5
        </p>
      </div>
    </div>

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <h2 class="text-sm font-black text-highlighted tracking-tight">Strategic Assumptions</h2>
        <p class="text-xs text-muted">Track bets behind the strategy and surface risks.</p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        class="rounded-full"
        @click="addAssumption"
      >
        New Assumption
      </UButton>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="filter in filterOptions"
        :key="filter.value"
        :color="block.filter === filter.value ? 'primary' : 'neutral'"
        :variant="block.filter === filter.value ? 'soft' : 'ghost'"
        size="sm"
        class="rounded-full px-3"
        @click="
          mutateBlock(tabId, block.id, (entry) => {
            if (entry.type !== 'assumption-tracker') return;
            entry.filter = filter.value;
          })
        "
      >
        {{ filter.label }} · {{ getFilterCount(filter.value) }}
      </UButton>
    </div>

    <!-- Empty State -->
    <div
      v-if="visibleAssumptions.length === 0"
      class="border-dashed border border-muted/20 rounded-2xl py-10 text-center bg-elevated/5"
    >
      <div
        class="flex size-12 items-center justify-center rounded-xl bg-muted/10 text-muted/30 mx-auto"
      >
        <UIcon name="i-lucide-activity" size="24" />
      </div>
      <p class="mt-3 text-xs font-bold text-muted">No assumptions in this filter</p>
    </div>

    <!-- Assumption Cards -->
    <div v-else class="space-y-3">
      <article
        v-for="assumption in visibleAssumptions"
        :key="assumption.id"
        class="rounded-2xl border p-4 transition-colors"
        :class="getStatusClasses(assumption.status)"
      >
        <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div class="min-w-0 flex-1">
            <UInput
              :model-value="assumption.statement"
              variant="none"
              placeholder="Assumption statement"
              class="w-full"
              :ui="{ base: 'px-0 text-base font-black text-highlighted placeholder:text-muted/40' }"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'assumption-tracker') return;
                  const target = entry.assumptions.find(
                    (candidate) => candidate.id === assumption.id,
                  );
                  if (!target) return;
                  target.statement = ($event ?? '').slice(0, 240);
                })
              "
            />

            <p class="mt-1.5 text-xs text-muted/80">
              {{
                currentNode
                  ? resolveStrategicAssumptionLinkLabel(currentNode, assumption) ||
                    "No linked strategic area."
                  : "No linked strategic area."
              }}
            </p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <UBadge
              :color="
                assumption.status === 'confirmed'
                  ? 'success'
                  : assumption.status === 'at-risk'
                    ? 'error'
                    : assumption.status === 'false'
                      ? 'neutral'
                      : 'warning'
              "
              variant="soft"
              size="md"
              class="rounded-lg px-3"
            >
              {{ workspaceStrategicAssumptionStatusLabels[assumption.status] }}
            </UBadge>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              size="sm"
              class="rounded-lg hover:text-error hover:bg-error/10"
              aria-label="Remove assumption"
              @click="removeAssumption(assumption.id)"
            />
          </div>
        </div>

        <!-- Quick Fields -->
        <div class="grid gap-3 sm:grid-cols-3 mb-4">
          <div>
            <label
              :for="'link-' + assumption.id"
              class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5"
            >
              Link
            </label>
            <USelect
              :id="'link-' + assumption.id"
              :model-value="getAssumptionLinkValue(assumption)"
              :items="getLinkOptions(assumption)"
              size="sm"
              class="rounded-xl"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'assumption-tracker') return;
                  const target = entry.assumptions.find(
                    (candidate) => candidate.id === assumption.id,
                  );
                  if (!target) return;
                  const nextLink = parseLinkValue($event ?? 'none');
                  target.linkType = nextLink.linkType;
                  target.linkId = nextLink.linkId;
                })
              "
            />
          </div>

          <div>
            <label
              :for="'owner-' + assumption.id"
              class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5"
            >
              Owner
            </label>
            <UInput
              :id="'owner-' + assumption.id"
              :model-value="assumption.owner"
              placeholder="Owner"
              size="sm"
              class="rounded-xl"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'assumption-tracker') return;
                  const target = entry.assumptions.find(
                    (candidate) => candidate.id === assumption.id,
                  );
                  if (!target) return;
                  target.owner = ($event ?? '').slice(0, 120);
                })
              "
            />
          </div>

          <div>
            <label
              :for="'review-' + assumption.id"
              class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5"
            >
              Review Date
            </label>
            <UInput
              :id="'review-' + assumption.id"
              :model-value="assumption.reviewDate ?? ''"
              type="date"
              size="sm"
              class="rounded-xl"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'assumption-tracker') return;
                  const target = entry.assumptions.find(
                    (candidate) => candidate.id === assumption.id,
                  );
                  if (!target) return;
                  target.reviewDate = $event || null;
                })
              "
            />
          </div>
        </div>

        <!-- Confidence, Status, Evidence -->
        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <div class="space-y-3 rounded-xl border border-muted/20 bg-default/40 p-3">
            <div class="space-y-1.5">
              <div
                class="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
              >
                <label :for="'confidence-' + assumption.id">Confidence</label>
                <span>{{ assumption.confidence }}/5</span>
              </div>
              <input
                :id="'confidence-' + assumption.id"
                :value="assumption.confidence"
                type="range"
                min="1"
                max="5"
                class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted/20 accent-primary"
                @input="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'assumption-tracker') return;
                    const target = entry.assumptions.find(
                      (candidate) => candidate.id === assumption.id,
                    );
                    if (!target) return;
                    target.confidence = clampConfidence(getInputValue($event));
                  })
                "
              />
            </div>

            <div class="space-y-1.5">
              <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Status</p>
              <div class="flex flex-wrap gap-1.5">
                <UButton
                  v-for="status in statusOptions"
                  :key="status"
                  size="xs"
                  :color="assumption.status === status ? 'primary' : 'neutral'"
                  :variant="assumption.status === status ? 'soft' : 'ghost'"
                  class="rounded-full px-3"
                  @click="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'assumption-tracker') return;
                      const target = entry.assumptions.find(
                        (candidate) => candidate.id === assumption.id,
                      );
                      if (!target) return;
                      target.status = status;
                    })
                  "
                >
                  {{ workspaceStrategicAssumptionStatusLabels[status] }}
                </UButton>
              </div>
            </div>
          </div>

          <div>
            <label
              :for="'evidence-' + assumption.id"
              class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5"
            >
              Evidence Notes
            </label>
            <UTextarea
              :id="'evidence-' + assumption.id"
              :model-value="assumption.evidenceNotes"
              :rows="3"
              autoresize
              placeholder="What customer input, market signal, or operational evidence supports this?"
              class="w-full"
              :ui="{ base: 'rounded-xl bg-default/40' }"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'assumption-tracker') return;
                  const target = entry.assumptions.find(
                    (candidate) => candidate.id === assumption.id,
                  );
                  if (!target) return;
                  target.evidenceNotes = ($event ?? '').slice(0, 4000);
                })
              "
            />
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
