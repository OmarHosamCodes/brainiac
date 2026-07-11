import { Link } from "react-router-dom";

import { MarketingBrandLockup } from "@/components/marketing/marketing-brand-lockup";
import { MarketingPageShell } from "@/components/marketing-page-shell";

type LegalSection = {
  id: string;
  title: string;
  intro?: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
};

type MarketingLegalLayoutProps = {
  title: string;
  description: string;
  effectiveDate: string;
  sections: readonly LegalSection[];
  crossLink: { label: string; to: string };
};

function LegalSectionContent({ section }: { section: LegalSection }) {
  return (
    <section id={section.id} className="scroll-mt-28 border-b border-border py-10 first:pt-0">
      <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
        {section.title}
      </h2>

      {section.intro ? (
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {section.intro}
        </p>
      ) : null}

      {section.paragraphs?.length ? (
        <div className="mt-4 max-w-2xl space-y-4 text-sm leading-7 text-muted-foreground md:text-[15px]">
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : null}

      {section.bullets?.length ? (
        <ul className="mt-5 max-w-2xl space-y-3 text-sm leading-7 text-muted-foreground md:text-[15px]">
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

export function MarketingLegalLayout({
  title,
  description,
  effectiveDate,
  sections,
  crossLink,
}: MarketingLegalLayoutProps) {
  return (
    <MarketingPageShell>
      <section className="relative w-full overflow-hidden bg-[var(--marketing-ink)] text-[var(--marketing-ink-foreground)]">
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-14 md:px-10 md:pt-28 md:pb-16 lg:px-16">
          <MarketingBrandLockup linkToHome className="mb-12 md:mb-16" />
          <h1 className="max-w-3xl text-4xl leading-[1.05] font-bold tracking-[-0.02em] text-balance md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--marketing-ink-muted)]">
            {description}
          </p>
          <p className="mt-6 text-sm text-[var(--marketing-ink-muted)]">
            Effective {effectiveDate}
          </p>
        </div>
        <div className="border-b border-[var(--marketing-ink-border)]" />
      </section>

      <section className="w-full bg-background">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20 lg:px-16">
          <div className="grid grid-cols-1 gap-y-8 md:grid-cols-12 md:gap-x-10">
            <nav className="hidden md:col-span-3 md:block">
              <p className="mb-4 text-sm font-semibold text-foreground">On this page</p>
              <ul className="space-y-2">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="border-t border-border md:col-span-8 md:col-start-5 md:border-t-0">
              {sections.map((section) => (
                <LegalSectionContent key={section.id} section={section} />
              ))}

              <div className="flex items-center gap-6 py-10 text-sm">
                <Link
                  to={crossLink.to}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crossLink.label}
                </Link>
                <span className="text-border">/</span>
                <Link
                  to="/"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
