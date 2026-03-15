// ══════════════ AI АССИСТЕНТ ══════════════
// Использует Anthropic API для управления редактором через команды

(function(){

// ── Константы ──────────────────────────────────────────────────────────────
const AI_THEMES = ['Ocean Night','Midnight','Neon City','Coral Blaze','Forest Deep','Solar Flare','Rose Gold','Arctic Blue','Sage Night','Citrus Dark','Crimson','Deep Teal','Slate Storm','Aurora','Copper','Galaxy','Clean White','Warm Paper','Soft Indigo','Mint Fresh','Rose Petal','Sky Day','Corporate','Lavender','Peach','Slate Clean','Teal Light','Newspaper','Sakura','Lemon','Olive','Navy Gold','Obsidian','Blood Moon','Matrix','Ocean Deep','Void'];
const AI_LAYOUTS = ['Призма','Аврора','Взрыв','Схема','Оригами','Ореол','Аркада','Закат','Слои','Кристалл','Метро','Рельеф','Космос','Океан'];

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
  return `Ты ассистент редактора презентаций «Слайды». Управляй через JSON-команды.
Текущий слайд: ${slideIdx+1} из ${total}.

ПРАВИЛА:
1. Отвечай ТОЛЬКО JSON-массивом. Никакого текста ДО массива.
2. Каждый слайд = addSlide + addTitle (заголовок) + addBody (основной текст).
3. Текст ИНФОРМАТИВНЫЙ — реальные факты по теме, не заглушки.
4. Предлагай подходящие иконки и декорации по теме.
5. Пояснение — ТОЛЬКО после |||
6. Если пользователь присылает ГОТОВЫЙ ТЕКСТ/ПЛАН со слайдами — сделай clearAll, затем создай слайды.
7. Если просят "удали все слайды" или "начни заново" — используй clearAll.

КОМАНДЫ:

clearAll — УДАЛИТЬ ВСЕ СЛАЙДЫ и начать заново
{"cmd":"clearAll"}

addSlide — добавить слайд
{"cmd":"addSlide"}

addTitle — ЗАГОЛОВОК слайда (роль: heading, крупный, по центру)
{"cmd":"addTitle","text":"Заголовок слайда"}
  → автоматически: size=40, bold, textRole=heading, valign=middle, textAlign=center, y=20, h=120

addBody — ОСНОВНОЙ ТЕКСТ (роль: body, занимает большую часть слайда)
{"cmd":"addBody","text":"Основной текст с реальной информацией..."}
  → автоматически: size=20, textRole=body, textAlign=justify, y=160, h=до низа слайда

setRole — установить роль элементу (heading или body)
{"cmd":"setRole","role":"heading"}  — выбранному элементу
{"cmd":"setRole","role":"heading","all":true}  — всем текстовым элементам слайда

addIcon — добавить иконку по теме из базы
{"cmd":"addIcon","iconId":"bio_photosyn","x":600,"y":60,"size":120}
Доступные иконки по категориям:
- Биология (bio): bio_photosyn, bio_cell, bio_leaf, bio_plant, bio_dna3, bio_seed, bio_flower, bio_bug, bio_fish, bio_bacteria, bio_lung, bio_brain
- Наука (science): sci_atom2, sci_beaker, sci_plant, sci_earth, sci_dna2, sci_wave
- Природа (nature): sun, leaf, tree, droplet, waves, globe2, flame
- Образование (edu): atom, flask, microscope, dna, test_tube, bulb, book_open
- Химия (chem): доступны через cat='chem'
Выбирай иконки ПОДХОДЯЩИЕ по теме запроса!

setLayout — декорация/макет слайда
{"cmd":"setLayout","name":"..."}
Макеты: ${layouts}
Предлагай макет подходящий по настроению темы.

setTheme — цветовая тема текущего слайда
{"cmd":"setTheme","name":"..."}
Темы: ${themes}

applyStyleAll — ЕДИНЫЙ СТИЛЬ для всех слайдов сразу (тема + макет)
{"cmd":"applyStyleAll","theme":"Ocean Night","layout":"Аврора"}
Используй когда просят "единый стиль", "одинаковое оформление", "применить стиль ко всем"

goSlide — перейти на слайд N
{"cmd":"goSlide","n":2}

delSlide — удалить текущий слайд
{"cmd":"delSlide"}

deleteEl — удалить выбранный элемент
{"cmd":"deleteEl"}

setTransition — переход для всех слайдов (по умолчанию) или текущего (all:false)
{"cmd":"setTransition","name":"fade"}
Доступные: none, fade, slide, slideUp, zoom, zoomOut, flip, flipV, cube, dissolve, morph, push, wipe, split, reveal, glitch
Когда просят "переход сверху вниз" → slideUp, "слева-право" → slide, "куб" → cube, "растворение" → dissolve, "мерцание" → fade, "флип" → flip, "глич" → glitch
"убери переходы" / "без переходов" / "отключи переходы" / "удали переходы" → {"cmd":"setTransition","name":"none"}
ВАЖНО: "убери/удали/отключи переходы" — это ВСЕГДА setTransition(none), НЕ applyStyleAll!

addPageNum — нумерация страниц на всех слайдах
{"cmd":"addPageNum","style":"circle","position":"br"}
style: simple/circle/ring/pill | position: br/bl/tr/tl/bc/tc

removePageNum — убрать нумерацию
{"cmd":"removePageNum"}

moveEl — переместить выбранный элемент
{"cmd":"moveEl","x":100,"y":200}

ВАЖНЫЙ ПОРЯДОК КОМАНД на каждый слайд:
1. addSlide
2. addIcon (сначала иконка — текст автоматически сдвинется влево чтобы не перекрываться)
3. addTitle (заголовок — автоматически по центру с valign middle)
4. addBody (основной текст — от y=160 до низа слайда)
5. setLayout (опционально)

ПРИМЕР — "2 слайда про фотосинтез":
[
{"cmd":"addSlide"},
{"cmd":"addIcon","iconId":"bio_photosyn","size":150},
{"cmd":"addTitle","text":"Фотосинтез"},
{"cmd":"addBody","text":"Фотосинтез — процесс преобразования световой энергии в химическую. Происходит в хлоропластах растений. Уравнение: 6CO₂ + 6H₂O + свет → C₆H₁₂O₆ + 6O₂"},
{"cmd":"setLayout","name":"Аврора"},
{"cmd":"addSlide"},
{"cmd":"addIcon","iconId":"bio_leaf","size":150},
{"cmd":"addTitle","text":"Хлоропласты и хлорофилл"},
{"cmd":"addBody","text":"Хлоропласты — органеллы клетки, содержащие хлорофилл. Хлорофилл поглощает красный и синий свет, отражает зелёный — именно поэтому растения зелёные."}
]|||Создал 2 слайда о фотосинтезе с иконками!`;
}

// ── Groq API ──────────────────────────────────────────────────────────────────

async function _callAI(userMsg){
  const key = _getGroqKey();
  if(!key) throw new Error('NO_KEY');

  _history.push({role:'user', content: userMsg});

  const messages = [
    {role:'system', content: _sysPrompt()},
    ..._history.map(h=>({role:h.role, content:h.content}))
  ];

  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 4000
    })
  });

  if(!resp.ok){
    const err = await resp.text();
    throw new Error('Groq ' + resp.status + ': ' + err);
  }

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || '';
  _history.push({role:'assistant', content: text});
  return text;
}


