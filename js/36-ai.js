// ══════════════ AI АССИСТЕНТ ══════════════
// Использует Anthropic API для управления редактором через команды

(function(){

// ── Константы ──────────────────────────────────────────────────────────────
const AI_THEMES = ['Ocean Night','Midnight','Neon City','Coral Blaze','Forest Deep','Solar Flare','Rose Gold','Arctic Blue','Sage Night','Citrus Dark','Crimson','Deep Teal','Slate Storm','Aurora','Copper','Galaxy','Clean White','Warm Paper','Soft Indigo','Mint Fresh','Rose Petal','Sky Day','Corporate','Lavender','Peach','Slate Clean','Teal Light','Newspaper','Sakura','Lemon','Olive','Navy Gold','Obsidian','Blood Moon','Matrix','Ocean Deep','Void'];
const AI_LAYOUTS = ['Призма','Аврора','Взрыв','Схема','Оригами','Ореол','Аркада','Закат','Слои','Кристалл','Метро','Рельеф','Космос','Океан','Огонь','Пустыня','Матрица'];

// ── Состояние чата ──────────────────────────────────────────────────────────
let _history = []; // {role, content}[]
let _thinking = false;
let _panel = null;
let _log = [];   // лог всех сессий

// Загружаем лог из localStorage
try { _log = JSON.parse(localStorage.getItem('sf-ai-log')||'[]'); } catch(e){ _log=[]; }

// Groq API — бесплатный, быстрый, поддерживает русский
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant'; // бесплатная, быстрая, хорошо следует инструкциям
let _modelReady = false;

function _getGroqKey(){
  // Сначала из файла ai-config.json (загружается при старте)
  if(window._aiConfigKey) return window._aiConfigKey;
  return localStorage.getItem('sf-groq-key') || '';
}
function _setGroqKey(val){
  localStorage.setItem('sf-groq-key', val);
  window._aiConfigKey = null; // localStorage приоритетнее после ручного ввода
}

// Загружаем ключ из ai-config.json если есть
(function _loadConfigKey(){
  if(location.protocol === 'file:') return;
  fetch('./ai-config.json?_=' + Date.now())
    .then(r => r.ok ? r.json() : null)
    .then(cfg => {
      if(cfg && cfg.groq_api_key){
        window._aiConfigKey = cfg.groq_api_key;
        // Обновляем UI если панель уже открыта
        const hint = document.getElementById('ai-status-hint');
        if(hint && !localStorage.getItem('sf-groq-key')){
          hint.style.color = '#34d399';
          hint.textContent = '✓ Groq готов (ai-config.json) · ' + GROQ_MODEL;
        }
        window._modelReady = true;
      }
    })
    .catch(()=>{}); // файла нет — не страшно
})();


// ── Системный промпт ─────────────────────────────────────────────────────────
function _sysPrompt(){
  const slideIdx = (typeof cur !== 'undefined') ? cur : 0;
  const total = (typeof slides !== 'undefined') ? slides.length : 1;
  const themes = AI_THEMES.join(', ');
  const layouts = AI_LAYOUTS.join(', ');

  let slideContext = '';
  try{
    const s = (typeof slides !== 'undefined') ? slides[slideIdx] : null;
    if(s && s.els && s.els.length){
      const txts = s.els.filter(e=>e.type==='text').map(e=>{
        const txt = (e.html||'').replace(/<[^>]*>/g,'').slice(0,60);
        return (e.textRole||'text') + ': "' + txt + '"';
      });
      if(txts.length) slideContext = '\nТекущий слайд содержит: ' + txts.join('; ');
    }
  }catch(ex){}

  return `Ты ассистент редактора презентаций. Управляй через JSON-команды.
Текущий слайд: ${slideIdx+1} из ${total}.${slideContext}

ПРАВИЛА:
1. Отвечай ТОЛЬКО JSON-массивом []. Никакого текста до массива. Пояснение ТОЛЬКО после |||
2. Каждый слайд = addSlide + addTitle + addBody.
3. ТЕКСТ НА СЛАЙДЕ: максимум 3-4 коротких предложения (40-60 слов) в addBody. Если информации много — раздели на несколько слайдов.
4. ЗАГОЛОВОК: максимум 5-6 слов, конкретный и ёмкий.
5. Лучше больше слайдов с кратким текстом, чем один перегруженный.
6. Текст информативный — реальные факты, не заглушки.
7. clearAll ТОЛЬКО для создания НОВОЙ презентации. НЕ используй для редактирования!
8. 'убери лишний текст', 'сократи' -> editText(role=body, text=краткий_текст) на текущем слайде.

СЦЕНАРИИ:
- "убери лишний текст / оставь только необходимое / сократи текст" -> editText(role=body, text=<сокращённый текст>) — НЕ clearAll!
- "поменяй/измени текст/заголовок/формулу на X" -> editText(role=heading|body, text=X)
- "переведи на язык X" -> goSlide(n=1)+editText(role=heading,text=...)+editText(role=body,text=...) для каждого слайда
- "сделай отступы больше/шире" -> setPadding(padding=60)
- "измени размер шрифта на N" -> setFontSize(size=N, role=heading|body)
- "удали элемент/объект" -> deleteEl
- "удали этот слайд" -> delSlide
- "удали слайд N" -> goSlide(n=N) + delSlide
- "удали все/начни заново/очисти" -> clearAll
- "добавь слайд" -> addSlide + addTitle + addBody
- "создай N слайдов о X" -> clearAll + N*(addSlide+addTitle+addBody)
- "дублируй слайд" -> dupSlide
- "переставь слайд N на M" -> moveSlide(from=N, to=M)
- "перейди на слайд N" -> goSlide(n=N)
- "измени тему" -> setTheme(name=...)
- "применить стиль ко всем" -> applyStyleAll(theme=...,layout=...)
- "добавь формулу" -> addFormula(latex=...)
- "добавь нумерацию" -> addPageNum
- "убери нумерацию" -> removePageNum
- "передвинь" -> moveEl(x=...,y=...)
- "измени размер" -> resizeEl(w=...,h=...)
- "измени цвет текста" -> setTextColor(color=#hex,role=heading|body)
- "сделай жирным" -> setTextBold(bold=true,role=heading|body)
- "выровняй" -> setTextAlign(align=left|center|right|justify,role=heading|body)
- "добавь переход" -> setTransition(name=fade|slide|zoom|cube|flip|glitch|dissolve|none)
- "убери переходы" -> setTransition(name=none)

КОМАНДЫ:

clearAll - удалить все слайды
{"cmd":"clearAll"}

addSlide - добавить слайд
{"cmd":"addSlide"}

addTitle - заголовок (МАКСИМУМ 5-6 слов)
{"cmd":"addTitle","text":"Краткий заголовок"}

addBody - основной текст (МАКСИМУМ 3-4 предложения, 40-60 слов)
{"cmd":"addBody","text":"Короткий информативный текст. Только ключевые факты. Без воды."}

editText - изменить текст существующего элемента
{"cmd":"editText","role":"heading","text":"Новый заголовок"}
{"cmd":"editText","role":"body","text":"Новый текст"}

setPadding - отступы у всех текстов
{"cmd":"setPadding","padding":60}

setFontSize - размер шрифта
{"cmd":"setFontSize","size":24,"role":"body"}

goSlide - перейти на слайд N (1-based)
{"cmd":"goSlide","n":2}

delSlide - удалить текущий слайд
{"cmd":"delSlide"}

dupSlide - дублировать текущий слайд
{"cmd":"dupSlide"}

moveSlide - переместить слайд
{"cmd":"moveSlide","from":2,"to":4}

deleteEl - удалить выбранный элемент
{"cmd":"deleteEl"}

moveEl, resizeEl, setTextColor, setTextBold, setTextAlign - редактирование элементов
{"cmd":"moveEl","x":100,"y":200}
{"cmd":"resizeEl","w":400,"h":200}
{"cmd":"setTextColor","color":"#ff0000","role":"heading"}
{"cmd":"setTextBold","bold":true,"role":"heading"}
{"cmd":"setTextAlign","align":"center","role":"heading"}

addIcon - иконка по теме
{"cmd":"addIcon","iconId":"bio_photosyn","size":120}
Иконки: bio_photosyn, bio_cell, bio_leaf, bio_dna3, sci_atom2, sci_beaker, sci_earth, sun, leaf, tree, flame, globe2, bulb, book_open, atom, flask, microscope

setLayout, setTheme, applyStyleAll, setTransition, addFormula, addPageNum, removePageNum
{"cmd":"setLayout","name":"Аврора"}
{"cmd":"setTheme","name":"Ocean Night"}
{"cmd":"applyStyleAll","theme":"Ocean Night","layout":"Аврора"}
{"cmd":"setTransition","name":"fade"}
{"cmd":"addFormula","latex":"x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}"}
{"cmd":"addPageNum","style":"circle","position":"br"}
{"cmd":"removePageNum"}

Темы: ${themes}
Макеты: ${layouts}

ПОРЯДОК для каждого нового слайда: addSlide → addIcon (опц.) → addTitle → addBody → setLayout (опц.)

ПРИМЕР — "3 слайда о фотосинтезе" (ПРАВИЛЬНЫЙ объём текста):
[
{"cmd":"clearAll"},
{"cmd":"addSlide"},
{"cmd":"addTitle","text":"Что такое фотосинтез"},
{"cmd":"addBody","text":"Фотосинтез — преобразование световой энергии в химическую. Происходит в хлоропластах. Уравнение: 6CO₂ + 6H₂O + свет → C₆H₁₂O₆ + 6O₂."},
{"cmd":"addSlide"},
{"cmd":"addTitle","text":"Хлоропласты и хлорофилл"},
{"cmd":"addBody","text":"Хлоропласты содержат хлорофилл — зелёный пигмент. Поглощает красный и синий свет, отражает зелёный. Именно поэтому растения зелёные."},
{"cmd":"addSlide"},
{"cmd":"addTitle","text":"Значение для жизни"},
{"cmd":"addBody","text":"Фотосинтез — основа жизни на Земле. Производит кислород для дыхания и органику для питания всех живых существ."}
]|||Создал 3 слайда о фотосинтезе с кратким текстом на каждом.`;
}

// ── AI Backend: WebLLM (приоритет) или Groq ──────────────────────────────────

async function _callAI(userMsg){
  _history.push({role:'user', content: userMsg});

  const _isPres = /\u0441\u043e\u0437\u0434\u0430\u0439|\u043d\u0430\u043f\u0438\u0448\u0438|\u0441\u0434\u0435\u043b\u0430\u0439|\u043f\u0440\u0438\u0434\u0443\u043c\u0430\u0439|\u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u044c/i.test(userMsg) &&
                  /\u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446|\u0441\u043b\u0430\u0439\u0434/i.test(userMsg);

  // Groq — если есть ключ И (нет WebLLM ИЛИ пользователь выбрал Groq)
  const key = _getGroqKey();
  if(key && (window._aiUseGroq || !window._webllmReady)){
    // Фильтруем историю: чередуем user/assistant, убираем дубли
    const _cleanHistory = [];
    let _lastRole = 'system';
    for(const h of _history){
      if(h.role === _lastRole) continue; // пропускаем два подряд одинаковых
      _cleanHistory.push({role:h.role, content:h.content});
      _lastRole = h.role;
    }
    // Последнее сообщение должно быть от user
    while(_cleanHistory.length && _cleanHistory[_cleanHistory.length-1].role !== 'user'){
      _cleanHistory.pop();
    }
    const resp = await fetch(GROQ_URL, {
      method:'POST',
      headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},
      body: JSON.stringify({model:GROQ_MODEL,
        messages:[{role:'system',content:_sysPrompt()},..._cleanHistory],
        temperature:0.3, max_tokens:4000, stream:false})
    });
    if(!resp.ok){const e=await resp.json().catch(()=>({error:{message:resp.statusText}}));throw new Error(e?.error?.message||resp.statusText);}
    const data=await resp.json();
    const txt=data.choices?.[0]?.message?.content||'';
    _history[_history.length-1]={role:'assistant',content:txt};
    return txt;
  }

  // WebLLM
  if(window._webllmReady && window._webllmEngine){
    if(_isPres){
      // Презентация — строгий промпт
      const _t=userMsg.replace(/[\u0430-\u044f\s]+?(\u0441\u043e\u0437\u0434\u0430\u0439|\u043d\u0430\u043f\u0438\u0448\u0438|\u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044e|\u0441\u043b\u0430\u0439\u0434\u044b|\u043d\u0430\s\d+\s\u0441\u043b\u0430\u0439\u0434|\u043d\u0435\u0441\u043a\u043e\u043b\u044c\u043a\u043e)/gi,'').replace(/\s+/g,' ').trim()||'\u0442\u0435\u043c\u0430';
      const _nm=userMsg.match(/(\d+)/);
      const _n=Math.min(Math.max(_nm?+_nm[1]:4,3),6);
      const _sys='You are a JSON generator. Output ONLY a valid JSON array, nothing else. '+
        'Create '+_n+' slides about "'+_t+'" in Russian. '+
        'REQUIRED FORMAT: [{"cmd":"clearAll"},{"cmd":"addSlide"},{"cmd":"addTitle","text":"ЗАГОЛОВОК"},{"cmd":"addBody","text":"ТЕКСТ"},{"cmd":"addSlide"},{"cmd":"addTitle","text":"ЗАГОЛОВОК2"},{"cmd":"addBody","text":"ТЕКСТ2"},...] '+
        'Rules: addTitle = max 5 Russian words. addBody = max 2 Russian sentences. Always start with clearAll.';
      const _s=await window._webllmEngine.chat.completions.create({
        messages:[
          {role:'system',content:_sys},
          {role:'user',content:'Generate JSON array for '+_n+' slides about "'+_t+'" in Russian. Start with [{"cmd":"clearAll"}'}
        ],
        temperature:0.05,max_tokens:1800,stream:true
      });
      let _r='';
      for await(const _c of _s){ if(_stopRequested) break; _r+=_c.choices[0]?.delta?.content||''; }
      // Обрезаем до нужного числа слайдов — убираем повторы
      _r = _limitSlides(_r, _n);
      _history[_history.length-1]={role:'assistant',content:_r};
      return _r;
    }
    // Обычные команды
    const _sys2=window._webllmSysPrompt||'Output ONLY a JSON array.';
    let _ctx='';
    try{if(typeof slides!=='undefined'&&slides.length){
      _ctx=' Slides:'+slides.slice(0,4).map((s,i)=>'S'+(i+1)+'{'+
        (s.els||[]).filter(e=>e.type==='text').map(e=>(e.textRole==='heading'?'H':'B')+':\"'+(e.html||'').replace(/<[^>]*>/g,'').slice(0,30)+'\"').join(';')+'}').join(' ');
    }}catch(_e){}
    const _s2=await window._webllmEngine.chat.completions.create({
      messages:[{role:'system',content:_sys2+_ctx},..._history.slice(-4).map(h=>({role:h.role,content:h.content}))],
      temperature:0.2,max_tokens:1500,stream:true
    });
    let _r2='';
    for await(const _c2 of _s2){
      if(_stopRequested) break;
      _r2+=_c2.choices[0]?.delta?.content||'';
    }
    _history[_history.length-1]={role:'assistant',content:_r2};
    return _r2;
  }

  throw new Error('NO_KEY');
}


// ── Парсинг ответа ──────────────────────────────────────────────────────────
// Обрезает JSON массив до нужного кол-ва слайдов (addSlide = 1 слайд)
function _limitSlides(raw, maxSlides){
  try{
    // Вырезаем массив
    const s = raw.indexOf('[');
    const e = raw.lastIndexOf(']');
    if(s < 0 || e < 0) return raw;
    const arr = JSON.parse(raw.slice(s, e+1));
    if(!Array.isArray(arr)) return raw;
    // Считаем addSlide и обрезаем
    let slideCount = 0;
    const trimmed = [];
    for(const cmd of arr){
      if(cmd.cmd === 'addSlide'){
        slideCount++;
        if(slideCount > maxSlides) break;
      }
      trimmed.push(cmd);
    }
    return JSON.stringify(trimmed);
  }catch(e){ return raw; }
}

function _parseResponse(text){
  let cmds = null;
  let msg = null;
  let searchText = text;

  // Отделяем текст после |||
  const pipeIdx = text.indexOf('|||');
  if(pipeIdx >= 0){
    searchText = text.slice(0, pipeIdx);
    msg = text.slice(pipeIdx + 3).trim();
  }

  // Пробуем найти JSON — сначала массив [...], потом объект {...}
  const tryParse = (str) => {
    // Ищем первый [ и последний ] — берём весь массив целиком
    const arrStart = str.indexOf('[');
    const arrEnd   = str.lastIndexOf(']');
    if(arrStart >= 0 && arrEnd > arrStart){
      const candidate = str.slice(arrStart, arrEnd + 1);
      try{ const r = JSON.parse(candidate); if(Array.isArray(r) && r.length) return r; }catch(e){}
    }
    // Одиночный объект команды
    const objStart = str.indexOf('{');
    const objEnd   = str.lastIndexOf('}');
    if(objStart >= 0 && objEnd > objStart){
      const candidate = str.slice(objStart, objEnd + 1);
      try{ const r = JSON.parse(candidate); if(r.cmd) return [r]; }catch(e){}
    }
    // Несколько объектов подряд (fallback)
    const multi = [];
    const re = /\{[^{}]*\}/g;
    let m;
    while((m = re.exec(str)) !== null){
      try{ const r = JSON.parse(m[0]); if(r.cmd) multi.push(r); }catch(e){}
    }
    if(multi.length) return multi;
    return null;
  };

  cmds = tryParse(searchText);

  // Если JSON не нашли — весь текст это сообщение
  if(!cmds && !msg) msg = text;

  return {cmds, msg};
}


// ── UI ──────────────────────────────────────────────────────────────────────
function _createUI(){
  // Кнопка-триггер
  const btn = document.createElement('button');
  btn.id = 'ai-fab';
  btn.title = 'AI Ассистент';
  btn.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
    <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h1a3 3 0 0 1 3 3v1h1a1 1 0 0 1 0 2h-1v1a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-1H5a1 1 0 0 1 0-2h1v-1a3 3 0 0 1 3-3h1V9.5A4 4 0 0 1 12 2z"/>
    <circle cx="10" cy="15" r="1" fill="currentColor" stroke="none"/>
    <circle cx="14" cy="15" r="1" fill="currentColor" stroke="none"/>
  </svg>`;
  btn.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9000;
    width:48px; height:48px; border-radius:50%; border:none;
    background:linear-gradient(135deg,#6366f1,#a855f7);
    color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 20px rgba(99,102,241,.5);
    transition:transform .15s, box-shadow .15s;
  `;
  btn.onmouseenter = ()=>{ btn.style.transform='scale(1.1)'; btn.style.boxShadow='0 6px 28px rgba(99,102,241,.7)'; };
  btn.onmouseleave = ()=>{ btn.style.transform=''; btn.style.boxShadow='0 4px 20px rgba(99,102,241,.5)'; };

  // Панель чата
  const panel = document.createElement('div');
  panel.id = 'ai-panel';
  panel.style.cssText = `
    position:fixed; bottom:84px; right:24px; z-index:9001;
    width:360px; height:480px; border-radius:14px;
    background:var(--surface); border:1px solid var(--border2);
    box-shadow:0 8px 40px rgba(0,0,0,.5);
    display:none; flex-direction:column; overflow:hidden;
    font-family:inherit; font-size:13px;
  `;

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--border1,rgba(255,255,255,.1));background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(168,85,247,.12))">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
        </div>
        <span style="font-weight:600;color:var(--text1)">AI Ассистент</span>
        <span id="ai-status" style="font-size:10px;color:#6366f1;display:none">●&nbsp;думает...</span>
      </div>
      <div style="display:flex;align-items:center;gap:4px">
        <button id="ai-log-btn" title="Лог ассистента" style="background:none;border:none;color:var(--text3,#64748b);cursor:pointer;padding:4px;display:flex;align-items:center;border-radius:4px;font-size:10px;gap:3px" onmouseenter="this.style.color='#818cf8'" onmouseleave="this.style.color='var(--text3,#64748b)'">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Лог
        </button>
        <button id="ai-close" style="background:none;border:none;color:var(--text3,#64748b);cursor:pointer;padding:2px;display:flex;align-items:center;border-radius:4px" onmouseenter="this.style.color='var(--text1,#e2e8f0)'" onmouseleave="this.style.color='var(--text3,#64748b)'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
    <div id="ai-messages" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;scroll-behavior:smooth">
      <div id="ai-init-msg"></div>
    </div>
    <div style="padding:8px 10px;border-top:1px solid var(--border1,rgba(255,255,255,.1));display:flex;gap:6px">
      <textarea id="ai-input" rows="2" placeholder="Создай 3 слайда о фотосинтезе..." style="flex:1;background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:6px 10px;color:var(--text1);font-family:inherit;font-size:12px;resize:none;outline:none;line-height:1.4"></textarea>
      <div style="display:flex;flex-direction:column;gap:4px;align-self:flex-end;flex-shrink:0">
        <button id="ai-mic" title="Диктовка" onclick="window._aiDictationToggle()"
          style="width:36px;height:36px;border-radius:8px;border:none;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <rect x="9" y="2" width="6" height="11" rx="3"/>
            <path d="M5 10a7 7 0 0 0 14 0"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        <button id="ai-send" style="width:36px;height:36px;border-radius:8px;border:none;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>
        </button>
      </div>
    </div>
    <div style="padding:2px 12px 8px;display:flex;gap:6px;flex-wrap:wrap">
      <button id="ai-model-chip" class="ai-chip" onclick="_aiSwitchModel()" style="border-color:rgba(139,92,246,.5);color:#a78bfa;background:rgba(139,92,246,.1)">🧠 WebLLM</button>
      <button id="ai-clear-chat" class="ai-chip" title="Очистить историю чата" style="border-color:rgba(248,113,113,.4);color:#f87171;background:rgba(248,113,113,.08)">🗑 Чат</button>
    </div>
  `;

  document.head.insertAdjacentHTML('beforeend', `<style>
    .ai-chip {
      font-size:10px; padding:3px 8px; border-radius:20px;
      background:rgba(99,102,241,.15); border:1px solid rgba(99,102,241,.3);
      color:#818cf8; cursor:pointer; transition:background .15s;
    }
    .ai-chip:hover { background:rgba(99,102,241,.3); }
    #ai-messages::-webkit-scrollbar { width:4px; }
    #ai-messages::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }
  </style>`);

  document.body.appendChild(btn);
  document.body.appendChild(panel);
  _panel = panel;

  // Восстанавливаем историю чата из localStorage
  (function _restoreChat(){
    try{
      const saved = JSON.parse(localStorage.getItem('sf-ai-chat')||'[]');
      const msgs = document.getElementById('ai-messages');
      const initMsg = document.getElementById('ai-init-msg');
      if(!msgs) return;
      if(!saved.length){
        // Нет истории — показываем приветствие
        if(initMsg) initMsg.innerHTML = '<div class="ai-msg ai-msg-bot" style="background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.2);border-radius:10px;padding:8px 12px;color:var(--text1);line-height:1.5;max-width:90%">Привет! Я помогу с презентацией 🎨<br><br><span id="ai-status-hint" style="font-size:11px;color:#fbbf24">⚙ Нажми <b>⚙ Ключ</b> и вставь бесплатный Groq API ключ</span></div>';
        return;
      }
      // Есть история — скрываем init-msg, показываем историю
      if(initMsg) initMsg.style.display = 'none';
      saved.forEach(item=>{
        // Фильтруем устаревшие ошибочные сообщения
        if(item.role !== 'user' && item.html &&
           (item.html.includes('Groq недоступен при открытии через file://') ||
            item.html.includes('локальный сервер') ||
            item.html.includes('Live Server'))){
          return; // пропускаем
        }
        const div = document.createElement('div');
        div.dataset.chatRole = item.role;
        if(item.role==='log'){
          div.style.cssText='font-size:10px;color:#64748b;padding:2px 4px;line-height:1.6';
          div.innerHTML = item.html;
        } else if(item.role==='user'){
          div.style.cssText='position:relative;background:rgba(168,85,247,.2);border:1px solid rgba(168,85,247,.25);border-radius:10px;padding:8px 12px;color:var(--text1);line-height:1.5;max-width:90%;align-self:flex-end;margin-left:auto;white-space:pre-wrap';
          // Сначала ставим innerHTML — потом добавляем кнопку (иначе innerHTML сотрёт кнопку)
          div.innerHTML = item.html;
          const _rText = div.textContent.trim();
          const _rBtn = document.createElement('button');
          _rBtn.title = 'Повторить команду';
          _rBtn.style.cssText = 'position:absolute;top:4px;left:-28px;background:none;border:none;cursor:pointer;opacity:0;transition:opacity .15s;padding:3px;border-radius:5px;color:rgba(168,85,247,.7);line-height:1;';
          _rBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>';
          _rBtn.addEventListener('click', ()=>{ const inp=document.getElementById('ai-input'); if(inp){inp.value=_rText;inp.focus();} });
          div.addEventListener('mouseenter', ()=>{ _rBtn.style.opacity='1'; });
          div.addEventListener('mouseleave', ()=>{ _rBtn.style.opacity='0'; });
          div.appendChild(_rBtn);
        } else {
          div.style.cssText='background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.2);border-radius:10px;padding:8px 12px;color:var(--text1);line-height:1.5;max-width:90%;white-space:pre-wrap';
          div.innerHTML = item.html;
        }
        msgs.appendChild(div);
      });
      msgs.scrollTop = msgs.scrollHeight;
      // После восстановления — обновляем статус-hint актуальными данными
      // (сохранённый hint может быть устаревшим)
      const _savedModelId = (()=>{try{return JSON.parse(localStorage.getItem('sf_webllm_cfg')||'{}').modelId||'';}catch(e){return '';}})();
      const _hint = document.getElementById('ai-status-hint');
      if(_hint && _savedModelId){
        _hint.style.color='#a78bfa';
        _hint.textContent='⏳ Восстанавливаю · '+_savedModelId.split('-').slice(0,3).join('-')+'...';
      }
      // Восстанавливаем состояние панели
      if(localStorage.getItem('sf-ai-panel-open')==='1'){
        panel.style.display='flex';
      }
      // Обновляем чип после восстановления
      setTimeout(()=>{ if(typeof _updateModelChip==='function') _updateModelChip(); }, 100);
    }catch(e){}
  })();

  // Событие кнопки
  btn.onclick = () => {
    const vis = panel.style.display === 'flex';
    panel.style.display = vis ? 'none' : 'flex';
    if(!vis) document.getElementById('ai-input').focus();
  };
  document.getElementById('ai-close').onclick = () => { panel.style.display='none'; try{localStorage.setItem('sf-ai-panel-open','0');}catch(e){} };

  // Кнопка очистить чат
  document.getElementById('ai-clear-chat').onclick = () => {
    const msgs = document.getElementById('ai-messages');
    const initMsg = document.getElementById('ai-init-msg');
    if(msgs){
      // Удаляем все кроме init-msg
      Array.from(msgs.children).forEach(ch => { if(ch.id !== 'ai-init-msg') ch.remove(); });
    }
    // Показываем приветствие
    if(initMsg){
      initMsg.style.display = '';
      initMsg.innerHTML = '<div style="background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.2);border-radius:10px;padding:8px 12px;color:var(--text1);line-height:1.5;max-width:90%">Привет! Я помогу с презентацией 🎨<br><br><span id="ai-status-hint" style="font-size:11px;color:#fbbf24">⚙ Нажми <b>⚙ Ключ</b> и вставь бесплатный Groq API ключ</span></div>';
    }
    _history = [];
    try{ localStorage.removeItem('sf-ai-chat'); }catch(e){}
  };
  document.getElementById('ai-log-btn').onclick = () => { _showLog(); };

  // Fab click — просто открывает/закрывает панель
  document.getElementById('ai-fab').onclick = function(){
    const vis = _panel.style.display === 'flex';
    _panel.style.display = vis ? 'none' : 'flex';
    try{ localStorage.setItem('sf-ai-panel-open', vis ? '0' : '1'); }catch(e){}
    if(!vis){
      document.getElementById('ai-input').focus();
      if(typeof _updateModelChip==='function') _updateModelChip();
      // Обновляем статус ключа
      const hint = document.getElementById('ai-status-hint');
      const key = _getGroqKey();
      if(window._webllmReady){
        if(hint){ hint.style.color='#a78bfa'; hint.textContent='✓ WebLLM · ' + (window._webllmModelId||'загружена'); }
        if(typeof _updateModelChip==='function') _updateModelChip();
        _modelReady=true;
      } else if(key && hint){
        hint.style.color='#34d399'; hint.textContent='✓ Groq готов · ' + GROQ_MODEL; _modelReady=true;
      }
    }
  };

  // Автовосстановление WebLLM после перезагрузки страницы
  (async function _autoRestoreWebLLM(){
    try{
      const cfg = JSON.parse(localStorage.getItem('sf_webllm_cfg')||'{}');
      if(!cfg.modelId){
        // Первый запуск — показываем актуальный статус чипа
        if(typeof _updateModelChip==='function') _updateModelChip();
        return;
      }
      // Синхронно помечаем modelId — форма выбора откроется с правильной моделью
      window._webllmModelId = cfg.modelId;
      // Модель была загружена ранее — показываем статус ожидания и восстанавливаем
      const hint = document.getElementById('ai-status-hint');
      const chip = document.getElementById('ai-model-chip');
      if(hint){ hint.style.color='#a78bfa'; hint.textContent='⏳ Восстанавливаю WebLLM (' + cfg.modelId.split('-').slice(0,3).join('-') + ')...'; }
      if(chip){ chip.textContent='⏳ WebLLM'; chip.style.borderColor='rgba(139,92,246,.5)'; chip.style.color='#a78bfa'; }

      if(!navigator.onLine){ throw new Error('Нет интернета — WebLLM недоступен'); }
      const { CreateMLCEngine } = await (async () => {
        // 1. Уже загружен как обычный скрипт (libs/web-llm/web-llm-iife.js)
        if(window._WebLLM && window._WebLLM.CreateMLCEngine) return window._WebLLM;
        // 2. Fallback CDN если онлайн
        if(navigator.onLine){
          try {
            const mod = await import('https://esm.run/@mlc-ai/web-llm');
            window._WebLLM = mod;
            return mod;
          } catch(e) {}
        }
        throw new Error('WebLLM недоступен. Проверьте наличие libs/web-llm/web-llm-iife.js');
      })();
      const engine = await CreateMLCEngine(cfg.modelId, {
        initProgressCallback:(p)=>{},
      });

      window._webllmEngine   = engine;
      window._webllmReady    = true;
      window._webllmModelId  = cfg.modelId;
      window._aiUseGroq = false; // WebLLM загружен — по умолчанию используем его
      if(typeof _updateModelChip==='function') _updateModelChip();
      window._webllmSysPrompt = `You are a JSON-only presentation assistant. OUTPUT ONLY A JSON ARRAY — start with [ end with ].
