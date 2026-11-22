import React from 'react';
import { editorApi } from '../../editor/editorApi';
import { parseUnderlineFromCs } from '../../editor/textUnderline.js';
import { DEFAULT_TEXT_QUICK_SIZES, useUiStore } from '../../stores/uiStore';

const SIZE_IDS = ['h1', 'h2', 'h3', 'h4', 'p'];

function holdSelection(e) {
  // Keep contentEditable focus + selection when using the floating toolbar.
  e.preventDefault();
  e.stopPropagation();
}

function keepBar(e) {
  e.stopPropagation();
}

function AlignIcon({ kind }) {
  const lines = {
    left: [
      [0, 14],
      [0, 9],
      [0, 12],
    ],
    center: [
      [0, 14],
      [2.5, 11.5],
      [1, 13],
    ],
    right: [
      [0, 14],
      [5, 14],
      [2, 14],
    ],
    justify: [
      [0, 14],
      [0, 14],
      [0, 14],
    ],
  }[kind];
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">
      {lines.map(([x1, x2], i) => (
        <line
          key={i}
          x1={x1}
          y1={1 + i * 4}
          x2={x2}
          y2={1 + i * 4}
          stroke="currentColor"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

export default function TextQuickBar({ el }) {
  const cs = el?.cs || '';
  const align = ((cs.match(/text-align\s*:\s*([^;]+)/i) || [])[1] || 'left').trim();
  const bold = /font-weight\s*:\s*(bold|[6-9]00)/i.test(cs);
  const italic = /font-style\s*:\s*italic/i.test(cs);
  const underlined =
    parseUnderlineFromCs(cs) !== 'none' || /data-ul\s*=/i.test(String(el?.html || ''));
  const fs = Math.round(parseFloat((cs.match(/font-size\s*:\s*([\d.]+)/i) || [])[1]) || 0);
  const sizes = useUiStore((s) => s.textQuickSizes) || DEFAULT_TEXT_QUICK_SIZES;
  const editing = () => document.activeElement?.isContentEditable;

  return (
    <div
      className="react-text-quickbar"
      data-keep-text-edit="1"
      onPointerDown={keepBar}
      onMouseDown={keepBar}
    >
      {[
        ['left', 'По левому краю'],
        ['center', 'По центру'],
        ['right', 'По правому краю'],
        ['justify', 'По ширине'],
      ].map(([id, title]) => (
        <button
          key={id}
          type="button"
          className={`react-text-quickbar-btn${align === id ? ' is-on' : ''}`}
          title={title}
          onPointerDown={holdSelection}
          onMouseDown={holdSelection}
          onClick={() => editorApi.setTextAlign(id)}
        >
          <AlignIcon kind={id} />
        </button>
      ))}
      <span className="react-text-quickbar-sep" />
      <button
        type="button"
        className={`react-text-quickbar-btn${bold ? ' is-on' : ''}`}
        title="Жирный"
        onPointerDown={holdSelection}
        onMouseDown={holdSelection}
        onClick={() => {
          if (editing()) editorApi.formatText('bold');
          else editorApi.setTextBold(!bold);
        }}
      >
        <b>B</b>
      </button>
      <button
        type="button"
        className={`react-text-quickbar-btn${italic ? ' is-on' : ''}`}
        title="Курсив"
        onPointerDown={holdSelection}
        onMouseDown={holdSelection}
        onClick={() => {
          if (editing()) editorApi.formatText('italic');
          else editorApi.setTextItalic(!italic);
        }}
      >
        <i>I</i>
      </button>
      <button
        type="button"
        className={`react-text-quickbar-btn${underlined ? ' is-on' : ''}`}
        title="Подчёркивание"
        onPointerDown={holdSelection}
        onMouseDown={holdSelection}
        onClick={() => editorApi.cycleTextUnderline()}
      >
        <u>U</u>
      </button>
      <span className="react-text-quickbar-sep" />
      <button
        type="button"
        className="react-text-quickbar-btn is-size-nudge"
        title="Увеличить размер"
        onPointerDown={holdSelection}
        onMouseDown={holdSelection}
        onClick={() => editorApi.nudgeTextFontSize(1)}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <text x="1" y="12" fontFamily="serif" fontSize="11" fontWeight="700" fill="currentColor">
            A
          </text>
          <path d="M9.2 9.2 L11.2 5.6 L13.2 9.2 Z" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        className="react-text-quickbar-btn is-size-nudge"
        title="Уменьшить размер"
        onPointerDown={holdSelection}
        onMouseDown={holdSelection}
        onClick={() => editorApi.nudgeTextFontSize(-1)}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <text x="1" y="12" fontFamily="serif" fontSize="11" fontWeight="700" fill="currentColor">
            A
          </text>
          <path d="M9.2 5.4 L11.2 9 L13.2 5.4 Z" fill="currentColor" />
        </svg>
      </button>
      {SIZE_IDS.map((id) => {
        const pt = sizes[id] || DEFAULT_TEXT_QUICK_SIZES[id];
        return (
          <button
            key={id}
            type="button"
            className={`react-text-quickbar-btn is-size${fs === pt ? ' is-on' : ''}`}
            title={`${pt} пт`}
            onPointerDown={holdSelection}
            onMouseDown={holdSelection}
            onClick={() => editorApi.applyTextInline({ fontSize: pt })}
          >
            {id}
          </button>
        );
      })}
      <span className="react-text-quickbar-sep" />
      <button
        type="button"
        className="react-text-quickbar-btn is-symbols"
        title="Спецсимволы"
        onPointerDown={holdSelection}
        onMouseDown={holdSelection}
        onClick={() => editorApi.openSymbolsModal()}
      >
        §
      </button>
      <button
        type="button"
        className="react-text-quickbar-btn is-clearfmt"
        title="Очистить форматирование"
        onPointerDown={holdSelection}
        onMouseDown={holdSelection}
        onClick={() => editorApi.resetTextFormatting()}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <text x="1" y="12" fontFamily="serif" fontSize="12" fontWeight="700" fill="currentColor">
            A
          </text>
          <line x1="10" y1="4" x2="15" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="15" y1="4" x2="10" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
