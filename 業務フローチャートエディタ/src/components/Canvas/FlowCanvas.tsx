import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  reconnectEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnReconnect,
  type NodeTypes,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { nanoid } from "nanoid";

import { TaskNode } from "../Nodes/TaskNode";
import { DecisionNode } from "../Nodes/DecisionNode";
import { AnnotationNode } from "../Nodes/AnnotationNode";
import { BadgeNode } from "../Nodes/BadgeNode";
import { SwimlaneBg } from "./SwimlaneBg";

import { useFlowchartStore } from "../../store/useFlowchartStore";
import { useLaneDetection } from "../../hooks/useLaneDetection";
import {
  toReactFlowNodes,
  toReactFlowEdges,
  fromReactFlowNode,
} from "../../utils/reactFlowAdapter";
import {
  STYLE_STANDARD_TASK,
  STYLE_DECISION,
  STYLE_ANNOTATION,
  STYLE_OPERATOR_BADGE,
  DEFAULT_LANE_HEIGHT,
} from "../../utils/constants";
import type { FlowEdge, FlowNode, FlowNodeType } from "../../types/flowchart";

// Register custom node types
const nodeTypes: NodeTypes = {
  task: TaskNode,
  decision: DecisionNode,
  subprocess: TaskNode,
  annotation: AnnotationNode,
  badge: BadgeNode,
};

/** Default style for a node type when dropped from the palette */
function getDefaultStyle(type: FlowNodeType) {
  switch (type) {
    case "decision":
      return { ...STYLE_DECISION };
    case "annotation":
      return { ...STYLE_ANNOTATION };
    case "badge":
      return { ...STYLE_OPERATOR_BADGE };
    case "subprocess":
      return { ...STYLE_STANDARD_TASK, shape: "rounded" as const };
    default:
      return { ...STYLE_STANDARD_TASK };
  }
}

/**
 * Inner canvas component that must be rendered inside ReactFlowProvider.
 * Manages local React Flow state derived from the Zustand store and
 * syncs meaningful changes (drag stop, connect, etc.) back to the store.
 */
