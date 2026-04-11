<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const route = useRoute();
const { refreshBillingState } = useBilling();

const checkoutId = computed(() => route.query.checkout_id as string | undefined);

onMounted(() => {
  refreshBillingState();
});
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
    <div class="max-w-md w-full px-6 text-center">
      <div
        class="mx-auto mb-6 flex items-center justify-center size-16 rounded-full bg-emerald-500/10"
      >
        <UIcon name="i-lucide-check-circle" class="size-8 text-emerald-500" />
      </div>

      <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
        Welcome to Pro!
      </h1>
      <p class="text-neutral-500 dark:text-neutral-400 mb-8">
        Your subscription is now active. Enjoy the full power of Brainiac Studio.
      </p>

      <p v-if="checkoutId" class="text-xs text-neutral-400 mb-6">
        Checkout ID: {{ checkoutId }}
      </p>

      <div class="flex flex-col gap-3">
        <UButton
          to="/dashboard"
          size="lg"
          color="primary"
          block
          class="shadow-lg shadow-emerald-500/20"
        >
          Go to Dashboard
        </UButton>
        <UButton
          to="/billing"
          size="lg"
          variant="outline"
          color="neutral"
          block
        >
          View Billing Details
        </UButton>
      </div>
    </div>
  </div>
</template>
