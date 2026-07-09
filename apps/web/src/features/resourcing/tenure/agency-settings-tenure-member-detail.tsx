import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

import { BlockCheckbox } from "@/components/workspace/node/blocks/shared/block-checkbox";
import { BlockSelect } from "@/components/workspace/node/blocks/shared/block-select";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Skeleton } from "@/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Textarea } from "@/ui/textarea";
import {
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyMetricClass,
  agencyPanelClass,
} from "@/features/shared/agency-ui";
import {
  FISCAL_MONTHS,
  type FiscalMonth,
  formatPeriodEndExclusive,
  formatTenureHours,
  formatUtcDate,
  tenureStatusClass,
  tenureStatusLabel,
} from "@/features/resourcing/tenure-utils";

type QuarterSummary = {
  fiscalYear: number;
  fiscalQuarter: number;
  label: string;
  periodStart: string | null;
  periodEnd: string | null;
  requiredHours: number;
  loggedHours: number;
  status: string;
  penaltyMonthsApplied: number;
};

type MemberDetail = {
  userEmail: string;
  internStart: string | null;
  internEnd: string | null;
  internDerived: boolean;
  rawTenureLabel: string;
  netTenureLabel: string;
  penaltyMonths: number;
  awaitingFirstEntry: boolean;
  currentQuarter: QuarterSummary | null;
  quarters: QuarterSummary[];
};

type ExemptionItem = {
  id: string;
  fiscalYear: number;
  fiscalQuarter: number;
  type: string;
  userName: string | null;
  userId: string | null;
};

export type TenureProfileDraft = {
  internStart: string;
  internEnd: string;
  internCountsTowardTenure: boolean;
  internExemptFromQuarterMin: boolean;
  notes: string;
};

export type TenureExemptionDraft = {
  type: "team_holiday" | "member_waiver" | "member_reduced_min" | "member_frozen_month";
  fiscalYear: string;
  fiscalQuarter: "1" | "2" | "3" | "4";
  userId: string;
  reducedMinHours: string;
  frozenMonth: FiscalMonth;
  reason: string;
};

type AgencySettingsTenureMemberDetailProps = {
  memberName: string;
  memberDetail: MemberDetail | null;
  loading: boolean;
  isOwner: boolean;
  exemptions: ExemptionItem[];
  profileDraft: TenureProfileDraft;
  onProfileDraftChange: (draft: TenureProfileDraft) => void;
  exemptionDraft: TenureExemptionDraft;
  onExemptionDraftChange: (draft: TenureExemptionDraft) => void;
  savingProfile: boolean;
  savingExemption: boolean;
  onClose: () => void;
  onSaveProfile: () => void;
  onAddExemption: () => void;
  onRemoveExemption: (exemptionId: string) => void;
};

type DetailTabId = "history" | "profile" | "exemptions";

