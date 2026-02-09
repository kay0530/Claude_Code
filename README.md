# Claude Cowork - 非エンジニア向けAIコーディングアシスタント

プログラミングの知識がなくても、日本語で指示するだけでコードを生成・編集・実行できるデスクトップアプリケーションです。Windows / macOS / Linux で動作します。

## 特徴

- **チャット形式のインターフェース** - 日本語で「こんなものを作りたい」と伝えるだけ
- **コードの自動生成** - Claude AIが最適なコードを提案
- **ワンクリック実行** - Python・HTMLコードをすぐに実行・プレビュー
- **ファイル管理** - 保存・読み込み・ワークスペース管理
- **Windows対応** - ダブルクリックで起動、EXEビルドも可能
- **ダーク/ライトテーマ** - 目に優しいUI
- **Claude Desktop 連携** - MCP サーバーとしてClaude Desktopアプリから直接利用可能

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

## Claude Desktop 連携（おすすめ）

Claude Desktop アプリをお持ちの方は、MCP サーバーとして連携できます。
**APIキーの設定は不要**で、Claude Desktop のチャットから直接コーディング機能が使えます。

### ワンクリック セットアップ（Windows）

1. `install_mcp.bat` をダブルクリック
2. Claude Desktop を再起動
3. Claude Desktop のチャットで「ワークスペースの情報を見せて」と入力

これだけで完了です！

### 手動セットアップ

Claude Desktop の設定ファイルを編集します。

**設定ファイルの場所:**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

以下を追加してください（パスはご自身の環境に合わせて変更）:

```json
{
  "mcpServers": {
    "claude-cowork": {
      "command": "C:\\Users\\ユーザー名\\Claude_Code\\.venv\\Scripts\\python.exe",
      "args": ["C:\\Users\\ユーザー名\\Claude_Code\\claude_cowork\\mcp_server.py"]
    }
  }
}
```

### Claude Desktop で使えるツール

| ツール | 説明 |
|---|---|
| `get_workspace_info` | ワークスペースの情報と使い方を表示 |
| `list_files` | ファイル一覧を表示 |
| `create_file` | 新しいファイルを作成 |
| `read_file` | ファイルを読み込む |
| `edit_file` | ファイルを編集 |
| `delete_file` | ファイルを削除 |
| `run_python` | Pythonコードを実行 |
| `run_python_file` | Pythonファイルを実行 |
| `open_in_browser` | HTMLをブラウザで開く |
| `create_project` | プロジェクトテンプレートから作成 |

### 使い方の例

Claude Desktop のチャットで日本語で話しかけるだけです:

- 「HTMLで自己紹介ページを作って」
- 「Pythonで BMI計算プログラムを作って、実行して」
- 「Flaskプロジェクトを作成して」
- 「ファイル一覧を見せて」
- 「index.html をブラウザで開いて」

作成されたファイルは `~/ClaudeCowork/` フォルダに保存されます。

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
│   ├── config.py          # 設定管理
│   └── mcp_server.py      # MCP サーバー（Claude Desktop連携）
├── tests/                  # テスト
├── run.bat                # Windows起動スクリプト
├── setup.bat              # Windowsセットアップ
├── build.bat              # EXEビルドスクリプト
├── install_mcp.bat        # Claude Desktop連携セットアップ
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
