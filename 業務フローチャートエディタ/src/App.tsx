import { Sidebar } from "./components/Sidebar/Sidebar";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { FlowCanvas } from "./components/Canvas/FlowCanvas";
import { TooltipProvider } from "./components/ui/tooltip";
import { SIDEBAR_WIDTH, TOOLBAR_HEIGHT } from "./utils/constants";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useFirestoreSync } from "./hooks/useFirestoreSync";

function App() {
  useKeyboardShortcuts();
  useFirestoreSync();
  return (
    <TooltipProvider>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${SIDEBAR_WIDTH}px 1fr`,
          gridTemplateRows: `${TOOLBAR_HEIGHT}px 1fr`,
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
        }}
      >
        {/* Sidebar - spans both rows */}
        <div
          style={{
            gridRow: "1 / -1",
            gridColumn: "1",
            borderRight: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
            overflow: "hidden",
          }}
        >
          <Sidebar />
        </div>

        {/* Toolbar */}
        <div
          style={{
            gridRow: "1",
            gridColumn: "2",
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#ffffff",
          }}
        >
          <Toolbar />
        </div>

        {/* Canvas */}
        <div
          style={{
            gridRow: "2",
            gridColumn: "2",
            position: "relative",
          }}
        >
          <FlowCanvas />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
