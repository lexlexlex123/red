const fs = require('fs');
const path = require('path');
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

const file = process.argv[2] || path.join(__dirname, '_ppt_test/7-1.ppt');
const buf = fs.readFileSync(file);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const parsed = window._parsePptBinary(ab);
console.log('ar', parsed.ar, parsed.slideW + 'x' + parsed.slideH);
console.log('slides', parsed.slides.length, 'blips', parsed.images.length, 'linkDefs', parsed.links.length);

for (let i = 0; i < Math.min(5, parsed.slides.length); i++) {
  const s = parsed.slides[i];
  console.log(`\n--- slide ${i + 1} els=${s.els.length} ---`);
  s.els.forEach((e, j) => {
    if (e.kind === 'text') {
      console.log(
        `  [${j}] TEXT @(${e.x},${e.y},${e.w},${e.h}) link=${e.link || '-'} "${e.text.replace(/\s+/g, ' ').slice(0, 70)}"`
      );
    } else {
      console.log(`  [${j}] IMG  @(${e.x},${e.y},${e.w},${e.h}) link=${e.link || '-'} srcLen=${(e.src || '').length}`);
    }
  });
}

// slide with computers (index 3)
const s3 = parsed.slides[3];
if (s3) {
  console.log('\n=== slide 4 (computers) summary ===');
  console.log(
    'texts',
    s3.els.filter((e) => e.kind === 'text').map((e) => e.text.slice(0, 40))
  );
  console.log(
    'images',
    s3.els.filter((e) => e.kind === 'image').map((e) => `(${e.x},${e.y},${e.w},${e.h})`)
  );
}

const built = window._pptBinaryToSlides(parsed);
console.log('\nbuilt slides', built.length, 'canvas', built[0] && built[0].ar, built[0] && built[0].bgc);
const imgTotal = built.reduce((n, s) => n + s.els.filter((e) => e.type === 'image').length, 0);
const txtTotal = built.reduce((n, s) => n + s.els.filter((e) => e.type === 'text').length, 0);
const linkTotal = built.reduce((n, s) => n + s.els.filter((e) => e.link).length, 0);
console.log('totals text', txtTotal, 'img', imgTotal, 'linked', linkTotal);
console.log('OK');
