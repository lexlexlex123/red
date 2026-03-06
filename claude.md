# claude.md — Документация проекта «Слайды»

## Обзор

**«Слайды»** — презентационный редактор, работающий в одном HTML-файле (или модульно).
Не требует сервера, сборки или интернета. Открывается напрямую в браузере.

- **Версия:** v4.9
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
│   └── qrcode.min.js       # QR-аплет
└── js/
    ├── 00-i18n.js          # Локализация RU/EN
    ├── 00-icons.js         # Базовые SVG-иконки
    ├── 01-state.js         # Глобальные переменные, THEMES[], SHAPES[], PALETTE[]
    ├── 02-applets.js       # Встроенные виджеты (APPLETS[])
    ├── 02b-icons.js        # Расширенная библиотека иконок
    ├── 03-boot.js          # boot(), инициализация, openColorPanel(), buildThemeGrid()
    ├── 04-ui.js            # Сетка, табы, snap/guides, aspect ratio
    ├── 05-backgrounds.js   # Фоны слайдов, setSlideBgFromPalette(), resetSlideBgToTheme()
    ├── 06-themes.js        # Применение цветовых схем, _resolveSchemeColor()
    ├── 07-transitions.js   # Переходы между слайдами
    ├── 08-slides.js        # CRUD слайдов, save(), load()
    ├── 09-shapes.js        # Фигуры и SVG, updateShapeStyleScheme()
    ├── 10-animations.js    # Анимации элементов
    ├── 11-elements.js      # Создание/рендер элементов, code blocks, refreshAllCodeBlocks()
    ├── 12-markdown.js      # Markdown-блоки на слайде
    ├── 13-images.js        # Изображения, mkEl(), stopTextEditing()
    ├── 14-drag.js          # Перетаскивание и ресайз
    ├── 15-align.js         # Выравнивание и распределение элементов
    ├── 16-props.js         # Панель свойств, setTextBg(), setTextBgBlur(), applyTextBg()
    ├── 17-text.js          # Редактирование текста, setTextBorder()
    ├── 19-hover.js         # Hover-эффекты
    ├── 20-thumbnails.js    # Миниатюры слайдов, renderAll()
    ├── 21-keyboard.js      # Горячие клавиши
    ├── 22-undo.js          # Undo/Redo (до 40 шагов)
    ├── 23-layout.js        # Декоратор готовых макетов (кнопка «Тема»)
    ├── 24-preview.js       # Режим показа, startPreview() / stopPreview()
    ├── 25-links.js         # Ссылки-навигация на элементах
    ├── 26-export.js        # Экспорт HTML, импорт PPTX
    ├── 27-persist.js       # save() / saveState() / commitAll() / loadState()
    ├── 28-multisel.js      # Множественное выделение
    ├── 29-icons.js         # buildIconSVG()
    ├── 30-rich-text.js     # Rich text: rtColor(color, schemeRef), _charObjsToHtml(), data-scheme
    ├── 31-table.js         # Таблицы, tblDelRow(), tblDelCol(), tblSetCellFs()
    ├── 32-scrubber.js      # Скруббер временной шкалы
    └── 33-pagenum.js       # Нумерация страниц, pnSettings, pnApplyAll()
