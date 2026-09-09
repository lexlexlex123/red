// ══════════════ ICON MODAL ══════════════
let selIconId = null;
let _iconSearchVal = '';
let _iconCurCat = 'all';
let _iconPage = 0;
let _iconPages = {}; // page per category
const ICON_PAGE_SIZE = 72; // 12×6 grid
const _ICON_NAV_KEY = 'sf_icon_nav';

function _loadIconNav(){
  try{
    const o=JSON.parse(localStorage.getItem(_ICON_NAV_KEY)||'{}');
    if(o.cat&&typeof o.cat==='string') _iconCurCat=o.cat;
    if(o.pages&&typeof o.pages==='object') _iconPages=o.pages;
    const saved=_iconPages[_iconCurCat];
    _iconPage=(saved!=null&&isFinite(+saved))?Math.max(0,+saved):0;
  }catch(e){}
}
function _saveIconNav(){
  try{
    if(!_iconSearchVal) _iconPages[_iconCurCat]=_iconPage;
    localStorage.setItem(_ICON_NAV_KEY, JSON.stringify({cat:_iconCurCat, pages:_iconPages}));
  }catch(e){}
}
_loadIconNav();

function _iconNum(ic){
  if(!ic) return 0;
  const n=+ic.id;
  return isFinite(n)&&n>0?n:0;
}

function _iconByNum(n){
  return typeof getIconById==='function'?getIconById(n):null;
}

/** Resolve icons for a category (ICON_CATS[].icons = id-номера). */
function _iconsForCat(catId){
  if(!catId||catId==='all') return ICONS.slice();
  const cat=ICON_CATS.find(c=>c.id===catId);
  if(!cat) return [];
  if(!cat.icons||!cat.icons.length) return [];
  return cat.icons.map(id=>_iconByNum(id)).filter(Boolean);
}

function openIconModal(){
  const ci=document.getElementById('ic-color');
  if(ci){
    const def=typeof _defaultIconColor==='function'?_defaultIconColor():null;
    ci.value=(def&&def.color)||'#6366f1';
  }
  document.getElementById('icon-modal').classList.add('open');
  // Keep last category + page; clear search so nav position is visible
  _iconSearchVal='';
  const si=document.getElementById('icon-search');
  if(si)si.value='';
  if(!ICON_CATS.some(c=>c.id===_iconCurCat)) _iconCurCat='all';
  const saved=_iconPages[_iconCurCat];
  _iconPage=(saved!=null&&isFinite(+saved))?Math.max(0,+saved):0;
  buildIconCatTabs();
  buildIconGrid(_iconCurCat);
}

function _iconCatPreviewColor(){
  try{
    const v=getComputedStyle(document.documentElement).getPropertyValue('--text2').trim();
    if(v) return v;
  }catch(e){}
  return document.documentElement.classList.contains('light')?'#64748b':'#9aa2b4';
}

function buildIconCatTabs(){
  const tabs=document.getElementById('icon-cat-tabs');
  if(!tabs)return;
  // Menu previews: fixed defaults, independent of modal fill/stroke/color
  const color=_iconCatPreviewColor();
  const sw=1.4;
  const fillOp=0.3;
  tabs.innerHTML='';
  ICON_CATS.forEach(c=>{
    const cell=document.createElement('button');
    cell.type='button';
    cell.className='icon-cat-cell'+(c.id===_iconCurCat?' active':'');
    cell.title=c.name||'';
    if(c.id==='all'){
      cell.innerHTML='<span class="icon-cat-label">Все</span>';
    }else{
      const ic=_iconsForCat(c.id)[0];
      if(ic) cell.innerHTML=_buildIconSVG(ic,color,sw,null,false,null,null,null,null,fillOp);
      else cell.innerHTML='<span class="icon-cat-label">?</span>';
    }
    cell.onclick=()=>{
      if(!_iconSearchVal) _iconPages[_iconCurCat]=_iconPage;
      _iconCurCat=c.id;
      const saved=_iconPages[c.id];
      _iconPage=(saved!=null&&isFinite(+saved))?Math.max(0,+saved):0;
      _iconSearchVal='';
      const si=document.getElementById('icon-search');
      if(si)si.value='';
      tabs.querySelectorAll('.icon-cat-cell').forEach(x=>x.classList.remove('active'));
      cell.classList.add('active');
      _saveIconNav();
      buildIconGrid(c.id);
    };
    tabs.appendChild(cell);
  });
}

function filterIcons(val){
  _iconSearchVal=String(val||'').trim();
  if(_iconSearchVal){
    _iconPage=0;
    buildIconGridFiltered(_iconSearchVal);
  }else{
    const saved=_iconPages[_iconCurCat];
    _iconPage=(saved!=null&&isFinite(+saved))?Math.max(0,+saved):0;
    buildIconGrid(_iconCurCat);
  }
}

function buildIconGridFiltered(q){
  const grid=document.getElementById('icon-grid');
  if(!grid)return;
  grid.innerHTML='';
  const raw=String(q||'').trim();
  let icons;
  // Число → значок по сквозному номеру
  if(/^\d+$/.test(raw)){
    const ic=_iconByNum(+raw);
    icons=ic?[ic]:[];
  }else{
    const ql=raw.toLowerCase();
    icons=ICONS.filter(ic=>
      (ic.name&&ic.name.toLowerCase().includes(ql))||
      (ic.id&&String(ic.id).toLowerCase().includes(ql))||
      (ic.alias&&ic.alias.toLowerCase().includes(ql))
    );
  }
  _renderIconCells(grid,icons);
  _updateIconPager(icons.length, false);
}

function buildIconGrid(catId){
  const grid=document.getElementById('icon-grid');
  if(!grid)return;
  grid.innerHTML='';
  const all=_iconsForCat(catId);
  const needPage=all.length>ICON_PAGE_SIZE;
  const totalPages=Math.max(1, Math.ceil(all.length/ICON_PAGE_SIZE));
  if(_iconPage>=totalPages) _iconPage=totalPages-1;
  if(_iconPage<0) _iconPage=0;
  _iconPages[catId||_iconCurCat]=_iconPage;
  _saveIconNav();
  const icons=needPage
    ? all.slice(_iconPage*ICON_PAGE_SIZE, (_iconPage+1)*ICON_PAGE_SIZE)
    : all;
  _renderIconCells(grid,icons);
  _updateIconPager(all.length, needPage, totalPages);
}

function _updateIconPager(total, showPager, totalPages){
  const info=document.getElementById('icon-count');
  const pager=document.getElementById('icon-pager');
  const prev=document.getElementById('icon-page-prev');
  const next=document.getElementById('icon-page-next');
  const lab=document.getElementById('icon-page-lab');
  if(info){
    if(showPager&&totalPages>1){
      const from=_iconPage*ICON_PAGE_SIZE+1;
      const to=Math.min(total, (_iconPage+1)*ICON_PAGE_SIZE);
      info.textContent=from+'–'+to+' / '+total;
    }else{
      info.textContent=total+' иконок';
    }
  }
  if(!pager) return;
  const on=!!(showPager&&totalPages>1);
  pager.hidden=!on;
  if(!on) return;
  if(lab) lab.textContent=(_iconPage+1)+' / '+totalPages;
  if(prev){
    prev.disabled=_iconPage<=0;
    prev.onclick=()=>{ if(_iconPage>0){ _iconPage--; buildIconGrid(_iconCurCat); } };
  }
  if(next){
    next.disabled=_iconPage>=totalPages-1;
    next.onclick=()=>{ if(_iconPage<totalPages-1){ _iconPage++; buildIconGrid(_iconCurCat); } };
  }
}

