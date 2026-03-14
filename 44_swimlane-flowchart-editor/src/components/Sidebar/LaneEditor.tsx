import React, { useState } from "react";
import { nanoid } from "nanoid";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { useFlowchartStore } from "@/store/useFlowchartStore";
import { DEFAULT_LANE_HEIGHT } from "@/utils/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Recalculate Y positions for all lanes based on their order and heights.
 */
function recalculateYPositions(
  lanes: { id: string; height: number; order: number }[]
) {
  const sorted = [...lanes].sort((a, b) => a.order - b.order);
  let currentY = 50; // phaseHeaderHeight default
  return sorted.map((lane, index) => {
    const y = currentY;
    currentY += lane.height;
    return { id: lane.id, y, order: index };
  });
}

/**
 * Lane management panel. Lists lanes with editable names/heights,
 * and allows adding/removing lanes.
 */
export function LaneEditor() {
  const { project, addLane, updateLane, deleteLane, pushHistory } = useFlowchartStore();
  const { lanes, laneGroups } = project;

  const sortedLanes = [...lanes].sort((a, b) => a.order - b.order);

  // ── Drag & drop state ────────────────────────────────────────────
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedId(null);
    setDragOverId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (id: string) => {
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    pushHistory();

    const newOrder = [...sortedLanes];
    const dragIndex = newOrder.findIndex((l) => l.id === draggedId);
    const dropIndex = newOrder.findIndex((l) => l.id === targetId);

    if (dragIndex === -1 || dropIndex === -1) return;

    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, removed);

    // Update all lane orders and Y positions
    const config = project.canvasConfig;
    let currentY = config.phaseHeaderHeight;
    newOrder.forEach((lane, index) => {
      updateLane(lane.id, { order: index, y: currentY });
      currentY += lane.height;
    });

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleAddLane = () => {
    const maxOrder = lanes.length > 0 ? Math.max(...lanes.map((l) => l.order)) : -1;
    const lastLane = lanes.find((l) => l.order === maxOrder);
    const newY = lastLane ? lastLane.y + lastLane.height : 0;

    addLane({
      id: nanoid(),
      name: `レーン ${lanes.length + 1}`,
      y: newY,
      height: DEFAULT_LANE_HEIGHT,
      order: maxOrder + 1,
    });
  };

  const handleDeleteLane = (id: string) => {
    if (!window.confirm("このレーンを削除しますか？")) return;

    deleteLane(id);

    // Recalculate Y positions for remaining lanes
    const remaining = lanes.filter((l) => l.id !== id);
    const updates = recalculateYPositions(remaining);
    updates.forEach(({ id: laneId, y, order }) => {
      updateLane(laneId, { y, order });
    });
  };

  const handleNameChange = (id: string, name: string) => {
    updateLane(id, { name });
  };

  const handleHeightChange = (id: string, value: string) => {
    const height = parseInt(value, 10);
    if (isNaN(height) || height < 40) return;
    updateLane(id, { height });

    // Recalculate Y positions after height change
    const updatedLanes = lanes.map((l) =>
      l.id === id ? { ...l, height } : l
    );
    const updates = recalculateYPositions(updatedLanes);
    updates.forEach(({ id: laneId, y, order }) => {
      updateLane(laneId, { y, order });
    });
  };

  const getGroupName = (groupId?: string) => {
    if (!groupId) return null;
    const group = laneGroups.find((g) => g.id === groupId);
    return group?.name ?? null;
  };

  return (
    <div className="p-2 space-y-3">
      <p className="text-xs text-zinc-500">レーンの追加・編集・削除</p>

      {sortedLanes.length === 0 && (
        <p className="text-xs text-zinc-400 italic py-4 text-center">
          レーンがありません
        </p>
      )}

      <div className="space-y-2">
        {sortedLanes.map((lane) => {
          const groupName = getGroupName(lane.groupId);
          return (
            <div
              key={lane.id}
              draggable
              onDragStart={(e) => handleDragStart(e, lane.id)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(lane.id)}
              onDrop={() => handleDrop(lane.id)}
              className={cn(
                "rounded-md border border-zinc-200 bg-white p-2 space-y-1.5 cursor-grab transition-all",
                draggedId === lane.id && "opacity-50",
                dragOverId === lane.id && "border-blue-400 border-2 bg-blue-50"
              )}
            >
              {groupName && (
                <span className="text-[10px] text-zinc-400 font-medium">
                  {groupName}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <GripVertical className="h-4 w-4 text-zinc-300 cursor-grab flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <Label>名前</Label>
                  <Input
                    value={lane.name}
                    onChange={(e) => handleNameChange(lane.id, e.target.value)}
                    placeholder="レーン名"
                  />
                </div>
                <div className="w-16 space-y-1">
                  <Label>高さ</Label>
                  <Input
                    type="number"
                    value={lane.height}
                    onChange={(e) => handleHeightChange(lane.id, e.target.value)}
                    min={40}
                    step={10}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-4 text-zinc-400 hover:text-red-500"
                  onClick={() => handleDeleteLane(lane.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleAddLane}
      >
        <Plus className="h-4 w-4 mr-1" />
        レーンを追加
      </Button>
    </div>
  );
}
