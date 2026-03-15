/**
 * Core type definitions for the Swimlane Flowchart Editor.
 */

export interface FlowchartProject {
  id: string;
  title: string;
  subtitle?: string;
  phases: Phase[];
  laneGroups: LaneGroup[];
  lanes: Lane[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  canvasConfig: CanvasConfig;
}

export interface CanvasConfig {
  /** Width of lane label column in pixels (default: 150) */
  laneLabelsWidth: number;
  /** Height of phase header row in pixels (default: 50) */
  phaseHeaderHeight: number;
  /** Snap grid size in pixels (default: 20) */
  gridSize: number;
}

export interface Phase {
  id: string;
  name: string;
  color: string;
  /** X position of the phase column start */
  x: number;
  /** Width of the phase column */
  width: number;
  /** Display order (0-based) */
  order: number;
}

export interface LaneGroup {
  id: string;
  name: string;
  laneIds: string[];
  color?: string;
}

export interface Lane {
  id: string;
  name: string;
  groupId?: string;
  /** Y position of the lane row start */
  y: number;
  /** Height of the lane row */
  height: number;
  /** Display order (0-based) */
  order: number;
  color?: string;
}

export type NodeShape = "rectangle" | "diamond" | "rounded";
export type BorderStyle = "solid" | "dashed" | "double";
export type FlowNodeType =
  | "task"
  | "decision"
  | "subprocess"
  | "annotation"
  | "badge";

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  sublabel?: string;
  laneId: string;
  phaseId?: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  style: NodeStyle;
}

export interface NodeStyle {
  borderColor: string;
  borderStyle: BorderStyle;
  borderWidth: number;
  backgroundColor: string;
  textColor: string;
  fontSize?: number;
  shape: NodeShape;
}

export type MarkerStyle = "none" | "arrow" | "arrowClosed";

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  lineStyle: "solid" | "dashed";
  animated?: boolean;
  color?: string;
  strokeWidth?: number;
  markerStart?: MarkerStyle;
  markerEnd?: MarkerStyle;
  /** Custom bend offset - controls where the edge makes its turn. undefined = auto */
  bendOffset?: number;
}
