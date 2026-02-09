"""コードエディター・ファイル管理ビュー"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from tkinter import filedialog, messagebox
from typing import TYPE_CHECKING

import customtkinter as ctk

if TYPE_CHECKING:
    from claude_cowork.app import App

# 拡張子とファイルタイプの対応
EXTENSION_MAP = {
    ".py": "Python",
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".js": "JavaScript",
    ".json": "JSON",
    ".txt": "テキスト",
    ".md": "Markdown",
    ".csv": "CSV",
    ".bat": "バッチ",
    ".ps1": "PowerShell",
    ".sql": "SQL",
}


class EditorView(ctk.CTkFrame):
    """コードエディター・プレビュー・ファイル管理を統合したビュー。"""

    def __init__(self, master: ctk.CTkFrame, app: App) -> None:
        super().__init__(master, fg_color="transparent")
        self.app = app
        self._current_file: Path | None = None
        self._build_ui()

    def _build_ui(self) -> None:
        # ---- ヘッダー（ツールバー） ----
        header = ctk.CTkFrame(self, height=48, fg_color=("gray92", "gray17"))
        header.pack(fill="x", padx=0, pady=0)
        header.pack_propagate(False)

        ctk.CTkLabel(
            header,
            text="📝 エディター",
            font=ctk.CTkFont(size=15, weight="bold"),
        ).pack(side="left", padx=16)

        self._file_label = ctk.CTkLabel(
            header,
            text="（未保存）",
            font=ctk.CTkFont(size=12),
            text_color=("gray50", "gray60"),
        )
        self._file_label.pack(side="left", padx=8)

        # ボタン群
        btn_configs = [
            ("実行", self._run_code),
            ("保存", self.save_code),
            ("開く", self._open_file),
            ("新規", self._new_file),
        ]
        for text, cmd in reversed(btn_configs):
            ctk.CTkButton(
                header, text=text, width=70, height=30, command=cmd
            ).pack(side="right", padx=4)

        # ---- 言語選択 ----
        lang_frame = ctk.CTkFrame(self, height=32, fg_color="transparent")
        lang_frame.pack(fill="x", padx=8, pady=(4, 0))

        ctk.CTkLabel(
            lang_frame, text="言語:", font=ctk.CTkFont(size=12)
        ).pack(side="left", padx=(4, 4))

        self._lang_var = ctk.StringVar(value="Python")
        self._lang_menu = ctk.CTkOptionMenu(
            lang_frame,
            values=["Python", "HTML", "JavaScript", "CSS", "JSON", "テキスト"],
            variable=self._lang_var,
            width=130,
            height=28,
        )
        self._lang_menu.pack(side="left")

        # ---- エディターエリア ----
        self._editor = ctk.CTkTextbox(
            self,
            font=ctk.CTkFont(family="Consolas, monospace", size=13),
            wrap="none",
            undo=True,
        )
        self._editor.pack(fill="both", expand=True, padx=8, pady=4)

        # ---- 出力エリア ----
        output_header = ctk.CTkFrame(self, height=28, fg_color=("gray92", "gray17"))
        output_header.pack(fill="x", padx=8, pady=(4, 0))
        output_header.pack_propagate(False)

        ctk.CTkLabel(
            output_header,
            text="▶ 実行結果",
            font=ctk.CTkFont(size=12, weight="bold"),
        ).pack(side="left", padx=8)

        ctk.CTkButton(
            output_header, text="クリア", width=60, height=22,
            command=self._clear_output,
        ).pack(side="right", padx=8)

        self._output = ctk.CTkTextbox(
            self,
            height=120,
            font=ctk.CTkFont(family="Consolas, monospace", size=12),
            wrap="word",
            state="disabled",
        )
        self._output.pack(fill="x", padx=8, pady=(0, 8))

    # ---- 外部からコードをセット ----

    def set_code(self, code: str, language: str | None = None) -> None:
        """チャットビューからコードを受け取りエディターに表示する。"""
        self._editor.delete("1.0", "end")
        self._editor.insert("1.0", code)
        if language:
            self._lang_var.set(language)
        self._current_file = None
        self._file_label.configure(text="（チャットから取得 - 未保存）")

    # ---- ファイル操作 ----

    def _new_file(self) -> None:
        """新規ファイル。"""
        self._editor.delete("1.0", "end")
        self._current_file = None
        self._file_label.configure(text="（新規ファイル）")

    def _open_file(self) -> None:
        """ファイルを開く。"""
        workspace = self.app.config.workspace_dir
        filepath = filedialog.askopenfilename(
            initialdir=workspace,
            title="ファイルを開く",
            filetypes=[
                ("すべてのファイル", "*.*"),
                ("Python", "*.py"),
                ("HTML", "*.html *.htm"),
                ("JavaScript", "*.js"),
                ("CSS", "*.css"),
                ("テキスト", "*.txt"),
            ],
        )
        if filepath:
            self._load_file(Path(filepath))

    def _load_file(self, path: Path) -> None:
        """ファイルを読み込む。"""
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            try:
                text = path.read_text(encoding="cp932")
            except Exception as e:
                messagebox.showerror("エラー", f"ファイルを読み込めません:\n{e}")
                return
        except Exception as e:
            messagebox.showerror("エラー", f"ファイルを読み込めません:\n{e}")
            return

        self._editor.delete("1.0", "end")
        self._editor.insert("1.0", text)
        self._current_file = path
        self._file_label.configure(text=str(path))

        # 拡張子から言語を推定
        ext = path.suffix.lower()
        if ext in EXTENSION_MAP:
            self._lang_var.set(EXTENSION_MAP[ext])

    def save_code(self) -> None:
        """コードをファイルに保存する。"""
        code = self._editor.get("1.0", "end-1c")
        if not code.strip():
            messagebox.showinfo("情報", "保存するコードがありません。")
            return

        lang = self._lang_var.get()
        ext_map = {
            "Python": ".py",
            "HTML": ".html",
            "JavaScript": ".js",
            "CSS": ".css",
            "JSON": ".json",
            "テキスト": ".txt",
        }
        default_ext = ext_map.get(lang, ".txt")

        if self._current_file:
            initial_dir = str(self._current_file.parent)
            initial_file = self._current_file.name
        else:
            initial_dir = self.app.config.workspace_dir
            initial_file = f"my_project{default_ext}"

        filepath = filedialog.asksaveasfilename(
            initialdir=initial_dir,
            initialfile=initial_file,
            title="ファイルを保存",
            defaultextension=default_ext,
            filetypes=[
                (f"{lang}ファイル", f"*{default_ext}"),
                ("すべてのファイル", "*.*"),
            ],
        )
        if filepath:
            try:
                Path(filepath).write_text(code, encoding="utf-8")
                self._current_file = Path(filepath)
                self._file_label.configure(text=filepath)
                self._write_output(f"✅ 保存しました: {filepath}\n")
            except Exception as e:
                messagebox.showerror("エラー", f"保存に失敗しました:\n{e}")

    # ---- コード実行 ----

    def _run_code(self) -> None:
        """エディターのコードを実行する。"""
        code = self._editor.get("1.0", "end-1c")
        if not code.strip():
            self._write_output("⚠️ 実行するコードがありません。\n")
            return

        lang = self._lang_var.get()

        if lang == "Python":
            self._run_python(code)
        elif lang == "HTML":
            self._run_html(code)
        elif lang == "JavaScript":
            self._write_output(
                "ℹ️ JavaScriptの実行にはHTMLファイルに埋め込んで\n"
                "ブラウザで開くか、Node.jsが必要です。\n"
                "「HTMLとして実行」をお試しください。\n"
            )
        else:
            self._write_output(
                f"ℹ️ {lang}ファイルの直接実行には対応していません。\n"
                "ファイルを保存して、対応するアプリケーションで開いてください。\n"
            )

    def _run_python(self, code: str) -> None:
        """Pythonコードを実行する。"""
        self._clear_output()
        self._write_output("▶ Python を実行中...\n\n")

        try:
            result = subprocess.run(
                [sys.executable, "-c", code],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=self.app.config.workspace_dir,
            )
            if result.stdout:
                self._write_output(result.stdout)
            if result.stderr:
                self._write_output(f"\n⚠️ エラー出力:\n{result.stderr}")
            if result.returncode == 0:
                self._write_output("\n✅ 正常に終了しました。")
            else:
                self._write_output(f"\n❌ 終了コード: {result.returncode}")
        except subprocess.TimeoutExpired:
            self._write_output("⏰ 実行がタイムアウトしました（30秒制限）。")
        except Exception as e:
            self._write_output(f"❌ 実行エラー: {e}")

    def _run_html(self, code: str) -> None:
        """HTMLコードをブラウザで開く。"""
        workspace = Path(self.app.config.workspace_dir)
        temp_file = workspace / "_preview.html"
        try:
            temp_file.write_text(code, encoding="utf-8")
            if os.name == "nt":
                os.startfile(str(temp_file))
            elif sys.platform == "darwin":
                subprocess.run(["open", str(temp_file)])
            else:
                subprocess.run(["xdg-open", str(temp_file)])
            self._write_output(f"🌐 ブラウザで開きました: {temp_file}\n")
        except Exception as e:
            self._write_output(f"❌ プレビューに失敗しました: {e}\n")

    # ---- 出力エリア制御 ----

    def _write_output(self, text: str) -> None:
        """出力エリアにテキストを追加する。"""
        self._output.configure(state="normal")
        self._output.insert("end", text)
        self._output.configure(state="disabled")
        self._output.see("end")

    def _clear_output(self) -> None:
        """出力エリアをクリアする。"""
        self._output.configure(state="normal")
        self._output.delete("1.0", "end")
        self._output.configure(state="disabled")
