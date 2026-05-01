<script setup lang="ts">
definePageMeta({ layout: "marketing" });

const effectiveDate = "March 28, 2026";

useSeoMeta({
  title: "Terms of Service | Brainiac",
  description:
    "Terms governing access to Brainiac, including account use, acceptable use, subscriptions, and service availability.",
});

const sections = [
  {
    id: "acceptance",
    title: "Acceptance of These Terms",
    intro:
      "These Terms of Service govern your access to Brainiac, including our website, workspace tools, marketplace surfaces, and related services.",
    paragraphs: [
      "By creating an account, accessing the product, or using any Brainiac service, you agree to these terms and to any supplemental policies referenced here.",
      "If you are using Brainiac on behalf of an organization, you represent that you have authority to bind that organization and that both you and the organization are responsible for compliance.",
    ],
  },
  {
    id: "accounts",
    title: "Accounts and Eligibility",
    paragraphs: [
      "You must provide accurate registration information, maintain the security of your credentials, and promptly notify us if you believe your account has been compromised.",
      "You are responsible for activity that occurs under your account unless that activity results directly from our failure to maintain reasonable security controls.",
    ],
    bullets: [
      "You may not share credentials in a way that bypasses seat, user, or access limits.",
      "You may not create accounts using false identities or another person's information without authorization.",
      "You must be legally able to enter into a binding agreement to use the service.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    intro:
      "Brainiac is built for legitimate collaboration and creative work. You may not use the service in ways that interfere with others, violate law, or abuse our infrastructure.",
    bullets: [
      "Do not upload or distribute content that is unlawful, defamatory, infringing, exploitative, or malicious.",
      "Do not attempt to reverse engineer, probe, scrape, disable, or circumvent security, rate limits, or technical restrictions.",
      "Do not use the platform to generate or coordinate spam, malware, credential theft, or deceptive automation.",
      "Do not interfere with the reliability or performance of the service for other users.",
    ],
  },
  {
    id: "content",
    title: "Your Content and Licenses",
    paragraphs: [
      "You retain ownership of the content, prompts, files, and materials you submit to Brainiac. You grant us a limited license to host, process, transmit, and display that content solely as needed to operate, secure, improve, and support the service.",
      "You represent that you have the rights necessary to submit your content and that our use of it as permitted by these terms will not violate law or the rights of any third party.",
      "We may use aggregated and de-identified usage information to analyze performance, improve features, and maintain service quality.",
    ],
  },
  {
    id: "ai-services",
    title: "AI Features and Generated Output",
    paragraphs: [
      "Brainiac may provide AI-assisted features, recommendations, summaries, and generated output. These features can be inaccurate, incomplete, or unsuitable for a specific purpose, so you remain responsible for reviewing output before relying on it.",
      "You should not use AI-generated output from Brainiac as the sole basis for legal, medical, employment, financial, or other high-stakes decisions.",
    ],
  },
  {
    id: "billing",
    title: "Billing, Paid Features, and Changes",
    paragraphs: [
      "Paid plans, usage limits, and pricing may be described in-product or in an order form. Unless otherwise stated, fees are billed in advance, non-refundable except where required by law, and exclusive of applicable taxes.",
      "We may modify pricing, features, or plan structure prospectively. If a change materially affects an active paid subscription, we will provide reasonable notice before it takes effect.",
    ],
  },
  {
    id: "termination",
    title: "Suspension and Termination",
    paragraphs: [
      "You may stop using Brainiac at any time. We may suspend or terminate access if we reasonably believe you have violated these terms, created security risk, exposed us to legal liability, or used the service in a harmful way.",
      "We may also discontinue features or the service itself with reasonable notice when practicable. Sections that by their nature should survive termination will remain in effect, including ownership, disclaimers, limitation of liability, and dispute provisions.",
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers and Limitation of Liability",
    paragraphs: [
      "Brainiac is provided on an as-available and as-is basis. To the maximum extent permitted by law, we disclaim implied warranties including merchantability, fitness for a particular purpose, and non-infringement.",
      "To the maximum extent permitted by law, Brainiac and its affiliates will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of profits, revenues, goodwill, data, or business opportunities.",
      "Our aggregate liability for claims arising out of or related to the service will not exceed the greater of the amount you paid us for the service during the twelve months before the event giving rise to the claim or one hundred U.S. dollars.",
    ],
  },
  {
    id: "changes",
    title: "Updates to These Terms",
    paragraphs: [
      "We may update these terms from time to time to reflect product changes, legal requirements, or operational needs. When we do, we will post the revised version here and update the effective date.",
      "Your continued use of Brainiac after the revised terms take effect constitutes acceptance of the updated terms.",
    ],
  },
] as const;
</script>

<template>
  <MarketingPageShell>
    <div class="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 pt-20 md:pt-28 pb-20 md:pb-28">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-y-8 md:gap-x-10">
        <div class="md:col-span-4">
          <div
            class="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 mb-4"
          >
            Legal
          </div>
          <h1 class="text-4xl md:text-6xl font-bold tracking-tight leading-[1.02]">
            Terms of Service
          </h1>
          <p
            class="mt-6 text-base md:text-lg text-neutral-600 dark:text-neutral-400 max-w-sm leading-relaxed"
          >
            Clear rules for using Brainiac, from account security and acceptable use to AI-assisted
            output, billing, and service limits.
          </p>

          <div
            class="mt-8 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500"
          >
            Effective {{ effectiveDate }}
          </div>

          <nav class="mt-10 hidden md:block">
            <div
              class="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 mb-4"
            >
              On this page
            </div>
            <ul class="space-y-2">
              <li v-for="section in sections" :key="section.id">
                <a
                  :href="`#${section.id}`"
                  class="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                >
                  {{ section.title }}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div
          class="md:col-span-7 md:col-start-6 border-t border-neutral-200 dark:border-neutral-800/80"
        >
          <section
            v-for="section in sections"
            :id="section.id"
            :key="section.id"
            class="scroll-mt-28 py-10 border-b border-neutral-200 dark:border-neutral-800/80 first:pt-0"
          >
            <h2
              class="text-xl md:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white"
            >
              {{ section.title }}
            </h2>

            <p
              v-if="section.intro"
              class="mt-4 text-base leading-relaxed text-neutral-600 dark:text-neutral-300 max-w-2xl"
            >
              {{ section.intro }}
            </p>

            <div
              v-if="section.paragraphs?.length"
              class="mt-4 space-y-4 text-sm md:text-[15px] leading-7 text-neutral-600 dark:text-neutral-300 max-w-2xl"
            >
              <p v-for="paragraph in section.paragraphs" :key="paragraph">
                {{ paragraph }}
              </p>
            </div>

            <ul
              v-if="section.bullets?.length"
              class="mt-5 space-y-3 text-sm md:text-[15px] leading-7 text-neutral-700 dark:text-neutral-200 max-w-2xl"
            >
              <li v-for="bullet in section.bullets" :key="bullet" class="flex gap-3">
                <span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary-500" />
                <span>{{ bullet }}</span>
              </li>
            </ul>
          </section>

          <div class="py-10 flex items-center gap-6 text-sm">
            <ULink
              to="/privacy"
              class="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              Privacy Policy
            </ULink>
            <span class="text-neutral-300 dark:text-neutral-700">/</span>
            <ULink
              to="/"
              class="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              Home
            </ULink>
          </div>
        </div>
      </div>
    </div>
  </MarketingPageShell>
</template>
