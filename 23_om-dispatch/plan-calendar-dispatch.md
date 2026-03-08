# カレンダー空き予定ベースの差配機能 実装プラン

## Context

差配エンジン (`dispatchEngine.js`) の `filterAvailableMembers()` が完全に壊れている:
- `event.memberId` / `event.date` という存在しないフィールドで照合 → 常にマッチゼロ → 全員「空き」扱い
- 実際のイベントは `event.memberEmail` + `event.start` (ISO datetime) を持つ
- `isBusy` チェックなし、終日イベント未対応、時間粒度なし（日レベルブロック）

**最重要発見**: `calendarService.js` に既に本番品質の空き確認ロジックが3つ存在（未使用）:
- `findAvailableSlots()` — メンバーの空きスロット算出（isBusy/isAllDay対応済み）
- `checkTeamAvailability()` — チーム全員の時間範囲重複チェック
- `findBestDates()` — 最適日付検索

## 実装方針: 既存calendarService.jsを最大限活用し、最小限の変更で実現

---

## Phase 1: `filterAvailableMembers()` 書き換え [核心]

**File**: `23_om-dispatch/src/services/dispatchEngine.js` (193-207行目)

### 変更内容
- `findAvailableSlots` を `calendarService.js` からインポート
- `member.outlookEmail` と `event.memberEmail` で照合（正しいフィールド名）
- 時間粒度の空き確認（日レベル→時間レベル）
- `isBusy === true` のイベントのみブロック（calendarServiceが内部で処理済み）
- 返り値を enriched member（`availableMinutes`, `calendarFit` 付き）に拡張

### シグネチャ変更
```
Before: filterAvailableMembers(members, job, calendarEvents)
After:  filterAvailableMembers(members, job, calendarEvents, settings, jobType)
```

### ロジック
1. calendarEvents空 or preferredDate未設定 → 全員返す（`calendarFit: 1.0`）
2. 各メンバーに対して `findAvailableSlots(member.outlookEmail, calendarEvents, jobDate, workingHours)` 呼出
3. `totalFreeMinutes` 算出、`requiredMinutes`（baseTimeHours × 60）との比率で `calendarFit` 計算
4. `totalFreeMinutes < 60` のメンバーを除外（ほぼ終日予定）
5. enriched member（元メンバー + `availableMinutes`, `calendarFit`, `freeSlots`）を返す

### インポート追加
```javascript
import { findAvailableSlots } from './calendarService';
```

---

## Phase 2: `rankTeams()` 呼び出し箇所の修正

**File**: `23_om-dispatch/src/services/dispatchEngine.js`

### 修正箇所（3箇所）
1. **222行目** `rankTeams` → `filterAvailableMembers` に `settings, jobType` を追加
2. **275行目** `rankMultiJobPlans` 内 → 同上
3. **334行目** `evaluateDayAssignment` → `settings` は既に引数にあるので転送

---

## Phase 3: `scoreTeam()` にカレンダースコア追加

**File**: `23_om-dispatch/src/services/dispatchEngine.js` (96-184行目)

### 重み配分変更
```
Before: manpower 40% / qualified 20% / vehicle 15% / teamSize 15% / stretch 10%
After:  manpower 35% / qualified 15% / vehicle 15% / teamSize 10% / calendar 15% / stretch 10%
```

### 追加ロジック
```javascript
// Calendar fit score (0-10)
const avgCalendarFit = team.reduce((sum, m) => sum + (m.calendarFit ?? 1.0), 0) / team.length;
const calendarScore = avgCalendarFit * 10;
```

### breakdown に `calendar` 追加
```javascript
breakdown: { manpower, qualified, vehicle, teamSize, calendar, stretch }
```

---

## Phase 4: `rankTeams()` 返り値に除外メンバー情報追加

**File**: `23_om-dispatch/src/services/dispatchEngine.js` (219-234行目)

### 方針: 返り値の型を変えずに、各結果に`meta`情報を付加
- `rankTeams` は配列を返すまま（breaking change回避）
- 配列の先頭要素に `_meta` プロパティを付加: `{ excludedMembers, availableCount }`
- これにより既存の `.map()` 処理はそのまま動作

```javascript
const result = scoredTeams.slice(0, 5).map((t, i) => ({ ...t, rank: i + 1 }));
// Attach meta info to result array
result._meta = {
  excludedMembers: members.filter(m => !availableMembers.some(am => am.id === m.id)),
  availableCount: availableMembers.length,
  totalCount: members.length,
};
return result;
```

