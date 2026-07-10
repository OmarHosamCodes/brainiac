import {
  Blocks,
  BrainCircuit,
  Briefcase,
  LayoutGrid,
  Layers,
  Store,
  UserPlus,
  Users,
} from "lucide-react";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import type { BillingPageViewModel } from "@/features/billing/hooks/use-billing-page";
import {
  shellContentInClass,
  shellPageClass,
  shellStaggerItemClass,
} from "@/features/app-shell/app-shell-ui";
import { cn } from "@/lib/utils";

type BillingPageViewProps = {
  viewModel: BillingPageViewModel;
};

export function BillingPageView({ viewModel }: BillingPageViewProps) {
  const { isBooting, isPro, limits, subscriptionSummary } = viewModel;

  const limitItems = [
    { label: "Workspace Nodes", value: limits.workspaceNodes, icon: LayoutGrid },
    { label: "Blocks per Tab", value: limits.blocksPerTab, icon: Blocks },
    { label: "Tabs per Node", value: limits.tabsPerNode, icon: Layers },
    { label: "Teams", value: limits.teams, icon: Users },
    { label: "Team Members", value: limits.teamMembers, icon: UserPlus },
    {
      label: "AI Conversations",
      value: limits.aiConversations === -1 ? "Unlimited" : limits.aiConversations,
      icon: BrainCircuit,
    },
    {
      label: "Agency Ops",
      value: limits.agencyOps ? "Enabled" : "Disabled",
      icon: Briefcase,
    },
    {
      label: "Marketplace Publishing",
      value: limits.marketplacePublish ? "Enabled" : "Disabled",
      icon: Store,
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-default">
      <div className={cn(shellPageClass, "pt-4")}>
        {isBooting ? (
          <LogoLoader label="Loading billing" />
        ) : (
          <div className={shellContentInClass}>
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-3">
                      <h2 className="text-xl font-bold text-highlighted">
                        {isPro ? "Pro" : "Free"} Plan
                      </h2>
                      <Badge variant={isPro ? "default" : "secondary"}>
                        {isPro ? "Active" : "Current"}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">{subscriptionSummary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-bold text-highlighted">Your Plan Limits</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  {limitItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl bg-elevated p-3",
                          index < 7 && shellStaggerItemClass,
                        )}
                        style={
                          index < 7 ? ({ "--stagger-i": index } as React.CSSProperties) : undefined
                        }
                      >
                        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                          <Icon className="size-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="text-sm font-bold text-highlighted">{item.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export function BillingPageActionsView({ viewModel }: BillingPageViewProps) {
  if (viewModel.isBooting) return null;
  if (viewModel.showManageSubscription) {
    return (
      <Button variant="secondary" size="sm" onClick={viewModel.manageSubscription}>
        Manage subscription
      </Button>
    );
  }
  if (viewModel.showUpgrade) {
    return (
      <Button size="sm" onClick={viewModel.upgrade}>
        Upgrade to Pro
      </Button>
    );
  }
  return null;
}
