# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# claude.md — Документация проекта «Слайды»

## Обзор

**«Слайды»** — презентационный редактор, работающий в одном HTML-файле (или модульно).
Не требует сервера, сборки или интернета. Открывается напрямую в браузере.

- **Версия:** v6.1
- **Автор:** Некрасов Александр
- **Стек:** Vanilla JS + HTML + CSS, без фреймворков
- **Зависимости:** JSZip (офлайн), QRCode (офлайн), системные шрифты

---

## Запуск

Открыть `index.html` напрямую в браузере. Интернет не требуется.

Для корректной работы некоторых фич (CORS, SharedArrayBuffer) — через HTTP-сервер:
```
run.bat          # запускает python -m http.server 8000 и открывает браузер
```

После добавления новых изображений в `images/` — обновить индекс:
```
update-gallery.bat
```

---

## Структура файлов

```
project/
├── index.html              # Разметка интерфейса и порядок подключения скриптов
├── css/
│   └── styles.css          # Все стили приложения
├── config/                 # Конфигурационные модули (см. раздел ниже)
│   ├── canvas.js           # CFG_CANVAS — размер слайда, сетка
│   ├── animations.js       # CFG_ANIMATIONS — настройки анимаций
│   ├── themes.js           # CFG_THEMES — кастомные темы
│   ├── shapes.js           # CFG_SHAPES — кастомные/скрытые фигуры
│   ├── ui.js               # CFG_UI — тема, язык, undo-лимит
│   ├── persist.js          # CFG_PERSIST — ключ localStorage
│   └── loader.js           # Применяет все CFG_* к приложению
├── libs/
│   ├── jszip.min.js        # Импорт PPTX
│   ├── qrcode.min.js       # QR-аплет
│   └── mathjax/tex-svg.js  # MathJax 3 (офлайн)
└── js/
    ├── 00-i18n.js          # Локализация RU/EN, APP_VERSION='6.1', APP_NAME
    ├── 00-bus.js           # Шина событий Bus.emit / Bus.on
    ├── 00-guard.js         # window.guard.* прокси + Bus-обработчики
    ├── 01-state.js         # Глобальные переменные, THEMES[], SHAPES[], PALETTE[]
    ├── 02-applets.js       # Аплеты: generator/timer/clock/notes, темы, postMessage
    ├── 08-serialize.js     # _serializeAppletFromDom() для save()
    ├── 03-boot.js          # Инициализация, openColorPanel, магнитное выделение
    ├── 04-ui.js            # Handles overlay, drag, resize, rotation (DOMMatrix)
    ├── 05-backgrounds.js   # Фоны слайдов, setCustomBg()
    ├── 06-themes.js        # Применение тем, applyTheme, _resolveSchemeColor
    ├── 08-slides.js        # save(), addSlide(), dupSlide(), pickSlide()
    ├── 09-shapes.js        # buildShapeSVG, noFill, _applyShapeClipPath, updateShapeStyle
    ├── 10-animations.js    # Панель анимаций, качение/танец/плавание, _mkRepeatRow
    ├── 13-images.js        # mkEl() — создание DOM, pick(), desel()
    ├── 14-drag.js          # Перетаскивание, resize, isElSelf для noFill
    ├── 16-props.js         # syncProps(), setTS(), setTextVAlign(), sh-fill-section
    ├── 22-undo.js          # doUndo(), doRedo(), pushUndo()
    ├── 24-preview.js       # Показ, fireAnim, float/swing/dance на child wrapper
    ├── 26-export.js        # Экспорт в HTML (inline buildShapeSVG)
    ├── 27-persist.js       # saveState(), loadState(), localStorage
    ├── 28-multisel.js      # Множественное выделение, rubber-band + магнит
    ├── 33-objects.js       # Панель объектов, слои, z-order
    ├── 33b-autoplace.js    # autoPlaceAll() — автоматическая компоновка
    ├── 36-formula.js       # LaTeX-формулы через MathJax
    ├── 37-graph.js         # Графики Chart.js
    ├── 38-connectors.js    # Bezier-соединители
    ├── 41-lego.js          # LEGO: #lego-layer, slope/stair, коллизии, z-order
    ├── 44-group.js         # Группировка: groupSelected(), resize, вращение
    ├── 45-media.js         # Аудио/видео, триггеры
    └── 50-voice.js         # Голосовое управление (Web Speech API ru-RU)
```

Порядок загрузки скриптов в `index.html`: сначала все `js/*.js` (в числовом порядке),
затем `config/*.js` (по надобности), затем `config/loader.js`, затем `boot()`.

---

## Система конфигурации (config/)

Файлы в `config/` — независимые модули для настройки без правки ядра.
Каждый определяет `window.CFG_*` объект. `config/loader.js` применяет их все к приложению.

**Подключение:** добавить `<script>` теги в `index.html` перед `boot()`:
```html
<script src="config/canvas.js"></script>
<script src="config/loader.js"></script>
<script>boot();</script>
```

Каждый блок в `loader.js` обёрнут в `try/catch` — ошибка в одном конфиге не ломает другие.

Доступные конфиги:
| Файл | Объект | Что настраивает |
|------|--------|-----------------|
| `canvas.js` | `CFG_CANVAS` | Размер слайда, шаг сетки, snap |
| `animations.js` | `CFG_ANIMATIONS` | Доступные анимации, дефолты |
| `themes.js` | `CFG_THEMES` | Добавить/заменить встроенные темы |
| `shapes.js` | `CFG_SHAPES` | Кастомные фигуры, скрытие встроенных |
| `backgrounds.js` | `CFG_BACKGROUNDS` | Кастомные фоны |
| `ui.js` | `CFG_UI` | Тема (light/dark), язык, скрыть вкладки |
| `persist.js` | `CFG_PERSIST` | Ключ localStorage (`storageKey`) |
| `pagenum.js` | `CFG_PAGENUM` | Нумерация слайдов по умолчанию |
| `applets.js` | `CFG_APPLETS` | Кастомные HTML-аплеты |

