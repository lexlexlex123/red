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
window._renderFormula = _renderFormula;

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

  // Одна строка ввода
  if(!initLines.length) initLines.push('');
  initLines = [initLines[0]]; // только первая

  document.getElementById('formula-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'formula-modal';

  // ── Структуры с вариантами (как в Word) ──────────────────────────
  const _STRUCTS = [
    { title:'Дробь', icon:'\\frac{x}{y}', variants:[
      { label:'Простая дробь',        latex:'\\frac{#0}{#1}' },
      { label:'Наклонная дробь',      latex:'{#0}/{#1}' },
    ]},
    { title:'Индекс', icon:'e^{x}', variants:[
      { label:'Верхний индекс',       latex:'#0^{#1}' },
      { label:'Нижний индекс',        latex:'#0_{#1}' },
      { label:'Верхний и нижний',     latex:'#0_{#1}^{#2}' },
      { label:'Верхний левый',        latex:'{}^{#1}#0' },
    ]},
    { title:'Корень', icon:'\\sqrt[n]{x}', variants:[
      { label:'Квадратный корень',    latex:'\\sqrt{#0}' },
      { label:'Корень n-й степени',   latex:'\\sqrt[#1]{#0}' },
      { label:'Кубический корень',    latex:'\\sqrt[3]{#0}' },
    ]},
    { title:'Интеграл', icon:'\\int_{a}^{b}', variants:[
      { label:'Интеграл',             latex:'\\int #0' },
      { label:'Интеграл с пределами', latex:'\\int_{#1}^{#2} #0' },
      { label:'Двойной интеграл',     latex:'\\iint #0' },
      { label:'Тройной интеграл',     latex:'\\iiint #0' },
      { label:'Контурный интеграл',   latex:'\\oint #0' },
    ]},
    { title:'Сумма', icon:'\\sum_{i=0}^{n}', variants:[
      { label:'Сумма',                latex:'\\sum #0' },
      { label:'Сумма с пределами',    latex:'\\sum_{#1}^{#2} #0' },
      { label:'Произведение',         latex:'\\prod_{#1}^{#2} #0' },
      { label:'Объединение',          latex:'\\bigcup_{#1}^{#2} #0' },
      { label:'Пересечение',          latex:'\\bigcap_{#1}^{#2} #0' },
    ]},
    { title:'Скобка', icon:'\\left(x\\right)', variants:[
      { label:'Круглые скобки',       latex:'\\left( #0 \\right)' },
      { label:'Квадратные скобки',    latex:'\\left[ #0 \\right]' },
      { label:'Фигурные скобки',      latex:'\\left\\{ #0 \\right\\}' },
      { label:'Угловые скобки',       latex:'\\langle #0 \\rangle' },
      { label:'Модуль',               latex:'\\left| #0 \\right|' },
      { label:'Норма',                latex:'\\left\\| #0 \\right\\|' },
      { label:'Скобка снизу',         latex:'\\underbrace{#0}_{#1}' },
      { label:'Скобка сверху',        latex:'\\overbrace{#0}^{#1}' },
    ]},
    { title:'Функция', icon:'\\sin\\theta', variants:[
      { label:'sin',   latex:'\\sin #0' },
      { label:'cos',   latex:'\\cos #0' },
      { label:'tan',   latex:'\\tan #0' },
      { label:'log',   latex:'\\log_{#1} #0' },
      { label:'ln',    latex:'\\ln #0' },
      { label:'exp',   latex:'\\exp #0' },
      { label:'lim',   latex:'\\lim_{#1 \\to #2} #0' },
      { label:'max',   latex:'\\max_{#1} #0' },
      { label:'min',   latex:'\\min_{#1} #0' },
    ]},
    { title:'Диакрит.', icon:'\\dot{a}', variants:[
      { label:'Точка над',     latex:'\\dot{#0}' },
      { label:'Две точки',     latex:'\\ddot{#0}' },
      { label:'Шляпка',        latex:'\\hat{#0}' },
      { label:'Тильда',        latex:'\\tilde{#0}' },
      { label:'Черта над',     latex:'\\overline{#0}' },
      { label:'Вектор',        latex:'\\vec{#0}' },
      { label:'Черта под',     latex:'\\underline{#0}' },
      { label:'Стрелка над',   latex:'\\overrightarrow{#0}' },
    ]},
    { title:'Предел', icon:'\\lim_{n\\to\\infty}', variants:[
      { label:'Предел',               latex:'\\lim_{#0} #1' },
      { label:'Предел справа',        latex:'\\lim_{#0 \\to #1^+} #2' },
      { label:'Предел слева',         latex:'\\lim_{#0 \\to #1^-} #2' },
      { label:'max/min',              latex:'\\max_{#0} #1' },
    ]},
    { title:'Оператор', icon:'\\nabla', variants:[
      { label:'Набла',         latex:'\\nabla #0' },
      { label:'Лапласиан',     latex:'\\nabla^2 #0' },
      { label:'Частная пр.',   latex:'\\frac{\\partial #0}{\\partial #1}' },
      { label:'Вторая частн.', latex:'\\frac{\\partial^2 #0}{\\partial #1^2}' },
      { label:'Производная',   latex:'\\frac{d #0}{d #1}' },
    ]},
    { title:'Матрица', icon:'\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}', variants:[
      { label:'Матрица 2×2',   latex:'\\begin{pmatrix} #0 & #1 \\\\ #2 & #3 \\end{pmatrix}' },
      { label:'Матрица 3×3',   latex:'\\begin{pmatrix} #0 & #1 & #2 \\\\ #3 & #4 & #5 \\\\ #6 & #7 & #8 \\end{pmatrix}' },
      { label:'Детерминант',   latex:'\\begin{vmatrix} #0 & #1 \\\\ #2 & #3 \\end{vmatrix}' },
      { label:'Система ур-й',  latex:'\\begin{cases} #0 \\\\ #1 \\end{cases}' },
      { label:'Столбец',       latex:'\\begin{pmatrix} #0 \\\\ #1 \\end{pmatrix}' },
    ]},
  ];

  // ── Символы (плоский список, одна строка с прокруткой) ───────────
  const _GROUPS = [
    { name: 'Греческие', syms: [
      ['α','\\alpha','α'],['β','\\beta','β'],['γ','\\gamma','γ'],['δ','\\delta','δ'],
      ['θ','\\theta','θ'],['λ','\\lambda','λ'],['μ','\\mu','μ'],['σ','\\sigma','σ'],
      ['φ','\\phi','φ'],['ω','\\omega','ω'],['π','\\pi','π'],['ε','\\varepsilon','ε'],
      ['Σ','\\Sigma','Σ'],['Π','\\Pi','Π'],['Δ','\\Delta','Δ'],['Ω','\\Omega','Ω'],
      ['Γ','\\Gamma','Γ'],['Λ','\\Lambda','Λ'],['Θ','\\Theta','Θ'],
    ]},
    { name: 'Операции', syms: [
      ['±','\\pm','±'],['×','\\times','×'],['÷','\\div','÷'],['·','\\cdot','·'],
      ['∂','\\partial','∂'],['∇','\\nabla','∇'],['∞','\\infty','∞'],['∝','\\propto','∝'],
      ['∫','\\int','∫'],['∬','\\iint','∬'],['∮','\\oint','∮'],['∑','\\sum','∑'],['∏','\\prod','∏'],
    ]},
    { name: 'Отношения', syms: [
      ['=','=','='],['≠','\\neq','≠'],['<','<','<'],['>','>','>'],
      ['≤','\\leq','≤'],['≥','\\geq','≥'],['≈','\\approx','≈'],['≡','\\equiv','≡'],
      ['∈','\\in','∈'],['∉','\\notin','∉'],['⊂','\\subset','⊂'],['⊆','\\subseteq','⊆'],
      ['∪','\\cup','∪'],['∩','\\cap','∩'],['∅','\\emptyset','∅'],
      ['→','\\to','→'],['⟹','\\Rightarrow','⟹'],['⟺','\\Leftrightarrow','⟺'],
    ]},
    { name: 'Прочее', syms: [
      ['ℝ','\\mathbb{R}','ℝ'],['ℤ','\\mathbb{Z}','ℤ'],['ℕ','\\mathbb{N}','ℕ'],['ℂ','\\mathbb{C}','ℂ'],
      ['∀','\\forall','∀'],['∃','\\exists','∃'],['¬','\\neg','¬'],
      ['∧','\\land','∧'],['∨','\\lor','∨'],['⊕','\\oplus','⊕'],
      ['…','\\ldots','…'],['⋯','\\cdots','⋯'],['∴','\\therefore','∴'],['|','|','|'],['&','\\&','амперсанд'],
      ['sin','\\sin ','sin'],['cos','\\cos ','cos'],['tan','\\tan ','tan'],
      ['ln','\\ln ','ln'],['log','\\log ','log'],['lim','\\lim ','lim'],
    ]},
  ];
  const _SYMS = _GROUPS.flatMap(g => g.syms);

  // Line colors (accent colors from theme, or fallback palette)
  const _lineColors = (_theme && _theme.colors)
    ? _theme.colors.slice(0,7)
    : ['#818cf8','#34d399','#f472b6','#fbbf24','#67e8f9','#fb923c','#a78bfa'];

  // Добавляем CSS для MathLive тёмной темы (один раз)
  if(!document.getElementById('mathlive-theme-css')){
    const mlcss = document.createElement('style');
    mlcss.id = 'mathlive-theme-css';
    mlcss.textContent = `
      math-field {
        --hue: 240;
        --caret-color: #a78bfa;
        --selection-background-color: rgba(139,92,246,.35);
        color: var(--text, var(--text1, #111));
        --primary-color: #6366f1;
        background: transparent;
        color: #e2e8f0;
        border: none;
        outline: none;
        padding: 4px;
        min-height: 54px;
        width: 100%;
        font-size: 24px;
        cursor: text;
      }
      math-field:focus { outline: none; }
      math-field .ML__latex { color: #e2e8f0; }
      math-field .ML__text { color: #e2e8f0; }
    `;
    document.head.appendChild(mlcss);
  }

  modal.className = 'modal-ov open';

  // Скрываем тулбар и клавиатуру MathLive
  if(!document.getElementById('mf-hide-style')){
    const mfStyle = document.createElement('style');
    mfStyle.id = 'mf-hide-style';
    mfStyle.textContent = `
      math-field::part(toolbar) { display:none!important; }
      math-field::part(virtual-keyboard-toggle) { display:none!important; }
      .ML__keyboard { display:none!important; }
      .ML__popover { z-index:99999; }
      math-field { outline:none; border:none; background:transparent; }
      math-field::part(container) { padding:8px 0; }
      .fm-struct:focus, .fm-struct:focus-visible, .fm-struct:active {
        outline: none !important;
        background: var(--surface3) !important;
        border-color: var(--border2) !important;
        color: var(--text) !important;
      }
    `;
    document.head.appendChild(mfStyle);
  }

  modal.innerHTML = `
  <div class="modal" style="max-width:920px;width:96%;">
    <h3>∑ Редактор формулы</h3>

    <!-- Структуры с dropdown вариантами -->
    <div style="margin-bottom:8px;position:relative;">
      <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;">Структуры</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${_STRUCTS.map((s,si)=>`<button class="fm-struct" data-si="${si}"
          title="${s.title}"
          style="background:var(--surface3);border:1px solid var(--border2);border-radius:6px;padding:5px 10px 4px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;transition:border-color .15s,background .15s;color:var(--text);">
          <span class="fm-struct-preview" data-latex="${s.icon}" style="min-height:26px;display:flex;align-items:center;justify-content:center;width:100%;color:var(--text);"></span>
          <span style="display:flex;align-items:center;gap:2px;font-size:9px;color:var(--text);font-weight:500;white-space:nowrap;">${s.title}<svg width="7" height="5" viewBox="0 0 7 5" fill="currentColor" style="opacity:.5"><path d="M0 0l3.5 5L7 0z"/></svg></span>
        </button>`).join('')}
      </div>
      <!-- Dropdown panel -->
      <div id="fm-struct-dropdown" style="display:none;position:fixed;z-index:10000;background:var(--surface2);border:1px solid var(--accent,#6366f1);border-radius:10px;padding:12px;box-shadow:0 12px 40px rgba(0,0,0,.4),0 0 0 1px rgba(99,102,241,.3);min-width:fit-content;max-width:500px;">
        <div id="fm-struct-dd-title" style="display:none"></div>
        <div id="fm-struct-dd-variants" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
      </div>
    </div>

    <!-- Символы (плоский список с прокруткой) -->
    <div style="margin-bottom:10px;">
      <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;">Символы</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;row-gap:6px;">
        ${(()=>{
          let html='', offset=0;
          _GROUPS.forEach((g,gi)=>{
            g.syms.forEach(([label,,title],si)=>{
              html+=`<button class="fm-sym" data-idx="${offset+si}"
                title="${g.name}: ${title}"
                style="background:var(--surface2);border:1px solid var(--border2);border-radius:4px;padding:3px 4px;font-size:13px;cursor:pointer;color:var(--text);text-align:center;transition:background .1s;"
                onmouseenter="this.style.background='var(--surface3)';this.style.borderColor='var(--accent)'"
                onmouseleave="this.style.background='var(--surface2)';this.style.borderColor='var(--border2)'"
              >${label}</button>`;
            });
            offset+=g.syms.length;
          });
          return html;
        })()}
      </div>
    </div>

    <!-- Lines editor -->
    <div id="fm-lines" style="margin-bottom:8px;"></div>


    <!-- Контейнер — MathLive поле создаётся программно после загрузки библиотеки -->
    <div id="fm-mathlive-wrap" style="border:2px solid var(--accent);border-radius:8px;background:var(--surface2);min-height:80px;padding:8px 12px;cursor:text;position:relative;">
      <div id="fm-mf-placeholder" style="display:flex;align-items:center;justify-content:center;min-height:64px;color:var(--text3);font-size:12px;gap:8px">
        <span style="animation:ai-spin 1s linear infinite;display:inline-block">⟳</span> Загрузка редактора формул...
      </div>
    </div>

    <!-- MathJax предпросмотр — скрыт, используется только для _lastSvg -->
    <div id="fm-preview" style="display:none;"></div>
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
    row.style.cssText = 'width:100%;';
    row.innerHTML = `
      <textarea class="fm-line-ta" rows="2" data-idx="${idx}"
        style="flex:1;font-family:var(--font-mono);font-size:13px;background:var(--surface2);color:var(--text);
               border:1px solid var(--border2);border-radius:6px;padding:8px;resize:vertical;line-height:1.6;outline:none;width:100%;box-sizing:border-box;"></textarea>
    `;
    row.querySelector('.fm-line-ta').value = value || '';
    linesContainer.appendChild(row);

    row.querySelector('.fm-line-ta').addEventListener('focus', ()=>{
      _activeLineIdx = idx;
      // Синхронизируем MathLive с выбранной строкой
      if(_mf && customElements.get('math-field')){
        try{ _mf.setValue(row.querySelector('.fm-line-ta').value||'',{suppressChangeNotifications:true}); }catch(e){}
      }
    });
    row.querySelector('.fm-line-ta').addEventListener('input', ()=>{
      _syncVisualEditor();
      clearTimeout(_renderTimeout); _renderTimeout = setTimeout(doPreview, 600);
    });

  }

  function _rebuildLineIndices(){
    linesContainer.querySelectorAll('.fm-line-row').forEach((row, i)=>{
      const ta = row.querySelector('.fm-line-ta');
      if(ta) ta.dataset.idx = i;
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
        if(svgEl){
          svgEl.style.maxHeight='140px'; svgEl.style.width='auto'; svgEl.style.height='auto';
        }
        // Цвет из initColor или из CSS переменной темы (автоматически светлая/тёмная)
        // В модалке цвет превью = цвет текста темы (не цвет формулы на слайде)
        preview.style.color = 'var(--text)';

      }
    });
  }

  // Build initial rows
  initLines.forEach((v, i) => _addLineRow(v, i));


  // Add line button


  // ── Структуры: рендер превью + dropdown вариантов ───────────────
  let _activeStructBtn = null;
  const _dd = document.getElementById('fm-struct-dropdown');
  const _ddTitle = document.getElementById('fm-struct-dd-title');
  const _ddVariants = document.getElementById('fm-struct-dd-variants');

  function _closeDropdown(){
    if(_dd) _dd.style.display = 'none';
    if(_activeStructBtn){
      _activeStructBtn.style.background = 'var(--surface3)';
      _activeStructBtn.style.borderColor = 'var(--border2)';
      _activeStructBtn = null;
    }
  }

  function _insertStructLatex(latex){
    const mf = document.getElementById('fm-mf');
    if(mf && customElements.get('math-field')){
      mf.focus();
      // #0,#1,... → #? — MathLive использует # как маркер placeholder
      // selectionMode:'placeholder' автоматически переходит к следующему #?
      const ins = latex.replace(/#\d/g,'#?');
      try{ mf.insert(ins, {insertionMode:'replaceSelection', selectionMode:'placeholder'}); }
      catch(e){
        // Fallback: вставляем с \placeholder{}
        const ins2 = latex.replace(/#\d/g,'\\placeholder{}');
        try{ mf.insert(ins2, {insertionMode:'replaceSelection', selectionMode:'placeholder'}); }
        catch(e2){}
      }
      const newLatex = mf.getValue('latex');
      const tas = linesContainer.querySelectorAll('.fm-line-ta');
      const ta = tas[_activeLineIdx] || tas[0];
      if(ta){ ta.value = newLatex; }
      clearTimeout(_renderTimeout); _renderTimeout = setTimeout(doPreview, 300);
    }
    _closeDropdown();
  }

  function _openStructDropdown(btn, st){
    _closeDropdown();
    _activeStructBtn = btn;
    btn.style.background = 'var(--surface3)';
    btn.style.borderColor = 'var(--accent)';

    _ddTitle.textContent = st.title;
    _ddVariants.innerHTML = '';

    st.variants.forEach(v => {
      const vBtn = document.createElement('button');
      vBtn.style.cssText = 'background:var(--surface3);border:1px solid var(--border2);border-radius:6px;padding:8px 6px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;min-width:68px;max-width:84px;transition:border-color .12s,background .12s;color:var(--text);';
      vBtn.title = v.label;

      // Превью формулы
      const prev = document.createElement('div');
      prev.style.cssText = 'min-height:36px;display:flex;align-items:center;justify-content:center;width:100%;';
      prev.textContent = '…';

      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:8px;color:var(--text2);text-align:center;line-height:1.3;word-break:break-word;max-width:72px;';
      lbl.textContent = v.label;

      vBtn.appendChild(prev);
      vBtn.appendChild(lbl);

      // Рендерим превью
      // \placeholder{} — MathLive-специфичный символ пустого поля (серый квадрат)
      // Рендерим структуру с \square как заглушками
      const _cleanLatex = v.latex.replace(/#\d/g, '\\square');
      if(typeof _renderFormula === 'function'){
        _renderFormula(_cleanLatex, (svg, err)=>{
          if(svg && !err){
            // Заменяем glyphs 'square' на символ □ в SVG текстовых узлах
            const _tmp = document.createElement('div');
            _tmp.innerHTML = svg;
            _tmp.querySelectorAll('text').forEach(t=>{
              if(t.textContent.includes('square')) t.textContent='□';
            });
            const svgEl = _tmp.querySelector('svg');
            if(svgEl){
              svgEl.style.maxHeight='36px'; svgEl.style.width='auto'; svgEl.style.height='36px';
              svgEl.style.color='var(--text)';
              svgEl.querySelectorAll('[fill]').forEach(n=>{
                if(n.getAttribute('fill')!=='none') n.setAttribute('fill','currentColor');
              });
            }
            prev.innerHTML = _tmp.innerHTML;
          } else {
            prev.innerHTML='<span style="font-size:14px;opacity:.4">□</span>';
          }
        });
      }

      vBtn.addEventListener('mousedown', e => e.preventDefault());
      vBtn.addEventListener('click', ()=> _insertStructLatex(v.latex));
      vBtn.addEventListener('mouseenter', ()=>{ vBtn.style.background='var(--surface4)'; vBtn.style.borderColor='var(--accent)'; });
      vBtn.addEventListener('mouseleave', ()=>{ vBtn.style.background='var(--surface3)'; vBtn.style.borderColor='var(--border2)'; });

      _ddVariants.appendChild(vBtn);
    });

    // Dropdown — фиксированное позиционирование прямо под кнопкой
    _dd.style.position = 'fixed';
    _dd.style.display = 'block';
    const btnRect = btn.getBoundingClientRect();
    _dd.style.left = Math.min(btnRect.left, window.innerWidth - 320) + 'px';
    _dd.style.top  = (btnRect.bottom + 4) + 'px';
    _dd.style.bottom = 'auto';
  }

  modal.querySelectorAll('.fm-struct').forEach(btn => {
    btn.addEventListener('mousedown', e => e.preventDefault());

    // Рендерим иконку кнопки
    const si = +btn.dataset.si;
    const st = _STRUCTS[si];
    if(!st) return;
    const sp = btn.querySelector('.fm-struct-preview');
    if(sp && typeof _renderFormula === 'function'){
      _renderFormula(st.icon, (svg, err)=>{
        if(svg && !err){
          const fixedSvg = svg.replace(/>[\s]*square[\s]*</g,'>□<');
          sp.innerHTML = fixedSvg;
          const svgEl = sp.querySelector('svg');
          if(svgEl){
            svgEl.style.maxHeight='26px'; svgEl.style.width='auto'; svgEl.style.height='26px';
            svgEl.style.color='var(--text)';
            svgEl.querySelectorAll('[fill]').forEach(n=>{if(n.getAttribute('fill')!=='none')n.setAttribute('fill','currentColor');});
            svgEl.querySelectorAll('path,use,rect').forEach(n=>{if(!n.getAttribute('fill'))n.setAttribute('fill','currentColor');});
          }
        } else { sp.textContent = st.title; }
      });
    }

    btn.addEventListener('click', e=>{
      e.stopPropagation();
      if(_activeStructBtn === btn){ _closeDropdown(); return; }
      _openStructDropdown(btn, st);
    });
  });

  // Клик вне dropdown — закрываем
  modal.addEventListener('click', e=>{
    if(_dd && !_dd.contains(e.target) && !e.target.closest('.fm-struct')){
      _closeDropdown();
    }
  });

  // Symbol buttons — вставка по позиции курсора (или замена выделения)
  modal.querySelectorAll('.fm-sym').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
    });
    btn.addEventListener('click', () => {
      const ins = _SYMS[+btn.dataset.idx][1];
      const mf  = document.getElementById('fm-mf');

      // MathLive: вставляем через insert() — знает о курсоре и позиции
      if(_mf && customElements.get('math-field')){
        _mf.focus();
        try{ _mf.insert(ins, {insertionMode:'replaceSelection', selectionMode:'placeholder'}); }catch(e){}
        // Синхронизируем с textarea
        const latex = _mf.getValue('latex');
        const tas = linesContainer.querySelectorAll('.fm-line-ta');
        const ta  = tas[_activeLineIdx] || tas[0];
        if(ta){ ta.value = latex; }
        clearTimeout(_renderTimeout); _renderTimeout = setTimeout(doPreview, 400);
        return;
      }

      // Fallback: вставка в обычный textarea
      const tas = linesContainer.querySelectorAll('.fm-line-ta');
      const ta  = tas[_activeLineIdx] || tas[0];
      if(!ta) return;
      ta.focus();
      const start = ta.selectionStart, end = ta.selectionEnd;
      const before = ta.value.slice(0, start), after = ta.value.slice(end);
      ta.value = before + ins + after;
      const cur = ins.includes('{}') ? ins.indexOf('{}') + 1 : ins.length;
      ta.selectionStart = ta.selectionEnd = start + cur;
      ta.dispatchEvent(new Event('input'));
      clearTimeout(_renderTimeout); _renderTimeout = setTimeout(doPreview, 400);
    });
  });

  // ── MathLive WYSIWYG редактор ─────────────────────────────────
  let _mf = null; // создаётся программно после загрузки

  function _initMathLive(cb){
    if(customElements.get('math-field')){ cb(); return; }
    if(!document.getElementById('mathlive-local')){
      // Подключаем локальный CSS для шрифтов
      if(!document.getElementById('mathlive-fonts-css')){
        const lnk = document.createElement('link');
        lnk.id   = 'mathlive-fonts-css';
        lnk.rel  = 'stylesheet';
        lnk.href = 'libs/mathlive/mathlive-static.css';
        document.head.appendChild(lnk);
      }
      const s = document.createElement('script');
      s.id  = 'mathlive-local';
      s.src = 'libs/mathlive/mathlive.min.js';
      s.onerror = () => {
        // Локальный не найден — fallback CDN если онлайн
        if(navigator.onLine && !document.getElementById('mathlive-cdn')){
          const cdn = document.createElement('script');
          cdn.id  = 'mathlive-cdn';
          cdn.src = 'https://unpkg.com/mathlive/dist/mathlive.min.js';
          document.head.appendChild(cdn);
        }
      };
      document.head.appendChild(s);
    }
    let tries = 0;
    const check = setInterval(()=>{
      tries++;
      if(customElements.get('math-field')){ clearInterval(check); cb(); }
      else if(tries > 60){ clearInterval(check); cb(); }
    }, 100);
  }

  function _syncVisualEditor(){
    if(!_mf) return;
    const tas = linesContainer.querySelectorAll('.fm-line-ta');
    const ta  = tas[_activeLineIdx] || tas[0];
    if(!ta) return;
    // Обновляем MathLive только если не в фокусе
    if(document.activeElement !== _mf){
      try{ _mf.setValue(ta.value, {suppressChangeNotifications:true}); }catch(e){}
    }
  }

  _initMathLive(()=>{
    const wrap = document.getElementById('fm-mathlive-wrap');
    const placeholder = document.getElementById('fm-mf-placeholder');

    if(!customElements.get('math-field')){
      // MathLive не загрузился — показываем ошибку
      if(placeholder) placeholder.textContent = '⚠ Не удалось загрузить MathLive. Проверьте интернет.';
      return;
    }

    // Убираем placeholder, создаём math-field
    if(placeholder) placeholder.remove();
    _mf = document.createElement('math-field');
    _mf.id = 'fm-mf';
    // Цвет: берём из CSS переменной --text1 приложения
    const _appColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() ||
                      getComputedStyle(document.body).color || '#111111';
    _mf.style.cssText = 'width:100%;font-size:24px;min-height:54px;--primary-color:#6366f1;color:'+_appColor+';';
    if(wrap) wrap.appendChild(_mf);

    // Стилизуем через CSS vars
    try{
      Object.assign(_mf, {
        mathModeSpace: '\,',
        smartMode: false,
        virtualKeyboardMode: 'off',
        menuMode: 'none',
      });
      // Скрываем встроенный тулбар MathLive
      try{ _mf.removeEventListener('focus', _mf._focusHandler); }catch(e){}
      _mf.style.setProperty('--caret-color','#a78bfa');
      _mf.style.setProperty('--selection-background-color','rgba(139,92,246,.35)');
    }catch(e){}

    // Инициализируем первой строкой
    const tas0 = linesContainer.querySelectorAll('.fm-line-ta');
    if(tas0[0]) try{ _mf.setValue(tas0[0].value||''); }catch(e){}
    setTimeout(()=>{ try{ _mf.focus(); }catch(e){} }, 50);

    // MathLive → синхронизируем с textarea + перерендериваем
    _mf.addEventListener('input', ()=>{
      const latex = _mf.getValue('latex');
      const tas = linesContainer.querySelectorAll('.fm-line-ta');
      const ta  = tas[_activeLineIdx] || tas[0];
      if(ta){
        ta.value = latex;
        clearTimeout(_renderTimeout); _renderTimeout = setTimeout(doPreview, 400);
      }
    });

    // Ctrl+↑↓ переключение строк
    _mf.addEventListener('keydown', e=>{
      if(e.key==='ArrowUp' && e.ctrlKey){
        e.preventDefault();
        if(_activeLineIdx > 0){
          // Сохраняем текущую
          const tas = linesContainer.querySelectorAll('.fm-line-ta');
          if(tas[_activeLineIdx]) tas[_activeLineIdx].value = _mf.getValue('latex');
          _activeLineIdx--;
          const ta = tas[_activeLineIdx];
          if(ta) try{ _mf.setValue(ta.value||''); }catch(e){}
          _mf.focus();
        }
      } else if(e.key==='ArrowDown' && e.ctrlKey){
        e.preventDefault();
        const tas = linesContainer.querySelectorAll('.fm-line-ta');
        if(_activeLineIdx < tas.length-1){
          if(tas[_activeLineIdx]) tas[_activeLineIdx].value = _mf.getValue('latex');
          _activeLineIdx++;
          const ta = tas[_activeLineIdx];
          if(ta) try{ _mf.setValue(ta.value||''); }catch(e){}
          _mf.focus();
        }
      }
    });
  });

  document.getElementById('fm-cancel').onclick = ()=> modal.remove();
  modal.addEventListener('mousedown', e => { if(e.target === modal) modal.remove(); });

  document.getElementById('fm-ok').onclick = ()=> {
    // Синхронизируем MathLive → textarea перед сохранением
    if(_mf && customElements.get('math-field')){
      const latex = _mf.getValue('latex');
      const tas = linesContainer.querySelectorAll('.fm-line-ta');
      const ta  = tas[_activeLineIdx] || tas[0];
      if(ta && latex.trim()) ta.value = latex;
    }
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
