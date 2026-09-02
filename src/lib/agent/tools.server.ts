import vm from "node:vm";
import type { FileMap } from "./types";

const MAX_FILES = 24;
const MAX_FILE_CHARS = 32_000;
const MAX_FETCH_CHARS = 2500;

const MATH_SANDBOX: Record<string, unknown> = {
  abs: Math.abs,
  round: Math.round,
  sqrt: Math.sqrt,
  pow: Math.pow,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  log: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  pi: Math.PI,
  e: Math.E,
  ceil: Math.ceil,
  floor: Math.floor,
  min: Math.min,
  max: Math.max,
  PI: Math.PI,
  E: Math.E,
};

export const TOOL_DEFS = [
  {
    type: "function" as const,
    function: {
      name: "calculator",
      description:
        "执行数学计算。输入一个数学表达式，返回精确结果。遇到任何数字计算都必须使用此工具，不要心算。支持加减乘除、括号、sqrt/pow/sin/cos/tan/log、pi、e。",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "数学表达式，例如 (123 + 456) * 789 或 sqrt(144)",
          },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_files",
      description: "列出虚拟工作区中的全部文件路径与字符数。无需参数。",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "读取工作区中某个文件的完整内容。",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "相对路径，例如 result.txt" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description: "将内容写入工作区文件。路径不存在则创建，存在则覆盖。",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "相对路径，例如 notes.md" },
          content: { type: "string", description: "完整文件内容" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_js",
      description:
        "在隔离沙箱中执行 JavaScript。无 DOM、无网络、无 Node API。可传入 code，或传入 path 运行工作区中的 .js 文件。用 console.log 输出结果。",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "要执行的 JS 源码" },
          path: {
            type: "string",
            description: "工作区文件路径，若提供则优先于 code",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "web_fetch",
      description:
        "获取公开网页的纯文本（截断）。输入完整 http/https URL。不要访问内网地址。",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "完整 URL，含协议" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_time",
      description: "返回当前日期与时间（ISO 与本地可读格式）。无需参数。",
      parameters: { type: "object", properties: {} },
    },
  },
];

export function executeTool(
  name: string,
  rawArgs: string,
  files: FileMap,
): { observation: string; files: FileMap } {
  let args: Record<string, unknown> = {};
  if (rawArgs.trim()) {
    try {
      args = JSON.parse(rawArgs) as Record<string, unknown>;
    } catch {
      return { observation: `错误：工具参数不是合法 JSON：${rawArgs}`, files };
    }
  }

  switch (name) {
    case "calculator":
      return { observation: runCalculator(String(args.expression ?? "")), files };
    case "list_files":
      return { observation: listFiles(files), files };
    case "read_file":
      return { observation: readFile(files, String(args.path ?? "")), files };
    case "write_file": {
      const next = { ...files };
      const observation = writeFile(
        next,
        String(args.path ?? ""),
        String(args.content ?? ""),
      );
      return { observation, files: next };
    }
    case "run_js": {
      const path = typeof args.path === "string" ? args.path : "";
      const fromFile = path ? files[normalizePath(path) ?? ""] : undefined;
      const code =
        fromFile !== undefined ? fromFile : String(args.code ?? "");
      if (!code.trim()) {
        return { observation: "错误：需要提供 code 或有效的 path", files };
      }
      return { observation: runJs(code), files };
    }
    case "web_fetch":
      return { observation: "PENDING_FETCH", files };
    case "get_time": {
      const now = new Date();
      return {
        observation: `ISO: ${now.toISOString()}\n本地: ${now.toLocaleString("zh-CN", { hour12: false, timeZone: "Asia/Tokyo" })} (JST)`,
        files,
      };
    }
    default:
      return {
        observation: `错误：未知工具 '${name}'。可用：calculator, list_files, read_file, write_file, run_js, web_fetch, get_time`,
        files,
      };
  }
}

export async function executeToolAsync(
  name: string,
  rawArgs: string,
  files: FileMap,
): Promise<{ observation: string; files: FileMap }> {
  if (name === "web_fetch") {
    let url = "";
    try {
      url = String((JSON.parse(rawArgs) as { url?: string }).url ?? "");
    } catch {
      return { observation: "错误：web_fetch 参数无效", files };
    }
    return { observation: await webFetch(url), files };
  }
  return executeTool(name, rawArgs, files);
}

