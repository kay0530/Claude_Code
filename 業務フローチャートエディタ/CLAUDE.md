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

### NOT YET DONE (Item 9)
9. **Firebase新規作成 + Firestore共有編集 + GitHub Push**
   - Firebase CLIはインストール済み (v15.8.0)
   - ユーザーは「新規プロジェクト作成」を希望
   - 必要な作業:
     1. Firebase新規プロジェクト作成 (`firebase projects:create`)
     2. Firestore有効化 + セキュリティルール設定
     3. firebase SDK追加 (`npm install firebase`)
     4. Firestoreリアルタイム同期の実装 (useFirestoreSync hook)
     5. GitHubリポジトリへのpush
   - **注意**: Firebase CLIログイン状態を確認すること (`firebase login:list`)

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
│   └── useLaneDetection.ts
├── App.tsx                     # Main layout
└── main.tsx
```

## Dev Server
```bash
npm run dev -- --host
# → localhost:5173
```

## Known Issues
- `@tailwindcss/vite` peer dependency conflict with Vite 8 → use `--legacy-peer-deps`

## Detailed Plan
詳細な実行プランは [plan-swimlane-flowchart.md](./plan-swimlane-flowchart.md) を参照
