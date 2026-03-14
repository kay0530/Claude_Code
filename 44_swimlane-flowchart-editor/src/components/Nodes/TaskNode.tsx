import { useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import type { FlowNode } from "../../types/flowchart";
import { useFlowchartStore } from "../../store/useFlowchartStore";

/**
 * Custom React Flow node for task and subprocess types.
 * Renders a rectangular (or rounded) box with configurable border styling,
 * a label (supporting line breaks), and an optional sublabel.
 * Supports inline label editing on double-click and resize via NodeResizer.
 */
export function TaskNode({ data, selected }: NodeProps) {
  const node = data as unknown as FlowNode;
  const { style, label, sublabel } = node;

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  const borderRadius = style.shape === "rounded" ? 8 : 0;
  const borderStyleValue =
    style.borderStyle === "double" ? "double" : style.borderStyle;

  // Auto-focus and select all text when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitEdit = useCallback(() => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== label) {
      useFlowchartStore.getState().updateNode(node.id, { label: trimmed });
    }
    setEditing(false);
  }, [editText, label, node.id]);

  const cancelEdit = useCallback(() => {
    setEditText(label);
    setEditing(false);
  }, [label]);

  return (
    <div
      style={{
        width: node.size?.width,
        height: node.size?.height,
        minWidth: 80,
        padding: "6px 10px",
        backgroundColor: style.backgroundColor,
        color: style.textColor,
        border: `${style.borderWidth}px ${borderStyleValue} ${style.borderColor}`,
        borderRadius,
        fontSize: style.fontSize ?? 12,
        whiteSpace: "pre-line",
        textAlign: "center",
        lineHeight: 1.4,
        boxShadow: selected
          ? "0 0 0 2px #3B82F6"
          : "0 1px 2px rgba(0,0,0,0.08)",
        cursor: editing ? "text" : "grab",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
      onDoubleClick={() => {
        setEditing(true);
        setEditText(label);
      }}
    >
      {/* Resize handles */}
      <NodeResizer
        minWidth={60}
        minHeight={30}
        isVisible={selected}
        lineClassName="!border-blue-400"
        handleClassName="!h-2 !w-2 !bg-blue-500 !border-blue-500 !rounded-sm"
        onResize={(_event, { width, height }) => {
          useFlowchartStore.getState().updateNode(node.id, {
            size: { width, height },
          });
        }}
      />

      {/* Target handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: "#555", width: 6, height: 6 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: "#555", width: 6, height: 6 }}
      />

      {/* Label */}
      {editing ? (
        <input
          ref={inputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitEdit();
            } else if (e.key === "Escape") {
              cancelEdit();
            }
          }}
          style={{
            width: "100%",
            border: "1px solid #3B82F6",
            borderRadius: 2,
            padding: "1px 4px",
            fontSize: style.fontSize ?? 12,
            fontWeight: 500,
            textAlign: "center",
            outline: "none",
            background: "white",
            color: "#222",
          }}
        />
      ) : (
        <div style={{ fontWeight: 500 }}>{label}</div>
      )}
      {sublabel && !editing && (
        <div
          style={{
            fontSize: (style.fontSize ?? 12) - 2,
            opacity: 0.7,
            marginTop: 2,
          }}
        >
          {sublabel}
        </div>
      )}

      {/* Source handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: "#555", width: 6, height: 6 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: "#555", width: 6, height: 6 }}
      />
    </div>
  );
}
