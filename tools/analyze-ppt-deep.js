/**
 * Deep dump of Polyakov PPT: persist slides, anchors, blips, hyperlinks.
 */
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.join(__dirname, '_ppt_test/7-1.ppt');
const buf = fs.readFileSync(file);
const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

// ── minimal CFB ──
function cfbRead(data) {
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
  const difat = [];
  for (let i = 0; i < 109; i++) {
    const v = dv.getInt32(76 + i * 4, true);
    if (v >= 0) difat.push(v);
  }
  let difatSec = difatFirst;
  for (let n = 0; n < difatCount && difatSec >= 0; n++) {
    const sec = data.subarray((difatSec + 1) * sectorSize, (difatSec + 2) * sectorSize);
    const sdv = new DataView(sec.buffer, sec.byteOffset, sec.byteLength);
    for (let i = 0; i < sectorSize / 4 - 1; i++) {
      const v = sdv.getInt32(i * 4, true);
      if (v >= 0) difat.push(v);
    }
    difatSec = sdv.getInt32(sectorSize - 4, true);
  }
  const fat = [];
  for (let i = 0; i < difat.length && i < fatSectors + 10; i++) {
    const sec = data.subarray((difat[i] + 1) * sectorSize, (difat[i] + 2) * sectorSize);
    const sdv = new DataView(sec.buffer, sec.byteOffset, sec.byteLength);
    for (let j = 0; j < sectorSize / 4; j++) fat.push(sdv.getInt32(j * 4, true));
  }
  function chain(start) {
    const out = [];
    let sec = start,
      g = 0;
    while (sec >= 0 && sec < fat.length && g++ < 1e6) {
      if (sec >= 0xfffffffe) break;
      out.push(sec);
      sec = fat[sec];
      if (sec === 0xfffffffe) break;
    }
    return out;
  }
  function readStream(start, size) {
    const secs = chain(start);
    const chunks = [];
    let left = size || secs.length * sectorSize;
    for (const s of secs) {
      const part = data.subarray((s + 1) * sectorSize, (s + 2) * sectorSize);
      const take = Math.min(left, part.length);
      chunks.push(part.subarray(0, take));
      left -= take;
      if (left <= 0) break;
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const c of chunks) {
      out.set(c, o);
      o += c.length;
    }
    return size > 0 ? out.subarray(0, size) : out;
  }
  const dirSecs = chain(firstDirSector);
  let dirLen = 0;
  dirSecs.forEach((s) => (dirLen += sectorSize));
  const dirBuf = new Uint8Array(dirLen);
  let o = 0;
  dirSecs.forEach((s) => {
    dirBuf.set(data.subarray((s + 1) * sectorSize, (s + 2) * sectorSize), o);
    o += sectorSize;
  });
  const ddv = new DataView(dirBuf.buffer, dirBuf.byteOffset, dirBuf.byteLength);
  const entries = [];
  for (let off = 0; off + 128 <= dirBuf.length; off += 128) {
    const nameLen = ddv.getUint16(off + 64, true);
    const nChars = Math.max(0, Math.min(32, (nameLen / 2) | 0));
    let name = '';
    for (let i = 0; i < nChars; i++) {
      const c = ddv.getUint16(off + i * 2, true);
      if (!c) break;
      name += String.fromCharCode(c);
    }
    const type = dirBuf[off + 66];
    if (!type) continue;
    entries.push({
      name,
      type,
      startSec: ddv.getInt32(off + 116, true),
      size: ddv.getUint32(off + 120, true),
    });
  }
  const root = entries.find((e) => e.type === 5);
  const miniFat = [];
  if (firstMiniFat >= 0) {
    for (const s of chain(firstMiniFat)) {
      const sec = data.subarray((s + 1) * sectorSize, (s + 2) * sectorSize);
      const sdv = new DataView(sec.buffer, sec.byteOffset, sec.byteLength);
      for (let j = 0; j < sectorSize / 4; j++) miniFat.push(sdv.getInt32(j * 4, true));
    }
  }
  const miniStream = root && root.size ? readStream(root.startSec, root.size) : new Uint8Array(0);
  function readMini(start, size) {
    const chunks = [];
    let sec = start,
      left = size,
      g = 0;
    while (sec >= 0 && left > 0 && g++ < 1e6) {
      if (sec >= 0xfffffffe) break;
      const off = sec * miniSectorSize;
      const take = Math.min(left, miniSectorSize, Math.max(0, miniStream.length - off));
      if (take > 0) chunks.push(miniStream.subarray(off, off + take));
      left -= take;
      sec = miniFat[sec];
      if (sec === 0xfffffffe) break;
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const c of chunks) {
      out.set(c, o);
      o += c.length;
    }
    return out;
  }
  const streams = {};
  for (const e of entries) {
    if (e.type !== 2 || !e.name) continue;
    try {
      streams[e.name.toLowerCase()] =
        e.size < miniCutoff && miniFat.length
          ? readMini(e.startSec, e.size)
          : readStream(e.startSec, e.size);
    } catch (err) {}
  }
  return streams;
}

