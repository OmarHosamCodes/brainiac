import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type Point = { x: number; y: number };

type SpectrumBeam = {
  color: string;
  glow: string;
  pEnd: Point;
};

type Geometry = {
  tri: [Point, Point, Point];
  pIn: Point;
  pFace1: Point;
  pFace2: Point;
  spectrum: SpectrumBeam[];
};

const DUR_IN = 800;
const DUR_INT = 200;
const DUR_OUT = 1500;
const DUR_PAUSE = 2200;
const CYCLE_MS = DUR_IN + DUR_INT + DUR_OUT + DUR_PAUSE;

const clamp = (val: number) => Math.max(0, Math.min(1, val));

/** ponytail: emerald-leaning spectrum vs full rainbow; calmer glow for marketing register */
const SPECTRUM_COLORS: ReadonlyArray<{ color: string; glow: string; slope: number }> = [
  { color: "oklch(0.78 0.12 25 / 0.55)", glow: "oklch(0.78 0.12 25 / 0.25)", slope: 0.02 },
  { color: "oklch(0.82 0.1 85 / 0.5)", glow: "oklch(0.82 0.1 85 / 0.22)", slope: 0.06 },
  { color: "oklch(0.78 0.14 162 / 0.7)", glow: "oklch(0.72 0.17 162 / 0.35)", slope: 0.1 },
  { color: "oklch(0.75 0.12 195 / 0.55)", glow: "oklch(0.75 0.12 195 / 0.25)", slope: 0.14 },
  { color: "oklch(0.72 0.1 250 / 0.45)", glow: "oklch(0.72 0.1 250 / 0.2)", slope: 0.18 },
];

function calculateGeometry(w: number, h: number): Geometry {
  const cx = w / 2;
  const cy = h / 2;
  const side = Math.min(w, h) * 0.42;
  const hTri = (side * Math.sqrt(3)) / 2;

  const tri: [Point, Point, Point] = [
    { x: cx, y: cy - hTri / 2 },
    { x: cx + side / 2, y: cy + hTri / 2 },
    { x: cx - side / 2, y: cy + hTri / 2 },
  ];

  const t1 = 0.45;
  const pFace1 = {
    x: tri[0].x * (1 - t1) + tri[2].x * t1,
    y: tri[0].y * (1 - t1) + tri[2].y * t1,
  };

  const t2 = 0.65;
  const pFace2 = {
    x: tri[0].x * (1 - t2) + tri[1].x * t2,
    y: tri[0].y * (1 - t2) + tri[1].y * t2,
  };

  const pIn = {
    x: -80,
    y: pFace1.y - (pFace1.x + 80) * 0.06,
  };

  const spectrum = SPECTRUM_COLORS.map((spec) => ({
    color: spec.color,
    glow: spec.glow,
    pEnd: {
      x: w + 80,
      y: pFace2.y + (w + 80 - pFace2.x) * spec.slope,
    },
  }));

  return { tri, pIn, pFace1, pFace2, spectrum };
}

type PrismDispersionArtifactProps = {
  className?: string;
};

