import { createFileRoute, Link } from "@tanstack/react-router";

const effectiveDate = "March 28, 2026";

type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of These Terms",
    paragraphs: [
      "These Terms of Service govern your access to Brainiac, including our website, workspace tools, marketplace surfaces, and related services.",
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

export const Route = createFileRoute("/terms")({
  component: TermsRoute,
});

function TermsRoute() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-6xl gap-y-8 px-6 pb-24 pt-20 md:grid-cols-12 md:gap-x-10 md:px-10 md:pt-28 lg:px-16">
        <aside className="md:col-span-4">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Legal
          </div>
          <h1 className="text-4xl font-bold tracking-normal md:text-6xl">Terms of Service</h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-muted-foreground md:text-lg">
            Clear rules for using Brainiac, from account security and acceptable use to AI-assisted
            output, billing, and service limits.
          </p>
          <div className="mt-8 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Effective {effectiveDate}
          </div>
        </aside>

        <div className="border-t md:col-span-7 md:col-start-6">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-28 border-b py-10 first:pt-0">
              <h2 className="text-xl font-bold tracking-normal md:text-2xl">{section.title}</h2>
              {section.paragraphs ? (
                <div className="mt-4 max-w-2xl space-y-4 text-sm leading-7 text-muted-foreground md:text-[15px]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              ) : null}
              {section.bullets ? (
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
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
              Privacy Policy
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
