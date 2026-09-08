/* Мобильный холст: fit-to-view, pinch-zoom, однопальцевый pan по пустому месту. */
(function () {
  'use strict';

  function isMobileChrome() {
    return typeof isMobileLayout === 'function' && isMobileLayout();
  }

  function refreshFit() {
    if (!isMobileChrome() || typeof fitCanvasToView !== 'function') return;
    if (document.querySelector('.el[data-editing="true"]')) return;
    requestAnimationFrame(function () {
      fitCanvasToView();
      if (typeof drawGrid === 'function') drawGrid();
    });
  }

  function touchDist(t0, t1) {
    return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
  }

  function touchMid(t0, t1) {
    return { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
  }

  function hitDraggable(touch) {
    var el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return false;
    if (el.closest('.tel[contenteditable="true"]')) return true;
    if (el.closest('.el')) return true;
    if (el.closest('#handles-overlay') || el.closest('.handle') || el.closest('.hnd')) return true;
    if (el.closest('#props') || el.closest('input[type=number]')) return true;
    return false;
  }

  function canPan() {
    var fitZoom = window._mobileFitZoom || 1;
    var zoom = typeof getZoom === 'function' ? getZoom() : 1;
    return zoom > fitZoom * 1.02;
  }

  function wireGestures() {
    var cwrap = document.getElementById('cwrap');
    if (!cwrap || cwrap._mobileGesturesWired) return;
    cwrap._mobileGesturesWired = true;

    var state = null;

    function endGesture() {
      if (!state) return;
      state = null;
      window._mobilePinchActive = false;
    }

    cwrap.addEventListener('touchstart', function (e) {
      if (!isMobileChrome()) return;
      if (e.touches.length === 2) {
        var t0 = e.touches[0];
        var t1 = e.touches[1];
        state = {
          mode: 'pinch',
          lastDist: touchDist(t0, t1),
          startZoom: typeof getZoom === 'function' ? getZoom() : 1
        };
        window._mobilePinchActive = true;
        if (typeof window._clearTextTapState === 'function') window._clearTextTapState();
        document.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true, cancelable: true, button: 0, buttons: 0
        }));
        window._anyDragging = false;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        var t = e.touches[0];
        if (!hitDraggable(t) && canPan()) {
          state = {
            mode: 'pan',
            startX: t.clientX,
            startY: t.clientY,
            startScrollL: cwrap.scrollLeft,
            startScrollT: cwrap.scrollTop
          };
          e.preventDefault();
        } else if (state) {
          endGesture();
        }
      }
    }, { passive: false, capture: true });

    cwrap.addEventListener('touchmove', function (e) {
      if (!isMobileChrome() || !state) return;
      if (state.mode === 'pinch' && e.touches.length === 2) {
        var t0 = e.touches[0];
        var t1 = e.touches[1];
        var dist = touchDist(t0, t1);
        var mid = touchMid(t0, t1);
        var factor = dist / Math.max(1, state.lastDist);
        if (typeof zoomCanvas === 'function') zoomCanvas(factor, mid.x, mid.y, true);
        state.lastDist = dist;
        e.preventDefault();
      } else if (state.mode === 'pan' && e.touches.length === 1) {
        var t = e.touches[0];
        cwrap.scrollLeft = state.startScrollL - (t.clientX - state.startX);
        cwrap.scrollTop = state.startScrollT - (t.clientY - state.startY);
        e.preventDefault();
      }
    }, { passive: false, capture: true });

    cwrap.addEventListener('touchend', function (e) {
      if (!state) return;
      if (state.mode === 'pinch' && e.touches.length < 2) endGesture();
      else if (state.mode === 'pan' && e.touches.length < 1) endGesture();
    }, { passive: true, capture: true });

    cwrap.addEventListener('touchcancel', endGesture, { passive: true, capture: true });
  }

  function init() {
    if (!isMobileChrome()) return;
    wireGestures();
    refreshFit();
  }

  window.addEventListener('resize', function () {
    if (isMobileChrome()) refreshFit();
  });
  window.addEventListener('orientationchange', function () {
    if (typeof refreshLayoutUI === 'function') {
      setTimeout(function () { refreshLayoutUI(); }, 320);
      return;
    }
    setTimeout(function () {
      refreshFit();
      if (typeof resize === 'function') resize();
      if (typeof _refreshCanvasViewport === 'function') _refreshCanvasViewport();
    }, 320);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('load', function () { setTimeout(refreshFit, 260); });
})();
