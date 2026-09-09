@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo === Обновление списка звуков (audio/) ===
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: Node.js не найден. Установите Node.js и повторите.
    pause
    exit /b 1
)

if not exist "audio\build-list.js" (
    echo ОШИБКА: audio\build-list.js не найден
    pause
    exit /b 1
)

if not exist "audio" mkdir audio

echo Запуск: node audio\build-list.js
node audio\build-list.js
echo Код завершения: %errorlevel%
echo.

if exist "audio\audio-list.js" (
    echo [OK] audio\audio-list.js создан
) else (
    echo [!!] audio\audio-list.js НЕ создан
)

echo.
echo Положите музыку в папку audio\ и снова запустите этот батник.
echo Затем обновите страницу в браузере (F5).
echo.
pause
