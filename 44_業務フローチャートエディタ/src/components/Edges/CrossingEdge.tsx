import {
  getSmoothStepPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";

/**
 * Compute intersection point of two line segments (p1-p2) and (p3-p4).
 */
function segmentIntersection(
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
  p4x: number, p4y: number,
): { x: number; y: number } | null {
  const d1x = p2x - p1x;
  const d1y = p2y - p1y;
  const d2x = p4x - p3x;
  const d2y = p4y - p3y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return null;

  const t = ((p3x - p1x) * d2y - (p3y - p1y) * d2x) / cross;
  const u = ((p3x - p1x) * d1y - (p3y - p1y) * d1x) / cross;

  if (t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99) {
    return { x: p1x + t * d1x, y: p1y + t * d1y };
  }
  return null;
}

/**
 * Parse an SVG path d-string into an array of [x, y] points.
 * Handles M, L, H, V commands (absolute) which smoothstep paths produce.
 */
function pathToPoints(d: string): [number, number][] {
  const pts: [number, number][] = [];
  const cmds = d.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);
  if (!cmds) return pts;

  let cx = 0;
  let cy = 0;

  for (const cmd of cmds) {
    const type = cmd[0];
    const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number);

    switch (type) {
      case "M":
      case "L":
        for (let i = 0; i < nums.length; i += 2) {
          cx = nums[i];
          cy = nums[i + 1];
          pts.push([cx, cy]);
        }
        break;
      case "H":
        cx = nums[0];
        pts.push([cx, cy]);
        break;
      case "V":
        cy = nums[0];
        pts.push([cx, cy]);
        break;
    }
  }
  return pts;
}

/**
 * Get all other edge SVG paths from the DOM and extract their polyline points.
 */
function getOtherEdgePaths(thisEdgeId: string): [number, number][][] {
  const results: [number, number][][] = [];
  const svgPaths = document.querySelectorAll<SVGPathElement>(".react-flow__edge-path");

  for (const pathEl of svgPaths) {
    const edgeId = pathEl.id || pathEl.closest("[data-id]")?.getAttribute("data-id");
    if (edgeId === thisEdgeId) continue;

    const d = pathEl.getAttribute("d");
    if (!d) continue;

    const pts = pathToPoints(d);
    if (pts.length >= 2) {
      results.push(pts);
    }
  }
  return results;
}

const ARC_RADIUS = 7;

/**
 * Custom edge that draws small arc bridges where it crosses other edges.
 */
export function CrossingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps<Edge>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  const thisPoints = pathToPoints(edgePath);

  // Read other edges' actual rendered paths from the DOM
  const otherEdgePaths = getOtherEdgePaths(id);

  // Find crossing points
  const crossings: { x: number; y: number; angle: number }[] = [];

  for (const otherPoints of otherEdgePaths) {
    for (let i = 0; i < thisPoints.length - 1; i++) {
      for (let j = 0; j < otherPoints.length - 1; j++) {
        const inter = segmentIntersection(
          thisPoints[i][0], thisPoints[i][1],
          thisPoints[i + 1][0], thisPoints[i + 1][1],
          otherPoints[j][0], otherPoints[j][1],
          otherPoints[j + 1][0], otherPoints[j + 1][1],
        );
        if (inter) {
          const dx = thisPoints[i + 1][0] - thisPoints[i][0];
          const dy = thisPoints[i + 1][1] - thisPoints[i][1];
          const angle = Math.atan2(dy, dx);
          crossings.push({ ...inter, angle });
        }
      }
    }
  }

  // No crossings → normal path
  if (crossings.length === 0) {
    return (
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={style?.stroke ?? "#333"}
        strokeWidth={style?.strokeWidth ?? 1.5}
        strokeDasharray={style?.strokeDasharray as string | undefined}
        markerEnd={markerEnd as string}
        className="react-flow__edge-path"
      />
    );
  }

  // Build arc bridges at crossing points
  const arcPaths = crossings.map((c, idx) => {
    const perpAngle = c.angle + Math.PI / 2;
    const startX = c.x - Math.cos(c.angle) * ARC_RADIUS;
    const startY = c.y - Math.sin(c.angle) * ARC_RADIUS;
    const endX = c.x + Math.cos(c.angle) * ARC_RADIUS;
    const endY = c.y + Math.sin(c.angle) * ARC_RADIUS;
    const cpX = c.x + Math.cos(perpAngle) * ARC_RADIUS * 1.5;
    const cpY = c.y + Math.sin(perpAngle) * ARC_RADIUS * 1.5;

    return (
      <path
        key={`arc-${idx}`}
        d={`M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`}
        fill="none"
        stroke={style?.stroke ?? "#333"}
        strokeWidth={style?.strokeWidth ?? 1.5}
      />
    );
  });

  const clipId = `clip-${id}`;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x="-10000" y="-10000" width="20000" height="20000" />
          {crossings.map((c, idx) => (
            <circle
              key={idx}
              cx={c.x}
              cy={c.y}
              r={ARC_RADIUS}
              style={{ fill: "black" }}
            />
          ))}
        </clipPath>
      </defs>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={style?.stroke ?? "#333"}
        strokeWidth={style?.strokeWidth ?? 1.5}
        strokeDasharray={style?.strokeDasharray as string | undefined}
        markerEnd={markerEnd as string}
        clipPath={`url(#${clipId})`}
        className="react-flow__edge-path"
      />
      {arcPaths}
    </g>
  );
}
