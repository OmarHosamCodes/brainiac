import { type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ChevronDown, FileText, Plus, Receipt, Search, SlidersHorizontal, X } from "lucide-react";

import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import {
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyInputPlaceholderClass,
  agencyMetricClass,
  agencyPanelClass,
} from "@/features/shared/agency-ui";
import { projectHueStyle } from "@/features/shared/project-palette";
import {
  type MoneyBillsPartyFilter,
  type MoneyBillsStatusFilter,
} from "@/features/billing/money-bills-filters";
import {
  moneyBillComposeHueId,
  moneyBillComposeListInsight,
  type MoneyBillObligationLine,
  type MoneyBillPersonGroup,
} from "@/features/billing/money-bill-obligation-rows";
import {
  formatMoneyAmount,
  moneyBillInitials,
  type MoneyBillAdjustmentRow,
} from "@/features/billing/money-bills-rows";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

import { instrumentPlateSurfaceClass } from "@/features/member-profile/member-profile-instrument-plate";

import { MoneyListGhostPreview } from "./agency-money-shared-view";
import { MoneyExpensesPanelContent } from "./agency-money-expenses-section-view";
import { AgencyMoneyBillsDialogs } from "./agency-money-bills-dialogs-view";
import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";
import { moneyNestItemVariants } from "./money-motion";
import {
  moneyPanelHeaderClass,
  MoneyPanelCount,
  MoneyPanelFilterPill,
  MoneyPanelFilterRow,
  MoneyPanelMetricBlock,
  MoneyPanelTitleRow,
  MoneyPeriodFxLine,
} from "./money-panel-chrome";

const billInstrumentRowClass =
  "group/instrument grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-3 transition-colors duration-150 hover:bg-elevated/25 motion-reduce:transition-none sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]";

function BillClientMark({ title, hueId }: { title: string; hueId: string }) {
  return (
    <span
      className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-default text-[0.7rem] font-semibold tracking-wide text-[var(--project-hue)] dark:text-[var(--project-hue-dark)] bg-[var(--project-hue-soft)] dark:bg-[var(--project-hue-soft-dark)]"
      style={projectHueStyle(hueId)}
      aria-hidden
    >
      {moneyBillInitials(title)}
      <span
        className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-[var(--project-hue)] dark:bg-[var(--project-hue-dark)] ring-2 ring-default"
        aria-hidden
      />
    </span>
  );
}

function mergedBillStatusChipClass(statusLabel: string): string {
  switch (statusLabel) {
    case "Mixed":
    case "Part paid":
    case "Partial":
      return "bg-info/10 text-info";
    case "Ready":
      return "bg-elevated text-muted";
    case "Outstanding":
    case "Sent":
      return "bg-warning/10 text-warning";
    case "Paid":
      return "bg-success/10 text-success";
    case "Refunded":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-elevated text-muted";
  }
}

function ActiveBillFilterChip({
  label,
  clearLabel,
  onClear,
}: {
  label: string;
  clearLabel: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex h-7 items-center gap-0.5 rounded-full bg-elevated py-0 pl-2.5 pr-0.5 text-xs font-medium text-highlighted ring-1 ring-border">
      <span className="max-w-40 truncate">{label}</span>
      <button
        type="button"
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150",
          "hover:bg-default hover:text-highlighted",
          "motion-reduce:transition-none",
          agencyFocusRingClass,
        )}
        onClick={onClear}
        aria-label={clearLabel}
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}

function buildBillMetaRail(input: {
  lead?: string;
  totalLabel: string;
  receivedLabel: string;
  receivedTitle: string;
  wasteAmount: number;
  wasteLabel: string;
  showWaste: boolean;
  pendingSuffix?: string;
}): string {
  const parts: string[] = [];
  if (input.lead?.trim()) parts.push(input.lead.trim());
  parts.push(`Total ${input.totalLabel}`);
  parts.push(`${input.receivedTitle} ${input.receivedLabel}`);
  if (input.showWaste && input.wasteAmount > 0) {
    parts.push(`Waste ${input.wasteLabel}`);
  }
  if (input.pendingSuffix) parts.push(input.pendingSuffix);
  return parts.join(" · ");
}

