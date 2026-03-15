import { memo, useCallback, useMemo } from "react";
import {
  getSmoothStepPath,
  BaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { useFlowchartStore } from "../../store/useFlowchartStore";

// ---------- Types ----------

export type JumpOverMode = "later" | "horizontal" | "vertical";

export type JumpOverEdgeData = {
  /** Pre-computed SVG paths for every edge (including this one) */
  allEdgePaths: Array<{ id: string; path: string }>;
  /** Whether to use rounded corners (smoothstep) or straight right-angles */
  smoothEdges?: boolean;
  /** Which edge should jump over: "later" (default), "horizontal", or "vertical" */
  jumpOverMode?: JumpOverMode;
  /** Custom bend offset - controls where the edge makes its turn */
  bendOffset?: number;
  [key: string]: unknown;
};

type Point = { x: number; y: number };
type Segment = { p1: Point; p2: Point };

// ---------- Geometry helpers ----------

const JUMP_RADIUS = 6;
const SMOOTH_STEP_BORDER_RADIUS = 8;

/**
 * Compute a dynamic offset for getSmoothStepPath to avoid unnecessary
 * detours when source and target are nearly aligned.
 */
function computeOffset(sourceX: number, sourceY: number, targetX: number, targetY: number): number {
  const dx = Math.abs(sourceX - targetX);
  const dy = Math.abs(sourceY - targetY);

  // Nearly vertically aligned - minimal offset for straight path
  if (dx < 20) return 0;
  // Nearly horizontally aligned - minimal offset for straight path
  if (dy < 20) return 0;
  // Moderately aligned - small offset
  if (dx < 50) return Math.min(5, dx / 4);
  if (dy < 50) return Math.min(5, dy / 4);
  // Far apart - standard offset
  return Math.min(20, Math.min(dx, dy) / 4);
}

/**
 * Parse an SVG path string (as produced by getSmoothStepPath) into
 * straight-line segments.  We only care about M, L, H, V, and ignore
 * curve commands (Q/C/A) – those are the rounded corners and we treat
 * the segment endpoints as connected by lines for crossing detection.
 */
function pathToSegments(d: string): Segment[] {
  const segments: Segment[] = [];
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;

  // Tokenise: split on command letters while keeping them
  const tokens = d.match(/[MLHVQCAZ][^MLHVQCAZ]*/gi);
  if (!tokens) return segments;

  for (const token of tokens) {
    const cmd = token[0];
    const nums = token
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);

    switch (cmd) {
      case "M":
        cx = nums[0];
        cy = nums[1];
        startX = cx;
        startY = cy;
        break;
      case "L": {
        const nx = nums[0];
        const ny = nums[1];
        segments.push({ p1: { x: cx, y: cy }, p2: { x: nx, y: ny } });
        cx = nx;
        cy = ny;
        break;
      }
      case "H": {
        const nx = nums[0];
        segments.push({ p1: { x: cx, y: cy }, p2: { x: nx, y: cy } });
        cx = nx;
        break;
      }
      case "V": {
        const ny = nums[0];
        segments.push({ p1: { x: cx, y: cy }, p2: { x: cx, y: ny } });
        cy = ny;
        break;
      }
      case "Q": {
        // Quadratic bezier – jump to endpoint
        const ex = nums[2];
        const ey = nums[3];
        // Add a straight segment from current to end for crossing detection
        segments.push({ p1: { x: cx, y: cy }, p2: { x: ex, y: ey } });
        cx = ex;
        cy = ey;
        break;
      }
      case "C": {
        const ex = nums[4];
        const ey = nums[5];
        segments.push({ p1: { x: cx, y: cy }, p2: { x: ex, y: ey } });
        cx = ex;
        cy = ey;
        break;
      }
      case "A": {
        // Arc command: rx ry x-rotation large-arc sweep x y
        const ex = nums[5];
        const ey = nums[6];
        segments.push({ p1: { x: cx, y: cy }, p2: { x: ex, y: ey } });
        cx = ex;
        cy = ey;
        break;
      }
      case "Z":
      case "z":
        if (cx !== startX || cy !== startY) {
          segments.push({
            p1: { x: cx, y: cy },
            p2: { x: startX, y: startY },
          });
        }
        cx = startX;
        cy = startY;
        break;
      default:
        break;
    }
  }

  return segments;
}

/**
 * Find the intersection point of two finite line segments, if any.
 * Returns null when segments are parallel or do not intersect within
 * their extents.
 */
function segmentIntersection(a: Segment, b: Segment): Point | null {
  const d1x = a.p2.x - a.p1.x;
  const d1y = a.p2.y - a.p1.y;
  const d2x = b.p2.x - b.p1.x;
  const d2y = b.p2.y - b.p1.y;

  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null; // parallel

  const t = ((b.p1.x - a.p1.x) * d2y - (b.p1.y - a.p1.y) * d2x) / denom;
  const u = ((b.p1.x - a.p1.x) * d1y - (b.p1.y - a.p1.y) * d1x) / denom;

  // Must intersect within both segment extents (excluding very close to endpoints)
  const EPS = 0.01;
  if (t < EPS || t > 1 - EPS || u < EPS || u > 1 - EPS) return null;

  return {
    x: a.p1.x + t * d1x,
    y: a.p1.y + t * d1y,
  };
}

