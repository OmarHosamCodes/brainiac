import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type WorkspaceBoardStatusProps = {
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
};

export function WorkspaceBoardStatus({
  isLoading = false,
  isError = false,
  error = null,
  isEmpty = false,
}: WorkspaceBoardStatusProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error?.message || "Failed to load workspace. Please refresh and try again."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3 max-w-md">
          <div className="text-4xl">📝</div>
          <h3 className="font-semibold">No nodes yet</h3>
          <p className="text-sm text-muted-foreground">
            Click on the canvas or use the Add button to create your first node.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export function WorkspaceBoardSkeleton() {
  return (
    <div className="space-y-4 p-8">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-48 rounded-lg" />
      ))}
    </div>
  );
}
