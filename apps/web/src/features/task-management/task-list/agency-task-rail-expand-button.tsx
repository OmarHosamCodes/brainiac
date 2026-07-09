import { AgencyTaskRailRingButton } from "@/features/task-management/task-list/agency-task-rail-ring-button";

type AgencyTaskRailExpandButtonProps = {
  activeCount: number | null;
  doneCount: number | null;
  totalCount: number | null;
  onClick: () => void;
};

export function AgencyTaskRailExpandButton({
  activeCount,
  doneCount,
  totalCount,
  onClick,
}: AgencyTaskRailExpandButtonProps) {
  const ariaLabel =
    activeCount === null
      ? "Expand task list"
      : `Expand task list, ${activeCount} open ${activeCount === 1 ? "task" : "tasks"}`;

  return (
    <AgencyTaskRailRingButton
      activeCount={activeCount}
      doneCount={doneCount}
      totalCount={totalCount}
      ariaLabel={ariaLabel}
      onClick={onClick}
    />
  );
}