function runCalculator(expression: string): string {
  const expr = expression.trim();
  if (!expr) return "错误：表达式为空";
  if (!/^[\d\s+\-*/%().,a-zA-Z_]+$/.test(expr)) {
    return "错误：表达式包含不允许的字符";
  }
  try {
    const result = vm.runInNewContext(expr, { ...MATH_SANDBOX }, { timeout: 400 });
    return `计算结果：${expr} = ${String(result)}`;
  } catch (err) {
    return `计算错误：${err instanceof Error ? err.message : String(err)}`;
  }
}

function listFiles(files: FileMap): string {
  const keys = Object.keys(files);
  if (keys.length === 0) return "工作区为空。";
  return keys
    .sort()
    .map((p) => `- ${p}  (${files[p]?.length ?? 0} 字符)`)
    .join("\n");
}

function readFile(files: FileMap, path: string): string {
  const key = normalizePath(path);
  if (!key) return "错误：非法路径";
  if (!(key in files)) return `错误：文件 '${key}' 不存在`;
  return `文件 ${key}：\n${files[key]}`;
}

function writeFile(files: FileMap, path: string, content: string): string {
  const key = normalizePath(path);
  if (!key) return "错误：非法路径（禁止 .. 与绝对路径）";
  if (content.length > MAX_FILE_CHARS) {
    return `错误：文件超过 ${MAX_FILE_CHARS} 字符上限`;
  }
  const exists = key in files;
  if (!exists && Object.keys(files).length >= MAX_FILES) {
    return `错误：工作区最多 ${MAX_FILES} 个文件`;
  }
  files[key] = content;
  return `已${exists ? "覆盖" : "写入"} ${key}（${content.length} 字符）`;
}

function runJs(code: string): string {
  if (code.length > 20_000) return "错误：代码过长";
  const logs: string[] = [];
  const fakeConsole = {
    log: (...args: unknown[]) => logs.push(args.map(stringify).join(" ")),
    warn: (...args: unknown[]) =>
      logs.push("[warn] " + args.map(stringify).join(" ")),
    error: (...args: unknown[]) =>
      logs.push("[error] " + args.map(stringify).join(" ")),
    info: (...args: unknown[]) => logs.push(args.map(stringify).join(" ")),
  };
  const sandbox: Record<string, unknown> = {
    console: fakeConsole,
    Math,
    JSON,
    Date,
    Array,
    Object,
    Number,
    String,
    Boolean,
    Map,
    Set,
    WeakMap,
    WeakSet,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    NaN,
    Infinity,
    undefined,
    encodeURIComponent,
    decodeURIComponent,
  };
  try {
    const result = vm.runInNewContext(code, sandbox, { timeout: 2000 });
    const parts: string[] = [];
    if (logs.length) parts.push("日志：\n" + logs.join("\n"));
    if (result !== undefined) parts.push("返回值：" + stringify(result));
    return parts.join("\n") || "执行完成（无输出）";
  } catch (err) {
    return `运行错误：${err instanceof Error ? err.message : String(err)}`;
  }
}

async function webFetch(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return "错误：URL 无法解析";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "错误：只允许 http/https";
  }
  const host = parsed.hostname.toLowerCase();
  if (isPrivateHost(host)) return "错误：不允许访问内网地址";

  try {
    const res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "CircuitAgent/1.0 (+https://x.ai)",
        Accept: "text/html,text/plain,application/json;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) return `错误：HTTP ${res.status}`;
    const raw = await res.text();
    const text = stripHtml(raw).slice(0, MAX_FETCH_CHARS);
    return `网页文本（前 ${MAX_FETCH_CHARS} 字符）：\n${text}`;
  } catch (err) {
    return `请求失败：${err instanceof Error ? err.message : String(err)}`;
  }
}

function isPrivateHost(host: string): boolean {
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }
  return (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host === "metadata.google.internal"
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePath(path: string): string | null {
  const cleaned = path.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!cleaned || cleaned.includes("..") || cleaned.includes("\0")) return null;
  if (cleaned.length > 120) return null;
  return cleaned;
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
