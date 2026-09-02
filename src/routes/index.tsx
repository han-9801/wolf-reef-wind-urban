import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import { AppHeader } from "@/components/agent/app-header";
import { Composer } from "@/components/agent/composer";
import { TracePanel } from "@/components/agent/trace-panel";
import { WorkspacePanel } from "@/components/agent/workspace-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgentStore } from "@/store/agent-store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const checkHealth = useAgentStore((s) => s.checkHealth);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <AppHeader />
      <div className="hidden min-h-0 flex-1 md:flex">
        <PanelGroup orientation="horizontal" className="h-full w-full">
          <Panel defaultSize="54%" minSize="36%">
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-hidden">
                <TracePanel />
              </div>
              <Composer />
            </div>
          </Panel>
          <PanelResizeHandle className="w-px bg-border transition-colors duration-150 hover:bg-primary/40" />
          <Panel defaultSize="46%" minSize="28%">
            <div className="h-full min-h-0 overflow-hidden">
              <WorkspacePanel />
            </div>
          </Panel>
        </PanelGroup>
      </div>
      <MobileShell />
    </div>
  );
}

function MobileShell() {
  const [tab, setTab] = useState("trace");

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className="flex min-h-0 flex-1 flex-col md:hidden"
    >
      <div className="border-b border-border px-3 py-2">
        <TabsList className="w-full">
          <TabsTrigger value="trace">对话</TabsTrigger>
          <TabsTrigger value="files">工作区</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent
        value="trace"
        className="flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
      >
        <div className="min-h-0 flex-1 overflow-hidden">
          <TracePanel />
        </div>
        <Composer />
      </TabsContent>
      <TabsContent
        value="files"
        className="min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
      >
        <WorkspacePanel />
      </TabsContent>
    </Tabs>
  );
}
