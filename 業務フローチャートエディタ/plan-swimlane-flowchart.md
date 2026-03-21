# Swimlane Flowchart Editor - 実装プラン

## 進捗状況
- Items 1-8: **完了** (TypeScript コンパイル通過済み、ブラウザ表示確認済み)
- Item 9: **未着手**

## 次セッションで最初に行うべきアクション

### 1. Firebase/Firestore セットアップ (Item 9)

```bash
# Firebase CLIログイン確認
firebase login:list

# 新規プロジェクト作成
firebase projects:create swimlane-flowchart-editor --display-name "Swimlane Flowchart Editor"

# Firestore有効化
firebase init firestore

# Firebase SDK インストール
cd 業務フローチャートエディタ
npm install firebase
```

### 2. Firestore リアルタイム同期の実装

新規ファイル:
- `src/lib/firebase.ts` - Firebase初期化 (firebaseConfig)
- `src/hooks/useFirestoreSync.ts` - Firestore同期フック

実装方針:
- プロジェクト全体を1つのFirestoreドキュメントとして保存 (`projects/{projectId}`)
- `onSnapshot()` でリアルタイム購読
- ローカル変更時に `updateDoc()` でFirestoreに反映
- デバウンス (500ms) で書き込み頻度制御
- 楽観的更新: ローカルステート即反映 → Firestore同期

ストア変更:
- `useFlowchartStore` に `projectId` (Firestore document ID) を追加
- `syncToFirestore` / `loadFromFirestore` アクション追加

### 3. GitHub Push

```bash
cd 業務フローチャートエディタ
git init
git add .
git commit -m "feat: swimlane flowchart editor with full editing capabilities"
gh repo create swimlane-flowchart-editor --public --source=.
git push -u origin main
```

## 設計上の決定事項

### 採用した方式
- **スイムレーン背景**: React Flow内部の `useViewport()` transform連動div (zIndex: -1)
- **fitView対応**: invisible anchor nodes方式
- **ひし形ノード**: SVGポリゴン (CSS rotateではなく)
- **レーン並べ替え**: HTML5ネイティブD&D (ライブラリ不使用)
- **Undo/Redo**: スナップショット方式 (OT/CRDTではなく)
- **shadcn/ui**: 手動作成 (npxコマンド不使用)

### 却下した代替案
- CSS rotate(45deg) でひし形 → テキストも回転してしまう問題
- レーン並べ替えにreact-beautiful-dnd → 不要な依存追加
- React Flow外側にレーンラベル配置 → レーンY座標がズレる問題が発生したためSwimlaneBg内に統合

## peer dependency注意
- `@tailwindcss/vite` は vite ^5.2.0 || ^6 || ^7 が要件だがvite 8を使用中
- `npm install` 時は `--legacy-peer-deps` が必要
