import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_ITERATIONS } from "@/lib/agent/types";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/store/agent-store";
import { CircuitMark } from "./circuit-mark";

const STATUS_LABEL: Record<string, string> = {
  idle: "待命",
  running: "循环中",
  done: "完成",
  error: "中断",
};

export function AppHeader() {
  const status = useAgentStore((s) => s.status);
  const iteration = useAgentStore((s) => s.iteration);
  const tokens = useAgentStore((s) => s.tokens);
  const reset = useAgentStore((s) => s.reset);
  const aiAvailable = useAgentStore((s) => s.aiAvailable);

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-border px-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <CircuitMark className="size-6 shrink-0" />
        <div className="min-w-0">
          <p className="font-display text-lg leading-none tracking-tight text-foreground italic">
            Circuit
          </p>
          <p className="mt-0.5 hidden font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:block">
            编程智能体
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {aiAvailable === false && (
          <span className="hidden font-mono text-[11px] text-destructive sm:inline">
            AI 暂不可用
          </span>
        )}
        <span
          className={cn(
            "hidden items-center gap-2 font-mono text-[11px] tabular-nums text-muted-foreground sm:flex",
          )}
        >
          <StatusDot status={status} />
          {STATUS_LABEL[status]}
          <span className="text-border">/</span>
          {String(iteration).padStart(2, "0")}/{MAX_ITERATIONS}
          <span className="text-border">/</span>
          {tokens.toLocaleString()} tok
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 px-3"
          onClick={reset}
        >
          <RotateCcw className="size-3.5" />
          重置
        </Button>
      </div>
    </header>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "size-1.5 rounded-full",
        status === "running" && "animate-pulse bg-primary",
        status === "done" && "bg-observe",
        status === "error" && "bg-destructive",
        status === "idle" && "bg-muted-foreground/50",
      )}
    />
  );
}
