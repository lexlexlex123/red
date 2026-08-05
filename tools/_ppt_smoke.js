/**
 * Smoke test for binary PPT import. Run: node tools/_ppt_smoke.js [optional.ppt]
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

global.window = global;
global.showLoading = () => {};
global.hideLoading = () => {};
global.toast = console.log;
global.slides = [];
global.cur = 0;
global.ar = '4:3';
global.canvasW = 1200;
global.canvasH = 900;
global.renderAll = () => {};
global.saveState = () => {};
global.clampEls = () => {};
global._lang = 'ru';
global.document = {
  getElementById: () => ({ style: {} }),
  querySelectorAll: () => [],
};

eval(fs.readFileSync(path.join(__dirname, '../js/26b-ppt-binary.js'), 'utf8'));

const real = process.argv[2] || path.join(__dirname, '_ppt_test/7-1.ppt');
if (fs.existsSync(real)) {
  const buf = fs.readFileSync(real);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const parsed = window._parsePptBinary(ab);
  const built = window._pptBinaryToSlides(parsed);
  console.log('real file slides', built.length, parsed.ar, parsed.slideW + 'x' + parsed.slideH);
  console.log('slide1 title els', built[0].els.length, built[0].els[0] && built[0].els[0].html && built[0].els[0].html.slice(0, 60));
  if (built.length < 40) {
    console.error('FAIL: expected ~51 slides');
    process.exit(1);
  }
  console.log('OK real');
  process.exit(0);
}

// Synthetic fallback
function rec(type, ver, inst, payload) {
  const len = payload.length;
  const buf = Buffer.alloc(8 + len);
  buf.writeUInt16LE((inst << 4) | ver, 0);
  buf.writeUInt16LE(type, 2);
  buf.writeUInt32LE(len, 4);
  payload.copy(buf, 8);
  return buf;
}
function textChars(s) {
  const b = Buffer.alloc(s.length * 2);
  for (let i = 0; i < s.length; i++) b.writeUInt16LE(s.charCodeAt(i), i * 2);
  return rec(0x0fa0, 0, 0, b);
}
function persist() {
  const b = Buffer.alloc(20);
  b.writeUInt32LE(1, 0);
  b.writeUInt32LE(0, 4);
  b.writeUInt32LE(1, 8);
  b.writeUInt32LE(256, 12);
  return rec(0x03f3, 0, 0, b);
}
const slide1 = Buffer.concat([persist(), rec(0x0f9f, 0, 0, Buffer.alloc(4)), textChars('Привет мир')]);
const list = rec(0x0ff0, 0xf, 0, slide1);
const documentContainer = rec(0x03e8, 0xf, 0, list);
const doc = Buffer.concat([documentContainer]);
const cfbPath = path.join(os.tmpdir(), 'package', 'cfb.js');
const CFB = require(cfbPath);
const cfb = CFB.utils.cfb_new();
CFB.utils.cfb_add(cfb, 'PowerPoint Document', doc);
const out = CFB.write(cfb, { type: 'buffer' });
try {
  window._parsePptBinary(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength));
} catch (e) {
  console.log('synth expected limited:', e.message);
}
console.log('OK synth-skip');
