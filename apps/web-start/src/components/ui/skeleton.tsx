import { cn } from "@/lib/utils";

export function Skeleton(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", props.className)} {...props} />;
}
