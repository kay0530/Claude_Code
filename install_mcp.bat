@echo off

REM ============================================
REM   Claude Cowork - Setup for Claude Desktop
REM ============================================

echo ============================================
echo   Claude Cowork - Setup for Claude Desktop
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

echo [1/4] Creating virtual environment...
if not exist ".venv" (
    python -m venv .venv
)
call .venv\Scripts\activate.bat

echo [2/4] Installing packages...
pip install -r requirements.txt -q
if errorlevel 1 (
    echo [ERROR] Package installation failed.
    pause
    exit /b 1
)

echo [3/4] Creating workspace folder...
if not exist "%USERPROFILE%\ClaudeCowork" mkdir "%USERPROFILE%\ClaudeCowork"

echo [4/4] Configuring Claude Desktop...

set CONFIG_DIR=%APPDATA%\Claude
set CONFIG_FILE=%CONFIG_DIR%\claude_desktop_config.json
set VENV_PYTHON=%CD%\.venv\Scripts\python.exe
set MCP_SCRIPT=%CD%\claude_cowork\mcp_server.py

REM Escape backslashes for JSON
set VENV_PYTHON_ESC=%VENV_PYTHON:\=\\%
set MCP_SCRIPT_ESC=%MCP_SCRIPT:\=\\%

if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

if exist "%CONFIG_FILE%" (
    echo.
    echo [NOTE] Claude Desktop config already exists:
    echo   %CONFIG_FILE%
    echo.
    echo Please add the following to "mcpServers" manually:
    echo.
    echo   "claude-cowork": {
    echo     "command": "%VENV_PYTHON_ESC%",
    echo     "args": ["%MCP_SCRIPT_ESC%"]
    echo   }
    echo.
) else (
    echo {"mcpServers":{"claude-cowork":{"command":"%VENV_PYTHON_ESC%","args":["%MCP_SCRIPT_ESC%"]}}} > "%CONFIG_FILE%"
    echo [OK] Claude Desktop config created.
)

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo Next steps:
echo   1. Restart Claude Desktop
echo   2. Try: "Show workspace info" in chat
echo   3. Try: "Create a Todo app" in chat
echo.
echo Workspace: %USERPROFILE%\ClaudeCowork
echo.
pause
