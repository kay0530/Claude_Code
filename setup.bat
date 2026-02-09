@echo off
chcp 65001 >nul
title Claude Cowork - セットアップ

echo ============================================
echo   Claude Cowork セットアップ
echo ============================================
echo.

REM Pythonの存在確認
python --version >nul 2>&1
if errorlevel 1 (
    echo [エラー] Pythonが見つかりません。
    echo.
    echo Python 3.10以上をインストールしてください。
    echo ダウンロード: https://www.python.org/downloads/
    echo.
    echo ※ インストール時に「Add Python to PATH」にチェックを入れてください
    echo.
    pause
    exit /b 1
)

echo [1/3] 仮想環境を作成しています...
if exist ".venv" (
    echo   既存の仮想環境を検出しました。スキップします。
) else (
    python -m venv .venv
    if errorlevel 1 (
        echo [エラー] 仮想環境の作成に失敗しました。
        pause
        exit /b 1
    )
    echo   仮想環境を作成しました。
)

echo.
echo [2/3] 仮想環境を有効化しています...
call .venv\Scripts\activate.bat

echo.
echo [3/3] 必要なパッケージをインストールしています...
pip install -r requirements.txt
if errorlevel 1 (
    echo [エラー] パッケージのインストールに失敗しました。
    pause
    exit /b 1
)

echo.
echo ============================================
echo   セットアップ完了！
echo ============================================
echo.
echo 以下のコマンド、または run.bat をダブルクリックして起動できます:
echo   run.bat
echo.
pause
