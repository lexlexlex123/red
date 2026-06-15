@echo off
cd /d "%~dp0"
echo.
echo  Слайды — GigaChat AI ^(не Groq^)
echo.
where node >nul 2>&1
if %errorlevel%==0 (
  echo Запуск редактора с AI-прокси GigaChat...
  echo ^(галерея images обновится при старте сервера^)
  node js\server.js
) else (
  echo Node.js не найден — запуск без AI-прокси.
  echo Для GigaChat установите Node.js: https://nodejs.org
  start http://127.0.0.1:8000/
  python -m http.server 8000 --bind 127.0.0.1
)
