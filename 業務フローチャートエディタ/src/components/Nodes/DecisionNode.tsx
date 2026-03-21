import { useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import type { FlowNode } from "../../types/flowchart";
import { useFlowchartStore } from "../../store/useFlowchartStore";

/**
 * Diamond-shaped node for decision type.
 * Uses SVG polygon for a proper proportional diamond (wider than tall).
 * Supports inline label editing on double-click and resize via NodeResizer.
 */
export function DecisionNode({ data, selected }: NodeProps) {
  const node = data as unknown as FlowNode;
  const { style, label } = node;

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  const w = node.size?.width ?? 100;
  const h = node.size?.height ?? 60;

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
        width: w,
        height: h,
        position: "relative",
      }}
      onDoubleClick={() => {
        setEditing(true);
        setEditText(label);
      }}
    >
      {/* Resize handles */}
      <NodeResizer
        minWidth={60}
        minHeight={40}
        isVisible={selected}
        lineClassName="!border-blue-400"
        handleClassName="!h-2 !w-2 !bg-blue-500 !border-blue-500 !rounded-sm"
        onResize={(_event, { width, height }) => {
          useFlowchartStore.getState().updateNode(node.id, {
            size: { width, height },
          });
        }}
      />

      {/* Diamond shape via SVG polygon */}
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <polygon
          points={`${w / 2},2 ${w - 2},${h / 2} ${w / 2},${h - 2} 2,${h / 2}`}
          fill={style.backgroundColor}
          stroke={style.borderColor}
          strokeWidth={style.borderWidth}
          strokeDasharray={style.borderStyle === "dashed" ? "5,3" : undefined}
          filter={
            selected
              ? undefined
              : "drop-shadow(0 1px 2px rgba(0,0,0,0.08))"
          }
        />
        {selected && (
          <polygon
            points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={2}
          />
        )}
      </svg>

      {/* Label overlay centered inside diamond */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: editing ? "text" : "grab",
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
              width: "60%",
              border: "1px solid #3B82F6",
              borderRadius: 2,
              padding: "1px 4px",
              fontSize: style.fontSize ?? 11,
              textAlign: "center",
              outline: "none",
              background: "white",
              color: "#222",
            }}
          />
        ) : (
          <div
            style={{
              color: style.textColor,
              fontSize: style.fontSize ?? 11,
              textAlign: "center",
              lineHeight: 1.3,
              whiteSpace: "pre-line",
              padding: 4,
              maxWidth: w * 0.6,
              wordBreak: "break-word",
            }}
          >
            {label}
          </div>
        )}
      </div>

      {/* Handles at diamond points */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          background: "#555",
          width: 6,
          height: 6,
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: "#555",
          width: 6,
          height: 6,
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{
          background: "#555",
          width: 6,
          height: 6,
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          background: "#555",
          width: 6,
          height: 6,
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />
    </div>
  );
}
