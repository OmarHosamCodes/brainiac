<script setup lang="ts">
import SignInForm from "~/components/SignInForm.vue";
import SignUpForm from "~/components/SignUpForm.vue";

definePageMeta({
  layout: false,
});

const session = useAuthSession();
const showSignIn = ref(true);

watchEffect(() => {
  if (!session?.value.isPending && session?.value.data) {
    navigateTo("/dashboard", { replace: true });
  }
});
</script>

<template>
  <div
    class="fixed inset-0 flex overflow-hidden bg-white dark:bg-neutral-950 font-sans selection:bg-emerald-500/30"
  >
    <!-- Left Pane: Branded Experience -->
    <aside
      class="relative hidden w-0 lg:flex lg:flex-1 flex-col justify-between overflow-hidden border-r border-neutral-200/50 dark:border-neutral-800/50 bg-neutral-50/50 dark:bg-neutral-900/50"
    >
      <!-- Infinite Canvas Dot Grid -->
      <div
        class="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        :style="{
          backgroundImage:
            'radial-gradient(circle at 2px 2px, var(--ui-border) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }"
      />

      <!-- Animated Background Glows -->
      <div
        class="absolute -top-40 -left-40 size-96 rounded-full bg-emerald-500/10 blur-[100px] animate-pulse"
      />
      <div class="absolute -bottom-40 -right-40 size-96 rounded-full bg-blue-500/5 blur-[100px]" />

      <div class="relative z-10 flex flex-col h-full p-12 xl:p-20">
        <ULink to="/" class="group flex items-center gap-4 w-fit">
          <div
            class="flex items-center justify-center size-14 rounded-3xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-2xl transition-transform group-hover:scale-110 active:scale-95 duration-500"
          >
            <UIcon name="i-lucide-brain-circuit" class="size-8" />
          </div>
          <div>
            <h1
              class="text-3xl font-black tracking-tighter text-neutral-900 dark:text-white uppercase italic leading-none"
            >
              Brainiac
            </h1>
            <p
              class="text-[10px] font-bold tracking-[0.4em] text-neutral-500 dark:text-neutral-400 uppercase mt-1"
            >
              The Infinite Workspace
            </p>
          </div>
        </ULink>

        <div class="mt-auto max-w-xl">
          <h2
            class="text-5xl xl:text-7xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[0.95] mb-8"
          >
            Reimagine the way you <span class="text-emerald-500 italic">think</span>.
          </h2>
          <p
            class="text-lg xl:text-xl text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium"
          >
            Your mind isn't a grid. It's a canvas. Brainiac helps you organize chaos into clarity
            with an infinite spatial interface powered by intelligence.
          </p>
        </div>

        <div class="mt-20 flex items-center gap-12">
          <div
            v-for="stat in [
              { label: 'Users', value: '50k+' },
              { label: 'Blocks', value: '1.2M' },
              { label: 'Nodes', value: '4.8M' },
            ]"
            :key="stat.label"
          >
            <div class="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
              {{ stat.value }}
            </div>
            <div class="text-xs font-bold uppercase tracking-widest text-neutral-500 mt-1">
              {{ stat.label }}
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Right Pane: Auth Forms -->
    <main class="relative flex flex-1 flex-col items-center justify-center p-8 md:p-12 xl:p-20">
      <div class="w-full max-w-md">
        <!-- Mobile Header -->
        <div class="lg:hidden flex items-center gap-3 mb-12">
          <div
            class="flex items-center justify-center size-10 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-xl"
          >
            <UIcon name="i-lucide-brain-circuit" class="size-6" />
          </div>
          <span
            class="text-xl font-black tracking-tighter text-neutral-900 dark:text-white uppercase italic"
            >Brainiac</span
          >
        </div>

        <transition
          enter-active-class="transition duration-500 ease-out"
          enter-from-class="opacity-0 translate-y-4 scale-95"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-300 ease-in"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 -translate-y-4 scale-95"
          mode="out-in"
        >
          <div
            v-if="session.isPending"
            class="flex flex-col items-center justify-center gap-4 py-12"
          >
            <UIcon name="i-lucide-loader-2" class="size-12 animate-spin text-emerald-500" />
            <span class="text-sm font-bold uppercase tracking-[0.3em] text-neutral-400"
              >Syncing Identity</span
            >
          </div>
          <div v-else-if="!session.data">
            <SignInForm v-if="showSignIn" @switch-to-sign-up="showSignIn = false" />
            <SignUpForm v-else @switch-to-sign-in="showSignIn = true" />
          </div>
        </transition>

        <footer class="mt-12 pt-8 border-t border-neutral-100 dark:border-neutral-800/50">
          <div
            class="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-neutral-400"
          >
            <span>&copy; 2026 Brainiac</span>
            <div class="flex items-center gap-4">
              <ULink
                to="/terms"
                class="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >Terms</ULink
              >
              <ULink
                to="/privacy"
                class="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >Privacy</ULink
              >
            </div>
          </div>
        </footer>
      </div>
    </main>
  </div>
</template>