export function AgencySettingsTenureMemberDetail({
  memberName,
  memberDetail,
  loading,
  isOwner,
  exemptions,
  profileDraft,
  onProfileDraftChange,
  exemptionDraft,
  onExemptionDraftChange,
  savingProfile,
  savingExemption,
  onClose,
  onSaveProfile,
  onAddExemption,
  onRemoveExemption,
}: AgencySettingsTenureMemberDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTabId>("history");
  const [exemptionFormOpen, setExemptionFormOpen] = useState(false);

  const detailTabs = useMemo(() => {
    const tabs: Array<{ id: DetailTabId; label: string }> = [
      { id: "history", label: "Quarter history" },
    ];
    if (isOwner) {
      tabs.push({ id: "profile", label: "Profile" });
      tabs.push({ id: "exemptions", label: "Exemptions" });
    }
    return tabs;
  }, [isOwner]);

  useEffect(() => {
    setActiveTab("history");
  }, [isOwner, memberName]);

  useEffect(() => {
    if (savingExemption) return;
    setExemptionFormOpen(false);
  }, [savingExemption]);

  const currentQuarterPct = useMemo(() => {
    const quarter = memberDetail?.currentQuarter;
    if (!quarter || quarter.requiredHours <= 0) return 0;
    return Math.min(100, Math.round((quarter.loggedHours / quarter.requiredHours) * 100));
  }, [memberDetail?.currentQuarter]);

  const internWindowLabel = useMemo(() => {
    if (!memberDetail) return "—";
    if (memberDetail.internStart && memberDetail.internEnd) {
      const start = new Date(memberDetail.internStart).toLocaleDateString();
      const end = new Date(memberDetail.internEnd).toLocaleDateString();
      return memberDetail.internDerived ? `${start} – ${end} (computed)` : `${start} – ${end}`;
    }
    if (memberDetail.awaitingFirstEntry) return "Awaiting first tracked entry";
    return "Starts on first tracked entry";
  }, [memberDetail]);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="size-4" />
          Back to roster
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : memberDetail ? (
        <>
          <div className={cn(agencyPanelClass, "p-5 sm:p-6")}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold text-highlighted">{memberName}</h3>
                <p className="mt-0.5 truncate text-sm text-muted">{memberDetail.userEmail}</p>
              </div>
              {memberDetail.currentQuarter ? (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border border-default bg-muted px-3 py-1 text-xs font-bold",
                    tenureStatusClass(memberDetail.currentQuarter.status),
                  )}
                >
                  {tenureStatusLabel(memberDetail.currentQuarter.status)}
                </span>
              ) : null}
            </div>

            <dl className="mt-5 grid gap-4 border-t border-default pt-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs font-semibold text-muted">Net tenure</dt>
                <dd className={cn(agencyMetricClass, "mt-1 text-base")}>
                  {memberDetail.netTenureLabel}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">Raw tenure</dt>
                <dd className={cn(agencyMetricClass, "mt-1 text-base")}>
                  {memberDetail.rawTenureLabel}
                  {memberDetail.penaltyMonths > 0 ? (
                    <span className="text-sm text-error"> −{memberDetail.penaltyMonths}m</span>
                  ) : null}
                </dd>
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <dt className="text-xs font-semibold text-muted">Intern window</dt>
                <dd className="mt-1 text-sm text-highlighted">{internWindowLabel}</dd>
              </div>
            </dl>

            {memberDetail.currentQuarter ? (
              <div className="mt-5 border-t border-default pt-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-highlighted">
                    {memberDetail.currentQuarter.label}
                  </p>
                  <p className={cn(agencyMetricClass, "text-sm")}>
                    {formatTenureHours(memberDetail.currentQuarter.loggedHours)} /{" "}
                    {formatTenureHours(memberDetail.currentQuarter.requiredHours)} h
                  </p>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={currentQuarterPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-200"
                    style={{ width: `${currentQuarterPct}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className={cn(agencyPanelClass, "overflow-hidden")}>
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                if (value === "history" || value === "profile" || value === "exemptions") {
                  setActiveTab(value);
                }
              }}
            >
              <div className="border-b border-default px-4 pt-3 sm:px-5">
                <TabsList>
                  {detailTabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id}>
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="p-4 sm:p-5">
                <TabsContent value="history">
                  {memberDetail.quarters.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted">
                      No quarter history yet.
                    </div>
                  ) : (
                    <ul className="divide-y divide-default">
                      {[...memberDetail.quarters].reverse().map((quarter) => (
                        <li
                          key={`${quarter.fiscalYear}-${quarter.fiscalQuarter}`}
                          className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-bold text-highlighted">
                              {quarter.label}
                            </p>
                            {quarter.periodStart && quarter.periodEnd ? (
                              <p className="mt-0.5 text-xs text-muted">
                                {formatUtcDate(quarter.periodStart)} –{" "}
                                {formatPeriodEndExclusive(quarter.periodEnd)}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span className={cn(agencyMetricClass, "text-muted")}>
                              {formatTenureHours(quarter.loggedHours)} /{" "}
                              {formatTenureHours(quarter.requiredHours)} h
                            </span>
                            <span className={cn("font-bold", tenureStatusClass(quarter.status))}>
                              {tenureStatusLabel(quarter.status)}
                            </span>
                            {quarter.penaltyMonthsApplied > 0 ? (
                              <span className="font-mono text-xs text-error">
                                −{quarter.penaltyMonthsApplied}m
                              </span>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent value="profile">
                  <div className="max-w-xl space-y-4">
                    <p className="text-sm text-muted">
                      Override intern dates and how intern time affects tenure and quarterly
                      minimums.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className={agencyFormFieldClass}>
                        <label className={agencyFormLabelClass}>Intern start override</label>
                        <Input
                          type="date"
                          value={profileDraft.internStart}
                          onChange={(event) =>
                            onProfileDraftChange({
                              ...profileDraft,
                              internStart: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className={agencyFormFieldClass}>
                        <label className={agencyFormLabelClass}>Intern end override</label>
                        <Input
                          type="date"
                          value={profileDraft.internEnd}
                          onChange={(event) =>
                            onProfileDraftChange({ ...profileDraft, internEnd: event.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-muted">
                        <BlockCheckbox
                          checked={profileDraft.internCountsTowardTenure}
                          onCheckedChange={(checked) =>
                            onProfileDraftChange({
                              ...profileDraft,
                              internCountsTowardTenure: checked,
                            })
                          }
                          aria-label="Intern period counts toward tenure"
                        />
                        <span>Intern period counts toward tenure</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-muted">
                        <BlockCheckbox
                          checked={profileDraft.internExemptFromQuarterMin}
                          onCheckedChange={(checked) =>
                            onProfileDraftChange({
                              ...profileDraft,
                              internExemptFromQuarterMin: checked,
                            })
                          }
                          aria-label="Intern period exempt from quarter minimum"
                        />
                        <span>Intern period exempt from quarter minimum</span>
                      </label>
                    </div>
                    <div className={agencyFormFieldClass}>
                      <label className={agencyFormLabelClass}>Notes</label>
                      <Textarea
                        rows={3}
                        value={profileDraft.notes}
                        onChange={(event) =>
                          onProfileDraftChange({ ...profileDraft, notes: event.target.value })
                        }
                      />
                    </div>
                    <Button size="sm" disabled={savingProfile} onClick={onSaveProfile}>
                      {savingProfile ? "Saving…" : "Save profile"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="exemptions">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-muted">
                        Waivers and adjustments for this member, plus team-wide holidays.
                      </p>
                      <Popover open={exemptionFormOpen} onOpenChange={setExemptionFormOpen}>
                        <PopoverTrigger asChild>
                          <Button size="sm">
                            <Plus className="size-4" />
                            Add exemption
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80">
                          <form
                            className="space-y-4"
                            onSubmit={(event) => {
                              event.preventDefault();
                              onAddExemption();
                            }}
                          >
                            <p className="text-sm font-bold text-highlighted">New exemption</p>
                            <div className={agencyFormFieldClass}>
                              <label className={agencyFormLabelClass}>Type</label>
                              <BlockSelect
                                value={exemptionDraft.type}
                                options={[
                                  { label: "Team holiday quarter", value: "team_holiday" },
                                  { label: "Member waiver", value: "member_waiver" },
                                  { label: "Reduced minimum", value: "member_reduced_min" },
                                  { label: "Frozen month", value: "member_frozen_month" },
                                ]}
                                onValueChange={(value) =>
                                  onExemptionDraftChange({
                                    ...exemptionDraft,
                                    type: value as TenureExemptionDraft["type"],
                                  })
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className={agencyFormFieldClass}>
                                <label className={agencyFormLabelClass}>Fiscal year</label>
                                <Input
                                  type="number"
                                  value={exemptionDraft.fiscalYear}
                                  onChange={(event) =>
                                    onExemptionDraftChange({
                                      ...exemptionDraft,
                                      fiscalYear: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className={agencyFormFieldClass}>
                                <label className={agencyFormLabelClass}>Quarter</label>
                                <BlockSelect
                                  value={exemptionDraft.fiscalQuarter}
                                  options={[
                                    { label: "Q1", value: "1" },
                                    { label: "Q2", value: "2" },
                                    { label: "Q3", value: "3" },
                                    { label: "Q4", value: "4" },
                                  ]}
                                  onValueChange={(value) =>
                                    onExemptionDraftChange({
                                      ...exemptionDraft,
                                      fiscalQuarter: value as TenureExemptionDraft["fiscalQuarter"],
                                    })
                                  }
                                />
                              </div>
                            </div>
                            {exemptionDraft.type === "member_reduced_min" ? (
                              <div className={agencyFormFieldClass}>
                                <label className={agencyFormLabelClass}>Reduced min hours</label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={exemptionDraft.reducedMinHours}
                                  onChange={(event) =>
                                    onExemptionDraftChange({
                                      ...exemptionDraft,
                                      reducedMinHours: event.target.value,
                                    })
                                  }
                                />
                              </div>
                            ) : null}
                            {exemptionDraft.type === "member_frozen_month" ? (
                              <div className={agencyFormFieldClass}>
                                <label className={agencyFormLabelClass}>Frozen month</label>
                                <BlockSelect
                                  value={String(exemptionDraft.frozenMonth)}
                                  options={FISCAL_MONTHS.map((month) => ({
                                    label: month.label,
                                    value: String(month.value),
                                  }))}
                                  onValueChange={(value) =>
                                    onExemptionDraftChange({
                                      ...exemptionDraft,
                                      frozenMonth: Number(value) as FiscalMonth,
                                    })
                                  }
                                />
                              </div>
                            ) : null}
                            <div className={agencyFormFieldClass}>
                              <label className={agencyFormLabelClass}>Reason</label>
                              <Input
                                value={exemptionDraft.reason}
                                onChange={(event) =>
                                  onExemptionDraftChange({
                                    ...exemptionDraft,
                                    reason: event.target.value,
                                  })
                                }
                              />
                            </div>
                            <Button type="submit" className="w-full" disabled={savingExemption}>
                              {savingExemption ? "Saving…" : "Save exemption"}
                            </Button>
                          </form>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {exemptions.length > 0 ? (
                      <ul className="divide-y divide-default">
                        {exemptions.map((exemption) => (
                          <li
                            key={exemption.id}
                            className="flex items-center justify-between gap-3 py-3 first:pt-0"
                          >
                            <div className="min-w-0 text-sm text-highlighted">
                              <p className="font-semibold">
                                FY{String(exemption.fiscalYear).slice(-2)} Q
                                {exemption.fiscalQuarter} · {exemption.type.replaceAll("_", " ")}
                              </p>
                              {exemption.type === "team_holiday" ? (
                                <p className="text-xs text-muted">Applies to all members</p>
                              ) : null}
                            </div>
                            {exemption.type !== "team_holiday" ? (
                              <button
                                type="button"
                                className={cn(
                                  "shrink-0 rounded-md p-1 text-dimmed hover:text-error",
                                  agencyFocusRingClass,
                                )}
                                aria-label="Remove exemption"
                                onClick={() => onRemoveExemption(exemption.id)}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="py-6 text-center text-sm text-muted">
                        No exemptions for this member.
                      </p>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </>
      ) : null}
    </section>
  );
}
