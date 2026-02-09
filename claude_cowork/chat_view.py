"""チャットビュー - ユーザーとClaudeの対話インターフェース"""

from __future__ import annotations

import re
import tkinter as tk
from typing import TYPE_CHECKING

import customtkinter as ctk

if TYPE_CHECKING:
    from claude_cowork.app import App


class ChatView(ctk.CTkFrame):
    """チャット形式の対話UI。"""

    def __init__(self, master: ctk.CTkFrame, app: App) -> None:
        super().__init__(master, fg_color="transparent")
        self.app = app
        self._is_streaming = False
        self._build_ui()

    def _build_ui(self) -> None:
        # ---- ヘッダー ----
        header = ctk.CTkFrame(self, height=48, fg_color=("gray92", "gray17"))
        header.pack(fill="x", padx=0, pady=0)
        header.pack_propagate(False)

        ctk.CTkLabel(
            header,
            text="💬 チャット",
            font=ctk.CTkFont(size=15, weight="bold"),
        ).pack(side="left", padx=16)

        ctk.CTkButton(
            header,
            text="会話クリア",
            width=100,
            height=30,
            command=self._clear_conversation,
        ).pack(side="right", padx=16)

        # ---- メッセージ表示エリア ----
        self._chat_frame = ctk.CTkScrollableFrame(
            self, fg_color=("gray96", "gray13")
        )
        self._chat_frame.pack(fill="both", expand=True, padx=8, pady=(8, 4))

        # ウェルカムメッセージ
        self._add_system_message(
            "Claude Cowork へようこそ！\n\n"
            "プログラミングの知識がなくても大丈夫です。\n"
            "作りたいものを日本語で伝えてください。\n\n"
            "例:\n"
            "・「簡単な家計簿アプリを作って」\n"
            "・「HTMLで自己紹介ページを作りたい」\n"
            "・「Pythonで数当てゲームを作りたい」\n"
            "・「このエラーの意味を教えて」"
        )

        # ---- 入力エリア ----
        input_frame = ctk.CTkFrame(self, fg_color="transparent")
        input_frame.pack(fill="x", padx=8, pady=(4, 8))

        self._input_box = ctk.CTkTextbox(
            input_frame,
            height=80,
            font=ctk.CTkFont(size=13),
            wrap="word",
        )
        self._input_box.pack(side="left", fill="both", expand=True, padx=(0, 8))
        self._input_box.bind("<Return>", self._on_enter)
        self._input_box.bind("<Shift-Return>", self._on_shift_enter)

        btn_frame = ctk.CTkFrame(input_frame, fg_color="transparent")
        btn_frame.pack(side="right", fill="y")

        self._send_btn = ctk.CTkButton(
            btn_frame,
            text="送信",
            width=80,
            height=36,
            command=self._on_send,
        )
        self._send_btn.pack(pady=(0, 4))

        self._save_btn = ctk.CTkButton(
            btn_frame,
            text="コード保存",
            width=80,
            height=36,
            fg_color=("gray70", "gray30"),
            command=self._save_last_code,
        )
        self._save_btn.pack(pady=(4, 0))

    # ---- メッセージ表示 ----

    def _add_message_bubble(
        self, text: str, role: str, tag: str | None = None
    ) -> ctk.CTkTextbox:
        """メッセージバブルを追加する。"""
        is_user = role == "user"

        container = ctk.CTkFrame(
            self._chat_frame,
            fg_color=("gray85", "gray25") if is_user else ("white", "gray20"),
            corner_radius=12,
        )
        container.pack(
            fill="x",
            padx=(60 if is_user else 8, 8 if is_user else 60),
            pady=4,
            anchor="e" if is_user else "w",
        )

        role_label = "あなた" if is_user else "Claude"
        ctk.CTkLabel(
            container,
            text=role_label,
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color=("gray40", "gray60"),
        ).pack(anchor="w", padx=12, pady=(8, 0))

        textbox = ctk.CTkTextbox(
            container,
            font=ctk.CTkFont(size=13),
            wrap="word",
            activate_scrollbars=False,
            fg_color="transparent",
            height=20,
        )
        textbox.pack(fill="x", padx=8, pady=(0, 8))
        textbox.insert("1.0", text)
        textbox.configure(state="disabled")

        # テキスト量に応じて高さを自動調整
        self._auto_resize_textbox(textbox, text)

        return textbox

    def _auto_resize_textbox(self, textbox: ctk.CTkTextbox, text: str) -> None:
        """テキストボックスの高さをコンテンツに合わせて調整する。"""
        line_count = text.count("\n") + 1
        # 各行の折り返しも考慮（概算）
        avg_chars_per_line = 60
        for line in text.split("\n"):
            if len(line) > avg_chars_per_line:
                line_count += len(line) // avg_chars_per_line
        height = min(max(line_count * 22, 40), 500)
        textbox.configure(height=height)

    def _add_system_message(self, text: str) -> None:
        """システムメッセージを表示する。"""
        container = ctk.CTkFrame(
            self._chat_frame,
            fg_color=("gray90", "gray22"),
            corner_radius=12,
        )
        container.pack(fill="x", padx=32, pady=8)

        ctk.CTkLabel(
            container,
            text=text,
            font=ctk.CTkFont(size=13),
            justify="left",
            wraplength=500,
        ).pack(padx=16, pady=12)

    # ---- ストリーミング応答 ----

    def _create_assistant_bubble(self) -> ctk.CTkTextbox:
        """アシスタントの空のバブルを作成する。"""
        container = ctk.CTkFrame(
            self._chat_frame,
            fg_color=("white", "gray20"),
            corner_radius=12,
        )
        container.pack(fill="x", padx=(8, 60), pady=4, anchor="w")

        ctk.CTkLabel(
            container,
            text="Claude",
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color=("gray40", "gray60"),
        ).pack(anchor="w", padx=12, pady=(8, 0))

        textbox = ctk.CTkTextbox(
            container,
            font=ctk.CTkFont(size=13),
            wrap="word",
            activate_scrollbars=False,
            fg_color="transparent",
            height=40,
        )
        textbox.pack(fill="x", padx=8, pady=(0, 8))

        self._current_response_box = textbox
        self._current_response_container = container
        self._current_response_text = ""
        return textbox

    def _append_streaming_text(self, chunk: str) -> None:
        """ストリーミングテキストをUIに追加する（メインスレッドから呼ぶ）。"""
        if not hasattr(self, "_current_response_box"):
            return
        self._current_response_text += chunk
        box = self._current_response_box
        box.configure(state="normal")
        box.insert("end", chunk)
        box.configure(state="disabled")
        # 高さ自動調整
        self._auto_resize_textbox(box, self._current_response_text)
        # スクロールを最下部に
        self._chat_frame._parent_canvas.yview_moveto(1.0)

    def _on_stream_chunk(self, chunk: str) -> None:
        """ストリーミングチャンクを受信時のコールバック。"""
        self.after(0, self._append_streaming_text, chunk)

    def _on_stream_complete(self, full_text: str) -> None:
        """ストリーミング完了時のコールバック。"""

        def _finish() -> None:
            self._is_streaming = False
            self._send_btn.configure(state="normal", text="送信")
            self._last_response = full_text
            # コードブロックがあればエディタにも表示
            code_blocks = re.findall(r"```[\w]*\n(.*?)```", full_text, re.DOTALL)
            if code_blocks and hasattr(self.app, "editor_view"):
                self.app.editor_view.set_code(code_blocks[-1].strip())

        self.after(0, _finish)

    def _on_stream_error(self, error: Exception) -> None:
        """エラー時のコールバック。"""

        def _show_error() -> None:
            self._is_streaming = False
            self._send_btn.configure(state="normal", text="送信")
            error_msg = str(error)
            if "api_key" in error_msg.lower() or "auth" in error_msg.lower():
                error_msg = (
                    "APIキーが無効です。\n"
                    "設定画面でAnthropicのAPIキーを確認してください。"
                )
            self._add_system_message(f"⚠️ エラー: {error_msg}")
            self._chat_frame._parent_canvas.yview_moveto(1.0)

        self.after(0, _show_error)

    # ---- ユーザーアクション ----

    def _on_enter(self, event: tk.Event) -> str:
        """Enterキー押下時（送信）。"""
        if not event.state & 0x1:  # Shiftが押されていない場合
            self._on_send()
            return "break"
        return ""

    def _on_shift_enter(self, event: tk.Event) -> str:
        """Shift+Enter（改行挿入）。"""
        return ""  # デフォルト動作（改行挿入）を許可

    def _on_send(self) -> None:
        """メッセージ送信。"""
        if self._is_streaming:
            return

        text = self._input_box.get("1.0", "end-1c").strip()
        if not text:
            return

        # 入力欄をクリア
        self._input_box.delete("1.0", "end")

        # ユーザーメッセージを表示
        self._add_message_bubble(text, "user")
        self._chat_frame._parent_canvas.yview_moveto(1.0)

        # ストリーミング開始
        self._is_streaming = True
        self._send_btn.configure(state="disabled", text="応答中...")
        self._create_assistant_bubble()

        self.app.api_client.send_message(
            message=text,
            on_chunk=self._on_stream_chunk,
            on_complete=self._on_stream_complete,
            on_error=self._on_stream_error,
        )

    def _clear_conversation(self) -> None:
        """会話をクリアする。"""
        if self._is_streaming:
            return
        self.app.api_client.clear_conversation()
        for widget in self._chat_frame.winfo_children():
            widget.destroy()
        self._add_system_message("会話をクリアしました。新しい会話を始めましょう！")

    def _save_last_code(self) -> None:
        """最後の応答からコードを抽出して保存ダイアログを開く。"""
        if not hasattr(self, "_last_response"):
            self._add_system_message("保存するコードがありません。")
            return
        if hasattr(self.app, "editor_view"):
            self.app.editor_view.save_code()
