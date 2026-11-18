@echo off
chcp 65001 >nul
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-win.ps1"
set "EXIT_CODE=%ERRORLEVEL%"
if "%~1" neq "--no-pause" pause
exit /b %EXIT_CODE%
