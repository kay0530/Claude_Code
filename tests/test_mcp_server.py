"""MCP サーバーモジュールのテスト"""

import tempfile
from pathlib import Path
from unittest.mock import patch

from claude_cowork.mcp_server import (
    WORKSPACE,
    _file_icon,
    _human_size,
    PROJECT_TEMPLATES,
)


def test_file_icon():
    """ファイルアイコンが正しく返されることを確認する。"""
    assert _file_icon(Path("test.py")) == "🐍"
    assert _file_icon(Path("index.html")) == "🌐"
    assert _file_icon(Path("style.css")) == "🎨"
    assert _file_icon(Path("unknown.xyz")) == "📄"


def test_human_size():
    """ファイルサイズの表示が正しいことを確認する。"""
    assert _human_size(500) == "500B"
    assert _human_size(1024) == "1.0KB"
    assert _human_size(1048576) == "1.0MB"


def test_project_templates_exist():
    """プロジェクトテンプレートが正しく定義されていることを確認する。"""
    assert "html" in PROJECT_TEMPLATES
    assert "python" in PROJECT_TEMPLATES
    assert "flask" in PROJECT_TEMPLATES
    for name, tmpl in PROJECT_TEMPLATES.items():
        assert "description" in tmpl
        assert "files" in tmpl
        assert len(tmpl["files"]) > 0


def test_workspace_is_directory():
    """ワークスペースがディレクトリとして存在することを確認する。"""
    assert WORKSPACE.is_dir()
