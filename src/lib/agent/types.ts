export const MAX_ITERATIONS = 8;

export type ToolName =
  | "calculator"
  | "write_file"
  | "read_file"
  | "list_files"
  | "run_js"
  | "web_fetch"
  | "get_time";

export type ChatMessage =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: ToolCall[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type FileMap = Record<string, string>;

export type TraceEvent =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "thought"; iteration: number; text: string }
  | {
      id: string;
      kind: "action";
      iteration: number;
      tool: string;
      input: string;
    }
  | { id: string; kind: "observation"; iteration: number; text: string }
  | { id: string; kind: "final"; text: string }
  | { id: string; kind: "error"; text: string };

export type AgentStepOk = {
  ok: true;
  done: boolean;
  thought: string;
  actions: Array<{ tool: string; input: string; observation: string }>;
  finalAnswer: string | null;
  messages: ChatMessage[];
  files: FileMap;
  tokens: number;
};

export type AgentStepErr = {
  ok: false;
  error: string;
};

export type AgentStepResult = AgentStepOk | AgentStepErr;

export const SEED_FILES: FileMap = {
  "README.md": `# Circuit Workspace

这是智能体的虚拟工作区。
Agent 读写的文件会出现在这里——不会碰到你的真实磁盘。

试着让它：
- 计算并把结果写入文件
- 写一段 JavaScript 并运行
- 抓取网页，整理成笔记
`,
};

export const EXAMPLE_TASKS = [
  {
    title: "计算并落盘",
    prompt: "计算 (123 + 456) * 789 的结果，把算式和答案写入 result.txt。",
  },
  {
    title: "写函数并测试",
    prompt:
      "在 isPrime.js 里写一个判断质数的函数 isPrime(n)，然后运行它测试 2、17、20、97，把测试结果写入 primes.md。",
  },
  {
    title: "生成页面",
    prompt:
      "写一个简洁的单页 landing.html：标题「Circuit」，一句介绍「看得见思考的编程智能体」，深色背景，居中排版。保存到工作区。",
  },
  {
    title: "抓取网页",
    prompt:
      "抓取 https://example.com 的文本，提炼标题和一段摘要，写入 notes.md。",
  },
] as const;