function _iconResolvedFillOp(fillOp, style){
  if(style==='stroke') return 0;
  if(style==='fill') return 1;
  if(fillOp!=null&&fillOp!==''){
    const n=+fillOp;
    if(isFinite(n)){
      if(n>1) return Math.max(0, Math.min(1, n/100));
      return Math.max(0, Math.min(1, n));
    }
  }
  if(style==='duotone') return 0.18;
  return 0;
}
window._iconResolvedFillOp=_iconResolvedFillOp;

function _iconPaintAttrs(color, sw, fillOp){
  const swN=sw!=null&&isFinite(+sw)?Math.max(0,+sw):1.8;
  const sj=swN<=0?`stroke="none" stroke-width="0"`:`stroke="${color}" stroke-width="${swN}" stroke-linecap="round" stroke-linejoin="round"`;
  if(fillOp<=0) return `fill="none" ${sj}`;
  if(fillOp>=1) return `fill="${color}" ${sj}`;
  return `fill="${color}" fill-opacity="${fillOp}" ${sj}`;
}

function _iconFillRule(d){
  return (d.match(/M/gi)||[]).length>1?'evenodd':'';
}

function _buildMixedIconEls(paths, color, sw, fillOp, olymp) {
  const strokeW = olymp ? Math.max((sw!=null&&isFinite(+sw)?+sw:1.8), 1.6) : (sw!=null&&isFinite(+sw)?Math.max(0,+sw):1.8);
  const duoOp = +fillOp || 0;
  const strokeJoin = strokeW<=0
    ? `stroke="none" stroke-width="0"`
    : `stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round"`;
  function fillAttrs(d){
    const fr=_iconFillRule(d)?` fill-rule="evenodd"`:'' ;
    // olymp = fill-only (no stroke), but fill opacity must still apply
    if(duoOp<=0) return `fill="none"${fr} stroke="none"`;
    if(duoOp>=1) return `fill="${color}"${fr} stroke="none"`;
    return `fill="${color}" fill-opacity="${duoOp}"${fr} stroke="none"`;
  }
  return paths.map(p => {
    if (p.startsWith('f:')) {
      const d=p.slice(2);
      return `<path d="${d}" ${fillAttrs(d)}/>`;
    }
    if (p.startsWith('s:')) {
      return `<path d="${p.slice(2)}" fill="none" ${strokeJoin}/>`;
    }
    return `<path d="${p}" fill="none" ${strokeJoin}/>`;
  }).join('');
}

function _iconIsOlymp(ic){
  return !!(ic&&(ic.olymp||ic.cat==='olymp'));
}

function _iconUsesMixedPaths(ic, paths) {
  if (ic.mixed || _iconIsOlymp(ic)) return true;
  return paths.some(p => /^(f:|s:)/.test(p));
}

const _iconAnimTimers = new WeakMap();

function _iconHasAnim(ic) {
  return !!(ic && ic.anim && ic.anim.frames && ic.anim.frames.length > 1);
}
function _iconAnimFramePath(ic, idx) {
  if (!ic || !ic.anim || !ic.anim.frames) return ic ? ic.p : '';
  const frames = ic.anim.frames;
  return frames[Math.max(0, Math.min(idx, frames.length - 1))];
}
function _iconStaticPath(ic, animOn) {
  if (!ic) return '';
  if (!_iconHasAnim(ic)) return ic.p || '';
  // Анимация выкл.: рисованный базовый значок (ic.p), не последний кадр цикла
  if (!animOn && ic.p) return ic.p;
  // Анимация вкл.: стартовый кадр цикла
  return ic.anim.frames[0];
}
function _iconAnimContainer(el) {
  return (el && el.querySelector('.ec')) || el;
}
function _iconAnimEnabled(d, el) {
  return !!(d && (d.iconAnim === true || d.iconAnim === 'true' || (el && el.dataset.iconAnim === 'true')));
}
function _rawIconViewBoxCorrupted(d, ic) {
  if (!d || !d.svgContent || !ic || !_iconIsRaw(ic)) return false;
  const icP = (ic.vb || '').trim().split(/[\s,]+/).map(Number);
  const m = d.svgContent.match(/viewBox="([^"]+)"/);
  if (!m || icP.length < 4) return false;
  const oldP = m[1].trim().split(/[\s,]+/).map(Number);
  return oldP.length >= 4 && icP[2] > 0 && oldP[2] > 0 && oldP[2] < icP[2] * 0.6;
}
window._rawIconViewBoxCorrupted = _rawIconViewBoxCorrupted;

