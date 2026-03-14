import {
  MarkerType,
  getSmoothStepPath,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";
import type { FlowNode, FlowEdge } from "../types/flowchart";
import type { JumpOverEdgeData } from "../components/Edges/JumpOverEdge";

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
 * Map a handle id (top/bottom/left/right) to a React Flow Position.
 */
function handleToPosition(handle?: string): Position {
  switch (handle) {
    case "top":
      return Position.Top;
    case "bottom":
      return Position.Bottom;
    case "left":
      return Position.Left;
    case "right":
      return Position.Right;
    default:
      return Position.Bottom; // default source = bottom
  }
}

/**
 * Convert internal FlowEdge array to React Flow Edge array.
 *
 * When `edgeType` is `"jumpOver"`, we pre-compute each edge's smooth-step
 * SVG path and inject it into `data.allEdgePaths` so the JumpOverEdge
 * component can detect crossings without re-deriving positions.
 *
 * `rfNodes` must be provided when edgeType is "jumpOver" so we can
 * resolve source/target coordinates for path computation.
 */
export function toReactFlowEdges(
  edges: FlowEdge[],
  edgeType: "smoothstep" | "step" | "jumpOver" = "smoothstep",
  rfNodes?: Node[],
  smoothEdges?: boolean,
): Edge[] {
  // Pre-compute paths when using jumpOver
  let allEdgePaths: Array<{ id: string; path: string }> | undefined;

  if (edgeType === "jumpOver" && rfNodes) {
    const nodeMap = new Map<string, Node>();
    for (const n of rfNodes) nodeMap.set(n.id, n);

    allEdgePaths = edges
      .map((edge) => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (!sourceNode || !targetNode) return null;

        const sourcePos = handleToPosition(edge.sourceHandle ?? "bottom");
        const targetPos = handleToPosition(edge.targetHandle ?? "top");

        const sw = sourceNode.width ?? (sourceNode.measured?.width) ?? 100;
        const sh = sourceNode.height ?? (sourceNode.measured?.height) ?? 40;
        const tw = targetNode.width ?? (targetNode.measured?.width) ?? 100;
        const th = targetNode.height ?? (targetNode.measured?.height) ?? 40;

        const sourceCoords = getHandleCoords(
          sourceNode.position,
          sw,
          sh,
          sourcePos,
        );
        const targetCoords = getHandleCoords(
          targetNode.position,
          tw,
          th,
          targetPos,
        );
        const sourceX = sourceCoords.x;
        const sourceY = sourceCoords.y;
        const targetX = targetCoords.x;
        const targetY = targetCoords.y;

        const [path] = getSmoothStepPath({
          sourceX,
          sourceY,
          sourcePosition: sourcePos,
          targetX,
          targetY,
          targetPosition: targetPos,
          borderRadius: smoothEdges ? 8 : 0,
        });

        return { id: edge.id, path };
      })
      .filter(Boolean) as Array<{ id: string; path: string }>;
  }

  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    label: edge.label,
    type: edgeType === "jumpOver" ? "jumpOver" : edgeType,
    animated: edge.animated ?? false,
    style: {
      stroke: edge.color ?? "#333333",
      strokeDasharray: edge.lineStyle === "dashed" ? "5,5" : undefined,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edge.color ?? "#333333",
    },
    data: edgeType === "jumpOver"
      ? ({ allEdgePaths: allEdgePaths ?? [], smoothEdges: smoothEdges ?? false } satisfies JumpOverEdgeData)
      : undefined,
  }));
}

/**
 * Compute the x,y coordinates for a handle on a node.
 */
function getHandleCoords(
  pos: { x: number; y: number },
  width: number,
  height: number,
  handlePos: Position,
): { x: number; y: number } {
  switch (handlePos) {
    case Position.Top:
      return { x: pos.x + width / 2, y: pos.y };
    case Position.Bottom:
      return { x: pos.x + width / 2, y: pos.y + height };
    case Position.Left:
      return { x: pos.x, y: pos.y + height / 2 };
    case Position.Right:
      return { x: pos.x + width, y: pos.y + height / 2 };
  }
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
