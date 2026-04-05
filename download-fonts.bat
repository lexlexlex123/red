@echo off
cd /d "%~dp0"
echo Запуск загрузки шрифтов...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0download-fonts.ps1" -ProjectDir "%~dp0"
pause
