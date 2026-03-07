// ══════════════ AI ASSISTANT (Ollama через локальный сервер) ══════════════
(function(){
  const _sel      = ()=> (typeof sel!=='undefined')?sel:null;
  const _slides   = ()=> (typeof slides!=='undefined')?slides:[];
  const _cur      = ()=> (typeof cur!=='undefined')?cur:0;
  const _save     = ()=> typeof save==='function'&&save();
  const _saveState= ()=> typeof saveState==='function'&&saveState();
  const _pushUndo = ()=> typeof pushUndo==='function'&&pushUndo();
  const _toast    = (m,t)=> typeof toast==='function'&&toast(m,t);

  let aiOk    = false;
  let aiModel = '';

  // ── Проверка статуса ──────────────────────────────────────────────────────
  async function checkStatus(){
    try{
      const r = await fetch('/api/ai/status');
      const d = await r.json();
      aiOk    = d.ok;
      aiModel = d.model || '';
      return d;
    }catch(e){ aiOk=false; return {ok:false}; }
  }

  // ── Запрос к AI через сервер-прокси ───────────────────────────────────────
  async function ask(messages, onChunk){
    const res = await fetch('/api/ai', {
      method:  'POST',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify({ messages, max_tokens:512, temperature:0.7 }),
    });
    if(!res.ok){
      const e = await res.json().catch(()=>({}));
      throw new Error(e.error || 'HTTP '+res.status);
    }
    const reader = res.body.getReader();
    const dec    = new TextDecoder();
    let result='', buf='';
    while(true){
      const {done,value} = await reader.read();
      if(done) break;
      buf += dec.decode(value,{stream:true});
      const lines=buf.split('\n'); buf=lines.pop();
      for(const line of lines){
        if(!line.startsWith('data:')) continue;
        const data=line.slice(5).trim();
        if(data==='[DONE]') break;
        try{
          const evt=JSON.parse(data);
          if(evt.text){ result+=evt.text; if(onChunk) onChunk(result); }
        }catch(e){}
      }
    }
    return result;
  }

  // ── Панель ────────────────────────────────────────────────────────────────
  window.openAIPanel = async function(){
    document.getElementById('ai-panel')?.classList.add('open');
    updateAIContext();
    setStatus('⏳ Проверка...','idle');
    const d = await checkStatus();
    if(d.ok){
      setStatus('✓ '+d.model,'ok');
    } else {
      setStatus('✗ Ollama не запущен','err');
    }
    document.getElementById('ai-actions-wrap').style.opacity       = d.ok?'1':'.4';
    document.getElementById('ai-actions-wrap').style.pointerEvents = d.ok?'':'none';
    document.getElementById('ai-no-ollama').style.display          = d.ok?'none':'block';
  };

  window.closeAIPanel = function(){
    document.getElementById('ai-panel')?.classList.remove('open');
  };

  function setStatus(text,state){
    const el=document.getElementById('ai-status'); if(!el) return;
    el.textContent=text;
    el.style.color=state==='ok'?'var(--accent)':state==='err'?'#f87171':'var(--text3)';
  }

  function updateAIContext(){
    const ctx=document.getElementById('ai-ctx'); if(!ctx) return;
    const el=_sel(); const s=_slides()[_cur()];
    if(el&&el.dataset.type==='text'){
      const tmp=document.createElement('div');
      tmp.innerHTML=el.querySelector('.ec')?.innerHTML||'';
      ctx.textContent='📝 '+(tmp.textContent.trim().slice(0,80)||'Пустой текст');
    }else if(s){
      ctx.textContent='📄 '+(s.title||'Без названия');
    }else{
      ctx.textContent='Выберите объект или слайд';
    }
  }

  // ── Действия ──────────────────────────────────────────────────────────────
  window.runAIAction = async function(action){
    const el=_sel(); const s=_slides()[_cur()];
    const custom=document.getElementById('ai-custom-input')?.value?.trim();
    const outEl=document.getElementById('ai-output');
    const applyBtn=document.getElementById('ai-apply-btn');
    if(outEl){outEl.textContent='⏳';outEl.style.display='block';}
    if(applyBtn) applyBtn.style.display='none';

    let currentText='';
    if(el&&el.dataset.type==='text'){
      const tmp=document.createElement('div');
      tmp.innerHTML=el.querySelector('.ec')?.innerHTML||'';
      currentText=tmp.textContent.trim();
    }

    const SYS='Ты помощник для презентаций. Отвечай кратко. Только текст, без markdown и звёздочек.';
    let userMsg='';
    switch(action){
      case 'improve':
        if(!currentText){_toast('Выбери текстовый элемент');return;}
        userMsg=`Улучши текст для презентации, сделай профессиональным. Только текст:\n${currentText}`;break;
      case 'shorter':
        if(!currentText){_toast('Выбери текстовый элемент');return;}
        userMsg=`Сократи до 1-2 предложений:\n${currentText}`;break;
      case 'bullets':
        if(!currentText){_toast('Выбери текстовый элемент');return;}
        userMsg=`Преобразуй в 3-5 тезисов, каждый с новой строки:\n${currentText}`;break;
      case 'title':
        const txts=(s?.els||[]).filter(d=>d.type==='text').map(d=>{
          const t=document.createElement('div');t.innerHTML=d.html||'';return t.textContent.trim();
        }).join(' ');
        userMsg=`Придумай заголовок (3-6 слов) для слайда:\n${txts||'пустой слайд'}`;break;
      case 'custom':
        if(!custom){_toast('Введи запрос');return;}
        userMsg=currentText?`${custom}\n\nТекст:\n${currentText}`:custom;break;
      default: return;
    }

    try{
      const result=await ask(
        [{role:'system',content:SYS},{role:'user',content:userMsg}],
        chunk=>{if(outEl) outEl.textContent=chunk;}
      );
      if(applyBtn){
        applyBtn.style.display='block';
        applyBtn.dataset.result=result.trim();
        applyBtn.dataset.action=action;
      }
    }catch(e){
      if(outEl) outEl.textContent='Ошибка: '+e.message;
    }
  };

  window.applyAIResult = function(){
    const btn=document.getElementById('ai-apply-btn'); if(!btn) return;
    const result=btn.dataset.result; const action=btn.dataset.action;
    if(!result) return;
    const el=_sel(); const s=_slides()[_cur()];
    if(action==='title'&&s){
      _pushUndo(); s.title=result;
      if(typeof drawThumbs==='function') drawThumbs();
      _save();_saveState();_toast('Заголовок обновлён','ok');
    }else if(el&&el.dataset.type==='text'){
      _pushUndo();
      const ec=el.querySelector('.ec');
      if(ec){ec.textContent=result; const d=s?.els.find(x=>x.id===el.dataset.id); if(d) d.html=ec.innerHTML;}
      _save();_saveState();_toast('Текст обновлён','ok');
    }else{
      _toast('Выбери текстовый элемент','err');
    }
    btn.style.display='none';
  };

  window.addEventListener('load',()=>{
    const orig=window.pick;
    if(orig) window.pick=function(el){
      orig.call(this,el);
      if(document.getElementById('ai-panel')?.classList.contains('open')) updateAIContext();
    };
  });
})();
