import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';
import { appletGalleryTiles } from '../../editor/applets.js';
import { versionAttr } from '../../editor/versions.js';

/** Cohesive outline icons for the gallery (currentColor). */
const APPLET_ICONS = {
  quote: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
      <path d="M7.2 18c-2.4 0-4.2-1.9-4.2-4.3 0-2.6 1.8-5.3 5.4-8.1l1.1 1.5C7.2 9.2 5.8 11 5.8 12.8c.5-.3 1.1-.4 1.7-.4 1.7 0 3 1.2 3 2.9S9 18 7.2 18zm9.6 0c-2.4 0-4.2-1.9-4.2-4.3 0-2.6 1.8-5.3 5.4-8.1l1.1 1.5c-2.3 2.1-3.7 3.9-3.7 5.7.5-.3 1.1-.4 1.7-.4 1.7 0 3 1.2 3 2.9s-1.4 2.7-3.3 2.7z" />
    </svg>
  ),
  qr: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="6.2" y="6.2" width="2.6" height="2.6" rx="0.4" fill="currentColor" stroke="none" />
      <rect x="15.2" y="6.2" width="2.6" height="2.6" rx="0.4" fill="currentColor" stroke="none" />
      <rect x="6.2" y="15.2" width="2.6" height="2.6" rx="0.4" fill="currentColor" stroke="none" />
      <path d="M13.5 13.5h3v3h-3zM17.5 13.5h3M13.5 17.5v3M17.5 17.5h3v3" strokeLinecap="round" />
    </svg>
  ),
  lego: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="5" y="10" width="14" height="9" rx="1.5" />
      <rect x="7.2" y="6.5" width="3.2" height="3.5" rx="0.8" />
      <rect x="13.6" y="6.5" width="3.2" height="3.5" rx="0.8" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.5V12l3.2 2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  timer: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M9.5 4.5h5" strokeLinecap="round" />
      <circle cx="12" cy="13" r="7" />
      <path d="M12 13V9.5" strokeLinecap="round" />
    </svg>
  ),
  generator: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
      <circle cx="9" cy="9" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="9" cy="15" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  ),
  counter: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="4.5" y="5.5" width="15" height="13" rx="2.5" />
      <path d="M8 12h8M12 8v8" strokeLinecap="round" />
    </svg>
  ),
  calculator: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
      <rect x="7.5" y="6" width="9" height="3.2" rx="1" />
      <path d="M8.2 12.2h2.2M13.6 12.2h2.2M8.2 15.2h2.2M13.6 15.2h2.2M8.2 18h2.2M13.6 18h2.2" strokeLinecap="round" />
    </svg>
  ),
  flip: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="4.5" y="5" width="10" height="14" rx="1.5" />
      <path d="M14.5 7.5h3a2 2 0 012 2v9a2 2 0 01-2 2h-7" strokeLinecap="round" />
      <path d="M16.2 5.8 18.5 7.5 16.2 9.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  periodic: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="4.5" y="4.5" width="6.2" height="6.2" rx="1" />
      <rect x="13.3" y="4.5" width="6.2" height="6.2" rx="1" />
      <rect x="4.5" y="13.3" width="6.2" height="6.2" rx="1" />
      <rect x="13.3" y="13.3" width="6.2" height="6.2" rx="1" />
      <circle cx="7.6" cy="7.6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16.4" cy="16.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  notes: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M7 4.5h7.2L19 9.2V19a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 016 19V6A1.5 1.5 0 017.5 4.5" strokeLinejoin="round" />
      <path d="M14 4.5V9h4.5M9 12.5h6M9 15.5h6" strokeLinecap="round" />
    </svg>
  ),
  classification: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M4.5 7h6.5v10H4.5zM13 7h6.5v10H13z" strokeLinejoin="round" />
      <path d="M7 10.5h2M7 13.5h2M15.5 10.5h2M15.5 13.5h2" strokeLinecap="round" />
    </svg>
  ),
  imagesort: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M12 20s-6-4.6-6-9.2a6 6 0 1112 0C18 15.4 12 20 12 20z" strokeLinejoin="round" />
      <circle cx="12" cy="10.8" r="2.1" />
    </svg>
  ),
};

function insertGalleryItem(id) {
  if (id === 'quote') return editorApi.insertQuote();
  if (id === 'qr') return editorApi.addQrCode();
  if (id === 'lego') return editorApi.openLegoPicker();
  return editorApi.addApplet(id);
}

export default function AppletModal() {
  const open = useUiStore((s) => s.appletModalOpen);
  const close = useUiStore((s) => s.closeAppletModal);
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';

  if (!open) return null;

  const tiles = appletGalleryTiles();

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
                if (a.id !== 'lego') close();
              }}
            >
              <span className="react-applet-card-ico" aria-hidden="true">
                {APPLET_ICONS[a.id] || '📦'}
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
