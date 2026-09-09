@echo off
cd /d "%~dp0\.."
if not exist "icons\icon-192.png" (
  echo icons\icon-192.png not found
  exit /b 1
)
copy /Y "icons\icon-192.png" "icon-192.png"
copy /Y "icons\icon-512.png" "icon-512.png"
if exist "icons\icon.svg" copy /Y "icons\icon.svg" "icon.svg"
echo PWA icons synced to site root (icon-192.png, icon-512.png, icon.svg)
