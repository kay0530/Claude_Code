# 提案資料ジェネレーター - プロジェクト状況

## プロジェクト概要
PPA/EPC太陽光発電提案書のStreamlit + python-pptx自動生成ツール。
Salesforce連携、機器マスタ参照、補助金自動計算、PPA単価自動試算機能を搭載。

## Tech Stack
- Python 3.14 / Streamlit
- python-pptx (PPTX生成)
- Salesforce CLI (`sf`) for data access
- openpyxl (Excel読み取り)

## 実行方法
```bash
cd プレゼン資料プロジェクト
streamlit run proposal_generator/app.py --server.port 8510
```

## ディレクトリ構成
```
プレゼン資料プロジェクト/
├── proposal_generator/
│   ├── app.py                    # Streamlit メインアプリ (~1100行)
│   ├── generator.py              # PPTX生成エンジン
│   ├── utils.py                  # 共通ユーティリティ (A4横: 11.69"x8.27")
│   ├── subsidy_calc.py           # 補助金自動計算エンジン (7プログラム)
│   ├── ppa_calc.py               # PPA単価自動試算エンジン (DSCR≥1.30)
│   ├── box_client.py             # Box REST API連携 (商談フォルダ検索・アップロード)
│   ├── composition_profiles.yaml # ペルソナ別スライド構成 (PPA x4 + EPC x4)
│   ├── logo.png                  # altenergyロゴ
│   ├── saved_cases/              # 案件JSON保存先
│   ├── slides/
│   │   ├── ppa/                  # PP0-PP13 (14枚) 全実装
│   │   ├── epc/                  # EP0-EP8 (9枚) 全実装
│   │   └── new/                  # NEW_* (7枚) 全実装
│   └── excel_runner.py           # Excel連携 (未実装)
├── ＰＬ_補ありなしPPAEPC_260317_XXXX様_v3.3.1.xlsm
└── セールスツールテンプレート（白抜き）.pptx
```

## 実装済み機能 (全て動作確認済み)

### Streamlit UI (app.py)
- **Tab 1**: 顧客情報 (SF商談検索、案件保存・読込・JSONダウンロード/アップロード、Box連携)
- **Tab 2**: 案件詳細
  - PPA/EPC切替ラジオ
  - パネル/PCS/蓄電池: SF機器マスタ連携カスケード選択 (EquipmentMaster__c, 262件)
  - 契約条件 (EPC時はPPA単価・余剰売電非表示) + 現在の年間電気代入力
  - 価格情報 (原価→粗利→販売価格→手数料→実質粗利 自動計算)
  - 補助金 (7プログラム自動試算 + 手動入力)
  - リース情報 (PPA専用: 6社選択, CE=3.10%/みずほ=5.5%固定)
  - iPals CSVアップロード → 年間KPI自動計算
  - 💹 PPA単価自動試算 (DSCR≥1.30, O&M込み, 20年CF表示, 単価自動適用ボタン)
  - FF振り返り入力
- **Tab 3**: スライド構成 (ペルソナ選択→チェックボックス→ドラッグ並替)
- **Tab 4**: PPTX生成・ダウンロード + Box直接アップロード

### スライドジェネレーター (全30枚)
| カテゴリ | スライド | 状態 |
|---------|---------|------|
| PPA | PP0-PP13 (14枚) | 全実装 |
| EPC | EP0-EP8 (9枚) | 全実装 |
| NEW共通 | NEW_ff, NEW_summary, NEW_competitor, NEW_urgency, NEW_ppa_epc_compare, NEW_building_compare, NEW_env (7枚) | 全実装 |

### PPA単価自動試算エンジン (ppa_calc.py) — Excelと等価実装
- **DSCR = 収入 / (リース料 + O&M費用) ≥ 1.30**（Excelと同じ分母）
- 発電量・自家消費量は年▲0.5%低減（Excelで確認済み）
- O&M費用: 保守費1,200円/kW/年 + 保険120,000円/年（PPAリースシートR50, R62より）
- リース会社別金利（CEシート数式 `IRR(D55:X55)` から等価実装）:
  - シーエナジー: IRR = 3.10%（ギリギリ目標値 = CEシートN61より確認）
  - みずほリース: 5.50%（固定）
  - その他: 手動入力
- 20年間キャッシュフロー表（リース料・O&M・DSCR各年表示）
- 「この単価を適用」ボタン → ppa_price_inputキーに書き込みrerun

### Excelシート構造（解析完了）
| シート | 役割 | 確認済み内容 |
|--------|------|------|
| PPAリース | 20年P&L計算 | 収入/費用/DSCR構造, O&Mコスト |
| CE | シーエナジーIRR計算 | `IRR(D55:X55)`, 目標3.10% |
| 補助金 | 補助金条件 | 実装済み(subsidy_calc.py) |
| PalsDATA | iPals貼付 | 自家消費量/余剰電力 |
| PVTグラフA/B | デマンドカット | 未連携(低優先) |

## 未実装・今後のタスク

### 高優先（次セッション着手）— スライドPDF実物忠実化
参照PDF: `ＰＬ_補なしPPA_260319_伊藤忠丸紅特殊鋼株式会社（特殊鋼本部）様.pdf` (PPA 14p)、同EPC版 (9p)
これらはExcelスライドシート(PP0-PP13, EP0-EP8)の出力。python-pptx実装をこれに忠実に合わせる。

**最重要: 経済効果試算スライド (PPA=Page12, EPC=Page7,9)**
- 現状PP7/PP8はKPIカード+バーチャートだが、PDF実物は20年シミュレーション表
- 構造: (A)供給電力量 × {(B)従量単価-(C)PPA単価} = 従量料金削減 + 基本料金削減
- 1-10年目・11-20年目の2段組テーブル
- 試算条件: 電力会社・契約種別・契約電力（契約電力マスタ連携済み）
- 初期費用/保守/償却資産税のKPIカード

**各スライドのレイアウト調整（PDF実物と比較）**
| PDF実物 | 現在のスライド | 要対応 |
|--------|------------|--------|
| ご利用料金（PPA単価+4メリット） | PP10 | レイアウト比較 |
| 供給電力量（棒グラフ+月次テーブル） | PP6 | グラフ実装確認 |
| デマンド削減（2週間折れ線×2） | PP9 | iPalsデータ連携 |
| 事業スキーム（図解） | PP6相当 | 図解再現 |
| ご契約条件サマリー（違約金表） | PP12 | テーブル確認 |

### 中優先
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

## 関連プランファイル
- `C:\Users\田中　圭亮\.claude\plans\compiled-coalescing-puffin.md` - 全体実行プラン
