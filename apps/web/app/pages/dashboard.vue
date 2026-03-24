<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $authClient, $orpc } = useNuxtApp();

definePageMeta({
  middleware: ["auth"],
});

const session = $authClient.useSession();

const privateData = useQuery({
  ...$orpc.privateData.queryOptions(),
  enabled: computed(() => Boolean(session.value?.data?.user)),
});

const focusItems = [
  "Sketch a wider information architecture directly on the canvas.",
  "Drag between clusters to evaluate spacing and hierarchy at a glance.",
  "Use the minimap to keep orientation while you move across distant nodes.",
];
</script>

<template>
  <div class="h-full min-h-0 p-4 md:p-6">
    <InfiniteCanvas>
      <div data-canvas-node class="canvas-node" style="left: 88px; top: 88px">
        <UCard class="w-[22rem] border border-muted/70 bg-default/85 backdrop-blur-sm">
          <template #header>
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Session</p>
                <div class="mt-2 text-xl font-semibold text-highlighted">
                  {{
                    session?.data?.user
                      ? `Welcome back, ${session.data.user.name}!`
                      : "Loading workspace"
                  }}
                </div>
              </div>
              <div class="rounded-full border border-muted/60 bg-elevated/80 px-3 py-1 text-xs font-medium text-toned">
                Authenticated
              </div>
            </div>
          </template>

          <USkeleton v-if="privateData.status.value === 'pending'" class="h-6 w-48" />

          <UAlert
            v-else-if="privateData.status.value === 'error'"
            color="error"
            icon="i-lucide-alert-circle"
            title="Error loading data"
            :description="privateData.error.value?.message || 'Failed to load private data'"
          />

          <div v-else-if="privateData.data.value" class="space-y-4">
            <div class="flex items-center gap-2 text-sm text-toned">
              <UIcon name="i-lucide-check-circle-2" class="size-4 text-primary" />
              <span>{{ privateData.data.value.message }}</span>
            </div>
            <div class="rounded-2xl border border-muted/60 bg-elevated/70 p-4 text-sm leading-6 text-toned">
              This dashboard now behaves like an infinite workspace, so cards become spatial anchors instead of a fixed stack.
            </div>
          </div>
        </UCard>
      </div>

      <div data-canvas-node class="canvas-node" style="left: 500px; top: 150px">
        <UCard class="w-[20rem] border border-muted/70 bg-default/80 backdrop-blur-sm">
          <template #header>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Navigation</p>
              <h3 class="mt-2 text-lg font-semibold text-highlighted">Interaction Model</h3>
            </div>
          </template>

          <div class="space-y-3 text-sm leading-6 text-toned">
            <div class="rounded-2xl border border-muted/60 bg-elevated/70 p-4">
              Hold <kbd class="rounded-md border border-muted/70 bg-default px-2 py-1 text-xs font-semibold text-highlighted">Space</kbd>
              and drag to pan without changing zoom.
            </div>
            <div class="rounded-2xl border border-muted/60 bg-elevated/70 p-4">
              Use the mouse wheel to zoom directly into the point under the cursor.
            </div>
            <div class="rounded-2xl border border-muted/60 bg-elevated/70 p-4">
              Jump to fullscreen when you need uninterrupted room for layout exploration.
            </div>
          </div>
        </UCard>
      </div>

      <div data-canvas-node class="canvas-node" style="left: 240px; top: 420px">
        <UCard class="w-[24rem] border border-muted/70 bg-default/80 backdrop-blur-sm">
          <template #header>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Focus Lane</p>
              <h3 class="mt-2 text-lg font-semibold text-highlighted">What This Canvas Adds</h3>
            </div>
          </template>

          <ol class="space-y-3 text-sm leading-6 text-toned">
            <li
              v-for="(item, index) in focusItems"
              :key="item"
              class="flex gap-3 rounded-2xl border border-muted/60 bg-elevated/70 p-4"
            >
              <span class="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {{ index + 1 }}
              </span>
              <span>{{ item }}</span>
            </li>
          </ol>
        </UCard>
      </div>

      <div data-canvas-node class="canvas-node" style="left: 860px; top: 72px">
        <UCard class="w-[18rem] border border-muted/70 bg-default/80 backdrop-blur-sm">
          <template #header>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Signal</p>
              <h3 class="mt-2 text-lg font-semibold text-highlighted">Live Workspace State</h3>
            </div>
          </template>

          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-2xl border border-muted/60 bg-elevated/70 p-4">
              <div class="text-xs uppercase tracking-[0.2em] text-muted">Query</div>
              <div class="mt-2 font-semibold text-highlighted">
                {{ privateData.status.value === 'success' ? 'Synced' : privateData.status.value }}
              </div>
            </div>
            <div class="rounded-2xl border border-muted/60 bg-elevated/70 p-4">
              <div class="text-xs uppercase tracking-[0.2em] text-muted">Viewport</div>
              <div class="mt-2 font-semibold text-highlighted">Infinite</div>
            </div>
            <div class="col-span-2 rounded-2xl border border-dashed border-primary/50 bg-primary/10 p-4 text-sm leading-6 text-toned">
              The minimap uses the rendered card bounds plus the visible camera window, so it stays honest as you pan away from the current cluster.
            </div>
          </div>
        </UCard>
      </div>
    </InfiniteCanvas>
  </div>
</template>

<style scoped>
.canvas-node {
  position: absolute;
}
</style>
