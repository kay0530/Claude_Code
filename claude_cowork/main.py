"""Claude Cowork エントリーポイント"""

import sys


def main() -> None:
    """アプリケーションを起動する。"""
    # Windowsでの高DPI対応
    if sys.platform == "win32":
        try:
            import ctypes
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            pass

    from claude_cowork.app import App

    app = App()
    app.mainloop()


if __name__ == "__main__":
    main()
