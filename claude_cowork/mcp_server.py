"""Claude Cowork MCP サーバー

Claude Desktop から直接使えるコーディングアシスタント機能を提供する。
ファイル操作、コード実行、プロジェクト作成などのツールを MCP プロトコルで公開する。
"""

from __future__ import annotations

import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from mcp.server.fastmcp import FastMCP

# ---- ワークスペース設定 ----

def _get_workspace() -> Path:
    """デフォルトのワークスペースディレクトリを取得する。"""
    workspace = Path.home() / "ClaudeCowork"
    workspace.mkdir(parents=True, exist_ok=True)
    return workspace


WORKSPACE = _get_workspace()

# ---- MCP サーバー定義 ----

mcp = FastMCP(
    "Claude Cowork",
    instructions="非エンジニア向けコーディングアシスタント。ファイル作成・編集・実行ができます。",
)


# ============================================================
# ツール: ファイル操作
# ============================================================


@mcp.tool()
def list_files(directory: str = "") -> str:
    """ワークスペース内のファイル一覧を表示します。

    Args:
        directory: 表示するサブディレクトリ（空欄でルート）
    """
    target = WORKSPACE / directory
    if not target.exists():
        return f"エラー: ディレクトリが見つかりません: {target}"
    if not target.is_dir():
        return f"エラー: ディレクトリではありません: {target}"

    # ワークスペース外へのアクセスを防止
    try:
        target.resolve().relative_to(WORKSPACE.resolve())
    except ValueError:
        return "エラー: ワークスペース外にはアクセスできません。"

    lines = [f"📁 ワークスペース: {target}\n"]
    entries = sorted(target.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))

    if not entries:
        lines.append("（空のフォルダです）")
        return "\n".join(lines)

    for entry in entries:
        if entry.name.startswith("."):
            continue
        icon = "📁" if entry.is_dir() else _file_icon(entry)
        size = ""
        if entry.is_file():
            size = f" ({_human_size(entry.stat().st_size)})"
        lines.append(f"  {icon} {entry.name}{size}")

    return "\n".join(lines)


@mcp.tool()
def read_file(filename: str) -> str:
    """ワークスペース内のファイルを読み込みます。

    Args:
        filename: ファイル名またはパス（ワークスペース内の相対パス）
    """
    filepath = WORKSPACE / filename
    try:
        filepath.resolve().relative_to(WORKSPACE.resolve())
    except ValueError:
        return "エラー: ワークスペース外のファイルは読めません。"

    if not filepath.exists():
        return f"エラー: ファイルが見つかりません: {filename}"
    if not filepath.is_file():
        return f"エラー: ファイルではありません: {filename}"

    try:
        content = filepath.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            content = filepath.read_text(encoding="cp932")
        except Exception:
            return "エラー: ファイルの文字コードを読み取れませんでした。"

    return f"📄 {filename}\n{'─' * 40}\n{content}"


@mcp.tool()
def create_file(filename: str, content: str) -> str:
    """ワークスペースに新しいファイルを作成します。

    Args:
        filename: 作成するファイル名（例: app.py, index.html）
        content: ファイルの内容
    """
    filepath = WORKSPACE / filename
    try:
        filepath.resolve().relative_to(WORKSPACE.resolve())
    except ValueError:
        return "エラー: ワークスペース外にファイルは作れません。"

    # サブディレクトリが必要なら作成
    filepath.parent.mkdir(parents=True, exist_ok=True)

    if filepath.exists():
        return (
            f"⚠️ ファイルが既に存在します: {filename}\n"
            "上書きする場合は edit_file ツールを使ってください。"
        )

    filepath.write_text(content, encoding="utf-8")
    return f"✅ ファイルを作成しました: {filepath}\n({len(content)} 文字)"


@mcp.tool()
def edit_file(filename: str, content: str) -> str:
    """既存のファイルを上書き更新します。

    Args:
        filename: 編集するファイル名
        content: 新しいファイル内容
    """
    filepath = WORKSPACE / filename
    try:
        filepath.resolve().relative_to(WORKSPACE.resolve())
    except ValueError:
        return "エラー: ワークスペース外のファイルは編集できません。"

    existed = filepath.exists()
    filepath.parent.mkdir(parents=True, exist_ok=True)
    filepath.write_text(content, encoding="utf-8")

    action = "更新" if existed else "作成"
    return f"✅ ファイルを{action}しました: {filepath}\n({len(content)} 文字)"


