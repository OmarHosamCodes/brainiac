import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

import { BlockCheckbox } from "@/features/workspace/node/blocks/shared/block-checkbox";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import {
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyPanelClass,
} from "@/features/shared/agency-ui";
import { FISCAL_MONTHS, type FiscalMonth } from "@/features/resourcing/tenure-utils";

export type TenurePolicyDraft = {
  fiscalYearStartMonth: FiscalMonth;
  fiscalYearStartDay: string;
  quarterlyMinHours: string;
  penaltyMonths: string;
  internDurationMonths: string;
  internDurationWeeks: string;
  policyEffectiveFrom: string;
  enabled: boolean;
};

type AgencySettingsTenurePolicyProps = {
  policyDraft: TenurePolicyDraft;
  onPolicyDraftChange: (draft: TenurePolicyDraft) => void;
  isOwner: boolean;
  fiscalYearPreview: string;
  saving: boolean;
  onSave: () => void;
};

export function AgencySettingsTenurePolicy({
  policyDraft,
  onPolicyDraftChange,
  isOwner,
  fiscalYearPreview,
  saving,
  onSave,
}: AgencySettingsTenurePolicyProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  if (!isOwner) {
    return null;
  }

  return (
    <section className={cn(agencyPanelClass, "p-5 sm:p-6")}>
      <h3 className="text-sm font-bold text-highlighted">Team policy</h3>
      <p className="mt-1 text-sm text-muted">
        Each fiscal month runs from the start day through the day before the next period (UTC).
      </p>

      <form
        className="mt-5 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={agencyFormFieldClass}>
            <label className={agencyFormLabelClass}>Fiscal year starts</label>
            <BlockSelect
              value={String(policyDraft.fiscalYearStartMonth)}
              options={FISCAL_MONTHS.map((month) => ({
                label: month.label,
                value: String(month.value),
              }))}
              onValueChange={(value) =>
                onPolicyDraftChange({
                  ...policyDraft,
                  fiscalYearStartMonth: Number(value) as FiscalMonth,
                })
              }
            />
          </div>

          <div className={agencyFormFieldClass}>
            <label className={agencyFormLabelClass}>Start day</label>
            <Input
              type="number"
              min={1}
              max={31}
              value={policyDraft.fiscalYearStartDay}
              className="w-full max-w-[8rem]"
              onChange={(event) =>
                onPolicyDraftChange({ ...policyDraft, fiscalYearStartDay: event.target.value })
              }
            />
          </div>

          <div className={agencyFormFieldClass}>
            <label className={agencyFormLabelClass}>Min hours per quarter</label>
            <Input
              type="number"
              min={1}
              value={policyDraft.quarterlyMinHours}
              className="w-full max-w-[10rem]"
              onChange={(event) =>
                onPolicyDraftChange({ ...policyDraft, quarterlyMinHours: event.target.value })
              }
            />
          </div>

          <div className={agencyFormFieldClass}>
            <label className={agencyFormLabelClass}>Effective from</label>
            <Input
              type="date"
              value={policyDraft.policyEffectiveFrom}
              className="w-full max-w-[14rem]"
              onChange={(event) =>
                onPolicyDraftChange({ ...policyDraft, policyEffectiveFrom: event.target.value })
              }
            />
          </div>
        </div>

        <p className="text-sm text-muted">{fiscalYearPreview}</p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-muted">
            <BlockCheckbox
              checked={policyDraft.enabled}
              onCheckedChange={(checked) =>
                onPolicyDraftChange({ ...policyDraft, enabled: checked })
              }
              aria-label="Enable tenure tracking"
            />
            <span>Enable tenure tracking</span>
          </label>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save policy"}
          </Button>
        </div>

        <div className="border-t border-default pt-4">
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-highlighted",
              agencyFocusRingClass,
            )}
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            <ChevronRight
              className={cn("size-4 transition-transform", advancedOpen ? "rotate-90" : "")}
            />
            Advanced
          </button>

          {advancedOpen ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className={agencyFormFieldClass}>
                <label className={agencyFormLabelClass}>Intern duration (months)</label>
                <Input
                  type="number"
                  min={0}
                  value={policyDraft.internDurationMonths}
                  className="w-full max-w-[10rem]"
                  onChange={(event) =>
                    onPolicyDraftChange({
                      ...policyDraft,
                      internDurationMonths: event.target.value,
                    })
                  }
                />
              </div>

              <div className={agencyFormFieldClass}>
                <label className={agencyFormLabelClass}>Extra intern weeks</label>
                <Input
                  type="number"
                  min={0}
                  value={policyDraft.internDurationWeeks}
                  className="w-full max-w-[10rem]"
                  onChange={(event) =>
                    onPolicyDraftChange({ ...policyDraft, internDurationWeeks: event.target.value })
                  }
                />
              </div>

              <div className={cn(agencyFormFieldClass, "sm:col-span-2")}>
                <label className={agencyFormLabelClass}>Penalty per missed quarter (months)</label>
                <Input
                  type="number"
                  min={1}
                  value={policyDraft.penaltyMonths}
                  className="w-full max-w-[10rem]"
                  onChange={(event) =>
                    onPolicyDraftChange({ ...policyDraft, penaltyMonths: event.target.value })
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
      </form>
    </section>
  );
}
