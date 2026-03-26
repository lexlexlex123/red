// ══════════════════════════════════════════════════════════════════
// 33b-autoplace.js  v7
// ══════════════════════════════════════════════════════════════════

window.autoPlaceAll = function(){
  if(!slides||!slides.length) return;
  pushUndo();
  if(typeof THEMES!=='undefined'&&THEMES.length){ selTheme=Math.floor(Math.random()*THEMES.length); applyTheme(); pushUndo(); }
  if(typeof LAYOUTS!=='undefined'&&LAYOUTS.length&&typeof applyLayout==='function'){
    if(Math.random()<0.3){ slides.forEach(s=>{s.els=s.els.filter(e=>!e._isDecor);}); selLayout=-1; }
    else applyLayout(Math.floor(Math.random()*LAYOUTS.length),null);
  }
  const headAlign=['center','left','right'][Math.floor(Math.random()*3)];
  const W=canvasW, H=canvasH, PAD=66, GAP=24;

  // Проход 1: сброс форматирования + определение заголовков (метим textRole)
  slides.forEach((s,si)=>_apSlide_prep(s,si===0));

  // Проход 2: вычисляем ГЛОБАЛЬНЫЙ font-size по самому плотному слайду
  _apGlobalBodyFs = _apCalcGlobalFs(slides, W, H, PAD, GAP);

  // Проход 3: размещение с единым шрифтом
  slides.forEach((s,si)=>_apSlide_layout(s,si===0,headAlign));
  // Сохраняем данные в localStorage до рендера (все слайды уже изменены в памяти)
  if(typeof saveState==='function') saveState();
  renderAll();
  // drawThumbs уже вызван в renderAll, но вызовем ещё раз после save
  if(typeof drawThumbs==='function') setTimeout(drawThumbs, 50);
  if(typeof saveState==='function') saveState();
  // Подгоняем высоты текстов по реальному содержимому
  if(typeof _fitAllTextsAllSlides==='function'){
    _fitAllTextsAllSlides(()=>toast('✨ Объекты размещены'));
  } else {
    toast('✨ Объекты размещены');
  }
};

// ── Проход 1: сброс форматирования + определение заголовка ──────────
function _apSlide_prep(s,isTitle){
  const H=canvasH;
  const els=(s.els||[]).filter(e=>!e._isDecor);
  if(!els.length) return;
  const texts=els.filter(e=>e.type==='text');
  // Определяем заголовок ДО сброса (читает оригинальный cs/_origFs)
  const {head,bodies}=_apHeading(texts,s,H,isTitle);
  // Запоминаем для второго прохода
  s._apHead=head; s._apBodies=bodies;
  // Сброс и типографика
  texts.forEach(el=>_apReset(el));
  if(head) _apTypo(head);
  bodies.forEach(b=>_apTypo(b));
}

// ── Проход 2: размещение с глобальным шрифтом ─────────────────────
function _apSlide_layout(s,isTitle,headAlign){
  const W=canvasW,H=canvasH,PAD=66,GAP=24;
  const els=(s.els||[]).filter(e=>!e._isDecor);
  if(!els.length) return;
  const head  =s._apHead||null;
  const bodies=s._apBodies||[];
  const images=els.filter(e=>e.type==='image'||e.type==='svg'||e.type==='icon');
  const tables=els.filter(e=>e.type==='table');
  if(isTitle) _apTitle(head,bodies,images,W,H,PAD,GAP,headAlign);
  else        _apContent(head,bodies,images,tables,W,H,PAD,GAP,headAlign);
  if(head) _apHStyle(head,isTitle?50:40);
  delete s._apHead; delete s._apBodies;
}

