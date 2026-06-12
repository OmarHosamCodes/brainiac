<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import { useQueryClient } from "@tanstack/vue-query";

import { getErrorMessage } from "~/utils/get-error-message";

const toast = useToast();
const authClient = useAuthClient();
const session = useAuthSession();
const { tier, isPro } = useBilling();
const queryClient = useQueryClient();

const isUploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const initials = computed(() => {
  const fullName = session.value.data?.user?.name?.trim();

  if (!fullName) {
    return "B";
  }

  const parts = fullName.split(/\s+/).filter(Boolean).slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "B";
});

const avatarUrl = computed(() => {
  const image = session.value.data?.user?.image;
  const userId = session.value.data?.user?.id;
  const serverUrl = useRuntimeConfig().public.serverUrl;
  if (image && userId && serverUrl) {
    return `${serverUrl}/api/user-avatars/${userId}`;
  }
  return null;
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
          src: avatarUrl.value ?? undefined,
          text: avatarUrl.value ? undefined : initials.value,
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

async function handleAvatarClick() {
  fileInput.value?.click();
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  isUploading.value = true;
  try {
    const formData = new FormData();
    formData.append("file", file);
    const serverUrl = useRuntimeConfig().public.serverUrl;
    const response = await fetch(`${serverUrl}/uploads/user-avatar`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(err.error ?? "Upload failed");
    }

    const { storageKey } = await response.json();

    await authClient.updateUser({ image: storageKey });

    toast.add({
      title: "Avatar updated",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Couldn't update avatar",
      description: getErrorMessage(error, "Try again."),
      color: "error",
    });
  } finally {
    isUploading.value = false;
    target.value = "";
  }
}

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
      class="app-shell-account group relative flex size-10 items-center justify-center overflow-hidden rounded-2xl border border-default bg-default text-sm font-semibold text-highlighted transition-colors hover:border-accented hover:bg-elevated focus-visible:border-accented focus-visible:bg-elevated"
      :aria-label="`Account menu for ${session.data.user.name || 'workspace user'}`"
      :title="session.data.user.name || 'Account'"
      @click="handleAvatarClick"
    >
      <img
        v-if="avatarUrl"
        :src="avatarUrl"
        :alt="session.data.user.name || 'Avatar'"
        class="size-full object-cover"
      />
      <span v-else>{{ initials }}</span>
      <div
        class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <UIcon v-if="isUploading" name="i-lucide-loader" class="size-4 animate-spin text-white" />
        <UIcon v-else name="i-lucide-camera" class="size-4 text-white" />
      </div>
      <span v-if="isPro" class="app-shell-account__dot bg-primary" aria-hidden="true" />
    </button>
  </UDropdownMenu>

  <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />
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
