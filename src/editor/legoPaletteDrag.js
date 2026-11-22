import { editorApi } from './editorApi.js';
import { useUiStore } from '../stores/uiStore.js';
import { legoPreviewSvg } from './lego.js';

/**
 * Drag a catalog brick onto the slide. Click either inserts (picker) or
 * morphs the selected brick (props panel).
 */
export function beginLegoPaletteDrag(e, piece, opts = {}) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const { color, schemeRef, insertOnClick = false, closeOnDrag = false } = opts;
  const startX = e.clientX;
  const startY = e.clientY;
  let started = false;
  let ghost = null;

  function moveGhost(ev) {
    if (!ghost) return;
    ghost.style.left = `${ev.clientX}px`;
    ghost.style.top = `${ev.clientY}px`;
  }

  function onMove(ev) {
    const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
    if (!started && dist < 8) return;
    if (!started) {
      started = true;
      if (closeOnDrag) {
        useUiStore.getState().setPanel(null);
        useUiStore.getState().closeAppletModal();
      }
      ghost = document.createElement('div');
      ghost.className = 'lego-drag-ghost';
      ghost.innerHTML = legoPreviewSvg(piece, color);
      document.body.appendChild(ghost);
    }
    moveGhost(ev);
  }

  function onUp(ev) {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (ghost?.parentNode) ghost.parentNode.removeChild(ghost);
    if (started) {
      void editorApi.addLego(piece.id, {
        clientX: ev.clientX,
        clientY: ev.clientY,
        color,
        schemeRef,
      });
      return;
    }
    if (insertOnClick) {
      void editorApi.addLego(piece.id, { color, schemeRef });
      useUiStore.getState().setPanel(null);
      return;
    }
    editorApi.applyLegoPiece(piece.id);
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}
