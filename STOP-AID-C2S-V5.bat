@echo off
setlocal EnableExtensions
title AID-C2S V5 - Stop
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-v5.ps1"
echo.
echo AID-C2S V5 stop request completed.
pause
endlocal
