// ══════════════ IMAGE GALLERY MODAL ══════════════
// Категории галереи изображений
// Файлы лежат в images/{catId}/*.{svg,png,jpg,jpeg,webp,gif}
// Добавьте новые категории здесь — они автоматически появятся в модале

const IMAGE_CATS = [
  {id:'nature',      name:'Природа'},
  {id:'animals',     name:'Животные'},
  {id:'birds',       name:'Птицы'},
  {id:'business',    name:'Бизнес'},
  {id:'technology',  name:'Технологии'},
  {id:'backgrounds', name:'Фоны'},
  {id:'textures',    name:'Текстуры'},
  {id:'people',      name:'Люди'},
  {id:'abstract',    name:'Абстракция'},
  {id:'icons_png',   name:'Иконки PNG'},
];

// Реестр изображений — заполняется автоматически через IMAGE_INDEX
// Формат: [{id, cat, file, name, path, isSvg}]
// IMAGE_INDEX генерируется сервером или задаётся вручную в image-index.js
// IMAGE_REGISTRY перечитывается при каждом открытии модала
// так что достаточно обновить image-index.js и перезагрузить страницу
let IMAGE_REGISTRY = [];

let _imgCurCat = IMAGE_CATS[0].id;
let _imgSearchVal = '';
let _imgSelectedPath = null;
let _imgReplaceMode = false;

function _refreshRegistry(){
  const raw = (typeof IMAGE_INDEX !== 'undefined') ? IMAGE_INDEX : [];
  // Нормализуем каждую запись — добавляем path если не указан
  IMAGE_REGISTRY = raw.map(img => {
    if(!img) return null;
    const entry = Object.assign({}, img);
    // Если path не указан — строим из cat + file
    if(!entry.path && entry.cat && entry.file){
      entry.path = 'images/' + entry.cat + '/' + entry.file;
    }
    // Определяем isSvg по расширению если не указано
    if(entry.isSvg === undefined && entry.path){
      entry.isSvg = entry.path.toLowerCase().endsWith('.svg');
    }
    return entry;
  }).filter(Boolean);
}

// ── Открыть модал ──────────────────────────────────────────────────
function openImageModal(replaceMode){
  _imgReplaceMode = !!replaceMode;
  _imgSelectedPath = null;
  _imgSearchVal = '';
  const si = document.getElementById('img-search');
  if(si) si.value = '';
  // Обновляем реестр (IMAGE_INDEX мог измениться если файл перезагружен)
  _refreshRegistry();
  // Переключаемся на первую категорию с файлами если текущая пустая
  const hasCurrent = IMAGE_REGISTRY.some(x => x.cat === _imgCurCat);
  if(!hasCurrent){
    const first = IMAGE_CATS.find(c => IMAGE_REGISTRY.some(x => x.cat === c.id));
    if(first) _imgCurCat = first.id;
  }
  document.getElementById('img-modal').classList.add('open');
  _buildImgCatTabs();
  _buildImgGrid(_imgCurCat);
  // Сбрасываем кнопку вставки
  const ok = document.getElementById('img-modal-ok');
  if(ok) ok.disabled = true;
}

function closeImageModal(){
  document.getElementById('img-modal').classList.remove('open');
  _imgSelectedPath = null;
}

// ── Вкладки категорий ──────────────────────────────────────────────
function _buildImgCatTabs(){
  const tabs = document.getElementById('img-cat-tabs');
  if(!tabs) return;
  tabs.innerHTML = '';
  IMAGE_CATS.forEach(c => {
    // Показываем только категории у которых есть файлы
    const hasFiles = IMAGE_REGISTRY.some(x => x.cat === c.id);
    if(!hasFiles) return;
    const b = document.createElement('button');
    b.className = 'tbtn2' + (c.id === _imgCurCat ? ' active' : '');
    b.textContent = c.name;
    b.onclick = () => {
      _imgCurCat = c.id;
      _imgSearchVal = '';
      const si = document.getElementById('img-search');
      if(si) si.value = '';
      tabs.querySelectorAll('.tbtn2').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      _buildImgGrid(c.id);
    };
    tabs.appendChild(b);
  });
}

// ── Сетка изображений ──────────────────────────────────────────────
function _buildImgGrid(catId){
  const grid = document.getElementById('img-grid');
  if(!grid) return;
  grid.innerHTML = '';
  if(IMAGE_REGISTRY.length === 0){
    grid.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:24px;line-height:1.6">Галерея пуста.<br>Добавьте изображения в папки <code>images/{категория}/</code><br>и добавьте записи в <code>images/image-index.js</code></div>';
    return;
  }
  const imgs = IMAGE_REGISTRY.filter(x => x.cat === catId);
  if(imgs.length === 0){
    grid.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:20px">Нет изображений в этой категории</div>';
    return;
  }
  _renderImgCells(grid, imgs);
}

