# claude.md — Документация проекта «Слайды»

## Обзор

**«Слайды»** — презентационный редактор, работающий в одном HTML-файле (или модульно).
Не требует сервера, сборки или интернета. Открывается напрямую в браузере.

- **Версия:** v5.3
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
│       └── tex-svg.js      # MathJax 3 (офлайн). Скачать: https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js
└── js/
    ├── 00-i18n.js          # Локализация RU/EN, APP_VERSION, APP_NAME
    ├── 00-icons.js         # Базовые SVG-иконки
    ├── 01-state.js         # Глобальные переменные, THEMES[], SHAPES[], PALETTE[]
    ├── 02-applets.js       # Встроенные виджеты (APPLETS[])
    ├── 02b-icons.js        # Расширенная библиотека иконок
    ├── 03-boot.js          # boot(), инициализация, openColorPanel(), buildThemeGrid()
    ├── 04-ui.js            # Сетка, табы, snap/guides, zoom, центрирование канваса
    ├── 05-backgrounds.js   # Фоны слайдов, setSlideBgFromPalette(), resetSlideBgToTheme()
    ├── 06-themes.js        # Применение цветовых схем, _resolveSchemeColor()
    ├── 07-transitions.js   # Переходы между слайдами
    ├── 08-slides.js        # CRUD слайдов, save(), load()
    ├── 09-shapes.js        # Фигуры и SVG, updateShapeStyleScheme()
    ├── 10-animations.js    # Анимации элементов
    ├── 11-elements.js      # Создание/рендер элементов, addText(), code blocks
    ├── 12-markdown.js      # Markdown-блоки: updateMdFontSize(), updateMdColor()
    ├── 13-images.js        # Изображения, mkEl(), stopTextEditing()
    ├── 13b-imgcrop.js      # Кроп изображений, applyImgCrop(), _exitCropMode()
    ├── 14-drag.js          # Перетаскивание и ресайз
    ├── 15-align.js         # Выравнивание и распределение элементов
    ├── 16-props.js         # Панель свойств, syncProps(), setTextBg(), applyTextBg()
    ├── 17-text.js          # Редактирование текста, setTextBorder()
    ├── 19-hover.js         # Hover-эффекты
    ├── 20-thumbnails.js    # Миниатюры слайдов, renderAll()
    ├── 21-keyboard.js      # Горячие клавиши, _addImageToCanvas() [глобальная]
    ├── 22-undo.js          # Undo/Redo (до 40 шагов)
    ├── 23-layout.js        # Декоратор готовых макетов, buildLayoutGrid()
    ├── 24-preview.js       # Режим показа, startPreview() / stopPreview()
    ├── 25-links.js         # Ссылки-навигация на элементах
    ├── 26-export.js        # Экспорт HTML, импорт PPTX/HTML, importHTMLFile()
    ├── 27-persist.js       # save() / saveState() / commitAll() / loadState()
    ├── 28-multisel.js      # Множественное выделение
    ├── 28-filedrop.js      # Drag-and-drop импорт файлов (PPTX/PPT/ODP/HTML/JSON/изображения)
    ├── 29-icons.js         # buildIconSVG()
    ├── 30-rich-text.js     # Rich text: rtColor(color, schemeRef), _charObjsToHtml()
    ├── 31-table.js         # Таблицы
    ├── 32-scrubber.js      # Скруббер временной шкалы
    ├── 33-objects.js       # Управление объектами
    └── 33-pagenum.js       # Нумерация страниц, pnSettings, pnApplyAll()
    ├── 36-formula.js       # Формулы LaTeX: addFormula(), openFormulaEditor(), syncFormulaProps(), setFormulaColor()
    └── 37-graph.js         # Графики формул: buildFormulaGraph(), refreshAllGraphs(theme)
