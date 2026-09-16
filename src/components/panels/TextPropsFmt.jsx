import React, { useState } from 'react';
import { editorApi } from '../../editor/editorApi';
import { FONT_FAMILIES, parseFontFamily } from '../../editor/fonts.js';
import { htmlHasList, htmlNumListStyle } from '../../editor/textLists.js';
import { htmlHasStress } from '../../editor/textStress.js';
import { htmlHasScript } from '../../editor/textScript.js';
import { underlineActive, underlineTitle, parseUnderlineFromCs, hasStrikeInCs, hasStrikeInHtml } from '../../editor/textUnderline.js';
import { getQuoteCat, quoteCategories } from '../../editor/quotes.js';
import { selectionTranslateLabel } from '../../editor/translateActions.js';
import { useUiStore } from '../../stores/uiStore';
import GSlider from '../ui/GSlider.jsx';
import ColorField from '../ui/ColorField.jsx';

function parseFontSize(cs) {
  if (!cs) return '';
  const m = String(cs).match(/font-size\s*:\s*([\d.]+)px/i);
  return m ? m[1] : '';
}

function parseAlign(cs) {
  if (!cs) return '';
  const m = String(cs).match(/text-align\s*:\s*([^;]+)/i);
  return m ? m[1].trim().toLowerCase() : '';
}

function hasWeightBold(cs) {
  const m = String(cs || '').match(/font-weight\s*:\s*([^;]+)/i);
  if (!m) return false;
  const v = m[1].trim().toLowerCase();
  return v === 'bold' || Number(v) >= 600;
}

function hasItalic(cs) {
  return /font-style\s*:\s*italic/i.test(cs || '');
}

