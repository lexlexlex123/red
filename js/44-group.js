// ══════════════ ГРУППИРОВКА ОБЪЕКТОВ ══════════════
// 44-group.js загружается последним — все window.mkEl, pick, layerEl уже определены.
(function () {
  'use strict';

  // ── Утилиты ───────────────────────────────────────────────────

  function genGroupId() {
    return 'g' + Date.now() + '_' + Math.floor(Math.random() * 9999);
  }

  function getSlideEls() {
    return (typeof slides !== 'undefined' && slides[cur] && slides[cur].els)
      ? slides[cur].els : [];
  }

  function cv() { return document.getElementById('canvas'); }

  function getGroupDomEls(groupId) {
    if (!groupId) return [];
    return Array.from(cv().querySelectorAll('.el[data-group-id="' + groupId + '"]'));
  }

  function getGroupId(el) { return el ? (el.dataset.groupId || null) : null; }

  // ── Патч mkEl — сразу как IIFE ────────────────────────────────
  // 44-group.js загружается после 41-lego.js, до boot().
  // Когда boot() → loadState() → renderAll() → load() → mkEl() — патч уже активен.

  (function () {
    var _orig = window.mkEl;
    if (!_orig) { console.warn('[group] mkEl not found at patch time'); return; }
    window.mkEl = function (d) {
      _orig.apply(this, arguments);
      if (d && d.groupId) {
        var el = cv() && cv().querySelector('.el[data-id="' + d.id + '"]');
        if (el) {
          el.dataset.groupId = d.groupId;
          el.classList.add('in-group');
        }
      }
    };
  })();

  // ── Патч layerEl — учёт группировки при перемещении по слоям ──
  // Случай 1: выбранный элемент В группе → двигаем всю группу как блок.
  // Случай 2: выбранный элемент одиночный → при up/down перешагивает
  //           через всю группу целиком, а не по одному элементу.

  (function () {
    var _orig = window.layerEl;
    if (!_orig) { console.warn('[group] layerEl not found'); return; }

    window.layerEl = function (dir) {
      var curSel = (typeof sel !== 'undefined') ? sel : null;
      if (!curSel) { _orig.apply(this, arguments); return; }

      var canvas = cv();
      var all = Array.from(canvas.querySelectorAll(':scope > .el'));
      var selIdx = all.indexOf(curSel);
      if (selIdx < 0) { _orig.apply(this, arguments); return; }

      var selGid = getGroupId(curSel);

      // ── Случай 1: выбранный в группе — двигаем всю группу ────
      if (selGid) {
        var groupEls = getGroupDomEls(selGid);
        if (groupEls.length < 2) { _orig.apply(this, arguments); return; }

        var groupSet = new Set(groupEls);
        var groupIdxs = groupEls
          .map(function(ge) { return all.indexOf(ge); })
          .filter(function(i) { return i >= 0; })
          .sort(function(a, b) { return a - b; });
        var minIdx = groupIdxs[0];
        var maxIdx = groupIdxs[groupIdxs.length - 1];

        if (typeof pushUndo === 'function') pushUndo();

        if (dir === 'front') {
          groupEls.forEach(function(ge) { canvas.appendChild(ge); });
        } else if (dir === 'back') {
          var firstNonDecor = all.find(function(e) {
            return !e.classList.contains('decor-el') && !groupSet.has(e);
          });
          if (firstNonDecor) {
            groupEls.forEach(function(ge) { canvas.insertBefore(ge, firstNonDecor); });
          } else {
            groupEls.forEach(function(ge) { canvas.appendChild(ge); });
          }
        } else if (dir === 'up') {
          // Первый чужой элемент после группы
          var afterEl = null;
          for (var i = maxIdx + 1; i < all.length; i++) {
            if (!groupSet.has(all[i])) { afterEl = all[i]; break; }
          }
          if (afterEl) {
            groupEls.forEach(function(ge) { canvas.removeChild(ge); });
            var ref = afterEl.nextSibling;
            groupEls.forEach(function(ge) { canvas.insertBefore(ge, ref); });
          }
        } else if (dir === 'down') {
          // Первый чужой не-декор перед группой
          var beforeEl = null;
          for (var j = minIdx - 1; j >= 0; j--) {
            if (!groupSet.has(all[j]) && !all[j].classList.contains('decor-el')) {
              beforeEl = all[j]; break;
            }
          }
          if (beforeEl) {
            groupEls.forEach(function(ge) { canvas.removeChild(ge); });
            groupEls.forEach(function(ge) { canvas.insertBefore(ge, beforeEl); });
          }
        }

        if (typeof save === 'function') save();
        if (typeof drawThumbs === 'function') drawThumbs();
        if (typeof saveState === 'function') saveState();
        return;
      }

      // ── Случай 2: одиночный элемент — перешагиваем группы целиком ──
      if (dir === 'up' || dir === 'down') {
        if (typeof pushUndo === 'function') pushUndo();

        if (dir === 'up') {
          // Ищем следующий элемент после curSel
          if (selIdx >= all.length - 1) return;
          var nextEl = all[selIdx + 1];
          var nextGid = getGroupId(nextEl);
          if (nextGid) {
            // Следующий элемент — часть группы → перепрыгнуть всю группу
            var nextGroupEls = getGroupDomEls(nextGid);
            var nextGroupIdxs = nextGroupEls
              .map(function(ge) { return all.indexOf(ge); })
              .filter(function(i) { return i >= 0; })
              .sort(function(a, b) { return a - b; });
            var lastOfGroup = all[nextGroupIdxs[nextGroupIdxs.length - 1]];
            // Вставляем curSel после последнего элемента группы
            var afterGroup = lastOfGroup.nextSibling;
            canvas.insertBefore(curSel, afterGroup);
          } else {
            // Обычный элемент — стандартное поведение
            canvas.insertBefore(nextEl, curSel);
          }
        } else { // down
          if (selIdx <= 0) return;
          var prevEl = all[selIdx - 1];
          if (prevEl.classList.contains('decor-el')) return;
          var prevGid = getGroupId(prevEl);
          if (prevGid) {
            // Предыдущий элемент — часть группы → перепрыгнуть всю группу
            var prevGroupEls = getGroupDomEls(prevGid);
            var prevGroupIdxs = prevGroupEls
              .map(function(ge) { return all.indexOf(ge); })
              .filter(function(i) { return i >= 0; })
              .sort(function(a, b) { return a - b; });
            var firstOfGroup = all[prevGroupIdxs[0]];
            canvas.insertBefore(curSel, firstOfGroup);
          } else {
            // Обычный элемент — стандартное поведение
            canvas.insertBefore(curSel, prevEl);
          }
        }

        if (typeof save === 'function') save();
        if (typeof drawThumbs === 'function') drawThumbs();
        if (typeof saveState === 'function') saveState();
        return;
      }

      // front/back для одиночного — стандартное поведение
      _orig.apply(this, arguments);
    };
  })();

  // ── Патч _updateHandlesOverlay: группа — общий bbox с handles ─

  (function () {
    var _origHandles = window._updateHandlesOverlay;
    if (!_origHandles) return;

    window._updateHandlesOverlay = function () {
      var curSel = (typeof sel !== 'undefined') ? sel : null;
      var ms = (typeof multiSel !== 'undefined') ? multiSel : new Set();
      var gid = curSel ? getGroupId(curSel) : null;

      // Always keep selection frames in sync (e.g. while dragging a group)
      if (typeof _updateSelFrames === 'function') _updateSelFrames();

      // Check if multiSel contains elements from multiple groups or mixed (group + non-group)
      var _groupIds = new Set();
      ms.forEach(function(e) { var g = getGroupId(e); if(g) _groupIds.add(g); });
      var _hasNonGroup = false;
      ms.forEach(function(e) { if(!getGroupId(e)) _hasNonGroup = true; });
      var _isMultiGroup = _groupIds.size > 1 || (_groupIds.size >= 1 && _hasNonGroup);

      if (_isMultiGroup && ms.size > 1) {
        if (typeof _rotEl !== 'undefined') _rotEl = null;
        if (typeof _clearStaleHandleHoverFlags === 'function') _clearStaleHandleHoverFlags();
        // Hide all individual .rh handles on group members
        ms.forEach(function(ge) {
          ge.querySelectorAll('.rh').forEach(function(rh) {
            rh.style.display = 'none'; rh.dataset.overlayHidden = '1';
          });
        });
        // Clear overlay once, then draw all group outlines
        var overlay2 = document.getElementById('handles-overlay');
        if (overlay2) overlay2.innerHTML = '';
        _groupIds.forEach(function(g) {
          var gmembers = getGroupDomEls(g);
          if (gmembers.length >= 2) _renderGroupOutlineOnly(g, gmembers);
        });
        // Draw standard resize handles on top (for non-group elements and overall bbox)
        // But DON'T call _origHandles — it clears overlay
        // Instead draw multisel resize handles manually if needed
        return;
      }

      if (gid) {
        var members = getGroupDomEls(gid);
        if (members.length >= 2) {
          if (typeof _rotEl !== 'undefined') _rotEl = null;
          if (typeof _clearStaleHandleHoverFlags === 'function') _clearStaleHandleHoverFlags();
          members.forEach(function(ge) {
            ge.querySelectorAll('.rh').forEach(function(rh) {
              rh.style.display = 'none'; rh.dataset.overlayHidden = '1';
            });
          });
          var overlay = document.getElementById('handles-overlay');
          if (overlay) overlay.innerHTML = '';
          _renderGroupHandles(curSel, gid, members);
          return;
        }
      }

      // Normal element — standard handles
      _origHandles.apply(this, arguments);
    };
  })();

  // Рисует только рамку группы (не очищает overlay — для нескольких групп)
  function _renderGroupOutlineOnly(gid, members) {
    var overlay = document.getElementById('handles-overlay');
    if (!overlay) return;
    // Append outline box without clearing overlay (caller manages clearing)
    var bb = getBoundingBox(members);
    var PAD = 8;
    var box = document.createElement('div');
    box.className = 'group-outline-box';
    box.style.cssText = 'position:absolute;pointer-events:none;z-index:9990;'
      + 'left:'+(bb.x-PAD)+'px;top:'+(bb.y-PAD)+'px;'
      + 'width:'+(bb.w+PAD*2)+'px;height:'+(bb.h+PAD*2)+'px;'
      + 'border:2px dashed rgba(99,102,241,0.75);border-radius:5px;'
      + 'box-shadow:0 0 0 1px rgba(99,102,241,0.15);background:rgba(99,102,241,0.04);';
    var lbl = document.createElement('span');
    lbl.textContent = 'Группа';
    lbl.style.cssText = 'position:absolute;top:-20px;left:0;font-size:10px;'
      + 'color:rgba(99,102,241,0.9);font-weight:600;letter-spacing:0.03em;'
      + 'line-height:1;white-space:nowrap;pointer-events:none;user-select:none;';
    box.appendChild(lbl);
    overlay.appendChild(box);
    // NOTE: no _origHandles call here — caller decides whether to call it
  }

  // Рисует handles на bounding box группы
  function _renderGroupHandles(selEl, gid, members) {
    var overlay = document.getElementById('handles-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    document.querySelectorAll('.para-handle,.star-handle,.arc-handle').forEach(function(h){h.remove();});
    overlay.style.pointerEvents = 'auto';

    var bb = getBoundingBox(members);
    var PAD = 8;
    var bx = bb.x - PAD, by = bb.y - PAD;
    var bw = bb.w + PAD * 2, bh = bb.h + PAD * 2;

    // Рамка группы
    var box = document.createElement('div');
    box.id = 'group-outline-box';
    box.style.cssText = 'position:absolute;pointer-events:none;z-index:9990;'
      + 'left:'+bx+'px;top:'+by+'px;width:'+bw+'px;height:'+bh+'px;'
      + 'border:2px dashed rgba(99,102,241,0.75);border-radius:5px;'
      + 'box-shadow:0 0 0 1px rgba(99,102,241,0.15);background:rgba(99,102,241,0.04);';
    var lbl = document.createElement('span');
    lbl.textContent = 'Группа';
    lbl.style.cssText = 'position:absolute;top:-20px;left:0;font-size:10px;'
      + 'color:rgba(99,102,241,0.9);font-weight:600;letter-spacing:0.03em;'
      + 'line-height:1;white-space:nowrap;pointer-events:none;user-select:none;';
    box.appendChild(lbl);
    overlay.appendChild(box);

    var H = 4;
    var positions = [
      ['tl', bx,      by,      -1,-1, 1,1],
      ['tm', bx+bw/2, by,       0,-1, 0,1],
      ['tr', bx+bw,   by,       1,-1, 0,1],
      ['ml', bx,      by+bh/2, -1, 0, 1,0],
      ['mr', bx+bw,   by+bh/2,  1, 0, 0,0],
      ['bl', bx,      by+bh,   -1, 1, 1,0],
      ['bm', bx+bw/2, by+bh,    0, 1, 0,0],
      ['br', bx+bw,   by+bh,    1, 1, 0,0],
    ];

    positions.forEach(function(p) {
      var cls = p[0], px = p[1], py = p[2], dx = p[3], dy = p[4], ax = p[5], ay = p[6];
      var rh = document.createElement('div');
      var cursor = (typeof _rhCursor === 'function') ? _rhCursor(cls, 0) : 'nwse-resize';
      rh.className = 'group-rh';
      rh.style.cssText = 'position:absolute;'
        + 'left:'+(px-H)+'px;top:'+(py-H)+'px;'
        + 'width:8px;height:8px;'
        + 'background:#fff;border:1.5px solid var(--selb);border-radius:50%;'
        + 'box-shadow:0 1px 4px rgba(0,0,0,.5);pointer-events:auto;'
        + 'cursor:'+cursor+';z-index:9999;';
      rh.addEventListener('mousedown', function(e) {
        e.preventDefault(); e.stopPropagation();
        _startGroupResize(e, gid, members, bx, by, bw, bh, dx, dy, ax, ay);
      });
      overlay.appendChild(rh);
    });

    // Зоны вращения в углах bbox (невидимые зоны за пределами handles)
    _addGroupRotationZones(overlay, gid, members, bx, by, bw, bh);
  }

  // Добавляет зоны вращения в 4 угла bbox группы
  function _addGroupRotationZones(overlay, gid, members, bx, by, bw, bh) {
    var R = 22; // радиус зоны вращения
    var gcx = bx + bw / 2, gcy = by + bh / 2;
    var corners = [
      {x: bx,      y: by     },
      {x: bx+bw,   y: by     },
      {x: bx,      y: by+bh  },
      {x: bx+bw,   y: by+bh  },
    ];
    corners.forEach(function(corner) {
      var zone = document.createElement('div');
      zone.style.cssText = 'position:absolute;width:' + (R*2) + 'px;height:' + (R*2) + 'px;'
        + 'left:' + (corner.x - R) + 'px;top:' + (corner.y - R) + 'px;'
        + 'pointer-events:auto;cursor:crosshair;z-index:9998;';
      zone.addEventListener('mousemove', function(e) {
        if (typeof _updateRotCursorFromPivot !== 'function') return;
        var p = typeof _toCanvasCoords === 'function'
          ? _toCanvasCoords(e.clientX, e.clientY)
          : { x: corner.x, y: corner.y };
        _updateRotCursorFromPivot(gcx, gcy, p.x, p.y);
      });
      zone.addEventListener('mouseleave', function() {
        if (typeof _setRotCursor === 'function') _setRotCursor('');
      });
      zone.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        _startGroupRotation(e, gid, members, bx, by, bw, bh);
      });
      overlay.appendChild(zone);
    });
  }

  // Вращает всю группу вокруг центра bbox
  function _startGroupRotation(e, gid, members, bx, by, bw, bh) {
    if (typeof pushUndo === 'function') pushUndo();
    window._anyDragging = true;

    var _z = typeof _canvasZoom === 'number' ? _canvasZoom : 1;
    var cwrap = document.getElementById('cwrap');
    var rect = cwrap.getBoundingClientRect();

    // Центр bbox в canvas-координатах
    var cx = bx + bw / 2;
    var cy = by + bh / 2;

    // Начальный угол курсора относительно центра
    var startMouseX = (e.clientX - rect.left + cwrap.scrollLeft - (typeof ZOOM_PAD !== 'undefined' ? ZOOM_PAD : 0)) / _z;
    var startMouseY = (e.clientY - rect.top  + cwrap.scrollTop  - (typeof ZOOM_PAD !== 'undefined' ? ZOOM_PAD : 0)) / _z;
    var a0 = Math.atan2(startMouseY - cy, startMouseX - cx) * 180 / Math.PI;
    if (typeof _updateRotCursorFromPivot === 'function') {
      _updateRotCursorFromPivot(cx, cy, startMouseX, startMouseY);
    }

    // Начальные углы и позиции всех элементов
    var startStates = members.map(function(ge) {
      return {
        el: ge,
        rot: parseFloat(ge.dataset.rot || 0),
        x: parseInt(ge.style.left) || 0,
        y: parseInt(ge.style.top)  || 0,
        w: parseInt(ge.style.width)  || 0,
        h: parseInt(ge.style.height) || 0,
      };
    });

    var currentDeg = 0;

    function onMove(e2) {
      if (e2.buttons === 0) { onUp(); return; }
      var mx = (e2.clientX - rect.left + cwrap.scrollLeft - (typeof ZOOM_PAD !== 'undefined' ? ZOOM_PAD : 0)) / _z;
      var my = (e2.clientY - rect.top  + cwrap.scrollTop  - (typeof ZOOM_PAD !== 'undefined' ? ZOOM_PAD : 0)) / _z;
      var a = Math.atan2(my - cy, mx - cx) * 180 / Math.PI;
      if (typeof _updateRotCursorFromPivot === 'function') {
        _updateRotCursorFromPivot(cx, cy, mx, my);
      }
      var delta = a - a0;
      if (e2.shiftKey) delta = Math.round(delta / 15) * 15;
      currentDeg = delta;

      var dRad = delta * Math.PI / 180;
      var cosD = Math.cos(dRad), sinD = Math.sin(dRad);

      startStates.forEach(function(st) {
        var ge = st.el;
        // Позиция центра элемента относительно центра bbox
        var ex = st.x + st.w / 2 - cx;
        var ey = st.y + st.h / 2 - cy;
        // Повёрнутая позиция центра
        var nx = cx + ex * cosD - ey * sinD - st.w / 2;
        var ny = cy + ex * sinD + ey * cosD - st.h / 2;
        var nR = st.rot + delta;
        ge.style.left = Math.round(nx) + 'px';
        ge.style.top  = Math.round(ny) + 'px';
        ge.dataset.rot = nR;
        ge.style.transform = 'rotate(' + nR + 'deg)';
      });

      // Обновляем overlay
      var newBx = bx + (bx + bw/2) * (cosD-1) - (by + bh/2) * sinD - bx * (cosD-1) + by * sinD;
      // Для группы рамка остаётся на том же месте (вращается только содержимое)
      // Просто обновим позиции handles
      requestAnimationFrame(function() {
        if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
      });
    }

    function onUp() {
      window._anyDragging = false;
      if (typeof _setRotCursor === 'function') _setRotCursor('');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);

      // Сохраняем финальные данные
      var els = getSlideEls();
      startStates.forEach(function(st) {
        var ge = st.el;
        var d = els.find(function(x) { return x.id === ge.dataset.id; });
        if (d) {
          d.x = parseInt(ge.style.left) || 0;
          d.y = parseInt(ge.style.top)  || 0;
          d.rot = parseFloat(ge.dataset.rot || 0);
        }
      });
      if (typeof save === 'function') save();
      if (typeof saveState === 'function') saveState();
      if (typeof drawThumbs === 'function') drawThumbs();
      if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Масштабирует всю группу пропорционально
  function _startGroupResize(e, gid, members, bx, by, bw, bh, dx, dy, ax, ay) {
    window._resizeDragging = true;
    window._anyDragging = true;
    if (typeof pushUndo === 'function') pushUndo();

    var sx = e.clientX, sy = e.clientY;
    var _z = typeof _canvasZoom === 'number' ? _canvasZoom : 1;

    var startStates = members.map(function(ge) {
      return {
        el: ge,
        x: parseInt(ge.style.left)||0,
        y: parseInt(ge.style.top)||0,
        w: parseInt(ge.style.width)||0,
        h: parseInt(ge.style.height)||0,
      };
    });

    var isCorner = dx !== 0 && dy !== 0;
    var groupAspect = bw / bh;

    function onMove(e2) {
      if (e2.buttons === 0) { onUp(); return; }
      var rdx = (e2.clientX - sx) / _z;
      var rdy = (e2.clientY - sy) / _z;

      var newW, newH;
      if (e2.shiftKey && isCorner) {
        // Proportional resize — lock aspect ratio
        var rawDx = dx * rdx, rawDy = dy * rdy;
        var delta = Math.abs(rawDx) >= Math.abs(rawDy) ? rawDx : rawDy * groupAspect;
        newW = Math.max(40, bw + delta);
        newH = Math.max(20, newW / groupAspect);
      } else {
        newW = Math.max(40, bw + dx * rdx);
        newH = Math.max(20, bh + dy * rdy);
        if (dx === 0) newW = bw;
        if (dy === 0) newH = bh;
      }

      var scaleX = newW / bw;
      var scaleY = newH / bh;

      var originX = ax ? bx + bw : bx;
      var originY = ay ? by + bh : by;

      startStates.forEach(function(st) {
        var ge = st.el;
        var relX = st.x - originX;
        var relY = st.y - originY;
        var newX = Math.round(originX + relX * scaleX);
        var newY = Math.round(originY + relY * scaleY);
        var newElW = Math.max(20, Math.round(st.w * scaleX));
        var newElH = Math.max(10, Math.round(st.h * scaleY));
        // Chem / logic diagrams keep aspect ratio so content doesn't stretch
        if (ge.dataset.graphKind === 'chem' || ge.dataset.graphKind === 'logic') {
          var uni = (Math.abs(scaleX - 1) >= Math.abs(scaleY - 1)) ? scaleX : scaleY;
          newElW = Math.max(80, Math.round(st.w * uni));
          newElH = Math.max(80, Math.round(st.h * uni));
        }
        ge.style.left   = newX + 'px';
        ge.style.top    = newY + 'px';
        ge.style.width  = newElW + 'px';
        ge.style.height = newElH + 'px';
        var d = (typeof slides !== 'undefined') && slides[cur] && slides[cur].els.find(function(x) { return x.id === ge.dataset.id; });
        if (d && ge.dataset.type === 'shape' && typeof renderShapeEl === 'function') renderShapeEl(ge, d, { remapCloud: true });
      });

      // Перерисовываем весь overlay с новыми координатами
      var nbx = ax ? (bx + bw - newW) : bx;
      var nby = ay ? (by + bh - newH) : by;
      _redrawGroupOverlay(gid, members, nbx, nby, newW, newH);
    }

    function onUp() {
      window._resizeDragging = false;
      window._anyDragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      var els = getSlideEls();
      members.forEach(function(ge) {
        var d = els.find(function(x) { return x.id === ge.dataset.id; });
        if (d) {
          d.x = parseInt(ge.style.left)||0;
          d.y = parseInt(ge.style.top)||0;
          d.w = parseInt(ge.style.width)||0;
          d.h = parseInt(ge.style.height)||0;
        }
      });
      if (typeof save === 'function') save();
      if (typeof saveState === 'function') saveState();
      if (typeof drawThumbs === 'function') drawThumbs();
      if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Перерисовывает overlay с новыми bbox-координатами (во время resize)
  function _redrawGroupOverlay(gid, members, bx, by, bw, bh) {
    var overlay = document.getElementById('handles-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';

    // Рамка
    var box = document.createElement('div');
    box.id = 'group-outline-box';
    box.style.cssText = 'position:absolute;pointer-events:none;z-index:9990;'
      + 'left:'+bx+'px;top:'+by+'px;width:'+bw+'px;height:'+bh+'px;'
      + 'border:2px dashed rgba(99,102,241,0.75);border-radius:5px;'
      + 'box-shadow:0 0 0 1px rgba(99,102,241,0.15);background:rgba(99,102,241,0.04);';
    var lbl = document.createElement('span');
    lbl.textContent = 'Группа';
    lbl.style.cssText = 'position:absolute;top:-20px;left:0;font-size:10px;'
      + 'color:rgba(99,102,241,0.9);font-weight:600;letter-spacing:0.03em;'
      + 'line-height:1;white-space:nowrap;pointer-events:none;user-select:none;';
    box.appendChild(lbl);
    overlay.appendChild(box);

    // Handles
    var H = 4;
    var positions = [
      ['tl', bx,      by,      -1,-1, 1,1],
      ['tm', bx+bw/2, by,       0,-1, 0,1],
      ['tr', bx+bw,   by,       1,-1, 0,1],
      ['ml', bx,      by+bh/2, -1, 0, 1,0],
      ['mr', bx+bw,   by+bh/2,  1, 0, 0,0],
      ['bl', bx,      by+bh,   -1, 1, 1,0],
      ['bm', bx+bw/2, by+bh,    0, 1, 0,0],
      ['br', bx+bw,   by+bh,    1, 1, 0,0],
    ];
    positions.forEach(function(p) {
      var cls = p[0], px = p[1], py = p[2], dx = p[3], dy = p[4], ax = p[5], ay = p[6];
      var rh = document.createElement('div');
      var cursor = (typeof _rhCursor === 'function') ? _rhCursor(cls, 0) : 'nwse-resize';
      rh.className = 'group-rh';
      rh.style.cssText = 'position:absolute;left:'+(px-H)+'px;top:'+(py-H)+'px;'
        + 'width:8px;height:8px;background:#fff;border:1.5px solid var(--selb);border-radius:50%;'
        + 'box-shadow:0 1px 4px rgba(0,0,0,.5);pointer-events:auto;cursor:'+cursor+';z-index:9999;';
      rh.addEventListener('mousedown', function(e) {
        e.preventDefault(); e.stopPropagation();
        _startGroupResize(e, gid, members, bx, by, bw, bh, dx, dy, ax, ay);
      });
      overlay.appendChild(rh);
    });
  }

  // ── Патч pick() и renderObjectsPanel ─────────────────────────

  (function () {
    var _origPick = window.pick;
    if (_origPick) {
      window.pick = function (el) {
        _origPick.apply(this, arguments);
        if (!el) {
          // Remove group outline on deselect
          var _ov = document.getElementById('handles-overlay');
          var _ob = _ov && _ov.querySelector('.group-outline-box');
          if (_ob) _ob.remove();
          return;
        }
        // Skip group expansion during rubber-band selection (handled by 28-multisel.js)
        if (window._rbSelecting) return;
        // If picked element is in a group, add ALL members to multiSel
        var gid = getGroupId(el);
        if (gid) {
          var members = getGroupDomEls(gid);
          if (members.length >= 2) {
            if (typeof clearMultiSel === 'function') clearMultiSel();
            members.forEach(function(ge) {
              if (typeof addToMultiSel === 'function') addToMultiSel(ge);
              // Remove individual .sel highlight from group members
              ge.classList.remove('sel');
            });
          }
        }
      };
    }

    var _origPanel = window.renderObjectsPanel;
    if (_origPanel) {
      window.renderObjectsPanel = function () {
        _origPanel.apply(this, arguments);
        _addGroupBadges();
      };
    }
  })();

  // ── СГРУППИРОВАТЬ ─────────────────────────────────────────────

  // Flag: true only when explicitly selecting entire group (not single-element click)
  window._groupOutlineVisible = false;

  window.groupSelected = function () {
    var toGroup = [];
    if (typeof multiSel !== 'undefined' && multiSel.size > 1) {
      multiSel.forEach(function(el) { toGroup.push(el); });
    } else {
      if (typeof toast === 'function') toast('Выберите 2 или более объектов', 'warn');
      return;
    }
    if (toGroup.length < 2) {
      if (typeof toast === 'function') toast('Выберите 2 или более объектов', 'warn');
      return;
    }
    if (typeof pushUndo === 'function') pushUndo();
    var newGid = genGroupId();
    var els = getSlideEls();
    toGroup.forEach(function(domEl) {
      domEl.dataset.groupId = newGid;
      domEl.classList.add('in-group');
      var d = els.find(function(x) { return x.id === domEl.dataset.id; });
      if (d) d.groupId = newGid;
    });
    if (typeof window._syncGroupAnimsOnGroup === 'function') {
      window._syncGroupAnimsOnGroup(newGid, toGroup[0].dataset.id);
    }
    if (typeof save === 'function') save();
    if (typeof saveState === 'function') saveState();
    if (typeof clearMultiSel === 'function') clearMultiSel();
    if (typeof pick === 'function') pick(toGroup[0]);
    if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
    if (typeof renderObjectsPanel === 'function') renderObjectsPanel();
    if (typeof toast === 'function') toast('Сгруппировано: ' + toGroup.length + ' объектов', 'ok');
  };

  // ── РАЗГРУППИРОВАТЬ ───────────────────────────────────────────

  window.ungroupSelected = function () {
    var toUngroup = new Set();
    if (typeof multiSel !== 'undefined' && multiSel.size > 1) {
      multiSel.forEach(function(el) { toUngroup.add(el); });
    } else if (typeof sel !== 'undefined' && sel) {
      toUngroup.add(sel);
    }
    if (toUngroup.size === 0) {
      if (typeof toast === 'function') toast('Нет выбранных объектов', 'warn');
      return;
    }
    var groupIds = new Set();
    toUngroup.forEach(function(el) {
      var gid = getGroupId(el); if (gid) groupIds.add(gid);
    });
    if (groupIds.size === 0) {
      if (typeof toast === 'function') toast('Выбранные объекты не в группе', 'warn');
      return;
    }
    if (typeof pushUndo === 'function') pushUndo();
    var els = getSlideEls();
    var count = 0;
    groupIds.forEach(function(gid) {
      getGroupDomEls(gid).forEach(function(domEl) {
        delete domEl.dataset.groupId;
        domEl.classList.remove('in-group');
        var d = els.find(function(x) { return x.id === domEl.dataset.id; });
        if (d) { delete d.groupId; count++; }
      });
    });
    if (typeof save === 'function') save();
    if (typeof saveState === 'function') saveState();
    // Восстанавливаем .rh у всех разгруппированных элементов
    toUngroup.forEach(function(domEl) {
      domEl.querySelectorAll('.rh[data-overlay-hidden]').forEach(function(rh) {
        rh.style.display = '';
        delete rh.dataset.overlayHidden;
      });
    });
    // Перерисовываем handles для текущего выделения
    if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
    if (typeof renderObjectsPanel === 'function') renderObjectsPanel();
    if (typeof toast === 'function') toast('Разгруппировано: ' + count + ' объектов', 'ok');
  };

  // ── GROUP OUTLINE ─────────────────────────────────────────────

  function getBoundingBox(elems) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elems.forEach(function(el) {
      var l = parseFloat(el.style.left)||0, t = parseFloat(el.style.top)||0;
      var w = parseFloat(el.style.width)||0, h = parseFloat(el.style.height)||0;
      var rot = (parseFloat(el.dataset.rot)||0) * Math.PI / 180;
      var cx = l + w/2, cy = t + h/2;
      [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].forEach(function(pt) {
        var rx = cx + pt[0]*Math.cos(rot) - pt[1]*Math.sin(rot);
        var ry = cy + pt[0]*Math.sin(rot) + pt[1]*Math.cos(rot);
        if (rx < minX) minX = rx; if (ry < minY) minY = ry;
        if (rx > maxX) maxX = rx; if (ry > maxY) maxY = ry;
      });
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function updateGroupOutline() {
    var overlay = document.getElementById('handles-overlay');
    if (!overlay) return;
    var old = overlay.querySelector('.group-outline-box');
    if (old) old.remove();
    var curSel = (typeof sel !== 'undefined') ? sel : null;
    if (!curSel) return;
    var gid = getGroupId(curSel);
    if (!gid) return;
    var members = getGroupDomEls(gid);
    if (members.length < 2) return;
    var PAD = 8, bb = getBoundingBox(members);
    var box = document.createElement('div');
    box.id = 'group-outline-box';
    box.style.cssText = 'position:absolute;pointer-events:none;z-index:9990;'
      + 'left:'+(bb.x-PAD)+'px;top:'+(bb.y-PAD)+'px;'
      + 'width:'+(bb.w+PAD*2)+'px;height:'+(bb.h+PAD*2)+'px;'
      + 'border:2px dashed rgba(99,102,241,0.75);border-radius:5px;'
      + 'box-shadow:0 0 0 1px rgba(99,102,241,0.15);background:rgba(99,102,241,0.04);';
    var lbl = document.createElement('span');
    lbl.textContent = 'Группа';
    lbl.style.cssText = 'position:absolute;top:-20px;left:0;font-size:10px;'
      + 'color:rgba(99,102,241,0.9);font-weight:600;letter-spacing:0.03em;'
      + 'line-height:1;white-space:nowrap;pointer-events:none;user-select:none;';
    box.appendChild(lbl);
    overlay.appendChild(box);
  }

  window._updateGroupOutline = updateGroupOutline;

  // ── Значки группы в панели объектов ──────────────────────────

  function _addGroupBadges() {
    var panel = document.getElementById('obj-panel-list');
    if (!panel) return;
    panel.querySelectorAll('.obj-row').forEach(function(row) {
      var el = cv().querySelector('.el[data-id="' + row.dataset.id + '"]');
      if (!el) return;
      var old = row.querySelector('.obj-group-badge');
      if (old) old.remove();
      if (getGroupId(el)) {
        var badge = document.createElement('span');
        badge.className = 'obj-group-badge';
        badge.title = 'В группе';
        badge.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="1.5" y="1.5" width="5" height="5" rx="1"/><rect x="9.5" y="1.5" width="5" height="5" rx="1"/><rect x="1.5" y="9.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M4 6.5v3M12 6.5v3M6.5 4h3M6.5 12h3" stroke-linecap="round"/></svg>';
        var eye = row.querySelector('.obj-eye');
        if (eye) row.insertBefore(badge, eye); else row.appendChild(badge);
      }
    });
  }

  // ── Патч mkDrag: перехват drag для элементов группы ─────────

  (function () {
    var _origMkDrag = window.mkDrag;
    if (!_origMkDrag) return;
    window.mkDrag = function (el, c) {
      _origMkDrag.apply(this, arguments);
      // Добавляем перехват mousedown в capture-фазе ПОВЕРХ оригинала
      el.addEventListener('mousedown', function (e) {
        if (typeof window._isPreviewActive === 'function' && window._isPreviewActive()) return;
        if (e.button !== 0) return;
        // Curve stroke drag — only the curve unless user explicitly multi-selected (Shift/rubber-band)
        if (el.dataset.shape === 'curve') {
          var _ct = e.target;
          var _curveStroke = _ct.tagName === 'path' ||
            (_ct.tagName === 'svg' && _ct.classList && _ct.classList.contains('shape-hit-area'));
          if (_curveStroke && !window._explicitMultiSel) return;
        }
        var gid = getGroupId(el);
        if (!gid) return;
        // If group already fully selected — just let normal drag run
        if (typeof multiSel !== 'undefined' && multiSel.size > 1 && multiSel.has(el)) return;
        // Ждём один тик чтобы оригинальный обработчик запустил drag
        var startL = parseInt(el.style.left)||0;
        var startT = parseInt(el.style.top)||0;
        var members = new Map();
        getGroupDomEls(gid).forEach(function(ge) {
          if (ge === el) return;
          members.set(ge, { x0: parseInt(ge.style.left)||0, y0: parseInt(ge.style.top)||0 });
        });
        function onMove() {
          if (typeof window._isPreviewActive === 'function' && window._isPreviewActive()) return;
          if (!window._anyDragging) return;
          var dx = (parseInt(el.style.left)||0) - startL;
          var dy = (parseInt(el.style.top)||0)  - startT;
          members.forEach(function(pos, ge) {
            ge.style.left = (pos.x0 + dx) + 'px';
            ge.style.top  = (pos.y0 + dy) + 'px';
          });
          if (typeof _updateSelFrames === 'function') _updateSelFrames();
          if (typeof _scheduleHandlesOverlayUpdate === 'function') _scheduleHandlesOverlayUpdate();
          else if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
        }
        function onUp() {
          document.removeEventListener('mousemove', onMove, true);
          document.removeEventListener('mouseup', onUp, true);
          // Clean up any group outline left from drag
          var _ov2 = document.getElementById('handles-overlay');
          var _ob2 = _ov2 && _ov2.querySelector('.group-outline-box');
          if (_ob2) _ob2.remove();
          // Сохраняем позиции участников
          var els = getSlideEls();
          members.forEach(function(pos, ge) {
            var d = els.find(function(x) { return x.id === ge.dataset.id; });
            if (d) { d.x = parseInt(ge.style.left)||0; d.y = parseInt(ge.style.top)||0; }
          });
          if (typeof saveState === 'function') saveState();
          if (typeof drawThumbs === 'function') drawThumbs();
        }
        document.addEventListener('mousemove', onMove, true);
        document.addEventListener('mouseup', onUp, true);
      }, false);
    };
  })();



  // ── Горячие клавиши ───────────────────────────────────────────

  document.addEventListener('keydown', function (e) {
    if (!e.ctrlKey) return;
    var active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.contentEditable === 'true')) return;
    if (e.code === 'KeyG' && !e.shiftKey) { e.preventDefault(); window.groupSelected(); }
    if (e.code === 'KeyG' && e.shiftKey) { e.preventDefault(); window.ungroupSelected(); }
  });

  // ── Контекстное меню объектов (ПКМ) ─────────────────────────

  var _EL_CTX_ICONS = {
    group: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="8" height="8" rx="1.5"/><rect x="14" y="2" width="8" height="8" rx="1.5"/><rect x="2" y="14" width="8" height="8" rx="1.5"/><rect x="14" y="14" width="8" height="8" rx="1.5"/><path d="M10 6h4M10 18h4M6 10v4M18 10v4" stroke-linecap="round"/></svg>',
    ungroup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="8" height="8" rx="1.5"/><rect x="14" y="2" width="8" height="8" rx="1.5"/><rect x="2" y="14" width="8" height="8" rx="1.5"/><rect x="14" y="14" width="8" height="8" rx="1.5"/><line x1="1" y1="23" x2="23" y2="1" stroke-width="1.5"/></svg>',
    dup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 012-2h10"/></svg>',
    paste: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12h6M9 16h6"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="15" y="15" width="3" height="3"/><rect x="19" y="15" width="2" height="2"/><rect x="15" y="19" width="2" height="2"/><rect x="19" y="19" width="2" height="2"/><path d="M6.5 6.5h.01M17.5 6.5h.01M6.5 17.5h.01"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>'
  };

  function _elCtxLabels() {
    var tr = typeof t === 'function' ? t : function (k) { return k; };
    var en = typeof getLang === 'function' && getLang() === 'en';
    return {
      group: en ? 'Group' : 'Сгруппировать',
      ungroup: en ? 'Ungroup' : 'Разгруппировать',
      dup: tr('btnDuplicate'),
      copy: tr('ctxCopySlide'),
      paste: tr('ctxPasteSlide'),
      qrCreate: tr('ctxCreateQr'),
      del: tr('btnDelete')
    };
  }

  function _elCtxCopyLabel(count) {
    var L = _elCtxLabels();
    if (count <= 1) return L.copy;
    var tr = typeof t === 'function' ? t : function (k) { return k; };
    return tr('ctxCopySlidesN').replace('{n}', String(count));
  }

  function _elCtxDeleteLabel(count) {
    var L = _elCtxLabels();
    if (count <= 1) return L.del;
    var tr = typeof t === 'function' ? t : function (k) { return k; };
    return tr('ctxDeleteSlidesN').replace('{n}', String(count));
  }

  function _hideElCtxMenu() {
    var m = document.getElementById('el-ctx-menu');
    if (m) m.style.display = 'none';
  }
  window._hideElCtxMenu = _hideElCtxMenu;

  function _showElCtxMenu(x, y, items) {
    var m = document.getElementById('el-ctx-menu');
    if (!m) {
      m = document.createElement('div');
      m.id = 'el-ctx-menu';
      m.className = 'slide-ctx-menu';
      document.body.appendChild(m);
      // capture: закрываем до stopPropagation на .el (ЛКМ по другому объекту и т.п.)
      document.addEventListener('mousedown', function (e) {
        if (m.style.display === 'none') return;
        if (m.contains(e.target)) return;
        // ПКМ: меню сразу переоткроет contextmenu — не мигаем закрытием здесь
        if (e.button === 2) return;
        _hideElCtxMenu();
      }, true);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') _hideElCtxMenu(); });
      window.addEventListener('scroll', function () { _hideElCtxMenu(); }, true);
    }
    m.innerHTML = '';
    items.forEach(function (it) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slide-ctx-item' + (it.warn ? ' slide-ctx-warn' : '') + (it.disabled ? ' disabled' : '');
      btn.innerHTML = '<span class="slide-ctx-ico">' + it.icon + '</span><span class="slide-ctx-lbl">' + it.label + '</span>';
      if (!it.disabled) {
        btn.onmousedown = function (e) { e.preventDefault(); };
        btn.onclick = function (e) { e.stopPropagation(); _hideElCtxMenu(); it.action(); };
      }
      m.appendChild(btn);
    });
    m.style.display = 'block';
    m.style.visibility = 'hidden';
    m.style.left = '0';
    m.style.top = '0';
    var mw = m.offsetWidth, mh = m.offsetHeight, pad = 8;
    var lx = x, ly = y;
    if (lx + mw + pad > window.innerWidth) lx = window.innerWidth - mw - pad;
    if (ly + mh + pad > window.innerHeight) ly = window.innerHeight - mh - pad;
    if (lx < pad) lx = pad;
    if (ly < pad) ly = pad;
    m.style.left = lx + 'px';
    m.style.top = ly + 'px';
    m.style.visibility = '';
  }

  function _ctxTargetEls() {
    var ms = (typeof multiSel !== 'undefined') ? multiSel : null;
    if (ms && ms.size > 0) return Array.from(ms);
    if (typeof sel !== 'undefined' && sel) return [sel];
    return [];
  }

  function _ctxGroupMenuState(elems) {
    if (!elems.length) return { showGroup: false, showUngroup: false };
    if (elems.length < 2) {
      return { showGroup: false, showUngroup: !!getGroupId(elems[0]) };
    }
    var groupIds = new Set();
    elems.forEach(function (el) { var g = getGroupId(el); if (g) groupIds.add(g); });
    if (groupIds.size === 1) {
      var gid = groupIds.values().next().value;
      var full = getGroupDomEls(gid);
      if (full.length >= 2 && full.length === elems.length) {
        var set = new Set(elems);
        if (full.every(function (ge) { return set.has(ge); })) {
          return { showGroup: false, showUngroup: true };
        }
      }
    }
    return { showGroup: true, showUngroup: false };
  }

  function _ctxGetTextFromEl(textEl) {
    var tel = textEl.querySelector('.tel') || textEl.querySelector('.ec');
    if (!tel) return '';
    var sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      var r = sel.getRangeAt(0);
      if (tel.contains(r.commonAncestorContainer)) {
        return (sel.toString() || '').trim();
      }
    }
    return (tel.innerText || tel.textContent || '').trim();
  }

  function _openCanvasCtxMenu(x, y) {
    var L = _elCtxLabels();
    var canPaste = typeof clipboard !== 'undefined' && clipboard && clipboard.length > 0;
    _showElCtxMenu(x, y, [{
      icon: _EL_CTX_ICONS.paste,
      label: L.paste,
      disabled: !canPaste,
      action: function () { if (typeof pasteSelected === 'function') pasteSelected(); }
    }]);
  }

  function _openElCtxMenu(x, y, opts) {
    opts = opts || {};
    var elems = _ctxTargetEls();
    if (!elems.length) return;
    var st = _ctxGroupMenuState(elems);
    var L = _elCtxLabels();
    var multi = elems.length > 1;
    var canPaste = typeof clipboard !== 'undefined' && clipboard && clipboard.length > 0;
    var items = [];
    var qrText = (opts.qrText || '').trim();
    if (qrText) {
      items.push({
        icon: _EL_CTX_ICONS.qr,
        label: L.qrCreate,
        action: function () {
          if (typeof insertQRAppletAt === 'function') insertQRAppletAt(qrText, x, y);
        }
      });
    }
    if (st.showUngroup) {
      items.push({ icon: _EL_CTX_ICONS.ungroup, label: L.ungroup, action: function () { window.ungroupSelected(); } });
    } else if (st.showGroup) {
      items.push({ icon: _EL_CTX_ICONS.group, label: L.group, action: function () { window.groupSelected(); } });
    }
    items.push({
      icon: _EL_CTX_ICONS.dup,
      label: L.dup,
      action: function () {
        if (multi) {
          if (typeof copySelected === 'function') copySelected();
          if (typeof pasteSelected === 'function') pasteSelected();
        } else if (typeof dupEl === 'function') dupEl();
      }
    });
    items.push({
      icon: _EL_CTX_ICONS.copy,
      label: _elCtxCopyLabel(elems.length),
      action: function () { if (typeof copySelected === 'function') copySelected(); }
    });
    items.push({
      icon: _EL_CTX_ICONS.paste,
      label: L.paste,
      disabled: !canPaste,
      action: function () { if (typeof pasteSelected === 'function') pasteSelected(); }
    });
    items.push({
      icon: _EL_CTX_ICONS.del,
      label: _elCtxDeleteLabel(elems.length),
      warn: true,
      action: function () { if (typeof deleteSelected === 'function') deleteSelected(); }
    });
    _showElCtxMenu(x, y, items);
  }

  function _initElCtxMenu() {
    var canvas = cv();
    if (!canvas || canvas._elCtxBound) return;
    canvas._elCtxBound = true;
    canvas.addEventListener('contextmenu', function (e) {
      var hit = e.target && e.target.closest ? e.target.closest('.el') : null;

      if (!hit && canvas.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        _openCanvasCtxMenu(e.clientX, e.clientY);
        return;
      }
      if (!hit || !canvas.contains(hit)) return;
      if (hit.classList.contains('decor-el') || hit.dataset.type === 'pagenum') return;

      var isText = hit.dataset.type === 'text';
      if (!isText) {
        if (hit.dataset.editing === 'true') return;
        var active = document.activeElement;
        if (active && active.contentEditable === 'true' && hit.contains(active)) return;
      }

      var ms = (typeof multiSel !== 'undefined') ? multiSel : null;
      var inSel = (ms && ms.has(hit)) || (typeof sel !== 'undefined' && sel === hit);
      var qrText = isText ? _ctxGetTextFromEl(hit) : '';
      if (!inSel && typeof pick === 'function') pick(hit);
      e.preventDefault();
      e.stopPropagation();
      _openElCtxMenu(e.clientX, e.clientY, { qrText: qrText });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initElCtxMenu);
  } else {
    _initElCtxMenu();
  }

  // ── Патч copySelected: копировать всю группу при выборе одного элемента ──

  (function () {
    var _orig = window.copySelected;
    if (!_orig) return;
    window.copySelected = function () {
      var curSel = (typeof sel !== 'undefined') ? sel : null;
      // Если выбран одиночный элемент группы — расширяем до всей группы
      if (curSel && (typeof multiSel === 'undefined' || multiSel.size <= 1)) {
        var gid = getGroupId(curSel);
        if (gid) {
          var groupDomEls = getGroupDomEls(gid);
          if (groupDomEls.length > 1) {
            // Временно заполняем multiSel элементами группы
            var prevSel = curSel;
            if (typeof clearMultiSel === 'function') clearMultiSel();
            groupDomEls.forEach(function(ge) {
              if (typeof addToMultiSel === 'function') addToMultiSel(ge);
            });
            _orig.apply(this, arguments);
            // Восстанавливаем одиночное выделение
            if (typeof clearMultiSel === 'function') clearMultiSel();
            if (typeof pick === 'function') pick(prevSel);
            return;
          }
        }
      }
      _orig.apply(this, arguments);
    };
  })();

  // ── Патч deleteSelected: удалять всю группу при удалении одного элемента ──

  (function () {
    var _orig = window.deleteSelected;
    if (!_orig) return;
    window.deleteSelected = function () {
      var curSel = (typeof sel !== 'undefined') ? sel : null;
      // Если выбран одиночный элемент группы — удаляем всю группу
      if (curSel && (typeof multiSel === 'undefined' || multiSel.size <= 1)) {
        var gid = getGroupId(curSel);
        if (gid) {
          var groupDomEls = getGroupDomEls(gid);
          if (groupDomEls.length > 1) {
            if (typeof pushUndo === 'function') pushUndo();
            var s = (typeof slides !== 'undefined') ? slides[cur] : null;
            if (!s) return;
            groupDomEls.forEach(function(domEl) {
              var idx2 = s.els.findIndex(function(x) { return x.id === domEl.dataset.id; });
              if (typeof _hfOnDelete === 'function') { var _d = s.els[idx2]; if (_d) _hfOnDelete(_d); }
              if (idx2 >= 0) s.els.splice(idx2, 1);
              domEl.remove();
            });
            if (typeof clearMultiSel === 'function') clearMultiSel();
            sel = null;
            var _ov = document.getElementById('handles-overlay');
            if (_ov) _ov.innerHTML = '';
            document.querySelectorAll('.arc-handle,.star-handle,.para-handle').forEach(function(h){h.remove();});
            if (typeof save === 'function') save();
            if (typeof drawThumbs === 'function') drawThumbs();
            if (typeof saveState === 'function') saveState();
            if (typeof syncProps === 'function') syncProps();
            if (typeof renderAnimPanel === 'function') renderAnimPanel();
            if (typeof renderMotionOverlay === 'function') renderMotionOverlay();
            if (typeof toast === 'function') toast('Группа удалена', 'ok');
            return;
          }
        }
      }
      _orig.apply(this, arguments);
    };
  })();


  // ── Патч pasteSelected: при вставке группы генерировать новый groupId ──

  (function () {
    var _orig = window.pasteSelected;
    if (!_orig) return;
    window.pasteSelected = function () {
      // Проверяем буфер обмена на наличие группы
      var cb = (typeof clipboard !== 'undefined') ? clipboard : [];
      // Найдём все уникальные groupId в буфере
      var gidMap = {}; // oldGid -> newGid
      cb.forEach(function(d) {
        if (d.groupId && !gidMap[d.groupId]) {
          gidMap[d.groupId] = 'g' + Date.now() + '_' + Math.floor(Math.random() * 9999) + '_p';
        }
      });
      // Если есть группы — временно переписываем groupId на новые
      if (Object.keys(gidMap).length > 0) {
        cb.forEach(function(d) {
          if (d.groupId && gidMap[d.groupId]) {
            d._origGroupId = d.groupId;
            d.groupId = gidMap[d.groupId];
          }
        });
      }
      _orig.apply(this, arguments);
      // Восстанавливаем оригинальные groupId в буфере (чтобы можно было вставить ещё раз)
      cb.forEach(function(d) {
        if (d._origGroupId) {
          d.groupId = d._origGroupId;
          delete d._origGroupId;
        }
      });
    };
  })();


})();
