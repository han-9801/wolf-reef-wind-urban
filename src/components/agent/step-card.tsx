import { Brain, Eye, Hammer, MessageSquare, Flag, TriangleAlert } from "lucide-react";
import type { TraceEvent } from "@/lib/agent/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const KIND_META = {
  user: { label: "任务", variant: "default" as const, Icon: MessageSquare },
  thought: { label: "思考", variant: "thought" as const, Icon: Brain },
  action: { label: "行动", variant: "action" as const, Icon: Hammer },
  observation: { label: "观察", variant: "observe" as const, Icon: Eye },
  final: { label: "完成", variant: "final" as const, Icon: Flag },
  error: { label: "中断", variant: "error" as const, Icon: TriangleAlert },
};

export function StepCard({ event }: { event: TraceEvent }) {
  const meta = KIND_META[event.kind];
  const body =
    event.kind === "action"
      ? event.input
      : event.kind === "user" ||
          event.kind === "thought" ||
          event.kind === "observation" ||
          event.kind === "final" ||
          event.kind === "error"
        ? event.text
        : "";

  return (
    <article
      className={cn(
        "circuit-enter relative grid grid-cols-[20px_1fr] gap-3",
        event.kind === "final" && "mt-1",
      )}
    >
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "mt-0.5 flex size-5 items-center justify-center rounded-full",
            event.kind === "final"
              ? "bg-primary text-primary-foreground"
              : event.kind === "error"
                ? "bg-destructive/20 text-destructive"
                : "bg-accent text-muted-foreground",
          )}
        >
          <meta.Icon className="size-3" strokeWidth={1.8} />
        </span>
        <span className="mt-1 w-px flex-1 bg-border" />
      </div>

      <div
        className={cn(
          "mb-4 min-w-0 rounded-lg p-3",
          event.kind === "final"
            ? "bg-primary/8 shadow-[var(--shadow-border)]"
            : "bg-card shadow-[var(--shadow-border)]",
        )}
      >
        <header className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {event.kind === "action" && (
            <span className="font-mono text-[11px] text-primary">{event.tool}</span>
          )}
          {"iteration" in event && (
            <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
              {String(event.iteration).padStart(2, "0")}
            </span>
          )}
        </header>
        <pre
          className={cn(
            "max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed",
            event.kind === "thought" || event.kind === "user" || event.kind === "final"
              ? "font-sans text-sm text-foreground"
              : "text-muted-foreground",
            event.kind === "error" && "text-destructive",
          )}
        >
          {body || "—"}
        </pre>
      </div>
    </article>
  );
}
