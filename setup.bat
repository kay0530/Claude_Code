@echo off

REM ============================================
REM   Claude Cowork - Initial Setup
REM ============================================

echo ============================================
echo   Claude Cowork - Setup
echo ============================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found.
    echo.
    echo Please install Python 3.10+ from:
    echo   https://www.python.org/downloads/
    echo.
    echo * IMPORTANT: Check "Add Python to PATH" during install
    echo.
    pause
    exit /b 1
)

echo [1/3] Creating virtual environment...
if exist ".venv" (
    echo   Already exists. Skipping.
) else (
    python -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo   Done.
)

echo.
echo [2/3] Activating virtual environment...
call .venv\Scripts\activate.bat

echo.
echo [3/3] Installing packages...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Package installation failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo Start the app by double-clicking: run.bat
echo.
pause
