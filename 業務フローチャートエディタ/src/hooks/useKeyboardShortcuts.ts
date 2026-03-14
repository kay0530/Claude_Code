import { useEffect } from "react";
import { useFlowchartStore } from "../store/useFlowchartStore";

/**
 * Global keyboard shortcuts for the flowchart editor.
 *
 * - Ctrl+Z: Undo
 * - Ctrl+Shift+Z / Ctrl+Y: Redo
 * - Delete / Backspace: Delete selected node or edge
 * - Ctrl+C: Copy selected node
 * - Ctrl+V: Paste copied node
 * - Ctrl+S: Save project as JSON
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Undo
      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useFlowchartStore.getState().undo();
        return;
      }

      // Redo (Ctrl+Shift+Z or Ctrl+Y)
      if (ctrl && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        useFlowchartStore.getState().redo();
        return;
      }
      if (ctrl && e.key === "y") {
        e.preventDefault();
        useFlowchartStore.getState().redo();
        return;
      }

      // Delete selected
      if (e.key === "Delete" || e.key === "Backspace") {
        const { selectedNodeId, selectedEdgeId, deleteNode, deleteEdge } =
          useFlowchartStore.getState();
        if (selectedNodeId) {
          e.preventDefault();
          deleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          e.preventDefault();
          deleteEdge(selectedEdgeId);
        }
        return;
      }

      // Copy
      if (ctrl && e.key === "c") {
        const { selectedNodeId, project } = useFlowchartStore.getState();
        if (selectedNodeId) {
          const node = project.nodes.find((n) => n.id === selectedNodeId);
          if (node) {
            useFlowchartStore.setState({ clipboard: structuredClone(node) });
          }
        }
        return;
      }

      // Paste
      if (ctrl && e.key === "v") {
        const { clipboard, addNode } = useFlowchartStore.getState();
        if (clipboard) {
          const newNode = {
            ...structuredClone(clipboard),
            id: `node-${Date.now()}`,
            position: {
              x: clipboard.position.x + 40,
              y: clipboard.position.y + 40,
            },
          };
          addNode(newNode);
        }
        return;
      }

      // Save
      if (ctrl && e.key === "s") {
        e.preventDefault();
        const { project } = useFlowchartStore.getState();
        const json = JSON.stringify(project, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${project.title || "flowchart"}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
