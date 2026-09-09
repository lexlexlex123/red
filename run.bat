@echo off
cd /d "%~dp0"
echo.
echo  Слайды — Vite + React ^(v8^)
echo.
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo Node.js не найден. Установите: https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\vite" (
  echo Установка зависимостей npm...
  call npm install
  if %errorlevel% neq 0 (
    echo npm install не удался
    pause
    exit /b 1
  )
)

echo Запуск Vite на http://127.0.0.1:8000/
echo ^(для GigaChat AI-прокси отдельно: npm run server^)
echo.
call npm run dev
