// ══════════════════════════════════════════════════════════════════
// 33b-autoplace.js  v8 — сценарии компоновки, подписи к картинкам, split текста
// ══════════════════════════════════════════════════════════════════

window.autoPlaceAll = function(options){
  if(!slides||!slides.length) return;
  const gentle = !options || options.gentle !== false;
  const msg = typeof t==='function' ? t('confirmAutoPlace') : 'Auto-layout all slides? Theme and decor are preserved.';
  if(!confirm(msg)) return;
  pushUndo();
  if(!gentle){
    if(typeof THEMES!=='undefined'&&THEMES.length){ selTheme=Math.floor(Math.random()*THEMES.length); applyTheme(); pushUndo(); }
    if(typeof LAYOUTS!=='undefined'&&LAYOUTS.length&&typeof applyLayout==='function'){
      if(Math.random()<0.3){ slides.forEach(s=>{s.els=s.els.filter(e=>!e._isDecor);}); selLayout=-1; }
      else applyLayout(Math.floor(Math.random()*LAYOUTS.length),null);
    }
  }
  const headAlign = gentle ? _apDetectAlign() : ['center','left','right'][Math.floor(Math.random()*3)];
  const W=canvasW, H=canvasH, PAD=66, GAP=24;

  // Проход 0: длинный текст → несколько слайдов
  _apSplitOverflowSlides(280, 200);

  // Проход 1: классификация + сброс форматирования
  slides.forEach((s,si)=>_apSlide_prep(s,si===0,gentle));

  // Проход 2: единый font-size по всей презентации
  _apGlobalBodyFs = _apCalcGlobalFs(slides, W, H, PAD, GAP);

  // Проход 3: сценарии размещения
  slides.forEach((s,si)=>_apSlide_layout(s,si===0,headAlign));
  // Сохраняем данные в localStorage до рендера (все слайды уже изменены в памяти)
  if(typeof saveState==='function') saveState();
  renderAll();
  // drawThumbs уже вызван в renderAll, но вызовем ещё раз после save
  if(typeof drawThumbs==='function') setTimeout(drawThumbs, 50);
  if(typeof saveState==='function') saveState();
  // Подгоняем высоты текстов по реальному содержимому
  if(typeof _fitAllTextsAllSlides==='function'){
    _fitAllTextsAllSlides(()=>toast(typeof t==='function'?t('toastAutoPlaceDone'):'✨ Objects placed'));
  } else {
    toast(typeof t==='function'?t('toastAutoPlaceDone'):'✨ Objects placed');
  }
};

// ── Доминирующее выравнивание заголовков (сохраняет стиль шаблона) ──
function _apDetectAlign(){
  const counts={center:0,left:0,right:0};
  slides.forEach(s=>{
    (s.els||[]).filter(e=>!e._isDecor&&e.type==='text').forEach(el=>{
      const m=(el.cs||'').match(/text-align\s*:\s*(\w+)/i);
      if(m&&counts[m[1]]!=null) counts[m[1]]++;
    });
  });
  const best=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  return (best&&best[1]>0)?best[0]:'left';
}

// ── Разбиение переполненного текста на 2–3 слайда ───────────────────
function _apSplitOverflowSlides(limit, chunk){
  const out=[];
  for(let i=0;i<slides.length;i++){
    const s=slides[i];
    const decor=(s.els||[]).filter(e=>e._isDecor);
    const content=(s.els||[]).filter(e=>!e._isDecor);
    const texts=content.filter(e=>e.type==='text');
    const media=content.filter(e=>e.type!=='text');
    if(!texts.length){ out.push(s); continue; }
    const {head,bodies}=_apHeading(texts,s,canvasH,i===0);
    const bodyChars=bodies.reduce((n,e)=>n+_apPlainLen(e),0);
    if(bodyChars<=limit||!bodies.length){ out.push(s); continue; }
    const full=bodies.map(e=>_apPlain(e)).filter(Boolean).join('\n\n');
    const chunks=_apChunkText(full,chunk);
    if(chunks.length<2){ out.push(s); continue; }
    const firstBody=_apTextFromPlain(bodies[0],chunks[0]);
    s.els=[...decor,...(head?[head]:[]),firstBody,...media,...bodies.slice(1)];
    out.push(s);
    for(let c=1;c<chunks.length;c++){
      const ns={title:s.title,bg:s.bg,bgc:s.bgc,ar:s.ar,trans:s.trans||'',auto:s.auto||0,els:decor.map(d=>JSON.parse(JSON.stringify(d)))};
      if(s.bgImg) ns.bgImg=JSON.parse(JSON.stringify(s.bgImg));
      const uid='sp'+(Date.now()%1e7)+c;
      if(head){
        const nh=JSON.parse(JSON.stringify(head));
        nh.id=uid+'h';
        const ht=_apPlain(head);
        nh.html=_apEscHtml(chunks.length>2?ht+' ('+(c+1)+'/'+chunks.length+')':ht+' (продолжение)');
        nh.textRole='heading';
        ns.els.push(nh);
      }
      const nb=_apTextFromPlain(bodies[0],chunks[c]);
      nb.id=uid+'b';
      ns.els.push(nb);
      out.push(ns);
    }
  }
  slides.length=0;
  out.forEach(s=>slides.push(s));
}