```

---

## Drag-and-drop импорт файлов (`js/28-filedrop.js`)

При перетаскивании файла на окно программы появляется полупрозрачный оверлей с подсказкой.
Поддерживаемые форматы (по расширению):

| Расширение | Действие |
|------------|----------|
| `.pptx`, `.ppt`, `.odp` | `importPPTX(file)` — импорт презентации |
| `.html`, `.htm` | `importHTMLFile(file)` — импорт экспортированного HTML |
| `.json` | Парсит, проверяет `slides`, пишет в `localStorage`, вызывает `loadState()` + `renderAll()` |
| `image/*` | `_addImageToCanvas(dataURL)` — вставить на текущий слайд |

**Важно:** `_addImageToCanvas` объявлена **глобально** в `21-keyboard.js` (вне paste-closure),
чтобы `28-filedrop.js` мог её вызывать. Paste-обработчик использует её же.

При перетаскивании нескольких файлов — обрабатывается первый по приоритету: pptx/ppt/odp → html → json → изображение.

---

## Центрирование канваса (`js/04-ui.js`)

```js
_applyCanvasZoom()  // вычисляет позицию canvas-container с учётом zoom
_centerSlide()      // скроллит cwrap к центру
```

**Логика позиционирования:**
- Если канвас меньше `cwrap` по обеим осям → `cc.style.left/top` выставляются в центр, ghost = размер cwrap
- Если переполняет хотя бы одну ось → на переполненной оси `left/top = ZOOM_PAD`, на влезающей — центрируется

**Resize:** debounced listener на `window resize` (80мс) перевызывает `_applyCanvasZoom` + `_centerSlide` — работает корректно при изменении масштаба браузера (Ctrl+/−).

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
> Любые поля данных без `dataset` копируются из `oldElsById[d.id]`:
> `textColorScheme`, `textBgScheme`, `borderScheme`, `fillScheme`, `strokeScheme`,
> `mdRaw`, `mdHtml`, `mdFs`, `mdColor`, `mdColorScheme`.

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

## Цветовые схемы (`js/01-state.js`, `js/06-themes.js`)

### Структура THEMES[]

38 схем (22 тёмных, 16 светлых), каждая с явным массивом из 8 цветов:

```js
{
  name: 'Ocean Night',
  dark: true,
  bg: 'linear-gradient(135deg,#0f0c29,#302b63)',
  ac1, ac2, ac3,
  shapeFill, shapeStroke,
  headingColor, bodyColor,
  colors: ['#818cf8','#c7d2fe','#34d399','#f472b6','#fbbf24','#67e8f9','#a78bfa','#000000']
  //       ^—— 7 акцентных цветов ——————————————————————————————————————^ ^— база нейтральной колонки
}
```

### Последняя колонка палитры (col=7) — нейтральный диапазон

| Тема | row=0 | → | row=4 |
|------|-------|---|-------|
| Тёмная | `#ffffff` белый | → | `#000000` чёрный |
| Светлая | `#000000` чёрный | → | `#ffffff` белый |

### Дефолтный цвет новых элементов

`{col:7, row:0}` — вычисляется через `_resolveSchemeColor`, не хардкодится:
- Тёмная → `#ffffff`, Светлая → `#000000`

### Вспомогательные функции

```js
_themeColors(theme)             // → массив из 8 цветов
_resolveSchemeColor(ref, theme) // → hex по {col, row} в данной схеме
_solidColor(hexOrGradient)      // → первый hex из строки
_blendToWhite(hex, amt)         // → осветлённый цвет (amt 0–1)
_blendToBlack(hex, amt)         // → затемнённый цвет (amt 0–1)
```

---

## Встроенная цветовая палитра (`js/03-boot.js`)

```js
openColorPanel(slotId, mode, onPick)
// onPick(color, schemeRef)  — schemeRef={col,row} или null (кастомный)

closeColorPanel(panelId)
```

### Слоты в HTML

| Слот | Применяется к |
|------|---------------|
| `cp-text-slot` | Цвет текста / выделения |
| `cp-bg-slot` | Заливка фона текстового блока |
| `cp-fill-slot` | Заливка фигуры |
| `cp-stroke-slot` | Обводка фигуры |
| `cp-border-slot` | Граница текстового блока |
| `cp-slidebg-slot` | Фон слайда |
| `cp-md-color-slot` | Цвет текста markdown-блока |
| `cp-formula-color-slot` | Цвет формулы |

---

## Система схемных ссылок (schemeRef)

| Поле | Значение | При смене схемы |
|------|----------|----------------|
| `{col, row}` | Позиция в палитре | Пересчитывается |
| `null` | Кастомный цвет | Не трогается |
| `undefined` | Легаси | Применяется дефолт |

Поля: `textColorScheme`, `textBgScheme`, `borderScheme`, `fillScheme`, `strokeScheme`, `mdColorScheme`, `formulaColorScheme`, `slides[i].bgScheme`.

---

## Градиент фона текстового блока (`js/16-props.js`)

### Поля данных

```js
d.textBg        // hex цвет 1 (одиночный режим)
d.textBgOp      // прозрачность (0–1), сохраняется при textBg ИЛИ textBgGrad
d.textBgBlur    // размытие (backdrop-filter)
d.textBgGrad    // true — включён режим градиента
d.textBgCol2    // hex цвет 2 (пустой = transparent)
d.textBgDir     // угол градиента в градусах (0/45/90/135/180/225/270/315)
```

### Ключевые функции

```js
applyTextBg(el)        // рендерит фон через div.el-bg-layer (position:absolute;inset:0)
clearTextBg()          // сбрасывает всё (цвет, градиент, blur)
clearTextBgCol1()      // только цвет 1, не трогает градиент
setTextBgGrad(on)      // вкл/выкл градиент
setTextBgCol2(col)     // второй цвет
setTextBgDir(deg)      // направление
```

**Важно:** используется `div.el-bg-layer` вместо `el.style.background`, т.к. `.tel` имеет `height:auto` и не заполняет весь `.el`.

---

## Markdown-блоки (`js/12-markdown.js`)

### Поля данных

| Поле | Смысл |
|------|-------|
| `d.mdRaw` | Исходный markdown |
| `d.mdHtml` | Скомпилированный HTML |
| `d.mdFs` | Размер шрифта (px) |
| `d.mdColor` | Цвет текста (hex) |
| `d.mdColorScheme` | `{col,row}` позиция в палитре, `null` — кастомный |

### CSS-переменная `--md-c`

Инлайн на `.ec`: `--md-c: #ffffff`. Все дочерние стили используют `color-mix(in srgb, var(--md-c) X%, transparent)`.

```js
updateMdFontSize(v)           // mdFs + DOM
updateMdColor(v, schemeRef)   // mdColor + mdColorScheme + CSS var --md-c
openMdEditor()                // открыть модальный редактор
```

Двойной клик по markdown-блоку → `openMdEditor()`.
Двойной клик по code-блоку → `openCodeEditor()`.

---

## Кроп изображений (`js/13b-imgcrop.js`)

```js
// Поля данных:
d.imgCropL, d.imgCropT, d.imgCropR, d.imgCropB  // px обрезанных с каждой стороны

// Committed: .el = видимая область, .iel = overflow:hidden, img смещён на (-L,-T)
// Crop mode: .el расширен до оригинала, оверлеи + 8 ручек на рёбрах видимой области
```

**Важно:** `overflow:hidden` только на `.iel`, не `.el` — иначе ручки `.rh` обрезаются.
`mkEl` всегда пишет crop-поля в `dataset` даже как нули — иначе `save()` теряет значения.

---

## Формулы LaTeX (`js/36-formula.js`)

### Тип элемента: `formula`

| Поле | Смысл |
|------|-------|
| `d.formulaRaw` | Исходный LaTeX |
| `d.formulaSvg` | Нейтральный SVG (без цвета, `currentColor`) |
| `d.formulaColor` | Текущий hex цвет |
| `d.formulaColorScheme` | `{col,row}` — позиция в палитре; `null` — кастомный; `undefined` — legacy |

### Ключевые функции

```js
addFormula()                     // открыть редактор для нового элемента
openFormulaEditor(el)            // открыть редактор для существующего
syncFormulaProps()               // обновить панель свойств (swatch, hex, preview)
setFormulaColor(color, schemeRef) // изменить цвет из панели свойств
```

### SVG нейтральный — цвет только через CSS

`_renderFormula(latex, cb)` возвращает SVG без хардкодных цветов — все пути используют `fill="currentColor"`. Цвет задаётся исключительно через `ec.style.color` на контейнере `.ec`. Это позволяет независимо управлять цветом в разных контекстах:

- **Холст:** `ec.style.color = d.formulaColor`
- **Панель свойств (fp-preview):** наследует `var(--text)` от панели
- **Редактор формул:** `preview.style.color = initColor` (цвет из схемы слайда)

### Порядок в `setFormulaColor`

⚠️ **Важно:** `pushUndo()` вызывает `save()` который читает `el.dataset.formulaColor`. Поэтому обновление DOM и данных должно быть **до** `pushUndo()`:

```js
liveEl.dataset.formulaColor = color;  // 1. DOM dataset
ec.style.color = color;               // 2. CSS
d.formulaColor = color;               // 3. data object
d.formulaColorScheme = schemeRef;     // 4. scheme ref
pushUndo();                           // 5. ТОЛЬКО ПОТОМ undo
```

---

## Графики формул (`js/37-graph.js`)

### Тип элемента: `graph`

| Поле | Смысл |
|------|-------|
| `d.linkedFormulaId` | id формулы-источника |
| `d.graphExpr` | JS-выражение для вычисления |
| `d.graphLatex` | Оригинальный LaTeX (для подписи) |
| `d.graphImg` | dataURL PNG-рисунка |
| `d.graphColor` | Цвет кривой (из `theme.colors[0]`) |
| `d.graphBg` | Цвет фона |
| `d.graphDark` | `true/false` — была ли тёмная тема при рендере |

### Ключевые функции

```js
buildFormulaGraph(formulaEl)   // создать/обновить граф под формулой
refreshAllGraphs(theme)        // перерисовать все графики при смене темы
```

`refreshAllGraphs` вызывается из `applyTheme` перед `renderAll()`.

---

**Цветовая схема:** клик по карточке — применяет без закрытия; «Применить ко всем» — применяет + закрывает.

**Декор/макет:** карточка «Без декора» — крестик SVG. Грид `gap:10px`, `padding:4px 6px`, `overflow-x:hidden`, `z-index:2` при hover.

---

## Нумерация страниц (`js/33-pagenum.js`)

```js
pnSettings = { enabled, style, position, ... }
pnApplyAll()  // рисует номера
pnSyncUI()    // синхронизирует UI
```

Порядок при загрузке: `loadState()` → `renderAll()` → `pnSyncUI()` → `pnApplyAll()`
После `stopPreview()`: `load()` → `pnUnlock()` → `rAF(pnApplyAll)`

---

## Горячие клавиши

| Клавиша | Действие |
|---------|----------|
| `Ctrl+Z` | Отменить |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Повторить |
| `Ctrl+C/V/D` | Копировать / Вставить / Дублировать |
| `Ctrl+A` | Выделить всё |
| `Delete` | Удалить элемент |
| `F5` | Начать/выйти из показа |
| `Esc` | Выйти из показа |
| `← →` | Предыдущий/следующий слайд |
| `↑↓←→` | Сдвинуть на 1px (Shift — 10px) |
| Dblclick на markdown/code | Открыть редактор |

---

## Советы при разработке

1. **Порядок загрузки JS важен** — файлы пронумерованы.
2. **Не вызывать `saveState()` без `save()`** после изменений в DOM.
3. **Новые поля на `d`** — явно копировать из `oldElsById` в `08-slides.js`.
4. **Цвет через schemeRef** — использовать `_resolveSchemeColor`, не хардкодить блендинг.
5. **Markdown цвет** — `updateMdColor(v, schemeRef)`, обновляет `--md-c` и `mdColorScheme`.
6. **`event.preventDefault()`** на UI-элементах которые не должны уводить фокус.
7. **`pnApplyAll()`** — вызывать после любого `load()` если нумерация включена.
8. **Code blocks** — `refreshAllCodeBlocks()` при смене схемы.
9. **Глобальные хелперы** — `_addImageToCanvas` объявлена глобально в `21-keyboard.js`, доступна из любого модуля.
10. **Формулы** — SVG хранится нейтральным (`currentColor`). Цвет всегда через `ec.style.color`. Обновлять dataset **до** `pushUndo()` — иначе `save()` зафиксирует старый цвет.
11. **Графики** — вызывать `refreshAllGraphs(theme)` из `applyTheme` перед `renderAll()` при смене темы.

---

## История версий

| Версия | Ключевые изменения |
|--------|-------------------|
| **v5.3** | Элемент «Формула» (LaTeX через MathJax 3): редактор с палитрой символов по группам, нейтральный SVG через `currentColor`, цвет из палитры схемы с адаптацией при смене темы. Элемент «График»: парсер LaTeX→JS, рендер через Canvas API, подпись вдоль кривой, автообновление при смене схемы. Превью формул и графиков в миниатюрах слайдов. |
| **v5.2** | Drag-and-drop импорт файлов (PPTX/PPT/ODP/HTML/JSON/изображения) с оверлеем. Центрирование канваса по каждой оси независимо. Авто-перецентрирование при ресайзе окна/браузерном зуме. `_addImageToCanvas` вынесена в глобальный скоуп. |
| **v5.1** | Нейтральная колонка палитры: тёмная row0=белый, светлая row0=чёрный. Дефолт надписей `{col:7,row:0}` через `_resolveSchemeColor`. Markdown: `mdColorScheme`, `--md-c`, палитра в панели. Dblclick открывает markdown/code редакторы. Модалка тем: применять без закрытия. «Без декора» — крестик. Градиент фона текстового блока с 8 направлениями. |
| v5.0 | Панель анимаций в правой панели (4 колонки), кроп изображений с persist через dataset, `clickNav=off`, markdown на светлой теме через CSS-переменные |
| v4.9 | Per-char schemeRef, защита blur, размытие фона текста, синхронизация темы кода |
| v4.8 | 8-цветные схемы, встроенная палитра, система schemeRef, rich-text |
| v4.7 | RU/EN, 32 темы, нумерация страниц |
| v4.0 | Первый релиз |

---

## Правила написания анимированных макетов (LAYOUTS)

### Как работает рендеринг

SVG из `titleSvg(w,h,a1,a2,doAnimate)` вставляется через `btn.innerHTML = svgStr` и через `el.innerHTML = svgStr` на слайдах. Это накладывает строгие ограничения.

### ✅ Единственный рабочий способ анимировать позицию объекта

**SMIL `<animateTransform type="translate">` на `<g>`, дочерний объект с `cx="0" cy="0"`:**

```svg
<!-- ПРАВИЛЬНО -->
<g transform="translate(СТАРТ_X,СТАРТ_Y)">
  <animateTransform attributeName="transform" type="translate"
    dur="8s" repeatCount="indefinite" calcMode="linear"
    values="x1,y1;x2,y2;x3,y3;..."/>
  <circle cx="0" cy="0" r="5" fill="${a1}"/>
</g>
```

`transform="translate(...)"` на `<g>` задаёт начальную позицию — объект виден сразу, без задержки до первого кадра анимации.

### ❌ Что НЕ работает

```svg
<!-- НЕПРАВИЛЬНО: animateTransform на circle с cx/cy != 0 -->
<circle cx="278" cy="74" r="5">
  <animateTransform type="translate" values="278,74;100,200;..."/>
</circle>

<!-- НЕПРАВИЛЬНО: mpath + xlink:href -->
<animateMotion><mpath xlink:href="#path1"/></animateMotion>

<!-- НЕПРАВИЛЬНО: CSS @keyframes в <style> внутри SVG -->
<style>.sat { animation: orbit 8s linear infinite; }</style>
```

### Правила для всех анимированных объектов

1. **Позиция** — всегда через `<g transform="translate(startX,startY)">` + `<animateTransform type="translate">` на `<g>`, объект внутри с `cx="0" cy="0"`
2. **Начальная позиция** — `transform="translate(firstX,firstY)"` на `<g>` = первая точка из `values`
3. **Вращение** — `<animateTransform type="rotate">` на вложенном `<g>`
4. **Масштаб/зеркало** — `<animateTransform type="scale">` на `<g>`
5. **Морфинг путей** — `<animate attributeName="d">` прямо на `<path>` — работает
6. **Атрибуты** — `<animate attributeName="opacity/cx/cy/r">` прямо на элементе — работает
7. **`calcMode="linear"`** для плавного бесконечного движения
8. **`doAnimate` флаг** — все анимационные теги оборачивать в `${doAnimate?\`...\`:''}`
9. **Уникальные ID** — `const uid = 'pfx' + Math.random().toString(36).slice(2,7)`
10. **Никаких `xlink:href`** — только `href`

### Паттерн для орбитального движения

```js
function orbitVals(rx, ry, rotDeg, cx, cy, phase, n){
  const r = rotDeg * Math.PI / 180;
  const pts = [];
  for(let i = 0; i <= n; i++){
    const a = 2 * Math.PI * (phase + i/n);
    const ex = rx*Math.cos(a), ey = ry*Math.sin(a);
    pts.push((cx + ex*Math.cos(r) - ey*Math.sin(r)).toFixed(1) + ','
           + (cy + ex*Math.sin(r) + ey*Math.cos(r)).toFixed(1));
  }
  return pts.join(';');
}
// n=48 для плавности, calcMode="linear"
```

---

## Принцип построения анимированных декор-фонов (тип Aurora)

### Ключевой принцип

**Анимация живёт ТОЛЬКО в SVG-декоре** — элементе типа `type:'svg'` с флагом `_isDecor:true`.  
Фон слайда (`cvbg`, поле `s.bgc`) остаётся **статичным** CSS-градиентом — он не анимируется.  
Движение, переливание, мерцание — всё через нативные SVG элементы `<animate>` и `<animateTransform>`.

### Структура анимированного layout

```js
{
  name: 'МоёНазвание', nameEn: 'MyName',
  desc: '...', descEn: '...',
  animated: true,   // ← ОБЯЗАТЕЛЬНО для включения doAnimate

  _build: (w, h, a1, a2, isTitle, doAnimate) => {
    const uid = 'pfx' + Math.random().toString(36).slice(2,7); // уникальный префикс ID

    // 1. Строим статичные элементы (звёзды, фон, базовые формы)
    // 2. Строим анимированные элементы — оборачиваем в if(doAnimate){} else{}
    // 3. Все id фильтров/градиентов через uid во избежание коллизий

    const defs = `<defs>
      <filter id="${uid}blur" ...><feGaussianBlur stdDeviation="28"/></filter>
    </defs>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      ${defs}${staticElements}${animatedElements}
    </svg>`;
  },

  titleSvg(w, h, a1, a2, doAnimate) { return this._build(w,h,a1,a2,true,  doAnimate!==false); },
  contentSvg(w, h, a1, a2, doAnimate){ return this._build(w,h,a1,a2,false, doAnimate!==false); },
}
```

### Паттерн плавающего цветового блоба (Aurora-стиль)

Большой размытый эллипс плавно смещает свой центр туда-обратно:

```js
// Данные блоба: позиция, смещение, цвет, период
const blob = {cx: w*.2, cy: h*.3, rx: w*.5, ry: h*.4, fill: a1,
               op: 0.20, dcx: w*.07, dcy: h*.1, dur: 14};

// Статичная версия (doAnimate=false):
`<ellipse cx="${blob.cx}" cy="${blob.cy}" rx="${blob.rx}" ry="${blob.ry}"
  fill="${blob.fill}" opacity="${blob.op}" filter="url(#${uid}blur)"/>`

// Анимированная версия (doAnimate=true):
const cx0 = blob.cx.toFixed(1), cx1 = (blob.cx + blob.dcx).toFixed(1);
const cy0 = blob.cy.toFixed(1), cy1 = (blob.cy + blob.dcy).toFixed(1);
const op0 = blob.op.toFixed(2),  op1 = (blob.op * 0.5).toFixed(2);
`<ellipse cx="${cx0}" cy="${cy0}" rx="${blob.rx}" ry="${blob.ry}"
  fill="${blob.fill}" opacity="${op0}" filter="url(#${uid}blur)">
  <animate attributeName="cx"      values="${cx0};${cx1};${cx0}"
    dur="${blob.dur}s" begin="Xs" repeatCount="indefinite"
    calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
  <animate attributeName="cy"      values="${cy0};${cy1};${cy0}"
    dur="${blob.dur * 1.13}s" begin="Xs" repeatCount="indefinite"
    calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
  <animate attributeName="opacity" values="${op0};${op1};${op0}"
    dur="${blob.dur * 0.8}s" begin="Xs" repeatCount="indefinite"
    calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
</ellipse>`
```

**Правила для блобов:**
- `begin="Xs"` — разные у каждого блоба (например `i * 3.1`), чтобы они не двигались синхронно
- `dur` на cx, cy, opacity — разные, чтобы движение выглядело случайным
- `calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"` — ease-in-out, не линейное
- Размытие через `feGaussianBlur` со `stdDeviation` ≥ 20 для мягкости
- `opacity` не выше 0.28 на главном слайде, 0.13 на контентных — чтобы не рябило
- Несколько цветов (`a1`, `a2`, `#67e8f9`, `#f472b6`...) на главном слайде, 2 на контентных

### Паттерн пульсирующей световой дуги

```js
const arc = {
  d: `M-10,${(h*.22).toFixed(0)} Q${(w*.3).toFixed(0)},${(h*.08).toFixed(0)} ...`,
  sw: h*.055, op: 0.10, col: a1, dur: 12
};
// Анимация — только opacity:
`<path d="${arc.d}" fill="none" stroke="${arc.col}"
  stroke-width="${arc.sw}" stroke-linecap="round" opacity="${arc.op}"
  filter="url(#${uid}arc)">
  <animate attributeName="opacity"
    values="${arc.op};${(arc.op*0.3).toFixed(3)};${arc.op}"
    dur="${arc.dur}s" begin="${i*4.5}s" repeatCount="indefinite"
    calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
</path>`
```

### Различие titleSvg и contentSvg в Aurora-стиле

| Параметр | titleSvg (главный) | contentSvg (контентный) |
|----------|--------------------|-------------------------|
| Блобов | 5 | 3 |
| Opacity блобов | 0.18–0.22 | 0.07–0.11 |
| Световых дуг | 2 | 1 |
| Звёзд | 80 | 45 |
| Blur | stdDeviation=32 | stdDeviation=24 |
| Цветов | 5 (a1, a2, cyan, pink, indigo) | 2 (a1, a2) |

### Статичный fallback

Когда `doAnimate=false` (экспорт, миниатюры, превью без анимации):
- Все `<animate>` убираются
- Эллипсы/дуги рисуются в начальной позиции (`cx0`, `cy0`, `op0`)
- Визуально похоже на анимированную версию, но статично

### Почему НЕ CSS @keyframes в фоне

CSS-анимация на `cvbg` (`background-position`, CSS классы) не работает в системе макетов:
- Фон задаётся строкой в `s.bgc` и применяется как `el.style.background`
- При каждом `load()` строка перезаписывается — анимация сбрасывается
- Экспорт, миниатюры, превью не получат анимацию
- **Правильный путь всегда:** SVG `<animate>` в декор-слое

