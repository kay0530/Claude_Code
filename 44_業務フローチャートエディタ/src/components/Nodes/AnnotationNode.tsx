import { useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowNode } from "../../types/flowchart";
import { useFlowchartStore } from "../../store/useFlowchartStore";

/**
 * Borderless text annotation node.
 * Displays text (typically in red) with no visible border or background.
 * Has a single source handle on the right side, hidden until hover.
 * Supports inline label editing on double-click.
 */
export function AnnotationNode({ data, selected }: NodeProps) {
  const node = data as unknown as FlowNode;
  const { style, label } = node;

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

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
        color: style.textColor,
        fontSize: style.fontSize ?? 11,
        whiteSpace: "pre-line",
        lineHeight: 1.4,
        padding: "2px 4px",
        background: "transparent",
        border: "none",
        cursor: editing ? "text" : "grab",
        boxShadow: selected ? "0 0 0 1px #3B82F680" : "none",
        borderRadius: 2,
      }}
      className="annotation-node"
      onDoubleClick={() => {
        setEditing(true);
        setEditText(label);
      }}
    >
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
            fontSize: style.fontSize ?? 11,
            textAlign: "left",
            outline: "none",
            background: "white",
            color: "#222",
          }}
        />
      ) : (
        label
      )}

      {/* Single source handle on the right, hidden by default */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          background: "#E53935",
          width: 5,
          height: 5,
          opacity: 0,
          transition: "opacity 0.2s",
        }}
        className="annotation-handle"
      />

      {/* Inline styles for hover effect */}
      <style>{`
        .annotation-node:hover .annotation-handle {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
