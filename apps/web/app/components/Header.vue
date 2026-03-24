<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

import UserMenu from "./UserMenu.vue";

const route = useRoute();

const items = computed<NavigationMenuItem[]>(() => [
  { label: "Home", to: "/", active: route.path === "/" },
  {
    label: "Dashboard",
    to: "/dashboard",
    active: route.path.startsWith("/dashboard"),
  },
]);
</script>

<template>
  <UHeader>
    <template #left>
      <UNavigationMenu :items="items" />
    </template>

    <template #right>
      <UColorModeButton />
      <UserMenu />
    </template>

    <template #body>
      <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
    </template>
  </UHeader>
</template>
