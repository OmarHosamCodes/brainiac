import { Check, Loader2, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Readable labels for common canvas + agency tools. */
const TOOL_LABELS: Record<string, string> = {
  ui_present: "Painting canvas",
  list_dashboard_nodes: "Listing nodes",
  search_dashboard: "Searching canvas",
  list_marketplace_items: "Listing marketplace",
  search_marketplace: "Searching marketplace",
  get_node_details: "Reading node",
  get_tab_details: "Reading tab",
  get_block_details: "Reading block",
  get_marketplace_item_details: "Reading marketplace item",
  create_node: "Creating node",
  replace_node: "Updating node",
  delete_node: "Deleting node",
  create_tab: "Creating tab",
  replace_tab: "Updating tab",
  delete_tab: "Deleting tab",
  create_block: "Creating block",
  patch_block: "Patching block",
  replace_block: "Updating block",
  delete_block: "Deleting block",
  fetch_web_page: "Fetching page",
  get_current_time: "Checking time",
  list_agency_time_entries: "Listing time entries",
  list_agency_projects: "Listing projects",
  list_agency_members: "Listing members",
  get_agency_time_summary: "Summarizing time",
  get_agency_reports_summary: "Summarizing reports",
};

export type WorkspaceAgentThinkingStep = {
  id: string;
  name: string;
  done: boolean;
};

function toolLabel(name: string): string {
  const known = TOOL_LABELS[name];
  if (known) return known;
  return name
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const STEP_TONES = [
  "bg-secondary/20 text-secondary-foreground",
  "bg-primary/18 text-primary",
  "bg-chart-1/20 text-chart-1",
  "bg-chart-3/20 text-chart-3",
  "bg-chart-5/20 text-chart-5",
] as const;

/** Waiting → colored steps; active burns primary; complete settles secondary. */
export function WorkspaceAgentThinkingActivityView({
  steps,
  live,
}: {
  steps: WorkspaceAgentThinkingStep[];
  live: boolean;
}) {
  // MotionConfig reducedMotion="user" on the shell owns a11y motion preference.
  if (steps.length === 0 && !live) return null;

  const active = [...steps].reverse().find((s) => !s.done) ?? null;
  const doneCount = steps.filter((s) => s.done).length;
  const stepsComplete = steps.length > 0 && doneCount === steps.length;
  const working = live && !stepsComplete;
  const statusLine = active
    ? toolLabel(active.name)
    : working && steps.length === 0
      ? "Thinking"
      : stepsComplete
        ? doneCount === 1
          ? "1 step complete"
          : `${doneCount} steps complete`
        : "Working";

  return (
    <motion.div
      layout
      className={cn(
        "relative max-w-[min(100%,36rem)] overflow-hidden rounded-xl border shadow-sm",
        working ? "border-primary/35 bg-primary/6" : "border-border bg-muted/40",
      )}
      role="status"
      aria-label="Assistant activity"
      aria-live="polite"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: EASE_OUT_EXPO }}
    >
      {working ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,color-mix(in_oklab,var(--primary)_16%,transparent)_50%,transparent_60%)] motion-reduce:hidden"
          animate={{ x: ["-40%", "120%"] }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      ) : null}

      <div className="relative flex items-center gap-2 px-2.5 py-2">
        <span className="relative flex size-5 shrink-0 items-center justify-center">
          {working ? (
            <>
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-primary/30 motion-safe:animate-ping"
              />
              <motion.span
                animate={{ rotate: [0, 10, -6, 0], scale: [1, 1.08, 1] }}
                transition={{
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: EASE_OUT_EXPO,
                }}
                className="relative flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
              >
                <Sparkles className="size-3" aria-hidden />
              </motion.span>
            </>
          ) : (
            <motion.span
              key="done-badge"
              initial={{ scale: 0.45, rotate: -16, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 18,
                mass: 0.55,
              }}
              className="flex size-5 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-sm"
            >
              <Check className="size-3 stroke-[2.5]" aria-hidden />
            </motion.span>
          )}
        </span>
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-[11px] font-semibold tracking-tight",
            working ? "text-primary" : "text-muted-foreground",
          )}
        >
          {statusLine}
          {working ? (
            <span className="ms-0.5 inline-flex gap-px text-primary" aria-hidden>
              <span className="motion-safe:animate-pulse">.</span>
              <span className="motion-safe:animate-pulse [animation-delay:120ms]">.</span>
              <span className="motion-safe:animate-pulse [animation-delay:240ms]">.</span>
            </span>
          ) : null}
        </p>
        {steps.length > 0 ? (
          <motion.span
            key={`${doneCount}-${steps.length}`}
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums",
              stepsComplete
                ? "bg-secondary/25 text-muted-foreground"
                : "bg-primary/15 text-primary",
            )}
          >
            {doneCount}/{steps.length}
          </motion.span>
        ) : null}
      </div>

      {steps.length > 0 ? (
        <ul className="relative flex flex-col gap-0.5 border-t border-border/40 px-1.5 py-1.5">
          <AnimatePresence initial={false}>
            {steps.map((state, index) => {
              const isActive = working && state.id === active?.id;
              const tone = STEP_TONES[index % STEP_TONES.length]!;
              return (
                <motion.li
                  key={state.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.28,
                    delay: Math.min(index, 5) * 0.04,
                    ease: EASE_OUT_EXPO,
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-1.5 py-1 text-[11px] leading-none",
                    isActive && "bg-primary/12 ring-1 ring-primary/25",
                    state.done && !isActive && "text-foreground/70",
                    !state.done && !isActive && "text-muted-foreground",
                  )}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {state.done ? (
                      <motion.span
                        initial={{ scale: 0.25, rotate: -30, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 480,
                          damping: 16,
                        }}
                        className={cn("flex size-4 items-center justify-center rounded-full", tone)}
                      >
                        <Check className="size-2.5 stroke-[2.5]" aria-hidden />
                      </motion.span>
                    ) : isActive ? (
                      <span className="relative flex size-4 items-center justify-center">
                        <motion.span
                          aria-hidden
                          className="absolute inset-0 rounded-full bg-primary/35 motion-reduce:hidden"
                          animate={{
                            scale: [1, 1.45, 1],
                            opacity: [0.55, 0, 0.55],
                          }}
                          transition={{
                            duration: 1.15,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: EASE_OUT_EXPO,
                          }}
                        />
                        <Loader2
                          className="relative size-3.5 animate-spin text-primary motion-reduce:animate-none"
                          aria-hidden
                        />
                      </span>
                    ) : (
                      <span className="size-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
                    )}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      isActive && "font-semibold text-primary",
                      state.done && "font-medium",
                    )}
                  >
                    {toolLabel(state.name)}
                  </span>
                  <span className="sr-only">
                    {state.done ? "finished" : isActive ? "running" : "queued"}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      ) : null}
    </motion.div>
  );
}

export function toolPartsToThinkingSteps(
  toolParts: Array<{
    toolCallId: string;
    toolName: string;
    state: string;
  }>,
): WorkspaceAgentThinkingStep[] {
  return toolParts.map((part) => ({
    id: part.toolCallId,
    name: part.toolName,
    done: part.state === "output-available" || part.state === "output-error",
  }));
}
