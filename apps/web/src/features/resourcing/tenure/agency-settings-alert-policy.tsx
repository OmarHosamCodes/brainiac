import { useId } from "react";

import { agencyFormLabelClass } from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

export type AlertPolicyDraft = {
  abnormalDayEnabled: boolean;
  abnormalDayExtraHours: string;
  monthPaceEnabled: boolean;
  monthPacePercent: string;
  quarterPaceEnabled: boolean;
  quarterPacePercent: string;
  wasteSpikeEnabled: boolean;
  wasteSpikePercent: string;
};

export function emptyAlertPolicyDraft(): AlertPolicyDraft {
  return {
    abnormalDayEnabled: true,
    abnormalDayExtraHours: "4",
    monthPaceEnabled: true,
    monthPacePercent: "85",
    quarterPaceEnabled: true,
    quarterPacePercent: "85",
    wasteSpikeEnabled: true,
    wasteSpikePercent: "20",
  };
}

const DETECTORS = [
  {
    enableKey: "abnormalDayEnabled",
    valueKey: "abnormalDayExtraHours",
    label: "Day hours",
    hint: "h over required",
    min: 0,
    max: 24,
    suffix: "h",
  },
  {
    enableKey: "monthPaceEnabled",
    valueKey: "monthPacePercent",
    label: "Month pace",
    hint: "% of month min",
    min: 1,
    max: 100,
    suffix: "%",
  },
  {
    enableKey: "quarterPaceEnabled",
    valueKey: "quarterPacePercent",
    label: "Quarter pace",
    hint: "% of quarter min",
    min: 1,
    max: 100,
    suffix: "%",
  },
  {
    enableKey: "wasteSpikeEnabled",
    valueKey: "wasteSpikePercent",
    label: "Waste",
    hint: "% of logged time",
    min: 1,
    max: 100,
    suffix: "%",
  },
] as const;

type AgencySettingsAlertPolicyProps = {
  policyDraft: AlertPolicyDraft;
  onPolicyDraftChange: (draft: AlertPolicyDraft) => void;
  isOwner: boolean;
  saving: boolean;
  onSave: () => void;
};

export function AgencySettingsAlertPolicy({
  policyDraft,
  onPolicyDraftChange,
  isOwner,
  saving,
  onSave,
}: AgencySettingsAlertPolicyProps) {
  const idPrefix = useId();

  return (
    <section>
      <h3 className="text-sm font-bold text-highlighted">Profile alerts</h3>
      <p className="text-muted mt-1 text-sm">
        {isOwner
          ? "Turn each detector on and set one threshold. Day hours sits on top of required daily hours above."
          : "Read-only detector settings. Ask an owner to change alerts."}
      </p>

      {isOwner ? (
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <ul className="space-y-3">
            {DETECTORS.map((detector) => {
              const enableId = `${idPrefix}-${detector.enableKey}`;
              const valueId = `${idPrefix}-${detector.valueKey}`;
              const enabled = policyDraft[detector.enableKey];
              return (
                <li
                  key={detector.enableKey}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2"
                >
                  <div className="flex min-w-[8.5rem] items-center gap-2">
                    <Checkbox
                      id={enableId}
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        onPolicyDraftChange({
                          ...policyDraft,
                          [detector.enableKey]: checked === true,
                        })
                      }
                    />
                    <Label
                      htmlFor={enableId}
                      className="cursor-pointer text-sm font-semibold text-muted"
                    >
                      {detector.label}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id={valueId}
                      type="number"
                      min={detector.min}
                      max={detector.max}
                      value={policyDraft[detector.valueKey]}
                      disabled={!enabled}
                      className="w-16"
                      aria-label={detector.hint}
                      onChange={(event) =>
                        onPolicyDraftChange({
                          ...policyDraft,
                          [detector.valueKey]: event.target.value,
                        })
                      }
                    />
                    <Label htmlFor={valueId} className={agencyFormLabelClass}>
                      {detector.hint}
                    </Label>
                  </div>
                </li>
              );
            })}
          </ul>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save alerts"}
          </Button>
        </form>
      ) : (
        <dl className="mt-4 grid gap-3 text-sm">
          {DETECTORS.map((detector) => (
            <div key={detector.enableKey} className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">{detector.label}</dt>
              <dd className="text-highlighted">
                {policyDraft[detector.enableKey]
                  ? `On · ${policyDraft[detector.valueKey]}${detector.suffix}`
                  : "Off"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
