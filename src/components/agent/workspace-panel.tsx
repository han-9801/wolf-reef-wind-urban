import { Download, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/store/agent-store";

export function WorkspacePanel() {
  const files = useAgentStore((s) => s.files);
  const activeFile = useAgentStore((s) => s.activeFile);
  const setActiveFile = useAgentStore((s) => s.setActiveFile);
  const updateFile = useAgentStore((s) => s.updateFile);
  const paths = Object.keys(files).sort();
  const content = files[activeFile] ?? "";

  function downloadActive() {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.split("/").pop() || "file.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          工作区
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={downloadActive}
          disabled={!content}
        >
          <Download className="size-3.5" />
          下载
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <ScrollArea className="w-[9.5rem] shrink-0 border-r border-border sm:w-44">
          <ul className="flex flex-col p-1.5">
            {paths.map((path) => (
              <li key={path}>
                <button
                  type="button"
                  onClick={() => setActiveFile(path)}
                  className={cn(
                    "flex h-10 w-full items-center gap-2 rounded-md px-2 text-left font-mono text-[12px] transition-colors duration-150",
                    path === activeFile
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <FileCode2 className="size-3.5 shrink-0" strokeWidth={1.6} />
                  <span className="truncate">{path}</span>
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-border px-3 py-2">
            <p className="truncate font-mono text-[12px] text-muted-foreground">
              {activeFile}
              <span className="ml-2 tabular-nums">
                {content.length} 字符
              </span>
            </p>
          </div>
          <Textarea
            value={content}
            onChange={(e) => updateFile(activeFile, e.target.value)}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent font-mono text-[12.5px] leading-relaxed shadow-none focus-visible:shadow-none"
          />
        </div>
      </div>
    </div>
  );
}
