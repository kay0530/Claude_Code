"""設定管理モジュール"""

import json
import os
from pathlib import Path
from typing import Any


def get_config_dir() -> Path:
    """設定ディレクトリのパスを取得する。"""
    if os.name == "nt":
        base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
    else:
        base = Path.home() / ".config"
    config_dir = base / "claude-cowork"
    config_dir.mkdir(parents=True, exist_ok=True)
    return config_dir


def get_workspace_dir() -> Path:
    """デフォルトのワークスペースディレクトリを取得する。"""
    workspace = Path.home() / "ClaudeCowork"
    workspace.mkdir(parents=True, exist_ok=True)
    return workspace


CONFIG_PATH = get_config_dir() / "config.json"

DEFAULT_CONFIG = {
    "api_key": "",
    "model": "claude-sonnet-4-20250514",
    "language": "ja",
    "theme": "dark",
    "workspace_dir": str(get_workspace_dir()),
    "font_size": 13,
    "max_tokens": 4096,
    "window_width": 1280,
    "window_height": 800,
}


class Config:
    """アプリケーション設定の管理クラス。"""

    def __init__(self) -> None:
        self._data: dict[str, Any] = dict(DEFAULT_CONFIG)
        self.load()

    def load(self) -> None:
        """設定ファイルから読み込む。"""
        if CONFIG_PATH.exists():
            try:
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                self._data.update(saved)
            except (json.JSONDecodeError, OSError):
                pass

    def save(self) -> None:
        """設定ファイルに保存する。"""
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(self._data, f, indent=2, ensure_ascii=False)

    def get(self, key: str) -> Any:
        return self._data.get(key, DEFAULT_CONFIG.get(key))

    def set(self, key: str, value: Any) -> None:
        self._data[key] = value

    @property
    def api_key(self) -> str:
        return self.get("api_key")

    @api_key.setter
    def api_key(self, value: str) -> None:
        self.set("api_key", value)

    @property
    def model(self) -> str:
        return self.get("model")

    @property
    def workspace_dir(self) -> str:
        return self.get("workspace_dir")

    @property
    def theme(self) -> str:
        return self.get("theme")

    @property
    def font_size(self) -> int:
        return self.get("font_size")

    @property
    def max_tokens(self) -> int:
        return self.get("max_tokens")
