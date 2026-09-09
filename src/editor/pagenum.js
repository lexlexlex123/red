/** Page number element helpers. */

import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';

export function pnDefaults() {
  return {
    enabled: false,
    style: 'simple',
    position: 'br',
    customXY: null,
    color: '#3b82f6',
    textColor: '#ffffff',
    fontSize: 14,
    opacity: 1,
    showTotal: false,
    customColor: true,
  };
}

export function pnSize(fontSize) {
  const fs = fontSize || 14;
  return { w: Math.round(fs * 5), h: Math.round(fs * 2.4) };
}

export function pnPresetXY(pos, fontSize, canvasW, canvasH) {
  const pad = 12;
  const { w, h } = pnSize(fontSize);
  const W = canvasW || DEFAULT_CANVAS_W;
  const H = canvasH || DEFAULT_CANVAS_H;
  switch (pos) {
    case 'tl':
      return { x: pad, y: pad };
    case 'tc':
      return { x: Math.round(W / 2 - w / 2), y: pad };
    case 'tr':
      return { x: W - w - pad, y: pad };
    case 'bl':
      return { x: pad, y: H - h - pad };
    case 'bc':
      return { x: Math.round(W / 2 - w / 2), y: H - h - pad };
    case 'br':
    default:
      return { x: W - w - pad, y: H - h - pad };
  }
}

export function pnBuildHtml(slideIdx, total, style, showTotal, color, textColor, fontSize) {
  const num = slideIdx + 1;
  const label = showTotal
    ? `${num}<span style="opacity:.55;font-size:.78em;margin-left:2px">/ ${total}</span>`
    : `${num}`;
  const fs = fontSize || 14;
  switch (style) {
    case 'circle':
      return `<div style="width:${fs * 2}px;height:${fs * 2}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:${fs}px;font-weight:700;color:${textColor};line-height:1">${label}</div>`;
    case 'ring':
      return `<div style="width:${fs * 2}px;height:${fs * 2}px;border-radius:50%;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:${fs}px;font-weight:700;color:${color};line-height:1">${label}</div>`;
    case 'pill':
      return `<div style="padding:${fs * 0.25}px ${fs * 0.7}px;border-radius:999px;background:${color};font-size:${fs}px;font-weight:600;color:${textColor};line-height:1.4;white-space:nowrap">${label}</div>`;
    case 'box':
      return `<div style="padding:${fs * 0.25}px ${fs * 0.6}px;border-radius:4px;background:${color};font-size:${fs}px;font-weight:600;color:${textColor};line-height:1.4;white-space:nowrap">${label}</div>`;
    case 'slash':
      return `<div style="font-size:${fs}px;font-weight:600;color:${color};line-height:1;white-space:nowrap;border-bottom:2px solid ${color};padding-bottom:3px">${label}</div>`;
    default:
      return `<div style="font-size:${fs}px;font-weight:600;color:${color};line-height:1;white-space:nowrap">${label}</div>`;
  }
}

export const PN_STYLES = [
  { id: 'simple', labelRu: 'Простой', labelEn: 'Simple' },
  { id: 'circle', labelRu: 'Круг', labelEn: 'Circle' },
  { id: 'ring', labelRu: 'Кольцо', labelEn: 'Ring' },
  { id: 'pill', labelRu: 'Капсула', labelEn: 'Pill' },
  { id: 'box', labelRu: 'Плашка', labelEn: 'Box' },
  { id: 'slash', labelRu: 'Подчёрк.', labelEn: 'Underline' },
];

export const PN_POSITIONS = [
  { id: 'tl', labelRu: '↖', labelEn: 'TL' },
  { id: 'tc', labelRu: '↑', labelEn: 'TC' },
  { id: 'tr', labelRu: '↗', labelEn: 'TR' },
  { id: 'bl', labelRu: '↙', labelEn: 'BL' },
  { id: 'bc', labelRu: '↓', labelEn: 'BC' },
  { id: 'br', labelRu: '↘', labelEn: 'BR' },
];