---

## Ключевые архитектурные решения

### Источник истины
`slides[cur].els[]` — массив объектов данных. DOM — только отображение.
`save()` в `08-slides.js` синхронизирует DOM → данные перед каждым сохранением.

### Создание элементов
`mkEl(d)` в `13-images.js` — единственная точка создания DOM из данных.
Вызывается при загрузке слайда и вставке нового элемента.
Для lego: `window.mkEl` патчится в `41-lego.js` → lego-элементы идут в `#lego-layer`.

### Выделение
`sel` — текущий выделенный элемент (глобальная `let`).
`multiSel` (Set) — множественное выделение.
`pick(el)` — выбор элемента, обновляет handles и панель свойств.
`desel()` — снимает выделение.

### Магнитное выделение (v5.8)
В `03-boot.js` и `28-multisel.js`: клик на пустом холсте проверяет ближайший элемент
через расстояние от точки до прямоугольника. Радиус притяжения — 40px.
В `14-drag.js`: `isElSelf = e.target === el` — разрешает drag на самом div (для noFill фигур).

### Handles overlay
`#handles-overlay` — div поверх canvas.
`_updateHandlesOverlay()` в `04-ui.js` — читает реальный угол через `new DOMMatrix(getComputedStyle(el).transform)`.
Обновляется во время вращения (временно снимается `_rotDragging`).

### noFill фигуры (v5.8)
В `01-state.js`: `{id:'line', noFill:true}`, `{id:'wave', noFill:true}`.
В `buildShapeSVG`: `_noFill = sh.noFill` → `fill='none'`.
В `_applyShapeClipPath`: noFill → bounding-box hit area без clip-path.
В `16-props.js` `syncProps()`: `#sh-fill-section` скрывается для noFill фигур.

### LEGO-слой (v5.8)
`#lego-layer` div в canvas с `z-index:2`. Обычные `.el` имеют `z-index:3` через CSS.
`_refreshAllZOrders()` в `41-lego.js` сортирует детали по Y внутри слоя и вставляет
выделенную деталь последней. Slope/stair занимают 3 ряда высоты в системе коллизий.

### Голосовое управление (v5.8)
`50-voice.js` — автономный модуль, `window.toggleVoiceControl(btn)`.
`_normalize(raw)` — маппинг повелительных форм на канонические команды через список regex.
`_lastCtx` — контекст последней команды для «следующий»/«предыдущий».
`_unknownCmds[]` — журнал нераспознанных команд, кнопка 📋 в ленте.
Web Speech API `continuous=true`, автоперезапуск с debounce 200мс.

### Анимация «Плавание» (v5.8)
В `10-animations.js`, `24-preview.js`, `26-export.js`.
Алгоритм: суперпозиция 3 синусоид с целочисленными частотами [1,2,3] → бесшовный loop.
32 кейфрейма с `easing:ease-in-out`. Амплитуда 6% от размеров объекта.
Работает на `._float_wrap` wrapper — не затрагивает `transform` родительского `el`.

### Предпросмотр анимаций (v5.8)
Swing/dance/float запускаются на дочернем `.ec` или wrapper — не перекрывают `transform:rotate(Xdeg)` элемента.
`_mkRepeatRow()` — общая функция для панели настроек повторений: поле + tog-переключатель.
`stopPropagation` на mousedown+click предотвращает сворачивание панели аnim-row.

---

## Важные паттерны

### Сохранение нового свойства фигуры
1. `updateShapeStyle(prop, val)` в `09-shapes.js` — добавить `else if(prop==='newProp')`
2. `save()` в `08-slides.js` — добавить `d.newProp = el.dataset.newProp`
3. `mkEl()` в `13-images.js` — `el.dataset.newProp = d.newProp`
4. `syncProps()` в `16-props.js` — обновить UI
5. `buildShapeSVG()` — использовать `d.newProp`

### Добавление стиля в экспорт
После изменения `buildShapeSVG` в `09-shapes.js` обновить встроенную версию
в `26-export.js`. Использовать `str_replace` — Python/shell экранируют backslash.

### Глобальные let-переменные
`selTheme`, `sel`, `cur`, `slides` и т.д. объявлены через `let` в глобальном скоупе
(не через `var`) — они **не попадают** в `window.*`. Присваивать напрямую: `selTheme = i`.

### Голосовые команды — добавить новую
1. В `_normalize()` добавить regex → каноническое имя
2. В `_handleCommand()` добавить `if (t === 'каноническое имя') { ... return; }`
3. Обновить список команд в `_buildPropsPanel()`

---

## Известные особенности

- `el.dataset.*` — строки. Числа парсить через `+` или `parseInt/parseFloat`
- `save()` перезаписывает `slides[cur].els` из DOM — несохранённые изменения теряются
- `_updateHandlesOverlay()` вызывать после любого изменения позиции/размера/поворота
- В экспортируемом HTML regex в `<script>` — используй `split(' ')` вместо `\d`, `\s`
- `let selTheme` — не `window.selTheme`, присваивать напрямую
- noFill фигуры: `shape-hit-area` без clip-path → весь bbox кликабелен
- Float анимация: частоты [1,2,3] обязательны для бесшовного loop
