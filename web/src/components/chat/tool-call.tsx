"use client";

import type { ToolUIPart, DynamicToolUIPart } from "ai";
import { getToolName } from "ai";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertCircle,
  Wrench,
} from "lucide-react";
import { CodeBlock } from "@/components/ai-elements/code-block";

type ToolPart = ToolUIPart | DynamicToolUIPart;

function isRunning(state: ToolPart["state"]) {
  return state === "input-streaming" || state === "input-available";
}

function isDone(state: ToolPart["state"]) {
  return state === "output-available";
}

function isError(state: ToolPart["state"]) {
  return state === "output-error" || state === "output-denied";
}

export function ToolCall({ part }: { part: ToolPart }) {
  const name = getToolName(part);
  const running = isRunning(part.state);
  const done = isDone(part.state);
  const error = isError(part.state);

  return (
    <Collapsible className="group my-2">
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all",
          "hover:bg-muted/50",
          running && "border-blue-500/30 bg-blue-500/5",
          done && "border-green-500/20 bg-green-500/5",
          error && "border-red-500/20 bg-red-500/5"
        )}
      >
        {/* Status icon */}
        {running && (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-blue-400" />
        )}
        {done && (
          <CheckCircle2 className="size-3.5 shrink-0 text-green-500" />
        )}
        {error && (
          <AlertCircle className="size-3.5 shrink-0 text-red-500" />
        )}
        {!running && !done && !error && (
          <Wrench className="size-3.5 shrink-0 text-muted-foreground" />
        )}

        {/* Tool name */}
        <span className="flex-1 truncate font-mono font-medium text-muted-foreground">
          {name}
        </span>

        {/* Running pulse dot */}
        {running && (
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
          </span>
        )}

        {/* Expand chevron */}
        <ChevronRight className="size-3 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="mt-1 space-y-2 rounded-lg border bg-muted/30 p-3">
          {/* Input */}
          {part.input != null && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Input
              </p>
              <div className="max-h-48 overflow-auto rounded-md bg-background">
                <CodeBlock
                  code={JSON.stringify(part.input, null, 2)}
                  language="json"
                />
              </div>
            </div>
          )}

          {/* Output */}
          {part.output != null && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Output
              </p>
              <div className="max-h-48 overflow-auto rounded-md bg-background">
                <CodeBlock
                  code={
                    typeof part.output === "string"
                      ? part.output
                      : JSON.stringify(part.output, null, 2)
                  }
                  language="json"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {part.errorText && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                Error
              </p>
              <p className="text-xs text-red-400">{part.errorText}</p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
