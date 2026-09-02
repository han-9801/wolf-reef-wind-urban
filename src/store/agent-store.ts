import { create } from "zustand";
import { getAgentHealth, stepAgent } from "@/lib/agent/step";
import {
  EXAMPLE_TASKS,
  MAX_ITERATIONS,
  SEED_FILES,
  type ChatMessage,
  type FileMap,
  type TraceEvent,
} from "@/lib/agent/types";

export type AgentStatus = "idle" | "running" | "done" | "error";

type AgentState = {
  events: TraceEvent[];
  messages: ChatMessage[];
  files: FileMap;
  activeFile: string;
  status: AgentStatus;
  iteration: number;
  tokens: number;
  aiAvailable: boolean | null;
  cancelled: boolean;
  draft: string;
  setDraft: (value: string) => void;
  setActiveFile: (path: string) => void;
  updateFile: (path: string, content: string) => void;
  checkHealth: () => Promise<void>;
  run: (task?: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
};

function nid(): string {
  return crypto.randomUUID();
}

export const useAgentStore = create<AgentState>((set, get) => ({
  events: [],
  messages: [],
  files: { ...SEED_FILES },
  activeFile: "README.md",
  status: "idle",
  iteration: 0,
  tokens: 0,
  aiAvailable: null,
  cancelled: false,
  draft: "",

  setDraft: (value) => set({ draft: value }),

  setActiveFile: (path) => set({ activeFile: path }),

  updateFile: (path, content) =>
    set((s) => ({ files: { ...s.files, [path]: content } })),

  checkHealth: async () => {
    try {
      const { ai } = await getAgentHealth();
      set({ aiAvailable: ai });
    } catch {
      set({ aiAvailable: false });
    }
  },

  stop: () => set({ cancelled: true }),

  reset: () =>
    set({
      events: [],
      messages: [],
      files: { ...SEED_FILES },
      activeFile: "README.md",
      status: "idle",
      iteration: 0,
      tokens: 0,
      cancelled: true,
      draft: "",
    }),

  run: async (task) => {
    const text = (task ?? get().draft).trim();
    if (!text || get().status === "running") return;

    set((s) => ({
      status: "running",
      cancelled: false,
      draft: "",
      iteration: 0,
      messages: [...s.messages, { role: "user", content: text }],
      events: [...s.events, { id: nid(), kind: "user", text }],
    }));

    for (let i = 1; i <= MAX_ITERATIONS; i++) {
      if (get().cancelled) {
        set({ status: get().events.some((e) => e.kind === "final") ? "done" : "idle" });
        return;
      }

      set({ iteration: i });

      let result;
      try {
        result = await stepAgent({
          data: { messages: get().messages, files: get().files },
        });
      } catch (err) {
        set((s) => ({
          status: "error",
          events: [
            ...s.events,
            {
              id: nid(),
              kind: "error",
              text: err instanceof Error ? err.message : "请求失败",
            },
          ],
        }));
        return;
      }

      if (get().cancelled) {
        set({ status: "idle" });
        return;
      }

      if (!result.ok) {
        set((s) => ({
          status: "error",
          events: [...s.events, { id: nid(), kind: "error", text: result.error }],
        }));
        return;
      }

      const extra: TraceEvent[] = [];
      if (result.thought) {
        extra.push({
          id: nid(),
          kind: "thought",
          iteration: i,
          text: result.thought,
        });
      }
      for (const action of result.actions) {
        extra.push({
          id: nid(),
          kind: "action",
          iteration: i,
          tool: action.tool,
          input: action.input,
        });
        extra.push({
          id: nid(),
          kind: "observation",
          iteration: i,
          text: action.observation,
        });
      }
      if (result.finalAnswer) {
        extra.push({ id: nid(), kind: "final", text: result.finalAnswer });
      }

      const written = Object.keys(result.files);
      const nextActive =
        result.actions.find((a) => a.tool === "write_file")?.input.split("\n")[0] ??
        get().activeFile;

      set((s) => ({
        events: [...s.events, ...extra],
        messages: result.messages,
        files: result.files,
        tokens: s.tokens + result.tokens,
        activeFile:
          nextActive && written.includes(nextActive) ? nextActive : s.activeFile,
      }));

      if (result.done) {
        set({ status: "done" });
        return;
      }
    }

    set((s) => ({
      status: "error",
      events: [
        ...s.events,
        {
          id: nid(),
          kind: "error",
          text: `已达到 ${MAX_ITERATIONS} 步上限。试着把任务拆得更小一些。`,
        },
      ],
    }));
  },
}));

export { EXAMPLE_TASKS };
