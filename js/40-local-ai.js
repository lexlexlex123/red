// ══════════════════════════════════════════════════════════════════
// 40-local-ai.js — In-Browser AI через WebLLM + WebGPU
// Модель работает прямо в браузере, без сервера
// Требования: Chrome 113+ / Edge 113+, видеокарта с 4+ GB VRAM
// ══════════════════════════════════════════════════════════════════
(function(){

const LS_KEY = 'sf_webllm_cfg';
function getCfg(){ try{return JSON.parse(localStorage.getItem(LS_KEY)||'{}');}catch(e){return {};} }
function saveCfg(c){ localStorage.setItem(LS_KEY,JSON.stringify(c)); }

let _engine  = null;
let _loading = false;
let _ready   = false;
let _modelId = '';

// ── Доступные модели ─────────────────────────────────────────────
const MODELS = [
  { id:'Llama-3.2-1B-Instruct-q4f16_1-MLC',       label:'Llama 3.2 1B  (~800 MB) — быстрая',         vram:2 },
  { id:'Llama-3.2-3B-Instruct-q4f16_1-MLC',       label:'Llama 3.2 3B  (~2 GB)  — хорошее качество', vram:4 },
  { id:'Phi-3.5-mini-instruct-q4f16_1-MLC',       label:'Phi-3.5 Mini  (~2 GB)  — отличная для текста',vram:4 },
  { id:'gemma-2-2b-it-q4f16_1-MLC',               label:'Gemma 2 2B    (~1.5 GB) — Google',           vram:3 },
  { id:'Mistral-7B-Instruct-v0.3-q4f16_1-MLC',    label:'Mistral 7B    (~4 GB)  — максимум качества', vram:6 },
  { id:'Llama-3.1-8B-Instruct-q4f16_1-MLC',       label:'Llama 3.1 8B  (~5 GB)  — топ модель',        vram:8 },
];

// ── Проверка WebGPU ───────────────────────────────────────────────
async function checkWebGPU(){
  if(!navigator.gpu) return {ok:false, reason:'WebGPU не поддерживается. Используйте Chrome 113+ или Edge 113+.'};
  const adapter = await navigator.gpu.requestAdapter().catch(()=>null);
  if(!adapter) return {ok:false, reason:'GPU адаптер не найден. Обновите драйверы видеокарты.'};
  const info = adapter.info || {};
  return {ok:true, vendor: info.vendor||'', device: info.device||''};
}

// ── Загрузка модели ───────────────────────────────────────────────
async function loadModel(modelId, onProgress){
  try{
    // Импортируем WebLLM через ESM CDN
    // Подавляем warning про powerPreference (баг в WebLLM на Windows)
    const _origWarn = console.warn;
    console.warn = (...a) => { if(String(a[0]).includes('powerPreference')) return; _origWarn(...a); };
    const wllm = await import('https://esm.run/@mlc-ai/web-llm');
    setTimeout(()=>{ console.warn = _origWarn; }, 5000);
    const { CreateMLCEngine } = wllm;

    _engine = await CreateMLCEngine(modelId, {
      initProgressCallback: (p) => {
        const pct = p.progress != null ? Math.round(p.progress * 100) : null;
        const msg = p.text || 'Загрузка...';
        onProgress(msg + (pct != null ? ' · ' + pct + '%' : ''));
      },
    });

    _modelId = modelId;
    _ready   = true;
    saveCfg({ modelId });
    // Экспортируем для 36-ai.js — основная AI панель тоже будет использовать WebLLM
    window._webllmEngine  = _engine;
    window._webllmReady   = true;
    window._webllmModelId = modelId;
    // Обновляем кнопку и статус в AI-чате
    const _chip = document.getElementById('ai-webllm-chip');
    if(_chip){ _chip.style.borderColor='rgba(74,222,128,.5)'; _chip.style.color='#4ade80'; _chip.style.background='rgba(74,222,128,.1)'; _chip.textContent='✅ WebLLM'; }
    const _hint = document.getElementById('ai-status-hint');
    if(_hint){ _hint.style.color='#a78bfa'; _hint.textContent='✓ WebLLM активен · ' + modelId.split('-').slice(0,3).join('-'); }
    // Упрощённый системный промпт для WebLLM — маленькие модели плохо следуют сложным инструкциям
    window._webllmSysPrompt = `You are a presentation assistant. Respond ONLY with a valid JSON array of commands.
No text before or after the JSON array. No markdown, no backticks.
Commands: addSlide, addTitle (text), addBody (text), setLayout (name), setTheme (name).
Example: [{"cmd":"addSlide"},{"cmd":"addTitle","text":"Title"},{"cmd":"addBody","text":"Content"}]
Always respond in Russian language for text content.`;
    return true;
  }catch(e){
    _ready = false;
    throw e;
  }
}

// ── Запрос к модели (стрим) ───────────────────────────────────────
async function ask(systemPrompt, userPrompt, onChunk){
  if(!_ready || !_engine) throw new Error('Модель не загружена');

  const messages = [];
  if(systemPrompt) messages.push({ role:'system', content: systemPrompt });
  messages.push({ role:'user', content: userPrompt });

  let full = '';
  const stream = await _engine.chat.completions.create({
    messages,
    temperature: 0.75,
    max_tokens: 1500,
    stream: true,
  });

  for await(const chunk of stream){
    const delta = chunk.choices[0]?.delta?.content || '';
    if(delta){ full += delta; onChunk && onChunk(delta, full); }
  }
  return full;
}

// ── Парсинг JSON из ответа ────────────────────────────────────────
function parseJSON(raw){
  // Пробуем напрямую
  try{ return JSON.parse(raw.trim()); }catch(_){}
  // Ищем массив или объект
  const mArr = raw.match(/\[[\s\S]*\]/);
  if(mArr){ try{ return JSON.parse(mArr[0]); }catch(_){} }
  const mObj = raw.match(/\{[\s\S]*\}/);
  if(mObj){ try{ return JSON.parse(mObj[0]); }catch(_){} }
  return null;
}

// ══════════════════════════════════════════════════════════════════
// ЗАДАЧИ
// ══════════════════════════════════════════════════════════════════
const SYS = `Ты помощник по созданию презентаций. Отвечай на русском языке.
Когда требуется JSON — возвращай ТОЛЬКО JSON, без пояснений и markdown.`;

async function taskGenerate(topic, count, onChunk){
  const raw = await ask(SYS,
    `Создай презентацию на тему: "${topic}", ${count} слайдов.
Верни JSON-массив: [{"title":"Заголовок","body":"Текст 2-3 предложения"}, ...]
Только JSON!`, onChunk);
  const data = parseJSON(raw);
  if(!Array.isArray(data)) throw new Error('Не удалось разобрать ответ. Попробуйте ещё раз.');
  return data;
}

async function taskImprove(text, onChunk){
  return await ask(null,
    `Улучши этот текст для слайда презентации. Сделай его короче, чётче, профессиональнее.
Верни только готовый текст, без пояснений:

"${text}"`, onChunk);
}

async function taskTitles(topic, onChunk){
  const raw = await ask(SYS,
    `Придумай 5 вариантов заголовка и подзаголовка для презентации: "${topic}".
Верни JSON: [{"title":"...","subtitle":"..."}, ...]
Только JSON!`, onChunk);
  const data = parseJSON(raw);
  return Array.isArray(data) ? data : [];
}

async function taskStructure(topic, onChunk){
  const raw = await ask(SYS,
    `Предложи структуру презентации на тему: "${topic}", 5-7 разделов.
Верни JSON: [{"section":"Название","slides":2,"description":"Что включить"}, ...]
Только JSON!`, onChunk);
  const data = parseJSON(raw);
  return Array.isArray(data) ? data : [];
}

// ══════════════════════════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════════════════════════
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function $out(){ return document.getElementById('lai-out'); }
function setOut(html){ $out().innerHTML = html; }
function appendOut(text){
  const el = $out();
  // Если внутри есть pre — дописываем в него
  let pre = el.querySelector('pre');
  if(!pre){ pre = document.createElement('pre'); pre.style.cssText='margin:0;white-space:pre-wrap;word-break:break-word;'; el.appendChild(pre); }
  pre.textContent += text;
  el.scrollTop = el.scrollHeight;
}
function clearOut(){ $out().innerHTML = ''; }

function statusLine(icon, msg, color){
  return `<div style="display:flex;align-items:center;gap:6px;padding:6px 0;color:${color||'var(--text2)'}">
    <span style="font-size:16px">${icon}</span><span style="font-size:12px">${esc(msg)}</span></div>`;
}

// ── Применить сгенерированные слайды ─────────────────────────────
function applySlides(data){
  if(!data||!data.length) return;
  pushUndo();
  if(slides.length===1 && !(slides[0].els||[]).filter(e=>!e._isDecor&&e.type==='text').length)
    slides.splice(0,1);
  const base = slides[0] || {};
  data.forEach((sd, i)=>{
    const s = {
      title: sd.title || ('Слайд '+(slides.length+1)),
      bg: base.bg||'dark1', bgc: base.bgc||'#1a1a2e',
      ar: base.ar||'16:9', trans:'', auto:0, els:[],
    };
    if(sd.title) s.els.push({
      id:'wt'+Date.now()+'_'+i, type:'text',
      x:60,y:50,w:1080,h:120, rot:0,anims:[],isTrigger:false,
      html:'<div>'+esc(sd.title)+'</div>', valign:'middle',
      cs:'font-size:40px;font-weight:700;text-align:center;color:#ffffff;text-transform:uppercase',
      textRole:'heading',
    });
    if(sd.body) s.els.push({
      id:'wb'+Date.now()+'_'+i, type:'text',
      x:60,y:195,w:1080,h:390, rot:0,anims:[],isTrigger:false,
      html:'<div>'+(sd.body||'').split('\n').map(esc).join('</div><div>')+'</div>',
      valign:'top',
      cs:'font-size:26px;text-align:center;color:#ffffff;',
      textRole:'body',
    });
    slides.push(s);
  });
  renderAll(); saveState(); drawThumbs();
  toast('✨ Добавлено ' + data.length + ' слайдов');
  closeLocalAIModal();
}

// ══════════════════════════════════════════════════════════════════
// ПУБЛИЧНЫЙ API
// ══════════════════════════════════════════════════════════════════
window.openLocalAIModal = function(){ window._showWebLLMInChat && window._showWebLLMInChat(); };
window._openLocalAIModalFull = async function(){
  const modal = document.getElementById('local-ai-modal');
  modal.classList.add('open');

  // Заполняем список моделей
  const sel = document.getElementById('lai-model-sel');
  const cfg = getCfg();
  sel.innerHTML = MODELS.map(m=>
    `<option value="${m.id}" ${cfg.modelId===m.id?'selected':''}>${m.label}</option>`
  ).join('');

  // Статус WebGPU
  const gpu = await checkWebGPU();
  if(!gpu.ok){
    setOut(statusLine('❌', gpu.reason, '#f87171'));
  } else if(_ready){
    setOut(statusLine('✅', 'Модель готова: ' + _modelId, '#4ade80'));
  } else {
    const info = gpu.vendor ? ` (${gpu.vendor} ${gpu.device})`.trim() : '';
    setOut(statusLine('✅', 'WebGPU доступен'+info+'. Выберите модель и нажмите «Загрузить».', '#34d399'));
  }
};

window.closeLocalAIModal = function(){
  document.getElementById('local-ai-modal').classList.remove('open');
};

window.laiLoad = async function(){
  if(_loading){ return; }
  const gpu = await checkWebGPU();
  if(!gpu.ok){ setOut(statusLine('❌', gpu.reason, '#f87171')); return; }

  const modelId = document.getElementById('lai-model-sel').value;
  const loadBtn = document.getElementById('lai-load-btn');
  _loading = true; _ready = false;
  loadBtn.disabled = true;

  // Анимация заполнения кнопки
  let _pct = 0;
  function _setBtnProgress(pct, label){
    _pct = Math.max(0, Math.min(100, pct));
    loadBtn.textContent = label || ('Загрузка ' + _pct + '%');
    loadBtn.style.backgroundImage =
      'linear-gradient(90deg,#4ade80 ' + _pct + '%,rgba(99,102,241,0.3) ' + _pct + '%)';
    loadBtn.style.backgroundSize = '100% 100%';
    loadBtn.style.transition = 'background-image 0.4s ease';
  }
  _setBtnProgress(0, 'Инициализация...');

  clearOut();
  setOut(statusLine('⏳', 'Инициализация WebLLM...', 'var(--text2)'));

  try{
    await loadModel(modelId, (msg)=>{
      // Извлекаем процент из сообщения
      const m = msg.match(/(\d+)%/);
      const pct = m ? parseInt(m[1]) : _pct;
      _setBtnProgress(pct, msg.slice(0, 32) + (msg.length>32?'…':''));
      setOut(statusLine('⏳', msg, 'var(--text2)'));
    });
    // Заполняем полностью
    _setBtnProgress(100, '✅ Модель загружена');
    loadBtn.style.backgroundImage = 'linear-gradient(135deg,#4ade80,#22d3ee)';
    setOut(statusLine('✅', 'Модель готова: ' + modelId, '#4ade80'));
  }catch(e){
    loadBtn.style.backgroundImage = 'linear-gradient(135deg,#6366f1,#8b5cf6)';
    loadBtn.textContent = '⬇️ Загрузить модель';
    loadBtn.disabled = false;
    setOut(statusLine('❌', e.message, '#f87171'));
  }finally{
    _loading = false;
  }
};

window.laiRun = async function(task){
  if(!_ready){
    setOut(statusLine('⚠️', 'Сначала загрузите модель', '#fbbf24'));
    return;
  }
  const topic = (document.getElementById('lai-topic').value||'').trim();
  const count = parseInt(document.getElementById('lai-count').value)||5;

  if(!topic && task!=='improve'){
    setOut(statusLine('⚠️', 'Введите тему презентации', '#fbbf24'));
    return;
  }

  const runBtns = document.querySelectorAll('#lai-actions button');
  runBtns.forEach(b=>b.disabled=true);
  clearOut();

  const onChunk = (delta)=>appendOut(delta);

  try{
    if(task==='generate'){
      appendOut('');  // создаём pre
      const data = await taskGenerate(topic, count, onChunk);
      // Показываем карточки
      let html = `<div style="font-size:11px;color:#4ade80;margin-bottom:8px">✅ Готово ${data.length} слайдов:</div>`;
      data.forEach((s,i)=>{
        html += `<div class="lai-card">
          <b>${i+1}. ${esc(s.title)}</b>
          <span>${esc((s.body||'').slice(0,110))}…</span>
        </div>`;
      });
      html += `<button onclick="window._wllmSlides && applyWllmSlides()"
        style="margin-top:10px;width:100%;padding:9px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">
        ✅ Применить слайды в презентацию
      </button>`;
      setOut(html);
      window._wllmSlides = data;
    }

    else if(task==='improve'){
      const s = slides[cur];
      const txts = (s.els||[]).filter(e=>e.type==='text');
      if(!txts.length){ setOut(statusLine('⚠️','Нет текста на текущем слайде','#fbbf24')); return; }
      for(const t of txts){
        const plain = (t.html||'').replace(/<[^>]+>/g,'').replace(/&[^;]+;/g,' ').trim();
        if(!plain) continue;
        clearOut(); appendOut('');
        const improved = await taskImprove(plain, onChunk);
        pushUndo();
        t.html = '<div>' + esc(improved.trim()) + '</div>';
        renderAll(); saveState();
        setOut(statusLine('✅','Текст улучшен!','#4ade80') +
          `<div class="lai-card">${esc(improved)}</div>`);
      }
    }

    else if(task==='titles'){
      appendOut('');
      const data = await taskTitles(topic, onChunk);
      let html = `<div style="font-size:11px;color:var(--text2);margin-bottom:8px">Кликните чтобы применить:</div>`;
      data.forEach((t,i)=>{
        html += `<div class="lai-card lai-card-click" onclick="applyWllmTitle(${i})">
          <b>${i+1}. ${esc(t.title)}</b>
          <span>${esc(t.subtitle)}</span>
        </div>`;
      });
      setOut(html);
      window._wllmTitles = data;
    }

    else if(task==='structure'){
      appendOut('');
      const data = await taskStructure(topic, onChunk);
      let html = `<div style="font-size:11px;color:var(--text2);margin-bottom:8px">Предлагаемая структура:</div>`;
      data.forEach((s,i)=>{
        html += `<div class="lai-card">
          <b>${i+1}. ${esc(s.section)}</b>
          <em style="color:var(--accent);font-style:normal">${s.slides} слайда</em>
          <span>${esc(s.description)}</span>
        </div>`;
      });
      setOut(html);
    }

  }catch(e){
    setOut(statusLine('❌', e.message, '#f87171'));
  }finally{
    runBtns.forEach(b=>b.disabled=false);
  }
};

window.applyWllmSlides = function(){ applySlides(window._wllmSlides); };

window.applyWllmTitle = function(i){
  const t = (window._wllmTitles||[])[i]; if(!t) return;
  pushUndo();
  const txts = (slides[cur].els||[]).filter(e=>e.type==='text');
  if(txts[0]) txts[0].html = '<div>' + esc(t.title) + '</div>';
  if(txts[1]) txts[1].html = '<div>' + esc(t.subtitle) + '</div>';
  renderAll(); saveState();
  toast('Заголовок применён');
};

// Кнопка в существующей AI-панели
setTimeout(()=>{
  const origOpen = window.openAiModal;
  if(typeof origOpen==='function'){
    window.openAiModal = function(){
      origOpen.apply(this,arguments);
      const modal = document.getElementById('ai-modal');
      if(modal && !modal.querySelector('.wllm-inject')){
        const btn = document.createElement('button');
        btn.className = 'mbtn wllm-inject';
        btn.style.cssText = 'width:100%;margin-top:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;';
        btn.innerHTML = '🧠 In-Browser AI (WebLLM)';
        btn.onclick = ()=>{ if(typeof closeAiModal==='function')closeAiModal(); openLocalAIModal(); };
        const box = modal.querySelector('.imp-modal-box');
        if(box) box.appendChild(btn);
      }
    };
  }
}, 1500);

})();
