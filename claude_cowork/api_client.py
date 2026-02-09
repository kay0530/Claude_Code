"""Claude API クライアントモジュール"""

from __future__ import annotations

import threading
from typing import Callable

import anthropic

from claude_cowork.config import Config

SYSTEM_PROMPT = """\
あなたは「Claude Cowork」という非エンジニア向けコーディングアシスタントです。
ユーザーはプログラミングの専門知識を持たない一般の方です。

以下のルールに従ってください:
1. 専門用語を使う場合は必ず分かりやすく説明してください
2. コードを生成する際は、そのコードが何をしているか日本語で丁寧に解説してください
3. ファイルの作成・編集が必要な場合は、コードブロックで提示してください
4. エラーが発生した場合は、原因と解決方法を優しく説明してください
5. ユーザーが何を作りたいか曖昧な場合は、具体的な質問で要件を明確にしてください
6. HTMLやPython、JavaScriptなど、目的に最適な言語を選んで提案してください
7. 回答は日本語で行ってください（コード中のコメントも日本語推奨）
"""


class APIClient:
    """Claude APIとの通信を管理するクライアント。"""

    def __init__(self, config: Config) -> None:
        self.config = config
        self._client: anthropic.Anthropic | None = None
        self._conversation: list[dict] = []

    def _get_client(self) -> anthropic.Anthropic:
        """APIクライアントを取得（遅延初期化）。"""
        if self._client is None:
            api_key = self.config.api_key
            if not api_key:
                raise ValueError(
                    "APIキーが設定されていません。\n"
                    "設定画面からAnthropicのAPIキーを入力してください。"
                )
            self._client = anthropic.Anthropic(api_key=api_key)
        return self._client

    def reset_client(self) -> None:
        """APIクライアントをリセットする（APIキー変更時）。"""
        self._client = None

    def clear_conversation(self) -> None:
        """会話履歴をクリアする。"""
        self._conversation.clear()

    def send_message(
        self,
        message: str,
        on_chunk: Callable[[str], None] | None = None,
        on_complete: Callable[[str], None] | None = None,
        on_error: Callable[[Exception], None] | None = None,
    ) -> None:
        """メッセージを送信し、ストリーミングで応答を受け取る。

        別スレッドで実行されるため、UIをブロックしない。
        """

        def _run() -> None:
            try:
                client = self._get_client()
                self._conversation.append({"role": "user", "content": message})

                full_response = ""
                with client.messages.stream(
                    model=self.config.model,
                    max_tokens=self.config.max_tokens,
                    system=SYSTEM_PROMPT,
                    messages=list(self._conversation),
                ) as stream:
                    for text in stream.text_stream:
                        full_response += text
                        if on_chunk:
                            on_chunk(text)

                self._conversation.append(
                    {"role": "assistant", "content": full_response}
                )
                if on_complete:
                    on_complete(full_response)

            except Exception as e:
                # エラー時は最後に追加したユーザーメッセージを取り除く
                if self._conversation and self._conversation[-1]["role"] == "user":
                    self._conversation.pop()
                if on_error:
                    on_error(e)

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()

    def send_message_sync(self, message: str) -> str:
        """メッセージを同期的に送信する（テスト用）。"""
        client = self._get_client()
        self._conversation.append({"role": "user", "content": message})

        response = client.messages.create(
            model=self.config.model,
            max_tokens=self.config.max_tokens,
            system=SYSTEM_PROMPT,
            messages=list(self._conversation),
        )
        text = response.content[0].text
        self._conversation.append({"role": "assistant", "content": text})
        return text