function _renderImgCells(grid, imgs){
  imgs.forEach(img => {
    // Защита: пропускаем записи без path
    if(!img || !img.path){
      console.warn('[ImageGallery] запись без path:', img);
      return;
    }
    const cell = document.createElement('div');
    cell.style.cssText = 'width:90px;height:70px;border-radius:6px;overflow:hidden;cursor:pointer;border:2px solid transparent;position:relative;background:var(--surface2);transition:.12s;flex-shrink:0;';
    // Превью
    // Превью через CSS background-image — не вызывает broken image курсор при ошибке
    const preview = document.createElement('div');
    preview.style.cssText = 'position:absolute;inset:0;background-size:cover;background-position:center;background-repeat:no-repeat;pointer-events:none;';
    // Кодируем спецсимволы в пути
    const encodedPath = img.path.split('/').map(function(p, i){
      return i === 0 ? p : encodeURIComponent(decodeURIComponent(p));
    }).join('/');
    preview.style.backgroundImage = 'url("' + encodedPath + '")';
    // Показываем расширение как заглушку (всегда, перекрывается если фото загрузилось)
    const ext = (img.path||'').split('.').pop().toUpperCase();
    const fb = document.createElement('div');
    fb.textContent = ext || '?';
    fb.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:var(--text3);pointer-events:none;z-index:-1;';
    cell.appendChild(fb);
    // SVG badge
    if(img.isSvg){
      const badge = document.createElement('div');
      badge.textContent = 'SVG';
      badge.style.cssText = 'position:absolute;bottom:3px;right:3px;background:rgba(0,0,0,.55);color:#fff;font-size:8px;padding:1px 4px;border-radius:3px;pointer-events:none;';
      cell.appendChild(badge);
    }
    cell.appendChild(preview);
    // Подпись
    const lbl = document.createElement('div');
    lbl.textContent = img.name;
    lbl.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.5);color:#fff;font-size:9px;padding:2px 4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;opacity:0;transition:.15s;pointer-events:none;';
    cell.appendChild(lbl);
    cell.onmouseenter = () => lbl.style.opacity = '1';
    cell.onmouseleave = () => lbl.style.opacity = '0';
    // Сохраняем path в dataset чтобы не зависеть от замыкания
    cell.dataset.imgPath = img.path;
    cell.dataset.imgIsSvg = img.isSvg ? '1' : '0';
    // Выбор
    cell.onclick = function(){
      // Сбрасываем выделение только у прямых дочерних ячеек грида
      const g = this.parentNode;
      if(g) Array.from(g.children).forEach(function(c){ c.style.borderColor = 'transparent'; });
      this.style.borderColor = 'var(--accent)';
      _imgSelectedPath = this.dataset.imgPath;
      _imgSelectedIsSvg = this.dataset.imgIsSvg === '1';
      const ok = document.getElementById('img-modal-ok');
      if(ok) ok.disabled = false;
    };
    // Двойной клик — сразу вставить
    cell.ondblclick = function(){
      _imgSelectedPath = this.dataset.imgPath;
      _imgSelectedIsSvg = this.dataset.imgIsSvg === '1';
      _insertSelectedImage();
    };
    grid.appendChild(cell);
  });
}

// ── Поиск ──────────────────────────────────────────────────────────
function filterImages(val){
  _imgSearchVal = val.toLowerCase().trim();
  const grid = document.getElementById('img-grid');
  if(!grid) return;
  grid.innerHTML = '';
  const imgs = _imgSearchVal
    ? IMAGE_REGISTRY.filter(x => x.name.toLowerCase().includes(_imgSearchVal))
    : IMAGE_REGISTRY.filter(x => x.cat === _imgCurCat);
  _renderImgCells(grid, imgs);
}

// ── Вставка выбранного изображения ────────────────────────────────
let _imgSelectedIsSvg = false;

function _insertSelectedImage(){
  if(!_imgSelectedPath || _imgSelectedPath === 'null'){
    console.error('[ImageGallery] путь не выбран:', _imgSelectedPath);
    return;
  }
  // Сохраняем до closeImageModal — она сбрасывает _imgSelectedPath
  const srcPath = _imgSelectedPath;
  const isSvg = _imgSelectedIsSvg;
  const replaceMode = _imgReplaceMode;
  closeImageModal();
  if(replaceMode && typeof sel !== 'undefined' && sel){
    // Заменяем src выбранного элемента
    const d = slides[cur].els.find(e => e.id === sel.dataset.id);
    if(d && (d.type === 'image' || d.type === 'svg')){
      d.src = srcPath;
      if(typeof renderAll === 'function') renderAll();
      if(typeof save === 'function') save();
      if(typeof saveState === 'function') saveState();
      return;
    }
  }
  const isSvgFinal = isSvg || srcPath.toLowerCase().endsWith('.svg');
  if(isSvgFinal){
    // Ищем запись в реестре — может содержать готовый svgContent
    const entry = IMAGE_REGISTRY.find(x => x.path === srcPath);
    if(entry && entry.svgContent && entry.svgContent.includes('<svg')){
      // Вставляем как редактируемый SVG (как из SVG модала)
      _insertAsSvg(entry.svgContent);
    } else {
      // SVG без контента — вставляем как картинку
      // Пользователь может добавить svgContent в image-index.js для редактируемости
      _insertAsImage(srcPath);
    }
  } else {
    _insertAsImage(srcPath);
  }
}

