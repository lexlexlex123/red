// ══════════════ LOCALIZATION (i18n) ══════════════
// Версия / Version: 4.7
// Автор / Author: Некрасов Александр

const APP_NAME = 'Слайды';
const APP_VERSION = '5.1';
const APP_AUTHOR = 'Некрасов Александр';

const LANG_DATA = {
  en: {
    // App
    appName: 'Slides',
    newPresentation: 'New Presentation',

    // Tabs
    tabHome: 'Home',
    tabInsert: 'Insert',
    tabDesign: 'Design',
    tabAnim: 'Animations',
    tabTransitions: 'Transitions',
    tabSlideshow: 'Slideshow',
    tabFile: 'File',

    // Ribbon groups
    grpSlides: 'Slides',
    grpObjects: 'Objects',
    grpEdit: 'Edit',
    grpInsert: 'Insert',
    grpBackground: 'Background',
    grpDesign: 'Design',
    grpAnimations: 'Animations',
    grpTiming: 'Timing',
    grpTransition: 'Transition Effect',
    grpSettings: 'Settings',
    grpPresent: 'Present',
    grpAutoAdvance: 'Auto Advance',
    grpPlayback: 'Playback',
    grpFile: 'File',

    // Slide buttons
    btnNewSlide: 'New Slide',
    btnDelete: 'Delete',
    btnUndo: 'Undo',
    btnRedo: 'Redo',
    btnImport: 'Import',
    btnExport: 'Export',
    resetFormat: 'Reset',
    btnDuplicate: 'Duplicate',
    // Animations
    animFadeIn: 'Fade In', animSlideUp: 'Slide Up', animZoomIn: 'Zoom In',
    animBounce: 'Bounce', animSpin: 'Spin', animFadeOut: 'Fade Out',
    animSlideOut: 'Slide Out', animZoomOut: 'Zoom Out', animPulse: 'Pulse',
    animShake: 'Shake', animFlash: 'Flash',
    // Transitions
    transNone: 'None', transFade: 'Fade', transSlide: 'Slide',
    transZoom: 'Zoom', transFlip: 'Flip', transCube: 'Cube',
    transDissolve: 'Dissolve', transMorph: 'Morph',
    // Text roles
    roleBodyText: 'Body Text', roleHeading: 'Heading',
    // Misc
    btnRemove: 'Remove', btnApply: 'Apply',
    btnAlignSelShort: 'Sel', btnAlignSlideShort: 'Slide',
    propClearAllAnims: 'Clear All',

    btnLink: 'Link',
    btnTextBox: 'Text Box',
    btnFromStart: 'From Start',
    btnCurrent: 'Current',

    // Insert buttons
    btnText: 'Text',
    btnImage: 'Image',
    btnShape: 'Shape',
    btnIcon: 'Icon',
    btnSvg: 'SVG',
    btnCode: 'Code',
    btnMarkdown: 'MD',
    btnApplet: 'Applet',

    // Design
    btnTheme: 'Color Scheme',
    btnLayout: 'Theme',
    btnAddAnim: 'Add Animation',
    btnApplyToAll: 'Apply to All',

    // Present
    btnPresent: 'Present',
    btnFullscreen: 'Fullscreen',

    // Settings
    settingsTitle: '⚙ Settings',
    settingsTheme: 'Theme',
    settingsThemeSub: 'Interface color scheme',
    settingsThemeDark: '🌙 Dark',
    settingsThemeLight: '☀ Light',
    settingsSnap: 'Snap to grid',
    settingsSnapSub: 'Align elements to 10px grid',
    settingsLanguage: 'Language',
    settingsLanguageSub: 'Interface language',
    settingsVersion: 'Version',
    settingsAuthor: 'Author',
    settingsDone: 'Done',

    // Props panel
    propRole: 'Role',
    propSize: 'Size',
    propWeight: 'Weight',
    propTextColor: 'Text Color',
    propBgColor: 'Background Color',
    propOpacity: 'Opacity',
    propLineH: 'Line H',
    propSpacing: 'Spacing',
    propRotation: 'Rotation (deg)',
    propCornerRadius: 'Corner Radius',
    propPadding: 'Inner Padding (px)',
    propBorder: 'Border',
    propElOpacity: 'Element Opacity',
    propFillColor: 'Fill Color',
    propStrokeColor: 'Stroke Color',
    propStrokeWidth: 'Stroke Width',
    propShadow: 'Shadow',
    propShadowBlur: 'Blur',
    propShadowColor: 'Shadow Color',
    propLink: 'Link',
    propLinkTarget: 'Target',
    propClickThrough: 'Click-through on presentation',
    propAlign: 'Click anywhere to advance',
    propNewTab: 'New tab',
    propSameTab: 'Same tab',
    propClearAll: 'Clear All',
    propEditText: '✏️ Edit Text (or double-click shape)',
    propCoverSlide: '📐 Cover Entire Slide (back)',
    propEditCode: '✏️ Edit Code',
    propEditMd: '✏️ Edit Markdown',
    propLockAspect: 'Lock',
    propUnit: 'Unit:',
    propLock: 'Lock',

    // Modals
    modalCode: '{ } Code Block',
    modalMd: '# Markdown Block',
    modalLayout: '🖼 Apply Theme',
    layoutDesc: 'Decorative style for all slides. Uses current theme colors.',
    modalTheme: '🎨 Color Scheme',
    modalIcon: '🔍 Icons',
    modalSvg: '⬡ Insert SVG',
    modalShape: '⬡ Insert Shape',
    modalApplet: '🔧 Insert Applet',
    modalLink: '🔗 Link',
    modalSvgPaste: 'Paste SVG code or upload an SVG file',
    modalSvgCode: 'SVG Code',
    modalUploadSvg: 'Upload SVG File',

    // Buttons in modals
    btnCancel: 'Cancel',
    btnInsert: 'Insert',
    btnInsertUpdate: 'Insert / Update',
    btnApplyPresentation: 'Apply to Presentation',
    btnApplyAll: 'Apply to All',

    // Slide panel
    slideTitle: 'Slide Title',
    slideTransition: 'Transition',
    slideAutoAdvance: 'Auto (sec)',

    // Toast messages
    toastRestored: 'Session restored',
    toastThemeApplied: 'Theme applied',
    toastSelectTheme: 'Select a theme first',
    toastSelectEl: 'Select an element first',
    toastSelect2: 'Select 2+ elements to distribute',
    toastNeedSlide: 'Need at least one slide',
    toastPasteSvg: 'Paste SVG code',
    toastInvalidSvg: 'Invalid SVG',
    toastCopied: 'Copied — Ctrl+V to paste',
    toastNothingPaste: 'Nothing to paste — copy an element first with Ctrl+C',
    toastPasted: 'Pasted',
    toastImgBg: 'Image set as slide background',
    toastAnimAdded: 'Animation added',
    toastSelectIcon: 'Select an icon',
    toastNothingSelected: 'Nothing selected',
    toastNothingToPaste: 'Nothing to paste',
    toastTriggerOn: 'Object is now a trigger — click on it to fire anims',
    toastTriggerOff: 'Trigger removed — click anywhere fires anims',

    // Align buttons
    btnAlignSel: 'Sel',
    btnAlignSlide: 'Slide',

    // Anim empty
    animEmpty: 'Select a slide to see its animations.\nAdd elements and assign animations\nfrom the Animations ribbon tab.',

    // File tab
    fileTab: 'File',

    // Sections
    darkThemes: '🌙 Dark',
    lightThemes: '☀️ Light',

    // Icon modal
    iconSearch: 'Search icons…',
    iconStyle: 'Style',
    iconStyleStroke: 'Stroke',
    iconStyleFill: 'Fill',
    iconStyleDuotone: 'Duotone',
    iconColor: 'Color',
    iconStrokeW: 'Stroke W',
    iconInsert: 'Insert',
    iconCancel: 'Cancel',

    // Shape modal
    shapeFill: 'Fill',
    shapeStroke: 'Stroke',
    shapeStrokeW: 'Stroke W',

    // Additional props labels
    propSlideBg: 'Slide Background',
    propDimW: 'W',
    propDimH: 'H',
    propFillOpacity: 'Opacity',
    propBgBlur: 'Background Blur',
    propShapeStrokeW: 'Stroke Width',
    propShapeCornerR: 'Corner Radius',
    propShapeFontSize: 'Font Size',
    propShapeWeight: 'Weight',
    propImgFit: 'Fit',
    propImgStrokeW: 'Stroke Width',
    propImgCornerR: 'Corner Radius',
    propImgBlur: 'Blur',
    propImgShadowColor: 'Shadow Color',
    propImgOpacity: 'Image Opacity',
    propCodeLang: 'Language',
    propCodeFontSize: 'Font Size',
    propIconSize: 'Size',
    propIconColor: 'Color',
    propIconStyle: 'Style',
    propIconStrokeW: 'Stroke Width',
    propIconOpacity: 'Opacity',
    propTblFontSize: 'Font Size',
    propTblCornerR: 'Corner Radius',
    propTblBgOp: 'BG Opacity',
    propTblBgBlur: 'Blur',
    propTblLines: 'Table Lines',
    propTblTextColor: 'Text Color',
    propTblHeader: 'Header',
    propHfxScale: 'Scale',
    propHfxDuration: 'Duration',
    propHfxGlowColor: 'Glow / Shadow Color',
    propHfxOpacity: 'Opacity',
    propHfxShadowBlur: 'Shadow Blur',
    propLinkUrl: 'URL or #slide-N',
    propLinkTarget: 'Target',
    propSvgCode: 'SVG Code',
    propLinkType: 'Type',
    propLinkUrl2: 'URL',
    propLinkOpenIn: 'Open in',
    propMdBg: 'Background',
    propMdBlur: 'Blur',
    propMdCornerR: 'Corner Radius',
    propMdBorder: 'Border',
  },

  ru: {
    // App
    appName: 'Слайды',
    newPresentation: 'Новая презентация',

    // Tabs
    tabHome: 'Главная',
    tabInsert: 'Вставка',
    tabDesign: 'Дизайн',
    tabAnim: 'Анимации',
    tabTransitions: 'Переходы',
    tabSlideshow: 'Показ',
    tabFile: 'Файл',

    // Ribbon groups
    grpSlides: 'Слайды',
    grpObjects: 'Объекты',
    grpEdit: 'Правка',
    grpInsert: 'Вставить',
    grpBackground: 'Фон',
    grpDesign: 'Дизайн',
    grpAnimations: 'Анимации',
    grpTiming: 'Тайминг',
    grpTransition: 'Эффект перехода',
    grpSettings: 'Параметры',
    grpPresent: 'Показ',
    grpAutoAdvance: 'Авто-переход',
    grpPlayback: 'Воспроизведение',
    grpFile: 'Файл',

    // Slide buttons
    btnNewSlide: 'Новый слайд',
    btnDelete: 'Удалить',
    btnUndo: 'Отменить',
    btnRedo: 'Повторить',
    btnImport: 'Импорт',
    btnExport: 'Экспорт',
    resetFormat: 'Сбросить',
    btnDuplicate: 'Дублировать',
    // Анимации
    animFadeIn: 'Появление', animSlideUp: 'Подъём', animZoomIn: 'Масштаб',
    animBounce: 'Отскок', animSpin: 'Вращение', animFadeOut: 'Исчезновение',
    animSlideOut: 'Выезд', animZoomOut: 'Уменьшение', animPulse: 'Пульс',
    animShake: 'Дрожание', animFlash: 'Мигание',
    // Переходы
    transNone: 'Нет', transFade: 'Затухание', transSlide: 'Сдвиг',
    transZoom: 'Масштаб', transFlip: 'Переворот', transCube: 'Куб',
    transDissolve: 'Растворение', transMorph: 'Морфинг',
    // Роли текста
    roleBodyText: 'Основной текст', roleHeading: 'Заголовок',
    // Разное
    btnRemove: 'Удалить', btnApply: 'Применить',
    btnAlignSelShort: 'Выд.', btnAlignSlideShort: 'Слайд',
    propClearAllAnims: 'Очистить всё',

    btnLink: 'Ссылка',
    btnTextBox: 'Текстовое поле',
    btnFromStart: 'С начала',
    btnCurrent: 'Текущий',

    // Insert buttons
    btnText: 'Текст',
    btnImage: 'Изображение',
    btnShape: 'Фигура',
    btnIcon: 'Значок',
    btnSvg: 'SVG',
    btnCode: 'Код',
    btnMarkdown: 'MD',
    btnApplet: 'Аплет',

    // Design
    btnTheme: 'Цветовая схема',
    btnLayout: 'Тема',
    btnAddAnim: 'Добавить анимацию',
    btnApplyToAll: 'Применить ко всем',

    // Present
    btnPresent: 'Показать',
    btnFullscreen: 'На весь экран',

    // Settings
    settingsTitle: '⚙ Параметры',
    settingsTheme: 'Тема интерфейса',
    settingsThemeSub: 'Цветовая схема интерфейса',
    settingsThemeDark: '🌙 Тёмная',
    settingsThemeLight: '☀ Светлая',
    settingsSnap: 'Привязка к сетке',
    settingsSnapSub: 'Выравнивание элементов по сетке 10px',
    settingsLanguage: 'Язык',
    settingsLanguageSub: 'Язык интерфейса',
    settingsVersion: 'Версия',
    settingsAuthor: 'Автор',
    settingsDone: 'Готово',

    // Props panel
    propRole: 'Роль',
    propSize: 'Размер',
    propWeight: 'Насыщенность',
    propTextColor: 'Цвет текста',
    propBgColor: 'Цвет фона',
    propOpacity: 'Прозрачность',
    propLineH: 'Межстрочный',
    propSpacing: 'Интервал',
    propRotation: 'Поворот (°)',
    propCornerRadius: 'Скругление углов',
    propPadding: 'Отступ (px)',
    propBorder: 'Граница',
    propElOpacity: 'Прозрачность элемента',
    propFillColor: 'Цвет заливки',
    propStrokeColor: 'Цвет обводки',
    propStrokeWidth: 'Ширина обводки',
    propShadow: 'Тень',
    propShadowBlur: 'Размытие',
    propShadowColor: 'Цвет тени',
    propLink: 'Ссылка',
    propLinkTarget: 'Открытие',
    propClickThrough: 'Клик при показе',
    propAlign: 'Клик по слайду — следующий',
    propNewTab: 'Новая вкладка',
    propSameTab: 'Текущая вкладка',
    propClearAll: 'Очистить всё',
    propEditText: '✏️ Редактировать текст (или двойной клик)',
    propCoverSlide: '📐 На весь слайд',
    propEditCode: '✏️ Редактировать код',
    propEditMd: '✏️ Редактировать Markdown',
    propLockAspect: 'Зафикс.',
    propUnit: 'Единица:',
    propLock: 'Зафикс.',

    // Modals
    modalCode: '{ } Блок кода',
    modalMd: '# Markdown блок',
    modalLayout: '🖼 Применить тему',
    layoutDesc: 'Декоративный стиль для всех слайдов. Использует цвета текущей темы.',
    modalTheme: 'Цветовая схема',
    modalIcon: '🔍 Значки',
    modalSvg: '⬡ Вставить SVG',
    modalShape: '⬡ Вставить фигуру',
    modalApplet: '🔧 Вставить аплет',
    modalLink: '🔗 Ссылка',
    modalSvgPaste: 'Вставьте SVG-код или загрузите SVG-файл',
    modalSvgCode: 'SVG-код',
    modalUploadSvg: 'Загрузить SVG-файл',

    // Buttons in modals
    btnCancel: 'Отмена',
    btnInsert: 'Вставить',
    btnInsertUpdate: 'Вставить / Обновить',
    btnApplyPresentation: 'Применить к презентации',
    btnApplyAll: 'Применить ко всем',

    // Slide panel
    slideTitle: 'Заголовок слайда',
    slideTransition: 'Переход',
    slideAutoAdvance: 'Авто (сек)',

    // Toast messages
    toastRestored: 'Сессия восстановлена',
    toastThemeApplied: 'Тема применена',
    toastSelectTheme: 'Сначала выберите тему',
    toastSelectEl: 'Сначала выберите элемент',
    toastSelect2: 'Выберите 2+ элемента для распределения',
    toastNeedSlide: 'Нужен хотя бы один слайд',
    toastPasteSvg: 'Вставьте SVG-код',
    toastInvalidSvg: 'Некорректный SVG',
    toastCopied: 'Скопировано — Ctrl+V для вставки',
    toastNothingPaste: 'Нечего вставлять — скопируйте элемент через Ctrl+C',
    toastPasted: 'Вставлено',
    toastImgBg: 'Изображение задано как фон слайда',
    toastAnimAdded: 'Анимация добавлена',
    toastSelectIcon: 'Выберите значок',
    toastNothingSelected: 'Ничего не выделено',
    toastNothingToPaste: 'Нечего вставлять',
    toastTriggerOn: 'Объект — триггер. Клик по нему запускает анимации',
    toastTriggerOff: 'Триггер снят — клик в любом месте запускает анимации',

    // Align buttons
    btnAlignSel: 'Выд.',
    btnAlignSlide: 'Слайд',

    // Anim empty
    animEmpty: 'Выберите слайд для просмотра анимаций.\nДобавьте элементы и назначьте анимации\nна вкладке «Анимации».',

    // File tab
    fileTab: 'Файл',

    // Sections
    darkThemes: '🌙 Тёмные',
    lightThemes: '☀️ Светлые',

    // Icon modal
    iconSearch: 'Поиск значков…',
    iconStyle: 'Стиль',
    iconStyleStroke: 'Контур',
    iconStyleFill: 'Заливка',
    iconStyleDuotone: 'Дуотон',
    iconColor: 'Цвет',
    iconStrokeW: 'Толщина',
    iconInsert: 'Вставить',
    iconCancel: 'Отмена',

    // Shape modal
    shapeFill: 'Заливка',
    shapeStroke: 'Обводка',
    shapeStrokeW: 'Толщина',

    // Additional props labels
    propSlideBg: 'Фон слайда',
    propDimW: 'Ш',
    propDimH: 'В',
    propFillOpacity: 'Прозрачность',
    propBgBlur: 'Размытие фона',
    propShapeStrokeW: 'Толщина обводки',
    propShapeCornerR: 'Скругление',
    propShapeFontSize: 'Размер шрифта',
    propShapeWeight: 'Насыщенность',
    propImgFit: 'Заполнение',
    propImgStrokeW: 'Толщина обводки',
    propImgCornerR: 'Скругление',
    propImgBlur: 'Размытие',
    propImgShadowColor: 'Цвет тени',
    propImgOpacity: 'Прозрачность',
    propCodeLang: 'Язык',
    propCodeFontSize: 'Размер шрифта',
    propIconSize: 'Размер',
    propIconColor: 'Цвет',
    propIconStyle: 'Стиль',
    propIconStrokeW: 'Толщина обводки',
    propIconOpacity: 'Прозрачность',
    propTblFontSize: 'Размер шрифта',
    propTblCornerR: 'Скругление',
    propTblBgOp: 'Прозр. фона',
    propTblBgBlur: 'Размытие',
    propTblLines: 'Линии таблицы',
    propTblTextColor: 'Цвет текста',
    propTblHeader: 'Заголовок',
    propHfxScale: 'Масштаб',
    propHfxDuration: 'Длительность',
    propHfxGlowColor: 'Цвет свечения / тени',
    propHfxOpacity: 'Прозрачность',
    propHfxShadowBlur: 'Размытие тени',
    propLinkUrl: 'URL или #slide-N',
    propLinkTarget: 'Цель',
    propSvgCode: 'SVG-код',
    propLinkType: 'Тип',
    propLinkUrl2: 'URL',
    propLinkOpenIn: 'Открыть в',
    propMdBg: 'Фон',
    propMdBlur: 'Размытие',
    propMdCornerR: 'Скругление',
    propMdBorder: 'Контур',
    // Section headers (ph)
    phSlideObjects: 'Объекты слайда',
    phSlide: 'Слайд',
    phElement: 'Элемент',
    phText: 'Текст',
    phShapeStyle: 'Стиль фигуры',
    phShapeText: 'Текст фигуры',
    phImage: 'Изображение',
    phCodeBlock: 'Блок кода',
    phMarkdown: 'Markdown',
    phMdBgColor: 'Цвет фона',
    phMdCornerR: 'Скругление',
    phMdBorder: 'Контур',
    phIcon: 'Значок',
    phTable: 'Таблица',
    phCell: 'Ячейка',
    phAnimations: 'Анимации',
    phHoverEffect: '🖱 Эффект при наведении',
    phLink: 'Ссылка',
    // Buttons
    btnShadowEnable: 'Включить тень',
    btnCropImage: '✂️ Обрезка',
    btnCoverSlide: '📐 На весь слайд (фон)',
    btnClearBg: '✕',
    // Inline labels
    propOpacityShort: 'Прозрачность',
    propBlurShort: 'Размытие',
    toastCropApplied: 'Обрезка сохранена',
    toastFormattingReset: 'Форматирование сброшено',
    toastImagePasted: 'Изображение вставлено',
    toastTextPasted: 'Текст вставлен',
    toastElementsSelected: ' элементов выбрано',
    toastElementsCopied: 'Скопировано: ',
    toastElementsPasted: 'Вставлено: ',
    toastElementsSuffix: ' эл.',
    toastMultiSel: ' эл. выбрано — Ctrl+C копировать',
  }
};

