// ══════════════ QUOTE → TEXT BLOCK ══════════════
// Аплет «Цитата»: случайная цитата из банка → обычный редактируемый текст.

const QUOTE_MARGIN = 40;
// Кегль в типографских пунктах (как в панели текста); в HTML — px через 96/72
const QUOTE_PT = 24;
const QUOTE_AUTHOR_PT = 18;
function _quotePtToPx(pt){ return Math.round(+pt * 96 / 72); }
const QUOTE_FS = _quotePtToPx(QUOTE_PT);
const QUOTE_AUTHOR_FS = _quotePtToPx(QUOTE_AUTHOR_PT);

function _quotePickRandom(){
  const bank=(typeof QUOTE_BANK!=='undefined'&&QUOTE_BANK&&QUOTE_BANK.length)?QUOTE_BANK:null;
  if(!bank) return {text:'Красота спасёт мир.', author:'Фёдор Достоевский'};
  const row=bank[Math.floor(Math.random()*bank.length)];
  if(Array.isArray(row)) return {text:String(row[0]||''), author:String(row[1]||'')};
  return {text:String(row.text||row.q||''), author:String(row.author||row.a||'')};
}

function _quoteThemeColor(){
  // Как addText(): светлая тема → тёмный текст, тёмная → светлый
  const ti=typeof appliedThemeIdx!=='undefined'?appliedThemeIdx:-1;
  const theme=(ti>=0&&typeof THEMES!=='undefined')?THEMES[ti]:null;
  const isDark=theme?!!theme.dark:true;
  const scheme={col:7,row:0};
  let color=isDark?'#ffffff':'#000000';
  if(typeof _resolveSchemeColor==='function'&&theme){
    color=_resolveSchemeColor(scheme,theme)||color;
  }
  return {color, scheme, isDark};
}

