/**
 * Dump shape-level text+anchor+blip for first slides of a PPT.
 */
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '_ppt_test/7-1.ppt');
const buf = fs.readFileSync(file);
const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

// paste cfb from previous via requiring analyze — inline short version by eval parser
global.window = global;
global.showLoading = () => {};
global.hideLoading = () => {};
global.toast = () => {};
global.slides = [];
global.document = { getElementById: () => ({ style: {} }), querySelectorAll: () => [] };
global._lang = 'ru';
eval(fs.readFileSync(path.join(__dirname, '../js/26b-ppt-binary.js'), 'utf8'));

// Access by re-implementing shape walk using copied helpers — parse file manually
function peek(u, at) {
  if (at < 0 || at + 8 > u.length) return null;
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  const verInst = dv.getUint16(at, true);
  const type = dv.getUint16(at + 2, true);
  const len = dv.getUint32(at + 4, true);
  if (len < 0 || at + 8 + len > u.length) return null;
  return { type, len, ver: verInst & 0xf, instance: verInst >> 4, dataOff: at + 8, dataEnd: at + 8 + len, start: at };
}
function kids(u, a, b) {
  const out = [];
  let o = a;
  while (o + 8 <= b) {
    const r = peek(u, o);
    if (!r || r.dataEnd > b) break;
    out.push(r);
    o = r.dataEnd;
  }
  return out;
}
function decodeU16(u, off, len) {
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let s = '';
  for (let i = 0; i < (len / 2) | 0; i++) {
    const c = dv.getUint16(off + i * 2, true);
    if (!c) break;
    if (c === 0x0b || c === 0x0d) s += '\n';
    else if (c >= 32 || c === 9) s += String.fromCharCode(c);
  }
  return s.trim();
}

// Use cfbRead from file by extracting streams via parse internals — duplicate minimal
const streams = (function () {
  // hack: call parse which uses cfb — instead re-read with node script from analyze-ppt-deep
  // We'll just shell out structure from 26b by exporting cfb — for now copy streams via CFB npm
  const CFB = require(require('path').join(require('os').tmpdir(), 'package', 'cfb.js'));
  const cfb = CFB.read(buf, { type: 'buffer' });
  const out = {};
  cfb.FileIndex.forEach((e) => {
    if (e && e.name && e.size && e.content) {
      out[String(e.name).replace(/^\u0005/, '').toLowerCase()] = e.content instanceof Uint8Array ? e.content : new Uint8Array(e.content);
    }
  });
  // SheetJS stores differently
  Object.keys(cfb.Files || {}).forEach((name) => {
    const e = cfb.Files[name];
    if (!e || e.content == null) return;
    const c = e.content;
    out[name.replace(/^\u0005/, '').toLowerCase()] = c instanceof Uint8Array ? c : new Uint8Array(c);
  });
  return out;
})();

console.log('stream keys', Object.keys(streams));
const doc = streams['powerpoint document'];
if (!doc) {
  console.log('no doc via CFB Files, falling back to analyze-ppt-deep persist dump');
  process.exit(0);
}

// Build persist quickly
const cu = streams['current user'];
const persist = Object.create(null);
let edit = -1;
if (cu) {
  const dv = new DataView(cu.buffer, cu.byteOffset, cu.byteLength);
  let o = dv.getUint16(2, true) === 0x0ff6 ? 8 : 0;
  edit = dv.getUint32(o + 8, true);
}
for (let g = 0; g < 32 && edit >= 0; g++) {
  const r = peek(doc, edit);
  if (!r || r.type !== 0x0ff5) break;
  const dv = new DataView(doc.buffer, doc.byteOffset, doc.byteLength);
  const pd = dv.getUint32(r.dataOff + 12, true);
  const last = dv.getUint32(r.dataOff + 8, true);
  const pr = peek(doc, pd);
  if (pr && pr.type === 0x1772) {
    let q = pr.dataOff;
    while (q + 4 <= pr.dataEnd) {
      const hdr = dv.getUint32(q, true);
      q += 4;
      const pid = hdr & 0xfffff,
        c = hdr >>> 20;
      for (let i = 0; i < c && q + 4 <= pr.dataEnd; i++) {
        persist[pid + i] = dv.getUint32(q, true);
        q += 4;
      }
    }
  }
  if (!last || last === edit) break;
  edit = last;
}

function parseFOPT(u, off, len) {
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  const props = {};
  let o = off;
  const end = off + len;
  // count from instance of parent — we don't have it; scan until end
  while (o + 6 <= end) {
    const op = dv.getUint16(o, true);
    o += 2;
    const pid = op & 0x3fff;
    const isComplex = op & 0x8000;
    const val = dv.getUint32(o, true);
    o += 4;
    if (isComplex) {
      props[pid] = { complex: true, len: val };
      o += val;
    } else props[pid] = val;
  }
  return props;
}

