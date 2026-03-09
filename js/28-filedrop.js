// ══════════════ FILE DROP ══════════════
(function(){
  let _dragCounter = 0; // track nested dragenter/dragleave

  // Overlay element
  let _overlay = null;
  function _getOverlay(){
    if(_overlay) return _overlay;
    _overlay = document.createElement('div');
    _overlay.id = 'filedrop-overlay';
    _overlay.style.cssText = [
      'position:fixed','inset:0','z-index:99999',
      'display:none','align-items:center','justify-content:center',
      'flex-direction:column','gap:12px',
      'background:rgba(99,102,241,.13)',
      'border:3px dashed rgba(99,102,241,.7)',
      'pointer-events:none',
      'transition:opacity .15s',
    ].join(';');
    _overlay.innerHTML =
      '<div style="font-size:48px;line-height:1;filter:drop-shadow(0 2px 8px rgba(0,0,0,.4))">📂</div>' +
      '<div style="font-size:15px;font-weight:700;color:#a5b4fc;text-shadow:0 2px 8px rgba(0,0,0,.6)">' +
        'Перетащите файл для импорта' +
      '</div>' +
      '<div id="filedrop-hint" style="font-size:11px;color:rgba(165,180,252,.7)">PPTX · PPT · ODP · HTML · JSON · Изображения</div>';
    document.body.appendChild(_overlay);
    return _overlay;
  }

  function _show(fileType){
    const ov = _getOverlay();
    const hint = document.getElementById('filedrop-hint');
    if(hint) hint.textContent = fileType || 'PPTX · JSON · Изображения';
    ov.style.display = 'flex';
    requestAnimationFrame(()=>{ ov.style.opacity = '1'; });
  }
  function _hide(){
    const ov = _getOverlay();
    ov.style.opacity = '0';
    setTimeout(()=>{ ov.style.display = 'none'; }, 150);
  }

  // Guess hint label from dragged items
  function _hintFromItems(items){
    if(!items || !items.length) return null;
    for(const item of items){
      if(item.kind !== 'file') continue;
      const t = item.type || '';
      const name = (item.name||'').toLowerCase();
      if(t.includes('presentationml') || name.endsWith('.pptx') || name.endsWith('.ppt') || name.endsWith('.odp'))
        return 'PPTX / PPT / ODP — импорт презентации';
      if(t === 'text/html' || name.endsWith('.html') || name.endsWith('.htm'))
        return 'HTML — импорт экспортированной презентации';
      if(t === 'application/json' || name.endsWith('.json'))
        return 'JSON — восстановить состояние';
      if(t.startsWith('image/'))
        return 'Изображение — вставить на слайд';
    }
    return null;
  }

  // Handle a single dropped File
  function _handleFile(file){
    if(!file) return;
    const ext = file.name.split('.').pop().toLowerCase();

    // Presentation formats — PPTX / PPT / ODP
    if(['pptx','ppt','odp'].includes(ext)){
      if(typeof importPPTX === 'function'){
        importPPTX(file);
      } else {
        if(typeof toast === 'function') toast('importPPTX недоступен','err');
      }
      return;
    }

    // Exported HTML — use existing importHTMLFile
    if(ext === 'html' || ext === 'htm'){
      if(typeof importHTMLFile === 'function'){
        importHTMLFile(file);
      } else {
        if(typeof toast === 'function') toast('importHTMLFile недоступен','err');
      }
      return;
    }

    // JSON state snapshot
    if(ext === 'json'){
      const reader = new FileReader();
      reader.onload = ev => {
        try{
          const raw = ev.target.result;
          const parsed = JSON.parse(raw);
          if(!parsed.slides) throw new Error('Нет поля slides');
          localStorage.setItem('sf_v4', raw);
          if(typeof loadState === 'function') loadState();
          if(typeof renderAll === 'function') renderAll();
          if(typeof syncProps === 'function') syncProps();
          if(typeof toast === 'function') toast('JSON состояния загружен','ok');
        }catch(err){
          if(typeof toast === 'function') toast('Ошибка импорта JSON: '+err.message,'err');
        }
      };
      reader.readAsText(file);
      return;
    }

    // Image
    if(file.type.startsWith('image/')){
      const reader = new FileReader();
      reader.onload = ev => {
        if(typeof _addImageToCanvas === 'function'){
          _addImageToCanvas(ev.target.result);
          if(typeof toast === 'function') toast('Изображение добавлено','ok');
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    if(typeof toast === 'function') toast('Неподдерживаемый формат: .'+ext,'err');
  }

  // ── Events ────────────────────────────────────────────────────────
  document.addEventListener('dragenter', function(e){
    // Only react to file drags
    if(!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
    _dragCounter++;
    if(_dragCounter === 1){
      _show(_hintFromItems(e.dataTransfer.items));
    }
  }, false);

  document.addEventListener('dragleave', function(e){
    if(!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
    _dragCounter--;
    if(_dragCounter <= 0){
      _dragCounter = 0;
      _hide();
    }
  }, false);

  document.addEventListener('dragover', function(e){
    if(!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, false);

  document.addEventListener('drop', function(e){
    if(!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    _dragCounter = 0;
    _hide();

    const files = Array.from(e.dataTransfer.files);
    if(!files.length) return;

    // Process first supported file by priority
    const order = [
      f => ['pptx','ppt','odp'].includes(f.name.split('.').pop().toLowerCase()),
      f => ['html','htm'].includes(f.name.split('.').pop().toLowerCase()),
      f => f.name.toLowerCase().endsWith('.json'),
      f => f.type.startsWith('image/'),
    ];
    for(const test of order){
      const f = files.find(test);
      if(f){ _handleFile(f); return; }
    }
    // Fallback — try first file
    _handleFile(files[0]);
  }, false);

})();
