# SlideForge Pro — Документация проекта

## Текущая версия: v4.6

> Презентационный редактор в одном HTML-файле (или разбитый на модули).
> Работает без сервера, без сборки — просто открой `index.html` в браузере.

---

## Структура проекта

```
slideforge/
├── index.html              # HTML-разметка (без JS и CSS)
├── css/
│   └── styles.css          # Весь CSS (363 строки)
└── js/
    ├── 01-state.js         # Глобальные переменные и константы
    ├── 02-applets.js       # HTML-генераторы встроенных виджетов + APPLETS[]
    ├── 03-boot.js          # Инициализация, boot()
    ├── 04-ui.js            # Сетка, табы, snap/guides, aspect ratio
    ├── 05-backgrounds.js   # Фоны слайдов
    ├── 06-themes.js        # Темы оформления
    ├── 07-transitions.js   # Переходы между слайдами
    ├── 08-slides.js        # CRUD слайдов, save(), load()
    ├── 09-shapes.js        # Фигуры, SVG, апплеты
    ├── 10-animations.js    # Панель анимаций элементов
    ├── 11-elements.js      # Создание/рендер элементов, code blocks
    ├── 12-markdown.js      # Markdown-элементы
    ├── 13-images.js        # Свойства изображений
    ├── 14-drag.js          # Drag & resize элементов
    ├── 15-align.js         # Выравнивание и распределение
    ├── 16-props.js         # syncProps(), панель свойств, text role
    ├── 17-text.js          # Форматирование текста, border, radius, pipette
    ├── 19-hover.js         # Hover-эффекты элементов
    ├── 20-thumbnails.js    # Миниатюры слайдов
    ├── 21-keyboard.js      # Горячие клавиши
    ├── 22-undo.js          # Undo / Redo
    ├── 23-layout.js        # Layout-декораторы слайдов
    ├── 24-preview.js       # Режим презентации (preview)
    ├── 25-links.js         # Модал ссылок на слайды/URL
    ├── 26-export.js        # Экспорт HTML, импорт PPTX
    ├── 27-persist.js       # localStorage, утилиты, настройки
    └── 28-multisel.js      # Multi-select, rubber-band, group copy/paste
```

> **Важно:** нумерация = порядок загрузки скриптов. Не менять порядок `<script>` тегов в `index.html`.
> `18-` пропущена намеренно (pipette входит в `17-text.js`).

---

## Размеры файлов

| Файл | Строк | Что содержит |
|------|------:|--------------|
| `index.html` | 800 | Вся HTML-разметка редактора |
| `css/styles.css` | 363 | Все стили |
| `js/01-state.js` | 64 | `SNAP`, `slides`, `sel`, `BGS`, `THEMES`, `SHAPES`, `PALETTE` |
| `js/02-applets.js` | 18 | `getCalcHTML()`, `getClockHTML()`, ..., `APPLETS[]` |
| `js/03-boot.js` | 131 | `boot()`, `buildSwatches()`, `buildThemeGrid()`, `buildShapeGallery()` |
| `js/04-ui.js` | 69 | `drawGrid()`, `switchTab()`, `snapV()`, `showGuides()`, `setAR()` |
| `js/05-backgrounds.js` | 17 | `applyBgId()`, `setCustomBg()`, `loadBg()` |
| `js/06-themes.js` | 91 | `applyTheme()`, `openThemeModal()` |
| `js/07-transitions.js` | 14 | `setGlobalTrans()`, `setSlideTrans()`, `applyTransToAll()` |
| `js/08-slides.js` | 82 | `addSlide()`, `delSlide()`, `save()`, `load()`, `pickSlide()` |
| `js/09-shapes.js` | 115 | `insertShapeSelected()`, `buildShapeSVG()`, `insertSVG()`, `insertApplet()` |
| `js/10-animations.js` | 169 | `openAnimPanel()`, `renderAnimPanel()`, `addAnimToSel()` |
| `js/11-elements.js` | 131 | `createElement()`, `renderEl()`, `addTextEl()`, `addCodeEl()` |
| `js/12-markdown.js` | 83 | `addMarkdownEl()`, `parseMarkdown()`, `updateMarkdown()` |
| `js/13-images.js` | 220 | `addImageEl()`, `syncImgProps()`, `setImgFit()`, `setImgFilter()` |
| `js/14-drag.js` | 70 | `startDrag()`, `startResize()`, обработчики mousemove/mouseup |
| `js/15-align.js` | 72 | `alignEl()`, `distributeEls()`, snap-to-grid при выравнивании |
| `js/16-props.js` | 249 | `syncProps()`, `setTS()`, `setTextPadding4()`, `toggleFmt()` |
| `js/17-text.js` | 155 | `setTextBg()`, `setTextBorder()`, `setTextRole()`, `copyElStyle()` |
| `js/19-hover.js` | 108 | `applyHoverFx()`, `syncHoverFxUI()`, пресеты hover |
| `js/20-thumbnails.js` | 278 | `drawThumbs()`, `buildThumbSlide()`, drag слайдов в панели |
| `js/21-keyboard.js` | 82 | `keydown` handler: Delete, Ctrl+Z/Y/C/V/D, стрелки, F5 |
| `js/22-undo.js` | 14 | `pushUndo()`, `redo()`, `saveState()` |
| `js/23-layout.js` | 288 | `applyLayoutDecor()`, `buildLayoutGrid()`, шаблоны слайдов |
| `js/24-preview.js` | 368 | `startPreview()`, `buildPSlide()`, `scheduleAuto()`, `animTrans()` |
| `js/25-links.js` | 30 | `openLinkModal()`, `applyLink()`, `removeLink()` |
| `js/26-export.js` | 176 | `exportHTML()`, `buildExportHTML()`, `importPPTX()` |
| `js/27-persist.js` | 43 | `saveState()`, `loadState()`, `toast()`, `openSettings()` |
| `js/28-multisel.js` | 161 | `startRubberBand()`, `clearMultiSel()`, `groupCopy()`, `groupPaste()` |