function _apChunkText(text,chunkSize){
  const paras=text.split(/\n\n+/).map(p=>p.trim()).filter(Boolean);
  const chunks=[]; let cur='';
  const flush=()=>{ if(cur.trim()){ chunks.push(cur.trim()); cur=''; }};
  paras.forEach(p=>{
    if(p.length<=chunkSize){
      if(cur&&(cur+'\n\n'+p).length<=chunkSize) cur+='\n\n'+p;
      else{ flush(); cur=p; }
    }else{
      flush();
      const sents=p.match(/[^.!?…]+[.!?…]+(?:\s+|$)|[^.!?…]+$/g)||[p];
      sents.forEach(sent=>{
        const t=sent.trim(); if(!t) return;
        if(cur&&(cur+' '+t).length<=chunkSize) cur+=' '+t;
        else{ flush(); cur=t; }
      });
    }
  });
  flush();
  return chunks.length?chunks:[text];
}

function _apEscHtml(t){
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function _apTextFromPlain(src,plain){
  const el=JSON.parse(JSON.stringify(src));
  const parts=plain.split(/\n\n+/);
  el.html=parts.map(p=>'<div>'+_apEscHtml(p).replace(/\n/g,'<br>')+'</div>').join('');
  el.textRole='body';
  return el;
}

// ── Подписи к картинкам ─────────────────────────────────────────────
function _apCsFs(el){
  const m=(el.cs||'').match(/font-size\s*:\s*(\d+)/i);
  if(m) return +m[1];
  return el._origFs||0;
}
function _apIsCaption(el,maxFs,nImages){
  if(!nImages||el.textRole==='heading'||el.textRole==='title') return false;
  if(el.textRole==='caption') return true;
  const plain=_apPlain(el);
  const words=plain?plain.split(/\s+/).filter(Boolean).length:0;
  const fs=_apCsFs(el)||24;
  if(words<=0) return false;
  if(words<=14&&plain.length<=90) return true;
  if(fs<=maxFs*0.82&&words<=22&&plain.length<=120) return true;
  return false;
}
function _apCenter(el){
  return {x:(el.x||0)+(el.w||200)/2, y:(el.y||0)+(el.h||100)/2};
}
function _apPairCaptions(images,captions){
  const pairs=[];
  const used=new Set();
  const maxD=Math.min(canvasW,canvasH)*0.55;
  [...images].sort((a,b)=>(a.y||0)-(b.y||0)||(a.x||0)-(b.x||0)).forEach(img=>{
    const ic=_apCenter(img);
    let best=null,bestD=Infinity;
    captions.forEach(cap=>{
      if(used.has(cap)) return;
      const cc=_apCenter(cap);
      const d=Math.hypot(ic.x-cc.x,ic.y-cc.y);
      if(d<bestD){ bestD=d; best=cap; }
    });
    if(best&&bestD<maxD){ used.add(best); pairs.push({img,caption:best}); }
    else pairs.push({img,caption:null});
  });
  return {pairs,orphanCaptions:captions.filter(c=>!used.has(c))};
}

// ── Проход 1: классификация + сброс ─────────────────────────────────
function _apSlide_prep(s,isTitle,gentle){
  const H=canvasH;
  const els=(s.els||[]).filter(e=>!e._isDecor);
  if(!els.length) return;
  const texts=els.filter(e=>e.type==='text');
  const images=els.filter(e=>e.type==='image'||e.type==='svg'||e.type==='icon');
  const presetCaps=texts.filter(e=>e.textRole==='caption');
  const forHead=texts.filter(e=>e.textRole!=='caption');
  const {head,bodies}=_apHeading(forHead,s,H,isTitle);
  const maxFs=Math.max(24,...texts.map(_apCsFs));
  const captions=[...presetCaps], realBodies=[];
  bodies.forEach(el=>{
    if(presetCaps.includes(el)) return;
    if(_apIsCaption(el,maxFs,images.length)) captions.push(el);
    else realBodies.push(el);
  });
  const {pairs,orphanCaptions}=_apPairCaptions(images,captions);
  s._apHead=head;
  s._apBodies=realBodies.concat(orphanCaptions);
  s._apPairs=pairs;
  s._apImages=images;
  s._apTables=els.filter(e=>e.type==='table');
  const resetFn=gentle?_apGentleReset:_apReset;
  texts.forEach(el=>resetFn(el));
  if(head) _apTypo(head);
  s._apBodies.forEach(b=>_apTypo(b));
  pairs.forEach(p=>{ if(p.caption) _apTypo(p.caption); });
}

function _apGentleReset(el){
  if(el.cs){
    el.cs=el.cs
      .replace(/font-size\s*:\s*[^;]+;?/gi,'')
      .replace(/font-weight\s*:\s*[^;]+;?/gi,'')
      .replace(/line-height\s*:\s*[^;]+;?/gi,'')
      .replace(/;;+/g,';').replace(/^;+|;+$/g,'').trim();
  }
  _apTypo(el);
}

// ── Проход 2: размещение с глобальным шрифтом ─────────────────────
function _apSlide_layout(s,isTitle,headAlign){
  const W=canvasW,H=canvasH,PAD=66,GAP=24;
  const els=(s.els||[]).filter(e=>!e._isDecor);
  if(!els.length) return;
  const head=s._apHead||null;
  const bodies=s._apBodies||[];
  const images=s._apImages||els.filter(e=>e.type==='image'||e.type==='svg'||e.type==='icon');
  const tables=s._apTables||els.filter(e=>e.type==='table');
  const pairs=s._apPairs||images.map(img=>({img,caption:null}));
  if(isTitle) _apTitle(head,bodies,images,pairs,W,H,PAD,GAP,headAlign);
  else _apContent(head,bodies,images,pairs,tables,W,H,PAD,GAP,headAlign);
  if(head) _apHStyle(head,isTitle?50:40,isTitle);
  delete s._apHead; delete s._apBodies; delete s._apPairs; delete s._apImages; delete s._apTables;
}

function _apPickScenario(ctx){
  const {isTitle,head,bodies,images,pairs,tables,txtLen}=ctx;
  const nImg=images.length;
  const nCap=pairs.filter(p=>p.caption).length;
  if(tables.length) return 'table';
  if(isTitle) return 'title';
  if(nImg===0) return bodies.length>1?'text-columns':'text-only';
  if(nImg>=2&&(nCap>=1||nImg<=4)) return 'grid-caption';
  if(nImg===1&&txtLen>220) return 'hero-stack';
  if(nImg>=2&&txtLen>180) return 'img-top-text';
  if(nImg===1) return 'text-left-img';
  return 'text-left-img';
}

// ── Единый вызов (обратная совместимость для applyLayoutVariant) ──
function _apSlide(s,isTitle,headAlign){
  _apSlide_prep(s,isTitle,true);
  _apGlobalBodyFs=30;
  _apSlide_layout(s,isTitle,headAlign);
}

// ══════════════════════════════════════════════════════════════════
// СБРОС ФОРМАТИРОВАНИЯ — убирает font-size/weight из cs И из span
// ══════════════════════════════════════════════════════════════════
function _apReset(el){
  if(el.cs){
    el.cs=el.cs
      .replace(/font-size\s*:\s*[^;]+;?/gi,'')
      .replace(/font-weight\s*:\s*[^;]+;?/gi,'')
      .replace(/font-style\s*:\s*[^;]+;?/gi,'')
      .replace(/text-decoration\s*:\s*[^;]+;?/gi,'')
      .replace(/line-height\s*:\s*[^;]+;?/gi,'')
      .replace(/flex\s*:\s*[^;]+;?/gi,'')
      .replace(/width\s*:\s*[^;]+;?/gi,'')
      // Убираем цвет — будет заменён цветом из схемы
      .replace(/color\s*:\s*[^;]+;?/gi,'')
      .replace(/;;+/g,';').replace(/^;+|;+$/g,'').trim();
  }
  // Сбрасываем схемные ссылки — пересчитаются из темы
  el.textColorScheme = undefined;
  if(!el.html) return;
  const tmp=document.createElement('div');
  tmp.innerHTML=el.html;
  // span[data-ch] — только display:inline
  tmp.querySelectorAll('span[data-ch]').forEach(sp=>{
    sp.setAttribute('style','display:inline');
    sp.removeAttribute('data-scheme');
  });
  // Все span/div — убираем font-size, font-weight, line-height, но сохраняем color
  tmp.querySelectorAll('span,div').forEach(node=>{
    if(node.hasAttribute('data-ch')) return;
    const st=node.getAttribute('style')||'';
    if(!st) return;
    const cleaned=st
      .replace(/font-size\s*:\s*[^;]+;?/gi,'')
      .replace(/font-weight\s*:\s*[^;]+;?/gi,'')
      .replace(/font-style\s*:\s*[^;]+;?/gi,'')
      .replace(/line-height\s*:\s*[^;]+;?/gi,'')
      .replace(/;;+/g,';').replace(/^;+|;+$/g,'').trim();
    if(cleaned) node.setAttribute('style',cleaned);
    else node.removeAttribute('style');
  });
  // b/strong/i/em → текст
  tmp.querySelectorAll('b,strong,i,em').forEach(tag=>{
    const f=document.createDocumentFragment();
    Array.from(tag.childNodes).forEach(c=>f.appendChild(c.cloneNode(true)));
    tag.replaceWith(f);
  });
  el.html=tmp.innerHTML;
}

// ══════════════════════════════════════════════════════════════════
// ОПРЕДЕЛЕНИЕ ЗАГОЛОВКА
// ══════════════════════════════════════════════════════════════════
function _apHeading(texts,slide,H,isTitle){
  if(!texts.length) return {head:null,bodies:[]};
  const byY=[...texts].sort((a,b)=>(a.y||0)-(b.y||0));
  const tFS=isTitle?50:40;

  function csFs(el){
    const m=(el.cs||'').match(/font-size\s*:\s*(\d+)/i);
    if(m) return +m[1];
    return el._origFs||0;
  }
  function wc(el){
    const p=_apPlain(el).trim();
    return p?p.split(/\s+/).filter(Boolean).length:0;
  }

  // Случай А: единственный текст → всегда заголовок (если не помечен как body)
  if(byY.length===1){
    const el=byY[0];
    const plain=_apPlain(el).trim();
    const words=wc(el);
    // Уважаем явную роль 'body' — не превращаем в заголовок
    if(el.textRole==='body'||el.textRole==='subtitle'){
      return {head:null,bodies:[el]};
    }
    // Короткий или пустой → заголовок
    if(!plain||words<=12){
  return {head:el,bodies:[]};
    }
    // Длинный → разбиваем по знаку препинания
    const {head:hT,body:bT}=_apSplit(plain);
    if(hT&&bT){
      const nh=_apMakeEl(el,hT,slide); el.html=bT;
  return {head:nh,bodies:[el]};
    }
    // Разбить не удалось — весь блок заголовок
  return {head:el,bodies:[]};
  }

  // Случай Б: несколько текстов
  // Сортируем по убыванию шрифта для поиска заголовка
  const byFs=[...byY].sort((a,b)=>csFs(b)-csFs(a));
  const maxFs=csFs(byFs[0]);

  // Приоритет: если есть явные роли — используем их
  const explicitHead = byY.find(e => e.textRole==='title'||e.textRole==='heading');
  const explicitBodies = byY.filter(e => e.textRole==='body'||e.textRole==='subtitle');
  if(explicitHead && explicitBodies.length){
    return {head:explicitHead, bodies:byY.filter(e=>e!==explicitHead)};
  }
  if(explicitHead && !explicitBodies.length){
    return {head:explicitHead, bodies:byY.filter(e=>e!==explicitHead)};
  }
  if(!explicitHead && explicitBodies.length===byY.length){
    // Все body — первый считаем заголовком
    return {head:byY[0], bodies:byY.slice(1)};
  }

  // Б0: короткий текст (≤8 слов) в верхней трети — явный заголовок
  for(const el of byY){
    if(el.textRole==='body'||el.textRole==='subtitle') continue; // skip explicit body
    if((el.y||0)<H*0.35 && wc(el)>=1 && wc(el)<=8){
      return {head:el,bodies:byY.filter(e=>e!==el)};
    }
  }

  // Б1: самый крупный шрифт + короткий текст (≤12 слов)
  for(const el of byFs){
    if(wc(el)<=12){
      return {head:el,bodies:byY.filter(e=>e!==el)};
    }
  }

  // Б2: самый крупный шрифт — длинный текст → разбиваем
  for(const el of byFs){
    const plain=_apPlain(el).trim();
    const {head:hT,body:bT}=_apSplit(plain);
    if(hT&&bT){
      const nh=_apMakeEl(el,hT,slide); el.html=bT;
      return {head:nh,bodies:byY};
    }
    // Не разбивается — весь блок заголовок
    return {head:el,bodies:byY.filter(e=>e!==el)};
  }

  // Б3: fallback — верхний элемент
  return {head:byY[0],bodies:byY.slice(1)};
}

// Разбивка текста на заголовок и тело
// Приоритет: знак препинания в начале (.!?), потом по N словам
function _apSplit(text,maxW){
  maxW=maxW||10;
  // 1. Первое предложение по знаку препинания (. ! ?) — с пробелом или без
  //    "Где используют?IoT позволяет" → "Где используют?" + "IoT позволяет"
  let m=text.match(/^(.{2,80}?[.!?])\s*([А-ЯЁA-Z\u0400-\u04FF].{10,})/);
  if(m){
    const hw=m[1].split(/\s+/).length;
    if(hw>=1&&hw<=maxW+5) return {head:m[1].trim(),body:m[2].trim()};
  }
  // 2. Первое предложение с тире или двоеточием
  m=text.match(/^(.{4,80}[—:–])\s+([А-ЯЁA-Z\u0400-\u04FF\w].{10,})/);
  if(m&&m[1].split(/\s+/).length<=maxW+3) return {head:m[1].trim(),body:m[2].trim()};
  // 3. Слитные предложения: строчная + заглавная
  m=text.match(/^(.{4,80}[а-яёa-z])([А-ЯЁA-Z].{10,})/);
  if(m&&m[1].split(/\s+/).length<=maxW+3) return {head:m[1].trim(),body:m[2].trim()};
  // 4. Принудительно по первым maxW словам
  const words=text.split(/\s+/);
  if(words.length>maxW+3) return {head:words.slice(0,maxW).join(' '),body:words.slice(maxW).join(' ')};
  return {head:text,body:''};
}

function _apMakeEl(srcEl,text,slide){
  const newEl={
    id:'h'+(Date.now()%10000000),type:'text',
    x:srcEl.x,y:Math.max(0,(srcEl.y||0)-60),
    w:srcEl.w,h:Math.round(srcEl.h*0.25)||80,rot:0,anims:[],isTrigger:false,
    html:text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),
    valign:'middle',cs:''
  };
  if(slide.els) slide.els.push(newEl);
  return newEl;
}


