"""設定画面"""

from __future__ import annotations

from pathlib import Path
from tkinter import filedialog, messagebox
from typing import TYPE_CHECKING

import customtkinter as ctk

if TYPE_CHECKING:
    from claude_cowork.app import App


class SettingsDialog(ctk.CTkToplevel):
    """設定ダイアログウィンドウ。"""

    def __init__(self, parent: ctk.CTk, app: App) -> None:
        super().__init__(parent)
        self.app = app
        self.title("設定 - Claude Cowork")
        self.geometry("520x500")
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()

        self._build_ui()
        self._load_current_settings()

    def _build_ui(self) -> None:
        main = ctk.CTkScrollableFrame(self, fg_color="transparent")
        main.pack(fill="both", expand=True, padx=20, pady=20)

        # ---- APIキー ----
        self._add_section_label(main, "🔑 API設定")

        ctk.CTkLabel(
            main, text="Anthropic APIキー:", font=ctk.CTkFont(size=13)
        ).pack(anchor="w", pady=(8, 2))

        self._api_key_entry = ctk.CTkEntry(
            main, show="•", placeholder_text="sk-ant-...", width=460, height=36
        )
        self._api_key_entry.pack(anchor="w")

        self._show_key_var = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(
            main,
            text="APIキーを表示する",
            variable=self._show_key_var,
            command=self._toggle_key_visibility,
        ).pack(anchor="w", pady=(4, 0))

        ctk.CTkLabel(
            main,
            text="※ APIキーはローカルの設定ファイルにのみ保存されます",
            font=ctk.CTkFont(size=11),
            text_color=("gray50", "gray60"),
        ).pack(anchor="w", pady=(2, 8))

        # ---- モデル選択 ----
        self._add_section_label(main, "🤖 モデル設定")

        ctk.CTkLabel(
            main, text="使用モデル:", font=ctk.CTkFont(size=13)
        ).pack(anchor="w", pady=(8, 2))

        self._model_var = ctk.StringVar(value="claude-sonnet-4-20250514")
        self._model_menu = ctk.CTkOptionMenu(
            main,
            values=[
                "claude-sonnet-4-20250514",
                "claude-opus-4-20250514",
                "claude-haiku-35-20241022",
            ],
            variable=self._model_var,
            width=300,
        )
        self._model_menu.pack(anchor="w")

        ctk.CTkLabel(
            main, text="最大トークン数:", font=ctk.CTkFont(size=13)
        ).pack(anchor="w", pady=(8, 2))

        self._max_tokens_var = ctk.StringVar(value="4096")
        ctk.CTkEntry(
            main,
            textvariable=self._max_tokens_var,
            width=150,
            height=36,
        ).pack(anchor="w")

        # ---- ワークスペース ----
        self._add_section_label(main, "📁 ワークスペース")

        ctk.CTkLabel(
            main, text="作業フォルダ:", font=ctk.CTkFont(size=13)
        ).pack(anchor="w", pady=(8, 2))

        ws_frame = ctk.CTkFrame(main, fg_color="transparent")
        ws_frame.pack(fill="x", pady=(0, 4))

        self._workspace_entry = ctk.CTkEntry(ws_frame, width=360, height=36)
        self._workspace_entry.pack(side="left")

        ctk.CTkButton(
            ws_frame, text="選択", width=80, height=36, command=self._browse_workspace
        ).pack(side="left", padx=(8, 0))

        # ---- 表示設定 ----
        self._add_section_label(main, "🎨 表示設定")

        ctk.CTkLabel(
            main, text="テーマ:", font=ctk.CTkFont(size=13)
        ).pack(anchor="w", pady=(8, 2))

        self._theme_var = ctk.StringVar(value="dark")
        theme_frame = ctk.CTkFrame(main, fg_color="transparent")
        theme_frame.pack(anchor="w")
        for text, val in [("ダーク", "dark"), ("ライト", "light"), ("システム", "system")]:
            ctk.CTkRadioButton(
                theme_frame, text=text, variable=self._theme_var, value=val
            ).pack(side="left", padx=(0, 16))

        ctk.CTkLabel(
            main, text="フォントサイズ:", font=ctk.CTkFont(size=13)
        ).pack(anchor="w", pady=(8, 2))

        self._font_size_var = ctk.StringVar(value="13")
        ctk.CTkEntry(
            main, textvariable=self._font_size_var, width=80, height=36
        ).pack(anchor="w")

        # ---- 保存・キャンセルボタン ----
        btn_frame = ctk.CTkFrame(main, fg_color="transparent")
        btn_frame.pack(fill="x", pady=(20, 0))

        ctk.CTkButton(
            btn_frame, text="保存", width=120, height=40, command=self._save
        ).pack(side="right", padx=(8, 0))

        ctk.CTkButton(
            btn_frame,
            text="キャンセル",
            width=120,
            height=40,
            fg_color=("gray70", "gray30"),
            command=self.destroy,
        ).pack(side="right")

    def _add_section_label(self, parent: ctk.CTkFrame, text: str) -> None:
        ctk.CTkLabel(
            parent, text=text, font=ctk.CTkFont(size=15, weight="bold")
        ).pack(anchor="w", pady=(16, 0))

    def _load_current_settings(self) -> None:
        """現在の設定を入力フィールドにロードする。"""
        cfg = self.app.config
        if cfg.api_key:
            self._api_key_entry.insert(0, cfg.api_key)
        self._model_var.set(cfg.model)
        self._max_tokens_var.set(str(cfg.max_tokens))
        self._workspace_entry.insert(0, cfg.workspace_dir)
        self._theme_var.set(cfg.theme)
        self._font_size_var.set(str(cfg.font_size))

    def _toggle_key_visibility(self) -> None:
        if self._show_key_var.get():
            self._api_key_entry.configure(show="")
        else:
            self._api_key_entry.configure(show="•")

    def _browse_workspace(self) -> None:
        directory = filedialog.askdirectory(
            title="作業フォルダを選択",
            initialdir=self._workspace_entry.get(),
        )
        if directory:
            self._workspace_entry.delete(0, "end")
            self._workspace_entry.insert(0, directory)

    def _save(self) -> None:
        """設定を保存する。"""
        cfg = self.app.config

        # バリデーション
        try:
            max_tokens = int(self._max_tokens_var.get())
            if max_tokens < 100 or max_tokens > 32000:
                raise ValueError
        except ValueError:
            messagebox.showerror("エラー", "最大トークン数は100〜32000の整数で入力してください。")
            return

        try:
            font_size = int(self._font_size_var.get())
            if font_size < 8 or font_size > 30:
                raise ValueError
        except ValueError:
            messagebox.showerror("エラー", "フォントサイズは8〜30の整数で入力してください。")
            return

        workspace = self._workspace_entry.get()
        if workspace:
            Path(workspace).mkdir(parents=True, exist_ok=True)

        # 設定を更新
        new_key = self._api_key_entry.get().strip()
        old_key = cfg.api_key
        cfg.api_key = new_key
        cfg.set("model", self._model_var.get())
        cfg.set("max_tokens", max_tokens)
        cfg.set("workspace_dir", workspace)
        cfg.set("theme", self._theme_var.get())
        cfg.set("font_size", font_size)
        cfg.save()

        # APIキーが変わった場合、クライアントをリセット
        if new_key != old_key:
            self.app.api_client.reset_client()

        # テーマ適用
        ctk.set_appearance_mode(self._theme_var.get())

        messagebox.showinfo("設定", "設定を保存しました。")
        self.destroy()
