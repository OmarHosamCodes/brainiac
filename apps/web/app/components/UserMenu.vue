<script setup lang="ts">
import { getErrorMessage } from "~/utils/get-error-message";

const toast = useToast();
const authClient = useAuthClient();
const session = useAuthSession();
const { tier, isPro } = useBilling();

const handleSignOut = async () => {
  try {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: async () => {
          toast.add({ title: "Signed out successfully" });
          await navigateTo("/", { replace: true, external: true });
        },
        onError: (error: { error?: { message?: string } }) => {
          toast.add({
            title: "Sign out failed",
            description: error?.error?.message || "Unknown error",
          });
        },
      },
    });
  } catch (error) {
    toast.add({
      title: "An unexpected error occurred during sign out",
      description: getErrorMessage(error, "Please try again."),
    });
  }
};
</script>

<template>
  <div>
    <USkeleton v-if="session.isPending" class="h-9 w-24" />

    <UButton v-else-if="!session.data" variant="outline" to="/login"> Sign In </UButton>

    <div v-else class="flex items-center gap-2">
      <UBadge
        :color="isPro ? 'primary' : 'neutral'"
        variant="subtle"
        size="xs"
      >
        {{ tier === 'pro' ? 'Pro' : 'Free' }}
      </UBadge>

      <UButton variant="ghost" color="neutral" to="/billing" icon="i-lucide-credit-card" size="sm" />

      <UButton
        variant="solid"
        icon="i-lucide-log-out"
        label="Sign out"
        @click="handleSignOut()"
      />
    </div>
  </div>
</template>
