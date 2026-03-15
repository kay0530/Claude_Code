import { create } from "zustand";
import type {
  FlowchartProject,
  FlowNode,
  FlowEdge,
  Lane,
  Phase,
} from "../types/flowchart";
import type { JumpOverMode } from "../components/Edges/JumpOverEdge";
import { DEFAULT_CANVAS_CONFIG, MAX_HISTORY_SIZE } from "../utils/constants";
import { createInitialProject } from "../utils/initialData";
import { nanoid } from "nanoid";

interface FlowchartState {
  project: FlowchartProject;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  history: FlowchartProject[];
  future: FlowchartProject[];
  clipboard: FlowNode | null;
  jumpOverEnabled: boolean;
  jumpOverMode: JumpOverMode;
  smoothEdges: boolean;

  // Project actions
  setProject: (project: FlowchartProject) => void;
  loadProject: (json: string) => void;
  newProject: () => void;
  setTitle: (title: string) => void;

  // Node actions
  addNode: (node: FlowNode) => void;
  updateNode: (id: string, partial: Partial<FlowNode>) => void;
  deleteNode: (id: string) => void;

  // Edge actions
  addEdge: (edge: FlowEdge) => void;
  updateEdge: (id: string, partial: Partial<FlowEdge>) => void;
  deleteEdge: (id: string) => void;

  // Lane actions
  addLane: (lane: Lane) => void;
  updateLane: (id: string, partial: Partial<Lane>) => void;
  deleteLane: (id: string) => void;

  // Phase actions
  addPhase: (phase: Phase) => void;
  updatePhase: (id: string, partial: Partial<Phase>) => void;
  deletePhase: (id: string) => void;

  // Edge display toggles
  toggleJumpOver: () => void;
  setJumpOverMode: (mode: JumpOverMode) => void;
  toggleSmoothEdges: () => void;

  // Selection actions
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  clearSelection: () => void;

  // History actions
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

function createEmptyProject(): FlowchartProject {
  return {
    id: nanoid(),
    title: "New Flowchart",
    phases: [],
    laneGroups: [],
    lanes: [],
    nodes: [],
    edges: [],
    canvasConfig: { ...DEFAULT_CANVAS_CONFIG },
  };
}

export const useFlowchartStore = create<FlowchartState>((set, get) => ({
  project: createInitialProject(),
  selectedNodeId: null,
  selectedEdgeId: null,
  history: [],
  future: [],
  clipboard: null,
  jumpOverEnabled: true,
  jumpOverMode: "later" as JumpOverMode,
  smoothEdges: false,

  // ── Internal: push current project to history ──────────────────
  pushHistory: () => {
    const { project, history } = get();
    const snapshot = structuredClone(project);
    const newHistory =
      history.length >= MAX_HISTORY_SIZE
        ? [...history.slice(1), snapshot]
        : [...history, snapshot];
    set({ history: newHistory, future: [] });
  },

  // ── Project actions ────────────────────────────────────────────
  setProject: (project) => {
    get().pushHistory();
    set({ project: structuredClone(project) });
  },

  loadProject: (json) => {
    try {
      const parsed = JSON.parse(json) as FlowchartProject;
      get().pushHistory();
      set({ project: parsed, selectedNodeId: null, selectedEdgeId: null });
    } catch (e) {
      console.error("Failed to parse project JSON:", e);
    }
  },

  newProject: () => {
    get().pushHistory();
    set({
      project: createEmptyProject(),
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  setTitle: (title) => {
    get().pushHistory();
    set((state) => ({
      project: { ...state.project, title },
    }));
  },

  // ── Node actions ───────────────────────────────────────────────
  addNode: (node) => {
    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        nodes: [...state.project.nodes, node],
      },
    }));
  },

  updateNode: (id, partial) => {
    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        nodes: state.project.nodes.map((n) =>
          n.id === id ? { ...n, ...partial } : n,
        ),
      },
    }));
  },

  deleteNode: (id) => {
    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        nodes: state.project.nodes.filter((n) => n.id !== id),
        // Also remove edges connected to this node
        edges: state.project.edges.filter(
          (e) => e.source !== id && e.target !== id,
        ),
      },
      selectedNodeId:
        state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  // ── Edge actions ───────────────────────────────────────────────
  addEdge: (edge) => {
    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        edges: [...state.project.edges, edge],
      },
    }));
  },

  updateEdge: (id, partial) => {
    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        edges: state.project.edges.map((e) =>
          e.id === id ? { ...e, ...partial } : e,
        ),
      },
    }));
  },

  deleteEdge: (id) => {
    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        edges: state.project.edges.filter((e) => e.id !== id),
      },
      selectedEdgeId:
        state.selectedEdgeId === id ? null : state.selectedEdgeId,
    }));
  },

  // ── Lane actions ───────────────────────────────────────────────
  addLane: (lane) => {
    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        lanes: [...state.project.lanes, lane],
      },
    }));
  },

  updateLane: (id, partial) => {
    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        lanes: state.project.lanes.map((l) =>
          l.id === id ? { ...l, ...partial } : l,
        ),
      },
    }));
  },

  deleteLane: (id) => {
    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        lanes: state.project.lanes.filter((l) => l.id !== id),
        // Remove lane from any group
        laneGroups: state.project.laneGroups.map((g) => ({
          ...g,
          laneIds: g.laneIds.filter((lid) => lid !== id),
        })),
      },
    }));
  },

  // ── Phase actions ──────────────────────────────────────────────
  addPhase: (phase) => {
    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        phases: [...state.project.phases, phase],
      },
    }));
  },

  updatePhase: (id, partial) => {
    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        phases: state.project.phases.map((p) =>
          p.id === id ? { ...p, ...partial } : p,
        ),
      },
    }));
  },

  deletePhase: (id) => {
    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        phases: state.project.phases.filter((p) => p.id !== id),
      },
    }));
  },

  // ── Edge display toggles ─────────────────────────────────────
  toggleJumpOver: () => {
    set((state) => ({ jumpOverEnabled: !state.jumpOverEnabled }));
  },
  setJumpOverMode: (mode: JumpOverMode) => {
    set({ jumpOverMode: mode });
  },
  toggleSmoothEdges: () => {
    set((state) => ({ smoothEdges: !state.smoothEdges }));
  },

  // ── Selection actions ──────────────────────────────────────────
  selectNode: (id) => {
    set({ selectedNodeId: id, selectedEdgeId: null });
  },

  selectEdge: (id) => {
    set({ selectedEdgeId: id, selectedNodeId: null });
  },

  clearSelection: () => {
    set({ selectedNodeId: null, selectedEdgeId: null });
  },

  // ── Undo / Redo ────────────────────────────────────────────────
  undo: () => {
    const { history, project, future } = get();
    if (history.length === 0) return;

    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    set({
      project: previous,
      history: newHistory,
      future: [structuredClone(project), ...future],
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  redo: () => {
    const { future, project, history } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    set({
      project: next,
      history: [...history, structuredClone(project)],
      future: newFuture,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },
}));
