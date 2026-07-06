import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { AgencyReportActivityMenu } from "@/components/agency/agency-report-activity-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatRelativeReportTime,
  formatReportHeaderMeta,
  type AgencyReportHeaderLabelContext,
} from "@/lib/agency/reports/agency-report-naming";
import type { AgencyReportAutosaveState } from "@/lib/agency/reports/use-agency-report-autosave";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type ReportSaveStatusProps = {
  state: AgencyReportAutosaveState;
  lastSavedAt: Date | null;
  onRetry: () => void;
};

function ReportSaveStatus({ state, lastSavedAt, onRetry }: ReportSaveStatusProps) {
  if (state === "saving" || state === "pending") {
    return <span className="font-mono text-[11px] text-muted">Saving…</span>;
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-error">
        Save failed
        <Button variant="link" size="sm" className="h-auto px-0 py-0 text-[11px]" onClick={onRetry}>
          Retry
        </Button>
      </span>
    );
  }
  if (state === "saved" && lastSavedAt) {
    return (
      <span className="font-mono text-[11px] text-muted">
        Saved · {formatRelativeReportTime(lastSavedAt.toISOString())}
      </span>
    );
  }
  return null;
}

type ReportTitleEditorProps = {
  value: string;
  fallbackName: string;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
};

function ReportTitleEditor({ value, fallbackName, onChange, onCommit }: ReportTitleEditorProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = value.trim();
    if (!trimmed) {
      onChange(fallbackName);
      onCommit(fallbackName);
      return;
    }
    onChange(trimmed);
    onCommit(trimmed);
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            onChange(fallbackName);
            setEditing(false);
          }
        }}
        aria-label="Report name"
        className="h-9 max-w-md border-default bg-default px-2 text-base font-bold"
      />
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "truncate text-left text-base font-bold text-highlighted hover:underline",
        agencyFocusRingClass,
        "motion-reduce:transition-none",
      )}
      onClick={() => setEditing(true)}
      title="Click to rename"
    >
      {value || fallbackName}
    </button>
  );
}

type ReportHeaderMetaProps = {
  scopeLine: string;
  attributionLine: string;
  saveState: AgencyReportAutosaveState;
  lastSavedAt: Date | null;
  onRetrySave: () => void;
};

function ReportHeaderMeta({
  scopeLine,
  attributionLine,
  saveState,
  lastSavedAt,
  onRetrySave,
}: ReportHeaderMetaProps) {
  const saveStatus = (
    <ReportSaveStatus state={saveState} lastSavedAt={lastSavedAt} onRetry={onRetrySave} />
  );

  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted">{scopeLine}</p>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
        <span>{attributionLine}</span>
        {saveStatus ? (
          <>
            <span aria-hidden className="text-muted/60">
              ·
            </span>
            {saveStatus}
          </>
        ) : null}
      </p>
    </div>
  );
}

type ReportHeaderActionsProps = {
  canUndo: boolean;
  onUndo: () => void;
  exporting: boolean;
  exportDisabled: boolean;
  onExport: () => void;
  teamId: string;
  reportId: string;
};

function ReportHeaderActions({
  canUndo,
  onUndo,
  exporting,
  exportDisabled,
  onExport,
  teamId,
  reportId,
}: ReportHeaderActionsProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 pl-10 sm:pl-0">
      {canUndo ? (
        <Button variant="ghost" size="sm" className="h-9 px-2.5 text-xs" onClick={onUndo}>
          Undo
        </Button>
      ) : null}
      <AgencyReportActivityMenu teamId={teamId} reportId={reportId} align="end" />
      <Button
        variant="secondary"
        size="sm"
        className="h-9"
        disabled={exportDisabled || exporting}
        onClick={onExport}
        title="Downloads .xlsx for Google Sheets"
      >
        {exporting ? (
          <>
            <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            Exporting…
          </>
        ) : (
          "Export to Sheets"
        )}
      </Button>
    </div>
  );
}

export type AgencyReportCreatorHeaderProps = {
  backHref: string;
  reportName: string;
  fallbackName: string;
  onReportNameChange: (name: string) => void;
  onRenameCommitted: (name: string) => void;
  report: {
    rangeFrom: string;
    rangeTo: string;
    clientId: string;
    projectId: string;
    memberUserId: string;
    createdByUserName: string;
  };
  labelContext: AgencyReportHeaderLabelContext;
  visibleEntryCount: number;
  canUndo: boolean;
  onUndo: () => void;
  autosaveState: AgencyReportAutosaveState;
  lastSavedAt: Date | null;
  onRetrySave: () => void;
  exporting: boolean;
  onExport: () => void;
  teamId: string;
  reportId: string;
};

export function AgencyReportCreatorHeader({
  backHref,
  reportName,
  fallbackName,
  onReportNameChange,
  onRenameCommitted,
  report,
  labelContext,
  visibleEntryCount,
  canUndo,
  onUndo,
  autosaveState,
  lastSavedAt,
  onRetrySave,
  exporting,
  onExport,
  teamId,
  reportId,
}: AgencyReportCreatorHeaderProps) {
  const meta = useMemo(
    () =>
      formatReportHeaderMeta(
        {
          rangeFrom: report.rangeFrom,
          rangeTo: report.rangeTo,
          clientId: report.clientId || undefined,
          projectId: report.projectId || undefined,
          memberUserId: report.memberUserId || undefined,
          createdByUserName: report.createdByUserName,
          visibleEntryCount,
        },
        labelContext,
      ),
    [labelContext, report, visibleEntryCount],
  );

  return (
    <header className="rounded-2xl border border-default bg-elevated px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <Button variant="ghost" size="sm" className="h-9 shrink-0 px-2" asChild>
            <Link to={backHref} aria-label="Back to reports">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1 space-y-1">
            <ReportTitleEditor
              value={reportName}
              fallbackName={fallbackName}
              onChange={onReportNameChange}
              onCommit={onRenameCommitted}
            />
            <ReportHeaderMeta
              scopeLine={meta.scopeLine}
              attributionLine={meta.attributionLine}
              saveState={autosaveState}
              lastSavedAt={lastSavedAt}
              onRetrySave={onRetrySave}
            />
          </div>
        </div>
        <ReportHeaderActions
          canUndo={canUndo}
          onUndo={onUndo}
          exporting={exporting}
          exportDisabled={visibleEntryCount === 0}
          onExport={onExport}
          teamId={teamId}
          reportId={reportId}
        />
      </div>
    </header>
  );
}

export function AgencyReportCreatorHeaderSkeleton() {
  return (
    <div className="rounded-2xl border border-default bg-elevated px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-48 max-w-full" />
            <Skeleton className="h-3 w-full max-w-md" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 pl-10 sm:pl-0">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
