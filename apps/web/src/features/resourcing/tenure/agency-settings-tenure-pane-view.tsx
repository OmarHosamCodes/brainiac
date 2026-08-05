import { agencySectionTitleClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Skeleton } from "@/ui/skeleton";

import { AgencyPeopleDepartments } from "./agency-people-departments";
import { AgencyPeopleDirectory } from "./agency-people-directory";
import { AgencyPeopleGuidedMember } from "./agency-people-guided-member";
import { AgencySettingsTenurePolicy } from "./agency-settings-tenure-policy";
import { type AgencySettingsTenurePaneViewModel } from "./hooks/use-agency-settings-tenure-pane";

export function AgencySettingsTenurePaneView({
  viewModel,
}: {
  viewModel: AgencySettingsTenurePaneViewModel;
}) {
  if (viewModel.isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading people">
        <div className="space-y-2">
          <h1 className={cn(agencySectionTitleClass)}>People</h1>
          <Skeleton className="h-4 w-72 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-36 w-full rounded-[2rem]" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-44 w-full rounded-[2rem]" />
          <Skeleton className="h-44 w-full rounded-[2rem]" />
          <Skeleton className="h-44 w-full rounded-[2rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {viewModel.selectedUserId ? (
        <AgencyPeopleGuidedMember
          userId={viewModel.selectedUserId}
          userName={viewModel.selectedMemberName}
          userEmail={viewModel.selectedMemberEmail}
          userAvatar={viewModel.selectedMemberAvatar}
          role={viewModel.roleDraft}
          joinedLabel={viewModel.selectedJoinedLabel}
          completionPercent={viewModel.guidedCompletionPercent}
          steps={viewModel.guidedSteps}
          activeStepId={viewModel.activeStepId}
          onActiveStepChange={viewModel.setActiveStepId}
          onBack={viewModel.clearSelectedMember}
          canEditHr={viewModel.canEditHr}
          canEditRates={viewModel.isOwner}
          canEditTenure={viewModel.isOwner}
          canEditRole={viewModel.isOwner}
          departments={viewModel.departments}
          hrDraft={viewModel.hrDraft}
          onHrDraftChange={viewModel.setHrDraft}
          rateDraft={viewModel.rateDraft}
          onRateDraftChange={viewModel.setRateDraft}
          tenureDraft={viewModel.tenureDraft}
          onTenureDraftChange={viewModel.setTenureDraft}
          onRoleChange={viewModel.setRoleDraft}
          exemptions={viewModel.memberExemptions}
          exemptionDraft={viewModel.exemptionDraft}
          onExemptionDraftChange={viewModel.setExemptionDraft}
          savingExemption={viewModel.savingExemption}
          onAddExemption={() => viewModel.addExemption()}
          onRemoveExemption={(exemptionId) => void viewModel.removeExemption(exemptionId)}
          saving={viewModel.savingStep}
          onSaveStep={() => void viewModel.saveActiveStep()}
          onPrevious={viewModel.goPreviousStep}
          onNext={() => void viewModel.goNextStep()}
          stepIndex={viewModel.stepIndex}
          stepCount={viewModel.stepCount}
          isLoading={viewModel.loadingSelected}
        />
      ) : (
        <AgencyPeopleDirectory
          policyEnabled={viewModel.policyEnabled}
          policyEffectiveLabel={viewModel.policyEffectiveLabel}
          quarterlyMinHours={viewModel.quarterlyMinHours}
          requiredDailyHours={viewModel.requiredDailyHours}
          weekStartLabel={viewModel.weekStartLabel}
          departmentCount={viewModel.departmentCount}
          memberCount={viewModel.memberCount}
          attentionCount={viewModel.attentionCount}
          cards={viewModel.directoryCards}
          canReviewDefaults
          onReviewDefaults={() => viewModel.setDefaultsOpen(true)}
          onSelectMember={viewModel.selectMember}
          isLoadError={viewModel.isSummaryError}
          isStaleLoadError={viewModel.isSummaryStaleError}
          loadErrorMessage={viewModel.summaryErrorMessage}
          onRetryLoad={viewModel.retrySummary}
        />
      )}

      <Dialog open={viewModel.defaultsOpen} onOpenChange={viewModel.setDefaultsOpen}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-border border-b px-6 py-4">
            <DialogTitle>Team defaults</DialogTitle>
            <DialogDescription>
              Work schedule, tenure policy, and department catalog for the team.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(70vh,36rem)] space-y-8 overflow-y-auto px-6 py-5">
            <AgencyPeopleDepartments
              departments={viewModel.departments}
              assignedDepartmentIds={viewModel.assignedDepartmentIds}
              canEdit={viewModel.isOwner}
              onCreate={viewModel.addDepartment}
              onRename={viewModel.renameDepartment}
              onDelete={viewModel.removeDepartment}
            />
            <AgencySettingsTenurePolicy
              policyDraft={viewModel.policyDraft}
              onPolicyDraftChange={viewModel.setPolicyDraft}
              isOwner={viewModel.isOwner}
              fiscalYearPreview={viewModel.fiscalYearPreview}
              saving={viewModel.savingPolicy}
              onSave={() => void viewModel.savePolicy()}
              embedded
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