export function PrismDispersionArtifact({ className }: PrismDispersionArtifactProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let geometry: Geometry | null = null;
    let frameId = 0;
    let startTime: number | null = null;

    function resize() {
      const rect = container!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      geometry = calculateGeometry(w, h);
    }

    function drawGrid() {
      ctx!.save();
      ctx!.strokeStyle = "rgba(255, 255, 255, 0.025)";
      ctx!.lineWidth = 1;
      const gridSize = 48;
      ctx!.beginPath();
      for (let x = 0; x < w; x += gridSize) {
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, h);
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx!.moveTo(0, y);
        ctx!.lineTo(w, y);
      }
      ctx!.stroke();
      ctx!.restore();
    }

    function drawTriangle(tri: [Point, Point, Point]) {
      ctx!.save();
      ctx!.strokeStyle = "rgba(255, 255, 255, 0.28)";
      ctx!.lineWidth = 1.25;
      ctx!.beginPath();
      ctx!.moveTo(tri[0].x, tri[0].y);
      ctx!.lineTo(tri[1].x, tri[1].y);
      ctx!.lineTo(tri[2].x, tri[2].y);
      ctx!.closePath();
      ctx!.stroke();
      ctx!.fillStyle = "rgba(255, 255, 255, 0.012)";
      ctx!.fill();
      ctx!.restore();
    }

    function drawGlowingLine(
      p1: Point,
      p2: Point,
      progress: number,
      coreColor: string,
      glowColor: string,
      baseWidth: number,
      pulseAmount: number,
    ) {
      if (progress <= 0) return;

      const ex = p1.x + (p2.x - p1.x) * progress;
      const ey = p1.y + (p2.y - p1.y) * progress;

      ctx!.save();
      ctx!.lineCap = "round";
      ctx!.globalCompositeOperation = "screen";

      const layers = [
        { width: baseWidth * 5, alpha: 0.1 * pulseAmount, blur: 16 },
        { width: baseWidth * 2.5, alpha: 0.22 * pulseAmount, blur: 8 },
        { width: baseWidth * 1.25, alpha: 0.5 * pulseAmount, blur: 4 },
        { width: baseWidth, alpha: 0.9, blur: 0, isCore: true },
      ];

      for (const layer of layers) {
        ctx!.beginPath();
        ctx!.moveTo(p1.x, p1.y);
        ctx!.lineTo(ex, ey);
        ctx!.strokeStyle = layer.isCore ? coreColor : glowColor;
        ctx!.lineWidth = layer.width;
        ctx!.globalAlpha = layer.alpha;
        ctx!.shadowColor = glowColor;
        ctx!.shadowBlur = layer.blur;
        ctx!.stroke();
      }

      ctx!.restore();
    }

    function drawFrame(elapsed: number, time: number) {
      if (!geometry) return;

      const { tri, pIn, pFace1, pFace2, spectrum } = geometry;
      const cycleElapsed = reducedMotion ? DUR_IN + DUR_INT + DUR_OUT : elapsed % CYCLE_MS;

      ctx!.clearRect(0, 0, w, h);
      drawGrid();
      drawTriangle(tri);

      const progIn = clamp(cycleElapsed / DUR_IN);
      const progInt = clamp((cycleElapsed - DUR_IN) / DUR_INT);
      const progOut = clamp((cycleElapsed - DUR_IN - DUR_INT) / DUR_OUT);
      const shimmer = reducedMotion ? 1 : 1 + 0.08 * Math.sin(time / 280);

      drawGlowingLine(pIn, pFace1, progIn, "rgba(255,255,255,0.9)", "rgba(255,255,255,0.35)", 1.75, shimmer);

      if (progInt > 0) {
        drawGlowingLine(
          pFace1,
          pFace2,
          progInt,
          "rgba(255,255,255,0.35)",
          "rgba(255,255,255,0.2)",
          1,
          shimmer * 0.5,
        );
      }

      if (progOut > 0) {
        ctx!.save();
        ctx!.globalCompositeOperation = "screen";
        ctx!.beginPath();
        ctx!.arc(pFace2.x, pFace2.y, 3.5 * progOut, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(255,255,255,0.85)";
        ctx!.shadowColor = "rgba(255,255,255,0.5)";
        ctx!.shadowBlur = 12;
        ctx!.fill();
        ctx!.restore();

        for (const spec of spectrum) {
          drawGlowingLine(pFace2, spec.pEnd, progOut, spec.color, spec.glow, 1.5, shimmer);
        }
      }
    }

    function animate(time: number) {
      if (!startTime) startTime = time;
      drawFrame(time - startTime, time);
      frameId = requestAnimationFrame(animate);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 50% 50%, transparent 20%, var(--marketing-ink) 85%)",
        }}
      />
    </div>
  );
}
