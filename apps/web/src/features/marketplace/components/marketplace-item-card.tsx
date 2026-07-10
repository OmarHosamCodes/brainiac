import { assertNever } from "@orch/config/assert-never";
import type { WorkspaceMarketplaceItem } from "@orch/workspace";
import { Box, Component, Download, Layout, Plus } from "lucide-react";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { formatDateTime } from "@/lib/utils/format-date-time";
import {
  getMarketplacePayloadSummary,
  getMarketplacePayloadTypeLabel,
} from "@/features/workspace/utils/workspace-marketplace";
import { cn } from "@/lib/utils";

function kindIcon(kind: WorkspaceMarketplaceItem["payload"]["kind"]) {
  switch (kind) {
    case "node":
      return Box;
    case "tab":
      return Layout;
    case "block":
      return Component;
    default:
      return assertNever(kind);
  }
}

function kindBadgeVariant(kind: WorkspaceMarketplaceItem["payload"]["kind"]) {
  switch (kind) {
    case "node":
      return "default" as const;
    case "tab":
      return "success" as const;
    case "block":
      return "warning" as const;
    default:
      return assertNever(kind);
  }
}

function kindIconClass(kind: WorkspaceMarketplaceItem["payload"]["kind"]) {
  switch (kind) {
    case "node":
      return "bg-primary/10 text-primary";
    case "tab":
      return "bg-success/10 text-success";
    case "block":
      return "bg-warning/10 text-warning";
    default:
      return assertNever(kind);
  }
}

function avatarInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function MarketplaceItemCard({
  item,
  loading = false,
  onInsert,
}: {
  item: WorkspaceMarketplaceItem;
  loading?: boolean;
  onInsert: (item: WorkspaceMarketplaceItem) => void;
}) {
  const kind = item.payload.kind;
  const Icon = kindIcon(kind);

  return (
    <Card className="group flex h-full flex-col transition-all hover:ring-2 hover:ring-primary/30">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className={cn("shrink-0 rounded-xl p-2", kindIconClass(kind))}>
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate leading-tight font-semibold text-highlighted">
                {item.title}
              </h3>
              <p className="mt-0.5 text-xs font-medium tracking-wider text-muted uppercase">
                {getMarketplacePayloadTypeLabel(item.payload)}
              </p>
            </div>
          </div>
          <Badge variant={kindBadgeVariant(kind)} className="shrink-0">
            {getMarketplacePayloadSummary(item.payload)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        <p className="line-clamp-3 flex-1 text-sm text-muted">
          {item.summary || getMarketplacePayloadSummary(item.payload)}
        </p>

        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted ring-1 ring-muted/30"
              aria-hidden="true"
            >
              {avatarInitials(item.createdByName)}
            </span>
            <span className="truncate text-xs font-medium text-muted">{item.createdByName}</span>
          </div>

          <time
            dateTime={item.createdAt}
            className="text-[10px] tracking-tighter whitespace-nowrap text-muted uppercase"
          >
            {formatDateTime(item.createdAt)}
          </time>
        </div>

        <Button
          variant="secondary"
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
          disabled={loading}
          onClick={() => onInsert(item)}
        >
          {kind === "node" ? <Plus className="size-4" /> : <Download className="size-4" />}
          Add to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
