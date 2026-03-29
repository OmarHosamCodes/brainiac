<script setup lang="ts">
import { getDecisionSummary, type WorkspaceDecisionBlock } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceDecisionBlock;
  tabId: string;
}>();

const { addDecisionItem, mutateDecisionItem, removeDecisionItem, mutateBlock } =
  useWorkspaceNodeEditorContext();

const summary = computed(() => getDecisionSummary(props.block));

function clampWeight(value: string) {
  const numeric = Number(value || 3);
  return Math.min(5, Math.max(1, Math.round(numeric)));
}
</script>

<template>
  <div class="space-y-8">
    <!-- Visual Balance Summary -->
    <div class="rounded-3xl bg-elevated/10 p-6 border border-muted/20">
      <div class="mb-6 flex items-center justify-between gap-4">
        <div class="text-center">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70">Pros Weight</p>
          <p class="text-2xl sm:text-3xl font-black tracking-tight text-success">{{ summary.prosWeight }}</p>
        </div>

        <div class="flex-1 px-8">
          <div class="relative h-2 rounded-full bg-muted/20 overflow-hidden">
            <div
              class="absolute inset-y-0 left-0 bg-success transition-all duration-500"
              :style="{
                width: `${(summary.prosWeight / Math.max(summary.prosWeight + summary.consWeight, 1)) * 100}%`,
              }"
            />
            <div
              class="absolute inset-y-0 right-0 bg-error transition-all duration-500"
              :style="{
                width: `${(summary.consWeight / Math.max(summary.prosWeight + summary.consWeight, 1)) * 100}%`,
              }"
            />
          </div>
          <div class="mt-4 text-center">
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1">Current Signal</p>
            <p class="text-lg font-black text-highlighted uppercase tracking-tight">
              {{ summary.signal }}
            </p>
          </div>
        </div>

        <div class="text-center">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-error/70">Cons Weight</p>
          <p class="text-2xl sm:text-3xl font-black tracking-tight text-error">{{ summary.consWeight }}</p>
        </div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Pros Column -->
      <div class="space-y-4">
        <div class="flex items-center justify-between px-2">
          <div class="flex items-center gap-2 text-success">
            <UIcon name="i-lucide-plus-circle" class="size-5" />
            <h3 class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/80">Pros</h3>
          </div>
          <UButton
            color="success"
            variant="soft"
            icon="i-lucide-plus"
            size="xs"
            class="rounded-full px-4"
            @click="addDecisionItem(tabId, block.id, 'pros')"
          >
            Add Point
          </UButton>
        </div>

        <div
          v-if="block.pros.length === 0"
          class="border-dashed border-muted/20 rounded-3xl py-12 text-center bg-elevated/5"
        >
          <p class="text-sm font-semibold text-muted">No pros added yet.</p>
        </div>

        <div class="space-y-2">
          <div
            v-for="item in block.pros"
            :key="item.id"
            class="group flex items-center gap-3 rounded-2xl border border-success/20 bg-default/40 p-2 transition-all hover:bg-default/60"
          >
            <UInput
              :model-value="item.text"
              variant="none"
              placeholder="Add a pro point..."
              class="flex-1"
              :ui="{ base: 'px-2 py-1 text-sm font-medium' }"
              @update:model-value="
                mutateDecisionItem(tabId, block.id, item.id, 'pros', (entry) => {
                  entry.text = ($event ?? '').slice(0, 240);
                })
              "
            />

            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1">
                <button
                  v-for="w in 5"
                  :key="w"
                  type="button"
                  class="size-2 rounded-full transition-colors"
                  :class="w <= item.weight ? 'bg-success' : 'bg-muted/30'"
                  @click="
                    mutateDecisionItem(tabId, block.id, item.id, 'pros', (entry) => {
                      entry.weight = w;
                    })
                  "
                />
              </div>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="xs"
                class="rounded-lg opacity-0 group-hover:opacity-100 hover:text-error"
                @click="removeDecisionItem(tabId, block.id, item.id, 'pros')"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Cons Column -->
      <div class="space-y-4">
        <div class="flex items-center justify-between px-2">
          <div class="flex items-center gap-2 text-error">
            <UIcon name="i-lucide-minus-circle" class="size-5" />
            <h3 class="text-[10px] font-bold uppercase tracking-[0.2em] text-error/80">Cons</h3>
          </div>
          <UButton
            color="error"
            variant="soft"
            icon="i-lucide-plus"
            size="xs"
            class="rounded-full px-4"
            @click="addDecisionItem(tabId, block.id, 'cons')"
          >
            Add Point
          </UButton>
        </div>

        <div
          v-if="block.cons.length === 0"
          class="border-dashed border-muted/20 rounded-3xl py-12 text-center bg-elevated/5"
        >
          <p class="text-sm font-semibold text-muted">No cons added yet.</p>
        </div>

        <div class="space-y-2">
          <div
            v-for="item in block.cons"
            :key="item.id"
            class="group flex items-center gap-3 rounded-2xl border border-error/20 bg-default/40 p-2 transition-all hover:bg-default/60"
          >
            <UInput
              :model-value="item.text"
              variant="none"
              placeholder="Add a con point..."
              class="flex-1"
              :ui="{ base: 'px-2 py-1 text-sm font-medium' }"
              @update:model-value="
                mutateDecisionItem(tabId, block.id, item.id, 'cons', (entry) => {
                  entry.text = ($event ?? '').slice(0, 240);
                })
              "
            />

            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1">
                <button
                  v-for="w in 5"
                  :key="w"
                  type="button"
                  class="size-2 rounded-full transition-colors"
                  :class="w <= item.weight ? 'bg-error' : 'bg-muted/30'"
                  @click="
                    mutateDecisionItem(tabId, block.id, item.id, 'cons', (entry) => {
                      entry.weight = w;
                    })
                  "
                />
              </div>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="xs"
                class="rounded-lg opacity-0 group-hover:opacity-100 hover:text-error"
                @click="removeDecisionItem(tabId, block.id, item.id, 'cons')"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Final Recommendation -->
    <div class="rounded-3xl border border-primary/20 bg-primary/5 p-6 space-y-4">
      <div class="flex items-center gap-2 text-primary">
        <UIcon name="i-lucide-check-circle-2" class="size-5" />
        <h3 class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">Final Recommendation</h3>
      </div>
      <UTextarea
        :model-value="block.recommendation"
        variant="none"
        placeholder="Based on the pros and cons above, my recommendation is..."
        autoresize
        :max-rows="6"
        class="w-full"
        :ui="{ base: 'p-0 text-base text-toned font-medium placeholder:text-muted/40' }"
        @update:model-value="
          mutateBlock(tabId, block.id, (entry) => {
            if (entry.type !== 'decision') return;
            entry.recommendation = $event ?? '';
          })
        "
      />
    </div>
  </div>
</template>
