import { useFlowchartStore } from "@/store/useFlowchartStore";
import {
  NODE_BORDER_COLORS,
  NODE_BG_COLORS,
  EDGE_COLORS,
} from "@/utils/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  FlowNodeType,
  BorderStyle,
  NodeShape,
  FlowNode,
  FlowEdge,
} from "@/types/flowchart";

const NODE_TYPE_OPTIONS: { value: FlowNodeType; label: string }[] = [
  { value: "task", label: "タスク" },
  { value: "decision", label: "判定" },
  { value: "subprocess", label: "サブプロセス" },
  { value: "annotation", label: "注釈" },
  { value: "badge", label: "バッジ" },
];

const BORDER_STYLE_OPTIONS: { value: BorderStyle; label: string }[] = [
  { value: "solid", label: "実線" },
  { value: "dashed", label: "破線" },
  { value: "double", label: "二重線" },
];

const SHAPE_OPTIONS: { value: NodeShape; label: string }[] = [
  { value: "rectangle", label: "四角形" },
  { value: "diamond", label: "ひし形" },
  { value: "rounded", label: "角丸" },
];

const TEXT_COLORS = [
  { name: "black", value: "#333333" },
  { name: "red", value: "#E53935" },
  { name: "blue", value: "#1E88E5" },
  { name: "green", value: "#43A047" },
  { name: "orange", value: "#E65100" },
  { name: "gray", value: "#9E9E9E" },
];

/**
 * Color swatch picker component.
 */
function ColorSwatches({
  colors,
  selected,
  onChange,
}: {
  colors: Record<string, string> | { name: string; value: string }[];
  selected: string;
  onChange: (color: string) => void;
}) {
  const entries = Array.isArray(colors)
    ? colors
    : Object.entries(colors).map(([name, value]) => ({ name, value }));

  return (
    <div className="flex gap-1 flex-wrap">
      {entries.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`w-6 h-6 rounded border-2 transition-all ${
            selected === item.value
              ? "border-zinc-600 scale-110"
              : "border-zinc-200 hover:border-zinc-400"
          }`}
          style={{ backgroundColor: item.value }}
          onClick={() => onChange(item.value)}
          title={item.name}
        />
      ))}
    </div>
  );
}

/**
 * Node properties editor sub-panel.
 */
