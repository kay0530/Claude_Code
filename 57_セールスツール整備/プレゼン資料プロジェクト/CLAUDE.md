# 提案資料ジェネレーター - プロジェクト状況

## プロジェクト概要
PPA/EPC太陽光発電提案書のStreamlit + python-pptx自動生成ツール。
Salesforce連携、機器マスタ参照、補助金自動計算、PPA単価自動試算機能を搭載。
Excelスライドシート(PP0-PP13, EP0-EP8)が出力するPDF提案書を忠実に再現することが目標。

## Tech Stack
- Python 3.14 / Streamlit 1.52
- python-pptx (PPTX生成)
- Salesforce CLI (`sf`) for data access
- openpyxl (Excel読み取り — 契約電力マスタ等)
- requests (Box REST API連携)

## 実行方法
```bash
cd プレゼン資料プロジェクト
streamlit run proposal_generator/app.py --server.port 8510
```

## ディレクトリ構成
```
プレゼン資料プロジェクト/
├── proposal_generator/
│   ├── app.py                    # Streamlit メインアプリ (~1500行)
│   ├── generator.py              # PPTX生成エンジン (ダイナミックインポート)
│   ├── utils.py                  # 共通ユーティリティ (A4横, グラデーション, 色定数)
│   ├── subsidy_calc.py           # 補助金自動計算エンジン (7プログラム)
│   ├── ppa_calc.py               # PPA単価自動試算エンジン (DSCR≥1.30)
│   ├── box_client.py             # Box REST API連携 (商談フォルダ検索・アップロード)
│   ├── composition_profiles.yaml # ペルソナ別スライド構成 (PPA x5 + EPC x4)
│   ├── logo.png                  # altenergyロゴ
│   ├── saved_cases/              # 案件JSON保存先
│   ├── slides/
│   │   ├── ppa/                  # PP0-PP13 + PP4A,PP5A,PP6A,PP8A (18枚)
│   │   ├── epc/                  # EP0-EP8 (9枚)
│   │   └── new/                  # NEW_* (7枚)
│   └── excel_runner.py           # Excel連携 (未実装)
├── ＰＬ_補ありなしPPAEPC_260317_XXXX様_v3.3.1.xlsm
└── セールスツールテンプレート（白抜き）.pptx
```

## Session 24 (2026-03-29) 実装内容

### 1. 試算結果のPPTX反映
- `ppa_calc_result`の全キー(annual_om_cost, min_ppa_price, cashflow_table等)をcustomer_dataに接続
- 「現在の年間電気代」入力 → 契約電力マスタベース(12電力会社184契約)のカスケード選択に進化
- `annual_saving` = 現在の電気代 - PPA電気代 → PP7/PP8/new_summaryに自動反映
- `investment_recovery_yr` = 販売価格 / annual_saving（簡易回収年数）

### 2. Box連携
- `box_client.py`新規作成: Box REST API (requests) でフォルダ検索・アップロード・ダウンロード
- Tab 1: Boxフォルダ検索→ファイル一覧→JSON読込→JSON保存
- Tab 4: PPTX生成後にBoxアップロードボタン
- Box商談フォルダ構造: `Salesforce Altenergy Sync / 案件進捗 / {商談名} / 03_提案資料`
- `box_config.json`にaccess_tokenを設定すると有効化

### 3. スライドPDF実物忠実化（主要作業）
参照PDF: `ＰＬ_補なしPPA_260319_伊藤忠丸紅特殊鋼株式会社（特殊鋼本部）様.pdf` (14p)

