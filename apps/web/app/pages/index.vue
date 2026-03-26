<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const orpc = useOrpc();
const healthCheck = useQuery(orpc.healthCheck.queryOptions());

onServerPrefetch(async () => {
    try {
        await healthCheck.suspense();
    } catch {}
});
</script>

<template>
    <div class="relative h-screen w-screen flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-zinc-950 selection:bg-blue-500/30">
        <Header />

        <div class="absolute inset-0 -z-10">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]" />
            <div class="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        <div class="max-w-3xl w-full px-6 text-center">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/5 dark:bg-zinc-100/5 border border-zinc-200/50 dark:border-zinc-800/50 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-8 animate-fade-in">
                <UIcon name="i-lucide-brain-circuit" class="size-3.5 text-blue-500" />
                The Future of Knowledge
            </div>

            <h1 class="text-6xl md:text-8xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-8 animate-title">
                Brainiac <span class="text-blue-500 text-6xl md:text-7xl block md:inline">Studio</span>
            </h1>

            <p class="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in-delayed">
                An infinite spatial workspace for your mind. Organize, collaborate, and evolve with AI agents in a beautiful, distraction-free environment.
            </p>

            <div class="flex flex-wrap items-center justify-center gap-4 animate-fade-in-delayed-2">
                <UButton
                    to="/dashboard"
                    size="xl"
                    color="primary"
                    class="rounded-2xl px-8 h-14 shadow-2xl shadow-blue-500/20 font-bold"
                >
                    Launch Workspace
                </UButton>
                <UButton
                    to="/marketplace"
                    size="xl"
                    variant="ghost"
                    color="neutral"
                    class="rounded-2xl px-8 h-14 font-bold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                    Marketplace
                </UButton>
            </div>
        </div>

        <div class="fixed bottom-12 left-1/2 -translate-x-1/2 animate-fade-in-delayed-2">
            <div class="flex items-center gap-3 px-4 py-2 rounded-full border border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl">
                 <div class="size-2 rounded-full" :class="healthCheck.isSuccess.value ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'" />
                 <span class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    System {{ healthCheck.isSuccess.value ? 'Operational' : 'Offline' }}
                 </span>
                 <span v-if="healthCheck.isSuccess.value" class="text-[10px] font-medium text-zinc-400">
                    ({{ healthCheck.data.value }}ms)
                 </span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.animate-title {
    animation: title-enter 1s cubic-bezier(0.16, 1, 0.3, 1);
}

.animate-fade-in {
    animation: fade-in 0.8s ease-out;
}

.animate-fade-in-delayed {
    animation: fade-in 1s ease-out 0.2s both;
}

.animate-fade-in-delayed-2 {
    animation: fade-in 1s ease-out 0.4s both;
}

@keyframes title-enter {
    from {
        opacity: 0;
        transform: translateY(40px) scale(0.95);
        filter: blur(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
    }
}

@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