NO text before or after the array. NO markdown. ONLY valid JSON array.

COMMANDS: clearAll, addSlide, addTitle(text), addBody(text), editText(role,text), goSlide(n), delSlide, dupSlide, addFormula(latex), setTheme(name), setLayout(name), setTransition(name), setPadding(padding), setFontSize(size,role), setTextColor(color,role), addPageNum(style,position), removePageNum, moveEl(x,y).

RULES:
- New presentation: start with clearAll then add slides.
- Each slide: addSlide + addTitle + addBody.
- addTitle: MAX 5-6 words.
- addBody: MAX 3-4 short sentences (40-60 words). If more info needed — use more slides instead.
- NEVER put long paragraphs in one slide. Split into multiple slides.
- NEVER use clearAll when editing existing slides — only for NEW presentations.
- "remove extra text", "shorten", "keep only important" -> editText(role=body, text=short_text)
- To edit existing text: goSlide(n) + editText(role,text).
- To translate: goSlide(1)+editText(role,translated) for each slide.
- Use Russian for text unless asked otherwise.

IMPORTANT: "write presentation about X", "create slides about X", "make presentation" = clearAll + multiple addSlide+addTitle+addBody. MINIMUM 3 slides.

EXAMPLES:
"write presentation about hats" (4 slides): [{"cmd":"clearAll"},{"cmd":"addSlide"},{"cmd":"addTitle","text":"Шляпы в истории"},{"cmd":"addBody","text":"Шляпы известны с древних времён. Они защищали от солнца и дождя. Каждая эпоха имела свои фасоны."},{"cmd":"addSlide"},{"cmd":"addTitle","text":"Виды шляп"},{"cmd":"addBody","text":"Цилиндр, котелок, федора, бейсболка. Каждый стиль отражает свою культуру и время."},{"cmd":"addSlide"},{"cmd":"addTitle","text":"Шляпы и мода"},{"cmd":"addBody","text":"В XIX веке шляпа была обязательным атрибутом. Дизайнеры создают уникальные модели до сих пор."},{"cmd":"addSlide"},{"cmd":"addTitle","text":"Шляпы сегодня"},{"cmd":"addBody","text":"Шляпы остаются символом стиля. Используются в моде, театре и повседневной жизни."}]
Edit text: [{"cmd":"editText","role":"heading","text":"New title"}]
Trim text: [{"cmd":"editText","role":"body","text":"Краткий текст без лишних слов."}]
Wide margins: [{"cmd":"setPadding","padding":70}]`;
      _modelReady = true;

      // Обновляем UI
      if(hint){ hint.style.color='#a78bfa'; hint.textContent='✓ WebLLM активен · '+cfg.modelId.split('-').slice(0,3).join('-'); }
      if(chip){ chip.style.borderColor='rgba(74,222,128,.5)';chip.style.color='#4ade80';chip.style.background='rgba(74,222,128,.1)';chip.textContent='✅ WebLLM'; }
    }catch(e){
      const _offline = !navigator.onLine;
      if(!_offline) console.log('[WebLLM] Не удалось восстановить из кэша:', e.message);
      // Сохраняем modelId даже если движок не загрузился — чтобы select показывал правильную модель
      const cfg2 = (()=>{try{return JSON.parse(localStorage.getItem('sf_webllm_cfg')||'{}');}catch(e){return {};}})();
      if(cfg2.modelId && !window._webllmModelId) window._webllmModelId = cfg2.modelId;
      const hint = document.getElementById('ai-status-hint');
      if(hint){
        hint.style.color = _offline ? '#64748b' : '#fbbf24';
        hint.textContent = _offline
          ? '📡 Офлайн · WebLLM недоступен'
          : (!_getGroqKey() ? '⚙ Загрузи WebLLM (🧠) или добавь Groq ключ' : '✓ Groq готов · ' + (window.GROQ_MODEL||''));
      }
    }
  })();

  // Отправка по Enter (Shift+Enter = новая строка)
  const inp = document.getElementById('ai-input');
  inp.addEventListener('keydown', e=>{
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); _send(); }
  });
  document.getElementById('ai-send').onclick = function(){
    if(_thinking){
      _stopRequested = true;
      _setThinking(false);
      const ind = document.getElementById('ai-thinking-indicator');
      if(ind) ind.remove();
      return;
    }
    _send();
  };
}

// ── Добавить сообщение ──────────────────────────────────────────────────────
function _saveChat(){
  try{
    const msgs = document.getElementById('ai-messages');
    if(!msgs) return;
    const items = [];
    msgs.querySelectorAll('[data-chat-role]').forEach(el=>{
      items.push({role:el.dataset.chatRole, html:el.innerHTML});
    });
    localStorage.setItem('sf-ai-chat', JSON.stringify(items));
    localStorage.setItem('sf-ai-panel-open', _panel && _panel.style.display==='flex' ? '1' : '0');
  }catch(e){}
}

function _addMsg(text, role, isLog){
  const msgs = document.getElementById('ai-messages');
  if(!msgs) return;
  const div = document.createElement('div');
  div.dataset.chatRole = isLog ? 'log' : (role||'assistant');
  if(isLog){
    div.style.cssText='font-size:10px;color:#64748b;padding:2px 4px;line-height:1.6';
    div.textContent = text;
  } else if(role==='user'){
    div.style.cssText='position:relative;background:rgba(168,85,247,.2);border:1px solid rgba(168,85,247,.25);border-radius:10px;padding:8px 12px;color:var(--text1);line-height:1.5;max-width:90%;align-self:flex-end;margin-left:auto;white-space:pre-wrap';
    div.textContent = text;
    // Кнопка повтора команды
    const repeatBtn = document.createElement('button');
    repeatBtn.title = 'Повторить команду';
    repeatBtn.style.cssText = 'position:absolute;top:4px;left:-28px;background:none;border:none;cursor:pointer;opacity:0;transition:opacity .15s;padding:3px;border-radius:5px;color:rgba(168,85,247,.7);line-height:1;';
    repeatBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>';
    repeatBtn.addEventListener('click', ()=>{
      const inp = document.getElementById('ai-input');
      if(inp){ inp.value = text; inp.focus(); }
    });
    div.addEventListener('mouseenter', ()=>{ repeatBtn.style.opacity='1'; });
    div.addEventListener('mouseleave', ()=>{ repeatBtn.style.opacity='0'; });
    div.appendChild(repeatBtn);
  } else {
    div.style.cssText='background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.2);border-radius:10px;padding:8px 12px;color:var(--text1);line-height:1.5;max-width:90%;white-space:pre-wrap';
    div.textContent = text;
  }
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  _saveChat();
}


function _logEntry(entry){
  _log.unshift(entry);
  if(_log.length > 200) _log = _log.slice(0, 200);
  try{ localStorage.setItem('sf-ai-log', JSON.stringify(_log)); } catch(e){}
}

// ── Выполнение команд ────────────────────────────────────────────────────────
// -- _tryParsePresText --
function _tryParsePresText(text){
  // Detect slide structure
  if(!/(\u0421\u043b\u0430\u0439\u0434|Slide)\s*\d+/i.test(text)) return null;
  // Split using exec loop to get only the content BETWEEN separators
  // Match each slide header line (one line only)
  var re = /(?:\ud83d\udcca\s*)?(?:\u0421\u043b\u0430\u0439\u0434|Slide)\s*\d+[^\n]*/ig;
  var headers = [], headerPos = [];
  var m;
  while((m=re.exec(text))!==null){
    headers.push(m[0]); headerPos.push(m.index);
  }
  if(headers.length < 2) return null;
  // Build content blocks = text after each header until next header
  var content = [];
  for(var hi=0;hi<headers.length;hi++){
    var from = headerPos[hi] + headers[hi].length;
    var to   = hi+1 < headerPos.length ? headerPos[hi+1] : text.length;
    content.push({header: headers[hi], body: text.slice(from, to)});
  }
  if(content.length < 2) return null;
  var cmds = [{cmd:'clearAll'}];
  var rTitle = /^\u0417\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a\s*:/i;
  var rSkip  = /^(\u0412\u0438\u0437\u0443\u0430\u043b|\u042d\u043b\u0435\u043c\u0435\u043d\u0442\u044b|\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b|\u0426\u0438\u0442\u0430\u0442\u0430|\u041f\u043e\u0434\u0437\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a|\u0422\u0438\u043f|\u0412\u0440\u0435\u043c\u044f|\u041f\u0440\u0435\u0438\u043c\u0443\u0449\u0435\u0441\u0442\u0432\u0430|\u041a\u0435\u0439\u0441\u044b|\u0425\u044d\u0448\u0442\u0435\u0433\u0438|\u0426\u0435\u043f\u043e\u0447\u043a\u0430|\u0427\u0435\u043a-\u043b\u0438\u0441\u0442|\u041f\u043e\u0434\u0445\u043e\u0434\u044b|\u041f\u0440\u0438\u043c\u0435\u0440\u044b)\s*:/i;
  for(var bi=0;bi<content.length;bi++){
    var hdr = content[bi].header;
    // Extract title from header: text after 'Слайд N:' separator
    // hdrTitle = text after 'Слайд N: ' on the header line (subtitle like '1: Титульный' → skip)
    var hdrTitle = hdr.replace(/(?:\ud83d\udcca\s*)?(?:\u0421\u043b\u0430\u0439\u0434|Slide)\s*\d+[:.\u2014\s]*/i,'').trim();
    // If hdrTitle is just a section name without spaces (e.g. 'Титульный') — discard, real title from body
    if(!hdrTitle || hdrTitle.split(' ').length < 2) hdrTitle = '';
    var blockText = content[bi].body;
    var lines = blockText.split('\n').map(function(l){return l.trim();}).filter(Boolean);
    // Look for explicit 'Заголовок:' line
    var titleLine=hdrTitle, titleIdx=-1;
    for(var ti=0;ti<lines.length;ti++){
      if(rTitle.test(lines[ti])){
        titleLine=lines[ti].replace(rTitle,'').trim(); titleIdx=ti; break;
      }
    }
    // Body
    var bodyParts=[];
    for(var ki=0;ki<lines.length;ki++){
      if(ki===titleIdx) continue;
      var ln=lines[ki];
      if(rSkip.test(ln)) continue;
      ln=ln.replace(/^[\u2600-\u27BF\u{1F300}-\u{1F9FF}\-\*\u2022]+\s*/u,'').trim();
      if(ln) bodyParts.push(ln);
    }
    var bodyText=bodyParts.join(' ').replace(/\s+/g,' ').trim().slice(0,500);
    cmds.push({cmd:'addSlide'});
    if(titleLine) cmds.push({cmd:'addTitle',text:titleLine});
    if(bodyText)  cmds.push({cmd:'addBody', text:bodyText});
  }
  if(cmds.length<4) return null;
  cmds.push({cmd:'applyStyleAll',theme:'Ocean Night',layout:'\u0410\u0432\u0440\u043e\u0440\u0430'});
  return cmds;
}

function _execCommands(cmds){
  const log = [];
  cmds.forEach(cmd => {
    try{
      switch(cmd.cmd){
        case 'clearAll':{
          if(typeof pushUndo==='function') pushUndo();
          if(typeof slides!=='undefined'){
            slides.splice(0, slides.length);
            // Добавляем один пустой слайд чтобы приложение не сломалось
            slides.push({title:'Slide 1', bg:'b1', bgc:null,
              ar:(typeof ar!=='undefined'?ar:'16:9'), trans:'', auto:0, els:[]});
          }
          if(typeof cur!=='undefined') cur=0;
          if(typeof renderAll==='function') renderAll();
          if(typeof saveState==='function') saveState();
          window._aiJustCleared = true;
          log.push('✓ Все слайды очищены');
          break;
        }
        case 'addSlide':
          if(window._aiJustCleared){
            // После clearAll первый слайд уже есть — просто переходим на него
            window._aiJustCleared = false;
            if(typeof cur!=='undefined') cur = 0;
            if(typeof load==='function') load();
          } else {
            if(typeof addSlide === 'function') addSlide();
          }
          log.push('✓ Слайд добавлен');
          break;
        case 'goSlide':
          if(typeof pickSlide === 'function') pickSlide((cmd.n||1)-1);
          log.push('✓ Переход на слайд ' + cmd.n);
          break;
        case 'setTransition':{
          // Установить переход для всех слайдов или текущего
          var _tr = cmd.name || cmd.trans || 'fade';
          if(cmd.all !== false && typeof slides !== 'undefined'){
            // Применяем ко всем слайдам
            slides.forEach(function(s){ s.trans = _tr; });
            if(typeof saveState==='function') saveState();
            if(typeof drawThumbs==='function') drawThumbs();
          } else {
            if(typeof setSlideTrans==='function') setSlideTrans(_tr);
          }
          log.push('✓ Переход установлен: ' + _tr);
          break;
        }
        case 'delSlide':{
          // Обходим защиту от удаления последнего слайда
          if(typeof slides!=='undefined' && typeof pushUndo==='function') pushUndo();
          if(typeof slides!=='undefined' && slides.length > 0){
            slides.splice(cur, 1);
            if(typeof cur!=='undefined') cur = Math.max(0, Math.min(cur, slides.length-1));
            if(typeof renderAll==='function') renderAll();
            if(typeof saveState==='function') saveState();
          }
          log.push('✓ Слайд удалён');
          break;
        }
        case 'addTitle':
        case 'addBody':
        case 'addText':{
          if(typeof slides !== 'undefined' && typeof cur !== 'undefined'){
            if(typeof pushUndo==='function') pushUndo();
            const _ti = typeof appliedThemeIdx!=='undefined' ? appliedThemeIdx : -1;
            const _theme = _ti>=0 && typeof THEMES!=='undefined' ? THEMES[_ti] : null;
            const _isDark = _theme ? _theme.dark : true;
            const _defColor = _isDark ? '#ffffff' : '#000000';
            const cw = typeof canvasW!=='undefined' ? canvasW : 960;
            const ch = typeof canvasH!=='undefined' ? canvasH : 540;
            const sn = typeof snapV==='function' ? snapV : v=>v;

            let fontSize, fontWeight, x, y, w, h, textAlign, textRole;

            // Иконка справа: если есть — тело текста сужается, заголовок всегда на всю ширину
            const _hasIcon = slides[cur] && slides[cur].els.some(e => e.type === 'icon');
            const _iconGap = _hasIcon ? 170 : 0;

            let valign = 'top';
            if(cmd.cmd === 'addTitle'){
              // Заголовок: на всю ширину, по центру, вверху
              fontSize   = cmd.size || 40;
              fontWeight = '700';
              x          = cmd.x != null ? cmd.x : sn(40);
              y          = cmd.y != null ? cmd.y : sn(20);
              w          = sn(cw - 80);          // всегда вся ширина
              h          = sn(120);
              textAlign  = 'center';
              valign     = 'middle';
              textRole   = 'heading';
            } else if(cmd.cmd === 'addBody'){
              // Основной текст: сужается если есть иконка справа
              fontSize   = cmd.size || 20;
              fontWeight = '400';
              x          = cmd.x != null ? cmd.x : sn(40);
              y          = cmd.y != null ? cmd.y : sn(160);
              w          = sn(cw - 80 - _iconGap);
              h          = sn(ch - 200);
              textAlign  = 'justify';
              valign     = 'top';
              textRole   = 'body';
            } else {
              // addText — с параметрами
              fontSize   = cmd.size || 32;
              fontWeight = cmd.bold ? '700' : '400';
              x          = cmd.x != null ? cmd.x : sn(80);
              y          = cmd.y != null ? cmd.y : sn(100);
              w          = sn(cw - 160 - (cmd.bold ? 0 : _iconGap));
              h          = sn(Math.max(80, fontSize * 2));
              textAlign  = cmd.bold ? 'center' : 'left';
              valign     = cmd.bold ? 'middle' : 'top';
              textRole   = cmd.bold ? 'heading' : 'body';
            }

            const txt = cmd.text || 'Текст';
            const htmlContent = txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            const d = {
              id: 'e' + (++ec),
              type: 'text',
              x, y, w, h,
              html: htmlContent,
              cs: 'font-size:'+fontSize+'px;font-weight:'+fontWeight+';color:'+_defColor+';text-align:'+textAlign+';line-height:1.4;',
              valign,
              rot: 0, anims: [], textRole
            };
            slides[cur].els.push(d);
            if(typeof mkEl==='function'){
              mkEl(d);
              // mkEl уже применяет textRole и valign из d — но дополнительно вызываем явно
              const _canvas = document.getElementById('canvas');
              const _newEl = _canvas ? _canvas.querySelector('.el[data-id="'+d.id+'"]') : null;
              if(_newEl){
                // Явно применяем valign через applyTextVAlign
                if(d.valign && d.valign !== 'top' && typeof applyTextVAlign === 'function'){
                  applyTextVAlign(_newEl, d.valign);
                }
                // Явно применяем textRole через setTextRole
                if(d.textRole){
                  const _prevSel = typeof sel !== 'undefined' ? sel : null;
                  if(typeof sel !== 'undefined') sel = _newEl;
                  if(typeof setTextRole === 'function') setTextRole(d.textRole);
                  if(typeof sel !== 'undefined') sel = _prevSel;
                }
              }
            }
            if(typeof save==='function') save();
            if(typeof drawThumbs==='function') drawThumbs();
            if(typeof saveState==='function') saveState();
          }
          log.push('✓ Текст добавлен');
          break;
        }

        case 'addIcon':{
          if(typeof slides!=='undefined' && typeof cur!=='undefined' && typeof ICONS!=='undefined'){
            const ic = ICONS.find(x => x.id === cmd.iconId);
            if(ic){
              if(typeof pushUndo==='function') pushUndo();
              const cw2 = typeof canvasW!=='undefined' ? canvasW : 960;
              const sn2 = typeof snapV==='function' ? snapV : v=>v;
              const sz  = sn2(cmd.size || 120);
              const color = cmd.color || '#3b82f6';
              const sw = 1.8;
              const style = 'stroke';
              const svgContent = typeof _buildIconSVG==='function'
                ? _buildIconSVG(ic, color, sw, style)
                : '';
              const ch2 = typeof canvasH!=='undefined' ? canvasH : 675;
              const d = {
                id:'e'+(++ec), type:'icon',
                x: cmd.x != null ? cmd.x : sn2(cw2 - sz - 30),
                y: cmd.y != null ? cmd.y : sn2((ch2 - sz) / 2),
                w:sz, h:sz,
                iconId:ic.id, iconPath:ic.p, iconColor:color, iconSw:sw, iconStyle:style,
                svgContent, rot:0, anims:[], shadow:false, shadowBlur:8, shadowColor:'#000000'
              };
              slides[cur].els.push(d);
              if(typeof mkEl==='function') mkEl(d);
              if(typeof save==='function') save();
              if(typeof drawThumbs==='function') drawThumbs();
              if(typeof saveState==='function') saveState();
              log.push('✓ Иконка добавлена: ' + ic.name);
            } else {
              log.push('? Иконка не найдена: ' + cmd.iconId);
            }
          }
          break;
        }
        case 'setText':{
          const slide = document.querySelector('.slide.active, .slide.sel, .slide[data-active]')
                     || document.querySelectorAll('.slide')[typeof cur!=='undefined'?cur:0];
          const sel = window._selectedEl || (slide && slide.querySelector('.el.selected, .el.sel'));
          if(sel && cmd.text){
            const t = sel.querySelector('[contenteditable], .el-text, .el-inner, span');
            if(t) t.innerHTML = cmd.text;
            else sel.innerHTML = cmd.text;
            if(typeof save === 'function') save();
          }
          log.push('✓ Текст изменён');
          break;
        }
        case 'setTheme':
        case 'setThemeAll':{
          // Находим индекс темы по имени и применяем
          if(typeof THEMES !== 'undefined'){
            const tIdx = THEMES.findIndex(t => t.name === cmd.name || t.nameEn === cmd.name);
            if(tIdx >= 0){
              if(typeof pushUndo==='function') pushUndo();
              selTheme = tIdx;
              appliedThemeIdx = tIdx;
              if(typeof applyTheme==='function') applyTheme();
              else if(typeof setTheme==='function') setTheme(cmd.name);
              log.push('✓ Тема: ' + cmd.name);
            } else {
              // Fallback
              if(typeof setTheme==='function') setTheme(cmd.name);
              log.push('✓ Тема: ' + cmd.name);
            }
          }
          break;
        }
        case 'setLayout':
        case 'setLayoutAll':{
          // applyLayout применяет ко ВСЕМ слайдам сразу
          if(typeof LAYOUTS !== 'undefined'){
            const lIdx = LAYOUTS.findIndex(l => l.name === cmd.name || l.nameEn === cmd.name);
            if(lIdx >= 0){
              if(typeof applyLayout==='function') applyLayout(lIdx);
              log.push('✓ Макет для всех слайдов: ' + cmd.name);
            } else {
              log.push('? Макет не найден: ' + cmd.name);
            }
          }
          break;
        }
        case 'applyStyleAll':{
          // Применить тему + макет ко всем слайдам
          let styleLog = [];
          if(cmd.theme && typeof THEMES !== 'undefined'){
            const tIdx = THEMES.findIndex(t => t.name === cmd.theme || t.nameEn === cmd.theme);
            if(tIdx >= 0){
              if(typeof pushUndo==='function') pushUndo();
              selTheme = tIdx; appliedThemeIdx = tIdx;
              if(typeof applyTheme==='function') applyTheme();
              styleLog.push('тема: ' + cmd.theme);
            }
          }
          if(cmd.layout && typeof LAYOUTS !== 'undefined'){
            const lIdx = LAYOUTS.findIndex(l => l.name === cmd.layout || l.nameEn === cmd.layout);
            if(lIdx >= 0){
              if(typeof applyLayout==='function') applyLayout(lIdx);
              styleLog.push('макет: ' + cmd.layout);
            }
          }
          log.push('✓ Единый стиль применён: ' + styleLog.join(', '));
          break;
        }
        case 'setRole':{
          // Применить роль к выбранному элементу или всем заголовкам на слайде
          const _role = cmd.role === 'heading' ? 'heading' : 'body';
          const _targets = cmd.all
            ? document.querySelectorAll('.el[data-type="text"]')
            : (sel ? [sel] : []);
          _targets.forEach(_t => {
            if(typeof setTextRole === 'function'){
              const _prevSel = sel;
              sel = _t;
              setTextRole(_role);
              sel = _prevSel;
            } else {
              _t.dataset.textRole = _role;
            }
          });
          if(typeof save==='function') save();
          if(typeof saveState==='function') saveState();
          log.push('✓ Роль установлена: ' + _role);
          break;
        }
        case 'addPageNum':{
          // Включить нумерацию страниц
          if(typeof pnGetSettings==='function'){
            var _pns = pnGetSettings();
            _pns.enabled   = true;
            _pns.style     = cmd.style || 'circle';
            _pns.position  = cmd.position || 'br';
            _pns.showTotal = cmd.showTotal || false;
            if(typeof pnApplyAll==='function') pnApplyAll();
            if(typeof pnSyncUI==='function') pnSyncUI();
          }
          log.push('✓ Нумерация добавлена');
          break;
        }
        case 'removePageNum':{
          if(typeof pnGetSettings==='function'){
            pnGetSettings().enabled = false;
            if(typeof pnRemoveAll==='function') pnRemoveAll();
            if(typeof pnSyncUI==='function') pnSyncUI();
          }
          log.push('✓ Нумерация удалена');
          break;
        }
        case 'deleteEl':
          if(typeof deleteSelected === 'function') deleteSelected();
          log.push('✓ Элемент удалён');
          break;
        case 'moveEl':{
          const sel2 = window._selectedEl;
          if(sel2){
            if(cmd.x != null) sel2.style.left = cmd.x + 'px';
            if(cmd.y != null) sel2.style.top  = cmd.y + 'px';
            if(typeof save === 'function') save();
          }
          log.push('✓ Элемент перемещён');
          break;
        }
        case 'addFormula':{
          // Добавить формулу LaTeX через MathJax
          const _latex = cmd.latex || cmd.formula || '';
          if(!_latex){ log.push('? addFormula: нет latex'); break; }
          // Используем renderMathJax из 36-formula.js если доступен
          const _doInsert = (svg) => {
            if(typeof pushUndo==='function') pushUndo();
            const cw3 = typeof canvasW!=='undefined' ? canvasW : 1200;
            const ch3 = typeof canvasH!=='undefined' ? canvasH : 675;
            const fColor = '#ffffff';
            const fd = {
              id:'e'+(++ec), type:'formula',
              x: Math.round(cw3*0.1), y: Math.round(ch3*0.3),
              w: Math.round(cw3*0.8), h: Math.round(ch3*0.25),
              rot:0, anims:[],
              formulaRaw: _latex,
              formulaLines: [_latex],
              formulaSvg: svg || '',
              formulaColor: fColor,
              formulaColorScheme: {col:7,row:0},
            };
            slides[cur].els.push(fd);
            if(typeof mkEl==='function') mkEl(fd);
            if(typeof save==='function') save();
            if(typeof drawThumbs==='function') drawThumbs();
            if(typeof saveState==='function') saveState();
            log.push('✓ Формула добавлена: ' + _latex.slice(0,40));
          };
          // Рендерим через _renderFormula (из 36-formula.js)
          if(typeof window._renderFormula === 'function'){
            window._renderFormula(_latex, (svg, err) => {
              _doInsert(err ? '' : svg);
              if(typeof renderAll==='function') renderAll();
            });
          } else {
            // Fallback — вставляем без SVG, отрендерится при открытии редактора
            _doInsert('');
            if(typeof renderAll==='function') renderAll();
          }
          break;
        }
        case 'editText':{
          // Редактировать текст элемента на текущем слайде
          // cmd.role: 'heading'|'body' — ищем по роли; cmd.idx — по индексу; иначе выбранный
          const _s = slides[cur];
          if(!_s){ log.push('? editText: нет слайда'); break; }
          if(typeof pushUndo==='function') pushUndo();
          let _targetD = null;
          if(cmd.role){
            _targetD = _s.els.find(e=>e.type==='text' && e.textRole===cmd.role);
          } else if(cmd.idx != null){
            _targetD = _s.els.filter(e=>e.type==='text')[cmd.idx];
          } else {
            // выбранный элемент
            const _selEl = typeof sel!=='undefined' ? sel : null;
            if(_selEl) _targetD = _s.els.find(e=>e.id===_selEl.dataset.id);
            if(!_targetD) _targetD = _s.els.find(e=>e.type==='text');
          }
          if(_targetD && cmd.text){
            const _ht = (cmd.text||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            _targetD.html = '<div>'+_ht+'</div>';
            const _canvas = document.getElementById('canvas');
            const _domEl = _canvas ? _canvas.querySelector('.el[data-id="'+_targetD.id+'"]') : null;
            if(_domEl){
              const _tel = _domEl.querySelector('.tel') || _domEl.querySelector('.ec');
              if(_tel) _tel.innerHTML = _targetD.html;
            }
            if(typeof save==='function') save();
            if(typeof drawThumbs==='function') drawThumbs();
            if(typeof saveState==='function') saveState();
            log.push('✓ Текст изменён');
          } else { log.push('? editText: элемент не найден'); }
          break;
        }
        case 'dupSlide':{
          // Дублировать текущий слайд
          if(typeof slides!=='undefined' && slides[cur]){
            if(typeof pushUndo==='function') pushUndo();
            const _dup = JSON.parse(JSON.stringify(slides[cur]));
            _dup.els = _dup.els.map(e=>({...e, id:'e'+(++ec)}));
            slides.splice(cur+1, 0, _dup);
            cur = cur+1;
            if(typeof renderAll==='function') renderAll();
            if(typeof saveState==='function') saveState();
            log.push('✓ Слайд дублирован');
          }
          break;
        }
        case 'moveSlide':{
          // Переместить слайд from → to (1-based)
          const _from = (cmd.from||1)-1;
          const _to   = (cmd.to||1)-1;
          if(typeof slides!=='undefined' && _from>=0 && _from<slides.length && _to>=0 && _to<slides.length){
            if(typeof pushUndo==='function') pushUndo();
            const [_ms] = slides.splice(_from, 1);
            slides.splice(_to, 0, _ms);
            cur = _to;
            if(typeof renderAll==='function') renderAll();
            if(typeof saveState==='function') saveState();
            log.push('✓ Слайд перемещён');
          }
          break;
        }
        case 'resizeEl':{
          const _selEl3 = typeof sel!=='undefined' ? sel : null;
          if(_selEl3){
            if(typeof pushUndo==='function') pushUndo();
            if(cmd.w != null) _selEl3.style.width  = cmd.w + 'px';
            if(cmd.h != null) _selEl3.style.height = cmd.h + 'px';
            if(typeof save==='function') save();
            if(typeof saveState==='function') saveState();
          }
          log.push('✓ Размер изменён');
          break;
        }
        case 'setTextColor':{
          const _s2 = slides[cur]; if(!_s2) break;
          if(typeof pushUndo==='function') pushUndo();
          let _td2 = null;
          if(cmd.role) _td2 = _s2.els.find(e=>e.type==='text'&&e.textRole===cmd.role);
          else { const _se2=typeof sel!=='undefined'?sel:null; if(_se2) _td2=_s2.els.find(e=>e.id===_se2.dataset.id); }
          if(!_td2) _td2 = _s2.els.find(e=>e.type==='text');
          if(_td2 && cmd.color){
            _td2.cs = (_td2.cs||'').replace(/color:[^;]+;?/g,'') + 'color:'+cmd.color+';';
            if(typeof renderAll==='function') renderAll();
            if(typeof save==='function') save();
            if(typeof saveState==='function') saveState();
          }
          log.push('✓ Цвет текста: '+cmd.color);
          break;
        }
        case 'setTextBold':{
          const _s3=slides[cur]; if(!_s3) break;
          if(typeof pushUndo==='function') pushUndo();
          let _td3=null;
          if(cmd.role) _td3=_s3.els.find(e=>e.type==='text'&&e.textRole===cmd.role);
          else { const _se3=typeof sel!=='undefined'?sel:null; if(_se3) _td3=_s3.els.find(e=>e.id===_se3.dataset.id); }
          if(!_td3) _td3=_s3.els.find(e=>e.type==='text');
          if(_td3){
            const _fw=cmd.bold===false?'400':'700';
            _td3.cs=(_td3.cs||'').replace(/font-weight:[^;]+;?/g,'')+('font-weight:'+_fw+';');
            if(typeof renderAll==='function') renderAll();
            if(typeof save==='function') save();
          }
          log.push('✓ Жирность: '+(cmd.bold!==false?'вкл':'выкл'));
          break;
        }
        case 'setTextAlign':{
          const _s4=slides[cur]; if(!_s4) break;
          if(typeof pushUndo==='function') pushUndo();
          let _td4=null;
          if(cmd.role) _td4=_s4.els.find(e=>e.type==='text'&&e.textRole===cmd.role);
          else { const _se4=typeof sel!=='undefined'?sel:null; if(_se4) _td4=_s4.els.find(e=>e.id===_se4.dataset.id); }
          if(!_td4) _td4=_s4.els.find(e=>e.type==='text');
          if(_td4 && cmd.align){
            _td4.cs=(_td4.cs||'').replace(/text-align:[^;]+;?/g,'')+('text-align:'+cmd.align+';');
            if(typeof renderAll==='function') renderAll();
            if(typeof save==='function') save();
          }
          log.push('✓ Выравнивание: '+cmd.align);
          break;
        }
        case 'setPadding':{
          // Изменить отступы у всех текстовых элементов на всех слайдах
          const _pad = cmd.padding != null ? +cmd.padding : 40;
          if(typeof slides!=='undefined' && typeof pushUndo==='function') pushUndo();
          (typeof slides!=='undefined' ? slides : []).forEach(s=>{
            (s.els||[]).forEach(e=>{
              if(e.type!=='text') return;
              e.cs = (e.cs||'').replace(/padding:[^;]+;?/g,'');
              // Применяем отступ через сдвиг x и уменьшение ширины
              const _cw = typeof canvasW!=='undefined' ? canvasW : 960;
              e.x = _pad;
              e.w = _cw - _pad * 2;
            });
          });
          if(typeof renderAll==='function') renderAll();
          if(typeof save==='function') save();
          if(typeof saveState==='function') saveState();
          log.push('✓ Отступы установлены: ' + _pad + 'px');
          break;
        }
        case 'setFontSize':{
          // Изменить размер шрифта на текущем слайде (или всех)
          const _fs = cmd.size || 24;
          const _fsRole = cmd.role || null;
          const _fsAll = cmd.all !== false;
          if(typeof pushUndo==='function') pushUndo();
          const _fsSlides = _fsAll && !cmd.currentOnly ? (typeof slides!=='undefined' ? slides : []) : [slides[cur]];
          _fsSlides.forEach(s=>{
            (s&&s.els||[]).forEach(e=>{
              if(e.type!=='text') return;
              if(_fsRole && e.textRole !== _fsRole) return;
              e.cs = (e.cs||'').replace(/font-size:[^;]+;?/g,'') + 'font-size:'+_fs+'px;';
            });
          });
          if(typeof renderAll==='function') renderAll();
          if(typeof save==='function') save();
          if(typeof saveState==='function') saveState();
          log.push('✓ Размер шрифта: ' + _fs + 'px' + (_fsRole?' ('+_fsRole+')':''));
          break;
        }
        case 'translateAll':{
          // Перевести весь текст всех слайдов — AI сгенерирует goSlide+editText команды
          // Эта команда-маркер означает что AI уже генерирует нужные команды
          log.push('ℹ translateAll: используй goSlide+editText для каждого слайда');
          break;
        }
        case 'translateSlide':{
          log.push('ℹ translateSlide: используй editText для текстов текущего слайда');
          break;
        }
        case 'trimText':{
          // Убрать лишний текст — оставить только ключевые предложения
          // Реализуем через editText с сокращённым текстом (AI уже генерирует новый текст)
          const _s = slides[cur]; if(!_s){ log.push('? trimText: нет слайда'); break; }
          if(typeof pushUndo==='function') pushUndo();
          let _td = null;
          if(cmd.role) _td = _s.els.find(e=>e.type==='text'&&e.textRole===cmd.role);
          else { const _se=typeof sel!=='undefined'?sel:null; if(_se) _td=_s.els.find(e=>e.id===_se.dataset.id); }
          if(!_td) _td = _s.els.find(e=>e.type==='text'&&e.textRole==='body');
          if(_td && cmd.text){
            const _ht=(cmd.text||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            _td.html='<div>'+_ht+'</div>';
            const _canvas=document.getElementById('canvas');
            const _domEl=_canvas?_canvas.querySelector('.el[data-id="'+_td.id+'"]'):null;
            if(_domEl){const _tel=_domEl.querySelector('.tel')||_domEl.querySelector('.ec');if(_tel)_tel.innerHTML=_td.html;}
            if(typeof save==='function') save();
            if(typeof saveState==='function') saveState();
            log.push('✓ Текст сокращён');
          } else { log.push('? trimText: нет текста для сокращения'); }
          break;
        }
        default:
          log.push('? Неизвестная команда: ' + cmd.cmd);
      }
    } catch(e){
      log.push('✗ ' + cmd.cmd + ': ' + e.message);
    }
  });
  return log;
}

// ── Отправка ────────────────────────────────────────────────────────────────
async function _send(){
  if(_thinking) return;
  const inp = document.getElementById('ai-input');
  const text = (inp.value||'').trim();
  if(!text) return;
  inp.value = '';

  // Автопарсер: если текст похож на структуру презентации — обрабатываем локально
  var _presCmd = _tryParsePresText(text);
  if(_presCmd){
    _addMsg(text, 'user');
    _setThinking(true);
    var _presLog = _execCommands(_presCmd);
    _setThinking(false);
    _addMsg('✅ Презентация создана: ' + ((_presCmd.length-1)/3|0) + ' слайдов', 'assistant', true);
    _logEntry({role:'user', text:text.slice(0,100)+'...'});
    _logEntry({role:'assistant', text:'Автопарсер: ' + _presLog.join(', ')});
    return;
  }

  // Умный перехват запросов на создание презентации для WebLLM
  // WebLLM маленькие модели не всегда генерируют полный массив — форсируем через Groq если доступен
  // Или используем расширенный промпт с принудительным форматом
  if(window._webllmReady && !_getGroqKey()){
    const _isPres = /создай|напиши|сделай|придумай|подготовь/.test(text.toLowerCase()) &&
                    /презентац|слайд/.test(text.toLowerCase());
    if(_isPres){
      // Для WebLLM добавляем жёсткий префикс в сообщение пользователя
      // чтобы модель видела явное требование формата
      const _topic = text.replace(/создай|напиши|сделай|придумай|подготовь/gi,'').replace(/презентацию|презентация|слайды|слайдов|на несколько/gi,'').replace(/\s+/g,' ').trim();
      const _numMatch = text.match(/(\d+)\s*слайд/);
      const _num = _numMatch ? +_numMatch[1] : 4;
      // Добавляем в историю специальный контекст
      _history.push({
        role: 'user',
        content: text + '\n\nOUTPUT: JSON array with clearAll + ' + _num + ' slides about "' + _topic + '". Each slide: addSlide+addTitle+addBody. START WITH [ END WITH ]'
      });
      // Удалим это сообщение после обработки через finally
    }
  }

  if(!window._webllmReady && !_getGroqKey()){
    _addMsg('⚠ Нет AI модели. Загрузи WebLLM (кнопка 🧠 WebLLM) или добавь Groq ключ (⚙ Ключ).', 'assistant');
    return;
  }

  _addMsg(text, 'user');
  _setThinking(true);

  // Показываем индикатор "думает" прямо в чате
  const _thinkDiv = document.createElement('div');
  _thinkDiv.id = 'ai-thinking-indicator';
  _thinkDiv.style.cssText = 'font-size:12px;color:var(--text3,#64748b);padding:6px 4px;animation:ai-blink 1.2s ease-in-out infinite';
  _thinkDiv.textContent = '⏳ Думаю...';
  const _msgs = document.getElementById('ai-messages');
  if(_msgs){ _msgs.appendChild(_thinkDiv); _msgs.scrollTop = _msgs.scrollHeight; }

  const _ts = new Date().toISOString();
  const _entry = {
    ts: _ts,
    slideCtx: { slide: cur+1, total: slides.length },
    userMsg: text,
    rawResponse: null,
    commands: null,
    cmdResults: null,
    textReply: null,
    error: null
  };

  try{
    const raw = await _callAI(text);
    _entry.rawResponse = raw;

    const {cmds, msg} = _parseResponse(raw);
    _entry.commands = cmds || [];

    if(cmds && cmds.length){
      const execLog = _execCommands(cmds);
      _entry.cmdResults = execLog;
      _addMsg(execLog.join('\n'), null, true);
    }
    if(msg){
      _entry.textReply = msg;
      _addMsg(msg, 'assistant');
    } else if(!cmds){
      _entry.textReply = raw;
      _addMsg(raw, 'assistant');
    }
  } catch(err){
    _entry.error = err.message;
    let errMsg = 'Ошибка: ' + err.message;
    if(err.message === 'NO_KEY') errMsg = window._webllmReady ? '⚠ WebLLM не отвечает. Перезагрузите модель.' : '⚠ Нет AI: загрузи WebLLM (кнопка 🧠) или добавь Groq API ключ.';
    else if(err.message.includes('Failed to fetch')) errMsg = '⚠ Нет соединения с Groq. Проверьте ключ и подключение к интернету.';
    else if(err.message.includes('401')) errMsg = '⚠ Неверный Groq API ключ. Нажмите чип модели для смены.';
    else if(err.message.includes('429')) errMsg = '⚠ Превышен лимит запросов Groq. Подожди минуту.';
    _addMsg(errMsg, 'assistant');
  } finally {
    _logEntry(_entry);
    _setThinking(false);
    const _td = document.getElementById('ai-thinking-indicator');
    if(_td) _td.remove();
  }
}

const _SEND_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>';
const _STOP_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>';
let _stopRequested = false;

function _setThinking(v){
  _thinking = v;
  if(!v) _stopRequested = false;
  const st = document.getElementById('ai-status');
  const sb = document.getElementById('ai-send');
  if(st) st.style.display = v ? 'inline' : 'none';
  if(sb){
    if(v){
      sb.innerHTML = _STOP_ICON;
      sb.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
      sb.style.opacity = '1';
      sb.title = 'Остановить';
    } else {
      sb.innerHTML = _SEND_ICON;
      sb.style.background = 'linear-gradient(135deg,#6366f1,#a855f7)';
      sb.style.opacity = '1';
      sb.title = 'Отправить';
    }
  }
}


// Публичная функция для чипов
function aiChip(text){
  const inp = document.getElementById('ai-input');
  if(inp){ inp.value = text; inp.focus(); }
}

function _showGroqKeyModal(){
  let modal = document.getElementById('ai-groq-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'ai-groq-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9200;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="width:440px;max-width:95vw;background:var(--surface);border:1px solid var(--border2);border-radius:14px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.6);font-family:inherit">
        <div style="font-weight:600;color:var(--text1);font-size:15px;margin-bottom:6px">🔑 Groq API ключ</div>
        <div style="font-size:12px;color:var(--text3,#64748b);margin-bottom:4px;line-height:1.6">
          Groq — бесплатный сервис для запуска LLM. Ключ хранится только в вашем браузере.
        </div>
        <div style="font-size:12px;color:var(--text3,#64748b);margin-bottom:16px">
          Получить бесплатный ключ: <a href="https://console.groq.com" target="_blank" style="color:#818cf8">console.groq.com</a> → API Keys → Create
        </div>
        <div style="position:relative;margin-bottom:10px">
          <input id="ai-groq-input" type="password" placeholder="gsk_..." style="width:100%;box-sizing:border-box;background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:9px 38px 9px 12px;color:var(--text1);font-family:monospace;font-size:12px;outline:none;">
          <button onclick="const i=document.getElementById('ai-groq-input');i.type=i.type==='password'?'text':'password'" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3,#64748b);cursor:pointer">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div id="ai-groq-status" style="font-size:11px;margin-bottom:14px;min-height:16px"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button onclick="document.getElementById('ai-groq-modal').style.display='none'" style="padding:7px 16px;border-radius:7px;border:1px solid var(--border2);background:none;color:var(--text2,#94a3b8);cursor:pointer;font-size:12px">Отмена</button>
          <button onclick="aiSaveGroqKey()" style="padding:7px 18px;border-radius:7px;border:none;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;cursor:pointer;font-size:12px;font-weight:500">Сохранить</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', e=>{ if(e.target===modal) modal.style.display='none'; });
    document.body.appendChild(modal);
  }
  const cur = _getGroqKey();
  const inp = document.getElementById('ai-groq-input');
  inp.value = cur || '';
  const st = document.getElementById('ai-groq-status');
  if(cur){ st.style.color='#34d399'; st.textContent='✓ Ключ сохранён: ' + cur.slice(0,8)+'...'+cur.slice(-4); }
  else { st.style.color='#f87171'; st.textContent='✗ Ключ не задан'; }
  modal.style.display='flex';
  setTimeout(()=>inp.focus(),50);
}

window.aiShowKeyModal = function(){ _showGroqKeyModal(); };

// ── Переключатель модели (WebLLM ↔ Groq) ─────────────────────────────────
window._aiUseGroq = false; // по умолчанию WebLLM если активен

function _updateModelChip(){
  const chip = document.getElementById('ai-model-chip');
  const hint = document.getElementById('ai-status-hint');
  if(!chip) return;
  const useGroq = window._aiUseGroq || (!window._webllmReady);
  if(useGroq){
    const key = _getGroqKey();
    chip.style.borderColor = key ? 'rgba(52,211,153,.5)' : 'rgba(251,191,36,.4)';
    chip.style.color = key ? '#34d399' : '#fbbf24';
    chip.style.background = key ? 'rgba(52,211,153,.1)' : 'rgba(251,191,36,.1)';
    chip.textContent = key ? '✓ Groq' : '⚙ Groq';
    if(hint && key){ hint.style.color='#34d399'; hint.textContent='✓ Groq · '+GROQ_MODEL; }
  } else {
    const mid = window._webllmModelId || '';
    chip.style.borderColor = 'rgba(74,222,128,.5)';
    chip.style.color = '#4ade80';
    chip.style.background = 'rgba(74,222,128,.1)';
    chip.textContent = '✅ WebLLM';
    if(hint && mid){ hint.style.color='#a78bfa'; hint.textContent='✓ WebLLM · '+mid.split('-').slice(0,3).join('-'); }
  }
}

window._aiSwitchModel = function(){
  // Всегда показываем модальное окно выбора модели
  _showModelSelectModal();
};

function _showModelSelectModal(){
  let modal = document.getElementById('ai-model-select-modal');
  if(modal){ modal.style.display='flex'; _refreshModelSelectModal(); return; }

  modal = document.createElement('div');
  modal.id = 'ai-model-select-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9300;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="width:360px;max-width:95vw;background:var(--surface);border:1px solid var(--border2);border-radius:14px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.5);font-family:inherit">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <span style="font-weight:700;font-size:14px;color:var(--text)">Выбор AI модели</span>
        <button onclick="document.getElementById('ai-model-select-modal').style.display='none'"
          style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;line-height:1;padding:2px">✕</button>
      </div>
      <div id="ai-model-select-body" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>`;
  modal.addEventListener('click', e => { if(e.target===modal) modal.style.display='none'; });
  document.body.appendChild(modal);
  _refreshModelSelectModal();
}

