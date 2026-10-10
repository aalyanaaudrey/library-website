@echo off
title Alyana - AutoSync to GitHub
cd /d "%~dp0"

echo.
echo   Watching for changes in: %CD%
echo   Every change is committed and pushed to GitHub.
echo   Press Ctrl+C to stop.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0autosync.ps1"

echo.
echo   AutoSync stopped.
pause
