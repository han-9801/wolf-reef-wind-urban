import { useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgentStore } from "@/store/agent-store";
import { EmptyState } from "./empty-state";
import { StepCard } from "./step-card";

export function TracePanel() {
  const events = useAgentStore((s) => s.events);
  const status = useAgentStore((s) => s.status);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length, status]);

  if (events.length === 0) {
    return (
      <ScrollArea className="h-full">
        <div className="px-4 py-6 sm:px-6">
          <EmptyState />
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="px-4 py-5 sm:px-6">
        {events.map((event) => (
          <StepCard key={event.id} event={event} />
        ))}
        {status === "running" && (
          <div className="mb-8 flex items-center gap-2 pl-8 text-sm text-muted-foreground">
            <LoaderCircle className="size-3.5 animate-spin" />
            <span className="circuit-shimmer font-medium">思考中</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
