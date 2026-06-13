<script setup lang="ts">
import { shellFocusRingClass, shellTopbarIconButtonClass } from "~/utils/app-shell-ui";

const props = withDefaults(
  defineProps<{
    icon: string;
    ariaLabel: string;
    title?: string;
    to?: string;
    active?: boolean;
    variant?: "ghost" | "soft" | "outline";
    bordered?: boolean;
  }>(),
  {
    variant: "ghost",
    bordered: false,
  },
);

const emit = defineEmits<{
  click: [];
}>();

const buttonClass = computed(() => [
  shellTopbarIconButtonClass,
  shellFocusRingClass,
  props.bordered ? "border border-default" : "",
  props.active ? "bg-primary/10 text-primary" : "",
]);
</script>

<template>
  <UButton
    :icon="icon"
    :to="to"
    color="neutral"
    :variant="variant"
    size="sm"
    square
    :class="buttonClass"
    :aria-label="ariaLabel"
    :title="title ?? ariaLabel"
    @click="emit('click')"
  />
</template>