/**
 * Distance from p1 to p along the segment direction.
 */
function distAlongSegment(seg: Segment, p: Point): number {
  const dx = p.x - seg.p1.x;
  const dy = p.y - seg.p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Length of a segment.
 */
function segLength(seg: Segment): number {
  const dx = seg.p2.x - seg.p1.x;
  const dy = seg.p2.y - seg.p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a segment is approximately horizontal (dy ≈ 0).
 */
function isHorizontal(seg: Segment): boolean {
  return Math.abs(seg.p2.y - seg.p1.y) < 1;
}

/**
 * Check if a segment is approximately vertical (dx ≈ 0).
 */
function isVertical(seg: Segment): boolean {
  return Math.abs(seg.p2.x - seg.p1.x) < 1;
}

/**
 * Compute all crossing points between `currentSegments` and
 * `otherSegments`, returning them grouped by current-segment index
 * and sorted by distance along the segment.
 *
 * When `mode` is provided, only crossings where the current segment
 * should jump are included:
 * - "horizontal": current must be horizontal and other must be vertical
 * - "vertical": current must be vertical and other must be horizontal
 * - "later" / undefined: include all crossings (filtering is done at caller level)
 */
function findCrossings(
  currentSegments: Segment[],
  otherSegments: Segment[],
  mode?: JumpOverMode,
): Map<number, { point: Point; dist: number }[]> {
  const map = new Map<number, { point: Point; dist: number }[]>();

  for (let i = 0; i < currentSegments.length; i++) {
    const seg = currentSegments[i];
    for (const other of otherSegments) {
      // Direction-based filtering
      if (mode === "horizontal") {
        if (!isHorizontal(seg) || !isVertical(other)) continue;
      } else if (mode === "vertical") {
        if (!isVertical(seg) || !isHorizontal(other)) continue;
      }

      const pt = segmentIntersection(seg, other);
      if (pt) {
        if (!map.has(i)) map.set(i, []);
        map.get(i)!.push({ point: pt, dist: distAlongSegment(seg, pt) });
      }
    }
  }

  // Sort crossings within each segment by distance
  for (const list of map.values()) {
    list.sort((a, b) => a.dist - b.dist);
  }

  return map;
}

/**
 * Given the segments of the current edge and a crossing map, produce a
 * new SVG path string with semicircular arcs at each crossing point.
 */
function buildPathWithJumps(
  segments: Segment[],
  crossings: Map<number, { point: Point; dist: number }[]>,
  radius: number,
): string {
  if (segments.length === 0) return "";

  const parts: string[] = [`M ${segments[0].p1.x} ${segments[0].p1.y}`];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const len = segLength(seg);
    const hits = crossings.get(i);

    if (!hits || hits.length === 0) {
      parts.push(`L ${seg.p2.x} ${seg.p2.y}`);
      continue;
    }

    // Segment direction unit vector
    const dx = (seg.p2.x - seg.p1.x) / len;
    const dy = (seg.p2.y - seg.p1.y) / len;

    // Perpendicular vector (for arc orientation).  We always arc "upward"
    // relative to the segment direction (90° counter-clockwise rotation).
    // This keeps the bridge consistent regardless of travel direction.

    let lastX = seg.p1.x;
    let lastY = seg.p1.y;

    for (const hit of hits) {
      const ix = hit.point.x;
      const iy = hit.point.y;

      // Point just before the crossing
      const beforeX = ix - dx * radius;
      const beforeY = iy - dy * radius;
      // Point just after the crossing
      const afterX = ix + dx * radius;
      const afterY = iy + dy * radius;

      // Ensure we don't overshoot the segment boundaries
      const distBefore = distAlongSegment(seg, { x: beforeX, y: beforeY });
      const distAfter = distAlongSegment(seg, { x: afterX, y: afterY });

      if (distBefore < 0 || distAfter > len) {
        // Not enough room for arc, just draw straight through
        parts.push(`L ${seg.p2.x} ${seg.p2.y}`);
        lastX = seg.p2.x;
        lastY = seg.p2.y;
        continue;
      }

      // Line to the arc start
      if (
        Math.abs(beforeX - lastX) > 0.1 ||
        Math.abs(beforeY - lastY) > 0.1
      ) {
        parts.push(`L ${beforeX} ${beforeY}`);
      }

      // Semicircular arc (sweep-flag = 1 means clockwise arc, which
      // creates the "bridge over" visual).
      // SVG Arc: A rx ry x-rotation large-arc-flag sweep-flag x y
      parts.push(`A ${radius} ${radius} 0 0 1 ${afterX} ${afterY}`);

      lastX = afterX;
      lastY = afterY;
    }

    // Finish to segment end
    if (
      Math.abs(seg.p2.x - lastX) > 0.1 ||
      Math.abs(seg.p2.y - lastY) > 0.1
    ) {
      parts.push(`L ${seg.p2.x} ${seg.p2.y}`);
    }
  }

  return parts.join(" ");
}

// ---------- Component ----------

function JumpOverEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerStart,
  markerEnd,
  selected,
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  data,
}: EdgeProps) {
  // Compute the base path for this edge
  const edgeData = data as JumpOverEdgeData | undefined;
  const borderRadius = edgeData?.smoothEdges ? SMOOTH_STEP_BORDER_RADIUS : 0;
  const autoOffset = computeOffset(sourceX, sourceY, targetX, targetY);
  const dynamicOffset = edgeData?.bendOffset ?? autoOffset;
  const [basePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius,
    offset: dynamicOffset,
  });

  const updateEdge = useFlowchartStore((s) => s.updateEdge);
  const { getZoom } = useReactFlow();

  // Drag handler for the bend point handle
  const onBendHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const startY = e.clientY;
      const startX = e.clientX;
      const startOffset = dynamicOffset;
      const zoom = getZoom();
      const isVerticalConnection = Math.abs(sourceX - targetX) < Math.abs(sourceY - targetY);

      const onMouseMove = (moveEvent: MouseEvent) => {
        const rawDelta = isVerticalConnection
          ? moveEvent.clientX - startX
          : moveEvent.clientY - startY;
        const delta = rawDelta / zoom;
        const newOffset = Math.max(0, Math.min(200, startOffset + delta));
        updateEdge(id, { bendOffset: newOffset });
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [dynamicOffset, sourceX, sourceY, targetX, targetY, updateEdge, id, getZoom],
  );

  // Double-click to reset to auto
  const onBendHandleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      updateEdge(id, { bendOffset: undefined });
    },
    [updateEdge, id],
  );

  // Build jump-over path
  const jumpOverMode: JumpOverMode = edgeData?.jumpOverMode ?? "later";

  const finalPath = useMemo(() => {
    const allEdgePaths = edgeData?.allEdgePaths;
    if (!allEdgePaths || allEdgePaths.length <= 1) return basePath;

    const currentSegments = pathToSegments(basePath);
    if (currentSegments.length === 0) return basePath;

    // Find the index of the current edge in allEdgePaths
    const currentIndex = allEdgePaths.findIndex((e) => e.id === id);

    // Gather all crossings from other edges
    const allCrossings = new Map<
      number,
      { point: Point; dist: number }[]
    >();

    for (let otherIdx = 0; otherIdx < allEdgePaths.length; otherIdx++) {
      const other = allEdgePaths[otherIdx];
      if (other.id === id) continue;

      // In "later" mode, only jump over edges that appear earlier (lower index)
      if (jumpOverMode === "later" && otherIdx >= currentIndex) continue;

      const otherSegments = pathToSegments(other.path);
      // For "horizontal" and "vertical" modes, pass the mode to filter by direction
      const crossings = findCrossings(
        currentSegments,
        otherSegments,
        jumpOverMode === "later" ? undefined : jumpOverMode,
      );

      // Merge into allCrossings
      for (const [segIdx, hits] of crossings) {
        if (!allCrossings.has(segIdx)) allCrossings.set(segIdx, []);
        allCrossings.get(segIdx)!.push(...hits);
      }
    }

    if (allCrossings.size === 0) return basePath;

    // Deduplicate crossings that are very close (within 2*radius)
    for (const [segIdx, hits] of allCrossings) {
      hits.sort((a, b) => a.dist - b.dist);
      const deduped: typeof hits = [];
      for (const h of hits) {
        if (
          deduped.length === 0 ||
          h.dist - deduped[deduped.length - 1].dist > JUMP_RADIUS * 2
        ) {
          deduped.push(h);
        }
      }
      allCrossings.set(segIdx, deduped);
    }

    return buildPathWithJumps(currentSegments, allCrossings, JUMP_RADIUS);
  }, [basePath, data, id, jumpOverMode]);

  return (
    <>
      <BaseEdge path={finalPath} markerStart={markerStart} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        {/* Yellow diamond bend handle - only visible when edge is selected */}
        {selected && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px) rotate(45deg)`,
              width: 10,
              height: 10,
              background: "#FFD700",
              border: "1px solid #B8860B",
              cursor: "move",
              pointerEvents: "all",
              zIndex: 10,
            }}
            className="nodrag nopan bend-handle"
            onMouseDown={onBendHandleMouseDown}
            onDoubleClick={onBendHandleDoubleClick}
            title="ドラッグで曲がり位置を調整 / ダブルクリックで自動に戻す"
          />
        )}
        {/* Edge label */}
        {label && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + 16}px)`,
              fontSize: 12,
              fontWeight: 500,
              pointerEvents: "all",
              background: labelShowBg !== false ? (labelBgStyle?.fill as string ?? "#fff") : undefined,
              padding: labelBgPadding
                ? `${labelBgPadding[1]}px ${labelBgPadding[0]}px`
                : "2px 4px",
              borderRadius: labelBgBorderRadius ?? 2,
              ...labelStyle,
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export const JumpOverEdge = memo(JumpOverEdgeComponent);