---

## История изменений

### v4.6 — текущая (2026-03-02)
**Рефакторинг: монолит → модули**
- Разбит единый `slideforge-pro.html` (4438 строк) на 27 JS-файлов + CSS + HTML
- Устранён баг: `APPLETS[]` перенесён в конец `02-applets.js` (ранее вызывал `ReferenceError: getCalcHTML is not defined`)
- Устранён баг: закрывающая `}` блока `if(t==='text')` в `syncProps()` — shape/image/code/markdown свойства не синхронизировались при выборе не-текстовых элементов

### v4.5 (2026-03-01)
**7 новых фич:**
- **4-сторонние отступы текста** — раздельные поля Top/Right/Bottom/Left вместо одного Padding (`16-props.js`)
- **Markdown и Code Block в режиме презентации** — был баг: `color:inherit` давало невидимый текст, исправлено на `color:#ffffff` (`24-preview.js`, `26-export.js`)
- **textBg после возврата из превью** — фон текста пропадал после закрытия презентации; добавлен явный `requestAnimationFrame` restore в `stopPreview()` (`24-preview.js`)
- **Loop: последний слайд → первый** — авто-переход с последнего слайда на первый при включённом Loop (`24-preview.js`)
- **Shuffle не повторяет текущий слайд** — фильтрация `i !== pidx` при random pick (`24-preview.js`)
- **Кнопки Loop/Shuffle обновляют UI** — `updatePUI()` вызывается сразу при toggle (`24-preview.js`)
- **Heading → Body снимает Bold** — `setTextRole('body')` выставляет `font-weight:400` (`17-text.js`)

### v4.4 (2026-03-01)
- **Code theme auto-sync с темой слайда** — при смене темы code blocks автоматически меняют цветовую схему (`23-layout.js`)
- **Z-index ручек resize** — ручки изменения размера теперь поверх всех элементов (`14-drag.js`)

### v4.3 и ранее
- Базовый функционал: текст, фигуры, изображения, SVG, апплеты
- Markdown и Code Block элементы
- Hover-эффекты, анимации входа/выхода/click
- Multi-select с rubber-band
- Экспорт в автономный HTML, импорт PPTX (базовый)
- 12 тем, 15+ фонов, layout-декораторы
- Undo/Redo, горячие клавиши
- Режим презентации с переходами (fade, slide, zoom, morph)

---

## Ключевые зависимости между файлами

```
01-state.js         ← базовые переменные, нет зависимостей
02-applets.js       ← нет зависимостей, объявляет APPLETS[]
03-boot.js          ← зависит от всего (вызывает build* функции)
08-slides.js        ← save()/load() используются везде
16-props.js         ← syncProps() вызывается из drag, keyboard, elements
20-thumbnails.js    ← drawThumbs() вызывается после каждого изменения слайда
24-preview.js       ← buildPSlide() использует данные из 01-state (SHAPES, BGS)
26-export.js        ← buildExportHTML() копирует логику buildPSlide()
```

---

## Как добавить новую фичу

1. Определить в какой файл логически входит изменение (см. таблицу выше)
2. Если новый логический блок — создать новый `NN-name.js` и добавить `<script src="js/NN-name.js">` в `index.html` **в нужном порядке**
3. Глобальные переменные → `01-state.js`
4. После изменения данных слайда всегда вызывать: `save()` → `drawThumbs()` → `saveState()`
5. После изменения выделенного элемента: `save()` → `syncProps()`

---

## Монолитная версия

Файл `slideforge-pro.html` — полная однофайловая сборка (для деплоя или шаринга).
При изменении модулей нужно вручную перенести правки в монолит (или написать build-скрипт).

### Быстрая сборка монолита из модулей
```bash
python3 build.py   # TODO: написать
```
