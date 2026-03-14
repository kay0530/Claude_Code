import { Position } from "@xyflow/react";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Check if a line segment from p1 to p2 intersects a rectangle.
 * Uses the Liang-Barsky algorithm for segment-AABB intersection.
 */
function segmentIntersectsRect(
  p1: Point,
  p2: Point,
  rect: Rect
): boolean {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const p = [-dx, dx, -dy, dy];
  const q = [
    p1.x - left,
    right - p1.x,
    p1.y - top,
    bottom - p1.y,
  ];

  let tMin = 0;
  let tMax = 1;

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      // Parallel to this edge
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        tMin = Math.max(tMin, t);
      } else {
        tMax = Math.min(tMax, t);
      }
      if (tMin > tMax) return false;
    }
  }

  return true;
}

/**
 * Find all obstacle rectangles that a line segment passes through.
 */
function findBlockingObstacles(
  p1: Point,
  p2: Point,
  obstacles: Rect[],
  excludeIds: string[]
): Rect[] {
  return obstacles.filter(
    (obs) =>
      !excludeIds.includes(obs.id) && segmentIntersectsRect(p1, p2, obs)
  );
}

/**
 * Compute the bounding box that encompasses all blocking obstacles,
 * then generate waypoints that route around them.
 */
function routeAroundObstacles(
  source: Point,
  target: Point,
  sourcePosition: Position,
  targetPosition: Position,
  blockers: Rect[],
  padding: number
): Point[] {
  if (blockers.length === 0) return [];

  // Compute the merged bounding box of all blocking obstacles
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of blockers) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  // Add padding
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  // Determine primary direction of the edge
  const dx = Math.abs(target.x - source.x);
  const dy = Math.abs(target.y - source.y);
  const isHorizontalFlow =
    sourcePosition === Position.Right ||
    sourcePosition === Position.Left ||
    targetPosition === Position.Right ||
    targetPosition === Position.Left;

  if (isHorizontalFlow || dx > dy) {
    // Edge flows mostly horizontally → route around vertically
    // Decide whether to go above or below the obstacle
    const midY = (minY + maxY) / 2;
    const avgSourceTargetY = (source.y + target.y) / 2;

    if (avgSourceTargetY < midY) {
      // Route above
      const wayY = minY;
      return [
        { x: source.x, y: wayY },
        { x: target.x, y: wayY },
      ];
    } else {
      // Route below
      const wayY = maxY;
      return [
        { x: source.x, y: wayY },
        { x: target.x, y: wayY },
      ];
    }
  } else {
    // Edge flows mostly vertically → route around horizontally
    const midX = (minX + maxX) / 2;
    const avgSourceTargetX = (source.x + target.x) / 2;

    if (avgSourceTargetX < midX) {
      // Route to the left
      const wayX = minX;
      return [
        { x: wayX, y: source.y },
        { x: wayX, y: target.y },
      ];
    } else {
      // Route to the right
      const wayX = maxX;
      return [
        { x: wayX, y: source.y },
        { x: wayX, y: target.y },
      ];
    }
  }
}

/**
 * Given source/target positions and an array of obstacle nodes,
 * calculate waypoints that route around obstacles.
 * Returns path points including source and target.
 */
export function calculateAvoidancePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position,
  obstacles: Array<{ x: number; y: number; width: number; height: number; id: string }>,
  sourceNodeId: string,
  targetNodeId: string,
  padding: number = 20
): { pathPoints: Array<{ x: number; y: number }> } {
  const source: Point = { x: sourceX, y: sourceY };
  const target: Point = { x: targetX, y: targetY };
  const excludeIds = [sourceNodeId, targetNodeId];

  // Find obstacles blocking the direct path
  const blockers = findBlockingObstacles(source, target, obstacles, excludeIds);

  if (blockers.length === 0) {
    // No obstacles: direct path
    return { pathPoints: [source, target] };
  }

  // Calculate waypoints to route around obstacles
  const waypoints = routeAroundObstacles(
    source,
    target,
    sourcePosition,
    targetPosition,
    blockers,
    padding
  );

  // Build full path: source → waypoints → target
  const pathPoints = [source, ...waypoints, target];

  // Verify the new path segments don't also intersect obstacles.
  // If they do, add extra padding and retry once.
  let hasCollision = false;
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const segmentBlockers = findBlockingObstacles(
      pathPoints[i],
      pathPoints[i + 1],
      obstacles,
      excludeIds
    );
    if (segmentBlockers.length > 0) {
      hasCollision = true;
      break;
    }
  }

  if (hasCollision) {
    // Retry with increased padding
    const retryWaypoints = routeAroundObstacles(
      source,
      target,
      sourcePosition,
      targetPosition,
      blockers,
      padding * 2
    );
    return { pathPoints: [source, ...retryWaypoints, target] };
  }

  return { pathPoints };
}

/**
 * Convert an array of path points to an SVG path string
 * using orthogonal (step-style) segments.
 */
export function pathPointsToSvgPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}
