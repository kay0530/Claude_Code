import { MarkerType, type Node, type Edge } from "@xyflow/react";
import type { FlowNode, FlowEdge } from "../types/flowchart";

/**
 * Convert internal FlowNode array to React Flow Node array.
 * Each FlowNode is passed as the `data` property so custom node
 * components have access to all styling and label information.
 */
export function toReactFlowNodes(nodes: FlowNode[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: { x: node.position.x, y: node.position.y },
    data: { ...node },
    width: node.size?.width,
    height: node.size?.height,
  }));
}

/**
 * Convert internal FlowEdge array to React Flow Edge array.
 * Uses 'smoothstep' by default, or 'step' when edge crossings mode is on.
 */
export function toReactFlowEdges(
  edges: FlowEdge[],
  edgeType: "smoothstep" | "step" = "smoothstep",
): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    label: edge.label,
    type: edgeType,
    animated: edge.animated ?? false,
    style: {
      stroke: edge.color ?? "#333333",
      strokeDasharray: edge.lineStyle === "dashed" ? "5,5" : undefined,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edge.color ?? "#333333",
    },
  }));
}

/**
 * Extract position changes from a React Flow Node back into
 * a partial FlowNode update. Used when nodes are dragged.
 */
export function fromReactFlowNode(node: Node): Partial<FlowNode> {
  return {
    position: { x: node.position.x, y: node.position.y },
  };
}
