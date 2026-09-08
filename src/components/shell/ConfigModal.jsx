import React, { useEffect, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { useHistoryStore } from '../../stores/historyStore';
import { editorApi } from '../../editor/editorApi';
import { APP_VERSION, versionAttr } from '../../editor/versions.js';
import { TRANSITION_DEFS } from '../../editor/transitions.js';
import { PN_POSITIONS, PN_STYLES } from '../../editor/pagenum.js';
import {
  TRANSLATE_LANGS,
  getTranslateDeckLang,
  getTranslatePair,
  langDisplayName,
  setTranslateDeckLang,
  setTranslatePair,
} from '../../editor/translate.js';

const APP_AUTHOR = 'Некрасов Александр';
const LS_KEY = 'sf_react_v1';

const SECTIONS = [
  { id: 'canvas', ru: 'Холст', en: 'Canvas' },
  { id: 'anim', ru: 'Анимации', en: 'Animations' },
  { id: 'persist', ru: 'Сохранение', en: 'Saving' },
  { id: 'pagenum', ru: 'Нумерация', en: 'Numbers' },
  { id: 'ui', ru: 'Интерфейс', en: 'Interface' },
  { id: 'translate', ru: 'Перевод', en: 'Translate' },
  { id: 'export', ru: 'Экспорт', en: 'Export' },
  { id: 'keys', ru: 'Клавиши', en: 'Keys' },
];

const HOTKEYS = [
  ['Ctrl+Z', 'Отменить', 'Undo'],
  ['Ctrl+Y / Ctrl+Shift+Z', 'Повторить', 'Redo'],
  ['Ctrl+C', 'Копировать', 'Copy'],
  ['Ctrl+V', 'Вставить', 'Paste'],
  ['Ctrl+D', 'Дублировать', 'Duplicate'],
  ['Ctrl+A', 'Выделить всё', 'Select all'],
  ['Delete', 'Удалить элемент', 'Delete element'],
  ['F5', 'Показ с начала', 'Slideshow from start'],
  ['Shift+F5', 'Показ с текущего', 'Slideshow from current'],
  ['Esc', 'Выйти из показа', 'Exit slideshow'],
  ['← →', 'Слайды (показ)', 'Slides (show)'],
  ['↑ ↓ ← →', 'Сдвиг на 1px', 'Nudge 1px'],
  ['Shift + ↑↓←→', 'Сдвиг на 10px', 'Nudge 10px'],
];

function NavIcon({ id }) {
  const common = { viewBox: '0 0 24 24', width: 16, height: 16, 'aria-hidden': true };
  switch (id) {
    case 'canvas':
      return (
        <svg {...common} fill="none" stroke="#3b82f6" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 20h8" strokeLinecap="round" />
        </svg>
      );
    case 'anim':
      return (
        <svg {...common} fill="#f59e0b" stroke="none">
          <path d="M12 2l1.2 4.2L17 7.5l-3.8 1.3L12 13l-1.2-4.2L7 7.5l3.8-1.3z" />
          <path d="M18 13l.7 2.2 2.3.8-2.3.8L18 19l-.7-2.2-2.3-.8 2.3-.8z" opacity=".85" />
          <path d="M6 14l.6 1.8 1.9.6-1.9.6L6 19l-.6-1.8-1.9-.6 1.9-.6z" opacity=".7" />
        </svg>
      );
    case 'persist':
      return (
        <svg {...common} fill="none" stroke="#8b5cf6" strokeWidth="1.7">
          <path d="M5 4h11l3 3v13H5V4z" />
          <path d="M8 4v5h8V4M8 20v-6h8v6" />
        </svg>
      );
    case 'pagenum':
      return (
        <svg {...common} fill="none" stroke="#3b82f6" strokeWidth="1.5">
          <rect x="3" y="3" width="8" height="8" rx="1.2" />
          <rect x="13" y="3" width="8" height="8" rx="1.2" />
          <rect x="3" y="13" width="8" height="8" rx="1.2" />
          <rect x="13" y="13" width="8" height="8" rx="1.2" />
          <text x="7" y="9" textAnchor="middle" fill="#3b82f6" stroke="none" fontSize="6" fontWeight="700">
            1
          </text>
          <text x="17" y="9" textAnchor="middle" fill="#3b82f6" stroke="none" fontSize="6" fontWeight="700">
            2
          </text>
          <text x="7" y="19" textAnchor="middle" fill="#3b82f6" stroke="none" fontSize="6" fontWeight="700">
            3
          </text>
          <text x="17" y="19" textAnchor="middle" fill="#3b82f6" stroke="none" fontSize="6" fontWeight="700">
            4
          </text>
        </svg>
      );
    case 'ui':
      return (
        <svg {...common} fill="none" stroke="#f472b6" strokeWidth="1.7">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4v16M12 12c2.5-2 5-2.2 8-1.2" />
          <circle cx="9" cy="9" r="1.2" fill="#f472b6" stroke="none" />
          <circle cx="15.5" cy="8.5" r="1.1" fill="#fb923c" stroke="none" />
          <circle cx="9.5" cy="15" r="1.1" fill="#60a5fa" stroke="none" />
        </svg>
      );
    case 'translate':
      return (
        <svg {...common} fill="none" stroke="#38bdf8" strokeWidth="1.7">
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16M12 4c2.4 2.8 3.6 5.6 3.6 8S14.4 17.2 12 20c-2.4-2.8-3.6-5.6-3.6-8S9.6 6.8 12 4z" />
        </svg>
      );
    case 'export':
      return (
        <svg {...common} fill="none" stroke="#ef4444" strokeWidth="1.7">
          <path d="M7 14v5h10v-5" />
          <path d="M12 16V5M8.5 8.5L12 5l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'keys':
      return (
        <svg {...common} fill="none" stroke="#94a3b8" strokeWidth="1.7">
          <rect x="2" y="7" width="20" height="11" rx="2" />
          <path d="M6 11h.01M10 11h.01M14 11h.01M18 11h.01M8 15h8" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

function CfgRow({ label, children }) {
  return (
    <div className="cfg-row">
      <span className="cfg-row-label">{label}</span>
      {children}
    </div>
  );
}

function CfgInfo({ children }) {
  return <p className="cfg-info">{children}</p>;
}

function CfgChk({ checked, onChange }) {
  return (
    <label className="cfg-chk">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function CfgNum({ value, min, max, step, onCommit, width }) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    setLocal(value);
  }, [value]);
  function commit(raw) {
    const n = +raw;
    if (!Number.isFinite(n)) {
      setLocal(value);
      return;
    }
    const clamped = Math.max(min, Math.min(max, n));
    setLocal(clamped);
    onCommit(clamped);
  }
  return (
    <input
      className="cfg-num"
      type="number"
      min={min}
      max={max}
      step={step}
      style={width ? { width } : undefined}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}

function CfgColor({ value, onChange }) {
  const v = value || '#3b82f6';
  return (
    <div className="cfg-color">
      <input type="color" value={v} onChange={(e) => onChange(e.target.value)} />
      <input
        type="text"
        maxLength={7}
        value={v}
        onChange={(e) => {
          const hex = e.target.value;
          if (/^#[0-9a-fA-F]{6}$/.test(hex)) onChange(hex);
        }}
      />
    </div>
  );
}

function SectionCanvas({ ru }) {
  const canvasW = usePresentationStore((s) => s.canvasW);
  const canvasH = usePresentationStore((s) => s.canvasH);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const setSnapEnabled = useUiStore((s) => s.setSnapEnabled);
  const snapStep = useUiStore((s) => s.snapStep);
  const setSnapStep = useUiStore((s) => s.setSnapStep);

  function applySize(w, h) {
    const W = Math.max(400, Math.min(4000, Math.round(+w || canvasW)));
    const H = Math.max(300, Math.min(3000, Math.round(+h || canvasH)));
    if (W === canvasW && H === canvasH) return;
    usePresentationStore.getState().resizeCanvasScaled(W, H, 'custom');
    editorApi._refreshDecorAfterResize();
  }

  return (
    <>
      <CfgRow label={ru ? 'Ширина холста' : 'Canvas width'}>
        <CfgNum value={canvasW} min={400} max={4000} step={1} onCommit={(w) => applySize(w, canvasH)} />
      </CfgRow>
      <CfgRow label={ru ? 'Высота холста' : 'Canvas height'}>
        <CfgNum value={canvasH} min={300} max={3000} step={1} onCommit={(h) => applySize(canvasW, h)} />
      </CfgRow>
      <CfgRow label={ru ? 'Шаг привязки (px)' : 'Snap step (px)'}>
        <CfgNum value={snapStep} min={1} max={50} step={1} onCommit={setSnapStep} />
      </CfgRow>
      <CfgRow label={ru ? 'Привязка к сетке' : 'Snap to grid'}>
        <CfgChk checked={snapEnabled} onChange={setSnapEnabled} />
      </CfgRow>
    </>
  );
}

function SectionAnim({ ru }) {
  const globalTransDur = usePresentationStore((s) => s.globalTransDur);
  const globalTrans = usePresentationStore((s) => s.globalTrans);
  const presAutoDelay = useUiStore((s) => s.presAutoDelay);

  return (
    <>
      <CfgRow label={ru ? 'Длительность перехода (мс)' : 'Transition duration (ms)'}>
        <CfgNum
          value={globalTransDur}
          min={0}
          max={5000}
          step={50}
          onCommit={(v) => usePresentationStore.getState().setGlobalTransDur(v)}
        />
      </CfgRow>
      <CfgRow label={ru ? 'Авто-переход по умолчанию (сек)' : 'Default auto-advance (sec)'}>
        <CfgNum value={presAutoDelay} min={1} max={120} step={1} onCommit={(v) => useUiStore.getState().setPresAutoDelay(v)} />
      </CfgRow>
      <CfgRow label={ru ? 'Глобальный переход' : 'Global transition'}>
        <select
          className="cfg-sel"
          value={globalTrans || 'none'}
          onChange={(e) => usePresentationStore.getState().setGlobalTrans(e.target.value)}
        >
          {TRANSITION_DEFS.map((t) => (
            <option key={t.id} value={t.id}>
              {ru ? t.nameRu : t.nameEn}
            </option>
          ))}
        </select>
      </CfgRow>
    </>
  );
}

function SectionPersist({ ru }) {
  const slides = usePresentationStore((s) => s.slides);
  const undoLen = useHistoryStore((s) => s.undoLen);
  const showToast = useUiStore((s) => s.showToast);
  let lsSize = '—';
  try {
    const raw = localStorage.getItem(LS_KEY) || '';
    lsSize = `${(raw.length / 1024).toFixed(1)} ${ru ? 'КБ' : 'KB'}`;
  } catch (e) {}

  return (
    <>
      <CfgInfo>
        {ru ? '📦 Данные в localStorage: ' : '📦 localStorage: '}
        {lsSize}
      </CfgInfo>
      <CfgInfo>
        {ru ? '📄 Слайдов в проекте: ' : '📄 Slides: '}
        {slides.length}
      </CfgInfo>
      <CfgInfo>
        {ru ? '↩ Шагов в истории undo: ' : '↩ Undo steps: '}
        {undoLen} / 80
      </CfgInfo>
      <hr className="cfg-hr" />
      <button
        type="button"
        className="cfg-btn"
        onClick={() => {
          usePresentationStore.getState().persist();
          showToast(ru ? 'Сохранено' : 'Saved', 'ok');
        }}
      >
        {ru ? '💾 Сохранить сейчас' : '💾 Save now'}
      </button>
      <button
        type="button"
        className="cfg-btn"
        onClick={() => {
          useHistoryStore.getState().clear();
          showToast(ru ? 'История очищена' : 'History cleared', 'ok');
        }}
      >
        {ru ? '🧹 Очистить историю undo/redo' : '🧹 Clear undo/redo history'}
      </button>
      <button
        type="button"
        className="cfg-btn cfg-btn-danger"
        onClick={() => {
          const ok = window.confirm(
            ru ? 'Удалить сохранённую сессию? Страница перезагрузится.' : 'Delete saved session? The page will reload.'
          );
          if (!ok) return;
          try {
            localStorage.removeItem(LS_KEY);
          } catch (e) {}
          location.reload();
        }}
      >
        {ru ? '♻️ Сбросить сессию (удалить localStorage)' : '♻️ Reset session (clear localStorage)'}
      </button>
    </>
  );
}

function SectionPageNum({ ru }) {
  const pn = usePresentationStore((s) => s.pnSettings) || {};
  return (
    <>
      <CfgRow label={ru ? 'Включить нумерацию' : 'Enable page numbers'}>
        <CfgChk checked={!!pn.enabled} onChange={(v) => editorApi.setPageNumbers({ enabled: v })} />
      </CfgRow>
      <CfgRow label={ru ? 'Стиль' : 'Style'}>
        <select className="cfg-sel" value={pn.style || 'simple'} onChange={(e) => editorApi.setPageNumbers({ style: e.target.value })}>
          {PN_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {ru ? s.labelRu : s.labelEn}
            </option>
          ))}
        </select>
      </CfgRow>
      <CfgRow label={ru ? 'Размер шрифта (px)' : 'Font size (px)'}>
        <CfgNum
          value={pn.fontSize || 14}
          min={8}
          max={48}
          step={1}
          onCommit={(v) => editorApi.setPageNumbers({ fontSize: v })}
        />
      </CfgRow>
      <CfgRow label={ru ? 'Прозрачность (0–1)' : 'Opacity (0–1)'}>
        <CfgNum
          value={pn.opacity != null ? pn.opacity : 1}
          min={0}
          max={1}
          step={0.05}
          onCommit={(v) => editorApi.setPageNumbers({ opacity: v })}
        />
      </CfgRow>
      <CfgRow label={ru ? 'Показывать итого (1/5)' : 'Show total (1/5)'}>
        <CfgChk checked={!!pn.showTotal} onChange={(v) => editorApi.setPageNumbers({ showTotal: v })} />
      </CfgRow>
      <CfgRow label={ru ? 'Позиция' : 'Position'}>
        <select
          className="cfg-sel"
          value={pn.position || 'br'}
          onChange={(e) => editorApi.setPageNumbers({ position: e.target.value, customXY: null })}
        >
          {PN_POSITIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id.toUpperCase()}
            </option>
          ))}
        </select>
      </CfgRow>
      <CfgRow label={ru ? 'Цвет фона' : 'Background color'}>
        <CfgColor value={pn.color || '#3b82f6'} onChange={(c) => editorApi.setPageNumbers({ color: c, customColor: true })} />
      </CfgRow>
      <CfgRow label={ru ? 'Цвет текста' : 'Text color'}>
        <CfgColor value={pn.textColor || '#ffffff'} onChange={(c) => editorApi.setPageNumbers({ textColor: c, customColor: true })} />
      </CfgRow>
    </>
  );
}

function SectionUi({ ru }) {
  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const lang = useUiStore((s) => s.lang);
  const setLang = useUiStore((s) => s.setLang);
  const voiceLogEnabled = useUiStore((s) => s.voiceLogEnabled);
  const setVoiceLogEnabled = useUiStore((s) => s.setVoiceLogEnabled);
  const fpsEnabled = useUiStore((s) => s.fpsEnabled);
  const setFpsEnabled = useUiStore((s) => s.setFpsEnabled);
  const aiFabEnabled = useUiStore((s) => s.aiFabEnabled);
  const setAiFabEnabled = useUiStore((s) => s.setAiFabEnabled);
  const colorBarEnabled = useUiStore((s) => s.colorBarEnabled);
  const setColorBarEnabled = useUiStore((s) => s.setColorBarEnabled);

  return (
    <>
      <CfgRow label={ru ? 'Тёмная тема' : 'Dark theme'}>
        <CfgChk checked={themeMode !== 'light'} onChange={(v) => setThemeMode(v ? 'dark' : 'light')} />
      </CfgRow>
      <CfgRow label={ru ? 'Язык интерфейса' : 'Interface language'}>
        <select className="cfg-sel" value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="ru">🇷🇺 Русский</option>
          <option value="en">🇬🇧 English</option>
        </select>
      </CfgRow>
      <CfgRow label={ru ? 'Показывать FPS' : 'Show FPS'}>
        <CfgChk checked={fpsEnabled} onChange={setFpsEnabled} />
      </CfgRow>
      <CfgInfo>
        {ru
          ? 'Счётчик кадров в правом верхнем углу редактора и показа. По умолчанию выключен. Если FPS падает на показе — проверьте chrome://gpu: WebGL должен быть Hardware accelerated (не Software only). Включите «Использовать аппаратное ускорение» в настройках Chrome → Система.'
          : 'Frame-rate counter in the top-right. If slideshow FPS drops, check chrome://gpu — WebGL must be Hardware accelerated. Enable hardware acceleration in Chrome → System.'}
      </CfgInfo>
      <CfgRow label={ru ? 'Лог голосовых команд (📋)' : 'Voice command log (📋)'}>
        <CfgChk checked={voiceLogEnabled} onChange={setVoiceLogEnabled} />
      </CfgRow>
      <CfgInfo>
        {ru
          ? 'Показывать кнопку 📋 рядом с «Голосовое» для копирования нераспознанных команд. По умолчанию скрыта.'
          : 'Show a 📋 button next to Voice to copy unrecognized commands. Hidden by default.'}
      </CfgInfo>
      <CfgRow label={ru ? 'AI-ассистент' : 'AI assistant'}>
        <CfgChk checked={aiFabEnabled} onChange={setAiFabEnabled} />
      </CfgRow>
      <CfgInfo>
        {ru
          ? 'Показывать плавающую кнопку AI-ассистента. По умолчанию скрыта.'
          : 'Show a floating AI assistant button. Hidden by default.'}
      </CfgInfo>
      <CfgRow label={ru ? 'Нижняя панель с палитрой' : 'Bottom color bar'}>
        <CfgChk checked={colorBarEnabled} onChange={setColorBarEnabled} />
      </CfgRow>
      <CfgInfo>
        {ru
          ? 'Показывать нижнюю панель быстрого выбора цвета на широком экране. По умолчанию включена.'
          : 'Show the bottom color palette on a wide screen. On by default.'}
      </CfgInfo>
      <hr className="cfg-hr" />
      <CfgInfo>
        ℹ Слайды v{APP_VERSION} · {APP_AUTHOR}
      </CfgInfo>
    </>
  );
}

function SectionTranslate({ ru }) {
  const showToast = useUiStore((s) => s.showToast);
  const pair = getTranslatePair();
  const [lang1, setLang1] = useState(pair.lang1);
  const [lang2, setLang2] = useState(pair.lang2);
  const [deck, setDeck] = useState(() => getTranslateDeckLang());

  function apply(a, b) {
    if (a === b) {
      showToast(ru ? 'Выберите два разных языка' : 'Choose two different languages', 'warn');
      return;
    }
    if (setTranslatePair(a, b)) {
      setLang1(a);
      setLang2(b);
      showToast(`${ru ? 'Переводчик: ' : 'Translator: '}${langDisplayName(a, ru)} ↔ ${langDisplayName(b, ru)}`, 'ok');
    }
  }

  const opts = TRANSLATE_LANGS.map((L) => ({
    value: L.code,
    label: ru ? L.nameRu : L.nameEn,
  }));

  return (
    <>
      <CfgRow label={ru ? 'Язык 1' : 'Language 1'}>
        <select
          className="cfg-sel cfg-sel-wide"
          value={lang1}
          onChange={(e) => {
            const a = e.target.value;
            let b = lang2;
            if (a === b) {
              const other = opts.find((o) => o.value !== a);
              if (other) b = other.value;
            }
            apply(a, b);
          }}
        >
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </CfgRow>
      <CfgRow label={ru ? 'Язык 2' : 'Language 2'}>
        <select
          className="cfg-sel cfg-sel-wide"
          value={lang2}
          onChange={(e) => {
            const b = e.target.value;
            let a = lang1;
            if (a === b) {
              const other = opts.find((o) => o.value !== b);
              if (other) a = other.value;
            }
            apply(a, b);
          }}
        >
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </CfgRow>
      <CfgRow label={ru ? 'Вся презентация' : 'Presentation'}>
        <select
          className="cfg-sel cfg-sel-wide"
          value={deck}
          onChange={(e) => {
            const v = e.target.value;
            setDeck(v);
            setTranslateDeckLang(v);
            showToast(`${ru ? 'Язык презентации: ' : 'Presentation language: '}${langDisplayName(v, ru)}`, 'ok');
          }}
        >
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </CfgRow>
      <CfgInfo>
        {ru
          ? 'Кнопка перевода в свойствах текста показывает целевой язык: если текст на языке 1 — на кнопке язык 2, и наоборот. Кнопка во вкладке «Дизайн» переводит все текстовые надписи на язык «Вся презентация».'
          : 'The translate button in text properties shows the target language. The Design tab button translates all captions to the presentation language.'}
      </CfgInfo>
    </>
  );
}

function SectionExport({ ru }) {
  const showToast = useUiStore((s) => s.showToast);
  return (
    <>
      <CfgInfo>{ru ? 'Быстрый доступ к экспорту и импорту.' : 'Quick export and import.'}</CfgInfo>
      <button type="button" className="cfg-btn" onClick={() => editorApi.exportHTML()}>
        {ru ? '📤 Экспорт в HTML' : '📤 Export HTML'}
      </button>
      <button type="button" className="cfg-btn" onClick={() => useUiStore.getState().openImportModal()}>
        {ru ? '📥 Импорт PPTX' : '📥 Import PPTX'}
      </button>
      <hr className="cfg-hr" />
      <CfgInfo>{ru ? 'JSON — снимок текущего состояния.' : 'JSON is a snapshot of the current state.'}</CfgInfo>
      <button
        type="button"
        className="cfg-btn"
        onClick={() => {
          try {
            const json = localStorage.getItem(LS_KEY) || '';
            navigator.clipboard.writeText(json).then(
              () => showToast(ru ? 'JSON скопирован в буфер' : 'JSON copied', 'ok'),
              () => showToast(ru ? 'Ошибка копирования' : 'Copy failed', 'err')
            );
          } catch (e) {
            showToast(ru ? 'Ошибка копирования' : 'Copy failed', 'err');
          }
        }}
      >
        {ru ? '📋 Скопировать JSON состояния' : '📋 Copy state JSON'}
      </button>
    </>
  );
}

function SectionKeys({ ru }) {
  return (
    <table className="cfg-keys">
      <tbody>
        {HOTKEYS.map(([k, ruLabel, enLabel]) => (
          <tr key={k}>
            <td>
              <kbd>{k}</kbd>
            </td>
            <td>{ru ? ruLabel : enLabel}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ConfigModal() {
  const open = useUiStore((s) => s.configOpen);
  const closeConfig = useUiStore((s) => s.closeConfig);
  const lang = useUiStore((s) => s.lang);
  const [section, setSection] = useState('canvas');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeConfig();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeConfig]);

  if (!open) return null;
  const ru = lang !== 'en';

  return (
    <div className="cfg-backdrop" onClick={closeConfig} role="presentation">
      <div
        className="cfg-modal"
        role="dialog"
        aria-modal="true"
        aria-label={ru ? 'Конфигурация' : 'Configuration'}
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('ConfigModal')}
      >
        <div className="cfg-head">
          <span className="cfg-title">
            <span className="cfg-title-gear" aria-hidden="true">
              ⚙
            </span>
            {ru ? 'Конфигурация' : 'Configuration'}
          </span>
          <button type="button" className="cfg-x" onClick={closeConfig} aria-label={ru ? 'Закрыть' : 'Close'}>
            ✕
          </button>
        </div>
        <div className="cfg-body">
          <nav className="cfg-nav" aria-label={ru ? 'Разделы' : 'Sections'}>
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                className={`cfg-nav-btn${section === sec.id ? ' is-active' : ''}`}
                onClick={() => setSection(sec.id)}
              >
                <NavIcon id={sec.id} />
                <span>{ru ? sec.ru : sec.en}</span>
              </button>
            ))}
          </nav>
          <div className="cfg-content">
            {section === 'canvas' ? <SectionCanvas ru={ru} /> : null}
            {section === 'anim' ? <SectionAnim ru={ru} /> : null}
            {section === 'persist' ? <SectionPersist ru={ru} /> : null}
            {section === 'pagenum' ? <SectionPageNum ru={ru} /> : null}
            {section === 'ui' ? <SectionUi ru={ru} /> : null}
            {section === 'translate' ? <SectionTranslate ru={ru} /> : null}
            {section === 'export' ? <SectionExport ru={ru} /> : null}
            {section === 'keys' ? <SectionKeys ru={ru} /> : null}
          </div>
        </div>
        <div className="cfg-foot">
          <span />
          <button type="button" className="cfg-done" onClick={closeConfig}>
            {ru ? 'Готово' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