// ── Парсинг ответа ──────────────────────────────────────────────────────────
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
    // Массив команд
    const mArr = str.match(/\[[\s\S]*?\]/);
    if(mArr){ try{ const r = JSON.parse(mArr[0]); if(Array.isArray(r)) return r; }catch(e){} }
    // Одиночный объект команды
    const mObj = str.match(/\{[\s\S]*?\}/);
    if(mObj){ try{ const r = JSON.parse(mObj[0]); if(r.cmd) return [r]; }catch(e){} }
    // Несколько объектов подряд
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
    background:var(--surface1,#1a1a2e); border:1px solid var(--border1,rgba(255,255,255,.1));
    box-shadow:0 8px 40px rgba(0,0,0,.5);
    display:none; flex-direction:column; overflow:hidden;
    font-family:inherit; font-size:13px;
  `;

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--border1,rgba(255,255,255,.1));background:linear-gradient(135deg,rgba(99,102,241,.2),rgba(168,85,247,.2))">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
        </div>
        <span style="font-weight:600;color:var(--text1,#e2e8f0)">AI Ассистент</span>
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
      <div class="ai-msg ai-msg-bot" style="background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.2);border-radius:10px;padding:8px 12px;color:var(--text1,#e2e8f0);line-height:1.5;max-width:90%">
        Привет! Я помогу с презентацией 🎨<br><br><span id="ai-status-hint" style="font-size:11px;color:#fbbf24">⚙ Нажми <b>⚙ Ключ</b> и вставь бесплатный Groq API ключ</span>
      </div>
    </div>
    <div style="padding:8px 10px;border-top:1px solid var(--border1,rgba(255,255,255,.1));display:flex;gap:6px">
      <textarea id="ai-input" rows="2" placeholder="Создай 3 слайда о фотосинтезе..." style="flex:1;background:var(--surface2,rgba(255,255,255,.05));border:1px solid var(--border2,rgba(255,255,255,.08));border-radius:8px;padding:6px 10px;color:var(--text1,#e2e8f0);font-family:inherit;font-size:12px;resize:none;outline:none;line-height:1.4"></textarea>
      <button id="ai-send" style="width:36px;height:36px;align-self:flex-end;border-radius:8px;border:none;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>
      </button>
    </div>
    <div style="padding:2px 12px 8px;display:flex;gap:6px;flex-wrap:wrap">
      <button id="ai-key-chip" class="ai-chip" onclick="aiShowKeyModal()" style="border-color:rgba(251,191,36,.4);color:#fbbf24;background:rgba(251,191,36,.1)">⚙ Ключ</button>
      <button class="ai-chip" onclick="aiChip('Добавь слайд с заголовком')">+ слайд</button>
      <button class="ai-chip" onclick="aiChip('Смени тему на тёмную')">тему</button>
      <button class="ai-chip" onclick="aiChip('Добавь оформление Аврора')">фон</button>
      <button class="ai-chip" onclick="aiChip('Создай презентацию о Биологии на 3 слайда')">о предмете</button>
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
    #ai-messages::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1); border-radius:2px; }
  </style>`);

  document.body.appendChild(btn);
  document.body.appendChild(panel);
  _panel = panel;

  // Событие кнопки
  btn.onclick = () => {
    const vis = panel.style.display === 'flex';
    panel.style.display = vis ? 'none' : 'flex';
    if(!vis) document.getElementById('ai-input').focus();
  };
  document.getElementById('ai-close').onclick = () => { panel.style.display='none'; };
  document.getElementById('ai-log-btn').onclick = () => { _showLog(); };

  // Fab click — просто открывает/закрывает панель
  document.getElementById('ai-fab').onclick = function(){
    const vis = _panel.style.display === 'flex';
    _panel.style.display = vis ? 'none' : 'flex';
    if(!vis){
      document.getElementById('ai-input').focus();
      // Обновляем статус ключа
      const hint = document.getElementById('ai-status-hint');
      const key = _getGroqKey();
      if(key && hint){ hint.style.color='#34d399'; hint.textContent='✓ Groq готов · ' + GROQ_MODEL; _modelReady=true; }
    }
  };

  // Отправка по Enter (Shift+Enter = новая строка)
  const inp = document.getElementById('ai-input');
  inp.addEventListener('keydown', e=>{
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); _send(); }
  });
  document.getElementById('ai-send').onclick = _send;
}

