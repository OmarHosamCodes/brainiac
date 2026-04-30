<script setup lang="ts">
definePageMeta({
  layout: "app",
  middleware: ["auth"],
});

useAppShellPageTitle("Billing");

const route = useRoute();
const { refreshBillingState } = useBilling();

const checkoutId = computed(() => route.query.checkout_id as string | undefined);

onMounted(() => {
  refreshBillingState();
});
</script>

<template>
  <div
    class="flex h-full items-start justify-center overflow-y-auto bg-default px-4 pt-12 sm:px-6 lg:px-8"
  >
    <div class="max-w-md w-full px-6 text-center">
      <div
        class="mx-auto mb-6 flex items-center justify-center size-16 rounded-full bg-primary/10"
      >
        <UIcon name="i-lucide-check-circle" class="size-8 text-primary" />
      </div>

      <h1 class="text-2xl font-bold text-highlighted mb-2">
        Welcome to Pro!
      </h1>
      <p class="text-muted mb-8">
        Your subscription is now active. Enjoy the full power of Brainiac Studio.
      </p>

      <p v-if="checkoutId" class="text-xs text-dimmed mb-6">Checkout ID: {{ checkoutId }}</p>

      <div class="flex flex-col gap-3">
        <UButton
          to="/dashboard"
          size="lg"
          color="primary"
          block
          class="shadow-lg shadow-primary/20"
        >
          Go to Dashboard
        </UButton>
        <UButton to="/billing" size="lg" variant="outline" color="neutral" block>
          View Billing Details
        </UButton>
      </div>
    </div>
  </div>
</template>
