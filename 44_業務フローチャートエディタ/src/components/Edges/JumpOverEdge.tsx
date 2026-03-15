import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getSmoothStepPath,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { useFlowchartStore } from "../../store/useFlowchartStore";
import { buildBendPath, computeOffset, isVerticalConnection } from "../../utils/edgePathUtils";

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

// buildBendPath and computeOffset are imported from edgePathUtils

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

    // Always finish with a line to segment end to ensure correct marker orientation
    parts.push(`L ${seg.p2.x} ${seg.p2.y}`);
  }

  return parts.join(" ");
}

/**
 * Ensure both markerStart and markerEnd arrows point in the correct direction.
 *
 * SVG markers orient along the tangent of the path at the marker point.
 * When buildPathWithJumps replaces curves with straight lines, or when
 * getSmoothStepPath produces a path whose segment direction differs from
 * the handle direction, the arrow can appear sideways.
 *
 * We fix this by:
 * - Prepending a short "departure" segment at the source (for markerStart)
 * - Appending a short "approach" segment at the target (for markerEnd)
 * Each guide segment is 2px long and aligned with the handle direction.
 */
function ensureMarkerDirection(
  path: string,
  sourceX: number,
  sourceY: number,
  sourcePosition: Position,
  targetX: number,
  targetY: number,
  targetPosition: Position,
): string {
  const D = 2; // guide segment length in px

  // Departure point: slightly offset from source in the handle direction
  let departX = sourceX;
  let departY = sourceY;
  switch (sourcePosition) {
    case Position.Top:
      departY = sourceY - D;
      break;
    case Position.Bottom:
      departY = sourceY + D;
      break;
    case Position.Left:
      departX = sourceX - D;
      break;
    case Position.Right:
      departX = sourceX + D;
      break;
  }

  // Approach point: slightly offset from target opposite to handle direction
  let approachX = targetX;
  let approachY = targetY;
  switch (targetPosition) {
    case Position.Top:
      approachY = targetY - D;
      break;
    case Position.Bottom:
      approachY = targetY + D;
      break;
    case Position.Left:
      approachX = targetX - D;
      break;
    case Position.Right:
      approachX = targetX + D;
      break;
  }

  // Prepend source guide + append target guide
  return `M ${sourceX} ${sourceY} L ${departX} ${departY} ${path.replace(/^M\s*[\d.e+-]+\s*[\d.e+-]+/, '')} L ${approachX} ${approachY} L ${targetX} ${targetY}`;
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
  // autoOffset is used by getSmoothStepPath when no bend delta is set
  void autoOffset;

  // Local drag state: bendDelta is the pixel offset of the bend point from the
  // natural midpoint. Positive = down/right, negative = up/left.
  const [dragBendDelta, setDragBendDelta] = useState<number | null>(null);
  const isDragging = useRef(false);
  // bendOffset in store is now interpreted as a bend delta from midpoint
  const storedBendDelta = edgeData?.bendOffset ?? 0;
  const activeBendDelta = dragBendDelta ?? storedBendDelta;

  // Use custom bend path when user has set a bend delta, otherwise use default getSmoothStepPath
  const hasBend = activeBendDelta !== 0;
  const [basePath, labelX, labelY] = hasBend
    ? buildBendPath(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, activeBendDelta, borderRadius)
    : getSmoothStepPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
        borderRadius,
        offset: autoOffset,
      });

  const updateEdge = useFlowchartStore((s) => s.updateEdge);
  const pushHistory = useFlowchartStore((s) => s.pushHistory);
  const { getZoom, screenToFlowPosition } = useReactFlow();

  // Ref for the bend handle element - used to attach native event listeners
  const bendHandleRef = useRef<SVGGElement>(null);

  // Store current values in refs so the native listener closure always reads fresh values
  const screenToFlowRef = useRef(screenToFlowPosition);
  screenToFlowRef.current = screenToFlowPosition;
  const sourceXRef = useRef(sourceX); sourceXRef.current = sourceX;
  const sourceYRef = useRef(sourceY); sourceYRef.current = sourceY;
  const targetXRef = useRef(targetX); targetXRef.current = targetX;
  const targetYRef = useRef(targetY); targetYRef.current = targetY;
  const sourcePosRef = useRef(sourcePosition); sourcePosRef.current = sourcePosition;
  const targetPosRef = useRef(targetPosition); targetPosRef.current = targetPosition;

  // Attach native pointerdown listener in capture phase via useEffect.
  // Uses setPointerCapture for reliable drag tracking - all pointer events
  // are sent to the capturing element even if the cursor leaves it.
  useEffect(() => {
    const el = bendHandleRef.current;
    if (!el) return;

    const handlePointerDown = (e: PointerEvent) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();
      isDragging.current = false;

      // Capture pointer to this element for reliable drag tracking
      el.setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        if (!isDragging.current) {
          isDragging.current = true;
          pushHistory();
        }

        // Convert cursor to flow coordinates
        const cursor = screenToFlowRef.current({ x: moveEvent.clientX, y: moveEvent.clientY });

        // Determine connection orientation using shared utility
        const isVerticalConn = isVerticalConnection(
          sourceXRef.current, sourceYRef.current, sourcePosRef.current,
          targetXRef.current, targetYRef.current, targetPosRef.current,
        );

        // Compute bendDelta: distance from natural midpoint to cursor
        if (isVerticalConn) {
          const midY = (sourceYRef.current + targetYRef.current) / 2;
          setDragBendDelta(cursor.y - midY);
        } else {
          const midX = (sourceXRef.current + targetXRef.current) / 2;
          setDragBendDelta(cursor.x - midX);
        }
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        el.releasePointerCapture(upEvent.pointerId);
        el.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("pointerup", onPointerUp);

        if (isDragging.current) {
          setDragBendDelta((finalDelta) => {
            if (finalDelta !== null) {
              useFlowchartStore.setState((state) => ({
                project: {
                  ...state.project,
                  edges: state.project.edges.map((edge) =>
                    edge.id === id ? { ...edge, bendOffset: finalDelta } : edge,
                  ),
                },
              }));
            }
            return null;
          });
        }
        isDragging.current = false;
      };

      // With setPointerCapture, events are sent to the capturing element
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerup", onPointerUp);
    };

    // capture: true ensures this fires before any bubble-phase handlers
    el.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => {
      el.removeEventListener("pointerdown", handlePointerDown, { capture: true });
    };
  }, [id, pushHistory, getZoom]);

  // Double-click to reset to auto
  const onBendHandleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      updateEdge(id, { bendOffset: 0 });
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

  // Fix marker direction: prepend/append short guide segments so arrowheads
  // always point in the direction matching the source/target handles.
  const directedPath = useMemo(
    () => ensureMarkerDirection(finalPath, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition),
    [finalPath, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition],
  );

  return (
    <>
      <BaseEdge path={directedPath} markerStart={markerStart} markerEnd={markerEnd} style={style} />
      {/* SVG bend handle - rendered directly in the edge SVG layer
          to avoid EdgeLabelRenderer HTML layer event interception issues */}
      <g
        ref={bendHandleRef}
        onDoubleClick={onBendHandleDoubleClick}
        style={{
          cursor: "move",
          pointerEvents: (selected || dragBendDelta !== null) ? "all" : "none",
          opacity: (selected || dragBendDelta !== null) ? 1 : 0,
        }}
        className="nodrag nopan"
      >
        {/* Larger invisible hit area for easier clicking */}
        <rect
          x={labelX - 14}
          y={labelY - 14}
          width={28}
          height={28}
          fill="transparent"
          style={{ pointerEvents: (selected || dragBendDelta !== null) ? "all" : "none" }}
        />
        {/* Visible diamond shape */}
        <rect
          x={labelX - 6}
          y={labelY - 6}
          width={12}
          height={12}
          rx={1}
          fill="#FFD700"
          stroke="#B8860B"
          strokeWidth={1}
          transform={`rotate(45 ${labelX} ${labelY})`}
        />
      </g>
      <EdgeLabelRenderer>
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
