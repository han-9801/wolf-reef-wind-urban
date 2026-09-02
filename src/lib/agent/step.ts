import { createServerFn } from "@tanstack/react-start";
import type {
  AgentStepResult,
  ChatMessage,
  FileMap,
  ToolCall,
} from "./types";

const MODEL = "grok-4.5";
const MAX_TOKENS = 900;

function systemPrompt(files: FileMap): string {
  const listing = Object.keys(files).sort().join(", ") || "(空)";
  return `你是 Circuit，一个编程智能体。你通过 ReAct 循环工作：思考 → 调用工具 → 观察结果 → 再思考，直到任务完成。

当前工作区文件：${listing}

规则：
1. 任何数学计算必须用 calculator，禁止心算。
2. 写文件必须用 write_file；读文件用 read_file。
3. 运行 JavaScript 必须用 run_js。
4. 需要网页内容用 web_fetch。
5. 每次只调用一个工具。
6. 调用工具前，用一两句中文说明当前思考（放在 message content 里）。
7. 任务完成后不要再调用工具，直接给出简洁的最终回答（中文，可含文件路径）。
8. 工具失败时分析原因，修正参数后重试；同一工具连续失败两次则向用户说明原因。
9. 不要编造工具结果。不要访问工作区以外的真实文件系统。`;
}

type XaiMessage = {
  role: string;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

type XaiResponse = {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason?: string;
  }>;
  usage?: { total_tokens?: number };
  error?: { message?: string };
};

export const getAgentHealth = createServerFn({ method: "GET" }).handler(
  async () => ({ ai: Boolean(process.env.XAI_API_KEY) }),
);

export const stepAgent = createServerFn({ method: "POST" })
  .validator((input: { messages: ChatMessage[]; files: FileMap }) => {
    if (!input || !Array.isArray(input.messages)) {
      throw new Error("invalid payload");
    }
    const files: FileMap = {};
    for (const [key, value] of Object.entries(input.files ?? {})) {
      if (
        typeof key === "string" &&
        typeof value === "string" &&
        key.length <= 120 &&
        !key.includes("..") &&
        value.length <= 32_000
      ) {
        files[key] = value;
      }
    }
    return { messages: input.messages.slice(-40), files };
  })
  .handler(async ({ data }): Promise<AgentStepResult> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "当前环境未启用 AI 能力，请稍后再试。" };
    }

    const { executeToolAsync, TOOL_DEFS } = await import("./tools.server");

    const openaiMessages: XaiMessage[] = [
      { role: "system", content: systemPrompt(data.files) },
      ...data.messages.map(toXaiMessage),
    ];

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: openaiMessages,
        tools: TOOL_DEFS,
        tool_choice: "auto",
        parallel_tool_calls: false,
        temperature: 0.2,
        max_tokens: MAX_TOKENS,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: `模型调用失败（${res.status}）${text.slice(0, 180)}`,
      };
    }

    const body = (await res.json()) as XaiResponse;
    if (body.error?.message) {
      return { ok: false, error: body.error.message };
    }

    const message = body.choices?.[0]?.message;
    if (!message) {
      return { ok: false, error: "模型没有返回内容，请重试。" };
    }

    const thought = (message.content ?? "").trim();
    const toolCalls = message.tool_calls ?? [];
    const tokens = body.usage?.total_tokens ?? 0;

    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: message.content ?? null,
      tool_calls: toolCalls.length ? toolCalls : undefined,
    };

    if (toolCalls.length === 0) {
      const finalAnswer = thought || "任务已完成，但模型没有给出明确结论。";
      return {
        ok: true,
        done: true,
        thought,
        actions: [],
        finalAnswer,
        messages: [...data.messages, assistantMsg],
        files: data.files,
        tokens,
      };
    }

    let files = { ...data.files };
    const actions: Array<{
      tool: string;
      input: string;
      observation: string;
    }> = [];
    const nextMessages: ChatMessage[] = [...data.messages, assistantMsg];

    const call = toolCalls[0];
    if (call) {
      const name = call.function?.name ?? "unknown";
      const input = call.function?.arguments ?? "{}";
      const result = await executeToolAsync(name, input, files);
      files = result.files;
      actions.push({
        tool: name,
        input: prettyInput(name, input),
        observation: result.observation,
      });
      nextMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result.observation,
      });
    }

    return {
      ok: true,
      done: false,
      thought,
      actions,
      finalAnswer: null,
      messages: nextMessages,
      files,
      tokens,
    };
  });

function toXaiMessage(msg: ChatMessage): XaiMessage {
  if (msg.role === "tool") {
    return {
      role: "tool",
      content: msg.content,
      tool_call_id: msg.tool_call_id,
    };
  }
  if (msg.role === "assistant") {
    return {
      role: "assistant",
      content: msg.content,
      tool_calls: msg.tool_calls,
    };
  }
  return { role: "user", content: msg.content };
}

function prettyInput(name: string, raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (name === "calculator" && typeof parsed.expression === "string") {
      return parsed.expression;
    }
    if (name === "web_fetch" && typeof parsed.url === "string") {
      return parsed.url;
    }
    if (name === "read_file" && typeof parsed.path === "string") {
      return parsed.path;
    }
    if (name === "write_file" && typeof parsed.path === "string") {
      const content = String(parsed.content ?? "");
      const preview =
        content.length > 280 ? content.slice(0, 280) + "…" : content;
      return `${parsed.path}\n${preview}`;
    }
    if (name === "run_js") {
      if (typeof parsed.path === "string" && parsed.path) return parsed.path;
      return String(parsed.code ?? raw);
    }
    if (name === "get_time" || name === "list_files") return "—";
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}
