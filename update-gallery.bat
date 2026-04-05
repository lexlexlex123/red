@echo off
setlocal enabledelayedexpansion

echo Старт...
pause

cd /d "%~dp0"
echo Папка: %CD%
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: Node.js не найден
    pause
    exit /b 1
)
echo Node.js: OK

if not exist "images\build-index.js" (
    echo ОШИБКА: images\build-index.js не найден
    echo Текущая папка: %CD%
    dir images\ 2>nul || echo Папка images не существует
    pause
    exit /b 1
)
echo build-index.js: OK
echo.

echo Папки в images\:
for /d %%D in (images\*) do echo   - %%~nxD
echo.

echo Запуск генератора...
node images\build-index.js
echo Код завершения: %errorlevel%
echo.

if exist "images\image-index.js" (
    echo [OK] image-index.js создан
) else (
    echo [!!] image-index.js НЕ создан
)

if exist "images\image-cats.js" (
    echo [OK] image-cats.js создан
) else (
    echo [!!] image-cats.js НЕ создан
)

if exist "index.html" (
    findstr /C:"image-cats.js" index.html >nul 2>&1
    if errorlevel 1 (
        echo.
        echo Добавляем image-cats.js в index.html...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "$f=Get-Content 'index.html' -Raw -Encoding UTF8; $old='<script src=""images/image-index.js""></script>'; $new='<script src=""images/image-cats.js""></script>'+[char]10+'  <script src=""images/image-index.js""></script>'; if($f.Contains($old)){$f=$f.Replace($old,$new); Set-Content 'index.html' $f -Encoding UTF8 -NoNewline; Write-Host '[OK] index.html обновлен'}else{Write-Host '[--] Добавьте вручную'}"
    ) else (
        echo [OK] index.html уже содержит image-cats.js
    )
)

echo.
echo Готово! Нажмите F5 в браузере.
echo.
pause