function peek(u, at) {
  if (at < 0 || at + 8 > u.length) return null;
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  const verInst = dv.getUint16(at, true);
  const type = dv.getUint16(at + 2, true);
  const len = dv.getUint32(at + 4, true);
  if (len < 0 || at + 8 + len > u.length) return null;
  return {
    type,
    len,
    ver: verInst & 0xf,
    instance: verInst >> 4,
    dataOff: at + 8,
    dataEnd: at + 8 + len,
    start: at,
  };
}
function forEachChild(u, a, b, fn) {
  let o = a;
  while (o + 8 <= b) {
    const r = peek(u, o);
    if (!r || r.dataEnd > b) break;
    fn(r);
    o = r.dataEnd;
  }
}

const streams = cfbRead(data);
console.log('streams:', Object.keys(streams).map((k) => k + ':' + streams[k].length).join(', '));
const doc = streams['powerpoint document'];
const cu = streams['current user'];

// persist map
const persist = Object.create(null);
let editOffset = -1;
if (cu) {
  const dv = new DataView(cu.buffer, cu.byteOffset, cu.byteLength);
  let o = 0;
  if (dv.getUint16(2, true) === 0x0ff6) o = 8;
  editOffset = dv.getUint32(o + 8, true);
}
function readUE(at) {
  const r = peek(doc, at);
  if (!r || r.type !== 0x0ff5) return null;
  const dv = new DataView(doc.buffer, doc.byteOffset, doc.byteLength);
  return {
    offsetLastEdit: dv.getUint32(r.dataOff + 8, true),
    offsetPersistDirectory: dv.getUint32(r.dataOff + 12, true),
    docPersistIdRef: dv.getUint32(r.dataOff + 16, true),
  };
}
let guard = 0;
const visited = new Set();
let docPersistId = 1;
while (editOffset >= 0 && !visited.has(editOffset) && guard++ < 64) {
  visited.add(editOffset);
  const ue = readUE(editOffset);
  if (!ue) break;
  docPersistId = ue.docPersistIdRef || docPersistId;
  const po = ue.offsetPersistDirectory;
  const pr = peek(doc, po);
  if (pr && pr.type === 0x1772) {
    let q = pr.dataOff;
    while (q + 4 <= pr.dataEnd) {
      const hdr = new DataView(doc.buffer, doc.byteOffset, doc.byteLength).getUint32(q, true);
      q += 4;
      const pid = hdr & 0xfffff;
      const c = hdr >>> 20;
      for (let i = 0; i < c && q + 4 <= pr.dataEnd; i++) {
        persist[pid + i] = new DataView(doc.buffer, doc.byteOffset, doc.byteLength).getUint32(q, true);
        q += 4;
      }
    }
  }
  editOffset = ue.offsetLastEdit || -1;
  if (!editOffset) break;
}
console.log('persist entries', Object.keys(persist).length, 'docPersistId', docPersistId, 'docOff', persist[docPersistId]);

const docOff = persist[docPersistId];
const docRoot = peek(doc, docOff);
console.log('doc root type', docRoot && docRoot.type.toString(16));

// Find slide list
let slideList = null;
forEachChild(doc, docRoot.dataOff, docRoot.dataEnd, (r) => {
  if (r.type === 0x0ff0 && r.instance === 0) slideList = r;
});
console.log('slideList len', slideList && slideList.len);

// Parse slide persists
const slidesMeta = [];
let cur = null;
forEachChild(doc, slideList.dataOff, slideList.dataEnd, (r) => {
  if (r.type === 0x03f3) {
    const dv = new DataView(doc.buffer, doc.byteOffset, doc.byteLength);
    cur = {
      persistIdRef: dv.getUint32(r.dataOff, true),
      cTexts: dv.getUint32(r.dataOff + 8, true),
      slideId: dv.getUint32(r.dataOff + 12, true),
      texts: [],
    };
    slidesMeta.push(cur);
  } else if (cur && (r.type === 0x0fa0 || r.type === 0x0fa8)) {
    // skip counting
    cur.texts.push(r.len);
  }
});
console.log('slide persists', slidesMeta.length);
slidesMeta.slice(0, 5).forEach((s, i) => {
  console.log(`  s${i} persistId=${s.persistIdRef} cTexts=${s.cTexts} slideOff=${persist[s.persistIdRef]}`);
});