// ── Добавить сообщение ──────────────────────────────────────────────────────
function _addMsg(text, role, isLog){
  const msgs = document.getElementById('ai-messages');
  if(!msgs) return;
  const div = document.createElement('div');
  if(isLog){
    div.style.cssText='font-size:10px;color:#64748b;padding:2px 4px;line-height:1.6';
    div.textContent = text;
  } else if(role==='user'){
    div.style.cssText='background:rgba(168,85,247,.2);border:1px solid rgba(168,85,247,.25);border-radius:10px;padding:8px 12px;color:var(--text1,#e2e8f0);line-height:1.5;max-width:90%;align-self:flex-end;margin-left:auto;white-space:pre-wrap';
    div.textContent = text;
  } else {
    div.style.cssText='background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.2);border-radius:10px;padding:8px 12px;color:var(--text1,#e2e8f0);line-height:1.5;max-width:90%;white-space:pre-wrap';
    div.textContent = text;
  }
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
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

  if(!_getGroqKey()){
    _addMsg('⚠ Сначала введи Groq API ключ — нажми кнопку «⚙ Ключ» внизу.', 'assistant');
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
    if(err.message === 'NO_KEY') errMsg = '⚠ Введи Groq API ключ — нажми «⚙ Ключ» внизу.';
    else if(err.message.includes('401')) errMsg = '⚠ Неверный API ключ. Проверь в «⚙ Ключ».';
    else if(err.message.includes('429')) errMsg = '⚠ Превышен лимит запросов Groq. Подожди минуту.';
    _addMsg(errMsg, 'assistant');
  } finally {
    _logEntry(_entry);
    _setThinking(false);
    const _td = document.getElementById('ai-thinking-indicator');
    if(_td) _td.remove();
  }
}

