import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { agencyErrorPanelClass } from "@/lib/utils/agency-ui";

type AgencyWorkSurfaceErrorViewProps = {
  message: string;
  onRetry: () => void;
};

export function AgencyWorkSurfaceErrorView({
  message,
  onRetry,
}: AgencyWorkSurfaceErrorViewProps) {
  return (
    <div className={agencyErrorPanelClass} role="alert">
      <AlertTriangle className="mx-auto size-5 text-error" />
      <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load work data.</p>
      <p className="mt-1 text-xs text-muted">{message}</p>
      <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
