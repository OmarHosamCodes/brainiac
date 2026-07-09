export type JourneyStepStatus = "planned" | "active" | "done" | "blocked";

export type JourneyLayoutPoint = {
  x: number;
  y: number;
};

export type JourneyLayout = {
  width: number;
  height: number;
  points: JourneyLayoutPoint[];
};

const LAYOUT_PADDING_X = 56;
const LAYOUT_PADDING_Y = 48;

function computeZigzagPoints(
  stepCount: number,
  width: number,
  height: number,
  paddingX: number,
  paddingY: number,
): JourneyLayoutPoint[] {
  const usableWidth = width - paddingX * 2;
  const midY = height / 2;
  const amplitude = (height - paddingY * 2) * 0.38;
  const points: JourneyLayoutPoint[] = [];

  for (let index = 0; index < stepCount; index += 1) {
    const t = stepCount <= 1 ? 0.5 : index / (stepCount - 1);
    points.push({
      x: paddingX + t * usableWidth,
      y: midY + (index % 2 === 0 ? -amplitude : amplitude),
    });
  }

  return points;
}

export function computeZigzagLayout(stepCount: number): JourneyLayout {
  const width = Math.max(640, stepCount * 120);
  const height = 220;
  return {
    width,
    height,
    points: computeZigzagPoints(stepCount, width, height, LAYOUT_PADDING_X, LAYOUT_PADDING_Y),
  };
}

/** Smaller zigzag for read-only embeds (e.g. task thread progress). */
export function computeCompactZigzagLayout(stepCount: number): JourneyLayout {
  const width = Math.max(480, stepCount * 96);
  const height = 140;
  const paddingX = 40;
  const paddingY = 24;
  return {
    width,
    height,
    points: computeZigzagPoints(stepCount, width, height, paddingX, paddingY),
  };
}

export function computeVerticalLayout(stepCount: number): JourneyLayout {
  const rowHeight = 72;
  const height = Math.max(160, stepCount * rowHeight + 32);
  const width = 280;
  const startY = 36;

  const points: JourneyLayoutPoint[] = [];
  for (let index = 0; index < stepCount; index += 1) {
    points.push({
      x: width / 2,
      y: startY + index * rowHeight,
    });
  }

  return { width, height, points };
}

export function buildCurvedSegmentPath(from: JourneyLayoutPoint, to: JourneyLayoutPoint): string {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
}

export function isJourneySegmentCompleted(nextStatus: JourneyStepStatus): boolean {
  return nextStatus !== "planned";
}

export function getJourneyStepNumber(
  steps: Array<{ id: string; stepKind: string }>,
  stepId: string,
): number | null {
  let number = 0;
  for (const step of steps) {
    if (step.stepKind === "start" || step.stepKind === "destination") continue;
    number += 1;
    if (step.id === stepId) return number;
  }
  return null;
}

export function isJourneyStepRemovable(stepKind: string): boolean {
  return stepKind === "milestone" || stepKind === "checkpoint";
}

export function isJourneyStepLabelEditable(stepKind: string): boolean {
  return stepKind === "milestone" || stepKind === "checkpoint";
}

export function isJourneyStepReorderable(stepKind: string): boolean {
  return stepKind === "milestone" || stepKind === "checkpoint";
}

export function buildReorderPayload(
  steps: Array<{ id: string; stepKind: string; sortOrder: number }>,
  orderedMiddleIds: string[],
): Array<{ id: string; sortOrder: number }> {
  const start = steps.find((step) => step.stepKind === "start");
  const destination = steps.find((step) => step.stepKind === "destination");
  const middleById = new Map(
    steps.filter((step) => isJourneyStepReorderable(step.stepKind)).map((step) => [step.id, step]),
  );

  const orderedMiddle = orderedMiddleIds
    .map((id) => middleById.get(id))
    .filter((step): step is (typeof steps)[number] => Boolean(step));

  const nextOrder: Array<{ id: string; sortOrder: number }> = [];
  let sortOrder = 0;

  if (start) {
    nextOrder.push({ id: start.id, sortOrder });
    sortOrder += 1;
  }

  for (const step of orderedMiddle) {
    if (step.sortOrder !== sortOrder) {
      nextOrder.push({ id: step.id, sortOrder });
    }
    sortOrder += 1;
  }

  if (destination) {
    if (destination.sortOrder !== sortOrder) {
      nextOrder.push({ id: destination.id, sortOrder });
    }
  }

  return nextOrder;
}
