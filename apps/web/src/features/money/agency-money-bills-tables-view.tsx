import { type KeyboardEvent, type ReactNode } from "react";

import {
  moneyBillComposeHueId,
  type MoneyBillComposeDisplayRow,
  type MoneyBillPersonGroup,
} from "@/features/billing/money-bill-obligation-rows";
import {
  moneyBillGroupCarryCount,
  moneyBillGroupPeriodLabel,
  moneyBillTableShowsWaste,
} from "@/features/billing/money-bills-table-columns";
import {
  moneyBillInitials,
  type MoneyBillAdjustmentRow,
} from "@/features/billing/money-bills-rows";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { projectHueStyle } from "@/features/shared/project-palette";
import { Badge } from "@/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table";
import { cn } from "@/lib/utils";

type SalaryPoolTableViewModel = {
  pool: {
    totalLabel: string;
    paidLabel: string;
    remainingLabel: string;
    remainingAmount: number;
  } | null;
};

type AgencyMoneyBillsTablesViewProps = {
  clientGroups: readonly MoneyBillPersonGroup[];
  teamGroups: readonly MoneyBillPersonGroup[];
  adjustments: readonly MoneyBillAdjustmentRow[];
  salaryPool: SalaryPoolTableViewModel;
  searchTerm: string;
  isMutationPending: boolean;
  onOpenRow: (row: MoneyBillComposeDisplayRow) => void;
  onOpenParty: (row: MoneyBillPersonGroup) => void;
  onOpenSalaryPool: () => void;
};

const tableWrapperClass = "overflow-x-auto rounded-dense border border-default/55 bg-default";
const numericCellClass = "whitespace-nowrap text-right font-mono tabular-nums";

