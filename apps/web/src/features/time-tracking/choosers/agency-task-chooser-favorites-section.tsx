import type { ReactNode } from "react";

type AgencyTaskChooserFavoritesSectionProps = {
  children: ReactNode;
};

export function AgencyTaskChooserFavoritesSection({
  children,
}: AgencyTaskChooserFavoritesSectionProps) {
  return (
    <section className="pb-2">
      <div className="px-2 py-1.5 text-[11px] font-semibold tracking-wide text-dimmed">
        Favorites
      </div>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}
