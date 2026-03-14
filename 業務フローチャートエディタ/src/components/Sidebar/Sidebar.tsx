import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NodePalette } from "./NodePalette";
import { LaneEditor } from "./LaneEditor";
import { PhaseEditor } from "./PhaseEditor";
import { PropertiesPanel } from "./PropertiesPanel";
import { SIDEBAR_WIDTH } from "@/utils/constants";

/**
 * Main sidebar component with tabbed panels for node palette,
 * lane editor, phase editor, and properties panel.
 */
export function Sidebar() {
  return (
    <div
      className="h-full border-r border-zinc-200 bg-zinc-50 flex flex-col"
      style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
    >
      <Tabs defaultValue="nodes" className="flex flex-col h-full">
        <div className="px-2 pt-2 shrink-0">
          <TabsList className="w-full">
            <TabsTrigger value="nodes" className="flex-1">
              ノード
            </TabsTrigger>
            <TabsTrigger value="lanes" className="flex-1">
              レーン
            </TabsTrigger>
            <TabsTrigger value="phases" className="flex-1">
              フェーズ
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex-1">
              プロパティ
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="nodes">
            <NodePalette />
          </TabsContent>

          <TabsContent value="lanes">
            <LaneEditor />
          </TabsContent>

          <TabsContent value="phases">
            <PhaseEditor />
          </TabsContent>

          <TabsContent value="properties">
            <PropertiesPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