#### 書き直したスライド
| スライド | 変更内容 |
|---------|---------|
| **PP0 表紙** | スプリットデザイン（左38%オレンジパネル+右62%白パネル）に完全リライト |
| **PP7 ご利用料金** | PPA単価+4メリット構成。価格ボックスはネイビー(#002060)+ティール(#76C5D8)背景に白文字 |
| **PP8 経済効果試算** | 20年シミュレーション表(1-10年/11-20年の2段組)に完全リライト。試算条件・5KPIカード付き |

#### 新規作成したスライド
| スライド | 内容 |
|---------|------|
| **PP4A** | なぜオルテナジーが選ばれるのか（3つの強みカード） |
| **PP5A** | 効果シミュレーション（セクション区切りページ、ダーク背景） |
| **PP6A** | 事業スキーム（顧客↔オルテナジー↔リース会社のフロー図解） |
| **PP8A** | ご契約条件サマリー（2段組条件テキスト+違約金テーブル） |

#### 標準PPAプロファイル（PDF実物と同じ14ページ構成）
```
PP0→PP1→PP2→PP3→PP4A→PP5A→PP6A→PP5→PP6→PP9→PP7→PP8→PP8A→PP11
```

### 4. デザイン改善
- ヘッダーバー: 単色→**グラデーション**（1オブジェクト、gradFill XML直接生成）
  - 上: #E8490F → 下: #F0935A
  - `p:style`テーマスタイル削除で色の上書き防止
- 色パレット追加: C_NAVY(#002060), C_TEAL(#46AAC5), C_LIGHT_TEAL(#76C5D8), C_LIGHT_CYAN(#CCFFFF), C_RED(#FF0000)
- PP2: ステップボックス内テキスト 黒→白（オレンジ背景での視認性改善）
- 日付フォーマット: `2026-03-28 00:00:00` → `2026年3月28日`
- 年数表示: `20.0年` → `20年`（int化）
- PP6 CO2カード: 非数値テキストの安全ガード
- ソータブルアイテム: 左寄せ・幅55%（custom_style）
- アンカーリンクアイコン・Fullscreenボタン: CSS非表示
- 数値の桁区切り: 小計kW、パネル合計枚数・kW等

### 5. その他UI改善
- 保安管理業務委託費: 自社(¥120,000)/先方負担(¥0)/他社委託(手入力)の3択ラジオ
- 垂直積雪量: m(float) → cm(int)に変更
- sys.path修正: 任意CWDからStreamlit起動可能

## 実装済み機能

### Streamlit UI (app.py ~1500行)
- **Tab 1**: 顧客情報 (SF商談検索、案件保存・読込・JSON DL/UL、Box連携)
- **Tab 2**: 案件詳細
  - PPA/EPC切替ラジオ
  - パネル/PCS/蓄電池: SF機器マスタ連携カスケード選択 (EquipmentMaster__c)
  - 契約条件 + **契約電力マスタベース年間電気代計算**
  - 価格情報 (原価→粗利→販売価格→手数料→実質粗利 自動計算)
  - 補助金 (7プログラム自動試算 + 手動入力)
  - リース情報 (PPA専用: 6社選択)
  - iPals CSVアップロード → 年間KPI自動計算
  - PPA単価自動試算 (DSCR≥1.30, O&M込み, 20年CF表示)
  - O&M費用設定（保守費 + 保安管理業務委託費3択）
  - FF振り返り入力
- **Tab 3**: スライド構成 (ペルソナ選択→チェックボックス→ドラッグ並替)
- **Tab 4**: PPTX生成・ダウンロード + Box直接アップロード

### スライドジェネレーター
| カテゴリ | スライド | 状態 |
|---------|---------|------|
| PPA | PP0-PP13 + PP4A,PP5A,PP6A,PP8A (18枚) | 全実装 |
| EPC | EP0-EP8 (9枚) | 全実装 |
| NEW共通 | NEW_ff, NEW_summary等 (7枚) | 全実装 |

### PDF実物との対応表（PPA 14ページ）
| PDF Page | スライドID | タイトル | 状態 |
|----------|----------|---------|------|
| P1 | PP0 | 表紙 | ✅ リライト済 |
| P2 | PP1 | なぜ今オンサイトPPA | ✅ |
| P3 | PP2 | PPAモデルとは | ✅ 白文字修正済 |
| P4 | PP3 | 導入メリット | ✅ |
| P5 | PP4A | なぜオルテナジー | ✅ 新規 |
| P6 | PP5A | 効果シミュレーション区切り | ✅ 新規 |
| P7 | PP6A | 事業スキーム | ✅ 新規 |
| P8 | PP5 | 設備レイアウト | ✅ |
| P9 | PP6 | 供給電力量・発電シミュレーション | ✅ |
| P10 | PP9 | デマンド削減効果 | ✅ |
| P11 | PP7 | ご利用料金 | ✅ リライト済 |
| P12 | PP8 | 経済効果試算（20年表） | ✅ リライト済 |
| P13 | PP8A | ご契約条件サマリー | ✅ 新規 |
| P14 | PP11 | 導入までの流れ | ✅ |

## 社長・誉世夫さんフィードバック（2026-03-29確認）

### 方向性の合致度: ✅ 合っている
「バイオーダー型プレゼン資料自動生成」のコア機能（顧客データ入力→ページ選択・並替→PPTX自動出力）は社長の構想に合致。既存PDF再現→営業フロー思想の埋め込みの順序も合理的。

### 検討すべき3点
1. **営業フロー思想の反映** — 社長のマインドマップ13ステップ（赤=反対処理、黄=着地点）をペルソナプロファイルに反映する次フェーズ。現在は既存PDF再現フェーズで正しいが、完了後に着手。
2. **緊急性の訴求** — 誉世夫さん指摘「排出権の奪い合い→早期確保」「電力料金動向」等。NEW_urgencyスライドで対応済みだが、コンテンツの充実が必要。
3. **担当者の訴求軸** — 環境・サステナビリティ系 vs 電気代削減系の切り替え。現在のペルソナ（標準PPA/稟議書/経営者/環境重視/比較検討中）でカバーしているが、訴求軸の明確化が次の改善ポイント。

### 見積書読み込み機能（新規要件）
**目的**: 見積書Excelをアップロードすると、パネル・PCS・蓄電池のメーカー・型式・数量・金額を自動抽出
- Tab 2の「📄 見積書から読み込み（準備中）」UIが既にプレースホルダーとして存在
- 見積書フォーマット: `見積_補なしPPAEPC_260318_*.xlsm`（当社標準テンプレート）

#### 見積書セルマッピング（確認済み 2026-03-29）
**「①表紙」シート — 価格情報:**
| セル | 内容 | 例 |
|------|------|-----|
| C16 | 主要機器費サマリー | "主要機器費（PV出力：135.24kW / PCS出力：80kW）" |
| AQ26 | 手数料率 | 0（なしの場合） |
| AQ28 | 販売価格（円） | 20,227,000 |
| AR28 | kWあたり販売価格 | 149,564 |
| AQ29 | 原価（円） | 13,148,783 |
| AR29 | kWあたり原価 | 97,226 |
| AQ30 | 粗利（円） | 7,078,218 |
| AQ31 | 粗利率 | 0.35 (35.0%) |

**「入力①」シート — パネル・PCS情報:**
| セル | 内容 | 例 |
|------|------|-----|
| B29 | パネル1種類目（メーカー・型式・W数含むテキスト） | "太陽電池モジュール DMEGC Solar DM460M10RT-54HSW-LV 460W" |
| F29 | パネル1出力(W) | 460 |
| G29 | パネル1枚数 | 294 |
| B30 | パネル2種類目 | (空ならなし) |
| F30 | パネル2出力(W) | 0 |
| B32 | PCS1種類目 | "パワーコンディショナ Huawei SUN2000-40KTL-NH 三相40kW用" |
| F32 | PCS1台数 | 2 |
| G32 | PCS1メーカー | "Huawei" |
| B33-B36 | PCS2-5種類目 | (空ならなし) |

**「入力②」シート — 蓄電池情報:**
| セル | 内容 | 例 |
|------|------|-----|
| B86 | 蓄電池カテゴリ（住宅用） | "蓄電池（住宅用）" |
| B89 | 蓄電池カテゴリ（産業用） | "蓄電池（産業用）" |
| C89 | 蓄電池型式テキスト | "スマート蓄電システム Huawei LUNA2000-215-2S11 215kWh" |
| E89 | 型式 | "LUNA2000-215-2S11" |
| F89 | メーカー | "Huawei" |
| G89 | 容量(kWh) | 215 |
| I89 | 金額 | 12,000,000 |

**注意: ②内訳書はVSTACK関数で動的表示**
- `②内訳書`シートはVSTACK関数で必要な行だけを表示する構造
- そのため参照セルの行番号が案件ごとに変わる → **②内訳書からの直接パースは不可**
- データ取得元は必ず `入力①`（パネル・PCS）と `入力②`（蓄電池）の固定セルを使用すること
- 価格情報は `①表紙` の固定セル(AQ28-AQ31等)から取得

**実装方針:**
- openpyxlで直接パース（data_only=True）
- **入力①**(B29,F29,G29 / B32,F32,G32) と **入力②**(C89,E89,F89,G89) の固定セルから取得
- B29/B32/C89のテキストからメーカー・型式を正規表現で分離
- SF機器マスタとの照合（型式名部分一致）で確度を上げる
- 抽出結果をsession_stateに反映 → 既存の機器選択UIに自動入力

## 未実装・今後のタスク

### 高優先
- **見積書読み込み機能** — PDF/Excel見積書からパネル・PCS・蓄電池・金額を自動抽出
- **実データでの全スライド目視レビュー** — 実案件データでPPTX生成し、PowerPointで各ページ確認
- **PP6 供給電力量の棒グラフ** — PDF実物には月次棒グラフがある（現在はテーブルのみ）
- **PP9 デマンド削減の折れ線グラフ** — PDF実物には2週間折れ線×2がある（iPalsデータ連携必要）
- **EPC版スライドのPDF忠実化** — PPA版と同様にEPCの9ページも調整

### 中優先
- **営業フロー思想の埋め込み** — マインドマップ13ステップをペルソナプロファイルに反映
- **NEW_urgency充実** — 排出権・電力料金動向・補助金期限等のコンテンツ追加
- Box認証設定 — `box_config.json`にaccess_token設定
- Excel計算エンジン連携 (VBA→JSON出力)
- iPals CSV: 20年シミュレーション表示（現状は初年度のみ）

### 低優先
- PDF出力 (PPTX→PDF変換)
- 案件複製機能
- 複数棟比較の実データ対応

## 設計上の決定事項
- スライドサイズ: A4横 (11.69"x8.27")
- SF MCPコネクタは使用不可 (Callback hookバグ) → sf CLI経由
- `@st.cache_data`はYAMLプロファイルに使わない (ファイル変更が検知されない)
- 機器マスタは`session_state`キャッシュ + リトライ
- `_sf_query`に`CREATE_NO_WINDOW`フラグ必須 (Streamlitプロセスからの実行)
- RGBColor→str変換、テーブル列幅int変換 (python-pptx互換性)
- PPA単価キー: `key="ppa_price_input"` → `st.session_state["ppa_price_input"]`で自動入力
- `annual_saving`算出: `annual_cost - (self_consumption_kwh × ppa_unit_price)` → PP7/PP8/new_summary自動反映
- `investment_recovery_yr`: `selling_price / annual_saving`（簡易回収年数、Excel連携なし時）
- Box連携: `box_client.py`がBox REST APIを`requests`で呼び出し。`box_config.json`にaccess_token必要
- Box商談フォルダ構造: `Salesforce Altenergy Sync / 案件進捗 / {商談名} / 03_提案資料`
- sys.path: app.py冒頭でプロジェクトルートを追加（任意CWDから起動可能）
- 契約電力マスタ: Excelの「契約電力マスタ」シート(12社184契約)を`@st.cache_data`で読込
- 年間電気代計算: 基本料金(円/kW)×契約電力×12 + 加重平均従量単価×年間kWh (夏季4ヶ月/他8ヶ月)
- 保安管理業務委託費: 自社(¥120,000)/先方負担(¥0)/他社委託(手入力)の3択
- 垂直積雪量: cm単位（整数、step=10）
- ヘッダーグラデーション: python-pptx XML直接操作 (`a:gradFill`, `p:style`削除)
- 色パレット: オレンジ(#E8490F)ベース + ネイビー(#002060)/ティール(#76C5D8)をPP7料金ボックスに使用
- スライドID命名: PP4A/PP5A/PP6A/PP8A = 既存番号の間に挿入（generatorのダイナミックインポートが`PP4A→pp4a.py`で解決）

## コミット履歴（Session 24）
| Hash | 内容 |
|------|------|
| `0d4b69b` | feat: PPA calc PPTX integration, Box API client, electricity cost calculator |
| `1a3de18` | feat: rewrite PP7/PP8 slides to match actual PDF proposal format |
| `7ba56e4` | feat: add 4 missing PPA slides (PP4A, PP5A, PP6A, PP8A) |
| `241bff3` | feat: add 標準PPA profile matching actual 14-page PDF layout |
| `835cab4` | style: left-align and compact sortable slide items in Tab 3 |
| `419b241` | fix: align slide design with PDF reference, fix formatting bugs |
| `dd72b54` | fix: gradient header as single shape, orange cover, white text on PP2 |

## 関連プランファイル
- `C:\Users\田中　圭亮\.claude\plans\compiled-coalescing-puffin.md` - 全体実行プラン
- `C:\Users\田中　圭亮\.claude\plans\virtual-herding-anchor.md` - Session 24 実行プラン
