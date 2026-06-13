<script setup lang="ts">
import { shellTopbarActionButtonClass } from "~/utils/app-shell-ui";

withDefaults(
  defineProps<{
    label?: string;
    icon?: string;
    ariaLabel?: string;
    color?: "neutral" | "primary" | "error" | "success" | "warning" | "info";
    variant?: "solid" | "soft" | "outline" | "ghost" | "link";
    loading?: boolean;
    disabled?: boolean;
    to?: string;
    square?: boolean;
    title?: string;
    active?: boolean;
    bordered?: boolean;
  }>(),
  {
    color: "neutral",
    variant: "soft",
    loading: false,
    disabled: false,
    square: false,
    active: false,
    bordered: false,
  },
);

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <UButton
    :label="label"
    :icon="icon"
    :to="to"
    :color="color"
    :variant="variant"
    size="sm"
    :square="square"
    :loading="loading"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :title="title"
    :class="[
      shellTopbarActionButtonClass,
      bordered ? 'border border-default' : '',
      active ? 'bg-primary/10 text-primary' : '',
    ]"
    @click="emit('click')"
  >
    <slot />
  </UButton>
</template>
