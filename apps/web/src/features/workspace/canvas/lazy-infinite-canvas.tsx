import { forwardRef, lazy, Suspense } from "react";

import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import type {
  InfiniteCanvasHandle,
  InfiniteCanvasProps,
} from "@/features/workspace/canvas/infinite-canvas";
export type { InfiniteCanvasHandle } from "@/features/workspace/canvas/infinite-canvas";

const InfiniteCanvasLazy = lazy(async () => {
  const module = await import("@/features/workspace/canvas/infinite-canvas");
  return { default: module.InfiniteCanvas };
});

export const LazyInfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(
  function LazyInfiniteCanvas(props, ref) {
    return (
      <Suspense fallback={<LogoLoader placement="slot" label="Opening canvas" />}>
        <InfiniteCanvasLazy {...props} ref={ref} />
      </Suspense>
    );
  },
);
