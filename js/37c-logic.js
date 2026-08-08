// 37c-logic.js — Boolean algebra → IEC logic-gate schematic
// AND=&  OR=1  NOT=box+bubble  NAND=&+bubble  NOR=1+bubble
// · & \land = AND;  + \lor = OR;  overline / \neg = NOT
(function () {
  'use strict';

  function _stripMathDelims(raw) {
    let s = String(raw || '').trim();
    s = s.replace(/^\$+|\$+$/g, '');
    s = s.replace(/\\[\[\(]|\\[\]\)]/g, '');
    return s.trim();
  }

  function _replaceCmdBraced(s, cmd, fn) {
    const needle = '\\' + cmd;
    let out = '';
    let i = 0;
    while (i < s.length) {
      const idx = s.indexOf(needle, i);
      if (idx < 0) { out += s.slice(i); break; }
      out += s.slice(i, idx);
      let j = idx + needle.length;
      while (j < s.length && /\s/.test(s[j])) j++;
      if (s[j] === '{') {
        let depth = 0, k = j;
        for (; k < s.length; k++) {
          if (s[k] === '{') depth++;
          else if (s[k] === '}') {
            depth--;
            if (depth === 0) { k++; break; }
          }
        }
        out += fn(s.slice(j + 1, k - 1));
        i = k;
      } else if (/[A-Za-z]/.test(s[j] || '')) {
        out += fn(s[j]);
        i = j + 1;
      } else {
        out += needle;
        i = idx + needle.length;
      }
    }
    return out;
  }

  function normalizeLogic(raw) {
    let s = _stripMathDelims(raw);
    if (!s) return '';

    s = _replaceCmdBraced(s, 'overline', inner => '~(' + inner + ')');
    s = _replaceCmdBraced(s, 'bar', inner => '~(' + inner + ')');
    s = _replaceCmdBraced(s, 'neg', inner => '~(' + inner + ')');
    s = _replaceCmdBraced(s, 'lnot', inner => '~(' + inner + ')');
    s = s.replace(/\\(?:neg|lnot)\s*/g, '~');

    s = s.replace(/\\left|\\right|\\big|\\Big|\\bigg|\\Bigg/g, '');
    s = s.replace(/\\cdot|\\times|\\ast|\\land|\\wedge|·|⋅|∧|\&/g, '&');
    s = s.replace(/\\lor|\\vee|∨/g, '|');
    s = s.replace(/\\oplus|⊕/g, '^');
    s = s.replace(/¬/g, '~');
    s = s.replace(/\*/g, '&');

    s = s.replace(/\\mathrm|\\text|\\operatorname|\\mathit|\\mathbf/g, '');
    s = s.replace(/[{}]/g, '');
    s = s.replace(/\s+/g, '');
    return s;
  }

  function looksLikeLogic(raw) {
    const src = _stripMathDelims(raw);
    if (!src || src.length > 200) return false;
    if (/[=∫∑∏√]|\\frac|\\sqrt|\\int|\\sum|\\lim|sin|cos|tan|log|infty/i.test(src) &&
        !/\\overline|\\bar|\\neg|\\land|\\lor|\\wedge|\\vee|\\cdot/.test(src)) {
      return false;
    }
    if (/[xy]\s*=/.test(src)) return false;
    if (typeof window._chemIsFormula === 'function' && window._chemIsFormula(src) &&
        !/\\overline|\\bar|\\neg|\\land|\\lor|\\cdot|·|∧|∨|&/.test(src)) {
      return false;
    }

    const hasOp =
      /\\overline|\\bar|\\neg|\\lnot|\\land|\\lor|\\wedge|\\vee|\\cdot|·|⋅|∧|∨|¬|⊕|&/.test(src) ||
      /[A-Za-z]\s*[·⋅*&\u2227]\s*[A-Za-z(~\\]/.test(src) ||
      /[A-Za-z)\]]\s*[+|\u2228]\s*[A-Za-z(~\\]/.test(src) ||
      /~\s*[A-Za-z(]/.test(src);

    if (!hasOp || !/[A-Za-z]/.test(src)) return false;
    try { return !!parseLogic(src); } catch (e) { return false; }
  }

  function tokenize(s) {
    s = String(s).replace(/\+/g, '|');
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/[A-Za-z]/.test(ch)) {
        let name = ch;
        i++;
        while (i < s.length && /[0-9']/.test(s[i])) { name += s[i]; i++; }
        tokens.push({ t: 'VAR', v: name.toUpperCase().replace(/'/g, '′') });
        continue;
      }
      if (ch === '&') { tokens.push({ t: 'AND' }); i++; continue; }
      if (ch === '|') { tokens.push({ t: 'OR' }); i++; continue; }
      if (ch === '~' || ch === '!') { tokens.push({ t: 'NOT' }); i++; continue; }
      if (ch === '(') { tokens.push({ t: 'LP' }); i++; continue; }
      if (ch === ')') { tokens.push({ t: 'RP' }); i++; continue; }
      if (ch === '^') { tokens.push({ t: 'OR' }); i++; continue; }
      i++;
    }
    return tokens;
  }

  function parseLogic(normOrRaw) {
    let norm = String(normOrRaw || '');
    if (/\\|[·⋅∧∨¬]/.test(norm) || !/[&|~!]/.test(norm)) {
      norm = normalizeLogic(norm);
    }
    if (!norm) return null;
    norm = norm.replace(/\+/g, '|');
    const tokens = tokenize(norm);
    if (!tokens.length) return null;
    let pos = 0;
    const peek = () => tokens[pos];
    const eat = (t) => {
      if (peek() && peek().t === t) { pos++; return true; }
      return false;
    };

    function parseOr() {
      let node = parseAnd();
      if (!node) return null;
      while (peek() && peek().t === 'OR') {
        eat('OR');
        const r = parseAnd();
        if (!r) break;
        if (node.type === 'or') node.args.push(r);
        else node = { type: 'or', args: [node, r] };
      }
      return node;
    }

    function parseAnd() {
      let node = parseNot();
      if (!node) return null;
      while (peek() && peek().t === 'AND') {
        eat('AND');
        const r = parseNot();
        if (!r) break;
        if (node.type === 'and') node.args.push(r);
        else node = { type: 'and', args: [node, r] };
      }
      return node;
    }

    function parseNot() {
      if (peek() && peek().t === 'NOT') {
        eat('NOT');
        const arg = parseNot();
        if (!arg) return null;
        return { type: 'not', arg };
      }
      return parsePrimary();
    }

    function parsePrimary() {
      if (peek() && peek().t === 'LP') {
        eat('LP');
        const e = parseOr();
        eat('RP');
        return e;
      }
      if (peek() && peek().t === 'VAR') {
        const v = peek().v;
        pos++;
        return { type: 'var', name: v };
      }
      return null;
    }

    const ast = parseOr();
    if (!ast || pos < tokens.length) return null;
    return optimizeAst(ast);
  }

  function optimizeAst(node) {
    if (!node) return null;
    if (node.type === 'var') return node;
    if (node.type === 'not') {
      const a = optimizeAst(node.arg);
      if (!a) return null;
      if (a.type === 'not') return optimizeAst(a.arg);
      if (a.type === 'and') return { type: 'nand', args: a.args };
      if (a.type === 'or') return { type: 'nor', args: a.args };
      return { type: 'not', arg: a };
    }
    if (node.type === 'and' || node.type === 'or' || node.type === 'nand' || node.type === 'nor') {
      return { type: node.type, args: (node.args || []).map(optimizeAst).filter(Boolean) };
    }
    return node;
  }

  function isLogicFormula(raw) {
    return looksLikeLogic(raw);
  }

  // ── Layout ───────────────────────────────────────────────────────────────
  function layoutCircuit(ast) {
    const varMap = Object.create(null);
    const nodes = [];
    let nextVarRow = 0;

    function place(node, rowHint) {
      if (!node) return null;
      if (node.type === 'var') {
        if (!varMap[node.name]) {
          const n = {
            id: 'v_' + node.name,
            kind: 'var',
            name: node.name,
            col: 0,
            row: nextVarRow++,
            inputs: []
          };
          varMap[node.name] = n;
          nodes.push(n);
        }
        return { node: varMap[node.name], top: varMap[node.name].row, bot: varMap[node.name].row };
      }

      // Standalone NOT (only when not folded into parent pin)
      if (node.type === 'not') {
        const c = place(node.arg, rowHint);
        if (!c) return null;
        const n = {
          id: 'g' + nodes.length,
          kind: 'not',
          col: c.node.col + 1,
          row: (c.top + c.bot) / 2,
          inputs: [c.node],
          inv: [false]
        };
        nodes.push(n);
        return { node: n, top: c.top, bot: c.bot };
      }

      if (node.type === 'and' || node.type === 'or' || node.type === 'nand' || node.type === 'nor') {
        const kids = [];
        let cursor = (rowHint != null) ? rowHint : 0;
        (node.args || []).forEach(arg => {
          const k = place(arg, cursor);
          if (!k) return;
          kids.push(k);
          cursor = k.bot + 1.35;
        });
        if (!kids.length) return null;
        const col = Math.max.apply(null, kids.map(k => k.node.col)) + 1;
        const top = kids[0].top;
        const bot = kids[kids.length - 1].bot;
        const n = {
          id: 'g' + nodes.length,
          kind: node.type,
          col,
          row: (top + bot) / 2,
          inputs: kids.map(k => k.node),
          inv: kids.map(() => false)
        };
        nodes.push(n);
        return { node: n, top, bot };
      }
      return null;
    }

    const rootWrap = place(ast, 0);
    if (!rootWrap) return null;

    function consumersOf(varNode) {
      return nodes.filter(g => g.kind !== 'var' && g.inputs.some(inp => inp.id === varNode.id));
    }

    function sortGateInputs(g) {
      const pairs = g.inputs.map((inp, i) => ({ inp, inv: !!(g.inv && g.inv[i]) }));
      pairs.sort((a, b) => a.inp.row - b.inp.row);
      g.inputs = pairs.map(p => p.inp);
      g.inv = pairs.map(p => p.inv);
    }

    for (let iter = 0; iter < 4; iter++) {
      Object.keys(varMap).forEach(name => {
        const v = varMap[name];
        const cons = consumersOf(v);
        if (cons.length < 2) return;
        const ys = cons.map(g => g.row).sort((a, b) => a - b);
        v.row = ys.length % 2
          ? ys[(ys.length - 1) >> 1]
          : 0.5 * (ys[ys.length / 2 - 1] + ys[ys.length / 2]);
      });
      nodes.forEach(g => {
        if (g.kind === 'var') return;
        sortGateInputs(g);
        if (g.inputs.length) {
          g.row = g.inputs.reduce((s, inp) => s + inp.row, 0) / g.inputs.length;
        }
      });
    }

    const byCol = {};
    nodes.forEach(n => {
      if (n.kind === 'var') return;
      (byCol[n.col] || (byCol[n.col] = [])).push(n);
    });
    Object.keys(byCol).forEach(c => {
      const list = byCol[c].sort((a, b) => a.row - b.row);
      for (let i = 1; i < list.length; i++) {
        if (list[i].row - list[i - 1].row < 1.4) {
          list[i].row = list[i - 1].row + 1.4;
        }
      }
    });

    const vars = Object.keys(varMap).map(k => varMap[k])
      .sort((a, b) => a.row - b.row || a.name.localeCompare(b.name));
    vars.forEach((v, i) => { v.row = i; });
    nodes.forEach(g => {
      if (g.kind === 'var') return;
      sortGateInputs(g);
      if (g.inputs.length) {
        g.row = g.inputs.reduce((s, inp) => s + inp.row, 0) / g.inputs.length;
      }
    });

    return { root: rootWrap.node, nodes, vars: varMap };
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function renderLogicCircuit(raw, opts) {
    opts = opts || {};
    const ast = parseLogic(raw);
    if (!ast) return { error: 'not logic', dataUrl: null };

    const layout = layoutCircuit(ast);
    if (!layout) return { error: 'layout', dataUrl: null };

    const W = opts.w || 900;
    const H = opts.h || 560;
    const fg = opts.fg || '#111111';
    const showFormula = opts.showFormula !== false;

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const padL = Math.round(W * 0.09);
    const padR = Math.round(W * 0.1);
    const padT = showFormula ? Math.round(H * 0.16) : Math.round(H * 0.08);
    const padB = Math.round(H * 0.08);

    if (showFormula) {
      const pretty = _prettyLogic(raw);
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '600 ' + Math.round(W * 0.042) + 'px "Times New Roman", Georgia, serif';
      ctx.fillText(pretty, W / 2, Math.round(H * 0.035));
    }

    const maxCol = Math.max.apply(null, layout.nodes.map(n => n.col));
    const rows = layout.nodes.map(n => n.row);
    const minRow = Math.min.apply(null, rows);
    const maxRow = Math.max.apply(null, rows);
    const rowSpan = Math.max(1, maxRow - minRow);

    const gateW = Math.min(70, Math.max(50, W * 0.085));
    const baseGateH = Math.min(58, Math.max(40, H * 0.11));
    const notW = Math.min(48, gateW * 0.72);
    const notH = Math.min(40, baseGateH * 0.8);
    const bubbleR = Math.max(5.5, baseGateH * 0.15);
    const jDotR = Math.max(4, W * 0.006);

    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const colGap = maxCol > 0 ? plotW / (maxCol + 0.45) : plotW;
    const rowGap = rowSpan > 0 ? plotH / (rowSpan + 0.6) : plotH / 2;

    function hasBubble(kind) {
      return kind === 'not' || kind === 'nand' || kind === 'nor';
    }
    function isCombo(kind) {
      return kind === 'and' || kind === 'or' || kind === 'nand' || kind === 'nor';
    }
    function rowToY(row) {
      return padT + (row - minRow + 0.3) * rowGap;
    }

    const pos = {};

    layout.nodes.forEach(n => {
      if (n.kind !== 'var') return;
      const y = rowToY(n.row);
      const x = padL;
      pos[n.id] = {
        x, y, cy: y,
        outX: x + 14, outY: y,
        inX: x, gw: 0, gh: 0, bub: false, id: n.id
      };
    });

    function fanoutCount(varNode) {
      return layout.nodes.filter(g => g.kind !== 'var' && g.inputs.some(inp => inp.id === varNode.id)).length;
    }

    function layoutGateGeom(n) {
      const pairs = n.inputs.map((inp, i) => {
        const sp = pos[inp.id];
        const sy = sp ? sp.outY : rowToY(inp.row);
        return { inp, inv: !!(n.inv && n.inv[i]), sy };
      });
      pairs.sort((a, b) => a.sy - b.sy || String(a.inp.id).localeCompare(String(b.inp.id)));
      n.inputs = pairs.map(p => p.inp);
      n.inv = pairs.map(p => p.inv);

      const isNotOnly = n.kind === 'not';
      const gw = isNotOnly ? notW : gateW;
      const minGap = Math.max(14, baseGateH * 0.28);
      let gh, cy, pinYs;

      if (isNotOnly) {
        const sy = pairs[0] ? pairs[0].sy : rowToY(n.row);
        gh = notH;
        cy = sy;
        pinYs = [sy];
      } else {
        // Pin Y: variable inputs stay on their Y (no C↔E cross).
        // Gate inputs (e.g. NOT) get a slot next to vars — do NOT stretch body up to NOT.y
        // (that made AND2 huge and crossed AND1).
        pinYs = pairs.map(p => (p.inp.kind === 'var' ? p.sy : null));
        const varIdx = [];
        pinYs.forEach((y, i) => { if (y != null) varIdx.push(i); });

        if (!varIdx.length) {
          // only gate inputs
          const mid = pairs.reduce((s, p) => s + p.sy, 0) / Math.max(1, pairs.length);
          pinYs = pairs.map((_, i) => mid + (i - (pairs.length - 1) / 2) * minGap);
        } else {
          // Leading gate-inputs above first variable
          const firstVar = varIdx[0];
          for (let i = firstVar - 1; i >= 0; i--) {
            pinYs[i] = pinYs[i + 1] - minGap;
          }
          // Trailing gate-inputs below last variable
          const lastVar = varIdx[varIdx.length - 1];
          for (let i = lastVar + 1; i < pinYs.length; i++) {
            pinYs[i] = pinYs[i - 1] + minGap;
          }
          // Gate-inputs between variables → midpoint
          for (let i = 0; i < pinYs.length; i++) {
            if (pinYs[i] != null) continue;
            let L = i - 1, R = i + 1;
            while (L >= 0 && pinYs[L] == null) L--;
            while (R < pinYs.length && pinYs[R] == null) R++;
            pinYs[i] = (pinYs[L] + pinYs[R]) / 2;
          }
          // Enforce gaps without pulling variable pins off their sources when possible
          for (let i = 1; i < pinYs.length; i++) {
            if (pinYs[i] >= pinYs[i - 1] + minGap) continue;
            if (pairs[i].inp.kind !== 'var') pinYs[i] = pinYs[i - 1] + minGap;
            else if (pairs[i - 1].inp.kind !== 'var') pinYs[i - 1] = pinYs[i] - minGap;
            else pinYs[i] = pinYs[i - 1] + minGap;
          }
        }

        const yMin = Math.min.apply(null, pinYs);
        const yMax = Math.max.apply(null, pinYs);
        gh = Math.max(baseGateH, (yMax - yMin) + Math.max(16, baseGateH * 0.28));
        cy = (yMin + yMax) / 2;
      }

      const x = (pos[n.id] && pos[n.id].inX != null)
        ? pos[n.id].inX
        : (padL + n.col * colGap);
      const bub = hasBubble(n.kind);
      pos[n.id] = {
        x, y: cy, cy,
        outX: x + gw + (bub ? bubbleR * 2 : 0),
        outY: cy,
        inX: x,
        gw, gh, bub,
        pinYs,
        id: n.id,
        inv: (n.inv || []).slice()
      };
    }

    layout.nodes.forEach(n => { if (n.kind !== 'var') layoutGateGeom(n); });
    for (let pass = 0; pass < 3; pass++) {
      layout.nodes.forEach(n => { if (n.kind !== 'var') layoutGateGeom(n); });
    }

    /**
     * Place NOT on a side-branch of its input var:
     *   A ──●──────── & (uses A)
     *       └──[¬]─── & (uses ¬A)
     * Same left column as sibling gates; always below them — never a tap off a rectangle.
     */
    layout.nodes.forEach(not => {
      if (not.kind !== 'not') return;
      const np = pos[not.id];
      const src = not.inputs[0] ? pos[not.inputs[0].id] : null;
      const consumers = layout.nodes.filter(g =>
        g.kind !== 'var' && g.inputs.some(inp => inp.id === not.id)
      );
      const srcId = not.inputs[0] && not.inputs[0].id;
      const siblings = srcId ? layout.nodes.filter(g =>
        g.id !== not.id && g.kind !== 'var' && g.kind !== 'not' &&
        g.inputs.some(inp => inp.id === srcId)
      ) : [];

      let maxX = W - padR - 80;
      if (consumers.length) {
        maxX = Math.min.apply(null, consumers.map(g => pos[g.id].inX)) - np.gw - Math.max(28, colGap * 0.15);
      }
      const minX = (src ? src.outX : padL) + Math.max(40, colGap * 0.22);

      let targetX;
      if (siblings.length) {
        // Same left column as sibling & — A splits before either rectangle
        const sibLeft = Math.min.apply(null, siblings.map(g => pos[g.id].inX));
        targetX = Math.max(minX, sibLeft);
      } else {
        targetX = Math.min(maxX, Math.max(minX, (minX + maxX) / 2));
      }
      targetX = Math.max(padL + 50, Math.min(targetX, W - padR - np.gw - 60));

      let targetCy = np.cy;
      if (siblings.length) {
        const sibBot = Math.max.apply(null, siblings.map(g => {
          const p = pos[g.id];
          return p.cy + p.gh / 2;
        }));
        targetCy = sibBot + np.gh / 2 + Math.max(28, rowGap * 0.4);
      } else if (src) {
        targetCy = src.outY;
      }

      np.inX = targetX;
      np.x = targetX;
      np.outX = targetX + np.gw + bubbleR * 2;
      np.cy = targetCy;
      np.y = targetCy;
      np.outY = targetCy;
      np.pinYs = [targetCy];

      // Consumers of ¬ must sit to the right of this NOT (no leftward wires)
      const needCons = np.outX + Math.max(32, colGap * 0.18);
      consumers.forEach(g => {
        const cp = pos[g.id];
        if (cp.inX < needCons) {
          const dx = needCons - cp.inX;
          cp.inX += dx; cp.x += dx; cp.outX += dx;
        }
        const needTop = targetCy + np.gh / 2 + 16;
        const curTop = cp.cy - cp.gh / 2;
        if (curTop < needTop) {
          const dy = needTop - curTop;
          cp.cy += dy; cp.y += dy; cp.outY += dy;
          if (cp.pinYs) cp.pinYs = cp.pinYs.map(y => y + dy);
        }
      });
    });

    // Resolve body overlaps — push right only
    (function resolveOverlaps() {
      const gates = layout.nodes.filter(n => n.kind !== 'var');
      for (let pass = 0; pass < 12; pass++) {
        let moved = false;
        for (let i = 0; i < gates.length; i++) {
          for (let j = i + 1; j < gates.length; j++) {
            const a = pos[gates[i].id], b = pos[gates[j].id];
            const ox = a.inX < b.outX && b.inX < a.outX;
            const oy = (a.cy - a.gh / 2) < (b.cy + b.gh / 2) && (b.cy - b.gh / 2) < (a.cy + a.gh / 2);
            if (!ox || !oy) continue;
            const push = (a.inX <= b.inX) ? b : a;
            const other = push === a ? b : a;
            const dx = other.outX + Math.max(28, colGap * 0.15) - push.inX;
            if (dx > 0) {
              push.inX += dx; push.x += dx; push.outX += dx;
              moved = true;
            }
          }
        }
        if (!moved) break;
      }
    })();

    // Re-fit combo pins after moves (do not move NOT — Y already set for side-branch)
    layout.nodes.forEach(n => {
      if (n.kind === 'var' || n.kind === 'not') return;
      layoutGateGeom(n);
    });

    (function resolveOverlaps2() {
      const gates = layout.nodes.filter(n => n.kind !== 'var');
      for (let pass = 0; pass < 8; pass++) {
        let moved = false;
        for (let i = 0; i < gates.length; i++) {
          for (let j = i + 1; j < gates.length; j++) {
            const a = pos[gates[i].id], b = pos[gates[j].id];
            const ox = a.inX < b.outX && b.inX < a.outX;
            const oy = (a.cy - a.gh / 2) < (b.cy + b.gh / 2) && (b.cy - b.gh / 2) < (a.cy + a.gh / 2);
            if (!ox || !oy) continue;
            const push = (a.inX <= b.inX) ? b : a;
            const other = push === a ? b : a;
            const dx = other.outX + Math.max(28, colGap * 0.15) - push.inX;
            if (dx > 0) {
              push.inX += dx; push.x += dx; push.outX += dx;
              moved = true;
            }
          }
        }
        if (!moved) break;
      }
    })();

    // Obstacle rects (gate bodies) for wire routing
    function gateObstacles(exceptIds) {
      const ex = exceptIds || {};
      const list = [];
      layout.nodes.forEach(n => {
        if (n.kind === 'var' || ex[n.id]) return;
        const p = pos[n.id];
        if (!p || !p.gw) return;
        const pad = 3;
        list.push({
          id: n.id,
          left: p.inX - pad,
          right: p.inX + p.gw + (p.bub ? bubbleR * 2 : 0) + pad,
          top: p.cy - p.gh / 2 - pad,
          bot: p.cy + p.gh / 2 + pad
        });
      });
      return list;
    }

    function hHits(y, x0, x1, obs) {
      const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
      if (hi - lo < 0.5) return false;
      return obs.some(o => y >= o.top && y <= o.bot && hi > o.left && lo < o.right);
    }
    function vHits(x, y0, y1, obs) {
      const lo = Math.min(y0, y1), hi = Math.max(y0, y1);
      if (hi - lo < 0.5) return false;
      return obs.some(o => x >= o.left && x <= o.right && hi > o.top && lo < o.bot);
    }

    // Every driver must sit left of every load (no leftward wires needed)
    (function enforceLeftToRight() {
      for (let pass = 0; pass < 8; pass++) {
        let moved = false;
        layout.nodes.forEach(n => {
          if (n.kind === 'var') return;
          const tp = pos[n.id];
          n.inputs.forEach(inp => {
            const sp = pos[inp.id];
            if (!sp || !tp) return;
            const need = sp.outX + Math.max(32, colGap * 0.18);
            if (tp.inX < need) {
              const dx = need - tp.inX;
              tp.inX += dx;
              tp.x += dx;
              tp.outX += dx;
              moved = true;
            }
          });
        });
        if (!moved) break;
      }
    })();

    function pinPos(gateNode, pinIndex) {
      const p = pos[gateNode.id];
      const py = (p.pinYs && p.pinYs[pinIndex] != null) ? p.pinYs[pinIndex] : p.cy;
      return { x: p.inX, y: py, gateId: gateNode.id, inv: false, bodyX: p.inX };
    }

    ctx.strokeStyle = fg;
    ctx.fillStyle = fg;
    const lw = Math.max(2, W * 0.0024);
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function line(x0, y0, x1, y1) {
      // Never draw a leftward horizontal segment
      if (Math.abs(y0 - y1) < 0.01 && x1 < x0 - 0.01) return;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    function fillDot(x, y) {
      ctx.beginPath();
      ctx.arc(x, y, jDotR, 0, Math.PI * 2);
      ctx.fill();
    }

    /**
     * Orthogonal route: only right / up / down (never left).
     * Ends with a horizontal into the pin from the left.
     */
    function routeToPin(src, t) {
      const obs = gateObstacles({ [src.id]: 1, [t.gateId]: 1 });
      const x0 = src.outX, y0 = src.outY;
      const x1 = t.x, y1 = t.y;

      if (x1 <= x0 + 2) {
        line(x0, y0, x0 + 2, y0);
        return;
      }

      function tryHVH(xm) {
        xm = Math.max(x0, Math.min(x1, xm));
        if (hHits(y0, x0, xm, obs)) return false;
        if (Math.abs(y0 - y1) > 0.5 && vHits(xm, y0, y1, obs)) return false;
        if (hHits(y1, xm, x1, obs)) return false;
        if (xm > x0 + 0.5) line(x0, y0, xm, y0);
        if (Math.abs(y0 - y1) > 0.5) line(xm, y0, xm, y1);
        if (x1 > xm + 0.5) line(xm, y1, x1, y1);
        return true;
      }

      if (Math.abs(y0 - y1) < 1) {
        if (!hHits(y0, x0, x1, obs)) {
          line(x0, y0, x1, y1);
          return;
        }
        let blockTop = Infinity, blockBot = -Infinity;
        obs.forEach(o => {
          if (y0 >= o.top && y0 <= o.bot && x1 > o.left && x0 < o.right) {
            blockTop = Math.min(blockTop, o.top);
            blockBot = Math.max(blockBot, o.bot);
          }
        });
        const viaY = (Number.isFinite(blockTop) && y0 - blockTop <= blockBot - y0)
          ? blockTop - 10 : blockBot + 10;
        const xm = Math.max(x0 + 4, Math.min(x1 - 4, (x0 + x1) / 2));
        if (!hHits(y0, x0, xm, obs) && !vHits(xm, y0, viaY, obs) &&
            !hHits(viaY, xm, x1, obs) && !vHits(x1, viaY, y1, obs)) {
          line(x0, y0, xm, y0);
          line(xm, y0, xm, viaY);
          line(xm, viaY, x1, viaY);
          if (Math.abs(viaY - y1) > 0.5) line(x1, viaY, x1, y1);
          return;
        }
      }

      const prefers = [
        x1 - Math.max(14, colGap * 0.1),
        x0 + Math.max(14, colGap * 0.1),
        (x0 + x1) / 2
      ];
      for (let i = 0; i < prefers.length; i++) {
        if (tryHVH(prefers[i])) return;
      }
      for (let xm = x1 - 8; xm >= x0 + 4; xm -= 10) {
        if (tryHVH(xm)) return;
      }

      if (!vHits(x0, y0, y1, obs) && !hHits(y1, x0, x1, obs)) {
        line(x0, y0, x0, y1);
        line(x0, y1, x1, y1);
        return;
      }

      const viaYs = [y1 - 44, y1 + 44, y0 - 44, y0 + 44, padT + 10, H - padB - 10];
      for (let vi = 0; vi < viaYs.length; vi++) {
        const viaY = viaYs[vi];
        const xm = Math.max(x0 + 4, Math.min(x1 - 4, (x0 + x1) / 2));
        if (hHits(y0, x0, xm, obs)) continue;
        if (vHits(xm, y0, viaY, obs)) continue;
        if (hHits(viaY, xm, x1, obs)) continue;
        if (vHits(x1, viaY, y1, obs)) continue;
        line(x0, y0, xm, y0);
        line(xm, y0, xm, viaY);
        line(xm, viaY, x1, viaY);
        if (Math.abs(viaY - y1) > 0.5) line(x1, viaY, x1, y1);
        return;
      }

      const xm = Math.max(x0, Math.min(x1, (x0 + x1) / 2));
      line(x0, y0, xm, y0);
      line(xm, y0, xm, y1);
      line(xm, y1, x1, y1);
    }

    // Leave room for a visible fan-out junction left of every multi-fan consumer
    layout.nodes.forEach(v => {
      if (v.kind !== 'var') return;
      const cons = layout.nodes.filter(g =>
        g.kind !== 'var' && g.inputs.some(inp => inp.id === v.id)
      );
      if (cons.length < 2) return;
      const sp = pos[v.id];
      const need = sp.outX + Math.max(56, colGap * 0.28);
      const minIn = Math.min.apply(null, cons.map(g => pos[g.id].inX));
      if (minIn >= need) return;
      const dx = need - minIn;
      cons.forEach(g => {
        const p = pos[g.id];
        p.inX += dx; p.x += dx; p.outX += dx;
      });
    });
    // Fix overlaps after fan-out padding
    (function resolveOverlaps3() {
      const gates = layout.nodes.filter(n => n.kind !== 'var');
      for (let pass = 0; pass < 6; pass++) {
        let moved = false;
        for (let i = 0; i < gates.length; i++) {
          for (let j = i + 1; j < gates.length; j++) {
            const a = pos[gates[i].id], b = pos[gates[j].id];
            if (!(a.inX < b.outX && b.inX < a.outX)) continue;
            if (!((a.cy - a.gh / 2) < (b.cy + b.gh / 2) && (b.cy - b.gh / 2) < (a.cy + a.gh / 2))) continue;
            const push = a.inX <= b.inX ? b : a;
            const other = push === a ? b : a;
            const dx = other.outX + 24 - push.inX;
            if (dx > 0) { push.inX += dx; push.x += dx; push.outX += dx; moved = true; }
          }
        }
        if (!moved) break;
      }
    })();

    const nets = Object.create(null);
    layout.nodes.forEach(n => {
      if (n.kind === 'var') return;
      n.inputs.forEach((inp, i) => {
        (nets[inp.id] || (nets[inp.id] = [])).push(pinPos(n, i));
      });
    });

    Object.keys(nets).forEach(srcId => {
      const src = pos[srcId];
      const targets = nets[srcId];
      if (!src || !targets.length) return;

      if (targets.length === 1) {
        routeToPin(src, targets[0]);
        return;
      }

      // Fan-out: junction LEFT of every rectangle, then branches only right / up / down.
      // Dots only on true T-junctions (3+ legs), never on L-corners.
      const minTX = Math.min.apply(null, targets.map(t => t.x));
      const trunkObs = gateObstacles({ [srcId]: 1 });

      let bx = Math.min(minTX - Math.max(28, colGap * 0.16), src.outX + Math.max(28, colGap * 0.22));
      bx = Math.max(src.outX + 14, Math.min(bx, minTX - 18));

      for (let k = 0; k < 14; k++) {
        const yMin0 = Math.min.apply(null, targets.map(t => t.y).concat([src.outY]));
        const yMax0 = Math.max.apply(null, targets.map(t => t.y).concat([src.outY]));
        if (!vHits(bx, yMin0, yMax0, trunkObs) && !hHits(src.outY, src.outX, bx, trunkObs)) break;
        bx -= 10;
        if (bx < src.outX + 10) { bx = src.outX + 10; break; }
      }
      bx = Math.min(bx, minTX - 16);
      bx = Math.max(bx, src.outX);

      // Plan each stub first (may offset viaY around a nearer sibling gate)
      const stubPlans = targets.map(t => {
        const stubObs = gateObstacles({ [srcId]: 1, [t.gateId]: 1 });
        let viaY = t.y;
        if (t.x > bx + 1 && hHits(t.y, bx, t.x, stubObs)) {
          const cands = [];
          stubObs.forEach(o => {
            if (o.right > bx + 1 && o.left < t.x - 1) {
              cands.push(o.top - 14, o.bot + 14);
            }
          });
          cands.push(t.y - 48, t.y + 48, src.outY - 48, src.outY + 48);
          // Prefer viaY closer to src (shorter trunk) and still attachable at bx
          cands.sort((a, b) => Math.abs(a - src.outY) - Math.abs(b - src.outY));
          for (let ci = 0; ci < cands.length; ci++) {
            const vy = cands[ci];
            if (hHits(vy, bx, t.x, stubObs)) continue;
            if (Math.abs(vy - t.y) > 0.5 && vHits(t.x, vy, t.y, stubObs)) continue;
            viaY = vy;
            break;
          }
        }
        return { t, viaY, stubObs };
      });

      const trunkYs = stubPlans.map(p => p.viaY).concat(targets.map(t => t.y)).concat([src.outY]);
      const yMin = Math.min.apply(null, trunkYs);
      const yMax = Math.max.apply(null, trunkYs);

      if (bx > src.outX + 0.5) line(src.outX, src.outY, bx, src.outY);
      if (yMax - yMin > 0.5) line(bx, yMin, bx, yMax);

      stubPlans.forEach(p => {
        const t = p.t;
        if (t.x <= bx + 1) return;
        // Always leave the bus at bx — never invent a vertical to the right of the junction
        if (Math.abs(p.viaY - t.y) < 0.5) {
          line(bx, t.y, t.x, t.y);
        } else {
          line(bx, p.viaY, t.x, p.viaY);
          line(t.x, p.viaY, t.x, t.y);
        }
      });

      // Junction dots: only where the bus truly splits (3+ directions)
      const eps = 0.75;
      const jYs = [];
      trunkYs.forEach(y => {
        if (!jYs.some(u => Math.abs(u - y) < eps)) jYs.push(y);
      });
      jYs.forEach(y => {
        const up = (y - yMin) > eps;
        const down = (yMax - y) > eps;
        const fromSrc = Math.abs(y - src.outY) < eps;
        const toStub = stubPlans.some(p =>
          Math.abs(p.viaY - y) < eps && p.t.x > bx + 1
        );
        const dirs = (up ? 1 : 0) + (down ? 1 : 0) + (fromSrc ? 1 : 0) + (toStub ? 1 : 0);
        if (dirs >= 3) fillDot(bx, y);
      });
    });

    const rp = pos[layout.root.id];
    if (rp) {
      const tip = rp.outX + Math.max(32, colGap * 0.22);
      line(rp.outX, rp.outY, tip, rp.outY);
      ctx.beginPath();
      ctx.moveTo(tip, rp.outY);
      ctx.lineTo(tip - 9, rp.outY - 5.5);
      ctx.lineTo(tip - 9, rp.outY + 5.5);
      ctx.closePath();
      ctx.fill();
    }

    // Draw gates
    layout.nodes.forEach(n => {
      const p = pos[n.id];
      if (!p) return;

      if (n.kind === 'var') {
        ctx.font = '700 ' + Math.round(Math.min(34, W * 0.05)) + 'px "Times New Roman", Georgia, serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = fg;
        ctx.fillText(n.name, p.x, p.y);
        line(p.x + 5, p.y, p.outX, p.y);
        return;
      }

      const x = p.inX;
      const y = p.cy - p.gh / 2;
      ctx.strokeStyle = fg;
      ctx.fillStyle = fg;
      ctx.lineWidth = lw;
      ctx.strokeRect(x + 0.5, y + 0.5, p.gw, p.gh);

      if (n.kind === 'not') {
        // NOT = rectangle + circle on the right (output)
        ctx.beginPath();
        ctx.arc(x + p.gw + bubbleR, p.cy, bubbleR, 0, Math.PI * 2);
        ctx.stroke();
        return;
      }

      if (isCombo(n.kind)) {
        ctx.font = '700 ' + Math.round(Math.min(p.gh * 0.28, baseGateH * 0.46)) + 'px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((n.kind === 'and' || n.kind === 'nand') ? '&' : '1', x + p.gw / 2, p.cy + 1);
        // NAND / NOR = & or 1 rectangle + circle on the right
        if (n.kind === 'nand' || n.kind === 'nor') {
          ctx.beginPath();
          ctx.arc(x + p.gw + bubbleR, p.cy, bubbleR, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });

    return {
      dataUrl: cv.toDataURL('image/png'),
      ast,
      pretty: _prettyLogic(raw),
      error: null
    };
  }

  function _prettyLogic(raw) {
    let s = _stripMathDelims(raw);
    s = s.replace(/\\left|\\right/g, '');
    s = s.replace(/\\cdot/g, '·');
    s = s.replace(/\\land|\\wedge/g, '∧');
    s = s.replace(/\\lor|\\vee/g, '∨');
    s = s.replace(/\\neg|\\lnot/g, '¬');
    s = _replaceCmdBraced(s, 'overline', inner => '¬(' + inner.replace(/[{}]/g, '') + ')');
    s = _replaceCmdBraced(s, 'bar', inner => '¬' + inner.replace(/[{}]/g, ''));
    s = s.replace(/[{}]/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    if (s.length > 48) s = s.slice(0, 45) + '…';
    return s || 'логическая схема';
  }

  function logicThemeColors(theme) {
    if (typeof window._chemThemeColors === 'function') return window._chemThemeColors(theme);
    const isDark = theme ? theme.dark !== false : true;
    return { bg: '', fg: isDark ? '#ffffff' : '#111111', isDark: isDark };
  }

  window._logicNormalize = normalizeLogic;
  window._logicParse = parseLogic;
  window._logicIsFormula = isLogicFormula;
  window._logicRender = renderLogicCircuit;
  window._logicThemeColors = logicThemeColors;
  window._logicPretty = _prettyLogic;
})();
