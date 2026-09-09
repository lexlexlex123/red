import React from 'react';
import { editorApi } from '../../editor/editorApi';
import { useUiStore } from '../../stores/uiStore';
import { getQuoteCat, quoteCategories, setQuoteCat } from '../../editor/quotes.js';

export default function InsertPanel() {
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const cat = getQuoteCat();
  const cats = quoteCategories(ru);

  const core = [
    [ru ? 'Текст' : 'Text', () => editorApi.addText()],
    [ru ? 'Изображение' : 'Image', () => editorApi.openImagePicker()],
    [ru ? 'Фигура' : 'Shape', () => editorApi.openShapePicker()],
    [ru ? 'Значки' : 'Icons', () => editorApi.openIconPicker()],
    ['SVG', () => editorApi.addSvg()],
    [ru ? 'Код' : 'Code', () => editorApi.addCode()],
    ['<html>', () => editorApi.addHtmlFrame()],
    ['Markdown', () => editorApi.addMarkdown()],
    [ru ? 'Формула' : 'Formula', () => editorApi.addFormula()],
    [ru ? 'Аплет…' : 'Applet…', () => editorApi.openAppletModal()],
    [ru ? 'Таблица' : 'Table', () => editorApi.openTablePicker()],
    [ru ? 'Ссылка' : 'Link', () => editorApi.openLinkModal()],
    [ru ? 'Связи' : 'Connect', () => editorApi.startConnectorMode('line')],
    [ru ? 'Видео' : 'Video', () => editorApi.addVideo()],
    [ru ? 'Аудио' : 'Audio', () => editorApi.addAudio()],
    ['OBJ', () => editorApi.addModel3dFromFile()],
  ];

  const more = [
    [ru ? 'Цитата → текст' : 'Quote → text', () => editorApi.fillSelectedWithQuote()],
    [ru ? 'График' : 'Graph', () => void editorApi.addGraph('sin(x)')],
    [ru ? 'Химия' : 'Chem', () => void editorApi.addChemGraph('H2O')],
    [ru ? 'Логика' : 'Logic', () => void editorApi.addLogicGraph('A \\land B')],
    [ru ? 'QR-код' : 'QR code', () => void editorApi.addQrCode()],
    [ru ? 'LEGO' : 'LEGO', () => void editorApi.addLego()],
    [ru ? 'Оглавление' : 'TOC', () => editorApi.fillToc()],
  ];

  return (
    <section className="react-props-section react-insert-panel">
      <div className="react-props-hdr">{ru ? 'Вставка' : 'Insert'}</div>
      <div className="react-insert-grid">
        {core.map(([label, fn]) => (
          <button key={label} type="button" className="react-props-btn react-insert-btn" onClick={fn}>
            {label}
          </button>
        ))}
      </div>
      <div className="react-props-hdr" style={{ marginTop: 10 }}>
        {ru ? 'Ещё' : 'More'}
      </div>
      <div className="react-insert-grid">
        {more.map(([label, fn]) => (
          <button key={label} type="button" className="react-props-btn react-insert-btn" onClick={fn}>
            {label}
          </button>
        ))}
      </div>
      <label className="react-props-field" style={{ marginTop: 10 }}>
        <span>{ru ? 'Категория цитат' : 'Quote category'}</span>
        <select
          defaultValue={cat}
          onChange={(e) => {
            setQuoteCat(e.target.value);
            useUiStore.getState().showToast(
              ru
                ? `Категория: ${cats.find((c) => c.id === e.target.value)?.label || e.target.value}`
                : `Category: ${e.target.value}`,
              'ok'
            );
          }}
        >
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
