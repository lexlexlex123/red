import { editorApi } from '../../../editor/editorApi';
import { usePresentationStore } from '../../../stores/presentationStore';
import { extraGuidesKind, useUiStore } from '../../../stores/uiStore';
import { chromeIconId } from '../../../editor/app-icons-data.js';

export function getTabGroups(activeTab, lang, snap = {}) {
  const ru = lang !== 'en';
  const ui = useUiStore.getState();
  const pres = usePresentationStore.getState();
  const drawTool = snap.drawTool != null ? snap.drawTool : pres.drawTool || 'cursor';
  const guides = snap.extraGuidesMode != null ? snap.extraGuidesMode : ui.extraGuidesMode;
  const connOn = snap.connectorMode !== undefined ? !!snap.connectorMode : !!ui.connectorMode;
  const voiceOn = snap.voiceListening != null ? !!snap.voiceListening : !!ui.voiceListening;
  const findOn = snap.findOpen != null ? !!snap.findOpen : !!ui.findOpen;
  const G = (labelRu, labelEn, buttons) => ({ label: ru ? labelRu : labelEn, buttons });
  const B = (labelRu, labelEn, icon, onClick, opts = {}) => ({
    label: ru ? labelRu : labelEn,
    title: opts.title || (ru ? labelRu : labelEn),
    icon: chromeIconId(icon) || icon,
    primary: !!opts.primary,
    on: !!opts.on,
    className: opts.className || '',
    onClick,
  });

  switch (activeTab) {
    case 'home':
      return [
        G('Объекты', 'Objects', [
          B('Текст', 'Text', 'text', () => editorApi.addText()),
          B('Изображение', 'Image', 'image', () => editorApi.openImagePicker()),
          B('Фигура', 'Shape', 'shape', () => editorApi.openShapePicker()),
          B('Значок', 'Icon', 'icon', () => editorApi.openIconPicker()),
          B('Таблица', 'Table', 'table', () => editorApi.openTablePicker()),
          B('Ссылка', 'Link', 'link', () => editorApi.openLinkModal()),
        ]),
        G('Компоновка', 'Layout', [
          B('Разместить\nобъекты', 'Arrange', 'autoplace', () => editorApi.autoPlace()),
          B('Подогнать\nтексты', 'Fit\ntexts', 'text', () => editorApi.autofitSlideTexts({ shrink: true })),
          B('Сгруппи-\nровать', 'Group', 'group', () => editorApi.groupSelected()),
          B('Разгруппи-\nровать', 'Ungroup', 'ungroup', () => editorApi.ungroupSelected()),
        ]),
        G('Правка', 'Edit', [
          B('Отменить', 'Undo', 'undo', () => editorApi.undo()),
          B('Повторить', 'Redo', 'redo', () => editorApi.redo()),
        ]),
        G('Направляющие', 'Guides', [
          B('Сетка', 'Grid', 'thirds', () => editorApi.toggleExtraGuides('grid'), {
            on: extraGuidesKind(guides) === 'grid',
            title: ru ? 'Сетка каждые 120 px' : 'Grid every 120 px',
          }),
          B('Поля', 'Margins', 'golden', () => editorApi.toggleExtraGuides('margin'), {
            on: extraGuidesKind(guides) === 'margin',
            title: ru ? 'Поля 40 px от краёв слайда' : '40 px slide margins',
          }),
          B('2 колонки', '2 Columns', 'table', () => editorApi.toggleExtraGuides('col2'), {
            on: extraGuidesKind(guides) === 'col2',
            title: ru
              ? 'Поля + 2 колонки (промежуток 40 px) + горизонтали на 120 и 160 px'
              : 'Margins + 2 columns (40 px gutter) + horizontals at 120 & 160 px',
          }),
          B('3 колонки', '3 Columns', 'table', () => editorApi.toggleExtraGuides('col3'), {
            on: extraGuidesKind(guides) === 'col3',
            title: ru
              ? 'Поля + 3 колонки (промежутки 40 px) + горизонтали на 120 и 160 px'
              : 'Margins + 3 columns (40 px gutters) + horizontals at 120 & 160 px',
          }),
          B('История', 'History', 'history', () => editorApi.openVersionHistory()),
        ]),
      ];
    case 'insert':
      return [
        G('Вставить', 'Insert', [
          B('Текст', 'Text', 'text', () => editorApi.addText()),
          B('Изображение', 'Image', 'image', () => editorApi.openImagePicker()),
          B('Фигура', 'Shape', 'shape', () => editorApi.openShapePicker()),
          B('Значки', 'Icons', 'icon', () => editorApi.openIconPicker()),
          B('SVG', 'SVG', 'svg', () => editorApi.addSvg()),
          B('Код', 'Code', 'code', () => editorApi.addCode()),
          B('<html>', '<html>', 'html', () => editorApi.addHtmlFrame()),
          B('Markdown', 'Markdown', 'markdown', () => editorApi.addMarkdown()),
          B('Формула', 'Formula', 'formula', () => editorApi.addFormula()),
          B('Аплет', 'Applet', 'applet', () => editorApi.openAppletModal()),
          B('Таблица', 'Table', 'table', () => editorApi.openTablePicker()),
          B('Ссылка', 'Link', 'link', () => editorApi.openLinkModal()),
          B('Связи', 'Connect', 'connector', () => editorApi.startConnectorMode('line'), {
            title: ru ? 'Режим связей: клик → клик (Esc — выход)' : 'Connect mode: click → click (Esc to exit)',
            on: connOn,
          }),
          B('Видео', 'Video', 'video', () => editorApi.addVideo()),
          B('Аудио', 'Audio', 'audio', () => editorApi.addAudio()),
          B('OBJ', 'OBJ', 'obj', () => editorApi.addModel3dFromFile(), {
            title: ru ? 'Импорт OBJ' : 'Import OBJ',
          }),
        ]),
      ];
    case 'objects':
      return [
        G('Компоновка', 'Layout', [
          B('Разместить\nобъекты', 'Arrange\nobjects', 'autoplace', () => editorApi.autoPlace()),
        ]),
        G('Группировка', 'Grouping', [
          B('Сгруппировать', 'Group', 'group', () => editorApi.groupSelected()),
          B('Разгруппировать', 'Ungroup', 'ungroup', () => editorApi.ungroupSelected()),
        ]),
      ];
    case 'design':
      return [
        G('Дизайн', 'Design', [
          B('Цветовая\nсхема', 'Color\nscheme', 'theme', () => editorApi.openThemeModal()),
          B('Тема', 'Theme', 'bg', () => editorApi.openLayoutModal()),
        ]),
      ];
    case 'tools':
      return [
        G('Голос', 'Voice', [
          B('Микрофон', 'Mic', 'mic', () => void editorApi.toggleVoice(), {
            title: ru ? 'Голосовые команды вкл/выкл' : 'Toggle voice commands',
            primary: true,
            on: voiceOn,
          }),
        ]),
        G('AI', 'AI', [
          B('Ассистент', 'Assistant', 'ai', () => editorApi.openAiPanel(), { primary: true }),
        ]),
        G('Перевод', 'Translate', [
          B('Текст', 'Text', 'translate', () => void editorApi.translateSelection()),
          B('Вся\nпрезентация', 'Whole\ndeck', 'translate', () => void editorApi.translateDeck()),
        ]),
        G('Правка', 'Edit', [
          B('Найти', 'Find', 'search', () => editorApi.openFind(), {
            title: ru ? 'Поиск по слайдам (Ctrl+F)' : 'Find in slides (Ctrl+F)',
            on: findOn,
          }),
          B('Заменить', 'Replace', 'search', () => editorApi.openReplace(), {
            title: ru ? 'Найти и заменить (Ctrl+H)' : 'Find and replace (Ctrl+H)',
            on: findOn,
          }),
        ]),
      ];
    case 'anim': {
      const playing = !!(snap.slideAnimPlaying != null ? snap.slideAnimPlaying : ui.slideAnimPlaying);
      return [
        G('Просмотр', 'Preview', [
          playing
            ? B('Стоп\n\u00a0', 'Stop\n\u00a0', 'stop', () => void editorApi.stopSlideAnims(), {
                primary: true,
                on: true,
                className: 'react-rb-anim-toggle',
                title: ru ? 'Остановить анимации' : 'Stop animations',
              })
            : B('Проиграть\nанимации', 'Play\nanims', 'play', () => void editorApi.playSlideAnims(), {
                primary: true,
                className: 'react-rb-anim-toggle',
                title: ru ? 'Проиграть анимации слайда на холсте' : 'Play slide anims on canvas',
              }),
        ]),
      ];
    }
    case 'transitions':
      return [];
    case 'drawing':
      return [
        G('Рисование', 'Drawing', [
          B('Курсор', 'Cursor', 'cursor', () => editorApi.setDrawTool('cursor'), { on: drawTool === 'cursor' }),
          B('Кисть', 'Brush', 'brush', () => editorApi.setDrawTool('brush'), { on: drawTool === 'brush' }),
          B('Неон', 'Neon', 'neon', () => editorApi.setDrawTool('neon'), { on: drawTool === 'neon' }),
          B('Маркер', 'Marker', 'marker', () => editorApi.setDrawTool('marker'), { on: drawTool === 'marker' }),
          B('Заливка', 'Fill', 'paint', () => editorApi.setDrawTool('fill'), { on: drawTool === 'fill' }),
          B('Ластик', 'Eraser', 'eraser', () => editorApi.setDrawTool('eraser'), { on: drawTool === 'eraser' }),
          B('Очистить', 'Clear', 'clear', () => editorApi.clearInk()),
        ]),
      ];
    case 'slideshow':
      return [
        G('Показ', 'Present', [
          B('С начала', 'From start', 'play', () => editorApi.startPreview(0), {
            primary: true,
            title: ru ? 'С начала (F5)' : 'From start (F5)',
          }),
          B('Текущий', 'Current', 'play', () => editorApi.startPreview('__cur__'), {
            title: ru ? 'С текущего слайда (Shift+F5)' : 'From current (Shift+F5)',
          }),
        ]),
      ];
    default:
      return [];
  }
}

