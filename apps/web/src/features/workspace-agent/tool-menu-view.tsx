import type { AgentToolCatalogEntry } from "@orch/agent/types";
import type { LucideIcon } from "lucide-react";
import {
  Eye,
  Globe,
  List,
  Loader2,
  Pencil,
  Plus,
  Replace,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";

import { Skeleton } from "@/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

type WorkspaceAgentToolMenuViewProps = {
  tools: AgentToolCatalogEntry[];
  loading: boolean;
};

const CATEGORY_ORDER = [
  "Dashboard",
  "Marketplace",
  "Nodes",
  "Tabs",
  "Blocks",
  "Canvas",
  "Agency",
  "Utilities",
] as const;

type ToolCategory = (typeof CATEGORY_ORDER)[number];

function formatToolTitle(name: string) {
  return name
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function categoryForTool(name: string): ToolCategory {
  if (name.includes("marketplace")) return "Marketplace";
  if (name.includes("dashboard")) return "Dashboard";
  if (name.includes("agency")) return "Agency";
  if (name.includes("canvas")) return "Canvas";
  if (name.includes("block")) return "Blocks";
  if (name.includes("tab")) return "Tabs";
  if (name.includes("node")) return "Nodes";
  return "Utilities";
}

function iconForTool(name: string): LucideIcon {
  const verb = name.split("_")[0] ?? "";
  switch (verb) {
    case "list":
      return List;
    case "search":
      return Search;
    case "get":
      return Eye;
    case "create":
      return Plus;
    case "replace":
      return Replace;
    case "delete":
      return Trash2;
    case "patch":
      return Pencil;
    case "fetch":
      return Globe;
    default:
      return Wrench;
  }
}

function groupToolsByCategory(tools: AgentToolCatalogEntry[]) {
  const groups = new Map<ToolCategory, AgentToolCatalogEntry[]>();
  for (const tool of tools) {
    const category = categoryForTool(tool.name);
    const list = groups.get(category);
    if (list) list.push(tool);
    else groups.set(category, [tool]);
  }
  return CATEGORY_ORDER.flatMap((category) => {
    const items = groups.get(category);
    return items?.length ? [{ category, items }] : [];
  });
}

export function WorkspaceAgentToolMenuView({ tools, loading }: WorkspaceAgentToolMenuViewProps) {
  if (loading && tools.length === 0) {
    return (
      <div className="flex flex-col gap-0.5 px-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-7 w-44" />
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <p className="px-3 py-1.5 text-sm text-muted-foreground">
        Tools appear once this menu loads.
      </p>
    );
  }

  const groups = groupToolsByCategory(tools);

  return (
    <TooltipProvider delayDuration={280}>
      <div className="flex max-h-56 flex-col gap-1 overflow-y-auto px-1">
        {loading ? (
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-foreground/70">
            <Loader2 className="size-3 animate-spin" />
            Refreshing tools
          </div>
        ) : null}
        {groups.map(({ category, items }) => (
          <div key={category} className="flex flex-col gap-0">
            <p className="px-2 pb-0.5 pt-1 text-[11px] font-medium text-muted-foreground">
              {category}
            </p>
            {items.map((tool) => {
              const Icon = iconForTool(tool.name);
              return (
                <Tooltip key={tool.name}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-foreground motion-safe:transition-colors motion-safe:duration-150 hover:bg-accent hover:text-accent-foreground"
                    >
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate">{formatToolTitle(tool.name)}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    sideOffset={10}
                    className="max-w-64 text-pretty"
                    data-workspace-agent-overlay
                  >
                    {tool.usage}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
