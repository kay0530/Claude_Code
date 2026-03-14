import { useCallback } from "react";
import { useFlowchartStore } from "../store/useFlowchartStore";

/**
 * Hook that provides functions to detect which lane or phase
 * a given coordinate falls within.
 */
export function useLaneDetection() {
  const lanes = useFlowchartStore((state) => state.project.lanes);
  const phases = useFlowchartStore((state) => state.project.phases);

  /**
   * Find the lane whose vertical range contains the given Y coordinate.
   * Returns the lane ID, or undefined if Y is outside all lanes.
   */
  const detectLane = useCallback(
    (y: number): string | undefined => {
      for (const lane of lanes) {
        if (y >= lane.y && y < lane.y + lane.height) {
          return lane.id;
        }
      }
      // If no exact match, find the closest lane
      let closestLane: string | undefined;
      let minDistance = Infinity;
      for (const lane of lanes) {
        const laneMidY = lane.y + lane.height / 2;
        const distance = Math.abs(y - laneMidY);
        if (distance < minDistance) {
          minDistance = distance;
          closestLane = lane.id;
        }
      }
      return closestLane;
    },
    [lanes],
  );

  /**
   * Find the phase whose horizontal range contains the given X coordinate.
   * Returns the phase ID, or undefined if X is outside all phases.
   */
  const detectPhase = useCallback(
    (x: number): string | undefined => {
      for (const phase of phases) {
        if (x >= phase.x && x < phase.x + phase.width) {
          return phase.id;
        }
      }
      // If no exact match, find the closest phase
      let closestPhase: string | undefined;
      let minDistance = Infinity;
      for (const phase of phases) {
        const phaseMidX = phase.x + phase.width / 2;
        const distance = Math.abs(x - phaseMidX);
        if (distance < minDistance) {
          minDistance = distance;
          closestPhase = phase.id;
        }
      }
      return closestPhase;
    },
    [phases],
  );

  return { detectLane, detectPhase };
}