export function getImportExportActions(lang) {
  const ru = lang !== 'en';
  return {
    import: {
      label: ru ? 'Импорт' : 'Import',
      title: ru ? 'Импорт презентации' : 'Import presentation',
      icon: chromeIconId('import'),
      onClick: () => useUiStore.getState().openImportModal(),
    },
    export: {
      label: ru ? 'Экспорт' : 'Export',
      title: ru ? 'Экспорт' : 'Export',
      icon: chromeIconId('export'),
      primary: true,
    },
    exportItems: [
      {
        ext: '.json',
        label: ru ? 'Проект (компактный)' : 'Project (compact JSON)',
        onClick: () => editorApi.exportJSON(),
      },
      {
        ext: '.html',
        label: ru ? 'HTML полный' : 'HTML full',
        onClick: () => editorApi.exportHTML(),
      },
      {
        ext: '.pptx',
        label: ru ? 'PowerPoint' : 'PowerPoint',
        onClick: () => editorApi.exportPPTX(),
      },
      {
        ext: '.pdf',
        label: ru ? 'PDF-документ' : 'PDF document',
        onClick: () => editorApi.exportPDF(),
      },
      {
        ext: '.png',
        label: ru ? 'PNG-изображения' : 'PNG images',
        onClick: () => useUiStore.getState().openPngExportModal(),
      },
      {
        ext: '.odp',
        label: 'OpenDocument',
        onClick: () => editorApi.exportODP(),
      },
    ],
  };
}
