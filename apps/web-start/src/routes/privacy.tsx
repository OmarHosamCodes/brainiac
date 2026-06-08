import { createFileRoute, Link } from "@tanstack/react-router";

const effectiveDate = "March 28, 2026";

const sections = [
  {
    id: "scope",
    title: "Scope of This Policy",
    paragraphs: [
      "This Privacy Policy explains how Brainiac collects, uses, discloses, and safeguards personal information when you visit our website, create an account, or use our workspace and related services.",
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

export const Route = createFileRoute("/privacy")({
  component: PrivacyRoute,
});

function PrivacyRoute() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="A plain-language overview of what Brainiac collects, why it is processed, who may receive it, and what choices users have."
      sections={sections}
      sibling={{ to: "/terms", label: "Terms of Service" }}
    />
  );
}

function LegalPage(props: {
  title: string;
  description: string;
  sections: typeof sections;
  sibling: { to: "/terms" | "/privacy"; label: string };
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-6xl gap-y-8 px-6 pb-24 pt-20 md:grid-cols-12 md:gap-x-10 md:px-10 md:pt-28 lg:px-16">
        <aside className="md:col-span-4">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Legal
          </div>
          <h1 className="text-4xl font-bold tracking-normal md:text-6xl">{props.title}</h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-muted-foreground md:text-lg">
            {props.description}
          </p>
          <div className="mt-8 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Effective {effectiveDate}
          </div>
        </aside>

        <div className="border-t md:col-span-7 md:col-start-6">
          {props.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-28 border-b py-10 first:pt-0">
              <h2 className="text-xl font-bold tracking-normal md:text-2xl">{section.title}</h2>
              {"paragraphs" in section && section.paragraphs ? (
                <div className="mt-4 max-w-2xl space-y-4 text-sm leading-7 text-muted-foreground md:text-[15px]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              ) : null}
              {"bullets" in section && section.bullets ? (
                <ul className="mt-5 max-w-2xl space-y-3 text-sm leading-7 md:text-[15px]">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <div className="flex items-center gap-6 py-10 text-sm">
            <Link to={props.sibling.to} className="text-muted-foreground hover:text-foreground">
              {props.sibling.label}
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