function _refreshModelSelectModal(){
  const body = document.getElementById('ai-model-select-body');
  if(!body) return;
  const isWebLLM = window._webllmReady && !window._aiUseGroq;
  const isGroq   = window._aiUseGroq || (!window._webllmReady && !!_getGroqKey());
  const wllmId   = (window._webllmModelId||'').split('-').slice(0,3).join('-') || 'не загружена';
  const groqKey  = _getGroqKey();

  body.innerHTML = `
    <!-- WebLLM -->
    <div style="border:2px solid ${isWebLLM?'#4ade80':'var(--border2)'};border-radius:10px;padding:12px;cursor:pointer;transition:border-color .15s"
      onclick="window._selectWebLLM()"
      onmouseenter="this.style.borderColor='#4ade80'" onmouseleave="this.style.borderColor='${isWebLLM?'#4ade80':'var(--border2)'}'"
    >
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-weight:600;font-size:13px;color:var(--text)">🧠 WebLLM</span>
        ${isWebLLM ? '<span style="font-size:10px;color:#4ade80;font-weight:600">● Активна</span>' : ''}
      </div>
      <div style="font-size:11px;color:var(--text2)">Модель в браузере, без интернета. ${window._webllmReady ? 'Модель: '+wllmId : 'Не загружена'}</div>
      ${window._webllmReady ? '<div style="margin-top:6px"><button onclick="event.stopPropagation();window._changeWebLLMModel()" style="font-size:10px;padding:3px 8px;border-radius:5px;border:1px solid var(--border2);background:var(--surface2);color:var(--text2);cursor:pointer">🔄 Сменить модель</button></div>' : '<div style="margin-top:6px;font-size:10px;color:#a78bfa">Нажмите чтобы загрузить модель</div>'}
    </div>
    <!-- Groq -->
    <div style="border:2px solid ${isGroq?'#34d399':'var(--border2)'};border-radius:10px;padding:12px;cursor:pointer;transition:border-color .15s"
      onclick="window._selectGroq()"
      onmouseenter="this.style.borderColor='#34d399'" onmouseleave="this.style.borderColor='${isGroq?'#34d399':'var(--border2)'}'"
    >
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-weight:600;font-size:13px;color:var(--text)">⚡ Groq API</span>
        ${isGroq ? '<span style="font-size:10px;color:#34d399;font-weight:600">● Активна</span>' : ''}
      </div>
      <div style="font-size:11px;color:var(--text2)">Быстрый бесплатный API. ${groqKey ? 'Ключ: '+groqKey.slice(0,8)+'...' : 'Ключ не задан'}</div>
      <div style="margin-top:6px"><button onclick="event.stopPropagation();window._editGroqKey()" style="font-size:10px;padding:3px 8px;border-radius:5px;border:1px solid var(--border2);background:var(--surface2);color:var(--text2);cursor:pointer">${groqKey ? '✏️ Изменить ключ' : '+ Добавить ключ'}</button></div>
    </div>`;
}

