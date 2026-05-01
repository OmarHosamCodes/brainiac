<script setup lang="ts">
definePageMeta({ layout: "marketing" });

const effectiveDate = "March 28, 2026";

useSeoMeta({
  title: "Privacy Policy | Brainiac",
  description:
    "How Brainiac collects, uses, stores, and protects personal information across its website and product surfaces.",
});

const sections = [
  {
    id: "scope",
    title: "Scope of This Policy",
    intro:
      "This Privacy Policy explains how Brainiac collects, uses, discloses, and safeguards personal information when you visit our website, create an account, or use our workspace and related services.",
    paragraphs: [
      "This policy applies to information we collect directly from you, automatically through your use of the service, and from third parties that help us operate authentication, analytics, support, and infrastructure.",
    ],
  },
  {
    id: "information-we-collect",
    title: "Information We Collect",
    bullets: [
      "Account details such as name, email address, authentication identifiers, and profile information.",
      "Workspace data such as prompts, documents, board content, uploaded files, and messages exchanged through the product.",
      "Usage and device data such as IP address, browser type, pages viewed, timestamps, approximate location derived from IP, and interaction events.",
      "Transaction and billing data when you purchase a paid plan, typically processed through third-party payment providers rather than stored directly by Brainiac.",
    ],
  },
  {
    id: "how-we-use-data",
    title: "How We Use Personal Information",
    paragraphs: [
      "We use personal information to provide and maintain the service, authenticate users, personalize the product experience, process transactions, prevent fraud, respond to support requests, and communicate important service notices.",
      "We also use information to monitor performance, debug issues, improve product quality, train internal operations, and comply with legal obligations.",
    ],
  },
  {
    id: "ai-processing",
    title: "AI Processing and Service Providers",
    paragraphs: [
      "Some Brainiac features may send prompts, files, or other workspace inputs to AI or infrastructure providers acting on our behalf in order to generate responses or run product functionality.",
      "We require providers to process data under contractual restrictions appropriate to the services they perform, but you should avoid submitting information that you are not authorized to share or that requires zero third-party exposure unless you have configured the service for that purpose.",
    ],
  },
  {
    id: "sharing",
    title: "How We Share Information",
    paragraphs: [
      "We do not sell personal information for money. We may share information with vendors and subprocessors that support hosting, authentication, billing, communications, analytics, security, and customer support.",
      "We may also disclose information when required by law, to enforce our terms, to protect rights or safety, or in connection with a merger, acquisition, financing, or sale of assets.",
    ],
  },
  {
    id: "retention",
    title: "Data Retention",
    paragraphs: [
      "We retain personal information for as long as reasonably necessary to provide the service, satisfy contractual commitments, resolve disputes, enforce agreements, and comply with legal obligations.",
      "Retention periods vary based on the type of information, the sensitivity of the data, and whether the information is needed for security, accounting, or operational records.",
    ],
  },
  {
    id: "rights",
    title: "Your Rights and Choices",
    bullets: [
      "You may request access to, correction of, or deletion of certain personal information, subject to legal and operational exceptions.",
      "You may update account information through your profile or by contacting us.",
      "You may opt out of non-essential communications by using unsubscribe links or account controls where available.",
      "Depending on your jurisdiction, you may have additional rights relating to portability, objection, restriction, or appeal.",
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "We use administrative, technical, and organizational safeguards designed to protect personal information from unauthorized access, loss, misuse, or alteration.",
      "No system is perfectly secure, and we cannot guarantee absolute security. You are responsible for safeguarding your own credentials and endpoint devices.",
    ],
  },
  {
    id: "international",
    title: "International Transfers",
    paragraphs: [
      "Brainiac may process and store information in countries other than the country where you reside. Where required, we use appropriate transfer mechanisms and contractual protections for cross-border processing.",
    ],
  },
  {
    id: "updates",
    title: "Changes to This Policy",
    paragraphs: [
      "We may update this Privacy Policy as our product, practices, or legal obligations evolve. When material changes are made, we will revise the date shown on this page and take additional steps where required by law.",
      "Questions or privacy requests can be sent to legal@brainiac.studio.",
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
            Privacy Policy
          </h1>
          <p
            class="mt-6 text-base md:text-lg text-neutral-600 dark:text-neutral-400 max-w-sm leading-relaxed"
          >
            A plain-language overview of what Brainiac collects, why it is processed, who may
            receive it, and what choices users have.
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
              to="/terms"
              class="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              Terms of Service
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
