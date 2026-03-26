# claude.md — Документация проекта «Слайды»

## Обзор

**«Слайды»** — презентационный редактор, работающий в одном HTML-файле (или модульно).
Не требует сервера, сборки или интернета. Открывается напрямую в браузере.

- **Версия:** v5.7
- **Автор:** Некрасов Александр
- **Стек:** Vanilla JS + HTML + CSS, без фреймворков
- **Зависимости:** JSZip (офлайн), QRCode (офлайн), системные шрифты

---

## Структура файлов

```
project/
├── index.html              # Разметка интерфейса
├── css/
│   └── styles.css          # Все стили приложения
├── libs/
│   ├── jszip.min.js        # Импорт PPTX
│   ├── qrcode.min.js       # QR-аплет
│   └── mathjax/
│       └── tex-svg.js      # MathJax 3 (офлайн)
└── js/
    ├── 00-i18n.js          # Локализация RU/EN, APP_VERSION, APP_NAME
    ├── 00-icons.js         # Базовые SVG-иконки
    ├── 01-state.js         # Глобальные переменные, THEMES[], SHAPES[], PALETTE[]
    ├── 02-theme-data.js    # Данные цветовых тем
    ├── 03-boot.js          # Инициализация, openColorPanel (Photoshop HSV picker)
    ├── 04-ui.js            # Handles, drag, resize, rotation (_rotEl, _getRotCorners)
    ├── 05-snap.js          # Snap к объектам и направляющим
    ├── 06-themes.js        # Применение тем, applyTheme, _resolveSchemeColor
    ├── 07-text.js          # Форматирование текста, rtFontSize, setTS
    ├── 08-slides.js        # save(), addSlide(), dupSlide(), переключение слайдов
    ├── 09-shapes.js        # buildShapeSVG, скругление углов, стили границ, updateShapeStyle
    ├── 10-animations.js    # Панель анимаций, renderAnimPanel, playAnimOnEl
    ├── 11-export-pptx.js   # Экспорт PPTX
    ├── 12-import.js        # Импорт PPTX/JSON
    ├── 13-images.js        # mkEl() — создание DOM-элементов из данных
    ├── 14-connectors.js    # Bezier-соединители
    ├── 15-align.js         # Выравнивание (alignEl, distributeEls) — поддержка групп
    ├── 16-props.js         # syncProps() — синхронизация панели свойств
    ├── 17-text.js          # setTextBorder, applyTextBorderStyle, пипетка
    ├── 18-motion.js        # Движение: moveTo, orbitTo, swing
    ├── 19-hover.js         # Hover-эффекты
    ├── 20-layout.js        # Авторазмещение, autoPlaceAll
    ├── 21-ai.js            # AI-генерация слайдов
    ├── 22-version.js       # История автосохранений
    ├── 23-qr.js            # QR-аплет
    ├── 24-preview.js       # Предпросмотр презентации, fireAnim
    ├── 25-generator.js     # Генератор
    ├── 26-export.js        # Экспорт в HTML (buildShapeSVG, _expRndPath и др.)
    ├── 28-multisel.js      # Множественное выделение
    ├── 40-images-modal.js  # Галерея изображений
    ├── 41-shapes-modal.js  # Галерея фигур
    ├── 42-icons-modal.js   # Галерея иконок
    ├── 43-table.js         # Таблицы
    └── 44-group.js         # Группировка: resize, вращение, выравнивание групп
```

---

## Ключевые архитектурные решения

### Источник истины
`slides[cur].els[]` — массив объектов данных. DOM — только отображение.
`save()` в `08-slides.js` синхронизирует DOM → данные перед каждым сохранением.

### Создание элементов
`mkEl(d)` в `13-images.js` — единственная точка создания DOM из данных.
Вызывается при загрузке слайда, смене слайда и вставке нового элемента.

### Выделение
`sel` — текущий выделенный элемент (глобальная переменная).
`multiSel` (Set) — множественное выделение.
`pick(el)` — выбор элемента, обновляет handles и панель свойств.

### Handles overlay
`#handles-overlay` — абсолютно позиционированный div поверх canvas.
`_updateHandlesOverlay()` в `04-ui.js` — перерисовывает handles при изменении sel.
Для групп: `_renderGroupHandles()` в `44-group.js`.

### Цветовая схема
`openColorPanel(panelId, mode, onPick)` — открывает Photoshop-style HSV пикер.
`_resolveSchemeColor(schemeRef, theme)` — разрешает {col, row} → hex-цвет.
Scheme refs сохраняются в `d.fillScheme`, `d.strokeScheme`, `d.shapeTextColorScheme` и т.д.

### Стили границы фигур
`buildShapeSVG(d, w, h)` в `09-shapes.js`:
- solid/dashed/dotted — через SVG stroke-dasharray + pathLength (равномерно)
- double — два SVG элемента
- wave/zigzag — `_complexPathWave()` сэмплирует контур через `getTotalLength()/getPointAtLength()`
- Скругление — `_roundedPolygonPath()` + `_extractPolygonPts()` — кубические Bezier в вершинах

### Экспорт
`26-export.js` содержит шаблонную строку HTML. Функции `_expRndPath`, `_expExtPts`,
`_expPerim`, `_expEvenDash`, `_expWave`, `buildShapeSVG` встроены прямо в шаблон.
**Важно:** scaling path использует `split(' ')` вместо regex — HTML-парсер браузера
может изменять backslash в regex внутри `<script>` тегов.

### Группировка (44-group.js)
- `groupId` в dataset и данных — связывает элементы группы
- `_renderGroupHandles()` — рисует общий bbox с 8 resize-handles и 4 зонами вращения
- `_startGroupResize()` — пропорциональное масштабирование всех элементов
- `_startGroupRotation()` — вращение всех элементов вокруг центра bbox
- `alignEl()` в `15-align.js` — расширяет targets до всей группы, двигает как единицу

---

## Важные паттерны

### Сохранение нового свойства фигуры
1. `updateShapeStyle(prop, val)` в `09-shapes.js` — добавить `else if(prop==='newProp')`
2. `save()` в `08-slides.js` — добавить `d.newProp = el.dataset.newProp`
3. `mkEl()` в `13-images.js` — `el.dataset.newProp = d.newProp`
4. `syncProps()` в `16-props.js` — обновить UI при выборе элемента
5. `buildShapeSVG()` — использовать `d.newProp`

### Добавление стиля в экспорт
После изменения `buildShapeSVG` в `09-shapes.js` нужно обновить встроенную версию
в `26-export.js` (функции после маркера `_expRndPath`). Использовать `str_replace`
инструмент — Python/Node/shell экранируют backslash в regex при записи строк.

### Цветовая схема для нового свойства
1. В `onPick` callback передавать `sr` (schemeRef) и сохранять в `d.propScheme`
2. В `applyTheme()` в `06-themes.js` добавить блок `_resolveSchemeColor(el.propScheme, theme)`

---

## Известные особенности

- `el.dataset.*` — строки. Числа нужно парсить через `+` или `parseInt/parseFloat`
- `save()` перезаписывает `slides[cur].els` из DOM — все несохранённые изменения теряются
- `_updateHandlesOverlay()` вызывается после любого изменения позиции/размера
- Для групп `_rotEl` не используется — вращение через прямые mousedown-обработчики в overlay
- В экспортируемом HTML regex в `<script>` — используй `split(' ')` вместо `\d`, `\s`
