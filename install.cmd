@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\install-windows.ps1"
if errorlevel 1 (
  echo.
  echo Installation failed. See the message above, or run check.cmd.
  pause
  exit /b 1
)
echo.
echo Installation completed. Fully exit Codex, then use the new desktop shortcut.
pause
