@echo off
chcp 65001 >nul
title Claude Cowork - AIコーディングアシスタント

echo ============================================
echo   Claude Cowork を起動しています...
echo ============================================
echo.

REM Pythonの存在確認
python --version >nul 2>&1
if errorlevel 1 (
    echo [エラー] Pythonが見つかりません。
    echo Python 3.10以上をインストールしてください。
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM 仮想環境の確認・作成
if not exist ".venv" (
    echo 初回セットアップ中... 仮想環境を作成しています。
    python -m venv .venv
    if errorlevel 1 (
        echo [エラー] 仮想環境の作成に失敗しました。
        pause
        exit /b 1
    )
)

REM 仮想環境を有効化
call .venv\Scripts\activate.bat

REM 依存パッケージのインストール確認
pip show anthropic >nul 2>&1
if errorlevel 1 (
    echo 必要なパッケージをインストールしています...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [エラー] パッケージのインストールに失敗しました。
        pause
        exit /b 1
    )
    echo インストール完了！
    echo.
)

REM アプリケーション起動
echo Claude Cowork を起動します！
python -m claude_cowork.main
