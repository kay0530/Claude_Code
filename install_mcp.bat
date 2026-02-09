@echo off
chcp 65001 >nul
title Claude Cowork - Claude Desktop 連携セットアップ

echo ============================================
echo   Claude Cowork を Claude Desktop に登録
echo ============================================
echo.

REM Pythonの存在確認
python --version >nul 2>&1
if errorlevel 1 (
    echo [エラー] Pythonが見つかりません。
    echo Python 3.10以上をインストールしてください。
    echo https://www.python.org/downloads/
    echo ※「Add Python to PATH」にチェックを入れてください
    echo.
    pause
    exit /b 1
)

REM 仮想環境の作成
echo [1/4] 仮想環境を準備しています...
if not exist ".venv" (
    python -m venv .venv
)
call .venv\Scripts\activate.bat

REM パッケージインストール
echo [2/4] 必要なパッケージをインストールしています...
pip install -r requirements.txt -q
if errorlevel 1 (
    echo [エラー] パッケージのインストールに失敗しました。
    pause
    exit /b 1
)

REM ワークスペースフォルダ作成
echo [3/4] ワークスペースフォルダを作成しています...
if not exist "%USERPROFILE%\ClaudeCowork" mkdir "%USERPROFILE%\ClaudeCowork"

REM Claude Desktop の設定ファイルを更新
echo [4/4] Claude Desktop の設定を更新しています...

set CONFIG_DIR=%APPDATA%\Claude
set CONFIG_FILE=%CONFIG_DIR%\claude_desktop_config.json
set VENV_PYTHON=%CD%\.venv\Scripts\python.exe
set MCP_SCRIPT=%CD%\claude_cowork\mcp_server.py

REM パスのバックスラッシュをエスケープ
set VENV_PYTHON_ESC=%VENV_PYTHON:\=\\%
set MCP_SCRIPT_ESC=%MCP_SCRIPT:\=\\%

if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

if exist "%CONFIG_FILE%" (
    echo.
    echo ⚠️  既に Claude Desktop の設定ファイルが存在します:
    echo    %CONFIG_FILE%
    echo.
    echo 以下の内容を手動で追加してください:
    echo.
    echo ─────────────────────────────────────
    echo "mcpServers" の中に以下を追加:
    echo.
    echo   "claude-cowork": {
    echo     "command": "%VENV_PYTHON_ESC%",
    echo     "args": ["%MCP_SCRIPT_ESC%"]
    echo   }
    echo ─────────────────────────────────────
    echo.
    echo 設定ファイルの場所: %CONFIG_FILE%
    echo.
) else (
    echo {"mcpServers":{"claude-cowork":{"command":"%VENV_PYTHON_ESC%","args":["%MCP_SCRIPT_ESC%"]}}} > "%CONFIG_FILE%"
    echo ✅ Claude Desktop の設定ファイルを作成しました。
)

echo.
echo ============================================
echo   セットアップ完了！
echo ============================================
echo.
echo 【次のステップ】
echo   1. Claude Desktop を再起動してください
echo   2. チャットで「ワークスペースの情報を見せて」と入力
echo   3. 「Todoアプリを作って」などと話しかけてみましょう！
echo.
echo ワークスペース: %USERPROFILE%\ClaudeCowork
echo   ここにファイルが作成されます。
echo.
pause