---

## Phase 5: `useDispatchEngine.js` の修正

**File**: `23_om-dispatch/src/hooks/useDispatchEngine.js`

### 修正内容
1. **excludedMembers** state追加 + `rankTeams()._meta` から取得してセット
2. **dependency配列**: `runMultiJobDispatch` (207行目) に `calendarEvents` 追加
3. **AI差配パス** (56行目): `calendarEvents` を `aiDispatch()` に渡す
4. `excludedMembers` を返り値に追加

---

## Phase 6: AI差配へのカレンダー情報伝達

**File**: `23_om-dispatch/src/services/claudeService.js`
**File**: `23_om-dispatch/src/hooks/useClaudeApi.js`

### claudeService.js
- `aiDispatchTeams` シグネチャに `calendarEvents` 追加
- `findAvailableSlots` インポート
- AIプロンプトのメンバー情報に空き状況テキスト追加:
  - 終日予定あり → `「終日予定あり（利用不可）」`
  - 一部空き → `「空き5.5h（10:00-12:00, 13:00-18:00）」`
- システムプロンプトにカレンダー制約の説明追加

### useClaudeApi.js
- `aiDispatch` 関数に `calendarEvents` パラメータ追加

---

## Phase 7: UI — スコアブレークダウンに「カレンダー」追加

**File**: `23_om-dispatch/src/components/dispatch/RecommendationPanel.jsx`

### 修正内容
- `SCORE_LABELS` に `calendar: 'カレンダー'` 追加
- `grid-cols-5` → `grid-cols-6` に変更（160行目）

---

## Phase 8: UI — 除外メンバー表示

**File**: `23_om-dispatch/src/components/dispatch/DispatchView.jsx`

### 追加UI
差配結果の上にamber色の情報ボックス:
```
⚠ カレンダーにより除外されたメンバー (N名)
[アバター] 廣木 (終日予定あり) [アバター] 和埜 (空き30分のみ)
```

- `useDispatchEngine` から `excludedMembers` を取得
- `excludedMembers.length > 0` の場合のみ表示

---

## 変更ファイル一覧

| # | File | 変更 | Priority |
|---|------|------|---------|
| 1 | `src/services/dispatchEngine.js` | filterAvailableMembers書換 + scoreTeamカレンダースコア + rankTeams meta | **必須** |
| 2 | `src/hooks/useDispatchEngine.js` | excludedMembers + dependency修正 + AI呼出修正 | **必須** |
| 3 | `src/services/claudeService.js` | AI差配プロンプトにカレンダー情報追加 | 重要 |
| 4 | `src/hooks/useClaudeApi.js` | calendarEventsパラメータ追加 | 重要 |
| 5 | `src/components/dispatch/RecommendationPanel.jsx` | SCORE_LABELS + grid-cols | 小 |
| 6 | `src/components/dispatch/DispatchView.jsx` | 除外メンバーUI | 中 |

### 変更しないファイル
- `src/services/calendarService.js` — 既存関数をそのまま再利用
- `src/context/CalendarContext.jsx` — 変更不要
- `src/data/` — 変更不要
- `src/components/dispatch/MultiJobPlanPanel.jsx` — breakdownの動的走査で自動対応

---

## 検証手順

1. `npm run build` — ビルドエラーなし確認
2. preview_start → デスクトップサイズ
3. カレンダービュー → 特定メンバーの3/10の予定を目視確認
4. ディスパッチビュー → 3/10希望の案件を選択 → 差配実行
5. 確認ポイント:
   - 終日予定のメンバーが除外UIに表示される
   - カレンダースコアがbreakdownに表示される
   - 空きの多いチームが上位にランクされる
6. 複数案件差配 → マルチデイプランでも日ごとのカレンダーが考慮される

---

## Agent Teams 構成（実装時）

| Agent | 担当 | Files |
|-------|------|-------|
| Agent 1 | Phase 1-4: エンジン層 | dispatchEngine.js |
| Agent 2 | Phase 5-6: Hook/AI層 | useDispatchEngine.js, claudeService.js, useClaudeApi.js |
| Agent 3 | Phase 7-8: UI層 | RecommendationPanel.jsx, DispatchView.jsx |

3エージェント並列実行。Agent 1完了後にAgent 2/3が依存する部分があるが、型定義（enriched memberの`calendarFit`プロパティ等）は事前に共有可能。