window._selectWebLLM = function(){
  if(!window._webllmReady){
    // Нет модели — открываем форму загрузки
    document.getElementById('ai-model-select-modal').style.display='none';
    _showWebLLMInChat();
    return;
  }
  window._aiUseGroq = false;
  _updateModelChip();
  _refreshModelSelectModal();
  setTimeout(()=>{ document.getElementById('ai-model-select-modal').style.display='none'; }, 300);
};

window._selectGroq = function(){
  window._aiUseGroq = true;
  _updateModelChip();
  if(!_getGroqKey()){
    document.getElementById('ai-model-select-modal').style.display='none';
    _showGroqKeyModal();
  } else {
    _refreshModelSelectModal();
    setTimeout(()=>{ document.getElementById('ai-model-select-modal').style.display='none'; }, 300);
  }
};

window._editGroqKey = function(){
  document.getElementById('ai-model-select-modal').style.display='none';
  _showGroqKeyModal();
};

window._changeWebLLMModel = function(){
  document.getElementById('ai-model-select-modal').style.display='none';
  _showWebLLMInChat();
};

function _aiMenuClose(){ const m=document.getElementById('ai-model-menu'); if(m)m.remove(); }
function _aiMenuWebLLM(){ window._aiUseGroq=false; _updateModelChip(); _aiMenuClose(); }
function _aiMenuGroq(){ window._aiUseGroq=true; _updateModelChip(); _aiMenuClose(); if(!_getGroqKey())_showGroqKeyModal(); }
function _aiMenuChange(){ _aiMenuClose(); _showWebLLMInChat(); }
// Экспортируем в window — нужно для onclick в innerHTML
window._aiMenuClose  = _aiMenuClose;
window._aiMenuWebLLM = _aiMenuWebLLM;
window._aiMenuGroq   = _aiMenuGroq;
window._aiMenuChange = _aiMenuChange;