// ── Единый вызов (обратная совместимость для applyLayoutVariant) ──
function _apSlide(s,isTitle,headAlign){
  _apSlide_prep(s,isTitle);
  // Без глобального fs — используем локальный
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

  // Случай А: единственный текст → всегда заголовок
  if(byY.length===1){
    const el=byY[0];
    const plain=_apPlain(el).trim();
    const words=wc(el);
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

  // Б0: короткий текст (≤8 слов) в верхней трети — явный заголовок
  for(const el of byY){
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
function _apHStyle(el,fs){
  if(!el.cs) el.cs='';
  el.cs=el.cs
    .replace(/font-size\s*:\s*[^;]+;?/gi,'')
    .replace(/font-weight\s*:\s*[^;]+;?/gi,'')
    .replace(/text-transform\s*:\s*[^;]+;?/gi,'')
    .replace(/\bcolor\s*:\s*[^;]+;?/gi,'');
  const _tc=_apThemeColor();
  el.cs=(el.cs?el.cs.replace(/;$/,'')+';':'')
    +'font-size:'+fs+'px;font-weight:700;text-transform:uppercase;color:'+_tc;
  el.textRole='heading';
  // Сбрасываем схемную ссылку — цвет теперь задан явно из темы
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
function _apTitle(head,bodies,images,W,H,PAD,GAP,align){
  const n=images.length, b=bodies[0]||null;
  if(head&&!b&&n===0){
    // Только заголовок — по центру слайда
    _apSetFs(head,52); _apAlign(head,'center'); head.valign='middle';
    const hH=Math.max(head.h||0, Math.round(H*0.25));
    head.h=hH; head.w=W-PAD*2;
    head.x=PAD; head.y=Math.round((H-hH)/2);
  } else if(head&&b&&n===0){
    // Заголовок + подпись — случайное расположение (сверху/по центру/снизу)
    _apAlign(head,'center'); head.valign='middle';
    _apAlign(b,'center');    b.valign='middle';

    // Высоты с разумными минимумами
    const hH = Math.min(Math.max(head.h||60, Math.round(H*0.16)), Math.round(H*0.3));
    const bH = Math.min(Math.max(b.h||50,   Math.round(H*0.1)),  Math.round(H*0.2));
    head.h = hH; b.h = bH; head.w = W-PAD*2; b.w = W-PAD*2; head.x = PAD; b.x = PAD;

    const totalH = hH + GAP*2 + bH;
    // Три варианта: подпись сверху/по центру (стек)/снизу
    const variant = Math.floor(Math.random()*3);
    if(variant === 0){
      // Вариант A: заголовок по центру, подпись снизу
      head.y = Math.round((H - hH) / 2);
      b.y    = Math.min(H - PAD - bH, head.y + hH + GAP*2);
    } else if(variant === 1){
      // Вариант B: стек по центру слайда
      const sy = Math.max(PAD, Math.round((H - totalH) / 2));
      head.y = sy;
      b.y    = sy + hH + GAP*2;
    } else {
      // Вариант C: подпись сверху, заголовок по центру
      b.y    = PAD;
      head.y = Math.max(b.y + bH + GAP*2, Math.round((H - hH) / 2));
    }
    // Финальная защита — не выходим за границы
    head.y = Math.max(PAD, Math.min(head.y, H - PAD - hH));
    b.y    = Math.max(PAD, Math.min(b.y,    H - PAD - bH));
  } else if(head&&n===1){
    // Заголовок слева, картинка справа
    _apAlign(head,'left'); head.valign='middle';
    const cW=Math.round((W-PAD*2-GAP)/2);
    _apPut(head,PAD,PAD,cW,H-PAD*2,true);
    _apPut(images[0],PAD+cW+GAP,PAD,cW,H-PAD*2,false);
    if(bodies.length) _apTexts(bodies,PAD,head.y+head.h+GAP,cW,H-head.y-head.h-GAP*2-PAD,GAP);
  } else if(head&&n>=2){
    // Заголовок сверху
    _apAlign(head,align); head.valign='middle';
    head.x=PAD; head.y=PAD; head.w=W-PAD*2;
    const imgY=PAD+head.h+GAP;
    if(bodies.length){
      const tW=Math.round((W-PAD*2-GAP)*0.45);
      _apTexts(bodies,PAD,imgY,tW,H-imgY-PAD,GAP);
      _apImgs(images,PAD+tW+GAP,imgY,W-PAD*2-tW-GAP,H-imgY-PAD,GAP);
    } else {
      _apImgs(images,PAD,imgY,W-PAD*2,H-imgY-PAD,GAP);
    }
  } else if(n>=1){
    _apImgs(images,PAD,PAD,W-PAD*2,H-PAD*2,GAP);
  }
}

// ══════════════════════════════════════════════════════════════════
// РАЗМЕЩЕНИЕ — КОНТЕНТНЫЙ СЛАЙД
// ══════════════════════════════════════════════════════════════════
function _apContent(head,bodies,images,tables,W,H,PAD,GAP,align){
  let curY=PAD;
  if(head){
    _apAlign(head,align); head.valign='middle';
    head.x=PAD; head.y=curY; head.w=W-PAD*2;
    if(!head.h||head.h<40) head.h=Math.round(H*0.16);
    curY+=head.h+GAP;
  }
  const aH=H-curY-PAD, aW=W-PAD*2;
  const n=images.length;
  const txtLen=bodies.reduce((s,e)=>s+_apPlainLen(e),0);
  const big=txtLen>220;

  if(tables.length){
    const tH=Math.max(40,Math.floor((aH-GAP*(tables.length-1))/tables.length));
    tables.forEach((t,i)=>{t.x=PAD;t.y=curY+i*(tH+GAP);t.w=aW;t.h=tH;});
    return;
  }
  if(n===0){ _apTexts(bodies,PAD,curY,aW,aH,GAP); return; }
  if(!bodies.length){ _apImgs(images,PAD,curY,aW,aH,GAP); return; }

  // Вычисляем пропорцию из реальных размеров
  const totalImgW=images.reduce((s,img)=>s+(img.w||200),0);
  const totalTxtW=bodies.reduce((s,b)=>s+(b.w||300),0);
  const imgRatio=Math.min(0.65,Math.max(0.3,totalImgW/(totalImgW+totalTxtW)));

  if(!big){
    // Текст слева, картинки справа
    const tW=Math.round((aW-GAP)*(1-imgRatio));
    _apTexts(bodies,PAD,curY,tW,aH,GAP);
    _apImgs(images,PAD+tW+GAP,curY,aW-tW-GAP,aH,GAP);
  } else {
    // Много текста → картинки сверху
    const bestH=images.reduce((m,i)=>Math.max(m,i.h||200),0);
    const iH=Math.min(Math.round(aH*0.42),bestH+GAP);
    _apImgs(images,PAD,curY,aW,iH,GAP);
    _apTexts(bodies,PAD,curY+iH+GAP,aW,aH-iH-GAP,GAP);
  }
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
  let fs = _apGlobalBodyFs||30;
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
    el.x=ax; el.y=ay+usedH; el.w=aw; el.h=blockH;
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
