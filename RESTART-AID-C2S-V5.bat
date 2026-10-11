@echo off
call "%~dp0STOP-AID-C2S-V5.bat"
timeout /t 2 /nobreak >nul
call "%~dp0START-AID-C2S-V5.bat"
