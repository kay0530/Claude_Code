import React, { useRef, useState } from "react";
import {
  FilePlus,
  Save,
  FolderOpen,
  Undo2,
  Redo2,
  Trash2,
  Image,
  FileText,
  GitBranch,
} from "lucide-react";
import { useFlowchartStore } from "@/store/useFlowchartStore";
import { useExport } from "@/hooks/useExport";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TOOLBAR_HEIGHT } from "@/utils/constants";

/**
 * A single toolbar button with tooltip.
 */
function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Visual separator between toolbar button groups.
 */
function Separator() {
  return <div className="w-px h-6 bg-zinc-200 mx-1" />;
}

/**
 * Top toolbar with file, edit, and export actions.
 */
export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    project,
    newProject,
    loadProject,
    undo,
    redo,
    history,
    future,
    selectedNodeId,
    selectedEdgeId,
    deleteNode,
    deleteEdge,
    setTitle,
    showEdgeCrossings,
    toggleEdgeCrossings,
  } = useFlowchartStore();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(project.title);
  const { exportToPng, exportToPdf } = useExport();

  // -- File actions --

  const handleNew = () => {
    if (!window.confirm("現在のプロジェクトを破棄して新規作成しますか？")) return;
    newProject();
  };

  const handleSave = () => {
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${project.title || "flowchart"}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        loadProject(text);
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be loaded again
    e.target.value = "";
  };

  // -- Edit actions --

  const handleDelete = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    } else if (selectedEdgeId) {
      deleteEdge(selectedEdgeId);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex items-center gap-0.5 px-2 border-b border-zinc-200 bg-white shrink-0"
        style={{ height: TOOLBAR_HEIGHT }}
      >
        {/* File section */}
        <ToolbarButton icon={FilePlus} label="新規作成" onClick={handleNew} />
        <ToolbarButton icon={Save} label="保存 (JSON)" onClick={handleSave} />
        <ToolbarButton icon={FolderOpen} label="読み込み" onClick={handleLoad} />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        <Separator />

        {/* Edit section */}
        <ToolbarButton
          icon={Undo2}
          label="元に戻す"
          onClick={undo}
          disabled={history.length === 0}
        />
        <ToolbarButton
          icon={Redo2}
          label="やり直し"
          onClick={redo}
          disabled={future.length === 0}
        />
        <ToolbarButton
          icon={Trash2}
          label="削除"
          onClick={handleDelete}
          disabled={!selectedNodeId && !selectedEdgeId}
        />

        <Separator />

        {/* Export section */}
        <ToolbarButton
          icon={Image}
          label="PNG エクスポート"
          onClick={exportToPng}
        />
        <ToolbarButton
          icon={FileText}
          label="PDF エクスポート"
          onClick={exportToPdf}
        />

        <Separator />

        {/* Edge crossing toggle */}
        <ToolbarButton
          icon={GitBranch}
          label={showEdgeCrossings ? "飛び越し点: ON" : "飛び越し点: OFF"}
          onClick={toggleEdgeCrossings}
        />

        {/* Project title - editable on double click */}
        {editingTitle ? (
          <input
            className="ml-4 text-sm border border-zinc-300 rounded px-2 py-0.5 outline-none focus:border-blue-400"
            value={titleText}
            onChange={(e) => setTitleText(e.target.value)}
            onBlur={() => {
              setTitle(titleText);
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setTitle(titleText);
                setEditingTitle(false);
              }
              if (e.key === "Escape") {
                setEditingTitle(false);
              }
            }}
            autoFocus
          />
        ) : (
          <div
            className="ml-4 text-sm text-zinc-500 truncate cursor-pointer hover:text-zinc-700"
            onDoubleClick={() => {
              setTitleText(project.title);
              setEditingTitle(true);
            }}
            title="ダブルクリックで編集"
          >
            {project.title}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
