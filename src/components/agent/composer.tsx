import { useRef } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAgentStore } from "@/store/agent-store";

export function Composer() {
  const draft = useAgentStore((s) => s.draft);
  const setDraft = useAgentStore((s) => s.setDraft);
  const run = useAgentStore((s) => s.run);
  const stop = useAgentStore((s) => s.stop);
  const status = useAgentStore((s) => s.status);
  const running = status === "running";
  const ref = useRef<HTMLTextAreaElement>(null);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void run();
    }
  }

  return (
    <form
      className="border-t border-border bg-background/80 p-3 backdrop-blur-sm"
      onSubmit={(e) => {
        e.preventDefault();
        void run();
      }}
    >
      <div className="flex items-end gap-2 rounded-xl bg-card p-2 shadow-[var(--shadow-border)]">
        <Textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="描述一个任务，例如：写一个快排并跑测试"
          rows={2}
          disabled={running}
          className="min-h-[44px] flex-1 border-0 bg-transparent shadow-none focus-visible:shadow-none"
        />
        {running ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="shrink-0"
            onClick={stop}
            aria-label="停止"
          >
            <Square className="size-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="shrink-0"
            disabled={!draft.trim()}
            aria-label="运行"
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </div>
      <p className="mt-2 px-1 font-mono text-[11px] text-muted-foreground">
        Ctrl / ⌘ + Enter 发送
      </p>
    </form>
  );
}
