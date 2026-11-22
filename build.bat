@echo off
cd /d "%~dp0"
echo.
echo  Слайды — сборка dist/
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

call npm run build
if %errorlevel% neq 0 (
  echo Сборка не удалась
  pause
  exit /b 1
)

echo.
echo  Готово: папка dist\ ^(audio, prezi, sw.js, .htaccess и т.д.^)
echo.
pause