@mcp.tool()
def delete_file(filename: str) -> str:
    """ワークスペース内のファイルを削除します。

    Args:
        filename: 削除するファイル名
    """
    filepath = WORKSPACE / filename
    try:
        filepath.resolve().relative_to(WORKSPACE.resolve())
    except ValueError:
        return "エラー: ワークスペース外のファイルは削除できません。"

    if not filepath.exists():
        return f"エラー: ファイルが見つかりません: {filename}"

    if filepath.is_dir():
        return "エラー: ディレクトリの削除はサポートしていません。"

    filepath.unlink()
    return f"🗑️ ファイルを削除しました: {filename}"


# ============================================================
# ツール: コード実行
# ============================================================


@mcp.tool()
def run_python(code: str) -> str:
    """Pythonコードを実行して結果を返します。

    Args:
        code: 実行するPythonコード
    """
    try:
        result = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=str(WORKSPACE),
        )
        output_parts = []
        if result.stdout:
            output_parts.append(f"📤 出力:\n{result.stdout}")
        if result.stderr:
            output_parts.append(f"⚠️ エラー出力:\n{result.stderr}")
        if result.returncode == 0:
            output_parts.append("✅ 正常に終了しました。")
        else:
            output_parts.append(f"❌ 終了コード: {result.returncode}")

        return "\n".join(output_parts) if output_parts else "（出力なし）✅ 正常に終了しました。"

    except subprocess.TimeoutExpired:
        return "⏰ タイムアウト: 実行に30秒以上かかりました。無限ループがないか確認してください。"
    except Exception as e:
        return f"❌ 実行エラー: {e}"


@mcp.tool()
def run_python_file(filename: str) -> str:
    """ワークスペース内のPythonファイルを実行します。

    Args:
        filename: 実行する .py ファイル名
    """
    filepath = WORKSPACE / filename
    if not filepath.exists():
        return f"エラー: ファイルが見つかりません: {filename}"
    if filepath.suffix != ".py":
        return "エラー: .py ファイルのみ実行できます。"

    try:
        result = subprocess.run(
            [sys.executable, str(filepath)],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=str(WORKSPACE),
        )
        output_parts = [f"▶ {filename} を実行しました\n"]
        if result.stdout:
            output_parts.append(f"📤 出力:\n{result.stdout}")
        if result.stderr:
            output_parts.append(f"⚠️ エラー出力:\n{result.stderr}")
        if result.returncode == 0:
            output_parts.append("✅ 正常に終了しました。")
        else:
            output_parts.append(f"❌ 終了コード: {result.returncode}")
        return "\n".join(output_parts)

    except subprocess.TimeoutExpired:
        return "⏰ タイムアウト: 実行に30秒以上かかりました。"
    except Exception as e:
        return f"❌ 実行エラー: {e}"


@mcp.tool()
def open_in_browser(filename: str) -> str:
    """HTMLファイルをブラウザで開きます。

    Args:
        filename: 開く .html ファイル名
    """
    filepath = WORKSPACE / filename
    if not filepath.exists():
        return f"エラー: ファイルが見つかりません: {filename}"

    try:
        if os.name == "nt":
            os.startfile(str(filepath))
        elif sys.platform == "darwin":
            subprocess.run(["open", str(filepath)])
        else:
            subprocess.run(["xdg-open", str(filepath)])
        return f"🌐 ブラウザで開きました: {filepath}"
    except Exception as e:
        return f"❌ ブラウザで開けませんでした: {e}"


# ============================================================
# ツール: プロジェクト作成
# ============================================================

