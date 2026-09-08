/* Touch → mouse bridge, text gestures, long-press menu, pinch/drag coordination. */
(function () {
  'use strict';

  function isMobile() {
    return typeof isMobileLayout === 'function' && isMobileLayout();
  }

  function mkMouse(type, ev, buttons, bubbles) {
    return new MouseEvent(type, {
      bubbles: bubbles != null ? bubbles : (type === 'mousedown'),
      cancelable: true,
      clientX: ev.clientX,
      clientY: ev.clientY,
      button: 0,
      buttons: buttons != null ? buttons : (type === 'mouseup' ? 0 : 1),
      shiftKey: !!ev.shiftKey,
      ctrlKey: !!ev.ctrlKey,
      metaKey: !!ev.metaKey
    });
  }

  function cancelActiveTouchDrag() {
    document.dispatchEvent(mkMouse('mouseup', { clientX: 0, clientY: 0 }, 0, false));
    window._anyDragging = false;
  }

  window.wireTouchMouseDrag = function (el, opts) {
    if (!el || el._touchMouseWired) return;
    el._touchMouseWired = true;
    opts = opts || {};

    el.addEventListener('pointerdown', function (pe) {
      if (pe.pointerType === 'mouse') return;
      if (!isMobile()) return;
      if (opts.guard && opts.guard(pe) === false) return;
      if (window._mobilePinchActive) return;

      var sx = pe.clientX;
      var sy = pe.clientY;
      var pid = pe.pointerId;
      var started = false;
      var timer = null;

      function cleanup() {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        document.removeEventListener('pointermove', onEarlyMove);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        document.removeEventListener('pointerup', onCancelUp);
        document.removeEventListener('pointercancel', onCancelUp);
      }

      function onMove(ev) {
        if (ev.pointerId !== pid || window._mobilePinchActive) {
          if (started) cleanup();
          return;
        }
        ev.preventDefault();
        document.dispatchEvent(mkMouse('mousemove', ev, 1, false));
      }

      function onUp(ev) {
        if (ev.pointerId !== pid) return;
        if (started) document.dispatchEvent(mkMouse('mouseup', ev, 0, false));
        cleanup();
      }

      function onCancelUp(ev) {
        if (ev.pointerId !== pid) return;
        cleanup();
      }

      function onEarlyMove(ev) {
        if (ev.pointerId !== pid || window._mobilePinchActive) return;
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > (opts.moveThreshold || 8)) {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          document.removeEventListener('pointermove', onEarlyMove);
          startDrag();
        }
      }

      function startDrag() {
        if (started || window._mobilePinchActive) return;
        started = true;
        document.removeEventListener('pointerup', onCancelUp);
        document.removeEventListener('pointercancel', onCancelUp);
        pe.preventDefault();
        if (opts.stopPropagation !== false) pe.stopPropagation();

        if (opts.onPointerDown) {
          opts.onPointerDown(pe, mkMouse);
        } else {
          var target = opts.target ? opts.target(pe) : el;
          target.dispatchEvent(mkMouse('mousedown', pe, 1, opts.bubbles));
        }

        document.addEventListener('pointermove', onMove, { passive: false });
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
        try { el.setPointerCapture(pid); } catch (e) {}
      }

      document.addEventListener('pointermove', onEarlyMove, { passive: true });
      if (!opts.moveOnly) timer = setTimeout(startDrag, 120);
      document.addEventListener('pointerup', onCancelUp);
      document.addEventListener('pointercancel', onCancelUp);
    }, { passive: false, capture: !!opts.capture });
  };

  var _lastTextTap = null;
  var _textGesture = null;

  function clearTextTapState() {
    _lastTextTap = null;
    _textGesture = null;
  }
  window._clearTextTapState = clearTextTapState;

  function wireTextGestures() {
    document.addEventListener('dblclick', function (e) {
      if (!isMobile()) return;
      var tel = e.target.closest && e.target.closest('.tel');
      if (tel) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);

    document.addEventListener('click', function (e) {
      if (!isMobile()) return;
      var tel = e.target.closest && e.target.closest('.tel');
      if (tel && tel.contentEditable !== 'true') {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    document.addEventListener('pointerdown', function (e) {
      if (!isMobile() || e.pointerType === 'mouse') return;
      if (window._mobileRubberMode) {
        clearTextTapState();
        return;
      }
      var tel = e.target.closest && e.target.closest('.tel');
      if (tel && tel.contentEditable !== 'true') {
        var el = tel.closest('.el');
        if (el && el.dataset.type === 'text') {
          _textGesture = {
            tel: tel,
            el: el,
            x: e.clientX,
            y: e.clientY,
            id: e.pointerId,
            moved: false,
            dragged: false
          };
          return;
        }
      }
      if (!tel) clearTextTapState();
    }, { capture: true, passive: true });

    document.addEventListener('pointermove', function (e) {
      if (!_textGesture || e.pointerId !== _textGesture.id) return;
      if (Math.hypot(e.clientX - _textGesture.x, e.clientY - _textGesture.y) > 6) {
        _textGesture.moved = true;
        _lastTextTap = null;
      }
      if (window._anyDragging) _textGesture.dragged = true;
    }, { capture: true, passive: true });

    document.addEventListener('pointerup', function (e) {
      if (!isMobile() || e.pointerType === 'mouse') return;
      if (window._mobileRubberMode || window._mobilePinchActive) {
        clearTextTapState();
        return;
      }
      if (!_textGesture || e.pointerId !== _textGesture.id) return;
      var g = _textGesture;
      _textGesture = null;
      if (g.dragged || window._anyDragging) return;
      if (g.moved || g.tel.contentEditable === 'true') return;

      var now = Date.now();
      if (_lastTextTap && _lastTextTap.tel === g.tel &&
          now - _lastTextTap.t < 400 &&
          Math.hypot(e.clientX - _lastTextTap.x, e.clientY - _lastTextTap.y) < 28) {
        _lastTextTap = null;
        e.preventDefault();
        e.stopPropagation();
        if (typeof pick === 'function') pick(g.el);
        if (typeof g.tel._enterTextEdit === 'function') g.tel._enterTextEdit();
        window._suppressTextCtxUntil = Date.now() + 800;
        return;
      }

      _lastTextTap = { tel: g.tel, t: now, x: e.clientX, y: e.clientY };
      if (typeof pick === 'function') pick(g.el);
    }, { passive: false, capture: true });
  }

  function wireLongPressCtx() {
    var timer = null;
    var start = null;
    var fired = false;

    function clear() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      start = null;
    }

    document.addEventListener('pointerdown', function (e) {
      if (!isMobile() || e.pointerType === 'mouse') return;
      if (e.target.closest('#props, #ribbon, .modal-ov, #mobile-chrome, #mobile-slide-bar, #ctoolbar, #sidebar')) return;
      var textEl = e.target.closest && e.target.closest('.el[data-type="text"]');
      if (textEl && textEl.dataset.editing !== 'true') return;
      if (_lastTextTap && Date.now() - _lastTextTap.t < 500) return;
      if (window._mobileRubberMode) return;
      fired = false;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId, target: e.target };
      timer = setTimeout(function () {
        if (!start) return;
        fired = true;
        var hit = start.target.closest && (
          start.target.closest('.el') ||
          start.target.closest('#ink-svg') ||
          start.target.closest('#cwrap')
        );
        if (!hit) return;
        var textHit = hit.closest && hit.closest('.el[data-type="text"]');
        if (textHit && textHit.dataset.editing !== 'true') return;
        start.target.dispatchEvent(new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: start.x,
          clientY: start.y,
          button: 2
        }));
        if (navigator.vibrate) {
          try { navigator.vibrate(10); } catch (err) {}
        }
      }, 560);
    }, { capture: true, passive: true });

    document.addEventListener('pointermove', function (e) {
      if (!start || e.pointerId !== start.id) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 14) clear();
    }, { capture: true, passive: true });

    document.addEventListener('pointerup', function (e) {
      if (fired) {
        e.preventDefault();
        e.stopPropagation();
      }
      clear();
    }, { capture: true });
  }

  function wirePinchGuard() {
    document.addEventListener('touchstart', function (e) {
      if (!isMobile()) return;
      if (e.touches.length >= 2) {
        window._mobilePinchActive = true;
        cancelActiveTouchDrag();
      }
    }, { capture: true, passive: true });

    document.addEventListener('touchend', function (e) {
      if (!isMobile()) return;
      if (e.touches.length < 2) {
        setTimeout(function () { window._mobilePinchActive = false; }, 100);
      }
    }, { capture: true, passive: true });

    document.addEventListener('touchcancel', function (e) {
      if (!isMobile()) return;
      if (e.touches.length < 2) window._mobilePinchActive = false;
    }, { capture: true, passive: true });
  }

  function init() {
    if (!isMobile()) return;
    wireTextGestures();
    wireLongPressCtx();
    wirePinchGuard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
