@echo off
setlocal

REM ==========================================
REM    OpenClaw EZ-Control Start Script (ASCII)
REM ==========================================

REM 1. Check Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python not found in PATH.
    echo Please install Python and try again.
    pause
    exit /b 1
)

REM 2. Set Paths (Using OS-specific venv_win folder)
set "BASE_DIR=%~dp0"
set "BACKEND_DIR=%BASE_DIR%backend"
set "VENV_DIR=%BACKEND_DIR%\venv_win"

REM 3. Create Windows-specific virtual environment if not exists
if not exist "%VENV_DIR%" (
    echo [SYSTEM] Creating venv_win...
    python -m venv "%VENV_DIR%"
)

REM 4. Detect Activation Script
set "ACTIVATE_BAT=%VENV_DIR%\Scripts\activate.bat"
if not exist "%ACTIVATE_BAT%" (
    if exist "%VENV_DIR%\bin\activate.bat" (
        set "ACTIVATE_BAT=%VENV_DIR%\bin\activate.bat"
    )
)

if not exist "%ACTIVATE_BAT%" (
    echo [ERROR] Could NOT find activation script in your venv.
    pause
    exit /b 1
)

REM 5. Install requirements
echo [SYSTEM] Checking dependencies...
call "%ACTIVATE_BAT%"

python -m pip install --upgrade pip >nul 2>nul
pip install -r "%BACKEND_DIR%\requirements.txt" >nul 2>nul

REM 5. Check Frontend Build
set "FRONTEND_DIR=%BASE_DIR%frontend"
set "DIST_DIR=%FRONTEND_DIR%\dist"

if not exist "%DIST_DIR%" (
    echo [SYSTEM] Frontend build NOT found! Initializing auto-build...
    cd /d "%FRONTEND_DIR%"
    echo [SYSTEM] Installing frontend dependencies...
    call npm install && call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Frontend auto-build FAILED!
        echo Please try manual build via clean_and_build_frontend.bat
        pause
        exit /b 1
    )
    echo [STATUS] Frontend auto-build SUCCESSFUL.
    cd /d "%BASE_DIR%"
)

REM 6. Set Port (Default: 8002)
set PORT=8002
if not "%1"=="" set PORT=%1

echo.
echo [STATUS] Server starting...
echo [STATUS] Port: %PORT%
echo [STATUS] URL: http://127.0.0.1:%PORT%
echo ==========================================
echo.

REM 7. Launch Server
cd /d "%BACKEND_DIR%"
"%VENV_DIR%\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port %PORT%
