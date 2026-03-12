// ══════════════ FORMULA ══════════════
// LaTeX formula element using MathJax 3 → SVG
// Data model: { type:'formula', formulaRaw, formulaSvg, formulaColor, formulaScale }
// formulaSvg is cached SVG string so export/offline works without MathJax

(function(){

// ── MathJax loader ─────────────────────────────────────────────────────────
let _mjReady = false;
let _mjQueue = [];

function _loadMathJax(cb){
  if(_mjReady){ cb && cb(); return; }
  _mjQueue.push(cb);
  if(document.getElementById('mathjax-script')) return;

  window.MathJax = {
    options: { skipHtmlTags: ['script','noscript','style','textarea','pre'] },
    startup: {
      typeset: false,
      ready(){
        MathJax.startup.defaultReady();
        _mjReady = true;
        const q = _mjQueue.splice(0);
        q.forEach(fn => fn && fn());
      }
    }
  };

  // Try local first, fallback to CDN
  const LOCAL = 'libs/mathjax/tex-svg.js';
  const CDN   = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';

  function _loadScript(src, onErr){
    const s = document.createElement('script');
    s.id = 'mathjax-script';
    s.src = src;
    s.async = true;
    s.onerror = onErr;
    document.head.appendChild(s);
  }

  _loadScript(LOCAL, () => {
    // local not found — remove failed script tag and try CDN
    const old = document.getElementById('mathjax-script');
    if(old) old.remove();
    _mjReady = false;
    const s2 = document.createElement('script');
    s2.id = 'mathjax-script';
    s2.src = CDN;
    s2.async = true;
    s2.onerror = () => {
      // Both failed — notify pending callbacks with error
      const q = _mjQueue.splice(0);
      q.forEach(fn => fn && fn(new Error('MathJax недоступен. Скачайте libs/mathjax/tex-svg.js')));
    };
    document.head.appendChild(s2);
  });
}
window._loadMathJax = _loadMathJax;

// ── Render LaTeX → SVG string ───────────────────────────────────────────────
function _renderFormula(latex, cb){
  _loadMathJax(async (err) => {
    if(err){ cb(null, err.message || String(err)); return; }
    try {
      const node = await MathJax.tex2svgPromise(latex, { display: true });
      const svgEl = node.querySelector('svg');
      if(!svgEl){ cb(null, 'Ошибка рендера'); return; }
      // Remove fixed size so it scales with container
      svgEl.removeAttribute('width');
      svgEl.removeAttribute('height');
      svgEl.style.width = '100%';
      svgEl.style.height = '100%';
      // Remove any hardcoded colors — use currentColor everywhere
      svgEl.removeAttribute('color');
      svgEl.style.color = '';
      svgEl.querySelectorAll('*').forEach(n => {
        if(n.getAttribute('fill') === 'black' || n.getAttribute('fill') === '#000' || n.getAttribute('fill') === '#000000')
          n.setAttribute('fill', 'currentColor');
        if(!n.getAttribute('fill') && (n.tagName==='path'||n.tagName==='use'||n.tagName==='rect'))
          n.setAttribute('fill', 'currentColor');
        if(n.style && (n.style.fill==='black'||n.style.fill===''||!n.style.fill))
          n.style.fill = 'currentColor';
      });
      cb(svgEl.outerHTML, null);
    } catch(err){
      cb(null, String(err));
    }
  });
}

// Update a formula element's SVG in the DOM and data model
function _applyFormulaSvg(el, svgStr, color){
  const c = el.querySelector('.ec');
  if(!c) return;
  c.style.color = color || '#ffffff';
  c.innerHTML = svgStr || '';
  const svgEl = c.querySelector('svg');
  if(svgEl){ svgEl.style.width='100%'; svgEl.style.height='100%'; }
}

// ── Add formula element ─────────────────────────────────────────────────────
function addFormula(){
  openFormulaEditor(null);
}

// ── System LaTeX: build \begin{cases}...\end{cases} from lines array ────────
function _buildSystemLatex(lines){
  const nonempty = lines.filter(l => l.trim());
  if(nonempty.length === 0) return '';
  if(nonempty.length === 1) return nonempty[0];
  return '\\left\\{\\begin{array}{l}' + nonempty.join('\\\\') + '\\end{array}\\right.';
}

// ── Editor modal ────────────────────────────────────────────────────────────
function _resolveFormulaDefault(){
  const _ti = typeof appliedThemeIdx!=='undefined' ? appliedThemeIdx : -1;
  const _theme = _ti>=0 ? THEMES[_ti] : null;
  if(_theme && typeof _resolveSchemeColor==='function'){
    return _resolveSchemeColor({col:7,row:0}, _theme) || (_theme.dark ? '#ffffff' : '#000000');
  }
  return _theme ? (_theme.dark ? '#ffffff' : '#000000') : '#ffffff';
}

function openFormulaEditor(existingEl){
  const isNew = !existingEl;
  const _d = existingEl
    ? slides[cur].els.find(x => x.id === existingEl.dataset.id)
    : null;

  const _ti = typeof appliedThemeIdx!=='undefined' ? appliedThemeIdx : -1;
  const _theme = _ti>=0 ? THEMES[_ti] : null;
  let initScheme = null;
  let initColor;
  if(_d){
    if(_d.formulaColorScheme !== null && _d.formulaColorScheme !== undefined
       && typeof _resolveSchemeColor==='function' && _theme){
      initColor = _resolveSchemeColor(_d.formulaColorScheme, _theme) || _resolveFormulaDefault();
      initScheme = _d.formulaColorScheme;
    } else {
      initColor = _d.formulaColor || _resolveFormulaDefault();
      initScheme = _d.formulaColorScheme;
    }
  } else {
    initColor = _resolveFormulaDefault();
    initScheme = {col:7, row:0};
  }

  // Lines: support legacy single string or new array
  let initLines;
  if(_d && Array.isArray(_d.formulaLines)) initLines = [..._d.formulaLines];
  else if(_d && _d.formulaRaw) initLines = [_d.formulaRaw];
  else initLines = ['\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', ''];

  // Ensure at least 2 lines for UI
  while(initLines.length < 2) initLines.push('');

  document.getElementById('formula-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'formula-modal';

  const _GROUPS = [
    { name: 'Греческие', syms: [
      ['α','\\alpha','альфа'],['β','\\beta','бета'],['γ','\\gamma','гамма'],['δ','\\delta','дельта'],['θ','\\theta','тета'],
      ['λ','\\lambda','лямбда'],['μ','\\mu','мю'],['σ','\\sigma','сигма'],['φ','\\phi','фи'],['ω','\\omega','омега'],
      ['Σ','\\Sigma','Сигма (сумма)'],['Π','\\Pi','Пи (произведение)'],['Δ','\\Delta','Дельта'],['Ω','\\Omega','Омега'],['π','\\pi','пи'],
    ]},
    { name: 'Тригонометрия', syms: [
      ['sin','\\sin','синус'],['cos','\\cos','косинус'],['tan','\\tan','тангенс'],['cot','\\cot','котангенс'],
      ['arcsin','\\arcsin','арксинус'],['arccos','\\arccos','арккосинус'],['arctan','\\arctan','арктангенс'],
      ['sinh','\\sinh','гиперб. синус'],['cosh','\\cosh','гиперб. косинус'],['tanh','\\tanh','гиперб. тангенс'],
      ['log','\\log','логарифм'],['ln','\\ln','натуральный логарифм'],['exp','\\exp','экспонента'],['lim','\\lim','предел'],['∞','\\infty','бесконечность'],
    ]},
    { name: 'Операции', syms: [
      ['ᵃ⁄ᵦ','\\frac{a}{b}','дробь a/b'],
      ['√x','\\sqrt{}','квадратный корень'],
      ['ⁿ√x','\\sqrt[n]{}','корень n-й степени'],
      ['x²','x^{2}','степень'],
      ['xₙ','x_{n}','нижний индекс'],
      ['±','\\pm','плюс-минус'],
      ['·','\\cdot','умножение (точка)'],
      ['×','\\times','умножение (крест)'],
      ['÷','\\div','деление'],
      ['∫','\\int','интеграл'],
      ['∑','\\sum','сумма'],
      ['∏','\\prod','произведение'],
      ['∂','\\partial','частная производная'],
      ['∇','\\nabla','набла'],
      ['…','\\ldots','многоточие'],
    ]},
    { name: 'Отношения', syms: [
      ['≤','\\leq','меньше или равно'],['≥','\\geq','больше или равно'],['≠','\\neq','не равно'],['≈','\\approx','приблизительно'],['≡','\\equiv','тождественно равно'],
      ['∈','\\in','принадлежит'],['∉','\\notin','не принадлежит'],['⊂','\\subset','подмножество'],['⊆','\\subseteq','подмножество или равно'],
      ['∪','\\cup','объединение'],['∩','\\cap','пересечение'],['∅','\\emptyset','пустое множество'],
      ['→','\\to','стрелка вправо'],['⟹','\\Rightarrow','следование'],['⟺','\\Leftrightarrow','равносильность'],
    ]},
    { name: 'Прочее', syms: [
      ['|x|','|x|','модуль'],['⌊x⌋','\\lfloor x \\rfloor','нижняя часть'],['⌈x⌉','\\lceil x \\rceil','верхняя часть'],
      ['ℝ','\\mathbb{R}','вещественные числа'],['ℤ','\\mathbb{Z}','целые числа'],['ℕ','\\mathbb{N}','натуральные числа'],['ℂ','\\mathbb{C}','комплексные числа'],
      ['v⃗','\\vec{v}','вектор'],['x̂','\\hat{x}','шляпка'],['x̄','\\bar{x}','черта над x'],
      ['⊞','\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}','матрица'],
      ['ₙ','_{n}','нижний индекс n'],['ⁿ','{}^{n}','верхний индекс n'],['⋯','\\cdots','горизонтальные точки'],['∴','\\therefore','следовательно'],
    ]},
    { name: 'Логика', syms: [
      ['<span style="text-decoration:overline;font-style:italic">A</span>','\\overline{A}','инверсия (черта над)'],
      ['∧','\\land','конъюнкция (И)'],
      ['∨','\\lor','дизъюнкция (ИЛИ)'],
      ['⊕','\\oplus','исключающее ИЛИ (XOR)'],
      ['→','\\rightarrow','импликация (следование →)'],
      ['←','\\leftarrow','обратная импликация (←)'],
      ['↔','\\leftrightarrow','эквивалентность (↔)'],
      ['⟹','\\Rightarrow','следование (⟹)'],
      ['⟺','\\Leftrightarrow','равносильность (⟺)'],
      ['¬','\\neg','отрицание ¬'],
      ['∀','\\forall','квантор всеобщности ∀'],
      ['∃','\\exists','квантор существования ∃'],
      ['↑','\\uparrow','стрелка вверх (штрих Шеффера)'],
      ['↓','\\downarrow','стрелка вниз (стрелка Пирса)'],
      ['⊢','\\vdash','выводимость ⊢'],
    ]},
  ];
  const _SYMS = _GROUPS.flatMap(g => g.syms);

  // Line colors (accent colors from theme, or fallback palette)
  const _lineColors = (_theme && _theme.colors)
    ? _theme.colors.slice(0,7)
    : ['#818cf8','#34d399','#f472b6','#fbbf24','#67e8f9','#fb923c','#a78bfa'];

  modal.className = 'modal-ov open';
  modal.innerHTML = `
  <div class="modal" style="max-width:920px;width:96%;">
    <h3>∑ Редактор формулы</h3>

    <!-- Symbol palette -->
    <div style="display:flex;gap:0;border:1px solid var(--border2);border-radius:6px;overflow:hidden;margin-bottom:12px;">
      ${_GROUPS.map((g, gi) => {
        let offset = _GROUPS.slice(0,gi).reduce((s,x)=>s+x.syms.length,0);
        return `<div style="flex:1;border-right:${gi<_GROUPS.length-1?'1px solid var(--border2)':'none'};display:flex;flex-direction:column;">
          <div style="display:flex;flex-wrap:wrap;gap:2px;padding:5px 5px 4px;flex:1;">
            ${g.syms.map(([label,,title],si)=>`<button class="fm-sym mbtn-sm" data-idx="${offset+si}" style="width:auto;padding:2px 5px;font-size:12px;" title="${title||''}">${label}</button>`).join('')}
          </div>
          <div style="font-size:9px;color:var(--text3);text-align:center;padding:3px 4px 4px;letter-spacing:.3px;border-top:1px solid var(--border);text-transform:uppercase;">${g.name}</div>
        </div>`;
      }).join('')}
    </div>

    <!-- Lines editor -->
    <div id="fm-lines" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;"></div>
    <button id="fm-add-line" class="mbtn-sm" style="align-self:flex-start;margin-bottom:10px;">+ Добавить строку</button>

    <div style="font-size:10px;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">Предпросмотр:</div>
    <div id="fm-preview" style="border:1px solid var(--border2);border-radius:6px;min-height:90px;display:flex;align-items:center;justify-content:center;padding:12px;overflow:hidden;background:var(--surface2);color:var(--text);">
      <span style="opacity:.6">Загрузка…</span>
    </div>
    <div id="fm-error" style="color:#f87171;font-size:12px;display:none;margin-top:6px;"></div>

    <div class="mfooter">
      <button class="mbtn" id="fm-cancel">Отмена</button>
      <button class="mbtn pri" id="fm-ok">${isNew ? 'Вставить' : 'Применить'}</button>
    </div>
  </div>`;

  document.body.appendChild(modal);

  const linesContainer = document.getElementById('fm-lines');
  const preview  = document.getElementById('fm-preview');
  const errDiv   = document.getElementById('fm-error');
  let _activeLineIdx = 0;
  let _lastSvg = null;
  let _renderTimeout = null;

  function _getLines(){
    return Array.from(linesContainer.querySelectorAll('.fm-line-ta')).map(ta => ta.value);
  }

  function _addLineRow(value, idx){
    const color = _lineColors[idx % _lineColors.length];
    const row = document.createElement('div');
    row.className = 'fm-line-row';
    row.style.cssText = 'display:flex;align-items:flex-start;gap:6px;';
    row.innerHTML = `
      <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;margin-top:8px;" title="Цвет линии ${idx+1}"></div>
      <textarea class="fm-line-ta" rows="2" data-idx="${idx}"
        style="flex:1;font-family:var(--font-mono);font-size:12px;background:var(--surface2);color:var(--text);
               border:1px solid var(--border2);border-radius:6px;padding:8px;resize:vertical;line-height:1.6;outline:none;"></textarea>
      <button class="fm-del-line" data-idx="${idx}" style="width:20px;height:20px;padding:0;line-height:1;font-size:11px;flex-shrink:0;margin-top:6px;opacity:.55;background:transparent;border:1px solid var(--border2);border-radius:4px;cursor:pointer;color:var(--text2);" title="Удалить строку">✕</button>
    `;
    row.querySelector('.fm-line-ta').value = value || '';
    linesContainer.appendChild(row);

    row.querySelector('.fm-line-ta').addEventListener('focus', ()=>{ _activeLineIdx = idx; });
    row.querySelector('.fm-line-ta').addEventListener('input', ()=>{
      clearTimeout(_renderTimeout); _renderTimeout = setTimeout(doPreview, 600);
    });
    row.querySelector('.fm-del-line').addEventListener('click', ()=>{
      if(linesContainer.querySelectorAll('.fm-line-row').length <= 1) return;
      row.remove();
      _rebuildLineIndices();
      clearTimeout(_renderTimeout); _renderTimeout = setTimeout(doPreview, 300);
    });
  }

  function _rebuildLineIndices(){
    linesContainer.querySelectorAll('.fm-line-row').forEach((row, i)=>{
      const dot = row.querySelector('div[style*="border-radius:50%"]');
      if(dot) dot.style.background = _lineColors[i % _lineColors.length];
      const ta = row.querySelector('.fm-line-ta');
      if(ta) ta.dataset.idx = i;
      const del = row.querySelector('.fm-del-line');
      if(del) del.dataset.idx = i;
    });
  }

  function doPreview(){
    const lines = _getLines();
    const nonempty = lines.filter(l=>l.trim());
    if(!nonempty.length){ preview.innerHTML='<span style="opacity:.5">Введите формулу</span>'; return; }
    const latex = _buildSystemLatex(nonempty);
    preview.innerHTML = '<span style="opacity:.5">Рендер…</span>';
    errDiv.style.display='none';
    _renderFormula(latex, (svg, err) => {
      if(err){
        errDiv.textContent = 'Ошибка: '+err;
        errDiv.style.display='block';
        preview.innerHTML='<span style="color:#f87171">Ошибка синтаксиса</span>';
        _lastSvg = null;
      } else {
        _lastSvg = svg;
        preview.innerHTML = svg;
        const svgEl = preview.querySelector('svg');
        if(svgEl){ svgEl.style.maxHeight='140px'; svgEl.style.width='auto'; svgEl.style.height='auto'; }
      }
    });
  }

  // Build initial rows
  initLines.forEach((v, i) => _addLineRow(v, i));

  // Add line button
  document.getElementById('fm-add-line').onclick = ()=>{
    const idx = linesContainer.querySelectorAll('.fm-line-row').length;
    _addLineRow('', idx);
    clearTimeout(_renderTimeout); _renderTimeout = setTimeout(doPreview, 300);
  };

  // Symbol buttons — insert into active textarea
  modal.querySelectorAll('.fm-sym').forEach(btn => {
    btn.addEventListener('click', () => {
      const ins = _SYMS[+btn.dataset.idx][1];
      const tas = linesContainer.querySelectorAll('.fm-line-ta');
      const ta = tas[_activeLineIdx] || tas[0];
      if(!ta) return;
      const start = ta.selectionStart, end = ta.selectionEnd;
      ta.value = ta.value.slice(0,start) + ins + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + ins.length;
      ta.focus();
      clearTimeout(_renderTimeout); _renderTimeout = setTimeout(doPreview, 600);
    });
  });

  document.getElementById('fm-cancel').onclick = ()=> modal.remove();
  modal.addEventListener('mousedown', e => { if(e.target === modal) modal.remove(); });

  document.getElementById('fm-ok').onclick = ()=> {
    const lines = _getLines().filter(l => l.trim());
    if(!lines.length){ if(typeof toast==='function') toast('Введите формулу','err'); return; }
    if(!_lastSvg){ doPreview(); if(typeof toast==='function') toast('Дождитесь рендера и нажмите снова','err'); return; }
    const latex = _buildSystemLatex(lines);
    modal.remove();
    _commitFormula(existingEl, latex, lines, _lastSvg, initColor, initScheme);
  };

  doPreview();
}
function _commitFormula(existingEl, latex, lines, svg, color, scheme){
  const finalScheme = (scheme !== undefined) ? scheme : {col:7, row:0};
  if(existingEl){
    pushUndo();
    const d = slides[cur].els.find(x => x.id === existingEl.dataset.id);
    if(d){ d.formulaRaw=latex; d.formulaLines=lines; d.formulaSvg=svg; d.formulaColor=color; d.formulaColorScheme=finalScheme; }
    const liveEl = document.getElementById('canvas').querySelector('[data-id="'+existingEl.dataset.id+'"]') || existingEl;
    liveEl.dataset.formulaColor = color;
    _applyFormulaSvg(liveEl, svg, color);
    save(); drawThumbs(); saveState();
    syncProps();
    toast('Формула обновлена','ok');
  } else {
    pushUndo();
    const d = {
      id:'e'+(++ec), type:'formula',
      x:snapV(80), y:snapV(120), w:snapV(400), h:snapV(160),
      rot:0, anims:[],
      formulaRaw:latex, formulaLines:lines, formulaSvg:svg, formulaColor:color, formulaColorScheme:finalScheme,
    };
    slides[cur].els.push(d);
    mkEl(d);
    const el = document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
    if(el) pick(el);
    save(); drawThumbs(); saveState();
    toast('Формула добавлена','ok');
  }
}

// ── Props panel sync ────────────────────────────────────────────────────────
function syncFormulaProps(){
  if(!sel || sel.dataset.type !== 'formula') return;
  const d = slides[cur].els.find(x => x.id === sel.dataset.id);
  if(!d) return;

  const _ti = typeof appliedThemeIdx!=='undefined' ? appliedThemeIdx : -1;
  const _th = _ti>=0 ? THEMES[_ti] : null;
  const isDark = _th ? _th.dark !== false : true;

  // Assign default scheme if missing (legacy elements)
  if(d.formulaColorScheme === undefined){
    d.formulaColorScheme = {col:7, row:0};
  }

  // Use stored formulaColor directly
  const color = d.formulaColor || (isDark ? '#ffffff' : '#000000');

  // Update props panel UI only
  const previewEl = document.getElementById('fp-preview');
  const colorSw   = document.getElementById('fp-color-swatch');
  const colorHex  = document.getElementById('fp-color-hex');

  if(previewEl && d.formulaSvg){
    previewEl.style.background = '';
    previewEl.style.color = '';  // inherit var(--text) from panel
    previewEl.innerHTML = d.formulaSvg;
    const svgEl = previewEl.querySelector('svg');
    if(svgEl){ svgEl.style.maxHeight='80px'; svgEl.style.width='auto'; svgEl.style.height='auto'; }
  }
  if(colorSw) colorSw.style.background = color;
  if(colorHex) colorHex.value = color;
}

// Update formula color (from props panel color picker)
function setFormulaColor(color, schemeRef){
  if(!sel || sel.dataset.type !== 'formula') return;
  const d = slides[cur].els.find(x => x.id === sel.dataset.id);
  if(!d) return;
  // Update DOM and data BEFORE pushUndo — pushUndo calls save() which reads dataset
  const liveEl = document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]') || sel;
  liveEl.dataset.formulaColor = color;
  const ec = liveEl.querySelector('.ec');
  if(ec) ec.style.color = color;
  d.formulaColor = color;
  d.formulaColorScheme = (schemeRef !== undefined) ? schemeRef : null; // keep position for theme adaptation
  pushUndo();
  if(typeof _thumbFormulaCache !== 'undefined'){
    Object.keys(_thumbFormulaCache).forEach(k=>{ if(k.startsWith('formula_'+d.id)) delete _thumbFormulaCache[k]; });
  }
  if(typeof drawThumbs==='function') drawThumbs();
  saveState();
  syncFormulaProps();
}

// Expose globals
window.addFormula = addFormula;
window.openFormulaEditor = openFormulaEditor;
window.syncFormulaProps = syncFormulaProps;
window.setFormulaColor = setFormulaColor;

})();
