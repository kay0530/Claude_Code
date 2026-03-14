import { useState, useRef, useEffect, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import type { FlowNode } from "../../types/flowchart";
import { useFlowchartStore } from "../../store/useFlowchartStore";

/**
 * Small badge node (e.g., "OPERATOR").
 * Compact, rounded, with an orange background.
 * Purely decorative — no connection handles.
 * Supports inline label editing on double-click.
 */
export function BadgeNode({ data, selected }: NodeProps) {
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
        padding: "4px 12px",
        borderRadius: 4,
        backgroundColor: style.backgroundColor,
        color: style.textColor,
        border: `${style.borderWidth}px ${style.borderStyle} ${style.borderColor}`,
        fontSize: style.fontSize ?? 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
        textAlign: "center",
        lineHeight: 1.3,
        boxShadow: selected
          ? "0 0 0 2px #3B82F6"
          : "0 1px 2px rgba(0,0,0,0.06)",
        cursor: editing ? "text" : "grab",
      }}
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
            minWidth: 40,
            border: "1px solid #3B82F6",
            borderRadius: 2,
            padding: "1px 4px",
            fontSize: style.fontSize ?? 10,
            fontWeight: 700,
            textAlign: "center",
            outline: "none",
            background: "white",
            color: "#222",
          }}
        />
      ) : (
        label
      )}
    </div>
  );
}