function NodeProperties({ node }: { node: FlowNode }) {
  const { updateNode, project } = useFlowchartStore();
  const { lanes, phases } = project;

  const handleUpdate = (partial: Partial<FlowNode>) => {
    updateNode(node.id, partial);
  };

  const handleStyleUpdate = (stylePatch: Partial<FlowNode["style"]>) => {
    updateNode(node.id, { style: { ...node.style, ...stylePatch } });
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="space-y-1">
        <Label>ラベル</Label>
        <Input
          value={node.label}
          onChange={(e) => handleUpdate({ label: e.target.value })}
          placeholder="ノードラベル"
        />
      </div>

      {/* Sublabel */}
      <div className="space-y-1">
        <Label>サブラベル</Label>
        <Input
          value={node.sublabel ?? ""}
          onChange={(e) =>
            handleUpdate({ sublabel: e.target.value || undefined })
          }
          placeholder="サブラベル（任意）"
        />
      </div>

      {/* Type */}
      <div className="space-y-1">
        <Label>タイプ</Label>
        <Select
          value={node.type}
          onValueChange={(v) => handleUpdate({ type: v as FlowNodeType })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NODE_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Shape */}
      <div className="space-y-1">
        <Label>形状</Label>
        <Select
          value={node.style.shape}
          onValueChange={(v) => handleStyleUpdate({ shape: v as NodeShape })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHAPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Border color */}
      <div className="space-y-1">
        <Label>枠線の色</Label>
        <ColorSwatches
          colors={NODE_BORDER_COLORS}
          selected={node.style.borderColor}
          onChange={(c) => handleStyleUpdate({ borderColor: c })}
        />
      </div>

      {/* Border style */}
      <div className="space-y-1">
        <Label>枠線のスタイル</Label>
        <Select
          value={node.style.borderStyle}
          onValueChange={(v) =>
            handleStyleUpdate({ borderStyle: v as BorderStyle })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BORDER_STYLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Background color */}
      <div className="space-y-1">
        <Label>背景色</Label>
        <ColorSwatches
          colors={NODE_BG_COLORS}
          selected={node.style.backgroundColor}
          onChange={(c) => handleStyleUpdate({ backgroundColor: c })}
        />
      </div>

      {/* Text color */}
      <div className="space-y-1">
        <Label>文字色</Label>
        <ColorSwatches
          colors={TEXT_COLORS}
          selected={node.style.textColor}
          onChange={(c) => handleStyleUpdate({ textColor: c })}
        />
      </div>

      {/* Lane assignment */}
      <div className="space-y-1">
        <Label>レーン</Label>
        <Select
          value={node.laneId}
          onValueChange={(v) => handleUpdate({ laneId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="レーンを選択" />
          </SelectTrigger>
          <SelectContent>
            {lanes.map((lane) => (
              <SelectItem key={lane.id} value={lane.id}>
                {lane.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Phase assignment */}
      <div className="space-y-1">
        <Label>フェーズ</Label>
        <Select
          value={node.phaseId ?? "__none__"}
          onValueChange={(v) =>
            handleUpdate({ phaseId: v === "__none__" ? undefined : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="フェーズを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">なし</SelectItem>
            {phases.map((phase) => (
              <SelectItem key={phase.id} value={phase.id}>
                {phase.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * Edge properties editor sub-panel.
 */
function EdgeProperties({ edge }: { edge: FlowEdge }) {
  const { updateEdge } = useFlowchartStore();

  const handleUpdate = (partial: Partial<FlowEdge>) => {
    updateEdge(edge.id, partial);
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="space-y-1">
        <Label>ラベル</Label>
        <Input
          value={edge.label ?? ""}
          onChange={(e) =>
            handleUpdate({ label: e.target.value || undefined })
          }
          placeholder="エッジラベル（任意）"
        />
      </div>

      {/* Line style */}
      <div className="space-y-1">
        <Label>線のスタイル</Label>
        <Select
          value={edge.lineStyle}
          onValueChange={(v) =>
            handleUpdate({ lineStyle: v as "solid" | "dashed" })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">実線</SelectItem>
            <SelectItem value="dashed">破線</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Color */}
      <div className="space-y-1">
        <Label>色</Label>
        <ColorSwatches
          colors={EDGE_COLORS}
          selected={edge.color ?? "#333333"}
          onChange={(c) => handleUpdate({ color: c })}
        />
      </div>

      {/* Animated toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="edge-animated"
          checked={edge.animated ?? false}
          onChange={(e) => handleUpdate({ animated: e.target.checked })}
          className="rounded border-zinc-300"
        />
        <Label htmlFor="edge-animated">アニメーション</Label>
      </div>
    </div>
  );
}

/**
 * Properties panel that shows editors for the currently selected node or edge.
 * Shows a placeholder message when nothing is selected.
 */
export function PropertiesPanel() {
  const { project, selectedNodeId, selectedEdgeId } = useFlowchartStore();

  const selectedNode = selectedNodeId
    ? project.nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  const selectedEdge = selectedEdgeId
    ? project.edges.find((e) => e.id === selectedEdgeId) ?? null
    : null;

  return (
    <div className="p-2">
      {selectedNode && (
        <>
          <p className="text-xs font-medium text-zinc-700 mb-2">
            ノードのプロパティ
          </p>
          <NodeProperties node={selectedNode} />
        </>
      )}

      {selectedEdge && (
        <>
          <p className="text-xs font-medium text-zinc-700 mb-2">
            エッジのプロパティ
          </p>
          <EdgeProperties edge={selectedEdge} />
        </>
      )}

      {!selectedNode && !selectedEdge && (
        <p className="text-xs text-zinc-400 italic py-8 text-center">
          ノードまたはエッジを選択してプロパティを編集
        </p>
      )}
    </div>
  );
}
