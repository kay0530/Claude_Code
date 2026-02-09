#!/bin/bash
# Claude Cowork 起動スクリプト（macOS / Linux用）

set -e

echo "============================================"
echo "  Claude Cowork を起動しています..."
echo "============================================"
echo

# Pythonの存在確認
if ! command -v python3 &> /dev/null; then
    echo "[エラー] Python3が見つかりません。"
    echo "Python 3.10以上をインストールしてください。"
    exit 1
fi

# 仮想環境の確認・作成
if [ ! -d ".venv" ]; then
    echo "初回セットアップ中... 仮想環境を作成しています。"
    python3 -m venv .venv
fi

# 仮想環境を有効化
source .venv/bin/activate

# 依存パッケージのインストール確認
if ! pip show anthropic &> /dev/null; then
    echo "必要なパッケージをインストールしています..."
    pip install -r requirements.txt
    echo "インストール完了！"
    echo
fi

# アプリケーション起動
echo "Claude Cowork を起動します！"
python -m claude_cowork.main
