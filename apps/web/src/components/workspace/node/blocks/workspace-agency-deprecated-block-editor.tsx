import { ArrowRight, Info } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function WorkspaceAgencyDeprecatedBlockEditor() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4">
      <Info className="mt-0.5 size-5 shrink-0 text-amber-500" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">Agency tools have moved</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Time tracking and agency management now live on the dedicated Agency page.
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-3">
          <Link to="/agency">
            Open Agency
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
