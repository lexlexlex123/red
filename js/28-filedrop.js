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
      '<div id="filedrop-hint" style="font-size:11px;color:rgba(165,180,252,.7)">PPTX · HTML · JSON · Изображения · Видео · Аудио · OBJ · Markdown · Код</div>';
    document.body.appendChild(_overlay);
    return _overlay;
  }

  function _show(fileType){
    const ov = _getOverlay();
    const hint = document.getElementById('filedrop-hint');
    if(hint) hint.textContent = fileType || 'PPTX · HTML · JSON · Медиа · Markdown · Код';
    ov.style.display = 'flex';
    requestAnimationFrame(()=>{ ov.style.opacity = '1'; });
  }
  function _hide(){
    const ov = _getOverlay();
    ov.style.opacity = '0';
    setTimeout(()=>{ ov.style.display = 'none'; }, 150);
  }

  function _extOf(name){
    return String(name||'').split('.').pop().toLowerCase();
  }

  // Guess hint label from dragged items
  function _hintFromItems(items){
    if(!items || !items.length) return null;
    for(const item of items){
      if(item.kind !== 'file') continue;
      const t = item.type || '';
      const name = (item.name||'').toLowerCase();
      const ext = _extOf(name);
      if(t.includes('presentationml') || name.endsWith('.pptx') || name.endsWith('.ppt') || name.endsWith('.odp'))
        return 'PPTX / PPT — импорт презентации';
      if(t === 'text/html' || name.endsWith('.html') || name.endsWith('.htm'))
        return 'HTML — импорт экспортированной презентации';
      if(name.endsWith('.slides.json'))
        return 'JSON — восстановить состояние';
      if(t === 'application/json' || name.endsWith('.json'))
        return 'JSON — проект или блок кода';
      if(t.startsWith('image/') || ext === 'svg')
        return 'Изображение — вставить на слайд';
      if(t.startsWith('video/') || ['mp4','webm','mov','m4v','avi','mkv','ogv'].includes(ext))
        return 'Видео — вставить на слайд';
      if(t.startsWith('audio/') || ['mp3','wav','m4a','aac','flac','ogg','opus','wma'].includes(ext))
        return 'Аудио — вставить на слайд';
      if(['md','markdown','mdown','mkd'].includes(ext))
        return 'Markdown — вставить блок';
      if(ext === 'obj')
        return 'OBJ — 3D-модель на слайд';
      if(typeof _codeLangFromFilename==='function' && _codeLangFromFilename(name) && !['html','htm'].includes(ext))
        return 'Код — вставить блок';
    }
    return null;
  }

  function _isVideoFile(f){
    const ext=_extOf(f.name);
    return (f.type||'').startsWith('video/') || ['mp4','webm','mov','m4v','avi','mkv','ogv'].includes(ext);
  }
  function _isAudioFile(f){
    const ext=_extOf(f.name);
    const mime=f.type||'';
    return mime.startsWith('audio/') || ['mp3','wav','m4a','aac','flac','opus','wma'].includes(ext) || (ext==='ogg'&&!mime.startsWith('video/'));
  }
  function _isMdFile(f){
    return ['md','markdown','mdown','mkd'].includes(_extOf(f.name));
  }
  function _isCodeFile(f){
    const name=String(f.name||'').toLowerCase();
    const ext=_extOf(name);
    if(['html','htm','pptx','ppt','odp'].includes(ext)) return false;
    if(name.endsWith('.slides.json')) return false;
    return typeof _codeLangFromFilename==='function' && !!_codeLangFromFilename(name);
  }

  // Handle a single dropped File
  function _handleFile(file){
    if(!file) return;
    const ext = _extOf(file.name);
    const name = String(file.name||'').toLowerCase();

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

    // Явный снимок проекта
    if(name.endsWith('.slides.json') || ext === 'slides'){
      if(typeof importLiteFile === 'function') importLiteFile(file);
      else if(typeof toast === 'function') toast('importLiteFile недоступен','err');
      return;
    }

    // Графика / видео / аудио / markdown / код / json
    if(typeof importAssetFile === 'function' && importAssetFile(file)) return;

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
      f => ['pptx','ppt','odp'].includes(_extOf(f.name)),
      f => ['html','htm'].includes(_extOf(f.name)),
      f => String(f.name||'').toLowerCase().endsWith('.slides.json'),
      f => _extOf(f.name)==='json',
      f => (f.type||'').startsWith('image/') || _extOf(f.name)==='svg',
      f => _isVideoFile(f),
      f => _isAudioFile(f),
      f => _isMdFile(f),
      f => _isCodeFile(f),
    ];
    for(const test of order){
      const f = files.find(test);
      if(f){ _handleFile(f); return; }
    }
    // Fallback — try first file
    _handleFile(files[0]);
  }, false);

})();
