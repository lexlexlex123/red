import React, { useMemo, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';
import { buildImageCats, imagesForCategory } from '../../editor/image-index.js';
import { versionAttr } from '../../editor/versions.js';
import PickerPager from './PickerPager.jsx';

const PAGE = 48;

export default function ImagePicker() {
  const panel = useUiStore((s) => s.panel);
  const setPanel = useUiStore((s) => s.setPanel);
  const imagePickMode = useUiStore((s) => s.imagePickMode);
  const lang = useUiStore((s) => s.lang);
  const cats = useMemo(() => buildImageCats(), []);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    let list = imagesForCategory(cat === 'all' ? 'all' : cat);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (img) =>
          String(img.name || '').toLowerCase().includes(needle) ||
          String(img.file || '').toLowerCase().includes(needle)
      );
    }
    return list;
  }, [cat, q]);

  if (panel !== 'images') return null;
  const ru = lang !== 'en';
  const mode = imagePickMode || { kind: 'insert' };
  const isBg = mode.kind === 'slideBg';
  const isFlip = mode.kind === 'flip';
  const confirmLab = isBg
    ? ru
      ? 'Поставить фон'
      : 'Set background'
    : isFlip
      ? ru
        ? 'Выбрать'
        : 'Choose'
      : ru
        ? 'Вставить'
        : 'Insert';
  const title = isBg
    ? ru
      ? 'Фон слайда'
      : 'Slide background'
    : isFlip
      ? ru
        ? 'Картинка перевёртыша'
        : 'Flip card image'
      : ru
        ? 'Галерея изображений'
        : 'Image gallery';

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const curPage = Math.min(page, totalPages - 1);
  const pageImgs = filtered.slice(curPage * PAGE, (curPage + 1) * PAGE);
  const showPager = totalPages > 1;
  const from = filtered.length ? curPage * PAGE + 1 : 0;
  const to = Math.min(filtered.length, (curPage + 1) * PAGE);
  const countLab = showPager ? `${from}–${to} / ${filtered.length}` : `${filtered.length}`;

  function applySelected(path) {
    const p = path || selected;
    if (!p) return;
    editorApi.addImageFromPath(p);
  }

  return (
    <div className="settings-backdrop" onClick={() => setPanel(null)} role="presentation">
      <div
        className="settings-modal image-picker-modal picker-modal-v71"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('ImagePicker')}
      >
        <h2>{title}</h2>
        <div className="icon-picker-toolbar">
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder={ru ? 'Поиск изображений…' : 'Search images…'}
          />
        </div>
        <div className="img-cat-tabs">
          <button
            type="button"
            className={`tbtn2${cat === 'all' ? ' active' : ''}`}
            onClick={() => {
              setCat('all');
              setPage(0);
              setQ('');
            }}
          >
            {ru ? 'Все' : 'All'}
          </button>
          {cats.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`tbtn2${cat === c.id ? ' active' : ''}`}
              onClick={() => {
                setCat(c.id);
                setPage(0);
                setQ('');
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="image-picker-grid">
          {pageImgs.map((img) => {
            const src = '/' + String(img.path || '').replace(/^\//, '');
            const active = selected === img.path;
            const isSvg = !!(img.isSvg || String(img.path || '').toLowerCase().endsWith('.svg'));
            return (
              <button
                key={img.id || img.path}
                type="button"
                className={`image-picker-cell${active ? ' is-active' : ''}`}
                title={img.name || img.file}
                onClick={() => setSelected(img.path)}
                onDoubleClick={() => applySelected(img.path)}
              >
                <span className="image-picker-preview" style={{ backgroundImage: `url("${src}")` }} />
                {isSvg ? <span className="image-picker-badge">SVG</span> : null}
                <span className="image-picker-caption">{img.name || img.file}</span>
              </button>
            );
          })}
          {!pageImgs.length ? (
            <div className="picker-empty">
              {ru ? 'Нет изображений в этой категории' : 'No images in this category'}
            </div>
          ) : null}
        </div>
        <div className="picker-mfooter picker-mfooter-split">
          <button
            type="button"
            className="react-props-btn picker-upload-btn"
            onClick={() => editorApi.openImageFilePicker()}
          >
            {ru ? 'Загрузить с компьютера' : 'Upload from computer'}
          </button>
          <span className="picker-count">{countLab}</span>
          <PickerPager
            page={curPage}
            totalPages={totalPages}
            hidden={!showPager}
            onPrev={() => setPage(curPage - 1)}
            onNext={() => setPage(curPage + 1)}
          />
          <div className="picker-mfooter-actions">
            <button type="button" className="react-props-btn" onClick={() => setPanel(null)}>
              {ru ? 'Отмена' : 'Cancel'}
            </button>
            <button type="button" className="primary" disabled={!selected} onClick={() => applySelected()}>
              {confirmLab}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
