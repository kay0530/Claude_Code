import React from "react";
import type { FlowNodeType } from "@/types/flowchart";
import {
  STYLE_STANDARD_TASK,
  STYLE_IMPORTANT_TASK,
  STYLE_DECISION,
  STYLE_DASHED_TASK,
  STYLE_ANNOTATION,
  STYLE_OPERATOR_BADGE,
} from "@/utils/constants";
import type { NodeStyle } from "@/types/flowchart";

interface PaletteItem {
  type: FlowNodeType;
  preset: string;
  label: string;
  style: NodeStyle;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: "task",
    preset: "standard",
    label: "標準タスク",
    style: STYLE_STANDARD_TASK,
  },
  {
    type: "task",
    preset: "important",
    label: "重要タスク",
    style: STYLE_IMPORTANT_TASK,
  },
  {
    type: "decision",
    preset: "decision",
    label: "分岐",
    style: STYLE_DECISION,
  },
  {
    type: "subprocess",
    preset: "standard",
    label: "サブプロセス",
    style: { ...STYLE_STANDARD_TASK, shape: "rounded" as const },
  },
  {
    type: "task",
    preset: "dashed",
    label: "任意タスク",
    style: STYLE_DASHED_TASK,
  },
  {
    type: "annotation",
    preset: "annotation",
    label: "注釈テキスト",
    style: STYLE_ANNOTATION,
  },
  {
    type: "badge",
    preset: "badge",
    label: "OPERATORバッジ",
    style: STYLE_OPERATOR_BADGE,
  },
];

/**
 * Renders a small preview box that matches the node's visual style.
 */
function NodePreview({ item }: { item: PaletteItem }) {
  const { style } = item;

  // Diamond shape for decision nodes – proper SVG diamond (wider than tall)
  if (style.shape === "diamond") {
    return (
      <div className="flex items-center justify-center w-12 h-9">
        <svg width="44" height="32" viewBox="0 0 44 32">
          <polygon
            points="22,1 43,16 22,31 1,16"
            fill={style.backgroundColor}
            stroke={style.borderColor}
            strokeWidth={style.borderWidth || 1}
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="w-16 h-7 flex items-center justify-center text-[9px] shrink-0"
      style={{
        border:
          style.borderColor === "transparent"
            ? "1px dashed #ccc"
            : `${style.borderWidth || 1}px ${style.borderStyle} ${style.borderColor}`,
        backgroundColor:
          style.backgroundColor === "transparent"
            ? "white"
            : style.backgroundColor,
        color: style.textColor,
        borderRadius: style.shape === "rounded" ? "6px" : "2px",
      }}
    >
      {item.type === "annotation" ? "Aa" : ""}
    </div>
  );
}

/**
 * Draggable node palette for the sidebar.
 * Users can drag items from here onto the canvas to create nodes.
 */
export function NodePalette() {
  const onDragStart = (
    e: React.DragEvent,
    type: FlowNodeType,
    preset: string
  ) => {
    e.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({ type, preset })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="space-y-1.5 p-2">
      <p className="text-xs text-zinc-500 mb-2">
        ドラッグしてキャンバスに追加
      </p>
      {PALETTE_ITEMS.map((item) => (
        <div
          key={`${item.type}-${item.preset}`}
          draggable
          onDragStart={(e) => onDragStart(e, item.type, item.preset)}
          className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-2 cursor-grab hover:bg-zinc-50 hover:border-zinc-300 transition-colors active:cursor-grabbing"
        >
          <NodePreview item={item} />
          <span className="text-xs text-zinc-700">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