function walkShapes(u, a, b, out) {
  kids(u, a, b).forEach((r) => {
    if (r.type === 0xf004) {
      // SpContainer
      const shape = { texts: [], anchor: null, pib: null, hyperlink: null, shapeType: null };
      kids(u, r.dataOff, r.dataEnd).forEach((c) => {
        if (c.type === 0xf00a && c.len >= 8) {
          // FSP: instance is shape type
          shape.shapeType = c.instance;
        } else if (c.type === 0xf00b) {
          const props = parseFOPT(u, c.dataOff, c.len);
          // pib = 260 (0x104)
          if (props[0x104] != null) shape.pib = props[0x104];
          if (props[260] != null) shape.pib = props[260];
        } else if (c.type === 0xf010 && c.len >= 8) {
          const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
          shape.anchor = {
            l: dv.getInt16(c.dataOff, true),
            t: dv.getInt16(c.dataOff + 2, true),
            w: dv.getInt16(c.dataOff + 4, true),
            h: dv.getInt16(c.dataOff + 6, true),
          };
        } else if (c.type === 0xf00d) {
          // ClientTextbox
          kids(u, c.dataOff, c.dataEnd).forEach((t) => {
            if (t.type === 0x0fa0) {
              const s = decodeU16(u, t.dataOff, t.len);
              if (s) shape.texts.push(s);
            } else if (t.type === 0x0fa8) {
              let s = '';
              for (let i = 0; i < t.len; i++) {
                const ch = u[t.dataOff + i];
                if (!ch) break;
                s += String.fromCharCode(ch);
              }
              if (s.trim()) shape.texts.push(s.trim());
            } else if (t.ver === 0xf) {
              kids(u, t.dataOff, t.dataEnd).forEach((t2) => {
                if (t2.type === 0x0fa0) {
                  const s = decodeU16(u, t2.dataOff, t2.len);
                  if (s) shape.texts.push(s);
                }
              });
            }
          });
        } else if (c.type === 0xf011) {
          // ClientData — may contain InteractiveInfo, Placeholder, OutlineTextRef
          kids(u, c.dataOff, c.dataEnd).forEach((d) => {
            if (d.type === 0x0ff2) {
              // InteractiveInfo container
              kids(u, d.dataOff, d.dataEnd).forEach((ii) => {
                if (ii.type === 0x0ff3 && ii.len >= 24) {
                  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
                  // InteractiveInfoAtom: soundIdRef, exHyperlinkIdRef, ...
                  shape.exHyperlinkId = dv.getUint32(ii.dataOff + 4, true);
                }
              });
            }
            if (d.type === 0x0f9e && d.len >= 4) {
              shape.outlineRef = new DataView(u.buffer, u.byteOffset, u.byteLength).getInt32(d.dataOff, true);
            }
            if (d.ver === 0xf) {
              kids(u, d.dataOff, d.dataEnd).forEach((d2) => {
                if (d2.type === 0x0ff3 && d2.len >= 24) {
                  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
                  shape.exHyperlinkId = dv.getUint32(d2.dataOff + 4, true);
                }
              });
            }
          });
        } else if (c.ver === 0xf && c.type === 0xf003) {
          // SpgrContainer nested
          walkShapes(u, c.dataOff, c.dataEnd, out);
        }
      });
      out.push(shape);
    } else if (r.type === 0xf003) {
      walkShapes(u, r.dataOff, r.dataEnd, out);
    } else if (r.ver === 0xf) {
      walkShapes(u, r.dataOff, r.dataEnd, out);
    }
  });
}

// Get slide persist list from document
const docOff = persist[1] || 0;
const docRoot = peek(doc, docOff);
let slideList = null;
kids(doc, docRoot.dataOff, docRoot.dataEnd).forEach((r) => {
  if (r.type === 0x0ff0 && r.instance === 0) slideList = r;
});
const slidePersists = [];
kids(doc, slideList.dataOff, slideList.dataEnd).forEach((r) => {
  if (r.type === 0x03f3) {
    const dv = new DataView(doc.buffer, doc.byteOffset, doc.byteLength);
    slidePersists.push(dv.getUint32(r.dataOff, true));
  }
});

// Hyperlink id map from ExObjList
const linkMap = Object.create(null);
function findLinks(a, b) {
  kids(doc, a, b).forEach((r) => {
    if (r.type === 0x0fd7) {
      let id = null,
        url = '',
        title = '';
      kids(doc, r.dataOff, r.dataEnd).forEach((c) => {
        if (c.type === 0x0fd3 && c.len >= 4) {
          id = new DataView(doc.buffer, doc.byteOffset, doc.byteLength).getUint32(c.dataOff, true);
        }
        if (c.type === 0x0fba) {
          const s = decodeU16(doc, c.dataOff, c.len);
          if (c.instance === 0) title = s;
          if (c.instance === 1) url = s;
          if (c.instance === 2 && !url) url = s;
        }
      });
      if (id != null && (url || title)) linkMap[id] = { url: url || title, title: title || url };
    } else if (r.ver === 0xf) findLinks(r.dataOff, r.dataEnd);
  });
}
findLinks(docRoot.dataOff, docRoot.dataEnd);
console.log('linkMap', Object.keys(linkMap).length, linkMap);

for (let i = 0; i < Math.min(4, slidePersists.length); i++) {
  const off = persist[slidePersists[i]];
  const sr = peek(doc, off);
  const shapes = [];
  walkShapes(doc, sr.dataOff, sr.dataEnd, shapes);
  console.log(`\nSLIDE ${i} shapes=${shapes.length}`);
  shapes.forEach((s, j) => {
    const t = (s.texts || []).join(' | ').replace(/\s+/g, ' ').slice(0, 80);
    console.log(
      `  [${j}] anchor=${JSON.stringify(s.anchor)} pib=${s.pib} hyp=${s.exHyperlinkId} type=${s.shapeType} text="${t}"`
    );
  });
}
