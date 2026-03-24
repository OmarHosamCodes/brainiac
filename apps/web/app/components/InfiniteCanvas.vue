<script setup lang="ts">
import { useCanvas } from "~/composables/useCanvas";

const viewportRef = useTemplateRef<HTMLElement>("viewportRef");
const { canvasStyle, backgroundStyle } = useCanvas(viewportRef);
</script>

<template>
  <div ref="viewportRef" class="canvas-viewport" :style="backgroundStyle">
    <div class="canvas-plane" :style="canvasStyle">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.canvas-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  user-select: none;
  background-color: var(--ui-bg);
  background-image: radial-gradient(
    var(--ui-border) 1px,
    transparent 1px
  );
  /* background-size and background-position are set dynamically via :style */
}

.canvas-viewport:active {
  cursor: grabbing;
}

.canvas-plane {
  position: absolute;
  top: 0;
  left: 0;
  /* Size is irrelevant — children are absolutely positioned on the infinite plane */
}
</style>
