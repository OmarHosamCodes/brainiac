import { useEffect, useId, useRef } from "react";

import { cn } from "@/lib/utils";

/** ponytail: simplified topology vs full CodePen SVG; same dash/pulse technique, fewer paths */
const NEURAL_PATHS = [
  "M 80 200 C 120 160, 160 140, 200 120",
  "M 200 120 C 240 100, 280 90, 320 100",
  "M 320 100 C 360 110, 400 130, 440 160",
  "M 200 120 C 180 180, 170 240, 180 300",
  "M 200 120 C 220 180, 250 220, 290 250",
  "M 290 250 C 330 270, 370 280, 420 270",
  "M 180 300 C 220 320, 260 330, 300 320",
  "M 300 320 C 340 310, 380 290, 420 270",
  "M 120 200 C 140 240, 160 280, 180 300",
  "M 80 200 C 60 160, 50 120, 70 80",
  "M 70 80 C 110 60, 150 50, 200 120",
  "M 440 160 C 460 200, 470 240, 450 280",
  "M 450 280 C 400 300, 350 310, 300 320",
  "M 320 100 C 300 60, 280 40, 250 50",
  "M 250 50 C 200 55, 150 70, 120 120",
] as const;

const NEURAL_NODES: ReadonlyArray<{ cx: number; cy: number; r: number; delay: number }> = [
  { cx: 80, cy: 200, r: 4, delay: 0 },
  { cx: 200, cy: 120, r: 5, delay: -0.8 },
  { cx: 320, cy: 100, r: 4, delay: -1.2 },
  { cx: 440, cy: 160, r: 4, delay: -0.4 },
  { cx: 290, cy: 250, r: 3.5, delay: -1.6 },
  { cx: 180, cy: 300, r: 4, delay: -2 },
  { cx: 300, cy: 320, r: 4, delay: -1 },
  { cx: 420, cy: 270, r: 3.5, delay: -0.6 },
  { cx: 70, cy: 80, r: 3, delay: -2.4 },
  { cx: 250, cy: 50, r: 3, delay: -1.8 },
];

type NeuralCanvasArtifactProps = {
  className?: string;
};

export function NeuralCanvasArtifact({ className }: NeuralCanvasArtifactProps) {
  const maskId = useId();
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const run = () => {
      pathRefs.current.forEach((path) => {
        if (!path) return;
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
      });
    };

    const idle = window.requestIdleCallback ?? ((callback: IdleRequestCallback) => window.setTimeout(callback, 1));
    const idleId = idle(run);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idleId as number);
    };
  }, []);

  return (
    <div
      className={cn(
        "neural-artifact pointer-events-none absolute inset-0 overflow-hidden opacity-80",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 520 380"
        className="absolute top-1/2 left-1/2 h-[min(90vw,520px)] w-[min(90vw,520px)] -translate-x-1/2 -translate-y-1/2"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id={maskId} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id={`${maskId}-fade`}>
            <rect width="520" height="380" fill={`url(#${maskId})`} />
          </mask>
        </defs>
        <g mask={`url(#${maskId}-fade)`}>
          {NEURAL_PATHS.map((d, index) => (
            <path
              key={d}
              ref={(el) => {
                pathRefs.current[index] = el;
              }}
              d={d}
              className="neural-artifact__path neural-artifact__path--animate"
              style={{ animationDelay: `${(index % 5) * -0.6}s` }}
            />
          ))}
          {NEURAL_NODES.map((node) => (
            <circle
              key={`${node.cx}-${node.cy}`}
              cx={node.cx}
              cy={node.cy}
              r={node.r}
              className="neural-artifact__node neural-artifact__node--animate"
              style={{ animationDelay: `${node.delay}s` }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