function _quoteBuildHtml(text, author, color, scheme, opts){
  opts=opts||{};
  const preserve=!!opts.preserveBlockStyle;
  const raw=String(text||'').trim().replace(/^[«»\u201C\u201D\u201E\u275D\u275E"']+|[«»\u201C\u201D\u201E\u275D\u275E"']+$/g,'');
  const q='«'+raw+'»';
  const a=String(author||'').trim();
  const mk=function(str, extra){
    return Array.from(str).map(function(ch){
      const st={};
      // При заполнении существующего блока цвет наследует блок — не пишем в символы
      if(!preserve&&color){
        st.color=color;
        if(scheme) st._schemeRef=scheme;
      }
      if(extra) Object.keys(extra).forEach(function(k){ st[k]=extra[k]; });
      return {ch:ch, style:st};
    });
  };
  // Цитата — курсив 24pt; пустая строка; автор — обычный 18pt
  let chars=mk(q, {fontStyle:'italic', fontSize:QUOTE_FS+'px'});
  const nl1=preserve?{fontSize:QUOTE_FS+'px'}:{color:color, _schemeRef:scheme, fontSize:QUOTE_FS+'px'};
  const nl2=preserve?{fontSize:QUOTE_AUTHOR_FS+'px'}:{color:color, _schemeRef:scheme, fontSize:QUOTE_AUTHOR_FS+'px'};
  chars.push({ch:'\n', style:nl1});
  chars.push({ch:'\n', style:nl2});
  chars=chars.concat(mk(a, {fontStyle:'normal', fontSize:QUOTE_AUTHOR_FS+'px'}));
  if(typeof _charObjsToHtml==='function') return _charObjsToHtml(chars);
  return '<i style="font-size:'+QUOTE_FS+'px">'+q+'</i><br><br><span style="font-size:'+QUOTE_AUTHOR_FS+'px;font-style:normal">'+a+'</span>';
}


/** Подставить новую цитату в выделенный текстовый блок, не меняя его настройки. */
function fillSelectedWithQuote(){
  if(!sel||sel.dataset.type!=='text'){
    if(typeof toast==='function') toast('Выберите текстовый блок','err');
    return;
  }
  const elId=sel.dataset.id;
  if(typeof pushUndo==='function') pushUndo();
  const d=slides[cur]&&slides[cur].els.find(function(e){ return e.id===elId; });
  if(!d||d.type!=='text') return;
  const q=_quotePickRandom();
  d.html=_quoteBuildHtml(q.text, q.author, '', null, {preserveBlockStyle:true});
  const dom=document.getElementById('canvas')&&document.getElementById('canvas').querySelector('[data-id="'+elId+'"]');
  const tel=dom&&(dom.querySelector('.tel')||dom.querySelector('.ec'));
  if(tel){
    tel.innerHTML=d.html;
    if(typeof _rtNormalizeTextDisplay==='function') _rtNormalizeTextDisplay(tel, d.cs||'', d.bulletGap);
    if(typeof _rtUpdateCharCounter==='function') _rtUpdateCharCounter(dom, tel);
  }
  const _finishQuoteFill=function(){
    if(typeof fitTextHeight==='function'){
      try{ fitTextHeight(d); }catch(e){}
      if(dom&&d.h) dom.style.height=d.h+'px';
    }
    // Высота могла вырасти — иначе остаются старая рамка и handles (два прямоугольника)
    if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
    else if(typeof _updateSelFrames==='function') _updateSelFrames();
    if(typeof syncProps==='function') syncProps();
    if(typeof save==='function') save();
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
    if(typeof toast==='function'){
      const short=(q.author||'').slice(0,40);
      toast('Цитата'+(short?': '+short:''),'ok');
    }
  };
  // После смены HTML ждём layout, иначе fit/handles могут разъехаться
  requestAnimationFrame(_finishQuoteFill);
}
window.fillSelectedWithQuote=fillSelectedWithQuote;

function insertQuoteText(){
  if(typeof pushUndo==='function') pushUndo();
  const q=_quotePickRandom();
  const tc=_quoteThemeColor();
  const margin=QUOTE_MARGIN;
  const cw=(typeof canvasW!=='undefined'?canvasW:1200);
  const ch=(typeof canvasH!=='undefined'?canvasH:675);
  // Левая граница — середина слайда; блок занимает правую половину
  const x=(typeof snapV==='function')?snapV(Math.round(cw/2)):Math.round(cw/2);
  const y=(typeof snapV==='function')?snapV(margin):margin;
  const w=(typeof snapV==='function')?snapV(Math.max(120, cw-x-margin)):Math.max(120, cw-x-margin);
  const h=(typeof snapV==='function')?snapV(Math.max(80, Math.min(220, Math.round(ch*0.28)))):Math.max(80, Math.min(220, Math.round(ch*0.28)));
  const html=_quoteBuildHtml(q.text, q.author, tc.color, tc.scheme);
  // Без font-family — как обычный addText(), шрифт по умолчанию
  const cs='font-size:'+QUOTE_FS+'px;font-weight:400;color:'+tc.color+';text-align:right;line-height:1.35;';

  const d={
    id:'e'+(++ec),
    type:'text',
    x:x, y:y, w:w, h:h,
    html:html,
    cs:cs,
    rot:0,
    anims:[],
    textRole:'body',
    textColorScheme:tc.scheme,
    valign:'top'
  };
  slides[cur].els.push(d);
  if(typeof mkEl==='function') mkEl(d);
  const canvas=document.getElementById('canvas');
  const dom=canvas&&canvas.querySelector('[data-id="'+d.id+'"]');
  if(dom&&typeof pick==='function') pick(dom);
  if(typeof fitTextHeight==='function'){
    try{ fitTextHeight(d); }catch(e){}
  }
  if(typeof save==='function') save();
  if(typeof drawThumbs==='function') drawThumbs();
  if(typeof saveState==='function') saveState();
  if(typeof toast==='function'){
    const short=(q.author||'').slice(0,40);
    toast('Цитата'+(short?': '+short:''),'ok');
  }
}
window.insertQuoteText=insertQuoteText;