function BillRemainingHero({
  remainingLabel,
  remainingAmount,
  receivedTitle,
  receivedLabel,
  showReceivedSub = false,
}: {
  remainingLabel: string;
  remainingAmount: number;
  receivedTitle: string;
  receivedLabel: string;
  showReceivedSub?: boolean;
}) {
  const urgent = remainingAmount > 0;
  return (
    <div className="bill-remaining-hero col-start-3 row-start-1 min-w-[5.5rem] shrink-0 text-end sm:justify-self-end">
      <div className="text-[0.625rem] font-medium tracking-[0.06em] text-muted uppercase">
        Remaining
      </div>
      <div
        className={cn(
          agencyMetricClass,
          "mt-0.5 whitespace-nowrap font-mono text-sm font-semibold tabular-nums sm:text-base",
          urgent ? "text-warning" : "text-muted",
        )}
      >
        {remainingLabel}
      </div>
      {showReceivedSub ? (
        <div className="mt-0.5 font-mono text-[0.625rem] tabular-nums text-muted">
          {receivedTitle} {receivedLabel}
        </div>
      ) : null}
    </div>
  );
}

function BillInstrumentGlyphSlot({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        instrumentPlateSurfaceClass(),
        "flex size-9 shrink-0 items-center justify-center rounded-xl border",
      )}
    >
      {children}
    </div>
  );
}

function BillInstrumentRowSkeleton() {
  return (
    <li className="flex items-center gap-3 border-t border-default px-3 py-3 first:border-t-0">
      <Skeleton className="size-9 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="h-3 w-full max-w-xs" />
      </div>
      <Skeleton className="h-10 w-[5.5rem] shrink-0 rounded-lg" />
    </li>
  );
}