// Получить цвет текста из активной темы (белый/чёрный в зависимости от dark/light)
function _apThemeColor(){
  try{
    const ti = (typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)
      ? appliedThemeIdx
      : (typeof selTheme!=='undefined'&&selTheme>=0?selTheme:0);
    const theme = THEMES[ti];
    if(!theme) return '#ffffff';
    const color = typeof _resolveSchemeColor==='function'
      ? _resolveSchemeColor({col:7,row:0}, theme)
      : (theme.dark?'#ffffff':'#000000');
    return color||'#ffffff';
  }catch(e){ return '#ffffff'; }
}
function _apHStyle(el,fs,noUppercase){
  if(!el.cs) el.cs='';
  el.cs=el.cs
    .replace(/font-size\s*:\s*[^;]+;?/gi,'')
    .replace(/font-weight\s*:\s*[^;]+;?/gi,'')
    .replace(/text-transform\s*:\s*[^;]+;?/gi,'')
    .replace(/\bcolor\s*:\s*[^;]+;?/gi,'');
  const _tc=_apThemeColor();
  el.cs=(el.cs?el.cs.replace(/;$/,'')+';':'')
    +'font-size:'+fs+'px;font-weight:700;'+(noUppercase?'':'text-transform:uppercase;')+'color:'+_tc;
  el.textRole='heading';
  el.textColorScheme={col:7,row:0};
}