function _stampIconFitViewBox(svgStr, d) {
  if (!svgStr || !d || !d.iconFitted || !d.svgContent) return svgStr;
  const ic = typeof getIconById === 'function' ? getIconById(d.iconId) : ICONS.find(x => x.id === d.iconId);
  if (ic && _rawIconViewBoxCorrupted(d, ic)) return svgStr;
  const m = d.svgContent.match(/viewBox="([^"]+)"/);
  if (!m) return svgStr;
  return svgStr.replace(/viewBox="[^"]*"/, 'viewBox="' + m[1] + '"');
}
function _applyIconSvgToEl(el, d, svgStr) {
  if (!el || !svgStr) return;
  svgStr = _stampIconFitViewBox(svgStr, d);
  const c = _iconAnimContainer(el);
  const uid = 'icon_' + (d && d.id ? d.id : ('u' + Math.random().toString(36).slice(2)));
  c.innerHTML = typeof _isolateSvgIds === 'function' ? _isolateSvgIds(svgStr, uid) : svgStr;
  const s = c.querySelector('svg');
  if (s) { s.style.width = '100%'; s.style.height = '100%'; }
}
function _stopIconAnim(el) {
  if (!el) return;
  const t = _iconAnimTimers.get(el);
  if (t) { clearInterval(t); _iconAnimTimers.delete(el); }
  delete el._iconAnimIdx;
}
function _stopAllIconAnims(root) {
  const scope = root || document.getElementById('canvas');
  if (!scope) return;
  scope.querySelectorAll('[data-type="icon"]').forEach(_stopIconAnim);
}
function _updateIconAnimFrame(el, d, frameIdx) {
  const ic = typeof getIconById === 'function' ? getIconById(d.iconId) : ICONS.find(x => x.id === d.iconId);
  if (!ic) return;
  const path = _iconAnimFramePath(ic, frameIdx);
  const svg = _buildIconSVG(ic, d.iconColor || '#3b82f6', d.iconSw != null ? d.iconSw : 1.8, d.iconStyle, d.shadow, d.shadowBlur, d.shadowColor, d.shadowSize, d.id, d.iconFillOp, path);
  _applyIconSvgToEl(el, d, svg);
}
function _syncIconAnim(el, d) {
  _stopIconAnim(el);
  if (!el || !d || d.type !== 'icon') return;
  const ic = typeof getIconById === 'function' ? getIconById(d.iconId) : ICONS.find(x => x.id === d.iconId);
  if (!_iconHasAnim(ic) || !_iconAnimEnabled(d, el)) return;
  const interval = ic.anim.interval || 500;
  let idx = 0;
  el._iconAnimIdx = 0;
  const timer = setInterval(() => {
    if (!el.isConnected) { _stopIconAnim(el); return; }
    idx = (idx + 1) % ic.anim.frames.length;
    el._iconAnimIdx = idx;
    _updateIconAnimFrame(el, d, idx);
  }, interval);
  _iconAnimTimers.set(el, timer);
}
function _syncAllIconAnims(root, slideIdx) {
  const scope = root || document.getElementById('canvas');
  if (!scope || typeof slides === 'undefined') return;
  const si = slideIdx != null ? slideIdx : (typeof cur !== 'undefined' ? cur : 0);
  const s = slides[si];
  if (!s) return;
  scope.querySelectorAll('[data-type="icon"]').forEach(el => {
    const d = s.els.find(e => e.id === el.dataset.id);
    if (d) _syncIconAnim(el, d);
  });
}
window._iconHasAnim = _iconHasAnim;
window._iconStaticPath = _iconStaticPath;
window._stampIconFitViewBox = _stampIconFitViewBox;
window._syncIconAnim = _syncIconAnim;
window._stopIconAnim = _stopIconAnim;
window._stopAllIconAnims = _stopAllIconAnims;
window._syncAllIconAnims = _syncAllIconAnims;

/** Полноцветный SVG-значок (герб и т.п.): оригинальные fill, без перекраски темы. */
function _iconIsRaw(ic){
  return !!(ic && (ic.raw || (ic.svg && String(ic.svg).indexOf('<svg') >= 0)));
}
/** Scale factor from path-local units → viewBox (Inkscape crest: scale(0.1)*1.333…). */
function _rawIconStrokeScale(ic){
  const s = ic && ic.strokeScale != null ? +ic.strokeScale : NaN;
  return isFinite(s) && s > 0 ? s : 7.5;
}
/** Recolor raw SVG: заливка силуэта; все линии (в т.ч. контуры сложной заливки) — одна толщина. */
function _paintRawIconInner(inner, color, sw, fillOp, strokeScale){
  const duoOp = fillOp;
  const swN = sw != null && isFinite(+sw) ? Math.max(0, +sw) : 1.8;
  const scale = strokeScale > 0 ? strokeScale : 7.5;
  const pathSw = swN * scale;
  const strokeCap = 'stroke-linecap="round" stroke-linejoin="round"';
  // Единая толщина всех штрихов (база 0.12 × sw × strokeScale)
  const uniformLineW = swN <= 0 ? 0 : +(0.12 * swN * scale).toFixed(4);
  const strokePaint = swN <= 0
    ? 'fill="none" stroke="none"'
    : `fill="none" stroke="${color}" stroke-width="${uniformLineW}" ${strokeCap}`;
  let s = String(inner || '');
  s = s.replace(/\sstyle="[^"]*"/gi, '');
  const hasLineLayers = /stroke-width="/i.test(s);
  if(!hasLineLayers){
    let paint;
    if(duoOp <= 0){
      paint = swN <= 0
        ? 'fill="none" stroke="none"'
        : `fill="none" stroke="${color}" stroke-width="${pathSw}" ${strokeCap}`;
    } else if(duoOp >= 1){
      paint = `fill="${color}" stroke="none"`;
    } else {
      paint = swN <= 0
        ? `fill="${color}" fill-opacity="${duoOp}" stroke="none"`
        : `fill="${color}" fill-opacity="${duoOp}" stroke="${color}" stroke-width="${pathSw}" ${strokeCap}`;
    }
    s = s.replace(/\sfill="[^"]*"/gi, '');
    s = s.replace(/\sfill-opacity="[^"]*"/gi, '');
    s = s.replace(/\sstroke="[^"]*"/gi, '');
    s = s.replace(/\sstroke-width="[^"]*"/gi, '');
    s = s.replace(/\sstroke-linecap="[^"]*"/gi, '');
    s = s.replace(/\sstroke-linejoin="[^"]*"/gi, '');
    s = s.replace(/<(path|polygon|polyline|circle|ellipse|rect|line)\b/gi, (_, name) => `<${name} ${paint}`);
    return s;
  }
  // Non-greedy attrs + optional /> — иначе `/` уходит в attrs и ломает stroke-path'ы
  return s.replace(/<(path|polygon|polyline|circle|ellipse|rect|line)\b([^>]*?)\s*(\/?)\s*>/gi, (_, name, attrs, selfClose) => {
    const get = (key) => {
      const m = attrs.match(new RegExp('\\s' + key + '="([^"]*)"', 'i'));
      return m ? m[1] : null;
    };
    const fill = get('fill');
    const stroke = get('stroke');
    const swAttr = get('stroke-width');
    const dAttr = get('d') || '';
    const origSw = swAttr != null ? parseFloat(String(swAttr).replace(/px$/i, '')) : NaN;
    const hasOrigSw = isFinite(origSw) && origSw > 0;
    const hasStroke = !!(stroke && stroke !== 'none') || hasOrigSw;
    const hasFill = !!(fill && fill !== 'none');
    // Сложная заливка (много контуров) даёт «светлые» края, которые не слушали ползунок —
    // рисуем их той же обводкой, что и обычные линии.
    const subpaths = (dAttr.match(/[Mm]/g) || []).length;
    const complexFill = hasFill && !hasOrigSw && subpaths > 2;
    let a = attrs
      .replace(/\sfill="[^"]*"/gi, '')
      .replace(/\sfill-opacity="[^"]*"/gi, '')
      .replace(/\sstroke="[^"]*"/gi, '')
      .replace(/\sstroke-width="[^"]*"/gi, '')
      .replace(/\sstroke-linecap="[^"]*"/gi, '')
      .replace(/\sstroke-linejoin="[^"]*"/gi, '')
      .replace(/\sstroke-miterlimit="[^"]*"/gi, '');
    let paint;
    if(hasStroke && hasOrigSw){
      paint = strokePaint;
    } else if(complexFill){
      // Только контуры одной толщины (без полупрозрачной заливки-«призрака»)
      paint = strokePaint;
    } else if(hasFill){
      if(duoOp <= 0){
        paint = strokePaint;
      } else if(duoOp >= 1){
        paint = `fill="${color}" stroke="none"`;
      } else {
        paint = `fill="${color}" fill-opacity="${duoOp}" stroke="none"`;
      }
    } else {
      paint = 'fill="none" stroke="none"';
    }
    return `<${name}${a} ${paint}${selfClose ? '/>' : '>'}`;
  });
}
function _buildRawIconSVG(ic, shadow, shadowBlur, shadowColor, shadowSize, filterUid, color, sw, style, fillOp){
  if(!ic || !ic.svg) return '';
  let raw = String(ic.svg).trim();
  if(!raw) return '';
  const vb = ic.vb || '0 0 191.69 190.34';
  const duoOp = _iconResolvedFillOp(fillOp, style);
  const col = color || '#100f0d';
  let filterDef = '', filterAttr = '';
  if(shadow){
    const sb = shadowBlur != null ? +shadowBlur : 4;
    const ss = shadowSize != null ? +shadowSize : 0;
    const sc = shadowColor || '#000000';
    const uid = filterUid || ('isf_' + ic.id);
    const effBlur = sb > 0 && typeof window._shadowEffectiveBlur === 'function'
      ? window._shadowEffectiveBlur(ss, sb) : sb;
    const inner = typeof window._shadowFilterInner === 'function'
      ? window._shadowFilterInner(ss, sb, sc)
      : `<feDropShadow dx="0" dy="0" stdDeviation="${effBlur}" flood-color="${sc}" flood-opacity="0.65"/>`;
    const pPct = Math.min(120, Math.max(55, Math.ceil((ss + effBlur * 4 + 8) / 12 * 50)));
    filterDef = `<defs><filter id="${uid}" x="-${pPct}%" y="-${pPct}%" width="${100 + pPct * 2}%" height="${100 + pPct * 2}%">${inner}</filter></defs>`;
    filterAttr = `filter="url(#${uid})"`;
  }
  const m = raw.match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/i);
  let attrs, inner;
  if(m){
    attrs = m[1]
      .replace(/\sstyle="[^"]*"/i, '')
      .replace(/\sfilter="[^"]*"/i, '')
      .replace(/\swidth="[^"]*"/i, '')
      .replace(/\sheight="[^"]*"/i, '');
    inner = m[2];
    if(!/viewBox=/i.test(attrs)) attrs += ` viewBox="${vb}"`;
    if(!/xmlns=/i.test(attrs)) attrs += ' xmlns="http://www.w3.org/2000/svg"';
  } else {
    attrs = ` xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"`;
    inner = raw;
  }
  inner = _paintRawIconInner(inner, col, sw, duoOp, _rawIconStrokeScale(ic));
  return `<svg${attrs} ${filterAttr} style="width:100%;height:100%;overflow:visible">${filterDef}${inner}</svg>`;
}
window._buildRawIconSVG = _buildRawIconSVG;
window._iconIsRaw = _iconIsRaw;

