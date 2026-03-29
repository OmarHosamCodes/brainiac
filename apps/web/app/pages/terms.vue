<script setup lang="ts">
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
      "You may not create accounts using false identities or another person’s information without authorization.",
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
  <LegalPageShell
    title="Terms of Service"
    summary="Clear rules for using Brainiac, from account security and acceptable use to AI-assisted output, billing, and service limits."
    :effective-date="effectiveDate"
    :last-updated="effectiveDate"
    :sections="sections"
  />
</template>
