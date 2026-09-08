import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';
import { APPLET_GALLERY_EXTRAS, APPLET_INSERTS } from '../../editor/applets.js';
import { versionAttr } from '../../editor/versions.js';

const APPLET_EMOJI = {
  quote: '❝',
  qr: '▦',
  lego: '🧱',
  clock: '🕐',
  timer: '⏱',
  generator: '🎲',
  counter: '🔢',
  calculator: '🧮',
  flip: '🃏',
  periodic: '🧪',
  notes: '📝',
};

function insertGalleryItem(id) {
  if (id === 'quote') return editorApi.insertQuote();
  if (id === 'qr') return editorApi.addQrCode();
  if (id === 'lego') return editorApi.addLego('2f');
  return editorApi.addApplet(id);
}

export default function AppletModal() {
  const open = useUiStore((s) => s.appletModalOpen);
  const close = useUiStore((s) => s.closeAppletModal);
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';

  if (!open) return null;

  const tiles = [...APPLET_GALLERY_EXTRAS, ...APPLET_INSERTS];

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal react-applet-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('AppletModal')}
      >
        <h2>{ru ? 'Вставить аплет' : 'Insert applet'}</h2>
        <div className="react-applet-gallery">
          {tiles.map((a) => (
            <button
              key={a.id}
              type="button"
              className="react-applet-card"
              onClick={() => {
                insertGalleryItem(a.id);
                close();
              }}
            >
              <span className="react-applet-card-ico" aria-hidden="true">
                {APPLET_EMOJI[a.id] || '📦'}
              </span>
              <span className="react-applet-card-name">{ru ? a.labelRu : a.labelEn}</span>
            </button>
          ))}
        </div>
        <div className="theme-modal-footer">
          <button type="button" className="react-props-btn" onClick={close}>
            {ru ? 'Отмена' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
