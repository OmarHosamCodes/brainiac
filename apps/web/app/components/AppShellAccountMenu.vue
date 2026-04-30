<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

import { getErrorMessage } from "~/utils/get-error-message";

const toast = useToast();
const authClient = useAuthClient();
const session = useAuthSession();
const { tier, isPro } = useBilling();

const initials = computed(() => {
  const fullName = session.value.data?.user?.name?.trim();

  if (!fullName) {
    return "B";
  }

  const parts = fullName.split(/\s+/).filter(Boolean).slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "B";
});

const menuItems = computed<DropdownMenuItem[][]>(() => {
  const userName = session.value.data?.user?.name?.trim() || "Workspace";
  const userEmail = session.value.data?.user?.email?.trim();

  return [
    [
      {
        label: userName,
        type: "label",
        avatar: {
          text: initials.value,
        },
      },
      ...(userEmail
        ? [
            {
              label: userEmail,
              disabled: true,
            } satisfies DropdownMenuItem,
          ]
        : []),
    ],
    [
      {
        label: tier.value === "pro" ? "Pro plan" : "Free plan",
        icon: isPro.value ? "i-lucide-badge-check" : "i-lucide-circle",
        disabled: true,
      },
      {
        label: "Billing",
        icon: "i-lucide-credit-card",
        to: "/billing",
      },
    ],
    [
      {
        label: "Sign out",
        icon: "i-lucide-log-out",
        onSelect: handleSignOut,
      },
    ],
  ];
});

async function handleSignOut() {
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
}
</script>

<template>
  <USkeleton v-if="session.isPending" class="h-10 w-10 rounded-2xl" />

  <UButton
    v-else-if="!session.data"
    to="/login"
    color="neutral"
    variant="soft"
    icon="i-lucide-log-in"
    square
    class="rounded-2xl"
    aria-label="Sign in"
  />

  <UDropdownMenu v-else :items="menuItems" :content="{ align: 'end', side: 'right' }">
    <button
      type="button"
      class="app-shell-account group relative flex size-10 items-center justify-center rounded-2xl border border-default bg-default text-sm font-semibold text-highlighted transition-colors hover:border-accented hover:bg-elevated focus-visible:border-accented focus-visible:bg-elevated"
      :aria-label="`Account menu for ${session.data.user.name || 'workspace user'}`"
      :title="session.data.user.name || 'Account'"
    >
      <span>{{ initials }}</span>
      <span v-if="isPro" class="app-shell-account__dot bg-primary" aria-hidden="true" />
    </button>
  </UDropdownMenu>
</template>

<style scoped>
.app-shell-account {
  transition:
    border-color 180ms cubic-bezier(0.25, 1, 0.5, 1),
    background-color 180ms cubic-bezier(0.25, 1, 0.5, 1),
    color 180ms cubic-bezier(0.25, 1, 0.5, 1),
    transform 180ms cubic-bezier(0.25, 1, 0.5, 1);
}

.app-shell-account:active {
  transform: translateY(1px);
}

.app-shell-account__dot {
  position: absolute;
  right: 0.45rem;
  top: 0.45rem;
  height: 0.38rem;
  width: 0.38rem;
  border-radius: 999px;
  box-shadow: 0 0 0 2px var(--ui-bg);
}
</style>
