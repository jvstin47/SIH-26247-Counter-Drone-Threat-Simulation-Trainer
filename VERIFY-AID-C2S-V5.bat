@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title AID-C2S V5 - Verification Suite

if not exist "package.json" (
  echo [ERROR] package.json not found. Put this script in the V5 project root.
  pause
  exit /b 1
)
if not exist "node_modules\typescript\package.json" (
  echo [ERROR] Dependencies are not installed yet. Run START-AID-C2S-V5.bat first, or run npm.cmd install.
  pause
  exit /b 1
)
if not exist "validation" mkdir validation
set "LOG=validation\latest-verification.log"
>"%LOG%" echo AID-C2S V5 validation started %DATE% %TIME%

echo [1/7] Source consistency...
echo [1/7] Source consistency...>>"%LOG%"
call npm.cmd run validate:source >>"%LOG%" 2>&1
if errorlevel 1 goto FAIL

echo [2/7] Offline core tests...
echo [2/7] Offline core tests...>>"%LOG%"
call npm.cmd run test:offline >>"%LOG%" 2>&1
if errorlevel 1 goto FAIL

echo [3/7] Backend API tests...
echo [3/7] Backend API tests...>>"%LOG%"
call npm.cmd run test:backend >>"%LOG%" 2>&1
if errorlevel 1 goto FAIL

echo [4/7] TypeScript typecheck...
echo [4/7] TypeScript typecheck...>>"%LOG%"
call npm.cmd run typecheck >>"%LOG%" 2>&1
if errorlevel 1 goto FAIL

echo [5/7] Lint and unit tests...
echo [5/7] Lint and unit tests...>>"%LOG%"
call npm.cmd run lint >>"%LOG%" 2>&1
if errorlevel 1 goto FAIL
call npm.cmd test >>"%LOG%" 2>&1
if errorlevel 1 goto FAIL

echo [6/7] Browser end-to-end tests...
echo [6/7] Browser end-to-end tests...>>"%LOG%"
call npm.cmd run test:e2e >>"%LOG%" 2>&1
if errorlevel 1 goto FAIL

echo [7/7] Production build...
echo [7/7] Production build...>>"%LOG%"
call npm.cmd run build >>"%LOG%" 2>&1
if errorlevel 1 goto FAIL

echo.
echo ============================================================
echo ALL V5 VERIFICATION STEPS PASSED
echo ============================================================
echo Full log: %CD%\%LOG%
echo.
echo All steps passed on this computer. Save the log with your SIH submission evidence.
echo.
pause
exit /b 0

:FAIL
echo.
echo ============================================================
echo VERIFICATION FAILED at the last step shown above
echo ============================================================
echo Read the failed command output in:
echo %CD%\%LOG%
echo Keep the exact log when asking for debugging help.
echo.
pause
exit /b 1
