import { Position } from "@xyflow/react";

/**
 * Build a step path that routes through a user-specified bend point.
 * This replaces getSmoothStepPath when the user has dragged the bend handle.
 *
 * For vertical connections (Bottom→Top): the bend point Y controls where the
 * horizontal segment sits. Path: source → down to bendY → horizontal to targetX → up to target.
 *
 * For horizontal connections (Right→Left): the bend point X controls where the
 * vertical segment sits. Path: source → right to bendX → vertical to targetY → left to target.
 *
 * Returns [path, labelX, labelY] matching getSmoothStepPath's return signature.
 */
/**
 * Determine if an edge connection should be treated as vertical for bend path
 * routing. Uses handle positions as the primary signal, but falls back to
 * geometric analysis when handles are vertical (Bottom→Top) yet nodes are
 * positioned more horizontally than vertically.
 */
export function isVerticalConnection(
  sx: number, sy: number, sPos: Position,
  tx: number, ty: number, tPos: Position,
): boolean {
  const handlesVertical = (sPos === Position.Bottom || sPos === Position.Top) &&
                          (tPos === Position.Top || tPos === Position.Bottom);
  const handlesHorizontal = (sPos === Position.Left || sPos === Position.Right) &&
                            (tPos === Position.Left || tPos === Position.Right);

  // Clear horizontal handles → horizontal
  if (handlesHorizontal) return false;
  // Clear vertical handles: verify with geometry
  if (handlesVertical) {
    const dx = Math.abs(tx - sx);
    const dy = Math.abs(ty - sy);
    // If nodes are mostly side-by-side (dx >> dy), treat as horizontal
    // This handles the common case where default Bottom→Top handles are used
    // but nodes are positioned next to each other
    if (dx > dy * 2) return false;
    return true;
  }
  // Mixed handles (e.g. Bottom→Left): use geometry
  const dx = Math.abs(tx - sx);
  const dy = Math.abs(ty - sy);
  return dy >= dx;
}

export function buildBendPath(
  sx: number, sy: number, sPos: Position,
  tx: number, ty: number, tPos: Position,
  bendDelta: number,
  borderRadius: number,
): [string, number, number] {
  const isVertical = isVerticalConnection(sx, sy, sPos, tx, ty, tPos);

  if (isVertical) {
    const midY = (sy + ty) / 2;
    const bendY = midY + bendDelta;
    const r = Math.min(
      borderRadius,
      Math.abs(bendY - sy) / 2,
      Math.abs(ty - bendY) / 2,
      Math.abs(tx - sx) / 2,
    );

    if (r <= 0 || sx === tx) {
      const path = `M ${sx} ${sy} L ${sx} ${bendY} L ${tx} ${bendY} L ${tx} ${ty}`;
      return [path, (sx + tx) / 2, bendY];
    }

    const dirY1 = bendY > sy ? 1 : -1;
    const dirX = tx > sx ? 1 : -1;
    const dirY2 = ty > bendY ? 1 : -1;

    const path = [
      `M ${sx} ${sy}`,
      `L ${sx} ${bendY - dirY1 * r}`,
      `Q ${sx} ${bendY} ${sx + dirX * r} ${bendY}`,
      `L ${tx - dirX * r} ${bendY}`,
      `Q ${tx} ${bendY} ${tx} ${bendY + dirY2 * r}`,
      `L ${tx} ${ty}`,
    ].join(" ");

    return [path, (sx + tx) / 2, bendY];
  } else {
    // Horizontal connection
    const midX = (sx + tx) / 2;
    const bendX = midX + bendDelta;
    const r = Math.min(
      borderRadius,
      Math.abs(bendX - sx) / 2,
      Math.abs(tx - bendX) / 2,
      Math.abs(ty - sy) / 2,
    );

    if (r <= 0 || sy === ty) {
      const path = `M ${sx} ${sy} L ${bendX} ${sy} L ${bendX} ${ty} L ${tx} ${ty}`;
      return [path, bendX, (sy + ty) / 2];
    }

    const dirX1 = bendX > sx ? 1 : -1;
    const dirY = ty > sy ? 1 : -1;
    const dirX2 = tx > bendX ? 1 : -1;

    const path = [
      `M ${sx} ${sy}`,
      `L ${bendX - dirX1 * r} ${sy}`,
      `Q ${bendX} ${sy} ${bendX} ${sy + dirY * r}`,
      `L ${bendX} ${ty - dirY * r}`,
      `Q ${bendX} ${ty} ${bendX + dirX2 * r} ${ty}`,
      `L ${tx} ${ty}`,
    ].join(" ");

    return [path, bendX, (sy + ty) / 2];
  }
}

/**
 * Compute a dynamic offset for getSmoothStepPath to avoid unnecessary
 * detours when source and target are nearly aligned.
 */
export function computeOffset(sourceX: number, sourceY: number, targetX: number, targetY: number): number {
  const dx = Math.abs(sourceX - targetX);
  const dy = Math.abs(sourceY - targetY);

  if (dx < 20) return 0;
  if (dy < 20) return 0;
  if (dx < 50) return Math.max(10, Math.min(15, dx / 3));
  if (dy < 50) return Math.max(10, Math.min(15, dy / 3));
  return Math.max(15, Math.min(25, Math.min(dx, dy) / 4));
}
