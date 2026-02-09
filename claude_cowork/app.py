"""メインアプリケーションウィンドウ"""

from __future__ import annotations

import customtkinter as ctk

from claude_cowork.api_client import APIClient
from claude_cowork.chat_view import ChatView
from claude_cowork.config import Config
from claude_cowork.editor_view import EditorView
from claude_cowork.file_browser import FileBrowser
from claude_cowork.settings_view import SettingsDialog


class App(ctk.CTk):
    """Claude Cowork メインアプリケーション。"""

    def __init__(self) -> None:
        super().__init__()

        # 設定とAPIクライアント
        self.config = Config()
        self.api_client = APIClient(self.config)

        # テーマ適用
        ctk.set_appearance_mode(self.config.theme)
        ctk.set_default_color_theme("blue")

        # ウィンドウ設定
        self.title("Claude Cowork - AIコーディングアシスタント")
        self.geometry(f"{self.config.get('window_width')}x{self.config.get('window_height')}")
        self.minsize(900, 600)

        self._build_menu_bar()
        self._build_layout()

        # 初回起動時にAPIキーが未設定なら設定ダイアログを開く
        if not self.config.api_key:
            self.after(500, self._show_welcome)

    def _build_menu_bar(self) -> None:
        """上部メニューバーの構築。"""
        menubar = ctk.CTkFrame(self, height=40, fg_color=("gray88", "gray15"))
        menubar.pack(fill="x")
        menubar.pack_propagate(False)

        # アプリ名
        ctk.CTkLabel(
            menubar,
            text="Claude Cowork",
            font=ctk.CTkFont(size=16, weight="bold"),
        ).pack(side="left", padx=16)

        # 右側ボタン
        ctk.CTkButton(
            menubar,
            text="⚙ 設定",
            width=80,
            height=30,
            fg_color="transparent",
            hover_color=("gray80", "gray25"),
            command=self._open_settings,
        ).pack(side="right", padx=8)

        ctk.CTkButton(
            menubar,
            text="📖 ヘルプ",
            width=80,
            height=30,
            fg_color="transparent",
            hover_color=("gray80", "gray25"),
            command=self._show_help,
        ).pack(side="right", padx=4)

    def _build_layout(self) -> None:
        """メインレイアウトの構築（3カラム）。"""
        main_container = ctk.CTkFrame(self, fg_color="transparent")
        main_container.pack(fill="both", expand=True)

        # 左サイドバー: ファイルブラウザ
        self.file_browser = FileBrowser(main_container, self)
        self.file_browser.pack(side="left", fill="y")

        # 中央: チャット
        chat_container = ctk.CTkFrame(main_container, fg_color="transparent")
        chat_container.pack(side="left", fill="both", expand=True)
        self.chat_view = ChatView(chat_container, self)
        self.chat_view.pack(fill="both", expand=True)

        # 右側: エディター
        editor_container = ctk.CTkFrame(main_container, fg_color="transparent")
        editor_container.pack(side="right", fill="both", expand=True)
        self.editor_view = EditorView(editor_container, self)
        self.editor_view.pack(fill="both", expand=True)

    def _open_settings(self) -> None:
        """設定ダイアログを開く。"""
        SettingsDialog(self, self)

    def _show_welcome(self) -> None:
        """初回起動時のウェルカムメッセージ。"""
        dialog = ctk.CTkToplevel(self)
        dialog.title("ようこそ - Claude Cowork")
        dialog.geometry("480x320")
        dialog.resizable(False, False)
        dialog.transient(self)
        dialog.grab_set()

        ctk.CTkLabel(
            dialog,
            text="Claude Cowork へようこそ！",
            font=ctk.CTkFont(size=20, weight="bold"),
        ).pack(pady=(24, 8))

        ctk.CTkLabel(
            dialog,
            text=(
                "このアプリはAI（Claude）の力を借りて、\n"
                "プログラミング未経験の方でも\n"
                "簡単にコードを作成できるツールです。\n\n"
                "まずはAnthropicのAPIキーを設定してください。\n"
                "APIキーは console.anthropic.com で取得できます。"
            ),
            font=ctk.CTkFont(size=13),
            justify="center",
        ).pack(pady=8)

        btn_frame = ctk.CTkFrame(dialog, fg_color="transparent")
        btn_frame.pack(pady=16)

        ctk.CTkButton(
            btn_frame,
            text="設定を開く",
            width=150,
            height=40,
            command=lambda: [dialog.destroy(), self._open_settings()],
        ).pack(side="left", padx=8)

        ctk.CTkButton(
            btn_frame,
            text="あとで",
            width=150,
            height=40,
            fg_color=("gray70", "gray30"),
            command=dialog.destroy,
        ).pack(side="left", padx=8)

    def _show_help(self) -> None:
        """ヘルプダイアログを表示する。"""
        dialog = ctk.CTkToplevel(self)
        dialog.title("ヘルプ - Claude Cowork")
        dialog.geometry("500x420")
        dialog.resizable(False, False)
        dialog.transient(self)
        dialog.grab_set()

        ctk.CTkLabel(
            dialog,
            text="使い方ガイド",
            font=ctk.CTkFont(size=18, weight="bold"),
        ).pack(pady=(20, 8))

        help_text = (
            "【基本的な使い方】\n\n"
            "1. チャット欄に作りたいものを日本語で入力\n"
            "   例: 「簡単なTodoリストアプリを作って」\n\n"
            "2. ClaudeがコードとExplanationを返してくれます\n\n"
            "3. 生成されたコードは右側のエディターに自動表示\n\n"
            "4. 「保存」ボタンでファイルとして保存\n\n"
            "5. Pythonコードは「実行」ボタンですぐ試せます\n\n"
            "6. HTMLファイルは「実行」でブラウザで確認できます\n\n"
            "【便利なヒント】\n\n"
            "・エラーが出たらそのままチャットに貼り付けて相談\n"
            "・「もっと簡単にして」「色を変えて」など修正も依頼可能\n"
            "・Shift+Enter で入力欄に改行を挿入できます"
        )

        ctk.CTkLabel(
            dialog,
            text=help_text,
            font=ctk.CTkFont(size=12),
            justify="left",
            wraplength=440,
        ).pack(padx=24, pady=8, anchor="w")

        ctk.CTkButton(
            dialog, text="閉じる", width=120, height=36, command=dialog.destroy
        ).pack(pady=12)