function _setThinking(v){
  _thinking = v;
  const st = document.getElementById('ai-status');
  const sb = document.getElementById('ai-send');
  if(st) st.style.display = v ? 'inline' : 'none';
  if(sb) sb.style.opacity = v ? '0.4' : '1';
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
      <div style="width:440px;max-width:95vw;background:var(--surface1,#1a1a2e);border:1px solid var(--border1,rgba(255,255,255,.12));border-radius:14px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.6);font-family:inherit">
        <div style="font-weight:600;color:var(--text1,#e2e8f0);font-size:15px;margin-bottom:6px">🔑 Groq API ключ</div>
        <div style="font-size:12px;color:var(--text3,#64748b);margin-bottom:4px;line-height:1.6">
          Groq — бесплатный сервис для запуска LLM. Ключ хранится только в вашем браузере.
        </div>
        <div style="font-size:12px;color:var(--text3,#64748b);margin-bottom:16px">
          Получить бесплатный ключ: <a href="https://console.groq.com" target="_blank" style="color:#818cf8">console.groq.com</a> → API Keys → Create
        </div>
        <div style="position:relative;margin-bottom:10px">
          <input id="ai-groq-input" type="password" placeholder="gsk_..." style="width:100%;box-sizing:border-box;background:var(--surface2,rgba(255,255,255,.05));border:1px solid var(--border2,rgba(255,255,255,.1));border-radius:8px;padding:9px 38px 9px 12px;color:var(--text1,#e2e8f0);font-family:monospace;font-size:12px;outline:none;">
          <button onclick="const i=document.getElementById('ai-groq-input');i.type=i.type==='password'?'text':'password'" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3,#64748b);cursor:pointer">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div id="ai-groq-status" style="font-size:11px;margin-bottom:14px;min-height:16px"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button onclick="document.getElementById('ai-groq-modal').style.display='none'" style="padding:7px 16px;border-radius:7px;border:1px solid var(--border2,rgba(255,255,255,.1));background:none;color:var(--text2,#94a3b8);cursor:pointer;font-size:12px">Отмена</button>
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

window.aiSaveGroqKey = function(){
  const val = (document.getElementById('ai-groq-input').value||'').trim();
  const st = document.getElementById('ai-groq-status');
  if(!val){ st.style.color='#f87171'; st.textContent='✗ Введите ключ'; return; }
  _setGroqKey(val);
  _modelReady = true;
  const hint = document.getElementById('ai-status-hint');
  if(hint){ hint.style.color='#34d399'; hint.textContent='✓ Groq готов · ' + GROQ_MODEL; }
  st.style.color='#34d399'; st.textContent='✓ Сохранено';
  setTimeout(()=>{ document.getElementById('ai-groq-modal').style.display='none'; }, 600);
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
