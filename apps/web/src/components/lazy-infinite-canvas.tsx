import { forwardRef, lazy, Suspense } from "react";

import type { InfiniteCanvasHandle, InfiniteCanvasProps } from "@/components/infinite-canvas";
export type { InfiniteCanvasHandle } from "@/components/infinite-canvas";

const InfiniteCanvasLazy = lazy(async () => {
  const module = await import("@/components/infinite-canvas");
  return { default: module.InfiniteCanvas };
});

export const LazyInfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(
  function LazyInfiniteCanvas(props, ref) {
    return (
      <Suspense
        fallback={<div className="h-full w-full animate-pulse rounded-xl bg-elevated" aria-hidden />}
      >
        <InfiniteCanvasLazy {...props} ref={ref} />
      </Suspense>
    );
  },
);
