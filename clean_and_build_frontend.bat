@echo off
setlocal

REM ==========================================
REM    OpenClaw EZ-Control Frontend Cleanup
REM ==========================================

set "BASE_DIR=%~dp0"
set "FRONTEND_DIR=%BASE_DIR%frontend"

echo [SYSTEM] Starting frontend cleanup and build...
echo [DEBUG] Target: %FRONTEND_DIR%

REM 1. Move to frontend directory
cd /d "%FRONTEND_DIR%"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Could not find frontend directory.
    pause
    exit /b 1
)

REM 2. Remove old cross-platform modules
if exist "node_modules" (
    echo [SYSTEM] Removing old node_modules...
    rmdir /s /q "node_modules"
)

if exist "package-lock.json" (
    echo [SYSTEM] Removing old package-lock.json...
    del /f /q "package-lock.json"
)

REM 3. Install Windows-native dependencies
echo [SYSTEM] Installing Windows-native dependencies (npm install)...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

REM 4. Run build
echo [SYSTEM] Building frontend (npm run build)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm run build failed.
    pause
    exit /b 1
)

echo.
echo [STATUS] Frontend build SUCCESSFUL.
echo [STATUS] You can now run start_windows.bat.
echo ==========================================
pause