function _showModelMenu(){
  const msgs = document.getElementById('ai-messages');
  if(!msgs) return;
  const old = document.getElementById('ai-model-menu');
  if(old) { old.remove(); return; } // toggle
  const menu = document.createElement('div');
  menu.id = 'ai-model-menu';
  menu.style.cssText = 'background:var(--surface2);border:1px solid rgba(139,92,246,.35);border-radius:10px;padding:10px;margin:4px 0;display:flex;flex-direction:column;gap:6px;font-size:11px;';
  menu.innerHTML = '<div style="font-weight:600;color:#a78bfa;margin-bottom:2px;">🔀 Выбор модели</div>'+
    '<button onclick="_aiMenuWebLLM()" style="background:rgba(74,222,128,.15);border:1px solid rgba(74,222,128,.3);border-radius:6px;padding:6px 10px;color:#4ade80;cursor:pointer;text-align:left;">✅ WebLLM · '+(window._webllmModelId||'').split('-').slice(0,3).join('-')+'</button>'+
    '<button onclick="_aiMenuGroq()" style="background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);border-radius:6px;padding:6px 10px;color:#fbbf24;cursor:pointer;text-align:left;">⚙ Groq API</button>'+
    '<button onclick="_aiMenuChange()" style="background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);border-radius:6px;padding:6px 10px;color:#818cf8;cursor:pointer;text-align:left;">🔄 Сменить модель WebLLM</button>';
  msgs.appendChild(menu);
  msgs.scrollTop = msgs.scrollHeight;
}

