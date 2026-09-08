@echo off
cd /d "%~dp0"
echo Updating fonts from fonts\ ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0download-fonts.ps1" -NoPause
if errorlevel 1 (
  echo FAILED
  pause
  exit /b 1
)
echo.
echo Done. Refresh the browser (F5).
pause
