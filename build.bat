@echo off
chcp 65001 >nul
title Claude Cowork - EXEビルド

echo ============================================
echo   Claude Cowork を実行ファイル(.exe)にビルド
echo ============================================
echo.

REM 仮想環境を有効化
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
) else (
    echo [エラー] 仮想環境が見つかりません。先に setup.bat を実行してください。
    pause
    exit /b 1
)

REM PyInstallerのインストール確認
pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo PyInstallerをインストールしています...
    pip install pyinstaller>=6.0.0
)

echo.
echo ビルドを開始します...
echo.

pyinstaller ^
    --name "ClaudeCowork" ^
    --onefile ^
    --windowed ^
    --noconfirm ^
    --clean ^
    --add-data "claude_cowork;claude_cowork" ^
    claude_cowork/main.py

if errorlevel 1 (
    echo.
    echo [エラー] ビルドに失敗しました。
    pause
    exit /b 1
)

echo.
echo ============================================
echo   ビルド完了！
echo ============================================
echo.
echo 実行ファイル: dist\ClaudeCowork.exe
echo.
echo このファイルを配布すれば、Pythonがなくても実行できます。
echo.
pause
