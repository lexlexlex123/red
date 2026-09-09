/**
 * Re-export helper for editor code that prepares slides for HTML export.
 */
import { shapeSvgForExport } from '../shared/shapes.js';
import { usePresentationStore } from '../stores/presentationStore';
import { prepareDeckForHtmlExport } from './prepareExportAssets.js';

export const PLAYBACK_KEY = 'sf_playback_v1';

export async function prepareSlidesForExport(slides) {
  const prepared = await prepareDeckForHtmlExport({ slides: slides || [] });
  return prepared.slides || slides;
}

/**
 * Open playback window with the current React deck.
 * Opens a blank window synchronously (user gesture), embeds media, then navigates.
 */
export function openPlaybackWindow() {
  const base = import.meta.env.BASE_URL || '/';
  const url = `${base}src/export/playback.html`;
  // Keep WindowProxy (no noopener) so we can write the prepared deck into the child.
  const win = window.open('about:blank', '_blank');
  const deck = usePresentationStore.getState().exportDeck();

  const navigate = (payload) => {
    try {
      localStorage.setItem(PLAYBACK_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[openPlaybackWindow] storage', e);
    }
    try {
      if (win && !win.closed) {
        try {
          win.sessionStorage.setItem(PLAYBACK_KEY, JSON.stringify(payload));
        } catch (e) {}
        win.location.href = url;
        return;
      }
    } catch (e) {
      console.warn('[openPlaybackWindow] navigate', e);
    }
    window.open(url, '_blank');
  };

  prepareDeckForHtmlExport(deck)
    .then((prepared) => navigate(prepared))
    .catch((e) => {
      console.warn('[openPlaybackWindow]', e);
      navigate(deck);
    });
}

export { shapeSvgForExport };

export default { prepareSlidesForExport, openPlaybackWindow, shapeSvgForExport };
