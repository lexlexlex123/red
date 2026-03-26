#!/bin/bash

PORT=8000
URL="http://localhost:$PORT"

echo "🚀 Запуск локального сервера..."

# Запускаем сервер в фоне
python3 -m http.server $PORT &
SERVER_PID=$!

# Ждем немного чтобы сервер успел запуститься
sleep 1

# Открываем браузер
xdg-open $URL

echo "✅ Сервер запущен: $URL"
echo "📁 PID сервера: $SERVER_PID"
echo "⛔ Для остановки нажмите Ctrl+C или выполните: kill $SERVER_PID"

# Ждем завершения сервера
wait $SERVER_PID