function FlowCanvasInner() {
  const { screenToFlowPosition } = useReactFlow();
  const { detectLane, detectPhase } = useLaneDetection();

  // Store selectors
  const storeNodes = useFlowchartStore((s) => s.project.nodes);
  const storeEdges = useFlowchartStore((s) => s.project.edges);
  const addNode = useFlowchartStore((s) => s.addNode);
  const updateNode = useFlowchartStore((s) => s.updateNode);
  const addEdge = useFlowchartStore((s) => s.addEdge);
  const updateEdge = useFlowchartStore((s) => s.updateEdge);
  const deleteEdge = useFlowchartStore((s) => s.deleteEdge);
  const selectNode = useFlowchartStore((s) => s.selectNode);
  const selectEdge = useFlowchartStore((s) => s.selectEdge);
  const clearSelection = useFlowchartStore((s) => s.clearSelection);
  const pushHistory = useFlowchartStore((s) => s.pushHistory);

  const config = useFlowchartStore((s) => s.project.canvasConfig);
  const lanes = useFlowchartStore((s) => s.project.lanes);
  const phases = useFlowchartStore((s) => s.project.phases);
  const showEdgeCrossings = useFlowchartStore((s) => s.showEdgeCrossings);

  // Invisible anchor nodes at corners of swimlane area so fitView includes the full background
  const anchorNodes = useMemo<Node[]>(() => {
    const totalWidth = phases.reduce((sum, p) => sum + p.width, 0) + config.laneLabelsWidth;
    const totalHeight = config.phaseHeaderHeight + lanes.length * DEFAULT_LANE_HEIGHT;
    return [
      { id: "__anchor-tl", type: "default", position: { x: 0, y: 0 }, data: {}, style: { opacity: 0, width: 1, height: 1, pointerEvents: "none" as const }, selectable: false, draggable: false },
      { id: "__anchor-br", type: "default", position: { x: totalWidth, y: totalHeight }, data: {}, style: { opacity: 0, width: 1, height: 1, pointerEvents: "none" as const }, selectable: false, draggable: false },
    ];
  }, [config, lanes, phases]);

  // Determine edge type based on crossing toggle
  const edgeType = showEdgeCrossings ? "step" as const : "smoothstep" as const;

  // Local React Flow state, derived from store
  const [rfNodes, setRfNodes] = useState<Node[]>(() => [
    ...anchorNodes,
    ...toReactFlowNodes(storeNodes),
  ]);
  const [rfEdges, setRfEdges] = useState<Edge[]>(() =>
    toReactFlowEdges(storeEdges, edgeType),
  );

  // Sync from store when store state changes
  useEffect(() => {
    setRfNodes([...anchorNodes, ...toReactFlowNodes(storeNodes)]);
  }, [storeNodes, anchorNodes]);

  useEffect(() => {
    setRfEdges(toReactFlowEdges(storeEdges, edgeType));
  }, [storeEdges, edgeType]);

  // Handle node changes (drag, select, remove) locally
  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setRfNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  // Handle edge changes locally
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setRfEdges((eds) => applyEdgeChanges(changes, eds));

      // Handle edge removal in store
      changes.forEach((change) => {
        if (change.type === "remove") {
          deleteEdge(change.id);
        }
      });
    },
    [deleteEdge],
  );

  // On drag stop, sync final position back to store with history
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const posUpdate = fromReactFlowNode(node);
      const laneId = detectLane(node.position.y);
      const phaseId = detectPhase(node.position.x);

      pushHistory();
      // Use set directly via store to avoid double pushHistory from updateNode
      useFlowchartStore.setState((state) => ({
        project: {
          ...state.project,
          nodes: state.project.nodes.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  ...posUpdate,
                  laneId: laneId ?? n.laneId,
                  phaseId: phaseId ?? n.phaseId,
                }
              : n,
          ),
        },
      }));
    },
    [detectLane, detectPhase, pushHistory],
  );

  // Create new edge on connection
  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!connection.source || !connection.target) return;

      const newEdge: FlowEdge = {
        id: `e-${nanoid(8)}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        lineStyle: "solid",
        color: "#333333",
      };
      addEdge(newEdge);
    },
    [addEdge],
  );

  // Reconnect edge to a different node by dragging its endpoint
  const onReconnect: OnReconnect = useCallback(
    (oldEdge, newConnection) => {
      // Update local React Flow edges immediately
      setRfEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));

      // Sync the reconnected edge back to the store
      if (newConnection.source && newConnection.target) {
        updateEdge(oldEdge.id, {
          source: newConnection.source,
          target: newConnection.target,
          sourceHandle: newConnection.sourceHandle ?? undefined,
          targetHandle: newConnection.targetHandle ?? undefined,
        });
      }
    },
    [updateEdge],
  );

  // Node click -> select node in store
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  // Edge click -> select edge in store
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
    },
    [selectEdge],
  );

  // Pane click -> clear selection
  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Drag over handler for drop target
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Drop handler for creating new nodes from palette
  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const rawData = event.dataTransfer.getData("application/reactflow");
      if (!rawData) return;

      let parsed: { type: FlowNodeType; label?: string };
      try {
        parsed = JSON.parse(rawData);
      } catch {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const laneId = detectLane(position.y);
      const phaseId = detectPhase(position.x);

      if (!laneId) return;

      const newNode: FlowNode = {
        id: `node-${nanoid(8)}`,
        type: parsed.type,
        label: parsed.label ?? parsed.type,
        laneId,
        phaseId,
        position,
        style: getDefaultStyle(parsed.type),
      };

      addNode(newNode);
    },
    [screenToFlowPosition, detectLane, detectPhase, addNode],
  );

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        reconnectRadius={25}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onDrop={onDrop}
        onDragOver={onDragOver}
        snapToGrid
        snapGrid={[20, 20]}
        fitView
        fitViewOptions={{ padding: 0.15, minZoom: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{ type: edgeType }}
      >
        <SwimlaneBg />
        <Controls position="bottom-right" />
        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          style={{ width: 150, height: 100 }}
        />
      </ReactFlow>
    </div>
  );
}

/**
 * Main React Flow canvas component wrapped in ReactFlowProvider.
 * This is the component that should be imported by the app layout.
 */
export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
