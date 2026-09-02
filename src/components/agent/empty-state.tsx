import { Brain, Hammer, Eye } from "lucide-react";
import { EXAMPLE_TASKS } from "@/lib/agent/types";
import { useAgentStore } from "@/store/agent-store";
import { CircuitMark } from "./circuit-mark";

const NODES = [
  {
    icon: Brain,
    label: "思考",
    name: "Think",
    body: "拆解目标，决定下一步。",
  },
  {
    icon: Hammer,
    label: "行动",
    name: "Act",
    body: "调用计算器、文件、沙箱或网页。",
  },
  {
    icon: Eye,
    label: "观察",
    name: "Observe",
    body: "读取结果，再规划下一拍。",
  },
] as const;

export function EmptyState() {
  const run = useAgentStore((s) => s.run);
  const status = useAgentStore((s) => s.status);
  const disabled = status === "running";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-1 py-4">
      <div className="circuit-enter flex flex-col gap-4">
        <CircuitMark className="size-10" />
        <h2 className="font-display text-[2rem] leading-[1.15] tracking-[-0.03em] text-foreground italic sm:text-[2.35rem]">
          思考，然后动手。
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Circuit 不是一次答完的聊天框。它会规划步骤、调用工具、根据返回结果调整，直到把任务做完——每一步都摊开给你看。
        </p>
      </div>

      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {NODES.map((node, i) => (
          <li
            key={node.label}
            className="circuit-enter rounded-lg bg-card p-3 shadow-[var(--shadow-border)]"
            style={{ animationDelay: `${80 + i * 70}ms` }}
          >
            <div className="mb-3 flex items-center justify-between">
              <node.icon className="size-4 text-primary" strokeWidth={1.6} />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {String(i + 1).padStart(2, "0")} {node.name}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">{node.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {node.body}
            </p>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          试一个任务
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {EXAMPLE_TASKS.map((task) => (
            <button
              key={task.title}
              type="button"
              disabled={disabled}
              onClick={() => run(task.prompt)}
              className="group rounded-lg bg-card p-3.5 text-left shadow-[var(--shadow-border)] transition-[box-shadow,transform] duration-150 ease-out hover:shadow-[var(--shadow-border-hover)] active:scale-[0.98] disabled:opacity-40"
            >
              <p className="text-sm font-medium text-foreground">{task.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {task.prompt}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