```

---

## Архитектура сохранения (`js/27-persist.js`)

```
save()       — DOM → slides[cur].els      (только память, без I/O)
saveState()  — slides[] → localStorage   (только I/O, без чтения DOM)
commitAll()  — save() + drawThumbs() + saveState()
```

**Правило для разработчика:**
- После любого пользовательского действия вызывать `commitAll()`
- `saveState()` без `save()` — только когда DOM не затронут (переходы, undo, импорт)
- Перед запуском показа (F5) всегда вызывать `commitAll()`

> ⚠️ **Важно:** `save()` пересоздаёт объекты `d` в `slides[cur].els` с нуля из DOM.
> Любые поля данных, которые не хранятся в `dataset` элемента, должны явно
> копироваться из `oldElsById[d.id]` в начале `map()`. Сейчас так сохраняются:
> `textColorScheme`, `textBgScheme`, `borderScheme`, `fillScheme`, `strokeScheme`.

---

## Глобальное состояние (`js/01-state.js`)

```js
let slides = [], cur = 0, sel = null;
let canvasW = 1200, canvasH = 675;
let ar = '16:9';
let multiSel = new Set(), clipboard = [];
let globalTrans = 'none', transitionDur = 500, autoDelay = 5;
let undoStack = [], redoStack = [];
let appliedThemeIdx = -1;   // индекс активной цветовой схемы в THEMES[]
```

---

## Терминология (v4.8+)

| Кнопка в интерфейсе | Было (v4.7) | Стало (v4.8) |
|---------------------|-------------|--------------|
| Левая панель — кнопка палитры | «Theme» / «Тема» | «Color Scheme» / «Цветовая схема» |
| Левая панель — кнопка макета | «Layout» / «Макет» | «Theme» / «Тема» |

---

## Цветовые схемы (`js/01-state.js`, `js/06-themes.js`)

### Структура THEMES[]

38 схем — каждая содержит явный массив из 8 цветов:

```js
{
  name: 'Ocean Night',
  dark: true,
  bg: 'linear-gradient(135deg,#0f0c29,#302b63)',
  ac1, ac2, ac3,
  shapeFill, shapeStroke,
  headingColor, bodyColor,
  colors: ['#818cf8','#c7d2fe','#34d399','#f472b6','#fbbf24','#67e8f9','#a78bfa','#000000']
  //       ^—— 7 акцентных цветов под фон ——————————————————————————————^ ^— всегда чёрный
}
```

- `colors[0..6]` — подобраны под `bg` (контраст + гармония)
- `colors[7]` — всегда `#000000`; тинты дают нейтральный диапазон вплоть до белого
- 22 тёмных схемы, 16 светлых

### Вспомогательные функции

```js
_themeColors(theme)             // → массив из 8 цветов
_resolveSchemeColor(ref, theme) // → hex по {col, row} в новой схеме
_solidColor(hexOrGradient)      // → первый hex из строки
_blendToWhite(hex, amt)         // → осветлённый цвет (amt 0–1)
// Тинты col=7 (#000000): row0=#000, row1=#383838, row2=#707070, row3=#a8a8a8, row4=#e0e0e0
```

### Карточка в гриде схем

7 вертикальных прямоугольников (5×18px) в правом нижнем углу карточки, стоят рядом горизонтально. Цвета из `colors[0..6]`.

### Дефолтный цвет новых надписей

