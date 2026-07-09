import { Palette } from "lucide-react";

import { agencyEmptyPanelClass, agencySectionTitleClass } from "@/features/shared/agency-ui";

export function AgencySettingsColorsPane() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className={agencySectionTitleClass}>Project colors</h2>
        <p className="mt-1 text-sm text-muted">
          Each project gets a stable color, auto-assigned from a 12-hue palette.
        </p>
      </div>

      <div className={agencyEmptyPanelClass}>
        <Palette className="mx-auto size-6 text-muted" />
        <p className="mt-3 text-sm font-bold text-highlighted">Coming soon</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted">
          Once override ships, you will be able to lock a hue per project here. The palette is
          OKLCH-based and tuned for both light and dark themes.
        </p>
      </div>
    </div>
  );
}
