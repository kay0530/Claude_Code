# Claude Cowork - 非エンジニア向けAIコーディングアシスタント

プログラミングの知識がなくても、日本語で指示するだけでコードを生成・編集・実行できるデスクトップアプリケーションです。Windows / macOS / Linux で動作します。

## 特徴

- **チャット形式のインターフェース** - 日本語で「こんなものを作りたい」と伝えるだけ
- **コードの自動生成** - Claude AIが最適なコードを提案
- **ワンクリック実行** - Python・HTMLコードをすぐに実行・プレビュー
- **ファイル管理** - 保存・読み込み・ワークスペース管理
- **Windows対応** - ダブルクリックで起動、EXEビルドも可能
- **ダーク/ライトテーマ** - 目に優しいUI

## クイックスタート（Windows）

### 必要なもの

1. **Python 3.10以上** - [ダウンロード](https://www.python.org/downloads/)
   - インストール時に **「Add Python to PATH」にチェック** を入れてください
2. **Anthropic APIキー** - [取得](https://console.anthropic.com/)

### セットアップ

1. このリポジトリをダウンロードまたはクローン
2. `setup.bat` をダブルクリック（初回のみ）
3. `run.bat` をダブルクリックで起動

```
git clone <このリポジトリのURL>
cd Claude_Code
setup.bat
run.bat
```

### EXEファイルとして配布

Python不要の単体実行ファイルを作成できます。

```
build.bat
```

生成された `dist/ClaudeCowork.exe` を配布してください。

## macOS / Linux

```bash
git clone <このリポジトリのURL>
cd Claude_Code
chmod +x run.sh
./run.sh
```

## 使い方

### 1. APIキーの設定

初回起動時に設定画面が開きます。Anthropicの[コンソール](https://console.anthropic.com/)から取得したAPIキーを入力してください。

### 2. チャットでコード生成

左側のチャット欄に日本語で作りたいものを入力します。

**入力例:**
- 「簡単なTodoリストアプリを作って」
- 「HTMLで自己紹介ページを作りたい」
- 「Pythonで数当てゲームを作りたい」
- 「このエラーの意味を教えて：（エラーメッセージ）」

### 3. コードの確認と保存

- 生成されたコードは右側のエディターに自動表示されます
- 「保存」ボタンでファイルとして保存できます
- ファイル名と保存先を自由に選べます

### 4. コードの実行

- **Pythonコード**: 「実行」ボタンで即座に実行、結果が下部に表示
- **HTMLファイル**: 「実行」ボタンでブラウザが開きプレビュー表示

### 5. 修正・改善

チャットで追加の指示を出せます。
- 「背景色を青に変えて」
- 「もっとシンプルにして」
- 「エラーが出たので直して：（エラーメッセージ）」

## プロジェクト構成

```
Claude_Code/
├── claude_cowork/          # メインパッケージ
│   ├── __init__.py
│   ├── main.py            # エントリーポイント
│   ├── app.py             # メインウィンドウ
│   ├── api_client.py      # Claude API通信
│   ├── chat_view.py       # チャットUI
│   ├── editor_view.py     # コードエディター
│   ├── file_browser.py    # ファイルブラウザ
│   ├── settings_view.py   # 設定画面
│   └── config.py          # 設定管理
├── tests/                  # テスト
├── run.bat                # Windows起動スクリプト
├── setup.bat              # Windowsセットアップ
├── build.bat              # EXEビルドスクリプト
├── run.sh                 # macOS/Linux起動スクリプト
├── requirements.txt       # 依存パッケージ
└── pyproject.toml         # プロジェクト設定
```

## 設定

設定は以下の場所に保存されます:

- **Windows**: `%APPDATA%\claude-cowork\config.json`
- **macOS/Linux**: `~/.config/claude-cowork/config.json`

## ライセンス

MIT License
