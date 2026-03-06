// ══════════════ OBJECTS PANEL ══════════════
(function () {

  const TYPE_ICON = {
    text:     '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1.5"/><line x1="4" y1="6" x2="12" y2="6"/><line x1="4" y1="8.5" x2="10" y2="8.5"/><line x1="4" y1="11" x2="8" y2="11"/></svg>',
    image:    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1.5"/><circle cx="5.5" cy="6.5" r="1.2"/><path d="M2 11l3-3 2.5 2.5 2-2 4.5 4.5"/></svg>',
    shape:    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="8,2 14,13 2,13"/></svg>',
    table:    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/><line x1="2" y1="7" x2="14" y2="7"/><line x1="7" y1="3" x2="7" y2="13"/></svg>',
    icon:     '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="8,2 10,6 14,6.5 11,9.5 11.5,14 8,12 4.5,14 5,9.5 2,6.5 6,6"/></svg>',
    code:     '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="5,5 2,8 5,11"/><polyline points="11,5 14,8 11,11"/><line x1="9" y1="3" x2="7" y2="13"/></svg>',
    markdown: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="12" height="8" rx="1"/><path d="M5 10V6l2 2 2-2v4"/><path d="M12 10V6l-2 3"/></svg>',
    svg:      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="5.5"/><path d="M4 8c1-3 7-3 8 0s-7 3-8 0"/></svg>',
    applet:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M5 8h6M8 5v6"/></svg>',
    pagenum:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1.5"/><text x="8" y="11" text-anchor="middle" font-size="7" fill="currentColor" stroke="none">1/3</text></svg>',
  };

  const EYE_ON  = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M13.5 5.5C12.3 6.8 10.2 8 8 8s-4.3-1.2-5.5-2.5"/><path d="M1.5 3l13 10"/><path d="M6.2 9.8a3 3 0 0 0 3.8-2"/></svg>';

  function elLabel(d, allEls) {
    const sameType = allEls ? allEls.filter(x => x.type === d.type) : [];
    const idx = sameType.length > 1 ? sameType.findIndex(x => x.id === d.id) + 1 : 0;
    const sfx = idx > 0 ? ' ' + idx : '';
    if (d.type === 'text') {
      const tmp = document.createElement('div');
      tmp.innerHTML = d.html || '';
      const t = (tmp.textContent || '').trim().replace(/\s+/g,' ');
      return t ? (t.length > 22 ? t.slice(0,22)+'…' : t) : 'Текст' + sfx;
    }
    if (d.type === 'shape')    return (d.shape || 'Фигура') + sfx;
    if (d.type === 'image')    return 'Изображение' + sfx;
    if (d.type === 'table')    return 'Таблица' + sfx;
    if (d.type === 'icon')     return (d.iconId || 'Иконка') + sfx;
    if (d.type === 'code')     return 'Код' + sfx;
    if (d.type === 'markdown') return 'Markdown' + sfx;
    if (d.type === 'svg')      return 'SVG' + sfx;
    if (d.type === 'applet')   return (d.appletId || 'Апплет') + sfx;
    if (d.type === 'pagenum')  return 'Номер страницы';
    return (d.type || 'Объект') + sfx;
  }

  // ── Visibility helpers ────────────────────────────────────────────────────
  function applyElHidden(el, hidden) {
    if (hidden) {
      el.style.opacity       = '0';
      el.style.pointerEvents = 'none';
      el.dataset.objHidden   = '1';
      if (typeof sel !== 'undefined' && sel === el && typeof desel === 'function') desel();
    } else {
      el.style.opacity       = '';
      el.style.pointerEvents = '';
      delete el.dataset.objHidden;
    }
  }

  function reapplyHidden() {
    const cv = document.getElementById('canvas');
    if (!cv || !slides || !slides[cur]) return;
    slides[cur].els.forEach(d => {
      if (d.objHidden) {
        const el = cv.querySelector('.el[data-id="' + d.id + '"]');
        if (el) applyElHidden(el, true);
      }
    });
  }
  window.reapplyHiddenEls = reapplyHidden;

  // ── Render ────────────────────────────────────────────────────────────────
  function renderObjectsPanel() {
    const panel = document.getElementById('obj-panel-list');
    if (!panel) return;

    const cv     = document.getElementById('canvas');
    const domEls = Array.from(cv.querySelectorAll(':scope > .el'));
    const items  = domEls.slice().reverse(); // front → top of list

    panel.innerHTML = '';

    const allEls = slides[cur] ? slides[cur].els : [];

    items.forEach(el => {
      const id     = el.dataset.id;
      const d      = slides[cur] && slides[cur].els.find(e => e.id === id);
      if (!d) return;
      const hidden  = el.dataset.objHidden === '1';
      const isSel   = (typeof sel !== 'undefined') && el === sel;

      const row = document.createElement('div');
      row.className = 'obj-row' +
        (isSel          ? ' obj-row-sel'    : '') +
        (d._isDecor     ? ' obj-row-decor'  : '') +
        (hidden         ? ' obj-row-hidden' : '');
      row.dataset.id = id;

      // ── drag handle ──
      const handle = document.createElement('span');
      handle.className = 'obj-handle';
      handle.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor" style="opacity:.45"><circle cx="5" cy="4" r="1.1"/><circle cx="5" cy="8" r="1.1"/><circle cx="5" cy="12" r="1.1"/><circle cx="11" cy="4" r="1.1"/><circle cx="11" cy="8" r="1.1"/><circle cx="11" cy="12" r="1.1"/></svg>';

      // ── type icon ──
      const typeIcon = document.createElement('span');
      typeIcon.className = 'obj-icon';
      typeIcon.innerHTML = TYPE_ICON[d.type] || TYPE_ICON.shape;

      // ── label ──
      const lbl = document.createElement('span');
      lbl.className   = 'obj-label';
      lbl.textContent = elLabel(d, allEls);
      lbl.title       = elLabel(d, allEls);

      // ── eye button ──
      const eye = document.createElement('button');
      eye.className = 'obj-eye' + (hidden ? ' obj-eye-off' : '');
      eye.innerHTML = hidden ? EYE_OFF : EYE_ON;
      eye.title     = hidden ? 'Показать' : 'Скрыть';
      eye.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
      eye.addEventListener('click', e => {
        e.stopPropagation();
        const nowHidden = el.dataset.objHidden === '1';
        applyElHidden(el, !nowHidden);
        const df = slides[cur] && slides[cur].els.find(x => x.id === id);
        if (df) { if (!nowHidden) df.objHidden = true; else delete df.objHidden; }
        if (typeof save === 'function') save();
        renderObjectsPanel();
      });

      row.appendChild(handle);
      row.appendChild(typeIcon);
      row.appendChild(lbl);
      row.appendChild(eye);

      // select on row click (not handle/eye)
      row.addEventListener('mousedown', e => {
        if (e.target.closest('.obj-eye') || e.target.closest('.obj-handle')) return;
        e.preventDefault(); e.stopPropagation();
        if (!hidden && typeof pick === 'function') pick(el);
        renderObjectsPanel();
      });

      panel.appendChild(row);
    });

    // ── Mouse-drag reorder ─────────────────────────────────────────────────
    let dragRow = null, ghost = null, placeholder = null;
    let startY = 0, panelRect = null;

    function endDrag() {
      if (ghost   && ghost.parentNode)       ghost.parentNode.removeChild(ghost);
      if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      if (dragRow) dragRow.classList.remove('obj-dragging');
      ghost = placeholder = dragRow = null;
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup',   onUp,   true);
    }

    function onMove(e) {
      if (!dragRow || !ghost) return;
      e.preventDefault();

      // move ghost
      ghost.style.top = (e.clientY - startY) + 'px';

      // All rows except the dragging one
      const rows = Array.from(panel.querySelectorAll('.obj-row:not(.obj-dragging)'));

      // Find which gap the cursor is in
      let insertBefore = null;
      for (const r of rows) {
        const rect = r.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height * 0.5) { insertBefore = r; break; }
      }

      // Positions adjacent to dragRow are no-ops (wouldn't change order):
      // 1. insertBefore === null and dragRow is last visible element
      // 2. insertBefore is the element right after dragRow in the real DOM
      // Find real next sibling of dragRow (skip placeholder)
      let realNext = dragRow.nextSibling;
      while (realNext && (realNext === placeholder || realNext.classList?.contains('obj-drag-placeholder') || realNext.classList?.contains('obj-drag-line'))) {
        realNext = realNext.nextSibling;
      }

      const isNoOp = (insertBefore === realNext) ||
                     (insertBefore === null && realNext === null);

      if (isNoOp) {
        if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      } else {
        if (insertBefore) panel.insertBefore(placeholder, insertBefore);
        else              panel.appendChild(placeholder);
      }
    }

    function onUp(e) {
      if (!dragRow) { endDrag(); return; }
      e.preventDefault();

      // Insert dragRow where placeholder is (only if placeholder is in DOM)
      if (placeholder && placeholder.parentNode) {
        panel.insertBefore(dragRow, placeholder);
      }

      // Read final order from panel (front-first), reorder canvas DOM
      const cv2      = document.getElementById('canvas');
      const newOrder = Array.from(panel.querySelectorAll('.obj-row'))
                         .map(r => r.dataset.id);
      // newOrder[0] = front = last in canvas DOM
      if (typeof pushUndo === 'function') pushUndo();
      newOrder.slice().reverse().forEach(id => {
        const domEl = cv2.querySelector('.el[data-id="' + id + '"]');
        if (domEl) cv2.appendChild(domEl);
      });

      endDrag();
      if (typeof save === 'function') save();
      if (typeof drawThumbs === 'function') drawThumbs();
      if (typeof saveState === 'function') saveState();
      renderObjectsPanel();
    }

    panel.querySelectorAll('.obj-handle').forEach(handle => {
      handle.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        dragRow  = handle.closest('.obj-row');
        if (!dragRow) return;
        const rect = dragRow.getBoundingClientRect();
        panelRect  = panel.getBoundingClientRect();
        startY     = e.clientY - rect.top; // offset inside row

        // ghost — floating clone
        ghost = dragRow.cloneNode(true);
        ghost.className = 'obj-row obj-ghost';
        ghost.style.cssText =
          'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;' +
          'width:' + rect.width + 'px;pointer-events:none;z-index:9999;';
        document.body.appendChild(ghost);

        // placeholder — created but NOT inserted yet; onMove inserts it when needed
        placeholder = document.createElement('div');
        placeholder.className = 'obj-drag-placeholder';
        placeholder.style.height = rect.height + 'px';

        dragRow.classList.add('obj-dragging');
        document.addEventListener('mousemove', onMove, true);
        document.addEventListener('mouseup',   onUp,   true);
      });
    });
  }

  // ── Patch globals ─────────────────────────────────────────────────────────
  window.addEventListener('load', () => {
    const origPick = window.pick;
    if (origPick) {
      window.pick = function (el) {
        origPick.call(this, el);
        const sec = document.getElementById('objects-panel-section');
        if (sec && sec.style.display !== 'none') renderObjectsPanel();
        // Refresh anim panel if open
        const animPanel = document.getElementById('anim-panel');
        if (animPanel && animPanel.classList.contains('open') && typeof renderAnimPanel === 'function') {
          renderAnimPanel();
        }
      };
    }

    const origSave = window.save;
    if (origSave) {
      window.save = function () {
        origSave.apply(this, arguments);
        const sec = document.getElementById('objects-panel-section');
        if (sec && sec.style.display !== 'none') renderObjectsPanel();
      };
    }

    const origLoad = window.load;
    if (origLoad) {
      window.load = function () {
        origLoad.apply(this, arguments);
        requestAnimationFrame(reapplyHidden);
      };
    }
  });

  window.renderObjectsPanel = renderObjectsPanel;
})();