function BillIconAction({
  label,
  onClick,
  disabled,
  children,
  quiet = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  /** Secondary actions: soft at rest, full on row hover / focus-within. */
  quiet?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "size-10 rounded-lg text-muted transition-[opacity,color,background-color] duration-150 ease-out sm:size-8",
              "hover:bg-elevated hover:text-highlighted",
              "motion-reduce:transition-none",
              quiet &&
                "opacity-100 sm:opacity-45 sm:group-hover/card:opacity-100 sm:group-focus-within/card:opacity-100 sm:group-hover/instrument:opacity-100 sm:group-focus-within/instrument:opacity-100 sm:group-hover/line:opacity-100 sm:group-focus-within/line:opacity-100 sm:focus-visible:opacity-100",
            )}
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function BillAdjustmentRow({
  row,
  searchTerm,
  pending,
  isMutationPending,
  onOpenPayment,
  onMarkPaid,
}: {
  row: MoneyBillAdjustmentRow;
  searchTerm: string;
  pending: boolean;
  isMutationPending: boolean;
  onOpenPayment: (rowId: string) => void;
  onMarkPaid: (rowId: string) => void;
}) {
  return (
    <li className="group grid items-center gap-3 px-3 py-3 transition-colors hover:bg-elevated/40 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="min-w-0 truncate text-sm font-medium text-highlighted">
            <AgencySearchHighlight text={row.title} query={searchTerm} />
          </span>
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-md px-1.5 text-[0.6875rem] font-medium",
              mergedBillStatusChipClass(row.statusLabel),
            )}
          >
            {row.statusLabel}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          <AgencySearchHighlight text={row.subtitle} query={searchTerm} />
          {row.paidAmount > 0 && row.remainingAmount > 0 ? (
            <>
              <span aria-hidden> · </span>
              {row.paidLabel} paid · {row.remainingLabel} left
            </>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <span className="font-mono text-sm font-semibold tabular-nums text-muted">
          <AgencySearchHighlight text={row.metaLabel} query={searchTerm} />
        </span>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
          {row.canRecordPayment ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-10 min-w-11 rounded-lg sm:h-8"
              disabled={pending || isMutationPending}
              onClick={() => onOpenPayment(row.id)}
            >
              Record payment
            </Button>
          ) : null}
          {row.canMarkPaid ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-10 min-w-11 rounded-lg sm:h-8"
              disabled={pending || isMutationPending}
              onClick={() => void onMarkPaid(row.id)}
            >
              Mark paid
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function SalaryPoolPanel({
  salaryPool,
  isMutationPending,
}: {
  salaryPool: NonNullable<AgencyMoneySurfaceViewModel["bills"]["salaryPool"]>;
  isMutationPending: boolean;
}) {
  if (!salaryPool.pool) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-default">
      <div className="border-b border-default bg-elevated/20 px-3 py-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium text-highlighted">Team salaries</h4>
            <p className="text-xs text-muted">Manual total for formulas and shared payments</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-end">
            <div>
              <p className="text-[0.6875rem] font-medium text-muted">Total</p>
              <p className="font-mono text-sm font-semibold tabular-nums text-highlighted">
                {salaryPool.pool.totalLabel}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium text-muted">Paid</p>
              <p className="font-mono text-sm font-semibold tabular-nums text-highlighted">
                {salaryPool.pool.paidLabel}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium text-muted">Remaining</p>
              <p className="font-mono text-sm font-semibold tabular-nums text-highlighted">
                {salaryPool.pool.remainingLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
      {salaryPool.canPay ? (
        <div className="flex flex-wrap items-center justify-end gap-2 px-3 py-3">
          <div className="flex flex-col items-end gap-1">
            <Input
              inputMode="decimal"
              value={salaryPool.payAmount}
              onChange={(event) => salaryPool.onPayAmountChange(event.target.value)}
              placeholder="Amount"
              aria-label="Team salaries payment amount"
              aria-invalid={Boolean(salaryPool.validationMessage)}
              aria-describedby={
                salaryPool.validationMessage ? "money-salary-pool-payment-error" : undefined
              }
              className="h-8 w-32 rounded-lg border-default bg-default text-sm tabular-nums"
              disabled={salaryPool.isPending || isMutationPending}
            />
            {salaryPool.validationMessage ? (
              <p
                id="money-salary-pool-payment-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {salaryPool.validationMessage}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg"
            disabled={!salaryPool.canSubmitPay || salaryPool.isPending || isMutationPending}
            onClick={() => salaryPool.onPay()}
          >
            {salaryPool.isPending ? "Paying…" : "Pay"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function BillObligationLineRow({
  group,
  line,
  index,
  searchTerm,
  isMutationPending,
  showWasteInMeta,
  onOpenPreviewLine,
  onOpenAdjustLine,
}: {
  group: MoneyBillPersonGroup;
  line: MoneyBillObligationLine;
  index: number;
  searchTerm: string;
  isMutationPending: boolean;
  showWasteInMeta: boolean;
  onOpenPreviewLine: (group: MoneyBillPersonGroup, line: MoneyBillObligationLine) => void;
  onOpenAdjustLine: (group: MoneyBillPersonGroup, line: MoneyBillObligationLine) => void;
}) {
  const receivedTitle = group.party === "team" ? "Paid" : "Received";
  const previewLabel = group.party === "team" ? "Preview payslip" : "Preview invoice";
  const showReceivedSub =
    line.receivedAmount > 0 && line.remainingAmount > 0 && line.statusLabel === "Part paid";
  const metaRail = buildBillMetaRail({
    totalLabel: line.totalLabel,
    receivedLabel: line.receivedLabel,
    receivedTitle,
    wasteAmount: line.wasteAmount,
    wasteLabel: line.wasteLabel,
    showWaste: showWasteInMeta,
  });

  return (
    <motion.li
      layout={false}
      custom={index}
      variants={moneyNestItemVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className={cn(
        billInstrumentRowClass,
        "group/line border-l border-dashed border-default/80 pl-3 sm:pl-4",
        line.isCarry && "bg-elevated/15",
      )}
      aria-label={`${line.subtitle}. Remaining ${line.remainingLabel}.`}
    >
      <BillInstrumentGlyphSlot>
        {line.isCarry ? (
          <span className="text-[0.625rem] font-semibold tracking-wide text-muted uppercase">
            Prior
          </span>
        ) : (
          <span className="text-[0.625rem] font-medium text-muted" aria-hidden>
            ·
          </span>
        )}
      </BillInstrumentGlyphSlot>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="min-w-0 truncate text-xs font-medium text-highlighted sm:text-sm">
            <AgencySearchHighlight text={line.subtitle} query={searchTerm} />
          </span>
          <span
            className={cn(
              "inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[0.6875rem] font-medium",
              mergedBillStatusChipClass(line.statusLabel),
            )}
          >
            {line.statusLabel}
          </span>
        </div>
        <p className="mt-0.5 truncate font-mono text-[0.6875rem] leading-snug text-muted tabular-nums sm:text-xs">
          {metaRail}
        </p>
      </div>
      <BillRemainingHero
        remainingLabel={line.remainingLabel}
        remainingAmount={line.remainingAmount}
        receivedTitle={receivedTitle}
        receivedLabel={line.receivedLabel}
        showReceivedSub={showReceivedSub}
      />
      <div className="col-span-2 col-start-2 row-start-2 flex shrink-0 items-center justify-end gap-0.5 sm:col-span-1 sm:col-start-4 sm:row-start-1">
        <BillIconAction
          label={previewLabel}
          disabled={isMutationPending}
          onClick={() => onOpenPreviewLine(group, line)}
        >
          <FileText className="size-3.5" aria-hidden />
        </BillIconAction>
        <BillIconAction
          label="Settle or adjust"
          disabled={isMutationPending}
          quiet
          onClick={() => onOpenAdjustLine(group, line)}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
        </BillIconAction>
      </div>
    </motion.li>
  );
}

function BillPersonGroupCard({
  group,
  searchTerm,
  isMutationPending,
  showWasteInMeta,
  onOpenClient,
  onOpenMember,
  onOpenPreview,
  onOpenPreviewLine,
  onOpenAdjust,
  onOpenAdjustLine,
}: {
  group: MoneyBillPersonGroup;
  searchTerm: string;
  isMutationPending: boolean;
  showWasteInMeta: boolean;
  onOpenClient: (clientId: string) => void;
  onOpenMember: (userId: string) => void;
  onOpenPreview: (group: MoneyBillPersonGroup) => void;
  onOpenPreviewLine: (group: MoneyBillPersonGroup, line: MoneyBillObligationLine) => void;
  onOpenAdjust: (group: MoneyBillPersonGroup) => void;
  onOpenAdjustLine: (group: MoneyBillPersonGroup, line: MoneyBillObligationLine) => void;
}) {
  const hueId = moneyBillComposeHueId(group);
  const receivedTitle = group.party === "team" ? "Paid" : "Received";
  const previewLabel = group.party === "team" ? "Preview payslip" : "Preview invoice";
  const priorLineCount = group.lines.filter((line) => line.isCarry).length;
  const soleLine = group.lines.length === 1 ? group.lines[0] : null;
  const pendingAdjLabel =
    group.pendingAdjustmentCents !== 0
      ? formatMoneyAmount(Math.abs(group.pendingAdjustmentCents), group.currency)
      : null;
  const pendingSuffix = pendingAdjLabel
    ? `${group.pendingAdjustmentCents > 0 ? "+" : "−"}${pendingAdjLabel} pending`
    : undefined;

  function onOpenParty() {
    if (group.party === "client" && group.clientId) onOpenClient(group.clientId);
    else if (group.party === "team" && group.userId) onOpenMember(group.userId);
  }

  const partyGlyph =
    group.party === "team" ? (
      <AgencyMemberAvatar
        name={group.title}
        userId={group.userId ?? group.id}
        avatarUrl={group.userAvatar}
        size="md"
        className="size-9 shrink-0"
      />
    ) : hueId ? (
      <BillClientMark title={group.title} hueId={hueId} />
    ) : (
      <BillInstrumentGlyphSlot>
        <span className="text-[0.7rem] font-semibold text-muted">?</span>
      </BillInstrumentGlyphSlot>
    );

  const partyTitle = (
    <button
      type="button"
      onClick={onOpenParty}
      className={cn(
        "min-w-0 truncate text-left text-sm font-medium text-highlighted hover:underline",
        agencyFocusRingClass,
        "rounded-sm",
      )}
    >
      <AgencySearchHighlight text={group.title} query={searchTerm} />
    </button>
  );

  function renderInstrumentActions(onPreview: () => void, onAdjustClick: () => void) {
    return (
      <div className="col-span-2 col-start-2 row-start-2 flex shrink-0 items-center justify-end gap-0.5 sm:col-span-1 sm:col-start-4 sm:row-start-1">
        <BillIconAction label={previewLabel} disabled={isMutationPending} onClick={onPreview}>
          <FileText className="size-4" aria-hidden />
        </BillIconAction>
        <BillIconAction
          label="Settle or adjust"
          disabled={isMutationPending}
          quiet
          onClick={onAdjustClick}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
        </BillIconAction>
      </div>
    );
  }

  if (soleLine) {
    const showReceivedSub =
      soleLine.receivedAmount > 0 &&
      soleLine.remainingAmount > 0 &&
      soleLine.statusLabel === "Part paid";
    const metaRail = buildBillMetaRail({
      lead: soleLine.subtitle,
      totalLabel: soleLine.totalLabel,
      receivedLabel: soleLine.receivedLabel,
      receivedTitle,
      wasteAmount: soleLine.wasteAmount,
      wasteLabel: soleLine.wasteLabel,
      showWaste: showWasteInMeta,
      pendingSuffix,
    });

    return (
      <li className="group/card overflow-hidden">
        <div
          className={cn(billInstrumentRowClass, soleLine.isCarry && "bg-elevated/15")}
          aria-label={`${group.title}. Remaining ${soleLine.remainingLabel}.`}
        >
          {partyGlyph}
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              {partyTitle}
              <span
                className={cn(
                  "inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[0.6875rem] font-medium",
                  mergedBillStatusChipClass(soleLine.statusLabel),
                )}
              >
                {soleLine.statusLabel}
              </span>
            </div>
            <p className="mt-0.5 truncate font-mono text-[0.6875rem] leading-snug text-muted tabular-nums sm:text-xs">
              <AgencySearchHighlight text={metaRail} query={searchTerm} />
            </p>
          </div>
          <BillRemainingHero
            remainingLabel={soleLine.remainingLabel}
            remainingAmount={soleLine.remainingAmount}
            receivedTitle={receivedTitle}
            receivedLabel={soleLine.receivedLabel}
            showReceivedSub={showReceivedSub}
          />
          {renderInstrumentActions(
            () => onOpenPreviewLine(group, soleLine),
            () => onOpenAdjustLine(group, soleLine),
          )}
        </div>
      </li>
    );
  }

  const groupMetaLead = [
    `${group.openLabel} open`,
    priorLineCount > 0 ? `${priorLineCount} prior` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const groupMetaRail = buildBillMetaRail({
    lead: groupMetaLead,
    totalLabel: group.totalLabel,
    receivedLabel: group.receivedLabel,
    receivedTitle,
    wasteAmount: group.wasteAmount,
    wasteLabel: group.wasteLabel,
    showWaste: showWasteInMeta,
    pendingSuffix,
  });
  const showGroupReceivedSub = group.receivedAmount > 0 && group.remainingAmount > 0;

  return (
    <li className="group/card overflow-hidden">
      <div
        className={cn(billInstrumentRowClass, "bg-default/40")}
        aria-label={`${group.title}. Remaining ${group.remainingLabel}.`}
      >
        {partyGlyph}
        <div className="min-w-0">
          {partyTitle}
          <p className="mt-0.5 truncate font-mono text-[0.6875rem] leading-snug text-muted tabular-nums sm:text-xs">
            <AgencySearchHighlight text={groupMetaRail} query={searchTerm} />
          </p>
        </div>
        <BillRemainingHero
          remainingLabel={group.remainingLabel}
          remainingAmount={group.remainingAmount}
          receivedTitle={receivedTitle}
          receivedLabel={group.receivedLabel}
          showReceivedSub={showGroupReceivedSub}
        />
        {renderInstrumentActions(
          () => onOpenPreview(group),
          () => onOpenAdjust(group),
        )}
      </div>
      {group.lines.length > 0 ? (
        <ul className="flex flex-col" aria-label={`${group.title} invoices`}>
          <AnimatePresence initial={false}>
            {group.lines.map((line, index) => (
              <BillObligationLineRow
                key={line.id}
                group={group}
                line={line}
                index={index}
                searchTerm={searchTerm}
                isMutationPending={isMutationPending}
                showWasteInMeta={showWasteInMeta}
                onOpenPreviewLine={onOpenPreviewLine}
                onOpenAdjustLine={onOpenAdjustLine}
              />
            ))}
          </AnimatePresence>
        </ul>
      ) : null}
    </li>
  );
}

function MoneyBillsCreateMenu({
  onOpenInvoice,
  onOpenAdjustment,
  onOpenExpense,
}: {
  onOpenInvoice: () => void;
  onOpenAdjustment: () => void;
  onOpenExpense: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 rounded-xl px-3 sm:h-9"
          aria-label="Add"
        >
          <Plus className="size-4" aria-hidden />
          <span>Add</span>
          <ChevronDown className="size-3.5 text-muted" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => window.setTimeout(onOpenInvoice, 0)}>
          <FileText className="size-4" aria-hidden />
          Invoice
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.setTimeout(onOpenAdjustment, 0)}>
          <SlidersHorizontal className="size-4" aria-hidden />
          Adjustment
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.setTimeout(onOpenExpense, 0)}>
          <Receipt className="size-4" aria-hidden />
          Expense
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BillsSection({
  bills,
  periodFx,
}: {
  bills: AgencyMoneySurfaceViewModel["bills"];
  periodFx: AgencyMoneySurfaceViewModel["periodFx"];
}) {
  const isExpensesParty = bills.partyFilter === "expenses";
  const panelTitle = isExpensesParty ? "Expenses" : "Bills";
  const expensesPanel = bills.expensesPanel;
  const expenseCountLabel =
    expensesPanel.strip.itemCount === 1 ? "1 expense" : `${expensesPanel.strip.itemCount} expenses`;
  const billCountLabel = `${bills.billCount} ${bills.billCount === 1 ? "bill" : "bills"}`;
  const countLabel = isExpensesParty ? expenseCountLabel : billCountLabel;
  const hasStatusFilters = !isExpensesParty && bills.statusOptions.length > 0;
  const hasExpenseFilters = isExpensesParty && expensesPanel.status === "ready";
  const showEmpty =
    !isExpensesParty &&
    !bills.isLoading &&
    !bills.isError &&
    bills.rows.length === 0 &&
    !bills.salaryPool.pool;
  const emptyAction =
    bills.partyFilter === "adjustments" || bills.partyFilter === "team"
      ? { label: "Add adjustment or cost", onClick: bills.createMenu.onOpenAdjustment }
      : { label: "Create invoice", onClick: bills.createMenu.onOpenInvoice };
  const sections = bills.displaySections;
  const insight = isExpensesParty
    ? expensesPanel.strip.insight
    : moneyBillComposeListInsight(bills.rows);
  const showSectionHeaders = sections.length > 1;

  return (
    <section
      className={cn(agencyPanelClass, "flex shrink-0 flex-col overflow-hidden")}
      aria-labelledby="money-bills-panel-heading"
    >
      <div className={moneyPanelHeaderClass}>
        <MoneyPanelTitleRow
          title={panelTitle}
          headingId="money-bills-panel-heading"
          headingTabIndex={-1}
        >
          <div className="relative min-w-48 flex-1 sm:max-w-72 sm:flex-none">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={bills.searchTerm}
              onChange={(event) => bills.onSearchTermChange(event.target.value)}
              placeholder={isExpensesParty ? "Search expenses" : "Search bills"}
              aria-label={isExpensesParty ? "Search expenses" : "Search bills"}
              className={cn(
                "h-9 rounded-xl border-default bg-default pl-9 text-sm",
                agencyInputPlaceholderClass,
                bills.searchTerm.trim() ? "text-highlighted" : undefined,
              )}
            />
          </div>
          {isExpensesParty ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 rounded-lg px-2 text-xs text-muted sm:h-8"
              onClick={() => expensesPanel.details.onOpenChange(true)}
            >
              All expenses
            </Button>
          ) : (
            <MoneyPanelCount>{countLabel}</MoneyPanelCount>
          )}
          <MoneyBillsCreateMenu
            onOpenInvoice={bills.createMenu.onOpenInvoice}
            onOpenAdjustment={bills.createMenu.onOpenAdjustment}
            onOpenExpense={bills.createMenu.onOpenExpense}
          />
        </MoneyPanelTitleRow>

        <MoneyPeriodFxLine
          label={periodFx.label}
          canApplyCurrent={periodFx.canApplyCurrent}
          applying={periodFx.applying}
          onApplyCurrent={periodFx.onApplyCurrent}
        />

        {isExpensesParty && expensesPanel.periodSpendLabel ? (
          <MoneyPanelMetricBlock
            label="Period spend"
            value={expensesPanel.periodSpendLabel}
            hint={insight}
          />
        ) : !isExpensesParty && bills.remainingLabel ? (
          <MoneyPanelMetricBlock label="Remaining" value={bills.remainingLabel} hint={insight} />
        ) : insight ? (
          <p className="text-xs text-muted text-balance" aria-live="polite">
            {insight}
          </p>
        ) : null}

        <LayoutGroup id="bills-party-filters">
          <MoneyPanelFilterRow label="Bill party">
            {bills.partyOptions.map((option) => (
              <MoneyPanelFilterPill
                key={option.id}
                label={option.label}
                selected={bills.partyFilter === option.id}
                onSelect={() => bills.onPartyFilterChange(option.id as MoneyBillsPartyFilter)}
                layoutId="bills-party-filter-bg"
              />
            ))}
          </MoneyPanelFilterRow>
        </LayoutGroup>

        {hasExpenseFilters ? (
          <LayoutGroup id="expense-strip-filters">
            <MoneyPanelFilterRow label="Expense filters">
              {expensesPanel.strip.filterOptions.map((option) => (
                <MoneyPanelFilterPill
                  key={option.id}
                  label={option.label}
                  selected={expensesPanel.strip.filter === option.id}
                  onSelect={() => expensesPanel.strip.onFilterChange(option.id)}
                  layoutId="expense-strip-filter-bg"
                />
              ))}
            </MoneyPanelFilterRow>
          </LayoutGroup>
        ) : null}

        {hasStatusFilters || (!isExpensesParty && bills.clientCategoryFilter === "external") ? (
          <div className="flex flex-col gap-2">
            {hasStatusFilters ? (
              <LayoutGroup id="bills-status-filters">
                <MoneyPanelFilterRow label="Bill status">
                  {bills.statusOptions.map((option) => (
                    <MoneyPanelFilterPill
                      key={option.id}
                      label={option.label}
                      selected={bills.statusFilter === option.id}
                      onSelect={() =>
                        bills.onStatusFilterChange(option.id as MoneyBillsStatusFilter)
                      }
                      layoutId="bills-status-filter-bg"
                    />
                  ))}
                </MoneyPanelFilterRow>
              </LayoutGroup>
            ) : null}

            {!isExpensesParty && bills.clientCategoryFilter === "external" ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <ActiveBillFilterChip
                  label="External"
                  clearLabel="Show internal clients too"
                  onClear={bills.onClearClientCategoryFilter}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="relative flex flex-col pb-5">
        {isExpensesParty ? (
          <MoneyExpensesPanelContent panel={expensesPanel} searchTerm={bills.searchTerm} />
        ) : null}

        {!isExpensesParty && bills.isLoading ? (
          <ul
            className="mx-4 mt-4 divide-y divide-border overflow-hidden rounded-xl border border-default"
            aria-busy="true"
            aria-label="Loading bills"
          >
            {[1, 2, 3].map((item) => (
              <BillInstrumentRowSkeleton key={item} />
            ))}
          </ul>
        ) : null}

        {!isExpensesParty && bills.isError ? (
          <div className={cn(agencyErrorPanelClass, "m-4")} role="alert">
            <p className="text-sm font-medium text-highlighted">Couldn’t load bills</p>
            <p className="mt-1 text-xs text-muted">{bills.errorMessage}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={bills.onRetry}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!isExpensesParty &&
        !bills.isLoading &&
        !bills.isError &&
        (bills.rows.length > 0 || bills.salaryPool.pool) ? (
          <div className="flex flex-col gap-3 px-4 pt-4" aria-label="Bill list">
            {sections.map((section) => {
              const showWasteInMeta = section.rows.some((row) => {
                if (row.kind === "person-group") return row.wasteAmount > 0;
                return false;
              });
              return (
                <section
                  key={section.id}
                  className="flex flex-col gap-2"
                  aria-label={section.title}
                >
                  {showSectionHeaders ? (
                    <div className="flex items-baseline justify-between gap-2 px-1">
                      <h3 className="text-sm font-medium text-highlighted">{section.title}</h3>
                      {section.hint ? (
                        <span className="text-xs text-muted">{section.hint}</span>
                      ) : null}
                    </div>
                  ) : null}
                  {section.id === "adjustments" ? (
                    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-default">
                      {section.rows.map((row) => {
                        if (row.kind !== "adjustment") return null;
                        const pending = bills.pendingActionInvoiceId === row.id;
                        return (
                          <BillAdjustmentRow
                            key={row.id}
                            row={row}
                            searchTerm={bills.searchTerm}
                            pending={pending}
                            isMutationPending={bills.isMutationPending}
                            onOpenPayment={bills.onOpenPayment}
                            onMarkPaid={bills.onMarkPaid}
                          />
                        );
                      })}
                    </ul>
                  ) : (
                    <>
                      {section.id === "team" && bills.salaryPool.pool ? (
                        <SalaryPoolPanel
                          salaryPool={bills.salaryPool}
                          isMutationPending={bills.isMutationPending}
                        />
                      ) : null}
                      {section.rows.length > 0 ? (
                        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-default">
                          {section.rows.map((row) => {
                            if (row.kind !== "person-group") return null;
                            return (
                              <BillPersonGroupCard
                                key={row.id}
                                group={row}
                                searchTerm={bills.searchTerm}
                                isMutationPending={bills.isMutationPending}
                                showWasteInMeta={showWasteInMeta}
                                onOpenClient={bills.onOpenClient}
                                onOpenMember={bills.onOpenMember}
                                onOpenPreview={bills.onOpenPreview}
                                onOpenPreviewLine={bills.onOpenPreviewLine}
                                onOpenAdjust={bills.onOpenAdjust}
                                onOpenAdjustLine={bills.onOpenAdjustLine}
                              />
                            );
                          })}
                        </ul>
                      ) : null}
                    </>
                  )}
                </section>
              );
            })}
          </div>
        ) : null}

        {showEmpty ? (
          <>
            <div className="px-4 pt-3">
              <MoneyListGhostPreview />
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-default to-transparent" />
            <div className="relative z-10 mx-4 mt-1 flex flex-col items-center gap-2 rounded-2xl border border-default bg-default px-5 py-8 text-center">
              <Receipt className="size-6 text-muted" aria-hidden />
              <p className="text-sm font-semibold text-highlighted">
                <AgencySearchHighlight text={bills.emptyCopy.title} query={bills.searchTerm} />
              </p>
              <p className="max-w-sm text-xs text-muted text-balance">
                <AgencySearchHighlight text={bills.emptyCopy.body} query={bills.searchTerm} />
              </p>
              {!bills.searchTerm.trim() ? (
                <Button type="button" size="sm" className="mt-1" onClick={emptyAction.onClick}>
                  {emptyAction.label}
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <AgencyMoneyBillsDialogs bills={bills} />
    </section>
  );
}

export { BillsSection };
