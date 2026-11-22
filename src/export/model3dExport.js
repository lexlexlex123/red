/**
 * Embed live WebGL OBJ viewer into standalone HTML export / playback shell.
 * Runtime is the editor module inlined as an IIFE (model3d.js has no imports).
 */

import model3dSrc from '../editor/model3d.js?raw';

/** Strip ESM exports so the file can run as a classic script. */
export function model3dExportIife() {
  // Strip ESM exports so the file can run as a classic <script> IIFE.
  // `export const` / `export function` left in place throw "Unexpected token 'export'"
  // and break the entire standalone HTML (not only decks with model3d).
  const body = String(model3dSrc || '')
    .replace(/^export\s+async\s+function\s+/gm, 'async function ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+class\s+/gm, 'class ')
    .replace(/^export\s+(?:const|let|var)\s+/gm, (m) => m.replace(/^export\s+/, ''))
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, '');
  return `(function(g){
"use strict";
${body}
g.SF_MODEL3D={
  mountModel3dViewer:mountModel3dViewer,
  destroyModel3dViewer:destroyModel3dViewer,
  ensureMesh:ensureMesh,
  defaultModel3dFields:defaultModel3dFields
};
})(typeof window!=="undefined"?window:globalThis);`;
}

/** Serialize element fields needed for the viewer (no _mesh). */
export function model3dExportConfig(el) {
  if (!el) return null;
  return {
    id: el.id,
    type: 'model3d',
    objText: el.objText || '',
    objName: el.objName || '',
    objRotX: el.objRotX,
    objRotY: el.objRotY,
    objSpin: el.objSpin,
    objAutoRot: el.objAutoRot !== false,
    objRotSpeed: el.objRotSpeed != null ? el.objRotSpeed : 1,
    objWireframe: !!el.objWireframe,
    objLineWidth: el.objLineWidth != null ? +el.objLineWidth : 1.5,
    objColor: el.objColor || '#6366f1',
    objBg: el.objBg || '#0f172a',
    objColorScheme: el.objColorScheme || null,
    objBgScheme: el.objBgScheme || null,
    objBgCleared: el.objBgCleared !== false,
  };
}

export function model3dCfgJson(el) {
  return JSON.stringify(model3dExportConfig(el) || {})
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Classic-script helpers: mount only hosts inside root, tear down previous GL.
 * Call sfMountModel3d(slideEl) on show, sfDestroyModel3d(prevSlide) when leaving.
 */
export function model3dBootSnippet() {
  return `
function sfDestroyModel3d(root){
  if(!root||!root.querySelectorAll) return;
  root.querySelectorAll('.model3d-host').forEach(function(host){
    if(host._sfM3dClean){
      try{host._sfM3dClean();}catch(e){}
      host._sfM3dClean=null;
    }
  });
}
function sfMountModel3d(root){
  if(!root||!window.SF_MODEL3D||!SF_MODEL3D.mountModel3dViewer) return;
  root.querySelectorAll('.model3d-host').forEach(function(host){
    if(host._sfM3dClean) return;
    if(!host._sfM3dCfg){
      var cfgEl=host.querySelector('script.model3d-cfg');
      if(!cfgEl) return;
      try{host._sfM3dCfg=JSON.parse(cfgEl.textContent||'{}');}catch(e){return;}
    }
    var cfg=host._sfM3dCfg;
    if(!cfg||!(cfg.objText||'').length){
      host.innerHTML='<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.55);font:13px system-ui,sans-serif">OBJ</div>';
      return;
    }
    host._sfM3dClean=SF_MODEL3D.mountModel3dViewer(host, cfg, {
      interactive:true,
      getEl:function(){return cfg;}
    });
  });
}
`;
}
