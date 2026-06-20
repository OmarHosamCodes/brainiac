import { CheckCircle } from "lucide-react";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { AppShellPage } from "@/components/app-shell-page";
import { useBilling } from "@/lib/queries/billing";
import {
  shellConfirmInClass,
  shellContentInClass,
  shellStaggerItemClass,
} from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

export function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const { refreshBillingState } = useBilling();

  const checkoutId = searchParams.get("checkout_id") ?? undefined;

  useEffect(() => {
    refreshBillingState();
  }, [refreshBillingState]);

  return (
    <AppShellPage title="Billing">
      <div className="flex h-full items-start justify-center overflow-y-auto bg-default px-4 pt-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md px-6 text-center">
        <div
          className={cn(
            "mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10",
            shellConfirmInClass,
          )}
        >
          <CheckCircle className="size-8 text-primary" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-highlighted">Pro is active</h1>
        <p className="mb-8 text-muted">Your subscription is active and billing has been updated.</p>

        {checkoutId ? (
          <p className="mb-6 text-xs text-muted">
            Checkout ID: <span className="font-mono">{checkoutId}</span>
          </p>
        ) : null}

        <div className={cn("flex flex-col gap-3", shellContentInClass)}>
          <Button asChild size="lg">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className={shellStaggerItemClass}
            style={{ "--stagger-i": 1 } as React.CSSProperties}
          >
            <Link to="/billing">View Billing Details</Link>
          </Button>
        </div>
      </div>
      </div>
    </AppShellPage>
  );
}
