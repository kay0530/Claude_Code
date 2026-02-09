"""API Client モジュールのテスト"""

import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from claude_cowork.api_client import APIClient, SYSTEM_PROMPT
from claude_cowork.config import Config


def _make_client() -> APIClient:
    """テスト用のAPIClientを作成する。"""
    with tempfile.TemporaryDirectory() as tmpdir:
        config_path = Path(tmpdir) / "config.json"
        with patch("claude_cowork.config.CONFIG_PATH", config_path):
            cfg = Config()
            return APIClient(cfg)


def test_no_api_key_raises():
    """APIキー未設定時にエラーが発生することを確認する。"""
    client = _make_client()
    with pytest.raises(ValueError, match="APIキーが設定されていません"):
        client._get_client()


def test_clear_conversation():
    """会話履歴のクリアが正しく動作することを確認する。"""
    client = _make_client()
    client._conversation.append({"role": "user", "content": "hello"})
    client._conversation.append({"role": "assistant", "content": "hi"})
    assert len(client._conversation) == 2
    client.clear_conversation()
    assert len(client._conversation) == 0


def test_reset_client():
    """クライアントリセットが正しく動作することを確認する。"""
    client = _make_client()
    client._client = "dummy"
    client.reset_client()
    assert client._client is None


def test_system_prompt_is_japanese():
    """システムプロンプトが日本語を含むことを確認する。"""
    assert "非エンジニア" in SYSTEM_PROMPT
    assert "日本語" in SYSTEM_PROMPT