// For first 5 slides: inspect drawing for ClientAnchor + blip refs + InteractiveInfo
function walkDeep(u, a, b, depth, acc) {
  forEachChild(u, a, b, (r) => {
    acc.types[r.type] = (acc.types[r.type] || 0) + 1;
    // OfficeArtClientAnchor 0xF010
    if (r.type === 0xf010 && r.len >= 8) {
      const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
      // can be 1 flag + 8 coords or just 8 coords depending on length
      let o = r.dataOff;
      if (r.len === 8) {
        acc.anchors.push({
          l: dv.getInt16(o, true),
          t: dv.getInt16(o + 2, true),
          r: dv.getInt16(o + 4, true),
          b: dv.getInt16(o + 6, true),
        });
      } else if (r.len >= 16) {
        // sometimes 4 int32 EMUs? or small coords
        acc.anchors.push({
          raw: Array.from(u.subarray(o, o + Math.min(16, r.len))),
          len: r.len,
        });
      } else {
        acc.anchors.push({ len: r.len, raw: Array.from(u.subarray(o, o + r.len)) });
      }
    }
    // OfficeArtFSP 0xF00A — shape type in instance
    if (r.type === 0xf00a) {
      acc.shapes.push({ spid: r.instance /* wrong */, shapeType: r.instance, len: r.len });
    }
    // Blip reference in FOPT - hard; look for ExternalObjectRefAtom 0x0BC1
    if (r.type === 0x0bc1 && r.len >= 4) {
      const id = new DataView(u.buffer, u.byteOffset, u.byteLength).getUint32(r.dataOff, true);
      acc.exObjRefs.push(id);
    }
    // InteractiveInfo 0x0FF2
    if (r.type === 0x0ff2) acc.interactive++;
    // PlaceholderAtom 0x0BC3
    if (r.type === 0x0bc3 && r.len >= 8) {
      const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
      acc.placeholders.push({
        position: dv.getUint32(r.dataOff, true),
        placementId: dv.getUint8(r.dataOff + 4),
        size: dv.getUint8(r.dataOff + 5),
      });
    }
    // OutlineTextRefAtom 0x0F9E
    if (r.type === 0x0f9e && r.len >= 4) {
      acc.outlineRefs.push(new DataView(u.buffer, u.byteOffset, u.byteLength).getInt32(r.dataOff, true));
    }
    if (r.ver === 0xf && r.len > 8 && depth < 12) walkDeep(u, r.dataOff, r.dataEnd, depth + 1, acc);
  });
}

for (let i = 0; i < Math.min(4, slidesMeta.length); i++) {
  const off = persist[slidesMeta[i].persistIdRef];
  const sr = peek(doc, off);
  console.log(`\n=== SLIDE ${i} type=${sr && sr.type.toString(16)} off=${off} len=${sr && sr.len} ===`);
  const acc = { types: {}, anchors: [], shapes: [], exObjRefs: [], interactive: 0, placeholders: [], outlineRefs: [] };
  if (sr) walkDeep(doc, sr.dataOff, sr.dataEnd, 0, acc);
  console.log('top types', Object.entries(acc.types).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([t,c])=>parseInt(t).toString(16)+':'+c).join(' '));
  console.log('anchors', JSON.stringify(acc.anchors.slice(0, 8)));
  console.log('outlineRefs', acc.outlineRefs);
  console.log('placeholders', acc.placeholders);
  console.log('exObjRefs', acc.exObjRefs);
  console.log('interactive', acc.interactive);
}

// Pictures stream: count BLIPs
const pic = streams['pictures'];
if (pic) {
  let nJpg = 0, nPng = 0, o = 0;
  while (o + 8 <= pic.length) {
    const r = peek(pic, o);
    if (!r) break;
    if (r.type === 0xf01d || r.type === 0xf02a) nJpg++;
    if (r.type === 0xf01e || r.type === 0xf02b) nPng++;
    o = r.dataEnd;
    if (o <= r.dataOff) break;
  }
  console.log('\nPictures stream blips jpeg', nJpg, 'png', nPng, 'size', pic.length);
}

// DocumentAtom slide size
forEachChild(doc, docRoot.dataOff, docRoot.dataEnd, (r) => {
  if (r.type === 0x03e9 && r.len >= 16) {
    const dv = new DataView(doc.buffer, doc.byteOffset, doc.byteLength);
    // DocumentAtom: slideSize.x, slideSize.y as PointStruct (2 int32) in EMUs? Actually master bytes
    // MS-PPT DocumentAtom: slideSize (8) notesSize (8) serverZoom (8) ...
    const sx = dv.getInt32(r.dataOff, true);
    const sy = dv.getInt32(r.dataOff + 4, true);
    console.log('DocumentAtom slideSize', sx, sy, 'ratio', sx / sy);
  }
});
