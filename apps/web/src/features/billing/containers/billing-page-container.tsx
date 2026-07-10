import { AppShellPage } from "@/features/app-shell/app-shell-page";
import { AppShellTopbarActions } from "@/features/app-shell/app-shell-topbar";

import { BillingPageActionsView, BillingPageView } from "../views/billing-page-view";
import { useBillingPage } from "../hooks/use-billing-page";

export function BillingPage() {
  const viewModel = useBillingPage();
  return (
    <AppShellPage slots={["actions"]}>
      <AppShellTopbarActions>
        <BillingPageActionsView viewModel={viewModel} />
      </AppShellTopbarActions>
      <BillingPageView viewModel={viewModel} />
    </AppShellPage>
  );
}