// Вставка SVG как редактируемого элемента (аналог insertSVG из 09-shapes.js)
function _insertAsSvg(code){
  if(!code || !code.includes('<svg')) return _insertAsImage(null);
  pushUndo();
  const d = {
    id: 'e' + (++ec),
    type: 'svg',
    x: typeof snapV === 'function' ? snapV(100) : 100,
    y: typeof snapV === 'function' ? snapV(100) : 100,
    w: typeof snapV === 'function' ? snapV(300) : 300,
    h: typeof snapV === 'function' ? snapV(300) : 300,
    svgContent: code,
    rot: 0, anims: []
  };
  slides[cur].els.push(d);
  mkEl(d);
  const el = document.getElementById('canvas').querySelector('[data-id="' + d.id + '"]');
  if(el) pick(el);
  save(); drawThumbs(); saveState();
}

// Вставка изображения — точно как handleImg в 11-elements.js
function _insertAsImage(src){
  if(!src || src === 'null' || src === 'undefined'){
    console.error('[ImageGallery] _insertAsImage вызван с пустым src:', src);
    return;
  }
  pushUndo();
  const tmp = new Image();
  tmp.onload = () => {
    const maxW = canvasW * 0.6, maxH = canvasH * 0.6;
    let w = tmp.naturalWidth || 400, h = tmp.naturalHeight || 300;
    // SVG может вернуть 0 — используем дефолт
    if(!w || w < 4) w = 400;
    if(!h || h < 4) h = 300;
    const scale = Math.min(maxW/w, maxH/h, 1);
    w = Math.round(w * scale); h = Math.round(h * scale);
    const d = {
      id: 'e' + (++ec),
      type: 'image',
      x: Math.round((canvasW - w) / 2),
      y: Math.round((canvasH - h) / 2),
      w, h, src, rot: 0, anims: [],
      imgFit: 'fill', imgRx: 0,
      imgBw: 0, imgBc: '#ffffff',
      imgShadow: false, imgShadowBlur: 15, imgShadowColor: '#000000',
      imgOpacity: 1,
    };
    slides[cur].els.push(d);
    mkEl(d);
    const el = document.getElementById('canvas').querySelector('[data-id="' + d.id + '"]');
    if(el) pick(el);
    save(); drawThumbs(); saveState();
  };
  tmp.onerror = () => {
    // Изображение не загрузилось (например CORS при file://)
    // Вставляем с размером по умолчанию
    const w = 400, h = 300;
    const d = {
      id: 'e' + (++ec),
      type: 'image',
      x: Math.round((canvasW - w) / 2),
      y: Math.round((canvasH - h) / 2),
      w, h, src, rot: 0, anims: [],
      imgFit: 'fill', imgRx: 0,
      imgBw: 0, imgBc: '#ffffff',
      imgShadow: false, imgShadowBlur: 15, imgShadowColor: '#000000',
      imgOpacity: 1,
    };
    slides[cur].els.push(d);
    mkEl(d);
    const el = document.getElementById('canvas').querySelector('[data-id="' + d.id + '"]');
    if(el) pick(el);
    save(); drawThumbs(); saveState();
  };
  tmp.src = src;
}

// ── Загрузка с компьютера (из модала) ─────────────────────────────
function imgModalUpload(){
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*,.svg';
  inp.onchange = e => {
    const file = e.target.files[0];
    if(!file) return;
    closeImageModal();
    const isSvg = file.type === 'image/svg+xml' || file.name.endsWith('.svg');
    if(isSvg){
      // SVG — читаем как текст и передаём в insertSvgElement (как в 28-filedrop.js)
      const reader = new FileReader();
      reader.onload = ev => {
        if(typeof insertSvgElement === 'function') insertSvgElement(ev.target.result);
        else {
          // Fallback: SVG как data URL
          const blob = new Blob([ev.target.result], {type:'image/svg+xml'});
          const url = URL.createObjectURL(blob);
          _insertAsImage(url);
        }
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = ev => _insertAsImage(ev.target.result);
      reader.readAsDataURL(file);
    }
    inp.value = '';
  };
  inp.click();
}