window.aiSaveGroqKey = function(){
  const val = (document.getElementById('ai-groq-input').value||'').trim();
  const st = document.getElementById('ai-groq-status');
  if(!val){ st.style.color='#f87171'; st.textContent='✗ Введите ключ'; return; }
  _setGroqKey(val);
  _modelReady = true;
  const hint = document.getElementById('ai-status-hint');
  if(hint){ hint.style.color='#34d399'; hint.textContent='✓ Groq готов · ' + GROQ_MODEL; }
  st.style.color='#34d399'; st.textContent='✓ Сохранено';
  window._aiUseGroq = true;
  _updateModelChip();
  if(typeof _refreshModelSelectModal==='function') _refreshModelSelectModal();
  setTimeout(()=>{ document.getElementById('ai-groq-modal').style.display='none'; }, 600);
};

window._showLog = function(){
  // Ищем или создаём модальное окно лога
  let modal = document.getElementById('ai-log-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'ai-log-modal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;align-items:center;justify-content:center';
    modal.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border2);border-radius:12px;padding:18px;width:min(520px,95vw);max-height:85vh;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <span style="font-weight:600;font-size:14px;color:var(--text1)">Лог AI ассистента</span>
            <span id="ai-log-count" style="font-size:10px;color:var(--text3);margin-left:8px">0 записей</span>
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="aiLogClear()" style="font-size:10px;background:none;border:1px solid var(--border2);border-radius:5px;padding:3px 8px;color:var(--text3);cursor:pointer">🗑 Очистить</button>
            <button onclick="document.getElementById('ai-log-modal').style.display='none'" style="background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer">✕</button>
          </div>
        </div>
        <div id="ai-log-body" style="overflow-y:auto;max-height:60vh;display:flex;flex-direction:column;gap:6px;font-size:11px"></div>
      </div>`;
    modal.onclick = e=>{ if(e.target===modal) modal.style.display='none'; };
    document.body.appendChild(modal);
  }

  // Заполняем лог
  const body  = modal.querySelector('#ai-log-body');
  const count = modal.querySelector('#ai-log-count');
  if(count) count.textContent = _log.length + ' записей';
  if(body){
    if(!_log.length){
      body.innerHTML = '<div style="color:var(--text3);text-align:center;padding:40px">Лог пуст</div>';
    } else {
      body.innerHTML = [..._log].reverse().map(e=>{
        const bg = e.role==='user' ? 'rgba(99,102,241,.1)' : 'rgba(255,255,255,.03)';
        const label = e.role==='user' ? '👤 Вы' : '🤖 AI';
        const t = e.ts ? new Date(e.ts).toLocaleTimeString() : '';
        const txt = (e.text||e.textReply||e.content||'').slice(0,300);
        return `<div style="background:${bg};border:1px solid var(--border2);border-radius:6px;padding:7px 10px">
          <div style="color:var(--text3);margin-bottom:3px">${label} ${t}</div>
          <div style="color:var(--text1);white-space:pre-wrap;word-break:break-word">${txt.replace(/</g,'&lt;')}</div>
          ${e.error?`<div style="color:#f87171;margin-top:3px">❌ ${e.error}</div>`:''}
        </div>`;
      }).join('');
    }
  }

  modal.style.display = 'flex';
};

window.aiLogClear = function(){
  if(confirm('Очистить весь лог ассистента?')){
    _log = [];
    try{ localStorage.removeItem('sf-ai-log'); } catch(e){}
    const body = document.getElementById('ai-log-body');
    const count = document.getElementById('ai-log-count');
    if(body) body.innerHTML = '<div style="color:var(--text3,#64748b);text-align:center;padding:40px">Лог пуст</div>';
    if(count) count.textContent = '0 записей';
  }
};

// ── Инициализация ────────────────────────────────────────────────────────────
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', _createUI);
} else {
  _createUI();
}

})();

// ── WebLLM inline в чате ─────────────────────────────────────────
window._showWebLLMInChat = function(){
  const msgs = document.getElementById('ai-messages');
  if(!msgs) return;

  // Всегда показываем форму — для первой загрузки и смены модели
  const oldForm = document.getElementById('wllm-inline-form');
  if(oldForm) oldForm.remove();

  const MODELS = [
    {id:'Llama-3.2-1B-Instruct-q4f16_1-MLC',     label:'Llama 3.2 1B  (~800 MB) — быстрая'},
    {id:'Llama-3.2-3B-Instruct-q4f16_1-MLC',     label:'Llama 3.2 3B  (~2 GB)'},
    {id:'Phi-3.5-mini-instruct-q4f16_1-MLC',     label:'Phi-3.5 Mini  (~2 GB) — лучшая для текста'},
    {id:'gemma-2-2b-it-q4f16_1-MLC',             label:'Gemma 2 2B    (~1.5 GB)'},
    {id:'Mistral-7B-Instruct-v0.3-q4f16_1-MLC',  label:'Mistral 7B    (~4 GB) — топ качество'},
  ];

  // Читаем из localStorage синхронно при каждом открытии
  let savedModelId = '';
  try{ savedModelId = JSON.parse(localStorage.getItem('sf_webllm_cfg')||'{}').modelId || ''; }catch(e){}
  const curModel = window._webllmModelId || savedModelId;
  const activeNote = curModel
    ? `<div style="font-size:10px;color:#4ade80;margin-bottom:2px">✅ Сейчас активна: ${curModel.split('-').slice(0,3).join('-')}</div>`
    : '';

  const form = document.createElement('div');
  form.id = 'wllm-inline-form';
  form.style.cssText = 'background:var(--surface2);border:1px solid rgba(139,92,246,.35);border-radius:10px;padding:12px;margin:4px 0;display:flex;flex-direction:column;gap:8px;font-size:11px;';
  form.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between">
      <span style="font-weight:600;color:#a78bfa;display:flex;align-items:center;gap:5px">🧠 WebLLM — AI в браузере</span>
      <button onclick="document.getElementById('wllm-inline-form').remove()"
        style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:15px;line-height:1;padding:0">✕</button>
    </div>
    ${activeNote}
    <div style="display:flex;flex-direction:column;gap:4px">
      <label style="font-size:10px;color:var(--text3)">Выберите модель:</label>
      <select id="wllm-sel" style="background:var(--surface3);border:1px solid var(--border2);border-radius:6px;padding:6px 8px;color:var(--text1);font-size:11px;width:100%">
        ${MODELS.map(m=>`<option value="${m.id}" ${m.id===curModel?'selected':''}>${m.label}</option>`).join('')}
      </select>
    </div>
    <button id="wllm-load-btn" onclick="_wllmLoadInline()"
      style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:7px;padding:9px;font-size:12px;cursor:pointer;font-weight:600">
      ⬇️ ${curModel ? 'Сменить модель' : 'Загрузить модель'}
    </button>
    <div id="wllm-prog" style="font-size:10px;color:var(--text3);line-height:1.5;min-height:12px"></div>
    <div style="font-size:9px;color:var(--text3)">Модель кэшируется в браузере — повторные запуски мгновенные.<br>Требуется Chrome 113+ · GPU с 3+ GB VRAM</div>
  `;

  msgs.appendChild(form);
  msgs.scrollTop = msgs.scrollHeight;
};



