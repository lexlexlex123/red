#!/usr/bin/env bash
# Запуск HTTP-сервера для редактора — работает из любого места (путь берётся от расположения скрипта).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-8000}"
URL="http://127.0.0.1:${PORT}/"

cd "$ROOT"

open_browser() {
  xdg-open "$URL" 2>/dev/null || sensible-browser "$URL" 2>/dev/null || true
}

if command -v node >/dev/null 2>&1; then
  echo "Запуск редактора с AI-прокси (GigaChat)..."
  echo "Корень проекта: ${ROOT}"
  echo "Сервер: ${URL}"
  echo "Остановка: Ctrl+C"
  echo
  trap 'echo; echo "Сервер остановлен."' EXIT INT TERM
  exec node js/server.js
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Ошибка: нужен Node.js (для GigaChat) или Python 3."
  read -r -p "Нажмите Enter…"
  exit 1
fi

echo "Node.js не найден — запуск без AI-прокси."
echo "Для GigaChat установите Node.js: https://nodejs.org"
echo "Корень проекта: ${ROOT}"
echo "Сервер: ${URL}"
echo "Остановка: Ctrl+C"
echo

(sleep 0.8 && open_browser) &

trap 'echo; echo "Сервер остановлен."' EXIT INT TERM
exec python3 -m http.server "$PORT" --bind 127.0.0.1
