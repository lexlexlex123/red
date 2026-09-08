# Слайды — v8.2 (Vite + React)

Веб-редактор презентаций. **Автор:** Некрасов Александр

С v8 редактор — **Vite + React + Zustand** (холст, лента, панели). `legacy.html` + `js/` — автономная копия 7.x, не iframe.

---

## Быстрый старт

Нужен [Node.js](https://nodejs.org) 18+.

```bat
run.bat
```

или:

```bash
npm install
npm run dev
```

Откроется `http://127.0.0.1:8000/` (React-редактор).

Сборка production:

```bash
npm run build
npm run preview
```

AI-прокси GigaChat (опционально): `npm run server` (порт смотрите в `js/server.js`).

Legacy без React: откройте `legacy.html` через любой HTTP-сервер.

---

## Структура (v8)

```
slides/
├── index.html              — Vite entry (React)
├── legacy.html             — запасной vanilla-редактор (не iframe)
├── package.json / vite.config.js
├── src/
│   ├── main.jsx / App.jsx
│   ├── stores/             — Zustand (presentation, selection, history, ui)
│   ├── components/         — Ribbon, SlideCanvas, panels
│   ├── features/           — PWA + lazy loaders (MathJax, voice, AI…)
│   ├── shared/shapes.js    — общий buildShapeSVG для editor/export
│   └── export/             — HTML/PDF/PNG/ODP + playback entry
├── js/                     — legacy-модули (не используются React-путём)
├── css/styles.css
├── manifest.webmanifest
└── sw.js
```

---

## Архитектура

1. React: лента, холст (`SlideCanvas`), настройки, toast, виртуализированные thumbs
2. Zustand `presentationStore` — источник истины слайдов
3. Тяжёлые фичи — `import()` / dynamic script (`src/features/lazyFeatures.js`)
4. Playback — `src/export/playback.html`; HTML-экспорт — `src/export/standaloneHtml.js`; PPTX/ODP/PDF — JPEG-слайды

Подробнее: [CLAUDE.md](CLAUDE.md)

---

## PWA

Установка с HTTPS или `http://127.0.0.1`. File Handling — `.slides.json` / HTML в `manifest.webmanifest`. После смены манифеста переустановите приложение.