window._wllmLoadInline = async function(){
  const prog    = document.getElementById('wllm-prog');
  const btn     = document.getElementById('wllm-load-btn');
  const modelId = document.getElementById('wllm-sel')?.value;
  if(!prog || !btn || !modelId) return;

  btn.disabled = true; btn.textContent = '⏳ Загрузка...';

  try{
    if(!navigator.gpu){
      prog.textContent = '❌ WebGPU не поддерживается. Используйте Chrome 113+ или Edge 113+';
      btn.disabled=false; btn.textContent='⬇️ Загрузить модель'; return;
    }
    if(!navigator.onLine){
      prog.textContent = '❌ Нет подключения к интернету. Модель загружается с сервера при первом запуске.';
      btn.disabled=false; btn.textContent='⬇️ Загрузить модель'; return;
    }
    prog.textContent = '⏳ Инициализация WebLLM...';

    const { CreateMLCEngine } = await (async () => {
        // 1. Уже загружен как обычный скрипт (libs/web-llm/web-llm-iife.js)
        if(window._WebLLM && window._WebLLM.CreateMLCEngine) return window._WebLLM;
        // 2. Fallback CDN если онлайн
        if(navigator.onLine){
          try {
            const mod = await import('https://esm.run/@mlc-ai/web-llm');
            window._WebLLM = mod;
            return mod;
          } catch(e) {}
        }
        throw new Error('WebLLM недоступен. Проверьте наличие libs/web-llm/web-llm-iife.js');
      })();
    const engine = await CreateMLCEngine(modelId, {
      initProgressCallback:(p)=>{
        const pct = p.progress!=null ? Math.round(p.progress*100) : null;
        // Текст под кнопкой
        if(prog) prog.textContent = (p.text||'Загрузка...')+(pct!=null?' · '+pct+'%':'');
        // Заливка кнопки
        if(btn && pct!=null){
          btn.style.background = `linear-gradient(90deg,#059669 ${pct}%,#6366f1 ${pct}%)`;
          btn.textContent = pct+'% — скачивание...';
        }
      },
    });

    window._webllmEngine   = engine;
    window._webllmReady    = true;
    window._webllmModelId  = modelId;
    window._aiUseGroq = false;
    if(typeof _updateModelChip==='function') _updateModelChip();
    // Сохраняем выбор модели — восстановится после перезагрузки
    try{ localStorage.setItem('sf_webllm_cfg', JSON.stringify({modelId})); }catch(_){}
    window._webllmSysPrompt = `You are a JSON-only presentation assistant. OUTPUT ONLY A JSON ARRAY — start with [ end with ].
NO text before or after the array. NO markdown. ONLY valid JSON array.

COMMANDS: clearAll, addSlide, addTitle(text), addBody(text), editText(role,text), goSlide(n), delSlide, dupSlide, addFormula(latex), setTheme(name), setLayout(name), setTransition(name), setPadding(padding), setFontSize(size,role), setTextColor(color,role), addPageNum(style,position), removePageNum, moveEl(x,y).

RULES:
- New presentation: start with clearAll then add slides.
- Each slide: addSlide + addTitle + addBody.
- addTitle: MAX 5-6 words.
- addBody: MAX 3-4 short sentences (40-60 words). If more info needed — use more slides instead.
- NEVER put long paragraphs in one slide. Split into multiple slides.
- NEVER use clearAll when editing existing slides — only for NEW presentations.
- "remove extra text", "shorten", "keep only important" -> editText(role=body, text=short_text)
- To edit existing text: goSlide(n) + editText(role,text).
- To translate: goSlide(1)+editText(role,translated) for each slide.
- Use Russian for text unless asked otherwise.

IMPORTANT: "write presentation about X", "create slides about X", "make presentation" = clearAll + multiple addSlide+addTitle+addBody. MINIMUM 3 slides.

EXAMPLES:
"write presentation about hats" (4 slides): [{"cmd":"clearAll"},{"cmd":"addSlide"},{"cmd":"addTitle","text":"Шляпы в истории"},{"cmd":"addBody","text":"Шляпы известны с древних времён. Они защищали от солнца и дождя. Каждая эпоха имела свои фасоны."},{"cmd":"addSlide"},{"cmd":"addTitle","text":"Виды шляп"},{"cmd":"addBody","text":"Цилиндр, котелок, федора, бейсболка. Каждый стиль отражает свою культуру и время."},{"cmd":"addSlide"},{"cmd":"addTitle","text":"Шляпы и мода"},{"cmd":"addBody","text":"В XIX веке шляпа была обязательным атрибутом. Дизайнеры создают уникальные модели до сих пор."},{"cmd":"addSlide"},{"cmd":"addTitle","text":"Шляпы сегодня"},{"cmd":"addBody","text":"Шляпы остаются символом стиля. Используются в моде, театре и повседневной жизни."}]
Edit text: [{"cmd":"editText","role":"heading","text":"New title"}]
Trim text: [{"cmd":"editText","role":"body","text":"Краткий текст без лишних слов."}]
Wide margins: [{"cmd":"setPadding","padding":70}]`;

    // Обновляем UI чата
    const chip = document.getElementById('ai-model-chip');
    if(chip){ chip.style.borderColor='rgba(74,222,128,.5)';chip.style.color='#4ade80';chip.style.background='rgba(74,222,128,.1)';chip.textContent='✅ WebLLM'; }
    const hint = document.getElementById('ai-status-hint');
    if(hint){ hint.style.color='#a78bfa'; hint.textContent='✓ WebLLM активен · '+modelId.split('-').slice(0,3).join('-'); }

    const form = document.getElementById('wllm-inline-form');
    if(form) form.remove();
    _addMsg('✅ Модель загружена: ' + modelId.split('-').slice(0,3).join('-') + '\nТеперь пиши запросы прямо в чат!', 'assistant');

  }catch(e){
    if(prog) prog.textContent = '❌ ' + e.message;
    if(btn){ btn.disabled=false; btn.textContent='⬇️ Загрузить модель'; }
  }
};

