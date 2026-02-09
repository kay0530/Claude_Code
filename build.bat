@echo off

REM ============================================
REM   Claude Cowork - Build EXE
REM ============================================

echo ============================================
echo   Claude Cowork - Build EXE
echo ============================================
echo.

REM Activate venv
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
) else (
    echo [ERROR] Virtual environment not found. Run setup.bat first.
    pause
    exit /b 1
)

REM Install PyInstaller if needed
pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo Installing PyInstaller...
    pip install pyinstaller>=6.0.0
)

echo.
echo Building...
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
    echo [ERROR] Build failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Build Complete!
echo ============================================
echo.
echo Output: dist\ClaudeCowork.exe
echo.
pause
