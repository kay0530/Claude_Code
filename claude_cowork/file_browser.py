"""ファイルブラウザ（サイドバー）"""

from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING

import customtkinter as ctk

if TYPE_CHECKING:
    from claude_cowork.app import App


class FileBrowser(ctk.CTkFrame):
    """ワークスペースのファイル一覧を表示するサイドバー。"""

    def __init__(self, master: ctk.CTkFrame, app: App) -> None:
        super().__init__(master, width=220, fg_color=("gray92", "gray14"))
        self.app = app
        self.pack_propagate(False)
        self._build_ui()
        self.refresh()

    def _build_ui(self) -> None:
        # ヘッダー
        header = ctk.CTkFrame(self, height=48, fg_color=("gray88", "gray17"))
        header.pack(fill="x")
        header.pack_propagate(False)

        ctk.CTkLabel(
            header,
            text="📁 ファイル",
            font=ctk.CTkFont(size=14, weight="bold"),
        ).pack(side="left", padx=12)

        ctk.CTkButton(
            header, text="↻", width=30, height=28, command=self.refresh
        ).pack(side="right", padx=8)

        # ファイル一覧
        self._file_list = ctk.CTkScrollableFrame(
            self, fg_color="transparent"
        )
        self._file_list.pack(fill="both", expand=True, padx=4, pady=4)

    def refresh(self) -> None:
        """ファイル一覧を更新する。"""
        for widget in self._file_list.winfo_children():
            widget.destroy()

        workspace = Path(self.app.config.workspace_dir)
        if not workspace.exists():
            ctk.CTkLabel(
                self._file_list,
                text="フォルダが見つかりません",
                font=ctk.CTkFont(size=11),
                text_color=("gray50", "gray60"),
            ).pack(pady=8)
            return

        try:
            entries = sorted(workspace.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
        except PermissionError:
            ctk.CTkLabel(
                self._file_list,
                text="アクセス権限がありません",
                font=ctk.CTkFont(size=11),
                text_color=("gray50", "gray60"),
            ).pack(pady=8)
            return

        if not entries:
            ctk.CTkLabel(
                self._file_list,
                text="（空のフォルダ）",
                font=ctk.CTkFont(size=11),
                text_color=("gray50", "gray60"),
            ).pack(pady=8)
            return

        for entry in entries:
            # 隠しファイルをスキップ
            if entry.name.startswith(".") or entry.name.startswith("_"):
                continue
            icon = "📁" if entry.is_dir() else self._get_file_icon(entry)
            btn = ctk.CTkButton(
                self._file_list,
                text=f" {icon} {entry.name}",
                anchor="w",
                fg_color="transparent",
                text_color=("gray20", "gray80"),
                hover_color=("gray80", "gray25"),
                height=28,
                font=ctk.CTkFont(size=12),
                command=lambda p=entry: self._on_click(p),
            )
            btn.pack(fill="x", pady=1)

    def _get_file_icon(self, path: Path) -> str:
        """ファイル拡張子に応じたアイコンを返す。"""
        ext = path.suffix.lower()
        icons = {
            ".py": "🐍",
            ".html": "🌐",
            ".htm": "🌐",
            ".css": "🎨",
            ".js": "📜",
            ".json": "📋",
            ".txt": "📄",
            ".md": "📝",
            ".csv": "📊",
            ".bat": "⚙️",
            ".ps1": "⚙️",
        }
        return icons.get(ext, "📄")

    def _on_click(self, path: Path) -> None:
        """ファイルクリック時の処理。"""
        if path.is_dir():
            # ディレクトリの場合はワークスペースを変更して更新
            return
        if path.is_file() and hasattr(self.app, "editor_view"):
            self.app.editor_view._load_file(path)
