"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ToolUIPart } from "ai";
import { ChevronDownIcon, WrenchIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";
import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      "group not-prose w-full rounded-lg border border-border bg-background",
      className,
    )}
    {...props}
  />
);

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart["type"];
  state: ToolUIPart["state"];
  className?: string;
};

function statusLabel(status: ToolUIPart["state"]): string {
  switch (status) {
    case "input-streaming":
      return "pending";
    case "input-available":
      return "running";
    case "approval-requested":
      return "awaiting approval";
    case "approval-responded":
      return "responded";
    case "output-available":
      return "done";
    case "output-error":
      return "error";
    case "output-denied":
      return "denied";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export const ToolHeader = ({ className, title, type, state, ...props }: ToolHeaderProps) => {
  const running = state === "input-available" || state === "input-streaming";
  const errored = state === "output-error" || state === "output-denied";

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2 font-mono text-xs">
        <WrenchIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium text-foreground">
          {title ?? type.split("-").slice(1).join("-")}
        </span>
        <span
          className={cn(
            "shrink-0 text-muted-foreground",
            running && "text-foreground",
            errored && "text-destructive",
          )}
        >
          {statusLabel(state)}
        </span>
        {running ? (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full bg-primary motion-safe:animate-pulse motion-reduce:animate-none"
          />
        ) : null}
      </div>
      <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "border-t border-border text-popover-foreground outline-none",
      "data-[state=closed]:animate-out data-[state=open]:animate-in",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-1.5 overflow-hidden px-2.5 py-2", className)} {...props}>
    <p className="font-mono text-[10px] font-medium text-muted-foreground">Input</p>
    <div className="rounded-md bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolUIPart["output"];
  errorText: ToolUIPart["errorText"];
};

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output: ReactNode = <div className="font-mono text-xs">{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />;
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />;
  }

  return (
    <div className={cn("space-y-1.5 px-2.5 py-2", className)} {...props}>
      <p className="font-mono text-[10px] font-medium text-muted-foreground">
        {errorText ? "Error" : "Output"}
      </p>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText ? "bg-destructive/10 p-2 text-destructive" : "bg-muted/50 text-foreground",
        )}
      >
        {errorText ? <div className="font-mono">{errorText}</div> : null}
        {errorText ? null : Output}
      </div>
    </div>
  );
};