При создании надписи `addText()` цвет берётся из `col=7`:
- тёмная схема → `row=4` (#e0e0e0, светло-серый)
- светлая схема → `row=1` (#383838, тёмно-серый)

При смене схемы легаси-надписи (`textColorScheme === undefined`) получают тот же дефолт и `textColorScheme` фиксируется.

---

## Встроенная цветовая палитра (`js/03-boot.js`)

### API

```js
openColorPanel(slotId, mode, onPick)
// slotId  — id div-слота ('cp-text-slot', 'cp-fill-slot', ...)
// mode    — 'text' | 'fill' | 'stroke' | 'bg' | 'border' | 'slidebg'
// onPick(color, schemeRef)

closeColorPanel(panelId)
```

### Содержимое панели

- Сетка **8 колонок × 5 строк** (col=7 row=4 принудительно `#ffffff`)
- «Выбрать свой цвет» + `<input type="color">`

### Слоты в HTML

| Слот | Режим | Применяется к |
|------|-------|---------------|
| `cp-text-slot` | `text` | Цвет текста / выделения |
| `cp-bg-slot` | `bg` | Заливка фона текстового блока |
| `cp-fill-slot` | `fill` | Заливка фигуры |
| `cp-stroke-slot` | `stroke` | Обводка фигуры |
| `cp-border-slot` | `border` | Граница текстового блока |
| `cp-slidebg-slot` | `slidebg` | Фон слайда |

---

## Система схемных ссылок (schemeRef)

### Поля на объекте элемента (`d`)

| Поле | Тип | Смысл |
|------|-----|-------|
| `d.textColorScheme` | `{col,row}` / `null` / `undefined` | Цвет текста блока |
| `d.textBgScheme` | `{col,row}` / `null` / `undefined` | Заливка фона текстового блока |
| `d.borderScheme` | `{col,row}` / `null` / `undefined` | Граница текстового блока |
| `d.fillScheme` | `{col,row}` / `null` / `undefined` | Заливка фигуры |
| `d.strokeScheme` | `{col,row}` / `null` / `undefined` | Обводка фигуры |
| `slides[i].bgScheme` | `{col,row}` / `null` / `undefined` | Фон слайда |

| Значение | При смене схемы |
|----------|----------------|
| `{col, row}` | Пересчитывается в новой схеме |
| `null` | Не трогается (кастомный) |
| `undefined` | Легаси — применяется дефолт |

---

## Rich-text цвет (`js/30-rich-text.js`)

### Per-char schemeRef

Каждый char-спан может хранить `data-scheme='{"col":1,"row":0}'` — позицию в палитре схемы. При смене схемы `applyTheme` читает этот атрибут и пересчитывает цвет символа.

```js
rtColor(color, schemeRef)
// schemeRef передаётся напрямую как параметр (не через глобальную переменную)
// При выделении → _applyToSelection сохраняет schemeRef в style._schemeRef каждого char
// _charObjsToHtml и _groupedHtml записывают _schemeRef обратно в data-scheme атрибут
// _toCharObjs читает data-scheme обратно в style._schemeRef при парсинге HTML
```

### Логика applyTheme для текста

- Если в `el.html` есть `data-scheme=` → **частичная покраска**: каждый char пересчитывается по своему `_schemeRef`; символы без `_schemeRef` получают `newColor` явно
- Если нет `data-scheme=` → **весь блок**: обновляется `el.cs`, `stripInlineColors` очищает html

### Защита фокуса при выборе цвета

`_rtColorPickInProgress = true` устанавливается в `applyTextColor` перед вызовом `rtColor`. Обработчик `blur` на `telEl` пропускает `_rtCommit()` пока флаг установлен — это предотвращает сохранение DOM без `data-scheme` до применения цвета.

---

## Фон текстового блока (`js/16-props.js`)

### Поля данных

| Поле | dataset | Смысл |
|------|---------|-------|
| `d.textBg` | `el.dataset.textBg` | hex цвет фона |
| `d.textBgOp` | `el.dataset.textBgOp` | прозрачность 0–1 |
| `d.textBgBlur` | `el.dataset.textBgBlur` | размытие фона (px), `backdrop-filter` |

```js
applyTextBg(el)
// Применяет background rgba + backdrop-filter blur к .el
// Работает независимо: можно только blur без цвета (полупрозрачное стекло)

setTextBgOp(op)    // устанавливает прозрачность, вызывает applyTextBg
setTextBgBlur(v)   // устанавливает размытие, вызывает applyTextBg
clearTextBg()      // очищает textBg + textBgOp + textBgBlur
```

`backdrop-filter` сохраняется через `dataset.textBgBlur` → `d.textBgBlur` в `save()` → восстанавливается в `mkEl()` и после `stopPreview()`.

---

## Фон слайда (`js/05-backgrounds.js`)

```js
setSlideBgFromPalette(color, schemeRef)
resetSlideBgToTheme()   // удаляет bgScheme, берёт THEMES[appliedThemeIdx].bg
syncSlideBgPreview()    // обновляет превью в панели
```

---

## Code blocks (`js/11-elements.js`)

### Синхронизация темы с презентацией

```js
getCodeThemeForPresTheme()   // → 'dark' | 'light' по THEMES[appliedThemeIdx].dark
refreshAllCodeBlocks()       // обновляет codeTheme + codeBg + codeHtml на всех слайдах
```

`refreshAllCodeBlocks` вызывается из `applyTheme` после установки `appliedThemeIdx` — тёмная схема презентации даёт тёмную тему кода и наоборот.

### Подсветка синтаксиса

Комментарии (`//`, `#`, `/* */`) извлекаются в массив `_cmts[]` с маркерами `\x00CMTn\x00` **до** применения других замен. Восстанавливаются последними — это предотвращает вложенную подсветку внутри комментариев.

---

## Таблицы (`js/31-table.js`)

### Выделение ячеек

```js
_tblSel     // { elId, r, c } — якорная ячейка
_tblSelSet  // Set<"r:c"> — все выделенные ячейки
```

При клике на панель свойств (`#props`) `_tblSel` **не сбрасывается** — проверка `e.target.closest('#props')` в глобальном `mousedown` обработчике.

Все кнопки таблицы имеют `onmousedown="event.preventDefault()"` чтобы не уводить фокус.

### Операции со строками/столбцами

`tblDelRow()` и `tblDelCol()` удаляют **все выделенные** строки/столбцы (не только одну). Индексы сортируются по убыванию чтобы `splice` не сдвигал оставшиеся.

### Размер шрифта ячейки

`tblSetCellFs(v)` — записывает `cell.fs` на каждую выделенную ячейку. `renderTableEl` применяет `font-size` как inline-стиль на `<td>`, перекрывая глобальный `d.fs` таблицы. Поле находится в `tbl-cell-panel` после выравнивания.

---

## Нумерация страниц (`js/33-pagenum.js`)

```js
pnSettings = { enabled, style, position, customXY, color, textColor, fontSize, opacity, showTotal, customColor }
pnApplyAll()   // рисует номера на текущем слайде
pnSyncUI()     // синхронизирует чекбокс и все поля из pnSettings
pnLock()       // блокирует изменения во время показа
pnUnlock()     // снимает блокировку + pnSyncUI()
```

**Порядок вызовов при загрузке страницы** (`03-boot.js`):
1. `loadState()` → восстанавливает `pnSettings` в память
2. `renderAll()` → рисует слайд
3. `pnSyncUI()` → обновляет UI
4. `pnApplyAll()` → рисует номера на канвасе

**После `stopPreview()`** (`24-preview.js`):
1. `load()` → пересоздаёт DOM
2. `pnUnlock()` → снимает блокировку + `pnSyncUI()`
3. `requestAnimationFrame(() => pnApplyAll())` → рисует номера после завершения rAF

---

## Горячие клавиши

| Клавиша | Действие |
|---------|----------|
| `Ctrl+Z` | Отменить |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Повторить |
| `Ctrl+C` | Копировать элемент |
| `Ctrl+V` | Вставить элемент |
| `Ctrl+D` | Дублировать элемент |
| `Ctrl+A` | Выделить всё на слайде |
| `Delete` | Удалить элемент |
| `F5` | Начать/выйти из показа |
| `Esc` | Выйти из показа |
| `← →` | Предыдущий/следующий слайд (в показе) |
| `↑ ↓ ← →` | Сдвинуть элемент на 1px (Shift — 10px) |

---

## История версий

| Версия | Ключевые изменения |
|--------|-------------------|
| **v4.9** | Per-char schemeRef (data-scheme на спанах), защита blur от преждевременного _rtCommit, размытие фона текстового блока (backdrop-filter), синхронизация темы кода с темой презентации, удаление нескольких строк/столбцов таблицы, размер шрифта ячейки, выделение ячеек сохраняется при клике на панель свойств, нумерация страниц корректно восстанавливается после показа и перезагрузки |
| v4.8 | Цветовые схемы с 8 цветами (`colors[]`), встроенная палитра, система schemeRef, rich-text цвет (частичное выделение), фон слайда из палитры, 38 схем |
| v4.7 | RU/EN интерфейс, 32 темы, нумерация страниц, офлайн-библиотеки |
| v4.6 | Иконки с тенями |
| v4.0 | Первый релиз |

---

## Советы при разработке

1. **Порядок загрузки JS важен** — файлы пронумерованы и должны подключаться по порядку.
2. **Не вызывать `saveState()` без `save()`** после изменений в DOM.
3. **`save()` не сохраняет произвольные поля** — новые поля на `d` без `dataset` нужно явно копировать из `oldElsById` в `08-slides.js`.
4. **schemeRef-поля** — устанавливать через специальные функции, не напрямую.
5. **Цвет текста** — только `rtColor(color, schemeRef)` или `applyTextColor()`, не `_syncPropToHtml('color', ...)`.
6. **Фон текста** — только `applyTextBg(el)` после записи в `dataset`. Не устанавливать `el.style.background` напрямую.
7. **`event.preventDefault()`** на всех UI-элементах которые не должны уводить фокус из текстового поля или ячейки таблицы.
8. **pnApplyAll()** — вызывать после любого `load()` если нумерация включена, иначе номера исчезнут.
9. **Code blocks** — не вызывать `syntaxHighlight` напрямую с устаревшей темой; использовать `refreshAllCodeBlocks()` при смене схемы.