function BillsTableHeader({ columns }: { columns: string[] }) {
  return (
    <TableHeader className="border-b border-default/50">
      <TableRow>
        {columns.map((column) => (
          <TableHead
            key={column}
            scope="col"
            className={
              ["Total", "Received", "Paid", "Waste", "Remaining", "Amount"].includes(column)
                ? "w-32 text-right"
                : undefined
            }
          >
            {column}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

function MoneyCell({
  label,
  highlighted = false,
  remainingAmount,
}: {
  label: string;
  highlighted?: boolean;
  remainingAmount?: number;
}) {
  const tone =
    remainingAmount !== undefined && remainingAmount > 0
      ? "text-warning"
      : highlighted
        ? "text-highlighted"
        : "text-muted";
  return <TableCell className={cn(numericCellClass, tone)}>{label}</TableCell>;
}

function BillClientMark({ title, hueId }: { title: string; hueId: string }) {
  return (
    <span
      className="relative flex size-8 shrink-0 items-center justify-center rounded-xl border border-default bg-[var(--project-hue-soft)] text-[0.6875rem] font-semibold tracking-wide text-[var(--project-hue)] dark:bg-[var(--project-hue-soft-dark)] dark:text-[var(--project-hue-dark)]"
      style={projectHueStyle(hueId)}
      aria-hidden
    >
      {moneyBillInitials(title)}
      <span
        className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-[var(--project-hue)] ring-2 ring-default dark:bg-[var(--project-hue-dark)]"
        aria-hidden
      />
    </span>
  );
}

function BillStatusBadge({ label }: { label: string }) {
  const variant = label === "Paid" ? "success" : label === "Outstanding" ? "warning" : "outline";
  return <Badge variant={variant}>{label}</Badge>;
}

function groupStatusLabel(group: MoneyBillPersonGroup): string {
  const firstStatus = group.lines[0]?.statusLabel ?? "Ready";
  return group.lines.every((line) => line.statusLabel === firstStatus) ? firstStatus : "Mixed";
}

function CarryCell({ group }: { group: MoneyBillPersonGroup }) {
  const carryCount = moneyBillGroupCarryCount(group);
  return carryCount > 0 ? (
    <Badge variant="outline" className="gap-1 border-default text-muted">
      Prior
      <span className="font-mono tabular-nums">{carryCount}</span>
    </Badge>
  ) : null;
}

function InteractiveBillRow({
  label,
  onOpen,
  children,
  className,
}: {
  label: string;
  onOpen: () => void;
  children: ReactNode;
  className?: string;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen();
  }

  return (
    <TableRow
      tabIndex={0}
      aria-label={label}
      className={cn(
        "cursor-pointer border-b border-default transition-colors last:border-b-0 hover:bg-elevated/35 focus-visible:bg-elevated/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
        className,
      )}
      onClick={onOpen}
      onKeyDown={onKeyDown}
    >
      {children}
    </TableRow>
  );
}

function PartyCell({
  group,
  searchTerm,
  onOpenParty,
}: {
  group: MoneyBillPersonGroup;
  searchTerm: string;
  onOpenParty: (row: MoneyBillPersonGroup) => void;
}) {
  const hueId = moneyBillComposeHueId(group);

  return (
    <TableCell>
      <div className="flex min-w-48 items-center gap-2.5">
        {group.party === "team" ? (
          <AgencyMemberAvatar
            name={group.title}
            userId={group.userId ?? group.id}
            avatarUrl={group.userAvatar}
            size="md"
          />
        ) : (
          <BillClientMark title={group.title} hueId={hueId ?? group.id} />
        )}
        <button
          type="button"
          className={cn(
            "min-w-0 truncate rounded-sm text-left font-medium text-highlighted hover:underline",
            agencyFocusRingClass,
          )}
          onClick={(event) => {
            event.stopPropagation();
            onOpenParty(group);
          }}
          aria-label={`Open ${group.title}`}
        >
          <AgencySearchHighlight text={group.title} query={searchTerm} />
        </button>
      </div>
    </TableCell>
  );
}

function PersonBillsTable({
  party,
  groups,
  salaryPool,
  searchTerm,
  onOpenRow,
  onOpenParty,
  onOpenSalaryPool,
}: {
  party: "client" | "team";
  groups: readonly MoneyBillPersonGroup[];
  salaryPool: SalaryPoolTableViewModel;
  searchTerm: string;
  onOpenRow: (row: MoneyBillComposeDisplayRow) => void;
  onOpenParty: (row: MoneyBillPersonGroup) => void;
  onOpenSalaryPool: () => void;
}) {
  const isTeam = party === "team";
  const showWaste = moneyBillTableShowsWaste(groups);
  const partyHeading = isTeam ? "Member" : "Party";
  const receivedHeading = isTeam ? "Paid" : "Received";

  return (
    <div className={tableWrapperClass}>
      <Table className="min-w-[48rem]" aria-label={`${isTeam ? "Team" : "Client"} bill balances`}>
        <BillsTableHeader
          columns={[
            partyHeading,
            "Status",
            "Period",
            "Carry",
            "Total",
            receivedHeading,
            ...(showWaste ? ["Waste"] : []),
            "Remaining",
          ]}
        />
        <TableBody>
          {groups.map((group) => (
            <InteractiveBillRow
              key={group.id}
              label={`${group.title}. Remaining ${group.remainingLabel}.`}
              onOpen={() => onOpenRow(group)}
            >
              <PartyCell group={group} searchTerm={searchTerm} onOpenParty={onOpenParty} />
              <TableCell>
                <BillStatusBadge label={groupStatusLabel(group)} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted">
                {moneyBillGroupPeriodLabel(group)}
              </TableCell>
              <TableCell>
                <CarryCell group={group} />
              </TableCell>
              <MoneyCell label={group.totalLabel} highlighted />
              <MoneyCell label={group.receivedLabel} />
              {showWaste ? <MoneyCell label={group.wasteLabel} /> : null}
              <MoneyCell label={group.remainingLabel} remainingAmount={group.remainingAmount} />
            </InteractiveBillRow>
          ))}
        </TableBody>
        {isTeam && salaryPool.pool ? (
          <TableFooter className="border-t border-default bg-elevated/30">
            <InteractiveBillRow
              label={`Team salaries. Remaining ${salaryPool.pool.remainingLabel}.`}
              onOpen={onOpenSalaryPool}
              className="border-t border-default"
            >
              <TableCell className="font-medium text-highlighted">Team salaries</TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
              <MoneyCell label={salaryPool.pool.totalLabel} highlighted />
              <MoneyCell label={salaryPool.pool.paidLabel} />
              {showWaste ? <TableCell /> : null}
              <MoneyCell
                label={salaryPool.pool.remainingLabel}
                remainingAmount={salaryPool.pool.remainingAmount}
              />
            </InteractiveBillRow>
          </TableFooter>
        ) : null}
      </Table>
    </div>
  );
}

function AdjustmentsTable({
  rows,
  searchTerm,
  onOpenRow,
}: {
  rows: readonly MoneyBillAdjustmentRow[];
  searchTerm: string;
  onOpenRow: (row: MoneyBillComposeDisplayRow) => void;
}) {
  return (
    <div className={tableWrapperClass}>
      <Table className="min-w-[48rem]" aria-label="Bill adjustments">
        <BillsTableHeader
          columns={["Title", "Type", "Status", "Period", "Amount", "Paid", "Remaining"]}
        />
        <TableBody>
          {rows.map((row) => (
            <InteractiveBillRow
              key={row.id}
              label={`${row.title}. Remaining ${row.remainingLabel}.`}
              onOpen={() => onOpenRow(row)}
            >
              <TableCell className="min-w-48 font-medium text-highlighted">
                <AgencySearchHighlight text={row.title} query={searchTerm} />
              </TableCell>
              <TableCell className="text-muted">{row.sectionTitle}</TableCell>
              <TableCell>
                <BillStatusBadge label={row.statusLabel} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted">{row.periodLabel}</TableCell>
              <MoneyCell label={row.amountLabel} highlighted />
              <MoneyCell label={row.paidLabel} />
              <MoneyCell label={row.remainingLabel} remainingAmount={row.remainingAmount} />
            </InteractiveBillRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TableSection({
  title,
  count,
  showHeader,
  children,
}: {
  title: string;
  count: number;
  showHeader: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      {showHeader ? (
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h3 className="text-sm font-medium text-highlighted">{title}</h3>
          <span className="font-mono text-xs tabular-nums text-muted">{count}</span>
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AgencyMoneyBillsTablesView({
  clientGroups,
  teamGroups,
  adjustments,
  salaryPool,
  searchTerm,
  isMutationPending,
  onOpenRow,
  onOpenParty,
  onOpenSalaryPool,
}: AgencyMoneyBillsTablesViewProps) {
  const showClients = clientGroups.length > 0;
  const showTeam = teamGroups.length > 0 || Boolean(salaryPool.pool);
  const showAdjustments = adjustments.length > 0;
  const showSectionHeaders = Number(showClients) + Number(showTeam) + Number(showAdjustments) > 1;

  return (
    <div
      className="flex flex-col gap-3 px-4 pt-4"
      aria-label="Bill tables"
      aria-busy={isMutationPending}
    >
      {showClients ? (
        <TableSection title="Clients" count={clientGroups.length} showHeader={showSectionHeaders}>
          <PersonBillsTable
            party="client"
            groups={clientGroups}
            salaryPool={salaryPool}
            searchTerm={searchTerm}
            onOpenRow={onOpenRow}
            onOpenParty={onOpenParty}
            onOpenSalaryPool={onOpenSalaryPool}
          />
        </TableSection>
      ) : null}
      {showTeam ? (
        <TableSection
          title="Team"
          count={teamGroups.length + (salaryPool.pool ? 1 : 0)}
          showHeader={showSectionHeaders}
        >
          <PersonBillsTable
            party="team"
            groups={teamGroups}
            salaryPool={salaryPool}
            searchTerm={searchTerm}
            onOpenRow={onOpenRow}
            onOpenParty={onOpenParty}
            onOpenSalaryPool={onOpenSalaryPool}
          />
        </TableSection>
      ) : null}
      {showAdjustments ? (
        <TableSection
          title="Adjustments"
          count={adjustments.length}
          showHeader={showSectionHeaders}
        >
          <AdjustmentsTable rows={adjustments} searchTerm={searchTerm} onOpenRow={onOpenRow} />
        </TableSection>
      ) : null}
    </div>
  );
}
