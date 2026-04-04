# セールスツール整備プロジェクト

## 概要
髙橋社長指示の「キーエンス方式セールスシート」整備。A4縦・表裏2ページの印刷向けセールスシートを各テーマ別に作成する。

## 計画書
- 原本: `C:\Users\田中　圭亮\Desktop\sales_tool_plan_v3.md`
- テーマ一覧Excel: `セールスツール_テーマ一覧.xlsx`（S01〜S28、テーマ確定済み）

## デザイン仕様（確定）

| 項目 | 値 |
|------|-----|
| サイズ | A4縦 (210x297mm) |
| ページ数 | 2（表面=概要、裏面=仕様・契約） |
| アクセント色 | **#E8490F** (DIC160 オレンジ) |
| 背景 | #FFFFFF（白・印刷向け） |
| カード背景 | #333333 |
| チャート背景 | #444444 |
| テキスト | #333333（メイン）/ #666666（サブ） |
| フォント | **Noto Sans JP Black**（タイトル・番号）/ **Noto Sans JP** Bold/Regular（本文） |
| ロゴ | `Box\001_altenergy\080_広報\ロゴ\ロゴ(調整済)\LOGO_透過_社名なし.png` |

**重要**: Meiryoは不採用（力強さが不足するため）。フォントサイズのジャンプ率を大きく取ること。

## タスク2: PPA/EPC提案書ジェネレーター（メイン進行中）

### デプロイ情報
- **Streamlit Cloud**: https://solar-proposal-generator.streamlit.app
- **GitHub**: https://github.com/kay0530/solar-proposal-generator (Public)
- **ローカルリポジトリ**: `57_セールスツール整備/solar-proposal-generator/`
- **開発元**: `57_セールスツール整備/プレゼン資料プロジェクト/proposal_generator/`
- **Python**: 3.12 (`.python-version` で固定、3.14はStreamlit非対応)
- **ローカル起動**: `cd プレゼン資料プロジェクト && streamlit run proposal_generator/app.py --server.port 8510`

### Streamlit Cloud 設定
- `.streamlit/config.toml`: port指定なし（Cloud は8501固定）、`base = "dark"`
- `st.secrets`:
  ```toml
  [salesforce]
  instance_url = "https://altenergyinc.my.salesforce.com"
  refresh_token = "（sf org login web で取得、期限切れ時は再取得）"
  client_id = "PlatformCLI"
  ```
- SF認証: CloudGate SSO環境のため refresh token 方式（username/password不可）
- `sf_client.py`: Cloud → simple-salesforce API、ローカル → sf CLI フォールバック

### Session 26 実装完了（2026-04-03〜04）

#### Streamlit Cloud デプロイ
- GitHub リポジトリ `kay0530/solar-proposal-generator` 作成・プッシュ
- Streamlit Community Cloud デプロイ完了
- ポート問題解決（config.toml の port=8502 削除）
- Python 3.14 → 3.12 固定（`.python-version`）
- ダークテーマ強制（`base = "dark"`）

#### Salesforce Cloud連携
- `sf_client.py`: simple-salesforce + OAuth2 refresh token 認証
- CloudGate SSO 環境対応（username/password認証不可のため）
- 商談検索・機器マスタ取得がCloud上で動作確認済み

#### バグ修正
- PCS出力 4.95kW → 4.00kW: 正規表現 `(\d+)` → `([\d.]+)` で小数対応
- 蓄電池数量: session key修正 `bat_types` → `battery_types`
- 蓄電池容量: G列 "15kWh" 文字列 → 正規表現で数値抽出
- 蓄電池販売価格: Q列（17列目）から自動取得
- SF Output__c: `_parse_sf_output()` で文字列/数値両対応
- 自家消費量計算: `min(発電量, 需要量)` を毎時計算（Excel一致）
- 保存・読込: セッションステートの選択的復元（アップロードデータを保持）

#### 新機能
- **自家消費補正係数**: デフォルト5%、0-20%調整可能
- **PPA単価手動調整**: 自動計算結果の横に手動入力+適用ボタン
- **方位角**: 0-355° 5度刻み（デフォルト180°=南）、レイアウトスライドに回転方位計表示
- **企業規模キャプション**: 補助金種類に連動（東京都→需要家、環境省→PPA事業者=中小企業）
- **Box連携**: `st.secrets` フォールバック対応
- **Tab2 セクション順序変更**: 蓄電池→価格→補助金→レイアウト→iPals→契約→リース→PPA→FIP→FF→概算

#### 環境省補助金ロジック修正
- PPA: PV 5万/kW、EPC: PV 4万/kW
- 蓄電池: 4.5万/kWh（産業用>20kWh: 4万/kWh）
- 蓄電池キャップ: min(計算額, 販売価格×1/3)（1000円未満切捨て）
- 上限: PV 2000万 + ESS 1000万 = 合計3000万

### 未実装タスク（次セッション）

#### PPA費用項目の追加（優先度: 高）
O&M費用設定に以下を追加する（Excelの費用テーブル参照）：
- **償却資産税** — 銀行借入の場合のみ（既存 `calc_depreciation_tax_schedule` あり）
- **火災保険料** — 銀行借入の場合のみ（既存 `calc_fire_insurance_annual` あり）
- **修繕積立費用** — 設備販売価格 × 10%（デフォルト）をPPA期間で按分。％は任意設定可能
- **撤去費用積立** — 設備販売価格 × 4%（デフォルト）をPPA期間で按分。％は任意設定可能
- **発電側課金（kW課金）** — 余剰売電する場合のみ。単価 円/kW
- **発電側課金（kWh課金）** — 余剰売電する場合のみ。単価 円/kWh
→ これらを `calc_cashflow_table()` の費用に組み込む

#### チームフィードバック残件
- 蓄電池ありの余剰電力ロジック変更（前田さん確認待ち）
- FIP併用イレギュラー案件の柔軟対応

#### その他
- PP/EP variants（都外/ESS/カーポート/余剰/パワまる）
- PDF出力
- 事例スライド複製
- 積雪量→日射量補正（METPV-20）

## タスク1: セールスシート（Genspark方式）

### 現在の進捗
- S07 ちくまる v6完成（Visualレビュー待ち）
- S03, S09, S18 初版あり（リデザイン待ち）

### Genspark運用フロー
```
1. Claude Codeで元資料を読み込み → テーマ固有コンテンツ.md を生成
2. Gensparkに以下3点を投入:
   ├── sales_sheet_design_guide.md（共通）
   ├── S__○○○_content.md（テーマ固有）
   └── ロゴPNG
3. Genspark → PPTX生成
4. チェックリスト確認
```

## 設計上の決定事項

1. **Genspark + 2ファイル方式**（v7〜）— デザイン実行はGensparkに委託
2. **DIC160 (#E8490F)** を採用
3. **URL**: https://altenergy.co.jp/
4. **画像アスペクト比**: 絶対に変更しない（contain方式）
5. **補助金 企業規模**: 東京都=需要家規模、環境省等=PPA事業者（中小企業）規模（2026-04-03確認）
6. **SF認証**: CloudGate SSO → refresh token方式（期限切れ時は `sf org login web` で再取得）
