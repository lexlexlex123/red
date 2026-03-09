# claude.md — Документация проекта «Слайды»

## Обзор

**«Слайды»** — презентационный редактор, работающий в одном HTML-файле (или модульно).
Не требует сервера, сборки или интернета. Открывается напрямую в браузере.

- **Версия:** v5.1
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
    ├── 00-i18n.js          # Локализация RU/EN, APP_VERSION, APP_NAME
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
    ├── 21-keyboard.js      # Горячие клавиши
    ├── 22-undo.js          # Undo/Redo (до 40 шагов)
    ├── 23-layout.js        # Декоратор готовых макетов, buildLayoutGrid()
    ├── 24-preview.js       # Режим показа, startPreview() / stopPreview()
    ├── 25-links.js         # Ссылки-навигация на элементах
    ├── 26-export.js        # Экспорт HTML, импорт PPTX
    ├── 27-persist.js       # save() / saveState() / commitAll() / loadState()
    ├── 28-multisel.js      # Множественное выделение
    ├── 29-icons.js         # buildIconSVG()
    ├── 30-rich-text.js     # Rich text: rtColor(color, schemeRef), _charObjsToHtml()
    ├── 31-table.js         # Таблицы
    ├── 32-scrubber.js      # Скруббер временной шкалы
    ├── 33-objects.js       # Управление объектами
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

---

## Система схемных ссылок (schemeRef)

| Поле | Значение | При смене схемы |
|------|----------|----------------|
| `{col, row}` | Позиция в палитре | Пересчитывается |
| `null` | Кастомный цвет | Не трогается |
| `undefined` | Легаси | Применяется дефолт |

Поля: `textColorScheme`, `textBgScheme`, `borderScheme`, `fillScheme`, `strokeScheme`, `mdColorScheme`, `slides[i].bgScheme`.

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

## Модальные окна тем и макетов

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

---

## История версий

| Версия | Ключевые изменения |
|--------|-------------------|
| **v5.1** | Нейтральная колонка палитры: тёмная row0=белый, светлая row0=чёрный. Дефолт надписей `{col:7,row:0}` через `_resolveSchemeColor`. Markdown: `mdColorScheme`, `--md-c`, палитра в панели. Dblclick открывает markdown/code редакторы. Модалка тем: применять без закрытия. «Без декора» — крестик. Отступы гридов 10px. |
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
<!-- transform добавляется к cx/cy → двойное смещение, объект улетает -->

<!-- НЕПРАВИЛЬНО: mpath + xlink:href -->
<animateMotion><mpath xlink:href="#path1"/></animateMotion>
<!-- xlink:href устарел, не работает в innerHTML-вставленных SVG -->

<!-- НЕПРАВИЛЬНО: CSS @keyframes в <style> внутри SVG -->
<style>.sat { animation: orbit 8s linear infinite; }</style>
<!-- CSS-анимации в innerHTML SVG не работают в большинстве браузеров -->
```

### Правила для всех анимированных объектов

1. **Позиция** — всегда через `<g transform="translate(startX,startY)">` + `<animateTransform type="translate">` на `<g>`, объект внутри с `cx="0" cy="0"` (или `x="0" y="0"`)

2. **Начальная позиция** — `transform="translate(firstX,firstY)"` на `<g>` = первая точка из `values`, чтобы объект был виден до старта анимации

3. **Вращение** — `<animateTransform type="rotate">` на вложенном `<g>`, не на самом объекте

4. **Масштаб/зеркало** — `<animateTransform type="scale">` на `<g>`, объект внутри

5. **Морфинг путей** — `<animate attributeName="d">` прямо на `<path>` — работает

6. **Атрибуты** — `<animate attributeName="opacity/cx/cy/r">` прямо на элементе — работает

7. **`calcMode="linear"`** для плавного бесконечного движения (без рывков на стыке). `calcMode="spline"` только если нужен ease с явными `keySplines`

8. **`doAnimate` флаг** — все `<animateTransform>` и `<animate>` оборачивать в `${doAnimate?\`...\`:''}`. Статичный вариант: объект на месте, без анимационных тегов

9. **Уникальные ID** — `const uid = 'pfx' + Math.random().toString(36).slice(2,7)` — обязательно, т.к. несколько SVG живут в одном DOM

10. **Никаких `xlink:href`** — только `href` или лучше вообще не использовать `<mpath>`

### Паттерн для орбитального движения

```js
// Предвычислить точки эллипса в JS внутри _build:
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
// Использовать с n=48 для плавности, calcMode="linear"
```

### Паттерн для fish-style анимации (translate + scale-mirror)

```svg
<g transform="translate(START_X,START_Y)">
  <animateTransform attributeName="transform" type="translate"
    dur="9s" repeatCount="indefinite" calcMode="spline" ...
    values="x1,y1;x2,y2;x2,y2;x1,y1;x1,y1"/>
  <g transform="scale(1,1)">
    <animateTransform attributeName="transform" type="scale"
      dur="9s" repeatCount="indefinite"
      values="1 1;1 1;-1 1;-1 1;1 1"/>
    <ellipse cx="0" cy="0" .../>
  </g>
</g>
```

