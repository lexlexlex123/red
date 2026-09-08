# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# claude.md — Документация проекта «Слайды»

## Обзор

**«Слайды»** — презентационный редактор.

- **Версия:** v8.2 (Vite + React)
- **Автор:** Некрасов Александр
- **Стек:** React 18 + Zustand + Vite; `js/` + `legacy.html` — запасной vanilla-редактор
- **Зависимости:** npm (react, zustand, vite); offline libs в `libs/`

## Запуск

```
npm install
npm run dev          # http://127.0.0.1:8000/
run.bat              # то же на Windows
npm run build        # dist/ + copy static assets
```

Legacy-only: `legacy.html` через HTTP.

## Архитектура v8

- **React** (`src/`): оболочка, холст (`SlideCanvas`), stores, thumbs, панели, экспорт HTML/PDF/PNG/ODP/PPTX, импорт PPTX/PPT/ODP
- **Источник истины презентации:** Zustand `presentationStore` + `sf_react_v1` / IndexedDB
- **Legacy** (`legacy.html` + `js/`): автономная копия для совместимости; React больше не встраивает iframe

### Правила производительности

1. Не вызывать полный re-render thumbs на каждый edit — только `save` / `commit` / смена слайда
2. Thumbs виртуализированы (`ThumbStrip`)
3. MathJax / PPTX / AI / voice / WebGL themes — lazy (`src/features/lazyFeatures.js`, host document)
4. Playback entry отдельно: `src/export/playback.html`
5. Shared shapes: `src/shared/shapes.js` (React editor + `standaloneHtml` / playback)

## Конфиг

`config/*.js` → `window.CFG_*` в legacy. React читает данные из `src/editor/*` и `themes/`.

## Миграция — следующие шаги

Импорт binary `.ppt` / ODP, панель «Вставка», chem/logic и нативный PPTX уже в React. Цитата / QR / LEGO вставляются из модалки аплетов и с вкладки «Вставка». Таблица — сетка размера как в v7.1. Визуальный таймлайн анимаций на ленте (вкладка «Анимации»). Вкладка «Показ»: авто-переход, цикл, случайный порядок, футер / стрелки / Esc. Двойной щелчок по вкладке сворачивает ленту (Import/Export остаются). Вкладка «Переходы»: сетка 2 ряда, длительность, «ко всем». Показ: F5 сразу на весь экран; цифры — переход к слайду; L/S — цикл/случайно. Лента: левая вкладка поверх правой; мягкая drop-shadow только вправо (без второй тени слева). Поиск и замена по слайдам (Ctrl+F / Ctrl+H). На Главной — копирование стиля и кисть стиля. AI: GigaChat и in-browser WebLLM. Дальше: меньше дублей в `js/26-export.js`.
