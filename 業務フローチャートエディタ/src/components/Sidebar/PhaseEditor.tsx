import { nanoid } from "nanoid";
import { Trash2, Plus } from "lucide-react";
import { useFlowchartStore } from "@/store/useFlowchartStore";
import { PHASE_COLORS } from "@/utils/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const DEFAULT_PHASE_WIDTH = 200;

const PHASE_COLOR_OPTIONS = Object.entries(PHASE_COLORS).map(
  ([name, value]) => ({
    name,
    value,
  })
);

/**
 * Recalculate X positions for all phases based on their order and widths.
 */
function recalculateXPositions(
  phases: { id: string; width: number; order: number }[]
) {
  const sorted = [...phases].sort((a, b) => a.order - b.order);
  let currentX = 0;
  return sorted.map((phase, index) => {
    const x = currentX;
    currentX += phase.width;
    return { id: phase.id, x, order: index };
  });
}

/**
 * Phase management panel. Lists phases with editable names/widths/colors,
 * and allows adding/removing phases.
 */
export function PhaseEditor() {
  const { project, addPhase, updatePhase, deletePhase } =
    useFlowchartStore();
  const { phases } = project;

  const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

  const handleAddPhase = () => {
    const maxOrder =
      phases.length > 0 ? Math.max(...phases.map((p) => p.order)) : -1;
    const lastPhase = phases.find((p) => p.order === maxOrder);
    const newX = lastPhase ? lastPhase.x + lastPhase.width : 0;

    addPhase({
      id: nanoid(),
      name: `フェーズ ${phases.length + 1}`,
      color: PHASE_COLORS.yellow,
      x: newX,
      width: DEFAULT_PHASE_WIDTH,
      order: maxOrder + 1,
    });
  };

  const handleDeletePhase = (id: string) => {
    if (!window.confirm("このフェーズを削除しますか？")) return;

    deletePhase(id);

    // Recalculate X positions for remaining phases
    const remaining = phases.filter((p) => p.id !== id);
    const updates = recalculateXPositions(remaining);
    updates.forEach(({ id: phaseId, x, order }) => {
      updatePhase(phaseId, { x, order });
    });
  };

  const handleNameChange = (id: string, name: string) => {
    updatePhase(id, { name });
  };

  const handleWidthChange = (id: string, value: string) => {
    const width = parseInt(value, 10);
    if (isNaN(width) || width < 100) return;
    updatePhase(id, { width });

    // Recalculate X positions after width change
    const updatedPhases = phases.map((p) =>
      p.id === id ? { ...p, width } : p
    );
    const updates = recalculateXPositions(updatedPhases);
    updates.forEach(({ id: phaseId, x, order }) => {
      updatePhase(phaseId, { x, order });
    });
  };

  const handleColorChange = (id: string, color: string) => {
    updatePhase(id, { color });
  };

  return (
    <div className="p-2 space-y-3">
      <p className="text-xs text-zinc-500">フェーズの追加・編集・削除</p>

      {sortedPhases.length === 0 && (
        <p className="text-xs text-zinc-400 italic py-4 text-center">
          フェーズがありません
        </p>
      )}

      <div className="space-y-2">
        {sortedPhases.map((phase) => (
          <div
            key={phase.id}
            className="rounded-md border border-zinc-200 bg-white p-2 space-y-1.5"
          >
            <div className="flex items-center gap-1.5">
              <div className="flex-1 space-y-1">
                <Label>名前</Label>
                <Input
                  value={phase.name}
                  onChange={(e) => handleNameChange(phase.id, e.target.value)}
                  placeholder="フェーズ名"
                />
              </div>
              <div className="w-16 space-y-1">
                <Label>幅</Label>
                <Input
                  type="number"
                  value={phase.width}
                  onChange={(e) =>
                    handleWidthChange(phase.id, e.target.value)
                  }
                  min={100}
                  step={20}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mt-4 text-zinc-400 hover:text-red-500"
                onClick={() => handleDeletePhase(phase.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Color picker */}
            <div className="space-y-1">
              <Label>色</Label>
              <div className="flex gap-1 flex-wrap">
                {PHASE_COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      phase.color === opt.value
                        ? "border-zinc-600 scale-110"
                        : "border-zinc-200 hover:border-zinc-400"
                    }`}
                    style={{ backgroundColor: opt.value }}
                    onClick={() => handleColorChange(phase.id, opt.value)}
                    title={opt.name}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleAddPhase}
      >
        <Plus className="h-4 w-4 mr-1" />
        フェーズを追加
      </Button>
    </div>
  );
}
