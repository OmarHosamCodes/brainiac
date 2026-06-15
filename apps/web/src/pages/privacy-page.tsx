import { Link } from "react-router-dom";

import { MarketingPageShell } from "@/components/marketing-page-shell";

const effectiveDate = "March 28, 2026";

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

type LegalSection = (typeof sections)[number];

function LegalSectionContent({ section }: { section: LegalSection }) {
  return (
    <section
      id={section.id}
      className="scroll-mt-28 border-b border-neutral-200 py-10 first:pt-0 dark:border-neutral-800/80"
    >
      <h2 className="text-xl font-bold tracking-tight text-neutral-950 md:text-2xl dark:text-white">
        {section.title}
      </h2>

      {"intro" in section && section.intro ? (
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
          {section.intro}
        </p>
      ) : null}

      {"paragraphs" in section && section.paragraphs?.length ? (
        <div className="mt-4 max-w-2xl space-y-4 text-sm leading-7 text-neutral-600 md:text-[15px] dark:text-neutral-300">
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : null}

      {"bullets" in section && section.bullets?.length ? (
        <ul className="mt-5 max-w-2xl space-y-3 text-sm leading-7 text-neutral-700 md:text-[15px] dark:text-neutral-200">
          {section.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function PrivacyPage() {
  return (
    <MarketingPageShell>
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-20 md:px-10 md:pt-28 md:pb-28 lg:px-16">
        <div className="grid grid-cols-1 gap-y-8 md:grid-cols-12 md:gap-x-10">
          <div className="md:col-span-4">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
              Legal
            </div>
            <h1 className="text-4xl leading-[1.02] font-bold tracking-tight md:text-6xl">Privacy Policy</h1>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-neutral-600 md:text-lg dark:text-neutral-400">
              A plain-language overview of what Brainiac collects, why it is processed, who may receive it, and
              what choices users have.
            </p>

            <div className="mt-8 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500">
              Effective {effectiveDate}
            </div>

            <nav className="mt-10 hidden md:block">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                On this page
              </div>
              <ul className="space-y-2">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="border-t border-neutral-200 md:col-span-7 md:col-start-6 dark:border-neutral-800/80">
            {sections.map((section) => (
              <LegalSectionContent key={section.id} section={section} />
            ))}

            <div className="flex items-center gap-6 py-10 text-sm">
              <Link
                to="/terms"
                className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                Terms of Service
              </Link>
              <span className="text-neutral-300 dark:text-neutral-700">/</span>
              <Link
                to="/"
                className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MarketingPageShell>
  );
}
