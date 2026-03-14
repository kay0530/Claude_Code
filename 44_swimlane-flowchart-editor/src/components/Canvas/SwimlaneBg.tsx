import { useViewport } from "@xyflow/react";
import { useFlowchartStore } from "../../store/useFlowchartStore";
import { DEFAULT_LANE_HEIGHT } from "../../utils/constants";

/**
 * Background layer for swimlane bands, rendered inside React Flow.
 * Uses viewport transform to move/scale with the canvas.
 * Renders phase headers, lane rows (alternating colors), lane labels,
 * phase separator lines, and lane group labels.
 */
export function SwimlaneBg() {
  const { x, y, zoom } = useViewport();
  const lanes = useFlowchartStore((s) => s.project.lanes);
  const phases = useFlowchartStore((s) => s.project.phases);
  const laneGroups = useFlowchartStore((s) => s.project.laneGroups);
  const config = useFlowchartStore((s) => s.project.canvasConfig);

  const totalWidth =
    config.laneLabelsWidth +
    phases.reduce((sum, p) => sum + p.width, 0);
  const totalHeight =
    config.phaseHeaderHeight +
    lanes.length * DEFAULT_LANE_HEIGHT;

  // Build a map of groupId -> group for quick lookup
  const groupMap = new Map(laneGroups.map((g) => [g.id, g]));

  // Calculate group label spans: for each group, find min y and total height
  const groupSpans = laneGroups
    .map((group) => {
      const groupLanes = lanes.filter((l) => l.groupId === group.id);
      if (groupLanes.length === 0) return null;

      const minY = Math.min(...groupLanes.map((l) => l.y));
      const maxYEnd = Math.max(
        ...groupLanes.map((l) => l.y + l.height),
      );
      return {
        id: group.id,
        name: group.name,
        color: group.color,
        y: minY,
        height: maxYEnd - minY,
      };
    })
    .filter(Boolean) as {
    id: string;
    name: string;
    color?: string;
    y: number;
    height: number;
  }[];

  // Determine left padding for lanes that are in a group
  const groupLabelWidth = groupSpans.length > 0 ? 28 : 0;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        transform: `translate(${x}px, ${y}px) scale(${zoom})`,
        transformOrigin: "0 0",
        pointerEvents: "none",
        zIndex: -1,
        width: totalWidth,
        height: totalHeight,
      }}
    >
      {/* Phase header backgrounds */}
      {phases.map((phase) => (
        <div
          key={phase.id}
          style={{
            position: "absolute",
            left: phase.x,
            top: 0,
            width: phase.width,
            height: config.phaseHeaderHeight,
            backgroundColor: phase.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "2px solid #E5E7EB",
            borderRight: "1px solid #E5E7EB",
            fontWeight: 600,
            fontSize: 14,
            color: "#333",
          }}
        >
          {phase.name}
        </div>
      ))}

      {/* Lane backgrounds (alternating colors) */}
      {lanes.map((lane, i) => (
        <div
          key={lane.id}
          style={{
            position: "absolute",
            left: 0,
            top: lane.y,
            width: totalWidth,
            height: lane.height,
            backgroundColor: i % 2 === 0 ? "#F9FAFB" : "#FFFFFF",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          {/* Lane label area */}
          <div
            style={{
              position: "absolute",
              left: lane.groupId ? groupLabelWidth : 0,
              top: 0,
              width: config.laneLabelsWidth - (lane.groupId ? groupLabelWidth : 0),
              height: lane.height,
              display: "flex",
              alignItems: "center",
              paddingLeft: 12,
              fontWeight: 500,
              fontSize: 13,
              color: "#333",
              borderRight: "2px solid #D1D5DB",
              backgroundColor: i % 2 === 0 ? "#F3F4F6" : "#F9FAFB",
            }}
          >
            {lane.name}
          </div>
        </div>
      ))}

      {/* Phase vertical separator lines */}
      {phases.map((phase) => (
        <div
          key={`sep-${phase.id}`}
          style={{
            position: "absolute",
            left: phase.x,
            top: config.phaseHeaderHeight,
            width: 1,
            height: totalHeight - config.phaseHeaderHeight,
            backgroundColor: "#E5E7EB",
          }}
        />
      ))}

      {/* Lane group labels (vertical text spanning grouped lanes) */}
      {groupSpans.map((group) => (
        <div
          key={`group-${group.id}`}
          style={{
            position: "absolute",
            left: 0,
            top: group.y,
            width: groupLabelWidth,
            height: group.height,
            backgroundColor: group.color ?? "#E8EAF6",
            borderRight: "1px solid #C5CAE9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              fontWeight: 600,
              fontSize: 12,
              color: "#333",
              letterSpacing: "0.05em",
            }}
          >
            {group.name}
          </div>
        </div>
      ))}
    </div>
  );
}
