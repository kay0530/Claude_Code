# 業務フローチャートエディタ

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
- Firebase + Firestore - リアルタイム同期

## Deployment
- GitHub Pages: https://kay0530.github.io/swimlane-flowchart-editor/
- GitHub Actions workflow でビルド・デプロイ
- vite.config.ts の `base: '/swimlane-flowchart-editor/'` が必須（GitHub Pages用パス）

## Implementation Status - All Complete

1. **レーン入替え** - HTML5ドラッグ&ドロップでスイムレーンの並べ替え (LaneEditor.tsx)
2. **インライン編集** - ダブルクリックでノードラベル直接編集 (TaskNode, DecisionNode, AnnotationNode, BadgeNode)
3. **コネクタ作成** - React Flowのネイティブ接続機能 (ハンドル: top/left=target, bottom/right=source)
4. **飛び越し点** - カスタムエッジ（JumpOverEdge）でエッジ交差箇所に半円アーチを描画（Visio風）
5. **判定ノード** - SVGポリゴンひし形（CSS rotateから変更、幅100x高60の適切比率）
6. **ノードリサイズ** - NodeResizer from @xyflow/react (選択時表示)
7. **キーボードショートカット** - Ctrl+Z/Y, Delete, Ctrl+C/V, Ctrl+S (useKeyboardShortcuts.ts)
8. **タイトル編集** - ツールバーでダブルクリック→入力→Enter確定/Escキャンセル
9. **Firebase + Firestore共有編集** - リアルタイム同期実装済み
10. **コネクタ付け直し** - onReconnect + reconnectEdge() でドラッグによるエッジ再接続
11. **丸みトグル** - smoothEdges（デフォルトOFF）でstep↔smoothstep切替

## Design Decisions

### エッジ表示制御（2トグル）
- **飛び越し点** (`jumpOverEnabled`, default: `true`): エッジ交差箇所に半円アーチを描画
- **丸み** (`smoothEdges`, default: `false`): step（直角）↔ smoothstep（丸み）切替
- 飛び越しON + 丸みOFF → JumpOverEdge with borderRadius: 0（直線）
- 飛び越しON + 丸みON → JumpOverEdge with borderRadius: 8（丸み）
- 飛び越しOFF → 通常の step or smoothstep エッジ

### 判定ノードCSS修正
- React Flowのデフォルトノードスタイル（`.react-flow__node-decision`）がSVGダイヤモンドを覆う
- `index.css` で background/border/padding/box-shadow を `none !important` で上書き

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
├── store/useFlowchartStore.ts  # Zustand store (jumpOverEnabled, smoothEdges)
├── utils/
│   ├── constants.ts            # Default values, style presets
│   ├── initialData.ts          # Sample data
│   ├── reactFlowAdapter.ts    # FlowNode ↔ React Flow conversion + edge path calc
│   └── edgeRouting.ts          # Node avoidance routing (Liang-Barsky algorithm)
├── components/
│   ├── Canvas/
│   │   ├── FlowCanvas.tsx      # React Flow wrapper + reconnection + edge type logic
│   │   └── SwimlaneBg.tsx      # Lane background layer
│   ├── Edges/
│   │   └── JumpOverEdge.tsx    # Custom edge with jump-over arcs at crossings
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
│   ├── Toolbar/Toolbar.tsx     # Top toolbar (jump-over toggle, smooth toggle)
│   └── ui/                     # shadcn/ui components
├── hooks/
│   ├── useKeyboardShortcuts.ts
│   ├── useExport.ts
│   ├── useFirestoreSync.ts     # Firebase realtime sync
│   └── useLaneDetection.ts
├── lib/
│   ├── firebase.ts             # Firebase config
│   └── utils.ts                # cn() utility
├── App.tsx                     # Main layout
└── main.tsx
```

## Dev Server
```bash
npm run dev -- --host
# → localhost:5173
```

### Preview Server (Claude Code)
- 日本語パスでNode.jsのspawnがEINVALエラーになる問題あり
- `C:\tmp_fc` → ワークツリーのシンボリックリンクで回避
- `dev.cjs` + `.claude/launch.json` で起動設定済み

## Known Issues
- `@tailwindcss/vite` peer dependency conflict with Vite 8 → use `--legacy-peer-deps`
- メインリポジトリ（Claude_Code_Demo）へのワークツリーマージが未完了（次セッションで実施予定）

## Pending Tasks
- メインリポへのワークツリーマージ
