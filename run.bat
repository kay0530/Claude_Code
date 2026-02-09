@echo off

REM ============================================
REM   Claude Cowork - Launcher
REM ============================================

echo ============================================
echo   Claude Cowork - Starting...
echo ============================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found.
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo * Check "Add Python to PATH" during install
    echo.
    pause
    exit /b 1
)

REM Create venv if needed
if not exist ".venv" (
    echo First-time setup: creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

REM Activate venv
call .venv\Scripts\activate.bat

REM Install packages if needed
pip show anthropic >nul 2>&1
if errorlevel 1 (
    echo Installing required packages...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Package installation failed.
        pause
        exit /b 1
    )
    echo Done!
    echo.
)

REM Launch app
echo Starting Claude Cowork!
python -m claude_cowork.main
