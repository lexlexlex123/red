/* ══════════════ Binary PPT (PowerPoint 97–2003) importer ══════════════
 * Shape-accurate: PersistDirectory → slide containers → ClientAnchor + text + pib images + hyperlinks.
 * No autoplace/autofit. Uses real slide size (often 4:3).
 */
(function(){
'use strict';

function u8(buf){ return buf instanceof Uint8Array ? buf : new Uint8Array(buf); }

function cfbRead(buf){
  const data = u8(buf);
  if(data.length < 512) throw new Error('OLE too small');
  if(data[0]!==0xD0||data[1]!==0xCF||data[2]!==0x11||data[3]!==0xE0) throw new Error('Not OLE');
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const sectorShift = dv.getUint16(30, true);
  const miniSectorShift = dv.getUint16(32, true);
  const sectorSize = 1 << sectorShift;
  const miniSectorSize = 1 << miniSectorShift;
  const miniCutoff = dv.getUint32(56, true);
  const fatSectors = dv.getUint32(44, true);
  const firstDirSector = dv.getInt32(48, true);
  const firstMiniFat = dv.getInt32(60, true);
  const difatFirst = dv.getInt32(68, true);
  const difatCount = dv.getUint32(72, true);

  function readSector(sec){
    const off = (sec + 1) * sectorSize;
    return data.subarray(off, off + sectorSize);
  }
  const difat = [];
  for(let i=0;i<109;i++){
    const v = dv.getInt32(76 + i*4, true);
    if(v >= 0) difat.push(v);
  }
  let difatSec = difatFirst;
  for(let n=0;n<difatCount && difatSec>=0;n++){
    const sec = readSector(difatSec);
    const sdv = new DataView(sec.buffer, sec.byteOffset, sec.byteLength);
    for(let i=0;i<(sectorSize/4)-1;i++){
      const v = sdv.getInt32(i*4, true);
      if(v >= 0) difat.push(v);
    }
    difatSec = sdv.getInt32(sectorSize - 4, true);
  }
  const fat = [];
  for(let i=0;i<difat.length && i<fatSectors+10;i++){
    const sec = readSector(difat[i]);
    const sdv = new DataView(sec.buffer, sec.byteOffset, sec.byteLength);
    for(let j=0;j<sectorSize/4;j++) fat.push(sdv.getInt32(j*4, true));
  }
  function chainSectors(start){
    const out = [];
    let sec = start, guard = 0;
    while(sec >= 0 && sec < fat.length && guard++ < 1e6){
      if(sec >= 0xFFFFFFFE) break;
      out.push(sec);
      sec = fat[sec];
      if(sec === 0xFFFFFFFE) break;
    }
    return out;
  }
  function readStream(start, size){
    if(size < 0) size = 0;
    const secs = chainSectors(start);
    const chunks = [];
    let left = size || (secs.length * sectorSize);
    for(const s of secs){
      const part = readSector(s);
      const take = Math.min(left, part.length);
      chunks.push(part.subarray(0, take));
      left -= take;
      if(left <= 0) break;
    }
    const total = chunks.reduce((n,c)=>n+c.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for(const c of chunks){ out.set(c, o); o += c.length; }
    return size > 0 ? out.subarray(0, size) : out;
  }
  const dirSecs = chainSectors(firstDirSector);
  const dirLen = dirSecs.length * sectorSize;
  const dirBuf = new Uint8Array(dirLen);
  { let o=0; for(const s of dirSecs){ dirBuf.set(readSector(s), o); o += sectorSize; } }
  const ddv = new DataView(dirBuf.buffer, dirBuf.byteOffset, dirBuf.byteLength);
  const entries = [];
  for(let off=0; off+128<=dirBuf.length; off+=128){
    let name = '';
    const nameLen = ddv.getUint16(off + 64, true);
    const nChars = Math.max(0, Math.min(32, (nameLen/2)|0));
    for(let i=0;i<nChars;i++){
      const c = ddv.getUint16(off + i*2, true);
      if(c === 0) break;
      name += String.fromCharCode(c);
    }
    const type = dirBuf[off + 66];
    if(type === 0) continue;
    entries.push({
      name, type,
      startSec: ddv.getInt32(off + 116, true),
      size: ddv.getUint32(off + 120, true)
    });
  }
  const root = entries.find(e => e.type === 5) || entries[0];
  const miniFat = [];
  if(firstMiniFat >= 0){
    for(const s of chainSectors(firstMiniFat)){
      const sec = readSector(s);
      const sdv = new DataView(sec.buffer, sec.byteOffset, sec.byteLength);
      for(let j=0;j<sectorSize/4;j++) miniFat.push(sdv.getInt32(j*4, true));
    }
  }
  const miniStream = root && root.size > 0 ? readStream(root.startSec, root.size) : new Uint8Array(0);
  function readMiniStream(start, size){
    const chunks = [];
    let sec = start, left = size, guard = 0;
    while(sec >= 0 && left > 0 && guard++ < 1e6){
      if(sec >= 0xFFFFFFFE) break;
      const off = sec * miniSectorSize;
      const take = Math.min(left, miniSectorSize, Math.max(0, miniStream.length - off));
      if(take > 0) chunks.push(miniStream.subarray(off, off + take));
      left -= take;
      sec = miniFat[sec];
      if(sec === 0xFFFFFFFE) break;
    }
    const total = chunks.reduce((n,c)=>n+c.length,0);
    const out = new Uint8Array(total);
    let o=0; for(const c of chunks){ out.set(c,o); o+=c.length; }
    return out;
  }
  const streams = {};
  for(const e of entries){
    if(e.type !== 2 || !e.name) continue;
    try{
      streams[e.name.toLowerCase()] =
        (e.size < miniCutoff && miniFat.length)
          ? readMiniStream(e.startSec, e.size)
          : readStream(e.startSec, e.size);
    }catch(err){}
  }
  return streams;
}

function peekRec(u, at){
  if(at < 0 || at + 8 > u.length) return null;
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  const verInst = dv.getUint16(at, true);
  const type = dv.getUint16(at + 2, true);
  const len = dv.getUint32(at + 4, true);
  if(len < 0 || at + 8 + len > u.length) return null;
  return {
    type, len,
    ver: verInst & 0xF,
    instance: verInst >> 4,
    dataOff: at + 8,
    dataEnd: at + 8 + len,
    start: at
  };
}
function kids(u, a, b){
  const out = [];
  let o = a;
  while(o + 8 <= b){
    const r = peekRec(u, o);
    if(!r || r.dataEnd > b) break;
    out.push(r);
    o = r.dataEnd;
  }
  return out;
}

function decodeTextChars(u, off, len){
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let s = '';
  for(let i=0;i<(len/2)|0;i++){
    const c = dv.getUint16(off + i*2, true);
    if(c === 0) break;
    if(c === 0x0B || c === 0x0D) s += '\n';
    else if(c >= 32 || c === 9) s += String.fromCharCode(c);
  }
  return s.trim();
}
function decodeTextBytes(u, off, len){
  let hasHi = false;
  for(let i=0;i<len;i++) if(u[off+i] >= 0x80){ hasHi = true; break; }
  if(hasHi && typeof TextDecoder !== 'undefined'){
    try{ return new TextDecoder('windows-1251').decode(u.subarray(off, off+len)).replace(/\0+$/,'').trim(); }
    catch(e){}
  }
  let s = '';
  for(let i=0;i<len;i++){
    const c = u[off+i];
    if(!c) break;
    if(c === 0x0B || c === 0x0D) s += '\n';
    else if(c >= 32 || c === 9) s += String.fromCharCode(c);
  }
  return s.trim();
}

function firstUrlInText(text){
  const m = String(text||'').match(/(https?:\/\/[^\s<>"']+|mailto:[^\s<>"']+)/i);
  return m ? m[1].replace(/[.,;:)+]+$/,'') : null;
}
function isRealUrl(s){
  return /^(https?:\/\/|mailto:)/i.test(String(s||'').trim());
}
function normalizeUrl(s){
  return String(s||'').trim();
}
function isJunkText(t){
  const s = String(t||'').trim();
  if(!s) return true;
  if(s.length <= 2 && /^[*!•·●○◦▪▫]$/.test(s)) return true;
  return false;
}
function escHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function bytesToDataUrl(bytes, mime){
  let bin = '';
  const chunk = 0x8000;
  for(let i=0;i<bytes.length;i+=chunk)
    bin += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i+chunk, bytes.length)));
  return 'data:'+mime+';base64,'+btoa(bin);
}

function buildPersistMap(doc, currentUser){
  const persist = Object.create(null);
  let docPersistId = 1;
  let editOffset = -1;
  if(currentUser && currentUser.length >= 12){
    const dv = new DataView(currentUser.buffer, currentUser.byteOffset, currentUser.byteLength);
    let o = 0;
    if(dv.getUint16(2, true) === 0x0FF6) o = 8;
    editOffset = dv.getUint32(o + 8, true);
  }
  function readUserEdit(at){
    const r = peekRec(doc, at);
    if(!r || r.type !== 0x0FF5 || r.len < 20) return null;
    const dv = new DataView(doc.buffer, doc.byteOffset, doc.byteLength);
    return {
      offsetLastEdit: dv.getUint32(r.dataOff + 8, true),
      offsetPersistDirectory: dv.getUint32(r.dataOff + 12, true),
      docPersistIdRef: dv.getUint32(r.dataOff + 16, true)
    };
  }
  if(editOffset < 0 || editOffset >= doc.length){
    for(let o = Math.max(0, doc.length - 64); o >= 0; o--){
      if(readUserEdit(o)){ editOffset = o; break; }
    }
  }
  const visited = new Set();
  let guard = 0;
  while(editOffset >= 0 && !visited.has(editOffset) && guard++ < 64){
    visited.add(editOffset);
    const ue = readUserEdit(editOffset);
    if(!ue) break;
    docPersistId = ue.docPersistIdRef || docPersistId;
    const pr = peekRec(doc, ue.offsetPersistDirectory);
    if(pr && pr.type === 0x1772){
      const dv = new DataView(doc.buffer, doc.byteOffset, doc.byteLength);
      let q = pr.dataOff;
      while(q + 4 <= pr.dataEnd){
        const hdr = dv.getUint32(q, true); q += 4;
        const persistId = hdr & 0xFFFFF;
        const cPersist = hdr >>> 20;
        for(let i=0;i<cPersist && q+4<=pr.dataEnd;i++){
          persist[persistId + i] = dv.getUint32(q, true);
          q += 4;
        }
      }
    }
    editOffset = ue.offsetLastEdit || -1;
    if(!editOffset) break;
  }
  return { persist, docPersistId };
}

function extractBlipList(pic){
  const list = []; // 1-based via push order; index 0 unused conceptually
  if(!pic || !pic.length) return list;
  let o = 0;
  while(o + 8 <= pic.length){
    const r = peekRec(pic, o);
    if(!r) break;
    if(r.type === 0xF01D || r.type === 0xF02A){
      const src = findImageInRecord(pic, r.dataOff, r.len, 'jpeg');
      if(src) list.push(src);
    } else if(r.type === 0xF01E || r.type === 0xF02B){
      const src = findImageInRecord(pic, r.dataOff, r.len, 'png');
      if(src) list.push(src);
    } else if(r.type === 0xF007){
      // FBSE — blip may follow as next record; skip
    }
    o = r.dataEnd;
    if(o <= r.dataOff) break;
  }
  if(!list.length){
    // raw scan fallback
    for(let i=0;i<pic.length-3;i++){
      if(pic[i]===0xFF && pic[i+1]===0xD8 && pic[i+2]===0xFF){
        let j=i+2;
        while(j<pic.length-1){ if(pic[j]===0xFF&&pic[j+1]===0xD9){j+=2;break;} j++; }
        if(j-i>100) list.push(bytesToDataUrl(pic.subarray(i,j),'image/jpeg'));
        i=j;
      } else if(pic[i]===0x89&&pic[i+1]===0x50&&pic[i+2]===0x4E&&pic[i+3]===0x47){
        let j=i+8;
        while(j<pic.length-8){ if(pic[j]===0x49&&pic[j+1]===0x45&&pic[j+2]===0x4E&&pic[j+3]===0x44){j+=8;break;} j++; }
        if(j-i>100) list.push(bytesToDataUrl(pic.subarray(i,j),'image/png'));
        i=j;
      }
    }
  }
  return list;
}
function findImageInRecord(u, off, len, kind){
  const end = Math.min(u.length, off + len);
  if(kind === 'jpeg'){
    for(let i=off;i<end-2;i++)
      if(u[i]===0xFF&&u[i+1]===0xD8&&u[i+2]===0xFF)
        return bytesToDataUrl(u.subarray(i,end),'image/jpeg');
  } else {
    for(let i=off;i<end-8;i++)
      if(u[i]===0x89&&u[i+1]===0x50&&u[i+2]===0x4E&&u[i+3]===0x47)
        return bytesToDataUrl(u.subarray(i,end),'image/png');
  }
  return null;
}

function parseFOPT(u, off, len){
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  const props = Object.create(null);
  let o = off, end = off + len;
  while(o + 6 <= end){
    const op = dv.getUint16(o, true); o += 2;
    const pid = op & 0x3FFF;
    const isComplex = !!(op & 0x8000);
    const val = dv.getUint32(o, true); o += 4;
    if(isComplex){
      props[pid] = val; // length; skip bytes
      o += val;
      if(o > end) break;
    } else {
      props[pid] = val;
    }
  }
  return props;
}

function collectTextsIn(u, a, b, into){
  kids(u, a, b).forEach(function(r){
    if(r.type === 0x0FA0){
      const t = decodeTextChars(u, r.dataOff, r.len);
      if(t) into.push(t);
    } else if(r.type === 0x0FA8){
      const t = decodeTextBytes(u, r.dataOff, r.len);
      if(t) into.push(t);
    } else if(r.ver === 0xF && r.len > 0){
      collectTextsIn(u, r.dataOff, r.dataEnd, into);
    }
  });
}

function findHyperlinkIdIn(u, a, b){
  let found = null;
  kids(u, a, b).forEach(function(r){
    if(found != null) return;
    if(r.type === 0x0FF3 && r.len >= 8){
      // InteractiveInfoAtom: soundIdRef(4) exHyperlinkIdRef(4)
      const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
      const id = dv.getUint32(r.dataOff + 4, true);
      if(id) found = id;
    } else if(r.type === 0x0FF2 || r.ver === 0xF){
      const id = findHyperlinkIdIn(u, r.dataOff, r.dataEnd);
      if(id != null) found = id;
    }
  });
  return found;
}

function walkShapes(u, a, b, out){
  kids(u, a, b).forEach(function(r){
    if(r.type === 0xF004){ // SpContainer
      const shape = { texts: [], anchor: null, pib: null, exHyperlinkId: null, shapeType: null };
      kids(u, r.dataOff, r.dataEnd).forEach(function(c){
        if(c.type === 0xF00A){
          shape.shapeType = c.instance;
        } else if(c.type === 0xF00B){
          const props = parseFOPT(u, c.dataOff, c.len);
          if(props[0x104] != null) shape.pib = props[0x104] & 0xFFFF;
        } else if(c.type === 0xF010 && c.len >= 8){
          const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
          shape.anchor = {
            l: dv.getInt16(c.dataOff, true),
            t: dv.getInt16(c.dataOff + 2, true),
            w: dv.getInt16(c.dataOff + 4, true),
            h: dv.getInt16(c.dataOff + 6, true)
          };
        } else if(c.type === 0xF00D){
          collectTextsIn(u, c.dataOff, c.dataEnd, shape.texts);
          const hid = findHyperlinkIdIn(u, c.dataOff, c.dataEnd);
          if(hid != null) shape.exHyperlinkId = hid;
        } else if(c.type === 0xF011){
          const hid = findHyperlinkIdIn(u, c.dataOff, c.dataEnd);
          if(hid != null) shape.exHyperlinkId = hid;
        }
      });
      out.push(shape);
    } else if(r.type === 0xF003 || r.ver === 0xF){
      walkShapes(u, r.dataOff, r.dataEnd, out);
    }
  });
}

function extractLinkMap(doc, a, b){
  const map = Object.create(null);
  (function walk(x, y){
    kids(doc, x, y).forEach(function(r){
      if(r.type === 0x0FD7){ // ExternalHyperlink
        let id = null, url = '', title = '', loc = '';
        kids(doc, r.dataOff, r.dataEnd).forEach(function(c){
          if(c.type === 0x0FD3 && c.len >= 4){
            id = new DataView(doc.buffer, doc.byteOffset, doc.byteLength).getUint32(c.dataOff, true);
          } else if(c.type === 0x0FBA){
            const s = decodeTextChars(doc, c.dataOff, c.len);
            if(c.instance === 0) title = s;
            else if(c.instance === 1) url = s;
            else if(c.instance === 2) loc = s;
          }
        });
        let href = url || loc || '';
        if(!isRealUrl(href) && isRealUrl(title)) href = title;
        if(id != null && isRealUrl(href)){
          map[id] = { url: normalizeUrl(href), title: title || href };
        }
      } else if(r.ver === 0xF) walk(r.dataOff, r.dataEnd);
    });
  })(a, b);
  return map;
}

function readSlideSize(doc, docOff){
  let sx = 5760, sy = 4320; // default 4:3 master units
  const root = peekRec(doc, docOff);
  if(!root) return { sx, sy };
  kids(doc, root.dataOff, root.dataEnd).forEach(function(r){
    if(r.type === 0x03E9 && r.len >= 8){
      const dv = new DataView(doc.buffer, doc.byteOffset, doc.byteLength);
      sx = dv.getInt32(r.dataOff, true) || sx;
      sy = dv.getInt32(r.dataOff + 4, true) || sy;
    }
  });
  return { sx, sy };
}

function getSlidePersistIds(doc, docOff){
  const root = peekRec(doc, docOff);
  if(!root || root.type !== 0x03E8) return [];
  let list = null;
  kids(doc, root.dataOff, root.dataEnd).forEach(function(r){
    if(r.type === 0x0FF0 && r.instance === 0) list = r;
  });
  if(!list){
    kids(doc, root.dataOff, root.dataEnd).forEach(function(r){
      if(r.type === 0x0FF0 && !list) list = r;
    });
  }
  if(!list) return [];
  const ids = [];
  kids(doc, list.dataOff, list.dataEnd).forEach(function(r){
    if(r.type === 0x03F3 && r.len >= 4){
      const id = new DataView(doc.buffer, doc.byteOffset, doc.byteLength).getUint32(r.dataOff, true);
      ids.push(id);
    }
  });
  return ids;
}

/**
 * @returns {{slideW,slideH,ar,slides:Array<{els:Array}>}}
 * els items: {kind:'text'|'image', x,y,w,h, text?, src?, link?}
 */
function parsePptBinary(buf){
  const streams = cfbRead(buf);
  const doc = streams['powerpoint document'];
  if(!doc || !doc.length) throw new Error('No PowerPoint Document stream');
  const { persist, docPersistId } = buildPersistMap(doc, streams['current user']);
  let docOff = persist[docPersistId];
  if(docOff == null){
    for(let i=0;i<20;i++){
      const off = persist[i];
      const r = off != null ? peekRec(doc, off) : null;
      if(r && r.type === 0x03E8){ docOff = off; break; }
    }
  }
  if(docOff == null) docOff = 0;

  const { sx, sy } = readSlideSize(doc, docOff);
  const ratio = sx / sy;
  const ar = Math.abs(ratio - 16/9) < 0.08 ? '16:9' : '4:3';
  const slideW = ar === '16:9' ? 1200 : 1200;
  const slideH = ar === '16:9' ? 675 : 900;
  const scX = slideW / sx;
  const scY = slideH / sy;

  const blips = extractBlipList(streams['pictures']);
  const root = peekRec(doc, docOff);
  const linkMap = root ? extractLinkMap(doc, root.dataOff, root.dataEnd) : Object.create(null);

  const persistIds = getSlidePersistIds(doc, docOff);
  const slides = [];

  function addShapeSlide(shapes){
    const els = [];
    shapes.forEach(function(sh){
      if(!sh.anchor) return;
      let x = Math.round(sh.anchor.l * scX);
      let y = Math.round(sh.anchor.t * scY);
      let w = Math.round(Math.abs(sh.anchor.w) * scX);
      let h = Math.round(Math.abs(sh.anchor.h) * scY);
      // clamp into slide
      if(w < 8 || h < 8) return;
      if(x + w < 0 || y + h < 0 || x > slideW || y > slideH) return;
      x = Math.max(-20, Math.min(slideW - 10, x));
      y = Math.max(-20, Math.min(slideH - 10, y));
      w = Math.max(20, Math.min(slideW - Math.max(0,x), w));
      h = Math.max(16, Math.min(slideH - Math.max(0,y), h));

      let link = null;
      if(sh.exHyperlinkId != null && linkMap[sh.exHyperlinkId])
        link = linkMap[sh.exHyperlinkId].url;

      // Picture frame (msosptPictureFrame = 75)
      if(sh.pib && blips[sh.pib - 1]){
        els.push({ kind:'image', x:x, y:y, w:w, h:h, src: blips[sh.pib - 1], link: link });
        return;
      }

      const texts = (sh.texts || []).filter(function(t){ return !isJunkText(t); });
      if(!texts.length){
        // picture without resolved pib — skip empty
        return;
      }
      // Skip footer-like full-width tiny bars with junk only (already filtered)
      const text = texts.join('\n');
      // Auto-detect URL / email inside text
      if(!link){
        const u = firstUrlInText(text);
        if(u) link = normalizeUrl(u);
      }
      if(!link && isRealUrl(text)) link = normalizeUrl(text.split(/\s+/)[0]);
      const isTitle = y < slideH * 0.18 && texts.length === 1 && text.length < 80;
      els.push({
        kind:'text', x:x, y:y, w:w, h:h,
        text: text,
        fs: isTitle ? 34 : (h < 40 ? 16 : 20),
        fw: isTitle ? '700' : '400',
        align: isTitle ? 'center' : 'left',
        link: link
      });
    });
    return els;
  }

  if(persistIds.length){
    persistIds.forEach(function(pid){
      const off = persist[pid];
      if(off == null) return;
      const sr = peekRec(doc, off);
      if(!sr || sr.type !== 0x03EE) return;
      const shapes = [];
      walkShapes(doc, sr.dataOff, sr.dataEnd, shapes);
      const els = addShapeSlide(shapes);
      if(els.length) slides.push({ els: els });
    });
  }

  if(!slides.length) throw new Error('No slides/text found in .ppt');

  return {
    slideW: slideW, slideH: slideH, ar: ar,
    slides: slides,
    images: blips,
    links: Object.keys(linkMap).map(function(k){ return linkMap[k]; })
  };
}

function pptBinaryToSlides(parsed){
  const W = parsed.slideW || 1200;
  const H = parsed.slideH || 900;
  const ar = parsed.ar || '4:3';
  let ec = 0;
  return parsed.slides.map(function(raw, si){
    const els = [];
    let title = 'Слайд ' + (si + 1);
    (raw.els || []).forEach(function(e){
      if(e.kind === 'text'){
        if(si === 0 && !els.length) title = e.text.replace(/\s+/g,' ').slice(0, 60);
        else if(els.filter(function(x){return x.type==='text';}).length === 0)
          title = e.text.replace(/\s+/g,' ').slice(0, 60);
        const lines = String(e.text).split(/\n+/).filter(Boolean);
        const html = lines.map(function(ln){ return '<div>'+escHtml(ln)+'</div>'; }).join('');
        const fs = e.fs || 20;
        const fw = e.fw || '400';
        const align = e.align || 'left';
        const textColor = '#1e293b';
        const d = {
          id: 'e'+(ec++), type:'text',
          x: e.x, y: e.y, w: e.w, h: e.h,
          html: html,
          fs: fs, fw: fw,
          color: textColor, align: align,
          font: 'Arial, sans-serif', rot: 0, anims: [],
          // mkEl reads color from cs; textColorScheme:null locks against theme white
          cs: 'font-size:'+fs+'px;font-weight:'+fw+';color:'+textColor+';text-align:'+align+';',
          textColorScheme: null
        };
        if(e.link){ d.link = e.link; d.linkt = '_blank'; }
        els.push(d);
      } else if(e.kind === 'image'){
        const d = {
          id:'e'+(ec++), type:'image',
          x:e.x, y:e.y, w:e.w, h:e.h,
          src:e.src, rot:0, anims:[]
        };
        if(e.link){ d.link = e.link; d.linkt = '_blank'; }
        els.push(d);
      }
    });
    return {
      title: title,
      bg: 'custom',
      bgc: '#ffffff',
      ar: ar,
      trans: '', auto: 0,
      els: els
    };
  });
}

async function doParsePPTBinary(buf, filename){
  window._skipImportAutofit = true;
  try{
    showLoading('Чтение .ppt…', 35);
    const parsed = parsePptBinary(buf);
    showLoading('Сборка слайдов…', 75);
    const slides_out = pptBinaryToSlides(parsed);
    const W = parsed.slideW, H = parsed.slideH, arOut = parsed.ar;
    slides = slides_out; cur = 0; ar = arOut; canvasW = W; canvasH = H;
    document.getElementById('canvas').style.width = W + 'px';
    document.getElementById('canvas').style.height = H + 'px';
    document.querySelectorAll('.ar-btn').forEach(function(b){
      b.classList.toggle('active', b.textContent === arOut);
    });
    if(typeof clampEls === 'function') clampEls(W, H);
    showLoading('Finalizing…', 95);
    if(typeof renderAll === 'function') renderAll();
    if(typeof saveState === 'function') saveState();
    setTimeout(function(){
      try{ const raw = localStorage.getItem('sf_v4'); if(raw && window._idbSave) window._idbSave(raw); }catch(e){}
    }, 200);
    hideLoading();
    const imgCnt = slides_out.reduce(function(n,s){ return n + s.els.filter(function(e){return e.type==='image';}).length; }, 0);
    const txtCnt = slides_out.reduce(function(n,s){ return n + s.els.filter(function(e){return e.type==='text';}).length; }, 0);
    const linkCnt = slides_out.reduce(function(n,s){ return n + s.els.filter(function(e){return !!e.link;}).length; }, 0);
    const isRu = (typeof _lang !== 'undefined') ? _lang !== 'en' : true;
    toast(
      isRu
        ? ('Импорт .ppt: '+slides.length+' слайдов ('+arOut+'), текст: '+txtCnt+', рис.: '+imgCnt+(linkCnt?', ссылок: '+linkCnt:'')+' — по координатам оригинала')
        : ('Imported .ppt: '+slides.length+' slides ('+arOut+'), text: '+txtCnt+', images: '+imgCnt+(linkCnt?', links: '+linkCnt:''))
      , 'ok'
    );
  } finally {
    setTimeout(function(){ window._skipImportAutofit = false; }, 2500);
  }
}

window._parsePptBinary = parsePptBinary;
window._pptBinaryToSlides = pptBinaryToSlides;
window.doParsePPTBinary = doParsePPTBinary;
})();