// Current language — loaded from localStorage or default RU
let _lang = localStorage.getItem('slides_lang') || 'ru';

function t(key) {
  return (LANG_DATA[_lang] && LANG_DATA[_lang][key]) || (LANG_DATA.en[key]) || key;
}

function getLang() { return _lang; }

// Apply translations to all data-i18n elements in DOM
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.tagName === 'INPUT' && el.type !== 'button') {
      el.placeholder = val;
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  // Update <option> elements with data-i18n
  document.querySelectorAll('option[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  // Update page title
  document.title = t('appName');
  // Update app name in header
  const nameEl = document.getElementById('app-name-span');
  if (nameEl) nameEl.textContent = t('appName');
  // Update pres-title placeholder
  const presTitle = document.getElementById('pres-title');
  if (presTitle && !presTitle.value) presTitle.placeholder = t('newPresentation');
}

function syncLangButtons() {
  const ru = document.getElementById('lang-ru');
  const en = document.getElementById('lang-en');
  if (ru) ru.classList.toggle('active', _lang === 'ru');
  if (en) en.classList.toggle('active', _lang === 'en');
}

function setLang(lang) {
  _lang = lang;
  localStorage.setItem('slides_lang', lang);
  applyI18n();
  syncLangButtons();
  // Rebuild dynamic UI that has translated strings
  if (typeof buildThemeGrid === 'function') buildThemeGrid();
  if (typeof buildLayoutGrid === 'function') buildLayoutGrid();
}
