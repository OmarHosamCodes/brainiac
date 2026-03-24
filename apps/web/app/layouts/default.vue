<script setup></script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <Header />
    <UMain class="flex-1 min-h-0">
      <slot />
    </UMain>
  </div>
</template>
