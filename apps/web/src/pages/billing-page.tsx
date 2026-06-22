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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShellPage } from "@/components/app-shell-page";
import { AppShellHeaderActions } from "@/components/app-shell-header-slots";
import { useBilling } from "@/lib/queries/billing";
import {
  shellContentInClass,
  shellPageClass,
  shellStaggerItemClass,
} from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

export function BillingPage() {
  const { isPro, subscription, limits, checkout, openPortal, billingQuery } = useBilling();

  const formattedRenewalDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const isLifetimeSubscription = Boolean(subscription?.isLifetime);
  const showManageSubscription = isPro && !isLifetimeSubscription && !billingQuery.isPending;
  const showUpgrade = !isPro && !billingQuery.isPending;

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
    <AppShellPage title="Billing" slots={["actions"]}>
      <div className="h-full overflow-y-auto bg-default">
        <AppShellHeaderActions>
          {showManageSubscription ? (
            <Button variant="secondary" size="sm" onClick={() => void openPortal()}>
              Manage subscription
            </Button>
          ) : showUpgrade ? (
            <Button size="sm" onClick={() => void checkout("pro")}>
              Upgrade to Pro
            </Button>
          ) : null}
        </AppShellHeaderActions>

        <div className={cn(shellPageClass, "pt-4")}>
          {billingQuery.isPending ? (
            <Skeleton className="h-48 w-full rounded-[32px]" />
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

                      {isLifetimeSubscription ? (
                        <p className="text-sm text-muted-foreground">Lifetime access</p>
                      ) : subscription ? (
                        <p className="text-sm text-muted-foreground">
                          {subscription.status === "active" ? "Renews" : "Ends"}{" "}
                          {formattedRenewalDate}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No active subscription</p>
                      )}
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
                            index < 7
                              ? ({ "--stagger-i": index } as React.CSSProperties)
                              : undefined
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
    </AppShellPage>
  );
}
