@echo off
setlocal EnableExtensions
title AID-C2S V5 - Stable Launcher
cd /d "%~dp0"
echo.
echo ============================================================
echo          AID-C2S V5 - ONE-CLICK LAUNCHER
echo ============================================================
echo.
if not exist "package.json" (
  echo [ERROR] package.json not found. Put this BAT in the V5 project root.
  echo Current folder: %CD%
  echo.
  pause
  exit /b 1
)
where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js 22.12+ is required.
  pause
  exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm.cmd was not found.
  pause
  exit /b 1
)
if not exist "node_modules\vite\package.json" (
  echo [INFO] Installing pinned V5 dependencies. Internet access is required for this first step.
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo [ERROR] Dependency installation failed. Check network access and this window for the npm error.
    pause
    exit /b 1
  )
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-v5.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] V5 failed to start. Read the PowerShell/Vite message above.
  pause
  exit /b 1
)
endlocal
