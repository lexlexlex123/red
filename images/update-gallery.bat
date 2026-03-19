@echo off
cd /d "%~dp0\.."
node images/build-index.js
pause
