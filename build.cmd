@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if not exist "node_modules\vite\package.json" (
  call npm.cmd install
  if errorlevel 1 goto FAIL
)
call npm.cmd run build
if errorlevel 1 goto FAIL
echo.
echo Production build passed.
pause
exit /b 0
:FAIL
echo.
echo Build failed. Copy the full error output before closing.
pause
exit /b 1
