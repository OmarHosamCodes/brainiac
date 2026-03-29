<script setup lang="ts">
import {
  createWorkspace2x2MatrixItem,
  get2x2MatrixSummary,
  type Workspace2x2MatrixBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: Workspace2x2MatrixBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => get2x2MatrixSummary(props.block));

const quadrants = [
  {
    key: "topLeft",
    tone: "border-emerald-300/40 bg-emerald-500/5",
  },
  {
    key: "topRight",
    tone: "border-sky-300/40 bg-sky-500/5",
  },
  {
    key: "bottomLeft",
    tone: "border-amber-300/40 bg-amber-500/5",
  },
  {
    key: "bottomRight",
    tone: "border-rose-300/40 bg-rose-500/5",
  },
] as const;
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 lg:grid-cols-[1fr_auto]">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-3xl bg-elevated/10 border border-muted/20 p-5">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Items</p>
          <p class="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
            {{ summary.itemCount }}
          </p>
        </div>
        <div class="rounded-3xl bg-elevated/10 border border-muted/20 p-5">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Axis X</p>
          <p class="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
            {{ block.xAxisLabel }}
          </p>
        </div>
        <div class="rounded-3xl bg-primary/10 border border-primary/20 p-5">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Axis Y</p>
          <p class="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-primary">
            {{ block.yAxisLabel }}
          </p>
        </div>
      </div>

      <div
        class="grid gap-3 rounded-3xl border border-muted/20 bg-default/40 p-4 sm:grid-cols-2 lg:w-[360px]"
      >
        <UInput
          :model-value="block.xAxisLabel"
          placeholder="Horizontal axis"
          size="sm"
          class="rounded-2xl"
          @update:model-value="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== '2x2-matrix') {
                return;
              }

              entry.xAxisLabel = ($event ?? '').slice(0, 80);
            })
          "
        />
        <UInput
          :model-value="block.yAxisLabel"
          placeholder="Vertical axis"
          size="sm"
          class="rounded-2xl"
          @update:model-value="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== '2x2-matrix') {
                return;
              }

              entry.yAxisLabel = ($event ?? '').slice(0, 80);
            })
          "
        />
        <UInput
          :model-value="block.xStartLabel"
          placeholder="X low"
          size="sm"
          class="rounded-2xl"
          @update:model-value="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== '2x2-matrix') {
                return;
              }

              entry.xStartLabel = ($event ?? '').slice(0, 60);
            })
          "
        />
        <UInput
          :model-value="block.xEndLabel"
          placeholder="X high"
          size="sm"
          class="rounded-2xl"
          @update:model-value="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== '2x2-matrix') {
                return;
              }

              entry.xEndLabel = ($event ?? '').slice(0, 60);
            })
          "
        />
        <UInput
          :model-value="block.yStartLabel"
          placeholder="Y low"
          size="sm"
          class="rounded-2xl"
          @update:model-value="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== '2x2-matrix') {
                return;
              }

              entry.yStartLabel = ($event ?? '').slice(0, 60);
            })
          "
        />
        <UInput
          :model-value="block.yEndLabel"
          placeholder="Y high"
          size="sm"
          class="rounded-2xl"
          @update:model-value="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== '2x2-matrix') {
                return;
              }

              entry.yEndLabel = ($event ?? '').slice(0, 60);
            })
          "
        />
      </div>
    </div>

    <div class="rounded-3xl border border-muted/20 bg-default/40 p-4">
      <div
        class="mb-3 flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
      >
        <span>{{ block.yEndLabel }}</span>
        <span>{{ block.yAxisLabel }}</span>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <article
          v-for="quadrant in quadrants"
          :key="quadrant.key"
          class="rounded-2xl border p-4 transition-colors"
          :class="quadrant.tone"
        >
          <div class="mb-3 flex items-center justify-between gap-3">
            <UInput
              :model-value="block.quadrants[quadrant.key].name"
              variant="soft"
              class="flex-1 rounded-2xl"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== '2x2-matrix') {
                    return;
                  }

                  entry.quadrants[quadrant.key].name = ($event ?? '').slice(0, 80);
                })
              "
            />
            <UButton
              color="primary"
              variant="soft"
              size="xs"
              icon="i-lucide-plus"
              class="rounded-full"
              @click="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== '2x2-matrix') {
                    return;
                  }

                  entry.quadrants[quadrant.key].items.push(
                    createWorkspace2x2MatrixItem({ text: '' }),
                  );
                })
              "
            >
              Add
            </UButton>
          </div>

          <div class="space-y-2">
            <div
              v-for="item in block.quadrants[quadrant.key].items"
              :key="item.id"
              class="group flex items-center gap-2 rounded-2xl border border-muted/20 bg-default/60 p-2"
            >
              <UInput
                :model-value="item.text"
                variant="none"
                placeholder="Matrix item"
                class="flex-1"
                :ui="{ base: 'px-0 text-sm text-highlighted' }"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== '2x2-matrix') {
                      return;
                    }

                    const target = entry.quadrants[quadrant.key].items.find(
                      (candidate) => candidate.id === item.id,
                    );

                    if (target) {
                      target.text = ($event ?? '').slice(0, 200);
                    }
                  })
                "
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-trash-2"
                class="rounded-lg opacity-0 group-hover:opacity-100 hover:text-error"
                @click="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== '2x2-matrix') {
                      return;
                    }

                    entry.quadrants[quadrant.key].items = entry.quadrants[
                      quadrant.key
                    ].items.filter((candidate) => candidate.id !== item.id);
                  })
                "
              />
            </div>

            <div
              v-if="block.quadrants[quadrant.key].items.length === 0"
              class="border-dashed border border-muted/20 rounded-2xl py-8 text-center bg-elevated/5"
            >
              <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40">
                Empty Quadrant
              </p>
            </div>
          </div>
        </article>
      </div>

      <div
        class="mt-3 flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
      >
        <span>{{ block.xStartLabel }}</span>
        <span>{{ block.xAxisLabel }}</span>
        <span>{{ block.xEndLabel }}</span>
      </div>
      <div class="mt-1 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40">
        {{ block.yStartLabel }}
      </div>
    </div>
  </div>
</template>