window._wllmCheckLocal = async function(){
  const url = (document.getElementById('wllm-local-url')?.value||'').trim() || 'http://localhost:8765';
  const listEl = document.getElementById('wllm-local-models');
  const prog = document.getElementById('wllm-prog');
  if(!listEl) return;

  if(prog) prog.textContent = '🔍 Проверяю ' + url + '/list ...';
  listEl.style.display = 'none';

  try{
    const resp = await fetch(url + '/list', {signal: AbortSignal.timeout(3000)});
    if(!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();

    if(!data.models || !data.models.length){
      if(prog) prog.textContent = '⚠️ Сервер доступен, но моделей не найдено в ' + (data.dir||'');
      return;
    }

    // Показываем найденные локальные модели
    listEl.innerHTML = `<div style="font-size:10px;color:#4ade80;margin-bottom:4px">✅ Найдено ${data.models.length} моделей:</div>`;
    data.models.forEach(m=>{
      const btn = document.createElement('button');
      btn.style.cssText = 'background:var(--surface2);border:1px solid rgba(74,222,128,.3);border-radius:5px;padding:5px 8px;color:var(--text1);font-size:10px;cursor:pointer;text-align:left;width:100%';
      btn.innerHTML = `<b style="color:#4ade80">📂 ${m.id.split('-').slice(0,3).join('-')}</b> <span style="color:var(--text3)">${m.size}</span>`;
      btn.onclick = ()=>{
        // Устанавливаем как кастомный URL для загрузки
        window._wllmCustomUrl = m.url;
        window._wllmCustomId  = m.id;
        // Подсвечиваем выбранную
        listEl.querySelectorAll('button').forEach(b=>b.style.borderColor='rgba(74,222,128,.3)');
        btn.style.borderColor = '#4ade80';
        if(prog) prog.textContent = '✓ Выбрана локальная модель: ' + m.id;
      };
      listEl.appendChild(btn);
    });

    listEl.style.display = 'flex';
    listEl.style.flexDirection = 'column';
    if(prog) prog.textContent = '';
  }catch(e){
    if(prog) prog.textContent = '❌ Сервер недоступен. Запустите: python serve_models.py';
  }
};

window._wllmLoadInline = async function(){
  const prog = document.getElementById('wllm-prog');
  const btn  = document.getElementById('wllm-load-btn');
  if(!prog || !btn) return;

  // Используем локальную модель если выбрана, иначе из CDN
  const useLocal  = !!window._wllmCustomUrl;
  const modelId   = useLocal ? window._wllmCustomId : (document.getElementById('wllm-sel')?.value);
  const customUrl = useLocal ? window._wllmCustomUrl : null;

  if(!modelId){ prog.textContent = 'Выберите модель'; return; }

  btn.disabled = true;
  btn.textContent = '⏳ Загрузка...';

  try{
    if(!navigator.gpu){ prog.textContent = '❌ WebGPU не поддерживается. Используйте Chrome 113+'; btn.disabled=false; btn.textContent='⬇️ Загрузить / Сменить модель'; return; }

    prog.textContent = '⏳ Инициализация...';

    const { CreateMLCEngine } = await (async () => {
        // 1. Уже загружен как обычный скрипт (libs/web-llm/web-llm-iife.js)
        if(window._WebLLM && window._WebLLM.CreateMLCEngine) return window._WebLLM;
        // 2. Fallback CDN если онлайн
        if(navigator.onLine){
          try {
            const mod = await import('https://esm.run/@mlc-ai/web-llm');
            window._WebLLM = mod;
            return mod;
          } catch(e) {}
        }
        throw new Error('WebLLM недоступен. Проверьте наличие libs/web-llm/web-llm-iife.js');
      })();
    // Формируем опции — для локальных моделей указываем appConfig с model_url
    const mlcOpts = {
      initProgressCallback:(p)=>{
        const pct = p.progress!=null ? ' · '+Math.round(p.progress*100)+'%' : '';
        if(prog) prog.textContent = (useLocal?'📂':'⬇️')+' '+(p.text||'Загрузка...')+pct;
      },
    };
    if(customUrl){
      mlcOpts.appConfig = {
        model_list:[{model:customUrl, model_id:modelId, model_lib:modelId}]
      };
    }
    const engine = await CreateMLCEngine(modelId, mlcOpts);

    window._webllmEngine   = engine;
    window._webllmReady    = true;
    window._webllmModelId  = modelId;
    window._webllmSysPrompt = `You are a JSON-only presentation assistant. OUTPUT ONLY A JSON ARRAY — start with [ end with ].
NO text before or after the array. NO markdown. ONLY valid JSON array.

COMMANDS: clearAll, addSlide, addTitle(text), addBody(text), editText(role,text), goSlide(n), delSlide, dupSlide, addFormula(latex), setTheme(name), setLayout(name), setTransition(name), setPadding(padding), setFontSize(size,role), setTextColor(color,role), addPageNum(style,position), removePageNum, moveEl(x,y).

RULES:
- New presentation: start with clearAll then add slides.
- Each slide: addSlide + addTitle + addBody.
- addTitle: MAX 5-6 words.
- addBody: MAX 3-4 short sentences (40-60 words). If more info needed — use more slides instead.
- NEVER put long paragraphs in one slide. Split into multiple slides.
- NEVER use clearAll when editing existing slides — only for NEW presentations.
- "remove extra text", "shorten", "keep only important" -> editText(role=body, text=short_text)
- To edit existing text: goSlide(n) + editText(role,text).
- To translate: goSlide(1)+editText(role,translated) for each slide.
- Use Russian for text unless asked otherwise.

IMPORTANT: "write presentation about X", "create slides about X", "make presentation" = clearAll + multiple addSlide+addTitle+addBody. MINIMUM 3 slides.

EXAMPLES:
"write presentation about hats" (4 slides): [{"cmd":"clearAll"},{"cmd":"addSlide"},{"cmd":"addTitle","text":"Шляпы в истории"},{"cmd":"addBody","text":"Шляпы известны с древних времён. Они защищали от солнца и дождя. Каждая эпоха имела свои фасоны."},{"cmd":"addSlide"},{"cmd":"addTitle","text":"Виды шляп"},{"cmd":"addBody","text":"Цилиндр, котелок, федора, бейсболка. Каждый стиль отражает свою культуру и время."},{"cmd":"addSlide"},{"cmd":"addTitle","text":"Шляпы и мода"},{"cmd":"addBody","text":"В XIX веке шляпа была обязательным атрибутом. Дизайнеры создают уникальные модели до сих пор."},{"cmd":"addSlide"},{"cmd":"addTitle","text":"Шляпы сегодня"},{"cmd":"addBody","text":"Шляпы остаются символом стиля. Используются в моде, театре и повседневной жизни."}]
Edit text: [{"cmd":"editText","role":"heading","text":"New title"}]
Trim text: [{"cmd":"editText","role":"body","text":"Краткий текст без лишних слов."}]
Wide margins: [{"cmd":"setPadding","padding":70}]`;

    // Обновляем UI
    const chip = document.getElementById('ai-model-chip');
    if(chip){ chip.style.borderColor='rgba(74,222,128,.5)';chip.style.color='#4ade80';chip.style.background='rgba(74,222,128,.1)';chip.textContent='✅ WebLLM'; }
    const hint = document.getElementById('ai-status-hint');
    if(hint){ hint.style.color='#a78bfa'; hint.textContent='✓ WebLLM активен · '+modelId.split('-').slice(0,3).join('-'); }

    // Убираем форму, показываем успех в чате
    const form = document.getElementById('wllm-inline-form');
    if(form) form.remove();
    _addMsg('✅ Модель загружена: ' + modelId.split('-').slice(0,3).join('-') + '\nТеперь можешь писать запросы прямо в этот чат!', 'assistant');

  }catch(e){
    if(prog) prog.textContent = '❌ ' + e.message;
    if(btn){ btn.disabled=false; btn.textContent='⬇️ Загрузить модель'; }
  }
};
