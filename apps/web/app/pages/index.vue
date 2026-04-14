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
    <div
        class="relative min-h-screen w-full flex flex-col overflow-hidden bg-white dark:bg-neutral-950 selection:bg-primary/20"
    >
        <Header />

        <!-- Background layer: Neural field canvas + soft radial undertones -->
        <div class="absolute inset-0 -z-10">
            <!-- Radial warmth underneath the neural field for depth -->
            <div
                class="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_40%,oklch(0.85_0.06_160/0.07),transparent_70%)]"
            />
            <div
                class="absolute inset-0 bg-[radial-gradient(ellipse_40%_60%_at_80%_70%,oklch(0.80_0.04_160/0.04),transparent_60%)]"
            />
        </div>

        <!-- Main content — offset left for asymmetry, not dead center -->
        <main
            class="flex-1 flex items-center w-full max-w-5xl mx-auto px-6 md:px-12 lg:px-16 pt-28 pb-24"
        >
            <div class="w-full max-w-2xl">
                <!-- Badge — slides in from the left -->
                <div
                    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold uppercase tracking-widest text-muted mb-4 hero-badge"
                >
                    <UIcon
                        name="i-lucide-brain-circuit"
                        class="size-3.5 text-primary"
                    />
                    Spatial Knowledge Workspace
                </div>

                <!-- Headline — refined entrance with blur-lift + scale -->
                <h1
                    class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-default leading-[0.95] mb-6 hero-title"
                >
                    Brainiac
                    <span
                        class="text-primary block mt-1 text-[0.75em] hero-title-accent"
                        >Studio</span
                    >
                </h1>

                <!-- Body copy -->
                <p
                    class="text-lg md:text-xl text-dimmed max-w-lg leading-relaxed mb-10 hero-body"
                >
                    An infinite spatial workspace for your mind. Organize,
                    collaborate, and evolve with AI agents — distraction-free.
                </p>

                <!-- CTAs — staggered cascade -->
                <div class="flex flex-wrap items-center gap-4 hero-ctas">
                    <UButton
                        to="/dashboard"
                        size="xl"
                        color="primary"
                        class="shadow-lg shadow-primary/15 hero-cta-1"
                    >
                        Launch Workspace
                    </UButton>
                    <UButton
                        to="/marketplace"
                        size="lg"
                        variant="outline"
                        color="neutral"
                        class="hero-cta-2"
                    >
                        Marketplace
                    </UButton>
                    <UButton
                        to="/pricing"
                        size="lg"
                        variant="ghost"
                        color="neutral"
                        class="hero-cta-3"
                    >
                        Pricing
                    </UButton>
                </div>
            </div>
        </main>

        <!-- Status bar — anchored to bottom, with breathing pulse -->
        <div class="w-full flex justify-center pb-8 hero-status">
            <div
                class="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-muted/30 bg-elevated/60 backdrop-blur-xl"
            >
                <div
                    class="size-2 rounded-full"
                    :class="
                        healthCheck.isSuccess.value
                            ? 'bg-green-500 shadow-[0_0_6px_oklch(0.72_0.19_142/0.5)] status-pulse'
                            : 'bg-red-500'
                    "
                />
                <span
                    class="text-[10px] font-bold uppercase tracking-widest text-muted"
                >
                    System
                    {{
                        healthCheck.isSuccess.value ? "Operational" : "Offline"
                    }}
                </span>
                <span
                    v-if="healthCheck.isSuccess.value"
                    class="text-[10px] font-medium text-dimmed"
                >
                    ({{ healthCheck.data.value }}ms)
                </span>
            </div>
        </div>
    </div>
</template>

<style scoped>
/*
 * Entry choreography — each element has its own timing and character.
 * The sequence: badge → title → "Studio" accent → body → CTAs (staggered) → status
 *
 * Using expo-out easing for that heavy, decisive deceleration:
 * cubic-bezier(0.16, 1, 0.3, 1) — fast in, long settle
 */

/* ── Badge: slide from left, slight scale up ─────────────────────── */
.hero-badge {
    animation: badge-enter 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
}

@keyframes badge-enter {
    from {
        opacity: 0;
        transform: translateX(-24px) scale(0.92);
    }
    to {
        opacity: 1;
        transform: translateX(0) scale(1);
    }
}

/* ── Title: heavy lift from below with blur ──────────────────────── */
.hero-title {
    animation: title-enter 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
}

@keyframes title-enter {
    from {
        opacity: 0;
        transform: translateY(48px) scale(0.96);
        filter: blur(12px);
    }
    60% {
        filter: blur(2px);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
    }
}

/* ── "Studio" accent: separate timing for a layered reveal ───────── */
.hero-title-accent {
    animation: accent-enter 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
}

@keyframes accent-enter {
    from {
        opacity: 0;
        transform: translateY(24px) translateX(-8px);
        filter: blur(8px);
    }
    to {
        opacity: 1;
        transform: translateY(0) translateX(0);
        filter: blur(0);
    }
}

/* ── Body copy: gentle fade up ───────────────────────────────────── */
.hero-body {
    animation: fade-up 1s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
}

/* ── CTA buttons: staggered cascade ──────────────────────────────── */
.hero-cta-1 {
    animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.65s both;
}
.hero-cta-2 {
    animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.75s both;
}
.hero-cta-3 {
    animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.85s both;
}

/* ── Status bar: last to arrive, settling the composition ────────── */
.hero-status {
    animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1s both;
}

@keyframes fade-up {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ── Status dot: gentle breathing pulse ──────────────────────────── */
.status-pulse {
    animation: pulse-glow 2.5s ease-in-out infinite;
}

@keyframes pulse-glow {
    0%,
    100% {
        box-shadow: 0 0 6px oklch(0.72 0.19 142 / 0.5);
    }
    50% {
        box-shadow:
            0 0 10px oklch(0.72 0.19 142 / 0.6),
            0 0 20px oklch(0.72 0.19 142 / 0.15);
    }
}

/* ── Reduced motion: strip all motion, keep opacity fades ────────── */
@media (prefers-reduced-motion: reduce) {
    .hero-badge,
    .hero-title,
    .hero-title-accent,
    .hero-body,
    .hero-cta-1,
    .hero-cta-2,
    .hero-cta-3,
    .hero-status {
        animation: simple-fade 0.4s ease-out both;
    }

    .status-pulse {
        animation: none;
    }

    @keyframes simple-fade {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
}
</style>