// ══════════════════════════════════════════════════════════════════
// ТИПОГРАФИКА
// ══════════════════════════════════════════════════════════════════
function _apTypo(el){
  if(!el||!el.html) return;
  const tmp=document.createElement('div'); tmp.innerHTML=el.html;
  (function w(n){n.childNodes.forEach(c=>{
    if(c.nodeType===3) c.textContent=_apFix(c.textContent);
    else if(c.nodeType===1) w(c);
  });})(tmp);
  el.html=tmp.innerHTML;
}
function _apFix(s){
  if(!s||!s.trim()) return s;
  return s.replace(/  +/g,' ')
    .replace(/ +([,;:!?])/g,'$1')
    .replace(/([,;:])([^\s\d"'»)\]\n])/g,'$1 $2')
    .replace(/\s+-\s+/g,' — ').replace(/\s+–\s+/g,' — ')
    .replace(/\.{3}/g,'…');
}

// ══════════════════════════════════════════════════════════════════
// РАЗМЕЩЕНИЕ — ГЛАВНЫЙ СЛАЙД
// ══════════════════════════════════════════════════════════════════
function _apTitle(head,bodies,images,pairs,W,H,PAD,GAP,align){
  const n=images.length, b=bodies[0]||null;
  if(!head){
    if(n>=2&&pairs.some(p=>p.caption)) _apGridWithCaptions(pairs,PAD,PAD,W-PAD*2,H-PAD*2,GAP);
    else{ _apTexts(bodies,PAD,PAD,W-PAD*2,H-PAD*2,GAP); _apImgs(images,PAD,PAD,W-PAD*2,H-PAD*2,GAP); }
    return;
  }
  if(head&&!b&&n===0){
    // Только заголовок — по центру слайда
    _apSetFs(head,52); _apAlign(head,'center'); head.valign='middle';
    const hH=Math.max(head.h||0, Math.round(H*0.25));
    head.h=hH; head.w=W-PAD*2;
    head.x=PAD; head.y=Math.round((H-hH)/2);
  } else if(head&&bodies.length&&n===0){
    // Заголовок + одна или несколько надписей
    _apAlign(head,'center'); head.valign='middle';

    // Высота заголовка
    const hH = Math.min(Math.max(head.h||60, Math.round(H*0.16)), Math.round(H*0.28));
    head.h = hH; head.w = W-PAD*2; head.x = PAD;

    // Доступная зона для тел под/над заголовком
    const bodyZoneH = H - PAD*2 - hH - GAP;

    const variant = Math.floor(Math.random()*2); // 0=заголовок по центру, тела снизу; 1=стек по центру
    if(variant === 0){
      head.y = Math.round((H - hH) / 2);
      const bodyY = Math.min(H - PAD - 60, head.y + hH + GAP);
      const bodyH = H - PAD - bodyY;
      _apTexts(bodies, PAD, bodyY, W-PAD*2, Math.max(40, bodyH), GAP);
    } else {
      const totalEstH = hH + GAP*2 + Math.round(H*0.12)*bodies.length;
      const sy = Math.max(PAD, Math.round((H - totalEstH) / 2));
      head.y = sy;
      const bodyY = sy + hH + GAP;
      const bodyH = H - PAD - bodyY;
      _apTexts(bodies, PAD, bodyY, W-PAD*2, Math.max(40, bodyH), GAP);
    }
    head.y = Math.max(PAD, Math.min(head.y, H - PAD - hH));
  } else if(head&&n===1){
    // Заголовок слева, картинка справа
    _apAlign(head,'left'); head.valign='middle';
    const cW=Math.round((W-PAD*2-GAP)/2);
    _apPut(head,PAD,PAD,cW,H-PAD*2,true);
    _apPut(images[0],PAD+cW+GAP,PAD,cW,H-PAD*2,false);
    if(bodies.length) _apTexts(bodies,PAD,head.y+head.h+GAP,cW,H-head.y-head.h-GAP*2-PAD,GAP);
  } else if(head&&n>=2){
    _apAlign(head,align); head.valign='middle';
    head.x=PAD; head.y=PAD; head.w=W-PAD*2;
    if(!head.h||head.h<40) head.h=Math.round(H*0.14);
    const imgY=PAD+head.h+GAP;
    const zoneH=H-imgY-PAD;
    if(pairs.some(p=>p.caption)&&!bodies.length){
      _apGridWithCaptions(pairs,PAD,imgY,W-PAD*2,zoneH,GAP);
    }else if(bodies.length){
      const tW=Math.round((W-PAD*2-GAP)*0.42);
      _apTexts(bodies,PAD,imgY,tW,zoneH,GAP);
      if(pairs.some(p=>p.caption)) _apGridWithCaptions(pairs,PAD+tW+GAP,imgY,W-PAD*2-tW-GAP,zoneH,GAP);
      else _apImgs(images,PAD+tW+GAP,imgY,W-PAD*2-tW-GAP,zoneH,GAP);
    } else {
      _apGridWithCaptions(pairs,PAD,imgY,W-PAD*2,zoneH,GAP);
    }
  } else if(n>=1){
    if(pairs.some(p=>p.caption)) _apGridWithCaptions(pairs,PAD,PAD,W-PAD*2,H-PAD*2,GAP);
    else _apImgs(images,PAD,PAD,W-PAD*2,H-PAD*2,GAP);
  }
}

// ══════════════════════════════════════════════════════════════════
// РАЗМЕЩЕНИЕ — КОНТЕНТНЫЙ СЛАЙД
// ══════════════════════════════════════════════════════════════════
function _apContent(head,bodies,images,pairs,tables,W,H,PAD,GAP,align){
  let curY=PAD;
  if(head){
    _apAlign(head,align); head.valign='middle';
    head.x=PAD; head.y=curY; head.w=W-PAD*2;
    if(!head.h||head.h<40) head.h=Math.round(H*0.14);
    curY+=head.h+GAP;
  }
  const aH=H-curY-PAD, aW=W-PAD*2;
  const txtLen=bodies.reduce((s,e)=>s+_apPlainLen(e),0);
  const scenario=_apPickScenario({isTitle:false,head,bodies,images,pairs,tables,txtLen});

  if(scenario==='table'){
    const tH=Math.max(40,Math.floor((aH-GAP*(tables.length-1))/tables.length));
    tables.forEach((t,i)=>{t.x=PAD;t.y=curY+i*(tH+GAP);t.w=aW;t.h=tH;});
    return;
  }
  if(scenario==='text-only'){ _apTexts(bodies,PAD,curY,aW,aH,GAP); return; }
  if(scenario==='text-columns'&&bodies.length>=2){
    const colW=Math.floor((aW-GAP)/2);
    const left=bodies.filter((_,i)=>i%2===0);
    const right=bodies.filter((_,i)=>i%2===1);
    _apTexts(left,PAD,curY,colW,aH,GAP);
    _apTexts(right,PAD+colW+GAP,curY,colW,aH,GAP);
    return;
  }
  if(scenario==='grid-caption'){
    if(bodies.length){
      const tH=Math.min(Math.round(aH*0.38),bodies.reduce((s,e)=>s+_apEst(e,aW,_apGlobalBodyFs||30),0)+GAP*bodies.length+20);
      _apTexts(bodies,PAD,curY,aW,Math.max(60,tH),GAP);
      _apGridWithCaptions(pairs,PAD,curY+Math.max(60,tH)+GAP,aW,aH-Math.max(60,tH)-GAP,GAP);
    }else{
      _apGridWithCaptions(pairs,PAD,curY,aW,aH,GAP);
    }
    return;
  }
  if(scenario==='hero-stack'){
    const iH=Math.min(Math.round(aH*0.4),images[0].h||Math.round(aH*0.4));
    if(pairs[0]&&pairs[0].caption){
      _apPut(pairs[0].img,PAD,curY,aW,iH*0.82,false);
      _apCaptionStyle(pairs[0].caption,PAD,curY+iH*0.82+4,aW,Math.round(iH*0.18)-4);
    }else{
      _apPut(images[0],PAD,curY,aW,iH,false);
    }
    _apTexts(bodies,PAD,curY+iH+GAP,aW,aH-iH-GAP,GAP);
    return;
  }
  if(scenario==='img-top-text'){
    const capZone=pairs.some(p=>p.caption);
    const iH=capZone?Math.round(aH*0.48):Math.min(Math.round(aH*0.42),images.reduce((m,i)=>Math.max(m,i.h||200),0)+GAP);
    if(capZone) _apGridWithCaptions(pairs,PAD,curY,aW,iH,GAP);
    else _apImgs(images,PAD,curY,aW,iH,GAP);
    _apTexts(bodies,PAD,curY+iH+GAP,aW,aH-iH-GAP,GAP);
    return;
  }
  // text-left-img
  if(!bodies.length){
    if(pairs.some(p=>p.caption)) _apGridWithCaptions(pairs,PAD,curY,aW,aH,GAP);
    else _apImgs(images,PAD,curY,aW,aH,GAP);
    return;
  }
  const totalImgW=images.reduce((s,img)=>s+(img.w||200),0);
  const totalTxtW=bodies.reduce((s,b)=>s+(b.w||300),0);
  const imgRatio=Math.min(0.58,Math.max(0.32,totalImgW/(totalImgW+totalTxtW||1)));
  const tW=Math.round((aW-GAP)*(1-imgRatio));
  const iW=aW-tW-GAP;
  _apTexts(bodies,PAD,curY,tW,aH,GAP);
  if(pairs.some(p=>p.caption)) _apGridWithCaptions(pairs,PAD+tW+GAP,curY,iW,aH,GAP);
  else _apImgs(images,PAD+tW+GAP,curY,iW,aH,GAP);
}

function _apCaptionFs(){
  return Math.max(12,Math.round((_apGlobalBodyFs||30)*0.78));
}
function _apCaptionStyle(cap,x,y,w,h){
  const fs=_apCaptionFs();
  const color=_apThemeColor();
  _apSetFs(cap,fs);
  _apSetColor(cap,color);
  _apAlign(cap,'center');
  cap.textRole='caption';
  cap.valign='top';
  cap.x=x; cap.y=y; cap.w=w; cap.h=Math.max(28,h);
}
function _apGridWithCaptions(pairs,ax,ay,aw,ah,gap){
  const n=pairs.length; if(!n) return;
  let cols,rows;
  if(n===1){cols=1;rows=1;}
  else if(n===2){cols=2;rows=1;}
  else if(n<=4){cols=2;rows=2;}
  else if(n<=6){cols=3;rows=2;}
  else{cols=3;rows=Math.ceil(n/3);}
  const cW=Math.floor((aw-gap*(cols-1))/cols);
  const cH=Math.floor((ah-gap*(rows-1))/rows);
  const capFs=_apCaptionFs();
  pairs.forEach((pair,i)=>{
    const col=i%cols,row=Math.floor(i/cols);
    const zx=ax+col*(cW+gap),zy=ay+row*(cH+gap);
    const capH=pair.caption?Math.max(26,Math.round(cH*0.22)):0;
    const imgH=cH-capH-(pair.caption?Math.round(gap*0.4):0);
    _apPut(pair.img,zx,zy,cW,Math.max(40,imgH),false);
    if(pair.caption) _apCaptionStyle(pair.caption,zx,zy+imgH+Math.round(gap*0.4),cW,capH);
  });
}

// ══════════════════════════════════════════════════════════════════
// ТЕКСТ: устанавливаем font-size 30px и позицию
// ══════════════════════════════════════════════════════════════════
// ── Глобальный font-size основного текста для всей презентации ──────
// Вычисляется один раз в autoPlaceAll, применяется через _apTexts
let _apGlobalBodyFs = 30;

function _apCalcGlobalFs(allSlides, W, H, PAD, GAP){
  const PREF=30, MIN=12;
  // Проходим по всем слайдам и ищем минимальный fs при котором влезает везде
  let minFs = PREF;
  allSlides.forEach(s=>{
    const els=(s.els||[]).filter(e=>!e._isDecor&&e.type==='text'&&e.textRole!=='heading');
    if(!els.length) return;
    // Оцениваем доступную зону — примерно 70% ширины и 70% высоты (после заголовка)
    const aw = Math.round((W-PAD*2)*0.7);
    const ah = Math.round(H*0.7);
    const n  = els.length;
    const totalLen = els.reduce((s,e)=>s+_apPlainLen(e), 0);
    if(!totalLen) return;
    // Ищем fs при котором СУММАРНАЯ высота влезает в зону
    for(let fs=PREF; fs>=MIN; fs--){
      const totalH = els.reduce((s,e)=>s+_apEst(e,aw,fs)+10, 0) + GAP*(n-1);
      if(totalH<=ah){ minFs=Math.min(minFs,fs); break; }
      if(fs===MIN) minFs=MIN;
    }
  });
  return Math.max(MIN, minFs);
}

function _apTexts(texts,ax,ay,aw,ah,gap){
  if(!texts.length) return;
  const MIN=12;
  const color=_apThemeColor();

  // Используем глобальный шрифт (одинаковый для всей презентации)
  // но дополнительно проверяем что он влезает в эту зону
  let fs = Math.max(_apGlobalBodyFs||30, 30); // title bodies always >= 30px
  const totalNeed = texts.reduce((s,e)=>s+_apEst(e,aw,fs)+10,0)+gap*(texts.length-1);
  if(totalNeed > ah){
    // Глобальный шрифт не влезает в эту зону — уменьшаем локально
    for(let f=fs-1; f>=MIN; f--){
      const tot=texts.reduce((s,e)=>s+_apEst(e,aw,f)+10,0)+gap*(texts.length-1);
      if(tot<=ah){ fs=f; break; }
      if(f===MIN) fs=MIN;
    }
  }

  // Реальные высоты блоков
  const heights=texts.map(el=>Math.min(_apEst(el,aw,fs)+10, ah));
  const totalH =heights.reduce((s,h)=>s+h,0)+gap*(texts.length-1);
  const scaleH =totalH>ah ? ah/totalH : 1;

  let usedH=0;
  texts.forEach((el,i)=>{
    const blockH=Math.max(MIN*2, Math.round(heights[i]*scaleH));
    _apSetFs(el,fs);
    _apSetColor(el,color);
    // Preserve element's own width if it fits within available area, else use full aw
    const elW = (el.w && el.w >= 100 && el.w <= aw) ? el.w : aw;
    const elX = ax + Math.round((aw - elW) / 2); // center within available area
    el.x=elX; el.y=ay+usedH; el.w=elW; el.h=blockH;
    el.valign='top'; el.textRole='body';
    usedH+=blockH+gap;
  });
}

// ══════════════════════════════════════════════════════════════════
// КАРТИНКИ: только позиция, масштаб если не влезает
// ══════════════════════════════════════════════════════════════════
function _apImgs(imgs,ax,ay,aw,ah,gap){
  const n=imgs.length; if(!n) return;
  let cols,rows;
  if(n===1){cols=1;rows=1;}
  else if(n===2){cols=2;rows=1;}
  else if(n===3){cols=3;rows=1;}
  else if(n===4){cols=2;rows=2;}
  else if(n<=6){cols=3;rows=2;}
  else{cols=4;rows=Math.ceil(n/4);}
  const cW=Math.floor((aw-gap*(cols-1))/cols);
  const cH=Math.floor((ah-gap*(rows-1))/rows);
  imgs.forEach((img,i)=>{
    const col=i%cols,row=Math.floor(i/cols);
    const zx=ax+col*(cW+gap),zy=ay+row*(cH+gap);
    const ow=img.w||cW,oh=img.h||cH;
    if(ow<=cW&&oh<=cH){
      img.x=Math.round(zx+(cW-ow)/2);
      img.y=Math.round(zy+(cH-oh)/2);
    } else {
      const sc=Math.min(cW/ow,cH/oh);
      img.w=Math.round(ow*sc); img.h=Math.round(oh*sc);
      img.x=Math.round(zx+(cW-img.w)/2);
      img.y=Math.round(zy+(cH-img.h)/2);
    }
  });
}

function _apPut(el,zx,zy,zw,zh,scaleText){
  const ow=el.w||200,oh=el.h||100;
  if(el.type==='text'&&scaleText){
    const fs=_apFit(el,zw,zh,30,12);
    _apSetFs(el,fs);
    el.x=Math.round(zx); el.y=Math.round(zy); el.w=Math.round(zw); el.h=Math.round(zh);
  } else {
    if(ow<=zw&&oh<=zh){
      el.x=Math.round(zx+(zw-ow)/2); el.y=Math.round(zy+(zh-oh)/2);
    } else {
      const sc=Math.min(zw/ow,zh/oh);
      el.w=Math.round(ow*sc); el.h=Math.round(oh*sc);
      el.x=Math.round(zx+(zw-el.w)/2); el.y=Math.round(zy+(zh-el.h)/2);
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ══════════════════════════════════════════════════════════════════
// Устанавливает font-size — заменяет существующий или добавляет
function _apSetFs(el,fs){
  if(!el.cs) el.cs='';
  el.cs=el.cs.match(/font-size\s*:/i)
    ? el.cs.replace(/font-size\s*:\s*[^;]+/i,'font-size:'+fs+'px')
    : (el.cs?el.cs.replace(/;$/,'')+';':'')+'font-size:'+fs+'px';
}
function _apSetColor(el,color){
  if(!el.cs) el.cs='';
  el.cs=el.cs.match(/\bcolor\s*:/i)
    ? el.cs.replace(/\bcolor\s*:\s*[^;]+/i,'color:'+color)
    : (el.cs?el.cs.replace(/;$/,'')+';':'')+'color:'+color;
  el.textColorScheme={col:7,row:0};
}
function _apAlign(el,a){
  if(!el.cs) el.cs='';
  el.cs=el.cs.match(/text-align\s*:/i)
    ? el.cs.replace(/text-align\s*:\s*\w+/i,'text-align:'+a)
    : (el.cs?el.cs.replace(/;$/,'')+';':'')+'text-align:'+a;
}
function _apEst(el,w,fs){
  const t=_apPlain(el); if(!t) return 0;
  const brs=(el.html||'').split(/<br\s*\/?>/i).length-1;
  const cpl=Math.max(1,Math.floor(w/(fs*0.56)));
  return (Math.ceil(t.length/cpl)+brs)*Math.round(fs*1.55)+20;
}
function _apFit(el,w,h,pref,min){
  let fs=pref; while(fs>min&&_apEst(el,w,fs)>h-6) fs--; return Math.max(fs,min);
}
function _apPlain(el){
  return (el.html||'').replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}
function _apPlainLen(el){ return _apPlain(el).length; }
// _apFs оставляем как алиас для совместимости
function _apFs(el,fs){ _apSetFs(el,fs); }
