"""Config モジュールのテスト"""

import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from claude_cowork.config import Config, DEFAULT_CONFIG


def test_default_config_values():
    """デフォルト設定値が正しいことを確認する。"""
    with tempfile.TemporaryDirectory() as tmpdir:
        config_path = Path(tmpdir) / "config.json"
        with patch("claude_cowork.config.CONFIG_PATH", config_path):
            cfg = Config()
            assert cfg.api_key == ""
            assert cfg.model == "claude-sonnet-4-20250514"
            assert cfg.font_size == 13
            assert cfg.max_tokens == 4096
            assert cfg.theme == "dark"


def test_save_and_load():
    """設定の保存と読み込みが正しく動作することを確認する。"""
    with tempfile.TemporaryDirectory() as tmpdir:
        config_path = Path(tmpdir) / "config.json"
        with patch("claude_cowork.config.CONFIG_PATH", config_path):
            cfg = Config()
            cfg.api_key = "test-key-123"
            cfg.set("font_size", 16)
            cfg.save()

            # ファイルが作成されていることを確認
            assert config_path.exists()
            saved = json.loads(config_path.read_text())
            assert saved["api_key"] == "test-key-123"
            assert saved["font_size"] == 16

            # 新しいインスタンスで読み込めることを確認
            cfg2 = Config()
            assert cfg2.api_key == "test-key-123"
            assert cfg2.font_size == 16


def test_get_set():
    """get/setが正しく動作することを確認する。"""
    with tempfile.TemporaryDirectory() as tmpdir:
        config_path = Path(tmpdir) / "config.json"
        with patch("claude_cowork.config.CONFIG_PATH", config_path):
            cfg = Config()
            cfg.set("custom_key", "custom_value")
            assert cfg.get("custom_key") == "custom_value"
            assert cfg.get("nonexistent") is None
