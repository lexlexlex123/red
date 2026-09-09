#!/usr/bin/env node
const fs = require('fs');
const body = fs.readFileSync('c:/github/red/.restore-layouts/patch-11054.txt', 'utf8');
// patch body ends with titleSvg line - trim that
const core = body
  .replace(/\n    titleSvg[\s\S]*$/, '')
  .replace(/,\s*$/, '')
  .replace(/\}\s*,\s*$/, '')
  .trim();

const header = `// Inkscape-based «Лес» layout (title + content) — restored from transcript
window._buildForestInkscape = function(w, h, a1, a2, isTitle, doAnimate) {
  const uid = 'fr' + Math.random().toString(36).slice(2, 7);
  const rng = s => { let x = Math.sin(s * 127.1 + 311.7) * 43758.5; return x - Math.floor(x); };
  const f = n => n.toFixed(1);
  const FP = isTitle ? (window.FOREST_PATHS || null) : (window.FOREST_PATHS_CONTENT || null);
  if (!FP) return '';
`;

const footer = `
};
`;

let out = header + core + footer;

// Later patches: deer c29, grass/trees paint fix, content mist between deer and grass
out = out.replace(
  /function paintForestMarkup\(html,color\)\{\s*if\(!html\) return '';\s*return html\.replace\(\/#d40000\/gi,color\)\.replace\(\/#000000\/gi,color\);\s*\}/,
  `function paintForestMarkup(html, color) {
        if (!html) return '';
        return html
          .replace(/#d40000/gi, color)
          .replace(/#000000/gi, color)
          .replace(/style="fill:#d40000"/gi, 'style="fill:' + color + '"')
          .replace(/style="fill:#000000"/gi, 'style="fill:' + color + '"')
          .replace(/style='fill:#d40000'/gi, "style='fill:" + color + "'")
          .replace(/style='fill:#000000'/gi, "style='fill:" + color + "'");
      }`
);

out = out.replace(/const c28=_sw\(1,7,a1\);/, 'const c29=_sw(1,8,a1);');
out = out.replace(/forestLayer\(c28,1,null,'bottom',sx,xa,P\.deer\)/, "forestLayer(c29,1,null,'bottom',sx,xa,P.deer)");

// Content: deer before grass, mist between grass layer and front
out = out.replace(
  /scene\+=forestLayer\(c19,1,null,'bottom',sx,xa,P\.trees\);\s*scene\+=mistBeltMid\(\);\s*scene\+=forestLayer\(c29,1,null,'bottom',sx,xa,P\.deer\);\s*scene\+=forestLayer\(c18,1,null,'bottom',sx,xa,P\.grass\);\s*scene\+=mistBeltFront\(\);/,
  `scene+=forestLayer(c19,1,null,'bottom',sx,xa,P.trees);
        scene+=forestLayer(c29,1,null,'bottom',sx,xa,P.deer);
        scene+=mistBeltMid();
        scene+=forestLayer(c19,1,null,'bottom',sx,xa,P.grass);
        scene+=mistBeltFront();`
);

// Title: mist before canopy layer (layer 19)
out = out.replace(
  /scene\+=mistBeltDeep\(\);\s*scene\+=forestLayer\(c19,'0','1',ya,sx\);/,
  `scene+=mistBeltDeep();
        scene+=mistBeltMid();
        scene+=forestLayer(c19,'0','1',ya,sx);`
);

fs.writeFileSync('c:/github/red/js/23a-forest-layout.js', out);
console.log('written', out.length, 'bytes');