function _buildIconSVG(ic, color, sw, style, shadow, shadowBlur, shadowColor, shadowSize, filterUid, fillOp, pathOverride){
  if(_iconIsRaw(ic)) return _buildRawIconSVG(ic, shadow, shadowBlur, shadowColor, shadowSize, filterUid, color, sw, style, fillOp);
  const paths=(pathOverride!=null?pathOverride:(ic.p||'')).split('||').map(p=>p.trim()).filter(Boolean);
  const vb=ic.vb||'0 0 24 24';
  const duoOp=_iconResolvedFillOp(fillOp, style);
  let pathEls, attrs;
  if (_iconUsesMixedPaths(ic, paths)) {
    pathEls = _buildMixedIconEls(paths, color, sw, duoOp, _iconIsOlymp(ic));
    attrs = 'fill="none"';
  } else {
    pathEls = paths.map(p => `<path d="${p}"/>`).join('');
    attrs = _iconPaintAttrs(color, sw, duoOp);
  }
  let filterDef='', filterAttr='';
  if(shadow){
    const sb=shadowBlur!=null?+shadowBlur:4;
    const ss=shadowSize!=null?+shadowSize:0;
    const sc=shadowColor||'#000000';
    const uid=filterUid||('isf_'+ic.id);
    const effBlur = sb > 0 && typeof window._shadowEffectiveBlur === 'function'
      ? window._shadowEffectiveBlur(ss, sb) : sb;
    const inner=typeof window._shadowFilterInner==='function'
      ?window._shadowFilterInner(ss,sb,sc)
      :`<feDropShadow dx="0" dy="0" stdDeviation="${effBlur}" flood-color="${sc}" flood-opacity="0.65"/>`;
    const pPct=Math.min(120,Math.max(55,Math.ceil((ss+effBlur*4+8)/12*50)));
    filterDef=`<defs><filter id="${uid}" x="-${pPct}%" y="-${pPct}%" width="${100+pPct*2}%" height="${100+pPct*2}%">${inner}</filter></defs>`;
    filterAttr=`filter="url(#${uid})"`;
  }
  const ovFlow='visible';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${attrs} ${filterAttr} style="width:100%;height:100%;overflow:${ovFlow}">${filterDef}<g>${pathEls}</g></svg>`;
}

function _renderIconCells(grid,icons){
  // Stop any leftover hover preview timers from a previous grid render
  if(grid&&grid._iconHoverTimers){
    grid._iconHoverTimers.forEach(t=>clearInterval(t));
    grid._iconHoverTimers=[];
  }else if(grid){
    grid._iconHoverTimers=[];
  }
  const color=document.getElementById('ic-color')?.value||(typeof _defaultIconColor==='function'&&_defaultIconColor().color)||'#6366f1';
  const sw=parseFloat(document.getElementById('ic-sw')?.value)||1.4;
  const fillOp=_iconResolvedFillOp(document.getElementById('ic-fill-op')?.value);
  icons.forEach(ic=>{
    const num=_iconNum(ic);
    const cell=document.createElement('div');
    cell.className='icon-cell'+(ic.id===selIconId?' selected':'');
    cell.title=(num?num+'. ':'')+(ic.name||ic.id||'');
    const hasAnim=_iconHasAnim(ic);
    const staticPath=hasAnim?_iconStaticPath(ic,false):null;
    const paint=(pathOv)=>_buildIconSVG(ic, color, sw, null, false, null, null, null, null, fillOp, pathOv);
    cell.innerHTML=paint(staticPath);
    if(hasAnim){
      cell.onmouseenter=()=>{
        if(cell._hoverTimer){clearInterval(cell._hoverTimer);cell._hoverTimer=null;}
        let idx=0;
        cell.innerHTML=paint(ic.anim.frames[0]);
        cell._hoverTimer=setInterval(()=>{
          idx=(idx+1)%ic.anim.frames.length;
          cell.innerHTML=paint(ic.anim.frames[idx]);
        }, ic.anim.interval||500);
        if(grid._iconHoverTimers) grid._iconHoverTimers.push(cell._hoverTimer);
      };
      cell.onmouseleave=()=>{
        if(cell._hoverTimer){
          clearInterval(cell._hoverTimer);
          if(grid._iconHoverTimers){
            const i=grid._iconHoverTimers.indexOf(cell._hoverTimer);
            if(i>=0) grid._iconHoverTimers.splice(i,1);
          }
          cell._hoverTimer=null;
        }
        cell.innerHTML=paint(staticPath);
      };
    }
    cell.onclick=()=>{
      selIconId=ic.id;
      grid.querySelectorAll('.icon-cell').forEach(x=>x.classList.remove('selected'));
      cell.classList.add('selected');
      const nm=document.getElementById('icon-sel-name');
      if(nm)nm.textContent=(num?num+' · ':'')+(ic.name||'');
      // For the bullet-marker picker, one click is the whole interaction —
      // there's no style/color step to configure first, so apply right away
      // instead of waiting for a separate "Вставить" click.
      if (typeof window._listIconInsertCallback === 'function') {
        insertIconSelected();
      }
    };
    cell.ondblclick=()=>{selIconId=ic.id; insertIconSelected();};
    grid.appendChild(cell);
  });
  if(!icons.length){
    const msg=document.createElement('div');
    msg.style.cssText='grid-column:1/-1;text-align:center;padding:20px;color:var(--text3);font-size:12px';
    msg.textContent='Ничего не найдено';
    grid.appendChild(msg);
  }
}

function refreshIconGrid(){
  if(_iconSearchVal) buildIconGridFiltered(_iconSearchVal);
  else buildIconGrid(_iconCurCat);
}

function insertIconSelected(){
  if(!selIconId)return (typeof toast==="function")&&toast('Выберите иконку');
  const ic=typeof getIconById==='function'?getIconById(selIconId):ICONS.find(x=>x.id===selIconId);
  if(!ic)return;
  // If opened from bullet list picker — use callback instead of inserting as element
  if(typeof window._listIconInsertCallback==='function'){
    window._listIconInsertCallback(ic);
    window._listIconInsertCallback=null;
    document.getElementById('icon-modal').classList.remove('open');
    return;
  }
  const def=typeof _defaultIconColor==='function'?_defaultIconColor():{color:'#6366f1',schemeRef:{col:0,row:2}};
  const color=document.getElementById('ic-color').value||def.color;
  const sw=parseFloat(document.getElementById('ic-sw').value)||1.4;
  const fillOp=_iconResolvedFillOp(document.getElementById('ic-fill-op')&&document.getElementById('ic-fill-op').value);
  // Replace mode: update existing selected icon element
  if(window._iconReplaceMode && sel && sel.dataset.type==='icon'){
    window._iconReplaceMode=false;
    if(typeof pushUndo==="function")pushUndo();
    const d=slides[cur].els.find(function(e){return e.id===sel.dataset.id;});
    if(d){
      d.iconId=ic.id; d.iconPath=ic.p;
      d.iconFillOp=fillOp;
      d.type='icon';
      if(_iconHasAnim(ic)){ d.iconAnim=true; sel.dataset.iconAnim='true'; }
      else { delete d.iconAnim; delete sel.dataset.iconAnim; }
      sel.dataset.iconId=ic.id;
      sel.dataset.iconFillOp=fillOp;
      if(typeof _rebuildIconElement==='function') _rebuildIconElement(sel,d);
      else {
        d.svgContent=_buildIconSVG(ic,d.iconColor||color,d.iconSw||sw,null,d.shadow,d.shadowBlur,d.shadowColor,d.shadowSize,d.id,fillOp);
        sel.dataset.iconId=ic.id;
        const c=sel.querySelector('.ec');
        if(c){c.innerHTML=d.svgContent;var s=c.querySelector('svg');if(s){s.style.width='100%';s.style.height='100%';}}
      }
      if(typeof syncIconProps==='function') syncIconProps(sel,d);
      save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();
    }
    document.getElementById('icon-modal').classList.remove('open');
    return;
  }
  const sz=snapV(180);
  const _animOn=_iconHasAnim(ic);
  const _pathOv=_animOn?_iconStaticPath(ic,true):null;
  const svgContent=_buildIconSVG(ic, color, sw, null, false, null, null, null, null, fillOp, _pathOv);
  if(typeof pushUndo==="function")pushUndo();
  const _ig0=typeof _insertGeom==='function'?_insertGeom(sz,sz):{x:snapV(200),y:snapV(150),w:sz,h:sz};
  const d={
    id:'e'+(++ec), type:'icon',
    x:_ig0.x, y:_ig0.y, w:_ig0.w, h:_ig0.h,
    iconId:ic.id, iconPath:ic.p||'', iconColor:color, iconSw:sw, iconFillOp:fillOp,
    iconColorScheme:def.schemeRef||null, iconColorCustom:false,
    iconAnim:_animOn,
    svgContent, rot:0, anims:[], shadow:false, shadowBlur:4, shadowSize:0, shadowColor:'#000000',
  };
  const _recenterIcon = (nw, nh) => {
    d.w = nw; d.h = nh;
    if(typeof _visibleCanvasRect === 'function'){
      const vis = _visibleCanvasRect();
      let x = Math.round(vis.x + (vis.w - d.w) / 2);
      let y = Math.round(vis.y + (vis.h - d.h) / 2);
      const W = typeof canvasW === 'number' ? canvasW : 1200, H = typeof canvasH === 'number' ? canvasH : 675;
      x = Math.max(0, Math.min(Math.max(0, W - d.w), x));
      y = Math.max(0, Math.min(Math.max(0, H - d.h), y));
      if(typeof snapV === 'function'){ x = snapV(x); y = snapV(y); }
      d.x = x; d.y = y;
    }
  };
  if(_iconIsRaw(ic)){
    // Сохраняем оригинальный viewBox и пропорции; не гоняем через path-fit
    const _vp = String(ic.vb || '0 0 37.586666 38.666668').trim().split(/[\s,]+/).map(Number);
    const _aspect = (_vp[2] > 0 && _vp[3] > 0) ? (_vp[2] / _vp[3]) : 1;
    const nh = sz;
    const nw = Math.round(nh * _aspect);
    d.iconFitted = true;
    _recenterIcon(nw, nh);
  } else {
    // Tighten viewBox: parse SVG paths and compute bounds from path geometry
    const _fit0 = _fitIconSvgViewBox(svgContent, sw);
    if(_fit0){
      d.svgContent = _fit0.svg;
      const nh = Math.round(Math.sqrt(d.w * d.h / _fit0.aspect));
      const nw = Math.round(nh * _fit0.aspect);
      d.iconFitted = true;
      _recenterIcon(nw, nh);
    }
  }
  slides[cur].els.push(d); mkEl(d);
  save(); if(typeof drawThumbs==="function")drawThumbs(); if(typeof saveState==="function")saveState();
  if(typeof _refreshHandlesOverlay==='function')_refreshHandlesOverlay();
  if(typeof window._connMaybeAttachAfterInsert==='function') window._connMaybeAttachAfterInsert();
  document.getElementById('icon-modal').classList.remove('open');
}

// ── inject icon cell CSS ──
(function(){
  const s=document.createElement('style');
  s.textContent=`
#icon-cat-tabs{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(39px,1fr));
  gap:4px;
  margin-bottom:22px;
  width:100%;
}
.icon-cat-cell{
  width:100%;aspect-ratio:1;height:auto;
  display:flex;align-items:center;justify-content:center;
  border-radius:8px;cursor:pointer;
  border:3px solid transparent;
  background:var(--surface2);
  opacity:.7;
  transition:opacity .12s,background .12s,border-color .12s;
  box-sizing:border-box;
  padding:0;
  font-family:inherit;
}
.icon-cat-cell:hover{opacity:1;background:var(--surface3);border-color:var(--border);}
.icon-cat-cell.active{
  opacity:1;
  border-color:var(--accent4);
  background:color-mix(in srgb,var(--accent4) 15%,transparent);
}
.icon-cat-cell svg{width:21px;height:21px;pointer-events:none;}
.icon-cat-label{
  font-size:9px;font-weight:700;color:var(--text2);
  line-height:1;text-align:center;pointer-events:none;
}
.icon-cat-cell.active .icon-cat-label{color:var(--accent4);}
.icon-cell{
  width:100%;height:100%;display:flex;align-items:center;justify-content:center;
  border-radius:8px;cursor:pointer;border:1.5px solid transparent;
  background:var(--surface2);transition:.12s;flex-direction:column;gap:2px;box-sizing:border-box;
}
.icon-cell:hover{background:var(--surface3);border-color:var(--border);}
.icon-cell.selected{border-color:var(--accent4);background:color-mix(in srgb,var(--accent4) 15%,transparent);}
.icon-cell svg{width:30px;height:30px;pointer-events:none;}
  `;
  document.head.appendChild(s);
})();

function _fitIconSvgViewBox(svgStr, swVal){
  try{
    const _doc=new DOMParser().parseFromString(svgStr,'image/svg+xml');
    const _src=_doc.documentElement;
    if(!_src||_src.tagName==='parsererror') return null;
    const _wrap=document.createElement('div');
    _wrap.style.cssText='position:fixed;left:-9999px;top:-9999px;width:200px;height:200px;';
    const _tmpSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    _tmpSvg.setAttribute('viewBox','0 0 24 24');
    _tmpSvg.style.cssText='width:200px;height:200px;overflow:visible';
    const _g=document.createElementNS('http://www.w3.org/2000/svg','g');
    _src.querySelectorAll('path,circle,ellipse,line,polyline,polygon,rect').forEach(function(n){
      _g.appendChild(document.importNode(n,true));
    });
    if(!_g.childNodes.length) return null;
    _tmpSvg.appendChild(_g);_wrap.appendChild(_tmpSvg);document.body.appendChild(_wrap);
    const bbox=_g.getBBox();document.body.removeChild(_wrap);
    if(bbox&&bbox.width>0&&bbox.height>0){
      // sw=0 must stay 0 (|| would fall back to 1.8)
      const swN=swVal!=null&&swVal!==''&&isFinite(+swVal)?Math.max(0,+swVal):1.8;
      const sw2=swN/2;
      const vx=bbox.x-sw2,vy=bbox.y-sw2,vw=bbox.width+sw2*2,vh=bbox.height+sw2*2;
      return {svg:svgStr.replace(/viewBox="[^"]*"/,'viewBox="'+vx+' '+vy+' '+vw+' '+vh+'"'),aspect:vw/vh};
    }
  }catch(_e){}
  return null;
}

function _rebuildIconElement(el,d){
  const ic=typeof getIconById==='function'?getIconById(d.iconId):ICONS.find(x=>x.id===d.iconId);
  if(!ic)return;
  const _animOn=_iconAnimEnabled(d,el);
  const _pathOv=_iconHasAnim(ic)?_iconStaticPath(ic,_animOn):null;
  let _newSvg=_buildIconSVG(ic,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle,d.shadow,d.shadowBlur,d.shadowColor,d.shadowSize,d.id,d.iconFillOp,_pathOv);
  // Raw icons keep original viewBox / fills — never path-fit.
  if(!_iconIsRaw(ic)){
    // Re-fit viewBox to current stroke so thick outlines aren't clipped; keep element size.
    if(d.iconFitted){
      const _fit=_fitIconSvgViewBox(_newSvg,d.iconSw!=null?d.iconSw:0);
      if(_fit) _newSvg=_fit.svg;
      else _newSvg=_stampIconFitViewBox(_newSvg,d);
    }else{
      const _fit=_fitIconSvgViewBox(_newSvg,d.iconSw);
      if(_fit){
        _newSvg=_fit.svg;
        if(el){
          const _area=(d.w||parseInt(el.style.width)||180)*(d.h||parseInt(el.style.height)||180);
          const _nh=Math.round(Math.sqrt(_area/_fit.aspect));
          const _nw=Math.round(_nh*_fit.aspect);
          d.w=_nw;d.h=_nh;
          el.style.width=_nw+'px';el.style.height=_nh+'px';
          d.iconFitted=true;
        }
      }
    }
  } else {
    d.iconFitted = true;
  }
  d.svgContent=_newSvg;
  if(el){
    _applyIconSvgToEl(el,d,_newSvg);
    _syncIconAnim(el,d);
  }
}

function syncIconProps(el,d){
  d=d||((typeof slides!=='undefined'&&typeof cur!=='undefined'&&slides[cur])?slides[cur].els.find(e=>e.id===el.dataset.id):null);
  if(!el||!d)return;
  try{
    const idEl=document.getElementById('ic-p-id');
    if(idEl){
      const raw=d.iconId||el.dataset.iconId||'';
      const ic=typeof getIconById==='function'?getIconById(raw):null;
      const num=ic?_iconNum(ic):(+raw||0);
      idEl.textContent=num>0?String(num):(raw?String(raw):'');
    }
  }catch(e){}
  const ic_col=d.iconColor||el.dataset.iconColor||'#3b82f6';
  const ic_sw=d.iconSw!=null?d.iconSw:(el.dataset.iconSw||1.8);
  const ic_sh=d.shadow===true||d.shadow==='true'||el.dataset.shadow==='true';
  const ic_sb=d.shadowBlur!=null?d.shadowBlur:(el.dataset.shadowBlur!=null?+el.dataset.shadowBlur:4);
  const ic_ss=d.shadowSize!=null?d.shadowSize:(el.dataset.shadowSize!=null?+el.dataset.shadowSize:0);
  const ic_sc=d.shadowColor||el.dataset.shadowColor||'#000000';
  try{document.getElementById('ic-p-color-swatch').style.background=ic_col;}catch(e){}
  try{
    document.getElementById('ic-p-color-hex').value=(typeof _colorFieldDisplay==='function')
      ? _colorFieldDisplay(ic_col, d.iconColorScheme)
      : ic_col;
  }catch(e){}
  try{document.getElementById('ic-p-sw').value=ic_sw;}catch(e){}
  const ic_fo=_iconResolvedFillOp(d.iconFillOp!=null?d.iconFillOp:el.dataset.iconFillOp, d.iconStyle||el.dataset.iconStyle);
  try{document.getElementById('ic-p-fillop').value=ic_fo;}catch(e){}
  const shEl=document.getElementById('ic-p-shadow');
  if(shEl){shEl.checked=ic_sh;const opts=document.getElementById('ic-p-shadow-opts');if(opts)opts.style.display=ic_sh?'flex':'none';}
  try{document.getElementById('ic-p-sb').value=ic_sb;}catch(e){}
  try{document.getElementById('ic-p-ss').value=ic_ss;}catch(e){}
  try{const scPr=document.getElementById('ic-p-sc-preview');if(scPr)scPr.style.background=ic_sc;}catch(e){}
  try{document.getElementById('ic-p-op').value=parseFloat(el.dataset.elOpacity!=null?el.dataset.elOpacity:(d.elOpacity!=null?d.elOpacity:1));}catch(e){}
  try{
    const _icRaw=d.iconId||el.dataset.iconId||'';
    const _icDef=typeof getIconById==='function'?getIconById(_icRaw):null;
    const _animRow=document.getElementById('ic-p-anim-row');
    if(_animRow)_animRow.style.display=_iconHasAnim(_icDef)?'flex':'none';
    const _animEl=document.getElementById('ic-p-anim');
    if(_animEl)_animEl.checked=_iconAnimEnabled(d,el);
  }catch(e){}
  if(typeof _syncShapeFlipBtns==='function') _syncShapeFlipBtns(d);
}

function _rebuildIconBgImgSrc(bg){
  if(!bg||!bg.fromIcon||!bg.iconId) return false;
  const ic=typeof getIconById==='function'?getIconById(bg.iconId):(typeof ICONS!=='undefined'?ICONS.find(x=>x.id===bg.iconId):null);
  if(!ic||typeof _buildIconSVG!=='function') return false;
  const fillOp=typeof _iconResolvedFillOp==='function'?_iconResolvedFillOp(bg.iconFillOp,bg.iconStyle):(bg.iconFillOp!=null?+bg.iconFillOp:0);
  const path=(typeof _iconHasAnim==='function'&&_iconHasAnim(ic)&&typeof _iconStaticPath==='function')?_iconStaticPath(ic,false):null;
  const sw=bg.iconSw!=null?bg.iconSw:1.8;
  let svg=_buildIconSVG(ic,bg.iconColor||'#3b82f6',sw,bg.iconStyle,bg.shadow,bg.shadowBlur,bg.shadowColor,bg.shadowSize,null,fillOp,path);
  const isRaw=typeof _iconIsRaw==='function'&&_iconIsRaw(ic);
  if(!isRaw&&bg.iconFitted&&bg.svgContent){
    const vbM=bg.svgContent.match(/viewBox="([^"]+)"/);
    if(vbM) svg=svg.replace(/viewBox="[^"]*"/,'viewBox="'+vbM[1]+'"');
  }else if(!isRaw&&typeof _fitIconSvgViewBox==='function'){
    const fit=_fitIconSvgViewBox(svg,sw);
    if(fit){svg=fit.svg;bg.iconFitted=true;}
  }else if(isRaw){
    bg.iconFitted=true;
  }
  bg.svgContent=svg;
  bg.src='data:image/svg+xml;utf8,'+encodeURIComponent(svg);
  return true;
}
window._rebuildIconBgImgSrc=_rebuildIconBgImgSrc;

function _iconBgImgFromElement(d,name,opacity){
  const bg={
    fromIcon:true,
    iconId:d.iconId,
    iconColor:d.iconColor||'#3b82f6',
    iconColorScheme:d.iconColorScheme!=null?JSON.parse(JSON.stringify(d.iconColorScheme)):null,
    iconColorCustom:d.iconColorCustom!==undefined?!!d.iconColorCustom:!d.iconColorScheme,
    iconSw:d.iconSw!=null?d.iconSw:1.8,
    iconFillOp:d.iconFillOp,
    iconStyle:d.iconStyle,
    iconFitted:!!d.iconFitted,
    svgContent:d.svgContent||null,
    shadow:d.shadow,
    shadowBlur:d.shadowBlur,
    shadowColor:d.shadowColor,
    shadowSize:d.shadowSize,
    shadowColorScheme:d.shadowColorScheme!=null?JSON.parse(JSON.stringify(d.shadowColorScheme)):null,
    name:name||'Значок',
    mode:'cover',
    opacity:opacity!=null?opacity:1,
    blur:0,
    tileSize:120,
    tileGap:10,
    tileRot:0,
    src:''
  };
  _rebuildIconBgImgSrc(bg);
  return bg;
}

function setSlideBgIconColor(color,schemeRef){
  if(!slides[cur]||!slides[cur].bgImg||!slides[cur].bgImg.fromIcon) return;
  if(typeof pushUndo==='function') pushUndo();
  const bg=slides[cur].bgImg;
  bg.iconColor=color;
  bg.iconColorScheme=schemeRef||null;
  bg.iconColorCustom=!schemeRef;
  _rebuildIconBgImgSrc(bg);
  if(typeof _applySlideBgToCanvas==='function') _applySlideBgToCanvas(slides[cur]);
  if(typeof syncSlideBgImageUI==='function') syncSlideBgImageUI();
  save();drawThumbs();if(typeof saveState==='function') saveState();
}
window.setSlideBgIconColor=setSlideBgIconColor;

function iconSetAsSlideBg(){
  if(!sel||sel.dataset.type!=='icon')return;
  if(typeof pushUndo==='function')pushUndo();
  const id=sel.dataset.id;
  const d=slides[cur].els.find(e=>e.id===id);
  if(!d)return;
  let svgContent='';
  const domSvg=sel.querySelector('.ec svg');
  if(domSvg) svgContent=domSvg.outerHTML;
  else if(d.svgContent) svgContent=d.svgContent;
  else {
    const ic=typeof getIconById==='function'?getIconById(d.iconId):(typeof ICONS!=='undefined'?ICONS.find(x=>x.id===d.iconId):null);
    if(ic&&typeof _buildIconSVG==='function'){
      const path=typeof _iconStaticPath==='function'?_iconStaticPath(ic,false):null;
      const fillOp=typeof _iconResolvedFillOp==='function'?_iconResolvedFillOp(d.iconFillOp,d.iconStyle):(d.iconFillOp!=null?+d.iconFillOp:0);
      svgContent=_buildIconSVG(ic,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle,d.shadow,d.shadowBlur,d.shadowColor,d.shadowSize,d.id,fillOp,path);
    }
  }
  if(!svgContent)return;
  const icMeta=typeof getIconById==='function'?getIconById(d.iconId):(typeof ICONS!=='undefined'?ICONS.find(x=>x.id===d.iconId):null);
  const name=(icMeta&&icMeta.name)?icMeta.name:'Значок';
  const resolvedBg=typeof _resolveSlideColorBg==='function'?_resolveSlideColorBg(slides[cur]):null;
  const op=d.elOpacity!=null?Math.max(0,Math.min(1,+d.elOpacity)):1;
  const iconData=Object.assign({},d,{svgContent:d.svgContent||svgContent});
  slides[cur].bgImg=_iconBgImgFromElement(iconData,name,op);
  slides[cur].bg='custom';
  if(!slides[cur].bgc&&resolvedBg)slides[cur].bgc=resolvedBg;
  slides[cur].els=slides[cur].els.filter(e=>e.id!==id);
  const el=sel;
  desel();
  el.remove();
  if(typeof _applySlideBgToCanvas==='function')_applySlideBgToCanvas(slides[cur]);
  if(typeof syncSlideBgPreview==='function')syncSlideBgPreview();
  if(typeof syncSlideBgImageUI==='function')syncSlideBgImageUI();
  save();drawThumbs();if(typeof saveState==='function')saveState();
  if(typeof renderObjectsPanel==='function')renderObjectsPanel();
  if(typeof toast==='function')toast(typeof t==='function'?t('toastImgBg'):'Значок задан как фон слайда','ok');
}
window.iconSetAsSlideBg=iconSetAsSlideBg;

function updateIconStyle(prop,val){
  if(!sel||sel.dataset.type!=='icon')return;
  if(typeof pushUndo==="function")pushUndo();
  var d=slides[cur].els.find(function(e){return e.id===sel.dataset.id;});
  if(!d)return;
  if(prop==='color'){
    d.iconColor=val;sel.dataset.iconColor=val;
    // Palette position → theme-adaptive; raw #hex → fixed custom
    if(d.iconColorScheme){ d.iconColorCustom=false; }
    else { d.iconColorCustom=true; }
  }
  else if(prop==='sw'){
    var _sw=parseFloat(val);
    d.iconSw=isFinite(_sw)?Math.max(0,_sw):0;
    sel.dataset.iconSw=d.iconSw;
  }
  else if(prop==='fillOp'){d.iconFillOp=_iconResolvedFillOp(val);sel.dataset.iconFillOp=d.iconFillOp;}
  else if(prop==='shadow'){d.shadow=val;sel.dataset.shadow=val?'true':'false';
    var shOpts=document.getElementById('ic-p-shadow-opts');
    if(shOpts)shOpts.style.display=val?'flex':'none';}
  else if(prop==='shadowBlur'){d.shadowBlur=+val;sel.dataset.shadowBlur=val;}
  else if(prop==='shadowSize'){d.shadowSize=+val;sel.dataset.shadowSize=val;}
  else if(prop==='shadowColor'){d.shadowColor=val;sel.dataset.shadowColor=val;}
  else if(prop==='op'){d.elOpacity=parseFloat(val);sel.dataset.elOpacity=val;sel.style.opacity=val;}
  else if(prop==='anim'){d.iconAnim=!!val;sel.dataset.iconAnim=val?'true':'false';}
  _rebuildIconElement(sel,d);
  save();if(typeof saveState==="function")saveState();
}

function updateIconStyleScheme(prop,val,schemeRef){
  if(sel&&slides[cur]){
    const d=slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d){
      if(prop==='color'){
        d.iconColorScheme=schemeRef||null;
        if(schemeRef)sel.dataset.iconColorScheme=JSON.stringify(schemeRef);
        else delete sel.dataset.iconColorScheme;
      }else if(prop==='shadowColor'){
        d.shadowColorScheme=schemeRef||null;
        if(schemeRef)sel.dataset.shadowColorScheme=JSON.stringify(schemeRef);
        else delete sel.dataset.shadowColorScheme;
      }
    }
  }
  updateIconStyle(prop==='shadowColor'?'shadowColor':'color',val);
}


// ── Icon picker for bullet list — reuses the main icon modal ───────────────
function openIconPickerForList(bulletSpan, textData) {
  // Set callback — insertIconSelected() checks this before inserting as element
  window._listIconInsertCallback = function(ic) {
    if (textData) textData.bulletIconId = ic.id;
    var c = bulletSpan && bulletSpan.closest('.ec');
    if (!c) { window._listIconInsertCallback = null; return; }
    var cs = c.getAttribute('style') || '';
    var fsMatch = cs.match(/font-size:\s*([\d.]+)px/);
    var sz = Math.round(parseFloat(fsMatch ? fsMatch[1] : '24'));
    var sw = parseFloat(document.getElementById('ic-sw') ? document.getElementById('ic-sw').value : '1.4') || 1.4;
    var fillOp = _iconResolvedFillOp(document.getElementById('ic-fill-op') && document.getElementById('ic-fill-op').value);
    // Keep the marker color that was already set (palette / custom / currentColor)
    var keepColor = (bulletSpan && bulletSpan.getAttribute('data-icon-color')) || 'currentColor';
    var keepScheme = bulletSpan ? bulletSpan.getAttribute('data-icon-schemeref') : null;
    var allBulletSpans = (typeof window._getTargetedMarkers === 'function')
      ? window._getTargetedMarkers(c).filter(function(sp){ return sp.hasAttribute('data-list-bullet'); })
      : Array.prototype.slice.call(c.querySelectorAll('span[data-list-bullet]'));
    allBulletSpans.forEach(function(sp) {
      var color = sp.getAttribute('data-icon-color') || keepColor;
      var scheme = sp.getAttribute('data-icon-schemeref') || keepScheme;
      sp.setAttribute('data-icon-id', ic.id);
      sp.setAttribute('data-icon-fill-op', fillOp);
      sp.setAttribute('data-icon-color', color);
      sp.setAttribute('data-icon-sw', sw);
      if (scheme) sp.setAttribute('data-icon-schemeref', scheme);
      else sp.removeAttribute('data-icon-schemeref');
      sp.innerHTML = _buildBulletIconSVG(ic, sz, null, color, sw, fillOp);
    });
    if (typeof window._rtApplyMarkerVerticalAlign === 'function') {
      window._rtApplyMarkerVerticalAlign(c, sz);
    }
    var root = c.querySelector('.ec-valign-wrap') || c;
    if (textData) textData.html = root.innerHTML;
    if (typeof commitAll === 'function') commitAll();
    if (typeof window.rtUpdateListButtonState === 'function') window.rtUpdateListButtonState();
    window._listIconInsertCallback = null;
  };
  openIconModal();
}
window.openIconPickerForList = openIconPickerForList;

// Cancel clears the callback
var _iconModalCancelBtn = document.querySelector && document.querySelector('#icon-modal .mbtn:not(.pri)');
// (cancel is handled inline in HTML — _listIconInsertCallback is auto-cleared by insertIconSelected or on next open)

// Build SVG for bullet icon with proper style/color/sw
function _buildBulletIconSVG(ic, sz, style, color, sw, fillOp) {
  var svgStr = _buildIconSVG(ic, color || 'currentColor', sw || 1.8, style, false, null, null, null, null, fillOp);
  return svgStr
    .replace('<svg ', '<svg width="' + sz + '" height="' + sz + '" ')
    .replace('style="width:100%;height:100%;overflow:hidden"', 'style="display:inline-block;vertical-align:middle;overflow:visible;flex-shrink:0;pointer-events:none"');
}
window._buildBulletIconSVG = _buildBulletIconSVG;

