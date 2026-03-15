# Swimlane Flowchart Editor

## Project Overview
ソラグリWGフロー図（Excel）の「パワまる 2603～(社内SIM）」シートを再現するスイムレーン型フローチャートエディタ。
縦に部署レイヤー（スイムレーン）、横にフェーズ列を持ち、ノードを配置して矢印で接続するフルエディタ。

## Tech Stack
- React 19 + TypeScript + Vite 8
- @xyflow/react v12 (React Flow) - インタラクティブノードエディタ
- Zustand v5 - 状態管理 + スナップショットUndo/Redo (max 50)
- Tailwind CSS v4 (@tailwindcss/vite plugin)
- shadcn/ui style components (手動作成、npx不使用)
- html-to-image + jsPDF - PNG/PDFエクスポート
- lucide-react - アイコン
- nanoid - ID生成

## Implementation Status

### Completed (Items 1-8)
1. **レーン入替え** - HTML5ドラッグ&ドロップでスイムレーンの並べ替え (LaneEditor.tsx)
2. **インライン編集** - ダブルクリックでノードラベル直接編集 (TaskNode, DecisionNode, AnnotationNode, BadgeNode)
3. **コネクタ作成** - React Flowのネイティブ接続機能 (ハンドル: top/left=target, bottom/right=source)
4. **飛び越し点** - エッジ交差時にsmoolthstep↔step切替トグル (Toolbar + store)
5. **判定ノード** - SVGポリゴンひし形（CSS rotateから変更、幅100x高60の適切比率）
6. **ノードリサイズ** - NodeResizer from @xyflow/react (選択時表示)
7. **キーボードショートカット** - Ctrl+Z/Y, Delete, Ctrl+C/V, Ctrl+S (useKeyboardShortcuts.ts)
8. **タイトル編集** - ツールバーでダブルクリック→入力→Enter確定/Escキャンセル

### Completed (Item 9)
9. **Firebase新規作成 + Firestore共有編集 + GitHub Push**
   - Firebase project: `swimlane-flowchart-editor` (asia-northeast1)
   - Firestore: enabled, rules deployed (`projects/{projectId}` read/write open)
   - `src/lib/firebase.ts` - Firebase初期化
   - `src/hooks/useFirestoreSync.ts` - リアルタイム同期 (500ms debounce, optimistic update)
   - GitHub: Claude_Code_Demoモノレポにcommit & push済み

## Architecture Key Points

### Swimlane Rendering
- レーンラベル: React Flow外側のCSS Gridで常時表示
- レーン背景: React Flow内部に `useViewport()` transform連動div (zIndex: -1) → SwimlaneBg.tsx
- フェーズヘッダー: React Flow外側の固定ヘッダー
- fitView対応: キャンバス四隅にinvisible anchor nodes配置

### Data Model
- `FlowchartProject`: title, phases[], laneGroups[], lanes[], nodes[], edges[], canvasConfig
- `FlowNode.style`: borderColor, borderStyle, backgroundColor, textColor, shape
- Node types: task, decision, subprocess, annotation, badge

### Sample Data
- 12レーン（お客様〜O&M）、4フェーズ（登録〜工事日）
- ~45ノード、~40エッジ（Excelフロー再現）

## File Structure
```
src/
├── types/flowchart.ts          # Core type definitions
├── store/useFlowchartStore.ts  # Zustand store
├── utils/
│   ├── constants.ts            # Default values, style presets
│   ├── initialData.ts          # Sample data
│   └── reactFlowAdapter.ts    # FlowNode ↔ React Flow conversion
├── components/
│   ├── Canvas/
│   │   ├── FlowCanvas.tsx      # React Flow wrapper + drop handler
│   │   └── SwimlaneBg.tsx      # Lane background layer
│   ├── Nodes/
│   │   ├── TaskNode.tsx        # Rectangle/rounded node
│   │   ├── DecisionNode.tsx    # SVG diamond node
│   │   ├── AnnotationNode.tsx  # Text annotation
│   │   └── BadgeNode.tsx       # Operator badge
│   ├── Sidebar/
│   │   ├── Sidebar.tsx         # 4-tab container
│   │   ├── NodePalette.tsx     # Draggable templates
│   │   ├── LaneEditor.tsx      # Lane CRUD + drag reorder
│   │   ├── PhaseEditor.tsx     # Phase CRUD
│   │   └── PropertiesPanel.tsx # Property editor
│   ├── Toolbar/Toolbar.tsx     # Top toolbar
│   └── ui/                     # shadcn/ui components
├── hooks/
│   ├── useKeyboardShortcuts.ts
│   ├── useExport.ts
│   ├── useLaneDetection.ts
│   └── useFirestoreSync.ts  # Firestore real-time sync
├── lib/
│   ├── firebase.ts           # Firebase initialization
│   └── utils.ts
├── App.tsx                     # Main layout
└── main.tsx
```

## Dev Server
```bash
npm run dev -- --host
# → localhost:5173
```

### Completed (Items 10-15) - Edge Improvements
10. **Visio風飛び越し点 (JumpOverEdge)** - プリコンピュートSVGパス解析、セグメント交差検出、半円アーク描画
11. **飛び越しモード選択** - "later"（後から追加）/ "horizontal"（横が飛び越し）/ "vertical"（縦が飛び越し）
12. **エッジプロパティ編集** - 線の太さ、線種（実線/破線）、始点/終点マーカー（なし/矢印/閉じた矢印）、色
13. **エッジラベル編集** - ダブルクリックでwindow.promptによるラベル入力
14. **矢印キーノード移動** - 1px移動、Shift+20pxグリッドステップ
15. **コネクタルーティング修正** - computeOffset動的計算（dx/dy < 20で直線パス許可）

### Completed (Items 16-18) - Edge Enhancement
16. **エッジ選択ハイライト** - CSS `.react-flow__edge.selected` で stroke-width: 3、elevateEdgesOnSelect
17. **ベンドポイント調整** - 黄色ダイヤモンドハンドルでエッジの曲がり位置をドラッグ調整、PropertiesPanel にスライダーも追加
18. **エッジ操作改善** - interactionWidth: 20、edgesFocusable、edgesReconnectable

### Edge System Architecture
- `JumpOverEdge.tsx` - カスタムエッジコンポーネント（BaseEdge + EdgeLabelRenderer）
  - `JumpOverEdgeData` 型: allEdgePaths[], smoothEdges, jumpOverMode, bendOffset
  - `computeOffset()` - 動的オフセット計算（アライメントに応じて 0〜20）
  - `pathToSegments()` - SVGパス→セグメント変換
  - `findCrossings()` - セグメント交差検出（モードフィルタリング対応）
  - `buildPathWithJumps()` - 交差点にアーク挿入したSVGパス生成
  - 黄色ダイヤモンドハンドル: ドラッグでbendOffset調整、ダブルクリックで自動リセット
- `reactFlowAdapter.ts` - FlowEdge → React Flow Edge変換
  - MarkerType変換、strokeWidth/markerStart/markerEnd反映
  - bendOffset伝搬（プリコンピュートパスとエッジデータの両方）
- ストア: `jumpOverEnabled`, `jumpOverMode`, `smoothEdges` トグル

## File Structure
```
src/
├── types/flowchart.ts          # Core type definitions (FlowEdge.bendOffset, MarkerStyle)
├── store/useFlowchartStore.ts  # Zustand store (jumpOverEnabled, jumpOverMode, smoothEdges)
├── utils/
│   ├── constants.ts            # Default values, style presets
│   ├── initialData.ts          # Sample data
│   └── reactFlowAdapter.ts    # FlowNode/FlowEdge ↔ React Flow conversion
├── components/
│   ├── Canvas/
│   │   ├── FlowCanvas.tsx      # React Flow wrapper + drop handler
│   │   └── SwimlaneBg.tsx      # Lane background layer
│   ├── Edges/
│   │   └── JumpOverEdge.tsx    # Custom edge with jump-over arcs + bend handles
│   ├── Nodes/
│   │   ├── TaskNode.tsx        # Rectangle/rounded node
│   │   ├── DecisionNode.tsx    # SVG diamond node
│   │   ├── AnnotationNode.tsx  # Text annotation
│   │   └── BadgeNode.tsx       # Operator badge
│   ├── Sidebar/
│   │   ├── Sidebar.tsx         # 4-tab container
│   │   ├── NodePalette.tsx     # Draggable templates
│   │   ├── LaneEditor.tsx      # Lane CRUD + drag reorder
│   │   ├── PhaseEditor.tsx     # Phase CRUD
│   │   └── PropertiesPanel.tsx # Property editor (node/edge props, bend offset slider)
│   ├── Toolbar/Toolbar.tsx     # Top toolbar (jump-over mode selector)
│   └── ui/                     # shadcn/ui components
├── hooks/
│   ├── useKeyboardShortcuts.ts # Undo/redo, arrow keys, delete, copy/paste, save
│   ├── useExport.ts
│   ├── useLaneDetection.ts
│   └── useFirestoreSync.ts    # Firestore real-time sync
├── lib/
│   ├── firebase.ts            # Firebase initialization
│   └── utils.ts
├── App.css                     # Edge selection CSS + bend handle styles
├── App.tsx                     # Main layout
└── main.tsx
```

## Known Issues
- `@tailwindcss/vite` peer dependency conflict with Vite 8 → use `--legacy-peer-deps`
- ワークツリー `cool-ritchie` の削除が必要（CWDがワークツリー内のためPermission denied）

## Pending / Future Work
- GitHub Pages デプロイ（kay0530.github.io/swimlane-flowchart-editor/）への反映
- CrossingEdge.tsx は古い実装（DOM読み取り方式）→ JumpOverEdge.tsx に置き換え済み、削除可能

## Detailed Plan
詳細な実行プランは [plan-swimlane-flowchart.md](./plan-swimlane-flowchart.md) を参照