PROJECT_TEMPLATES = {
    "html": {
        "description": "シンプルなWebページ",
        "files": {
            "index.html": """\
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{name}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>{name}</h1>
    <p>ここにコンテンツを追加してください。</p>
    <script src="script.js"></script>
</body>
</html>""",
            "style.css": """\
* {{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}}

body {{
    font-family: 'Segoe UI', 'Hiragino Sans', sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f5f5;
    color: #333;
}}

h1 {{
    color: #2c3e50;
    margin-bottom: 16px;
}}""",
            "script.js": """\
// {name} のJavaScript
console.log('{name} が読み込まれました');""",
        },
    },
    "python": {
        "description": "Pythonスクリプトプロジェクト",
        "files": {
            "main.py": """\
# {name}
# 作成日: {date}


def main():
    \"\"\"メイン関数\"\"\"
    print("{name} を実行しました！")


if __name__ == "__main__":
    main()
""",
            "README.md": "# {name}\n\nPythonプロジェクトです。\n\n## 実行方法\n\n```\npython main.py\n```\n",
        },
    },
    "flask": {
        "description": "Flask Webアプリケーション",
        "files": {
            "app.py": """\
# {name} - Flask Webアプリケーション
from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html", title="{name}")


if __name__ == "__main__":
    app.run(debug=True)
""",
            "templates/index.html": """\
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>{{{{ title }}}}</title>
</head>
<body>
    <h1>{{{{ title }}}}</h1>
    <p>Flask Webアプリケーションが動作しています！</p>
</body>
</html>""",
            "requirements.txt": "flask\n",
        },
    },
}


@mcp.tool()
def create_project(name: str, template: str = "html") -> str:
    """プロジェクトのひな形を作成します。

    Args:
        name: プロジェクト名（フォルダ名になります）
        template: テンプレートの種類（html / python / flask）
    """
    if template not in PROJECT_TEMPLATES:
        available = ", ".join(PROJECT_TEMPLATES.keys())
        return f"エラー: テンプレート '{template}' は存在しません。\n使用可能: {available}"

    project_dir = WORKSPACE / name
    if project_dir.exists():
        return f"⚠️ フォルダが既に存在します: {name}"

    tmpl = PROJECT_TEMPLATES[template]
    project_dir.mkdir(parents=True)

    created = []
    for file_path, content in tmpl["files"].items():
        full_path = project_dir / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        formatted = content.format(name=name, date=datetime.now().strftime("%Y-%m-%d"))
        full_path.write_text(formatted, encoding="utf-8")
        created.append(f"  📄 {file_path}")

    return (
        f"✅ プロジェクトを作成しました: {project_dir}\n"
        f"テンプレート: {tmpl['description']}\n\n"
        f"作成されたファイル:\n" + "\n".join(created)
    )


@mcp.tool()
def get_workspace_info() -> str:
    """ワークスペースの情報と使い方を表示します。"""
    file_count = sum(1 for _ in WORKSPACE.rglob("*") if _.is_file())
    dir_count = sum(1 for _ in WORKSPACE.rglob("*") if _.is_dir())

    templates = "\n".join(
        f"  - {k}: {v['description']}" for k, v in PROJECT_TEMPLATES.items()
    )

    return (
        f"📁 ワークスペース: {WORKSPACE}\n"
        f"   ファイル数: {file_count}  フォルダ数: {dir_count}\n\n"
        f"【使えるツール】\n"
        f"  - list_files: ファイル一覧を見る\n"
        f"  - create_file: ファイルを新規作成\n"
        f"  - read_file: ファイルを読む\n"
        f"  - edit_file: ファイルを編集\n"
        f"  - delete_file: ファイルを削除\n"
        f"  - run_python: Pythonコードを実行\n"
        f"  - run_python_file: Pythonファイルを実行\n"
        f"  - open_in_browser: HTMLをブラウザで開く\n"
        f"  - create_project: プロジェクトを作成\n\n"
        f"【プロジェクトテンプレート】\n{templates}\n\n"
        f"使い方: 日本語で「こういうアプリを作って」と伝えてください！"
    )


# ---- ユーティリティ ----


def _file_icon(path: Path) -> str:
    icons = {
        ".py": "🐍", ".html": "🌐", ".htm": "🌐", ".css": "🎨",
        ".js": "📜", ".json": "📋", ".txt": "📄", ".md": "📝",
        ".csv": "📊", ".bat": "⚙️", ".ps1": "⚙️",
    }
    return icons.get(path.suffix.lower(), "📄")


def _human_size(size: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.0f}{unit}" if unit == "B" else f"{size:.1f}{unit}"
        size /= 1024
    return f"{size:.1f}TB"


# ---- エントリーポイント ----

def main():
    """MCPサーバーを起動する。"""
    mcp.run()


if __name__ == "__main__":
    main()