function FtBtn({ id, title, on, onClick, children, style }) {
  return (
    <button
      type="button"
      id={id}
      className={`react-ftbtn${on ? ' on' : ''}`}
      title={title}
      style={style}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** v7.1 #tprops format toolbar: actions, role, B/I/U, font, pt, align/valign/lists. */
export default function TextPropsFmt({ el, ru, applyTextStyle }) {
  const [quoteCat, setQuoteCatLocal] = useState(getQuoteCat);
  const dictationOn = useUiStore((s) => s.dictationOn);
  const dictationMode = useUiStore((s) => s.dictationMode);
  const cats = quoteCategories(ru);
  const catLabel = (cats.find((c) => c.id === quoteCat) || cats[0] || {}).label || (ru ? 'Все' : 'All');
  const trLabel = selectionTranslateLabel();
  const align = parseAlign(el.cs) || 'left';
  const valign = el.valign || 'top';
  const role = el.textRole === 'heading' || el.textRole === 'title' ? 'heading' : 'body';

  return (
    <>
      <div className="react-tprops-actions">
        <div className="react-tprops-actions-row">
          <button
            type="button"
            className="react-tbtn2"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorApi.fillSelectedWithQuote()}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
            </svg>
            <span>{ru ? 'Цитата' : 'Quote'}</span>
          </button>
          <label className="react-tbtn2 react-tbtn2-cat" title={ru ? 'Категория цитат' : 'Quote category'}>
            <span className="react-tbtn2-cat-label">{catLabel}</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
            <select
              value={quoteCat}
              onChange={(e) => {
                const next = editorApi.setQuoteCategory(e.target.value);
                setQuoteCatLocal(next);
              }}
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="react-tbtn2"
          style={{ width: '100%' }}
          title={ru ? 'Заполнить список глав из помеченных пунктов' : 'Fill from marked chapters'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editorApi.fillToc(el.id)}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>{ru ? 'Оглавление' : 'Contents'}</span>
        </button>
        <div className="react-tprops-actions-row">
          <button
            type="button"
            className="react-tbtn2"
            title={ru ? 'Перевести: Google, иначе локально' : 'Translate'}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void editorApi.translateSelection()}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 8l6 6" />
              <path d="M4 14l6-6 2-3" />
              <path d="M2 5h12" />
              <path d="M7 2v3" />
              <path d="M14 13l6 8" />
              <path d="M14 21l6-8" />
              <path d="M12 22h10" />
            </svg>
            <span className="react-tbtn2-ellipsis">{trLabel}</span>
          </button>
          <button
            type="button"
            className="react-tbtn2"
            title={ru ? 'Транскрипция: Google, для русского — и локально' : 'Transcription'}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void editorApi.transcribeSelection()}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 5H5v14h2" />
              <path d="M17 5h2v14h-2" />
              <path d="M10 14c0 1.15.9 2 2 2s2-.85 2-2-.9-3-2-3" />
            </svg>
            <span className="react-tbtn2-ellipsis">{ru ? 'транскрипция' : 'transcribe'}</span>
          </button>
        </div>
        <button
          type="button"
          className={`react-tbtn2${dictationOn && dictationMode === 'text' ? ' dictation-on' : ''}`}
          style={{ width: '100%' }}
          title={ru ? 'Диктовка текста в этот блок' : 'Dictate into this text box'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void editorApi.toggleDictation()}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <span>
            {dictationOn && dictationMode === 'text' ? (ru ? 'Остановить' : 'Stop') : ru ? 'Диктовка' : 'Dictation'}
          </span>
        </button>
      </div>

      <div className="react-props-field" style={{ marginBottom: 6 }}>
        <span>{ru ? 'Роль' : 'Role'}</span>
        <div className="react-tprops-actions-row">
          <button
            type="button"
            className={`react-tbtn2${role === 'body' ? ' is-active' : ''}`}
            onClick={() => editorApi.setTextRole('body')}
          >
            {ru ? 'Основной текст' : 'Body'}
          </button>
          <button
            type="button"
            className={`react-tbtn2${role === 'heading' ? ' is-active' : ''}`}
            onClick={() => editorApi.setTextRole('heading')}
          >
            {ru ? 'ЗАГОЛОВОК' : 'HEADING'}
          </button>
        </div>
      </div>

      <div className="react-fmt-block">
        <div className="react-fmt-row react-fmt-row-spread">
          <div className="react-fmt-group">
            <FtBtn
              id="ft-b"
              title="Bold (Ctrl+B)"
              on={hasWeightBold(el.cs)}
              onClick={() => {
                if (document.activeElement?.isContentEditable) editorApi.formatText('bold');
                else editorApi.setTextBold(!hasWeightBold(el.cs));
              }}
            >
              <b>B</b>
            </FtBtn>
            <FtBtn
              id="ft-i"
              title="Italic (Ctrl+I)"
              on={hasItalic(el.cs)}
              onClick={() => {
                if (document.activeElement?.isContentEditable) editorApi.formatText('italic');
                else editorApi.setTextItalic(!hasItalic(el.cs));
              }}
            >
              <i>I</i>
            </FtBtn>
            <FtBtn
              id="ft-u"
              title={
                ru
                  ? `Подчёркивание: ${underlineTitle(parseUnderlineFromCs(el.cs), true)} → следующее (Ctrl+U)`
                  : `Underline: ${underlineTitle(parseUnderlineFromCs(el.cs), false)} → next (Ctrl+U)`
              }
              on={underlineActive(el.cs) || /text-decoration|data-ul|--rt-ul/i.test(el.html || '')}
              onClick={() => editorApi.cycleTextUnderline()}
            >
              <u>U</u>
            </FtBtn>
            <FtBtn
              id="ft-strike"
              title={ru ? 'Зачёркнутый' : 'Strikethrough'}
              on={hasStrikeInCs(el.cs) || hasStrikeInHtml(el.html)}
              onClick={() => editorApi.toggleTextStrike()}
            >
              <s>S</s>
            </FtBtn>
            <FtBtn id="ft-stress" title={ru ? 'Ударение (а́)' : 'Stress mark'} on={htmlHasStress(el.html)} onClick={() => editorApi.toggleTextStress()} style={{ fontSize: 12, fontWeight: 600, minWidth: 22 }}>
              а́
            </FtBtn>
            <FtBtn id="ft-sup" title={ru ? 'Надстрочный' : 'Superscript'} on={htmlHasScript(el.html, 'super')} onClick={() => editorApi.toggleTextScript('super')} style={{ fontSize: 9, letterSpacing: '-0.5px' }}>
              X<sup style={{ fontSize: 7, lineHeight: 1 }}>²</sup>
            </FtBtn>
            <FtBtn id="ft-sub" title={ru ? 'Подстрочный' : 'Subscript'} on={htmlHasScript(el.html, 'sub')} onClick={() => editorApi.toggleTextScript('sub')} style={{ fontSize: 9, letterSpacing: '-0.5px' }}>
              X<sub style={{ fontSize: 7, lineHeight: 1 }}>₂</sub>
            </FtBtn>
          </div>
          <FtBtn
            title={ru ? 'Сбросить форматирование' : 'Reset formatting'}
            onClick={() => editorApi.resetTextFormatting()}
            style={{ color: 'var(--text3)', flexShrink: 0 }}
          >
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
              <text x="1" y="12" fontFamily="serif" fontSize="12" fontWeight="700" fill="currentColor">
                A
              </text>
              <line x1="10" y1="4" x2="15" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="15" y1="4" x2="10" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </FtBtn>
        </div>

        <div className="react-fmt-inline">
          <span>{ru ? 'Шрифт' : 'Font'}</span>
          <select
            value={parseFontFamily(el.cs) || ''}
            onChange={(e) => editorApi.setTextFont(e.target.value)}
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.id || '__default'} value={f.id} style={f.id ? { fontFamily: f.id } : undefined}>
                {ru ? f.label : f.labelEn || f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="react-fmt-inline">
          <span>пт</span>
          <GSlider
            min={8}
            max={200}
            step={1}
            value={Number(parseFontSize(el.cs) || 36)}
            onChange={(v) => applyTextStyle({ fontSize: Math.round(v) })}
          />
        </div>

        <div className="react-fmt-row">
          <div className="react-fmt-group">
            <FtBtn title="Align Left" on={align === 'left'} onClick={() => editorApi.setTextAlign('left')}>
              <svg width="14" height="12" viewBox="0 0 14 12">
                <line x1="0" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="1.5" />
                <line x1="0" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.5" />
                <line x1="0" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </FtBtn>
            <FtBtn title="Center" on={align === 'center'} onClick={() => editorApi.setTextAlign('center')}>
              <svg width="14" height="12" viewBox="0 0 14 12">
                <line x1="0" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="1.5" />
                <line x1="2.5" y1="5" x2="11.5" y2="5" stroke="currentColor" strokeWidth="1.5" />
                <line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </FtBtn>
            <FtBtn title="Align Right" on={align === 'right'} onClick={() => editorApi.setTextAlign('right')}>
              <svg width="14" height="12" viewBox="0 0 14 12">
                <line x1="0" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="1.5" />
                <line x1="5" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.5" />
                <line x1="2" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </FtBtn>
            <FtBtn title="Justify" on={align === 'justify'} onClick={() => editorApi.setTextAlign('justify')}>
              <svg width="14" height="12" viewBox="0 0 14 12">
                <line x1="0" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="1.5" />
                <line x1="0" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.5" />
                <line x1="0" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </FtBtn>
          </div>
          <span className="react-fmt-sep" />
          <div className="react-fmt-group">
            <FtBtn title="Top" on={valign === 'top'} onClick={() => editorApi.setTextVAlign('top')}>
              <svg width="12" height="14" viewBox="0 0 12 14">
                <line x1="0" y1="0" x2="12" y2="0" stroke="currentColor" strokeWidth="1.5" />
                <rect x="3" y="2" width="6" height="9" rx="1" fill="currentColor" opacity=".4" />
                <path d="M6 2 L6 11" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </FtBtn>
            <FtBtn title="Middle" on={valign === 'middle'} onClick={() => editorApi.setTextVAlign('middle')}>
              <svg width="12" height="14" viewBox="0 0 12 14">
                <line x1="0" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" />
                <rect x="3" y="1" width="6" height="5" rx="1" fill="currentColor" opacity=".4" />
                <rect x="3" y="8" width="6" height="5" rx="1" fill="currentColor" opacity=".4" />
              </svg>
            </FtBtn>
            <FtBtn title="Bottom" on={valign === 'bottom'} onClick={() => editorApi.setTextVAlign('bottom')}>
              <svg width="12" height="14" viewBox="0 0 12 14">
                <line x1="0" y1="14" x2="12" y2="14" stroke="currentColor" strokeWidth="1.5" />
                <rect x="3" y="3" width="6" height="9" rx="1" fill="currentColor" opacity=".4" />
                <path d="M6 3 L6 12" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </FtBtn>
          </div>
          <span className="react-fmt-sep" />
          <div className="react-fmt-group">
            <FtBtn title={ru ? 'Маркированный список' : 'Bulleted list'} on={htmlHasList(el.html, 'bullet')} onClick={() => editorApi.toggleBulletList()}>
              <svg width="15" height="13" viewBox="0 0 15 13" fill="none">
                <circle cx="1.5" cy="2" r="1.5" fill="currentColor" />
                <line x1="5" y1="2" x2="15" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="1.5" cy="6.5" r="1.5" fill="currentColor" />
                <line x1="5" y1="6.5" x2="15" y2="6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="1.5" cy="11" r="1.5" fill="currentColor" />
                <line x1="5" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </FtBtn>
            <FtBtn
              title={
                ru
                  ? `Нумерованный список: ${({ decimal: '1', roman: 'I', alpha: 'A' }[htmlNumListStyle(el.html)] || '1')} → следующее`
                  : `Numbered list: ${htmlNumListStyle(el.html) || '1'} → next`
              }
              on={htmlHasList(el.html, 'num')}
              onClick={() => editorApi.toggleNumberedList()}
            >
              <svg width="15" height="13" viewBox="0 0 15 13" fill="none">
                <text x="0" y="3.5" fontSize="4" fill="currentColor" fontFamily="monospace">
                  1.
                </text>
                <line x1="5" y1="2" x2="15" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <text x="0" y="8" fontSize="4" fill="currentColor" fontFamily="monospace">
                  2.
                </text>
                <line x1="5" y1="6.5" x2="15" y2="6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <text x="0" y="12.5" fontSize="4" fill="currentColor" fontFamily="monospace">
                  3.
                </text>
                <line x1="5" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </FtBtn>
            <FtBtn
              title={ru ? 'Пункт оглавления' : 'TOC entry'}
              on={el.textRole === 'tocEntry'}
              onClick={() => editorApi.toggleTocEntry(el.id)}
            >
              <svg width="15" height="13" viewBox="0 0 15 13" fill="none">
                <path d="M12 2.5v3M10.5 4h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M1 8.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M1 11h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </FtBtn>
          </div>
        </div>
        {htmlHasList(el.html, 'bullet') ? (
          <div
            className="react-fmt-list-tools"
            onMouseDown={(e) => {
              if (!e.target.closest?.('input, textarea, [contenteditable]')) e.preventDefault();
            }}
          >
            <ColorField
              label={ru ? 'Цвет маркеров' : 'Marker color'}
              value={el.bulletIconColor || el.textColor || ''}
              schemeRef={el.bulletIconColor ? el.bulletIconScheme : el.textColorScheme}
              allowClear={false}
              onChange={(c, sr) => editorApi.setBulletColor(c, sr)}
            />
            <GSlider
              label={ru ? 'Отступ, px' : 'Indent, px'}
              min={0}
              max={80}
              step={1}
              value={el.bulletGap != null ? +el.bulletGap : 10}
              onChange={(v) => editorApi.setBulletGap(v)}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
