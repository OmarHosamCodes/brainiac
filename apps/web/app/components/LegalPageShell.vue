<script setup lang="ts">
interface LegalSection {
    id: string;
    title: string;
    intro?: string;
    paragraphs?: string[];
    bullets?: string[];
}

const props = defineProps<{
    title: string;
    summary: string;
    effectiveDate: string;
    lastUpdated: string;
    sections: LegalSection[];
}>();

const sectionLinks = computed(() =>
    props.sections.map((section) => ({
        label: section.title,
        to: `#${section.id}`,
    })),
);
</script>

<template>
    <div class="relative min-h-screen overflow-x-hidden bg-white text-neutral-900 selection:bg-emerald-500/20 dark:bg-neutral-950 dark:text-neutral-100">
        <Header />

        <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div class="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.07)_1px,transparent_1px)] bg-[size:28px_28px] dark:bg-[linear-gradient(to_right,rgba(52,211,153,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(52,211,153,0.08)_1px,transparent_1px)]" />
            <div class="absolute left-[-12rem] top-20 h-96 w-96 rounded-full bg-emerald-500/12 blur-[120px]" />
            <div class="absolute bottom-0 right-[-10rem] h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />
        </div>

        <main class="px-4 pb-16 pt-28 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-6xl">
                <div class="mb-10">
                    <ULink
                        to="/login"
                        class="inline-flex items-center gap-2 rounded-full border border-neutral-200/70 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-neutral-500 transition hover:border-emerald-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-400 dark:hover:border-emerald-500/40 dark:hover:text-white"
                    >
                        <UIcon name="i-lucide-arrow-left" class="size-3.5" />
                        Back To Access
                    </ULink>
                </div>

                <section class="grid gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-end">
                    <div class="space-y-6">
                        <div class="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.32em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                            <UIcon name="i-lucide-shield-check" class="size-4" />
                            Legal
                        </div>

                        <div class="space-y-4">
                            <h1 class="max-w-xl text-5xl font-black tracking-tight text-neutral-950 dark:text-white sm:text-6xl">
                                {{ title }}
                            </h1>
                            <p class="max-w-xl text-base leading-8 text-neutral-600 dark:text-neutral-300 sm:text-lg">
                                {{ summary }}
                            </p>
                        </div>
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="rounded-[2rem] border border-neutral-200/70 bg-white/85 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80 dark:shadow-none">
                            <p class="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-400">
                                Effective
                            </p>
                            <p class="mt-3 text-2xl font-bold text-neutral-950 dark:text-white">
                                {{ effectiveDate }}
                            </p>
                        </div>
                        <div class="rounded-[2rem] border border-neutral-200/70 bg-white/85 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80 dark:shadow-none">
                            <p class="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-400">
                                Last Updated
                            </p>
                            <p class="mt-3 text-2xl font-bold text-neutral-950 dark:text-white">
                                {{ lastUpdated }}
                            </p>
                        </div>
                    </div>
                </section>

                <section class="mt-10 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
                    <aside class="lg:sticky lg:top-28 lg:self-start">
                        <div class="rounded-[2rem] border border-neutral-200/70 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/85 dark:shadow-none">
                            <p class="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-400">
                                On This Page
                            </p>
                            <nav class="mt-4 space-y-1">
                                <a
                                    v-for="link in sectionLinks"
                                    :key="link.to"
                                    :href="link.to"
                                    class="block rounded-2xl px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                                >
                                    {{ link.label }}
                                </a>
                            </nav>

                            <div class="mt-6 rounded-[1.5rem] bg-neutral-950 px-4 py-4 text-white dark:bg-white dark:text-neutral-950">
                                <p class="text-[11px] font-black uppercase tracking-[0.28em] text-white/60 dark:text-neutral-500">
                                    Contact
                                </p>
                                <p class="mt-2 text-sm leading-6 text-white/80 dark:text-neutral-700">
                                    Questions about these terms can be sent to
                                    <a href="mailto:legal@brainiac.studio" class="font-semibold text-emerald-300 dark:text-emerald-600">
                                        legal@brainiac.studio
                                    </a>.
                                </p>
                            </div>
                        </div>
                    </aside>

                    <article class="rounded-[2rem] border border-neutral-200/70 bg-white/92 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/88 dark:shadow-none sm:p-8 lg:p-10">
                        <div class="space-y-10">
                            <section
                                v-for="section in sections"
                                :id="section.id"
                                :key="section.id"
                                class="scroll-mt-28 border-b border-neutral-200/80 pb-10 last:border-b-0 last:pb-0 dark:border-neutral-800"
                            >
                                <div class="max-w-3xl">
                                    <h2 class="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
                                        {{ section.title }}
                                    </h2>

                                    <p
                                        v-if="section.intro"
                                        class="mt-3 text-base leading-8 text-neutral-600 dark:text-neutral-300"
                                    >
                                        {{ section.intro }}
                                    </p>

                                    <div
                                        v-if="section.paragraphs?.length"
                                        class="mt-4 space-y-4 text-sm leading-7 text-neutral-600 dark:text-neutral-300 sm:text-[15px]"
                                    >
                                        <p v-for="paragraph in section.paragraphs" :key="paragraph">
                                            {{ paragraph }}
                                        </p>
                                    </div>

                                    <ul
                                        v-if="section.bullets?.length"
                                        class="mt-5 space-y-3 text-sm leading-7 text-neutral-700 dark:text-neutral-200 sm:text-[15px]"
                                    >
                                        <li
                                            v-for="bullet in section.bullets"
                                            :key="bullet"
                                            class="flex gap-3"
                                        >
                                            <span class="mt-2 size-2 shrink-0 rounded-full bg-emerald-500" />
                                            <span>{{ bullet }}</span>
                                        </li>
                                    </ul>
                                </div>
                            </section>
                        </div>

                        <div class="mt-10 flex flex-wrap items-center gap-3 rounded-[1.75rem] border border-dashed border-neutral-300 bg-neutral-50 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-950">
                            <UButton
                                to="/"
                                color="primary"
                                class="rounded-2xl px-5"
                            >
                                Return Home
                            </UButton>
                            <UButton
                                to="/login"
                                variant="ghost"
                                color="neutral"
                                class="rounded-2xl px-5"
                            >
                                Sign In
                            </UButton>
                        </div>
                    </article>
                </section>
            </div>
        </main>
    </div>
</template>
