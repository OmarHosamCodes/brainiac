import { cn } from "@/lib/utils";

type LogoLoaderProps = {
  fullScreen?: boolean;
  label?: string;
};

export function LogoLoader({ fullScreen = false, label = "Loading" }: LogoLoaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullScreen ? "fixed inset-0 z-50 bg-default" : "min-h-0 w-full flex-1",
      )}
      aria-busy="true"
      aria-label={label}
    >
      <img
        src="/logo-animation.svg"
        alt=""
        className="size-20 select-none"
        draggable={false}
      />
    </div>
  );
}
