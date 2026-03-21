import type { CanvasConfig, NodeStyle } from "../types/flowchart";

// ── Canvas defaults ──────────────────────────────────────────────

export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  laneLabelsWidth: 200,
  phaseHeaderHeight: 50,
  gridSize: 20,
};

export const DEFAULT_LANE_HEIGHT = 80;
export const DEFAULT_NODE_WIDTH = 140;
export const DEFAULT_NODE_HEIGHT = 50;
export const DEFAULT_DECISION_SIZE = 70;
export const DEFAULT_BADGE_WIDTH = 90;
export const DEFAULT_BADGE_HEIGHT = 30;

// ── Colors ───────────────────────────────────────────────────────

export const PHASE_COLORS = {
  yellow: "#FFF9C4",
  blue: "#BBDEFB",
  green: "#C8E6C9",
  pink: "#F8BBD0",
  orange: "#FFE0B2",
  gray: "#E0E0E0",
} as const;

export const LANE_COLORS = {
  lightBlue: "#E3F2FD",
  lightGreen: "#E8F5E9",
  lightPink: "#FCE4EC",
  lightYellow: "#FFFDE7",
  lightGray: "#F5F5F5",
  white: "#FFFFFF",
} as const;

export const NODE_BORDER_COLORS = {
  black: "#333333",
  red: "#E53935",
  blue: "#1E88E5",
  green: "#43A047",
  orange: "#FB8C00",
  gray: "#9E9E9E",
} as const;

export const NODE_BG_COLORS = {
  white: "#FFFFFF",
  lightBlue: "#E3F2FD",
  lightGreen: "#E8F5E9",
  lightYellow: "#FFFDE7",
  lightPink: "#FCE4EC",
  orange: "#FFF3E0",
  lightGray: "#F5F5F5",
} as const;

export const EDGE_COLORS = {
  black: "#333333",
  red: "#E53935",
  blue: "#1E88E5",
  green: "#43A047",
  gray: "#9E9E9E",
} as const;

// ── Node style presets ───────────────────────────────────────────

/** Standard task node: black border, white background */
export const STYLE_STANDARD_TASK: NodeStyle = {
  borderColor: NODE_BORDER_COLORS.black,
  borderStyle: "solid",
  borderWidth: 1,
  backgroundColor: NODE_BG_COLORS.white,
  textColor: "#333333",
  fontSize: 12,
  shape: "rectangle",
};

/** Important task node: red border, white background */
export const STYLE_IMPORTANT_TASK: NodeStyle = {
  borderColor: NODE_BORDER_COLORS.red,
  borderStyle: "solid",
  borderWidth: 2,
  backgroundColor: NODE_BG_COLORS.white,
  textColor: "#333333",
  fontSize: 12,
  shape: "rectangle",
};

/** Decision diamond node */
export const STYLE_DECISION: NodeStyle = {
  borderColor: NODE_BORDER_COLORS.black,
  borderStyle: "solid",
  borderWidth: 1,
  backgroundColor: NODE_BG_COLORS.white,
  textColor: "#333333",
  fontSize: 11,
  shape: "diamond",
};

/** Dashed border task: optional / conditional items */
export const STYLE_DASHED_TASK: NodeStyle = {
  borderColor: NODE_BORDER_COLORS.black,
  borderStyle: "dashed",
  borderWidth: 1,
  backgroundColor: NODE_BG_COLORS.white,
  textColor: "#333333",
  fontSize: 12,
  shape: "rectangle",
};

/** Annotation node: no visible border, red text */
export const STYLE_ANNOTATION: NodeStyle = {
  borderColor: "transparent",
  borderStyle: "solid",
  borderWidth: 0,
  backgroundColor: "transparent",
  textColor: "#E53935",
  fontSize: 11,
  shape: "rectangle",
};

/** Operator badge node: orange background, small rounded */
export const STYLE_OPERATOR_BADGE: NodeStyle = {
  borderColor: NODE_BORDER_COLORS.orange,
  borderStyle: "solid",
  borderWidth: 1,
  backgroundColor: "#FFE0B2",
  textColor: "#E65100",
  fontSize: 10,
  shape: "rounded",
};

// ── Undo/Redo ────────────────────────────────────────────────────

export const MAX_HISTORY_SIZE = 50;

// ── Layout ───────────────────────────────────────────────────────

export const SIDEBAR_WIDTH = 280;
export const TOOLBAR_HEIGHT = 48;
