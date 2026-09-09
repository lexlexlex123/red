/** Table → chart SVG (ported from js/31-table.js). */
import { getTableCell } from './tableCells.js';

/** Optional provider: () => string[] theme palette (set from editor boot). */
let _themeColorsProvider = null;

export function setChartThemeColorsProvider(fn) {
  _themeColorsProvider = typeof fn === 'function' ? fn : null;
}

function resolveChartPalette(n, ac1, ac2) {
  let base;
  try {
    const colors = _themeColorsProvider && _themeColorsProvider();
    if (colors && colors.length >= 7) base = colors.slice(0, 7);
  } catch (e) {}
  if (!base) {
    base = [
      ac1 || '#6366f1',
      '#f43f5e',
      '#22d3ee',
      '#f59e0b',
      ac2 || '#818cf8',
      '#10b981',
      '#fb923c',
    ];
  }
  const out = [];
  const len = base.length;
  if (n <= 2) {
    const picks = [0, 3, 1, 4, 2, 5, 6];
    for (let i = 0; i < n; i++) out.push(base[picks[i % picks.length]]);
  } else if (n <= 4) {
    const step = Math.floor(len / n);
    for (let i = 0; i < n; i++) out.push(base[(i * step) % len]);
  } else {
    for (let i = 0; i < n; i++) out.push(base[i % len]);
  }
  return out;
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cellNum(html) {
  const t = (html || '').replace(/<[^>]*>/g, '').replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

function chartExtract(d) {
  const legendOnRow = (d.chartLegend || 'row') === 'row';
  const rows = d.rows;
  const cols = d.cols;
  const get = (r, c) => getTableCell(d, r, c).html || '';
  const getNum = (r, c) => cellNum(get(r, c));

  if (legendOnRow) {
    const hasHeader = d.headerRow !== false;
    const dataStartR = hasHeader ? 1 : 0;
    const dataStartC = 1;
    const categories = [];
    for (let r = dataStartR; r < rows; r++) categories.push(get(r, 0).replace(/<[^>]*>/g, '') || ('R' + r));
    const series = [];
    for (let c = dataStartC; c < cols; c++) {
      const label = hasHeader ? get(0, c).replace(/<[^>]*>/g, '') : ('S' + c);
      const values = [];
      for (let r = dataStartR; r < rows; r++) values.push(getNum(r, c));
      series.push({ label, values });
    }
    return { series, categories, legendOnRow };
  }
  const hasHeader = d.headerRow !== false;
  const dataStartC = hasHeader ? 1 : 0;
  const dataStartR = 1;
  const categories = [];
  for (let c = dataStartC; c < cols; c++) categories.push(get(0, c).replace(/<[^>]*>/g, '') || ('C' + c));
  const series = [];
  for (let r = dataStartR; r < rows; r++) {
    const label = get(r, 0).replace(/<[^>]*>/g, '') || ('S' + r);
    const values = [];
    for (let c = dataStartC; c < cols; c++) values.push(getNum(r, c));
    series.push({ label, values });
  }
  return { series, categories, legendOnRow };
}

function fmtLabel(val, total, mode) {
  if (!mode || mode === 'none' || val === null) return '';
  const num = (typeof val === 'number') ? val : 0;
  const pct = total > 0 ? ((num / total) * 100).toFixed(1) + '%' : '';
  const numStr = Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, '');
  if (mode === 'value')   return numStr;
  if (mode === 'percent') return pct;
  if (mode === 'both')    return `${numStr} (${pct})`;
  return '';
}

// Build SVG string for chart
function chartLegendSvg(series, palette, textCol, fs, W, H, pos) {
  // Scale legend proportionally to diagram size
  const scale = Math.max(0.5, Math.min(2, W / 400));
  const sqSize = Math.round(10 * scale);
  const lgFs = Math.max(8, Math.min(18, fs * scale));
  const lgItemW = Math.min(Math.round(110 * scale), (W - 20) / Math.max(series.length, 1));
  const lgH = Math.round(20 * scale);
  const gap = sqSize + 4;
  let svg = '';
  if (!pos || pos === 'bottom-left' || pos === 'bottom-center' || pos === 'bottom-right') {
    const y = H - lgH;
    const totalW = series.length * lgItemW;
    const startX = pos === 'bottom-right' ? W - totalW - 4
                 : pos === 'bottom-center' ? (W - totalW) / 2
                 : 6;
    series.forEach((s, i) => {
      const lx = startX + i * lgItemW;
      svg += `<rect x="${lx.toFixed(1)}" y="${(y + (lgH - sqSize)/2).toFixed(1)}" width="${sqSize}" height="${sqSize}" rx="${Math.round(sqSize*0.2)}" fill="${palette[i]}"/>`;
      svg += `<text x="${(lx + gap).toFixed(1)}" y="${(y + lgH/2).toFixed(1)}" font-size="${lgFs}" fill="${textCol}" font-family="sans-serif" dominant-baseline="middle">${escHtml(s.label)}</text>`;
    });
  } else if (pos === 'left' || pos === 'right') {
    const itemH = Math.min(Math.round(26 * scale), (H - 20) / Math.max(series.length, 1));
    const startY = (H - series.length * itemH) / 2;
    const sideW = Math.round(110 * scale);
    const x = pos === 'left' ? 4 : W - sideW;
    series.forEach((s, i) => {
      const ly = startY + i * itemH + itemH / 2;
      svg += `<rect x="${x}" y="${(ly - sqSize/2).toFixed(1)}" width="${sqSize}" height="${sqSize}" rx="${Math.round(sqSize*0.2)}" fill="${palette[i]}"/>`;
      svg += `<text x="${(x + gap).toFixed(1)}" y="${ly.toFixed(1)}" font-size="${lgFs}" fill="${textCol}" font-family="sans-serif" dominant-baseline="middle">${escHtml(s.label)}</text>`;
    });
  }
  return svg;
}

function chartBgSvg(d, W, H) {
  // Background rect + border for chart
  const bg = d.chartBg || '';
  const op = d.chartBgOp != null ? +d.chartBgOp : 1;
  const blur = d.chartBgBlur || 0;
  const stroke = d.chartStroke || '';
  const sw = d.chartSw != null ? +d.chartSw : 0;
  const rx = d.chartRx || 0;
  if (!bg && !sw) return { defs: '', bg: '' };
  let defs = '';
  let bgSvg = '';
  if (blur > 0) {
    const fid = 'cbf_' + (d.id || 'x');
    defs = `<filter id="${fid}" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${blur}"/></filter>`;
    bgSvg += `<rect x="0" y="0" width="${W}" height="${H}" rx="${rx}" filter="url(#${fid})" fill="${bg||'transparent'}" fill-opacity="${op}"/>`;
  } else if (bg) {
    bgSvg += `<rect x="0" y="0" width="${W}" height="${H}" rx="${rx}" fill="${bg}" fill-opacity="${op}"/>`;
  }
  // Border is drawn via CSS outline on .chart-wrap — not in SVG to avoid duplication
  return { defs, bg: bgSvg };
}

export function buildChartSvg(d) {
  const W = d.w || 600, H = d.h || 400;
  const type = d.chartType || 'bar';
  const labelMode = d.chartLabels || 'none';
  const { series, categories } = chartExtract(d);
  if (!series.length) return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><text x="${W/2}" y="${H/2}" text-anchor="middle" fill="#888" font-size="14">Нет данных</text></svg>`;

  const palette = resolveChartPalette(series.length);
  const textCol = d.textColor || '#ffffff';
  const fs = Math.max(9, Math.min(14, (d.fs || 13) * 0.85));
  const lblColor = d.chartLabelColor || textCol;
  const lblFs = d.chartLabelFs ? +d.chartLabelFs : Math.max(8, fs - 1);
  const lgPos = d.chartLegendPos || 'bottom-left';

  // Reserve space based on legend position
  const lgReserveBottom = (!lgPos || lgPos.startsWith('bottom')) ? 22 : 0;
  const lgReserveSide   = (lgPos === 'left' || lgPos === 'right') ? 114 : 0;

  const legendSvg = chartLegendSvg(series, palette, textCol, fs, W, H, lgPos);
  const { defs: bgDefs, bg: bgSvg } = chartBgSvg(d, W, H);

  const plotY = 28; // space above plot for labels above tallest bar
  const plotH = H - lgReserveBottom - 28 - 20;
  const plotX = (lgPos === 'left' ? lgReserveSide : 0) + 40;
  const plotW = W - plotX - (lgPos === 'right' ? lgReserveSide : 0) - 10;

  if (type === 'pie' || type === 'donut' || type === 'explodedPie' || type === 'explodedDonut') {
    return buildPieChart(d, W, H, series, palette, textCol, fs, labelMode,
      type === 'donut' || type === 'explodedDonut',
      legendSvg, bgDefs, bgSvg, lblColor, lblFs,
      type === 'explodedPie' || type === 'explodedDonut');
  }
  if (type === 'line') {
    return buildLineChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg, bgDefs, bgSvg, lblColor, lblFs);
  }
  if (type === 'horizontalBar' || type === 'hbar') {
    return buildHBarChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg, bgDefs, bgSvg, lblColor, lblFs);
  }
  // default: bar
  return buildBarChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg, bgDefs, bgSvg, lblColor, lblFs);
}

function buildBarChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg, bgDefs, bgSvg, lblColor, lblFs) {
  bgDefs = bgDefs||""; bgSvg = bgSvg||""; lblColor = lblColor||textCol; lblFs = lblFs||(Math.max(8,fs-1));
  const catCount = categories.length || 1;
  const serCount = series.length;
  const groupW = plotW / catCount;
  const barW = Math.max(4, groupW / (serCount + 1));
  const gap = (groupW - barW * serCount) / 2;

  // Find max value for scale
  let maxVal = 0;
  series.forEach(s => s.values.forEach(v => { if (v !== null && v > maxVal) maxVal = v; }));
  if (maxVal === 0) maxVal = 1;

  // Y gridlines
  const gridLines = 5;
  let gridSvg = '';
  for (let i = 0; i <= gridLines; i++) {
    const gy = plotY + plotH - (i / gridLines) * plotH;
    const val = (maxVal * i / gridLines);
    const valStr = Number.isInteger(val) ? val : val.toFixed(1);
    gridSvg += `<line x1="${plotX}" y1="${gy}" x2="${plotX + plotW}" y2="${gy}" stroke="${textCol}22" stroke-width="1"/>`;
    gridSvg += `<text x="${plotX - 4}" y="${gy}" text-anchor="end" dominant-baseline="middle" font-size="${fs - 1}" fill="${textCol}88" font-family="sans-serif">${valStr}</text>`;
  }

  // Bars + labels
  let barsSvg = '';
  const totalPerCat = categories.map((_, ci) => series.reduce((s, sr) => s + (sr.values[ci] || 0), 0));
  series.forEach((s, si) => {
    categories.forEach((cat, ci) => {
      const val = s.values[ci];
      if (val === null) return;
      const bh = Math.max(2, (val / maxVal) * plotH);
      const bx = plotX + ci * groupW + gap + si * barW;
      const by = plotY + plotH - bh;
      barsSvg += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${palette[si]}"/>`;
      const lbl = fmtLabel(val, totalPerCat[ci], labelMode);
      if (lbl) {
        const offset = d.chartLabelOffset != null ? +d.chartLabelOffset : 0;
        const inside = offset === 0 ? (bh > fs * 1.8) : (offset < 0);
        const lblYRaw = inside ? (by + bh/2) : (by - 4 - offset);
        const lblY = lblYRaw; // no clamp — SVG overflow:visible allows labels outside plot
        const lblFill = inside ? '#fff' : lblColor;
        barsSvg += `<text x="${(bx + barW/2).toFixed(1)}" y="${lblY.toFixed(1)}" text-anchor="middle" dominant-baseline="${inside ? 'middle' : 'auto'}" font-size="${lblFs}" fill="${lblFill}" font-family="sans-serif">${escHtml(lbl)}</text>`;
      }
    });
  });

  // Category labels
  let catSvg = '';
  categories.forEach((cat, ci) => {
    const cx = plotX + ci * groupW + groupW / 2;
    catSvg += `<text x="${cx.toFixed(1)}" y="${(plotY + plotH + 14).toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="${textCol}cc" font-family="sans-serif">${escHtml(cat)}</text>`;
  });

  const PAD_TOP = 28;
  const PAD_BOTTOM = Math.ceil(fs + 30); // space for category labels + legend below plot
  return `<svg viewBox="0 ${-PAD_TOP} ${W} ${H + PAD_BOTTOM}" xmlns="http://www.w3.org/2000/svg">${bgDefs?`<defs>${bgDefs}</defs>`:""}`+bgSvg+`${gridSvg}${barsSvg}${catSvg}${legendSvg}</svg>`;
}

function buildHBarChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg, bgDefs, bgSvg, lblColor, lblFs) {
  bgDefs = bgDefs||""; bgSvg = bgSvg||""; lblColor = lblColor||textCol; lblFs = lblFs||(Math.max(8,fs-1));
  const catCount = categories.length || 1;
  const serCount = series.length;
  const groupH = plotH / catCount;
  const barH = Math.max(4, groupH / (serCount + 1));
  const gap = (groupH - barH * serCount) / 2;

  let maxVal = 0;
  series.forEach(s => s.values.forEach(v => { if (v !== null && v > maxVal) maxVal = v; }));
  if (maxVal === 0) maxVal = 1;

  const labelColW = 60;
  const PAD_RIGHT = 32; // extra space right of longest bar for outside labels
  const bplotX = plotX + labelColW;
  const bplotW = plotW - labelColW - PAD_RIGHT;

  let gridSvg = '';
  for (let i = 0; i <= 4; i++) {
    const gx = bplotX + (i / 4) * bplotW;
    const val = (maxVal * i / 4);
    const valStr = Number.isInteger(val) ? val : val.toFixed(1);
    gridSvg += `<line x1="${gx}" y1="${plotY}" x2="${gx}" y2="${plotY + plotH}" stroke="${textCol}22" stroke-width="1"/>`;
    gridSvg += `<text x="${gx}" y="${plotY + plotH + 14}" text-anchor="middle" font-size="${fs - 1}" fill="${textCol}88" font-family="sans-serif">${valStr}</text>`;
  }

  const totalPerCat = categories.map((_, ci) => series.reduce((s, sr) => s + (sr.values[ci] || 0), 0));
  let barsSvg = '';
  series.forEach((s, si) => {
    categories.forEach((cat, ci) => {
      const val = s.values[ci];
      if (val === null) return;
      const bw = Math.max(2, (val / maxVal) * bplotW);
      const bx = bplotX;
      const by = plotY + ci * groupH + gap + si * barH;
      barsSvg += `<rect x="${bx}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${barH.toFixed(1)}" rx="2" fill="${palette[si]}"/>`;
      const lbl = fmtLabel(val, totalPerCat[ci], labelMode);
      if (lbl) {
        const offset = d.chartLabelOffset != null ? +d.chartLabelOffset : 0;
        const inside = offset === 0 ? (bw > 40) : (offset < 0);
        const lblX = inside ? (bx + bw - 4 + offset) : (bx + bw + 4 + offset);
        const lblFill = inside ? '#fff' : lblColor;
        barsSvg += `<text x="${lblX.toFixed(1)}" y="${(by + barH/2).toFixed(1)}" text-anchor="${inside ? 'end' : 'start'}" dominant-baseline="middle" font-size="${lblFs}" fill="${lblFill}" font-family="sans-serif">${escHtml(lbl)}</text>`;
      }
    });
  });

  let catSvg = '';
  categories.forEach((cat, ci) => {
    const cy = plotY + ci * groupH + groupH / 2;
    catSvg += `<text x="${plotX + labelColW - 6}" y="${cy.toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="${fs}" fill="${textCol}cc" font-family="sans-serif">${escHtml(cat)}</text>`;
  });

  return `<svg viewBox="0 0 ${W + PAD_RIGHT} ${H}" xmlns="http://www.w3.org/2000/svg">${bgDefs?`<defs>${bgDefs}</defs>`:""}`+bgSvg+`${gridSvg}${barsSvg}${catSvg}${legendSvg}</svg>`;
}

function buildLineChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg, bgDefs, bgSvg, lblColor, lblFs) {
  bgDefs = bgDefs||""; bgSvg = bgSvg||""; lblColor = lblColor||textCol; lblFs = lblFs||(Math.max(8,fs-1));
  const catCount = Math.max(categories.length, 2);

  let maxVal = 0, minVal = 0;
  series.forEach(s => s.values.forEach(v => { if (v !== null) { if (v > maxVal) maxVal = v; if (v < minVal) minVal = v; } }));
  if (maxVal === minVal) maxVal = minVal + 1;

  const toX = i => plotX + (i / (catCount - 1)) * plotW;
  const toY = v => plotY + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;

  let gridSvg = '';
  for (let i = 0; i <= 5; i++) {
    const gy = plotY + plotH - (i / 5) * plotH;
    const val = minVal + (maxVal - minVal) * i / 5;
    const valStr = Number.isInteger(val) ? val : val.toFixed(1);
    gridSvg += `<line x1="${plotX}" y1="${gy.toFixed(1)}" x2="${plotX + plotW}" y2="${gy.toFixed(1)}" stroke="${textCol}22" stroke-width="1"/>`;
    gridSvg += `<text x="${plotX - 4}" y="${gy.toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="${fs - 1}" fill="${textCol}88" font-family="sans-serif">${valStr}</text>`;
  }

  const totalPerCat = categories.map((_, ci) => series.reduce((s, sr) => s + (sr.values[ci] || 0), 0));
  let linesSvg = '';
  series.forEach((s, si) => {
    const pts = s.values.map((v, i) => v !== null ? `${toX(i).toFixed(1)},${toY(v).toFixed(1)}` : null).filter(Boolean);
    if (pts.length < 2) return;
    linesSvg += `<polyline points="${pts.join(' ')}" fill="none" stroke="${palette[si]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    s.values.forEach((v, i) => {
      if (v === null) return;
      const cx = toX(i), cy = toY(v);
      linesSvg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="${palette[si]}" stroke="${textCol}44" stroke-width="1"/>`;
      const lbl = fmtLabel(v, totalPerCat[i], labelMode);
      if (lbl) linesSvg += `<text x="${cx.toFixed(1)}" y="${(cy - 8).toFixed(1)}" text-anchor="middle" font-size="${lblFs}" fill="${lblColor}" font-family="sans-serif">${escHtml(lbl)}</text>`;
    });
  });

  let catSvg = '';
  categories.forEach((cat, i) => {
    catSvg += `<text x="${toX(i).toFixed(1)}" y="${(plotY + plotH + 14).toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="${textCol}cc" font-family="sans-serif">${escHtml(cat)}</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${bgDefs?`<defs>${bgDefs}</defs>`:""}`+bgSvg+`${gridSvg}${linesSvg}${catSvg}${legendSvg}</svg>`;
}

function buildPieChart(d, W, H, series, palette, textCol, fs, labelMode, isDonut, legendSvg, bgDefs, bgSvg, lblColor, lblFs, isExploded) {
  legendSvg = legendSvg||""; bgDefs = bgDefs||""; bgSvg = bgSvg||""; lblColor = lblColor||'#fff'; lblFs = lblFs||(Math.max(8,fs-1));
  const sliceGap = isExploded ? (d.chartSliceGap != null ? +d.chartSliceGap : 6) : 0;
  const sliceRx  = 0; // скругление убрано — только отступ секторов
  const { categories, legendOnRow } = chartExtract(d);
  // Pie/donut: interpret data based on legend orientation
  // legendOnRow=true: first row = series labels (C, D...), data rows below
  //   → each SERIES (column) becomes a slice, value = sum of that column across all data rows
  // legendOnRow=false: first col = series labels, data cols to right
  //   → each SERIES (row) becomes a slice, value = sum of that row across all data cols
  let sliceData;
  if (legendOnRow !== false) {
    // Columns as slices: series[i] = one slice, value = sum of all rows in that series
    sliceData = series.map((s, i) => ({
      val: s.values.reduce((sum, v) => sum + (v || 0), 0),
      label: s.label,
      color: palette[i % palette.length]
    }));
  } else {
    // Rows as slices: categories[i] = one slice, value = sum across all series for that category index
    sliceData = categories.map((cat, i) => ({
      val: series.reduce((sum, s) => sum + (s.values[i] || 0), 0),
      label: cat,
      color: palette[i % palette.length]
    }));
  }
  sliceData = sliceData.filter(sl => sl.val > 0);

  const total = sliceData.reduce((s, sl) => s + sl.val, 0);
  if (total === 0) return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><text x="${W/2}" y="${H/2}" text-anchor="middle" fill="#888" font-size="14">Нет данных</text></svg>`;

  const lgPos = d.chartLegendPos || 'bottom-left';
  const legendH = lgPos.startsWith('bottom') ? 22 : 0;
  const lgSideW  = (lgPos === 'left' || lgPos === 'right') ? 114 : 0;
  // Center and radius adjusted for legend position
  const plotX = lgPos === 'left'  ? lgSideW : 0;
  const plotW = W - lgSideW;
  const cx = plotX + plotW / 2;
  const cy = (H - legendH) / 2;
  const R = Math.min(plotW / 2 - 10, cy - 10);
  const r = isDonut ? R * 0.52 : 0;

  const deg = v => (v / total) * Math.PI * 2;
  const px = (angle, radius) => cx + radius * Math.cos(angle - Math.PI / 2);
  const py = (angle, radius) => cy + radius * Math.sin(angle - Math.PI / 2);
  const arc = (r1, r2, a1, a2) => {
    const large = (a2 - a1) > Math.PI ? 1 : 0;
    if (isDonut) {
      return `M ${px(a1,r2).toFixed(2)} ${py(a1,r2).toFixed(2)} A ${r2} ${r2} 0 ${large} 1 ${px(a2,r2).toFixed(2)} ${py(a2,r2).toFixed(2)} L ${px(a2,r1).toFixed(2)} ${py(a2,r1).toFixed(2)} A ${r1} ${r1} 0 ${large} 0 ${px(a1,r1).toFixed(2)} ${py(a1,r1).toFixed(2)} Z`;
    }
    return `M ${cx} ${cy} L ${px(a1,r2).toFixed(2)} ${py(a1,r2).toFixed(2)} A ${r2} ${r2} 0 ${large} 1 ${px(a2,r2).toFixed(2)} ${py(a2,r2).toFixed(2)} Z`;
  };

  let slicesSvg = '', labelsSvg = '';
  let angle = 0;

  // Helper: rounded corner arc between two points using a small circle of radius rr
  // Moves along direction dir at point p, turns toward point q
  function _roundCorner(p1x, p1y, p2x, p2y, rr) {
    // Arc from p1 to p2 with radius rr (approximate rounded corner)
    return `A ${rr.toFixed(2)} ${rr.toFixed(2)} 0 0 1 ${p2x.toFixed(2)} ${p2y.toFixed(2)}`;
  }

  sliceData.forEach((sl, i) => {
    if (sl.val <= 0) { angle += deg(sl.val); return; }
    const a1 = angle, a2 = angle + deg(sl.val);
    const midAngle = (a1 + a2) / 2;
    const spanAngle = a2 - a1;

    // Explode: shift slice outward from center
    const ex = sliceGap > 0 ? sliceGap * Math.cos(midAngle - Math.PI/2) : 0;
    const ey = sliceGap > 0 ? sliceGap * Math.sin(midAngle - Math.PI/2) : 0;
    const transform = (ex || ey) ? ` transform="translate(${ex.toFixed(2)},${ey.toFixed(2)})"` : '';

    let pathD;
    const rx0 = sliceRx; // corner radius
    // Only round if sector is large enough
    const canRound = rx0 > 0 && spanAngle > 0.15 && R > rx0 * 2;

    if (!canRound) {
      pathD = arc(r, R, a1, a2);
    } else if (isDonut) {
      // Donut: rounded outer corners + rounded inner corners
      // clamp rx so it never exceeds half the ring thickness or causes overlap
      const ringW = R - r;
      const rxClamped = Math.min(rx0, ringW * 0.45, R * (spanAngle / 4));
      const dOuter = rxClamped / R;
      const dInner = rxClamped / r;
      // Clamp so arcs don't overlap: max offset = spanAngle/2 - small epsilon
      const maxOff = spanAngle / 2 - 0.01;
      const dO = Math.min(dOuter, maxOff);
      const dI = Math.min(dInner, maxOff);
      const large = (a2 - dO - (a1 + dO)) > Math.PI ? 1 : 0;
      const Ox1 = px(a1 + dO, R), Oy1 = py(a1 + dO, R);
      const Ox2 = px(a2 - dO, R), Oy2 = py(a2 - dO, R);
      const Ix1 = px(a2 - dI, r), Iy1 = py(a2 - dI, r);
      const Ix2 = px(a1 + dI, r), Iy2 = py(a1 + dI, r);
      pathD = `M ${Ix2.toFixed(2)} ${Iy2.toFixed(2)} ` +
              `A ${rxClamped.toFixed(2)} ${rxClamped.toFixed(2)} 0 0 1 ${Ox1.toFixed(2)} ${Oy1.toFixed(2)} ` +
              `A ${R} ${R} 0 ${large} 1 ${Ox2.toFixed(2)} ${Oy2.toFixed(2)} ` +
              `A ${rxClamped.toFixed(2)} ${rxClamped.toFixed(2)} 0 0 1 ${Ix1.toFixed(2)} ${Iy1.toFixed(2)} ` +
              `A ${r} ${r} 0 ${large} 0 ${Ix2.toFixed(2)} ${Iy2.toFixed(2)} Z`;
    } else {
      // Pie: rounded outer corners only (center is a point — no rounding there)
      const rxClamped = Math.min(rx0, R * (spanAngle / 4));
      const dOuter = Math.min(rxClamped / R, spanAngle / 2 - 0.01);
      const large = (spanAngle - 2 * dOuter) > Math.PI ? 1 : 0;
      const Ox1 = px(a1 + dOuter, R), Oy1 = py(a1 + dOuter, R);
      const Ox2 = px(a2 - dOuter, R), Oy2 = py(a2 - dOuter, R);
      pathD = `M ${cx.toFixed(2)} ${cy.toFixed(2)} ` +
              `L ${Ox1.toFixed(2)} ${Oy1.toFixed(2)} ` +
              `A ${R} ${R} 0 ${large} 1 ${Ox2.toFixed(2)} ${Oy2.toFixed(2)} ` +
              `A ${rxClamped.toFixed(2)} ${rxClamped.toFixed(2)} 0 0 1 ${cx.toFixed(2)} ${cy.toFixed(2)} Z`;
    }

    slicesSvg += `<path d="${pathD}"${transform} fill="${sl.color}" stroke="none"/>`;
    const mid = (a1 + a2) / 2;
    const lrBase = isDonut ? (r + R) / 2 : R * 0.65;
    const lr = lrBase + (d.chartLabelOffset != null ? +d.chartLabelOffset : 0);
    const lbl = fmtLabel(sl.val, total, labelMode);
    if (lbl) {
      const lblOutside = lr > R;
      const lblFill = lblOutside ? textCol : '#fff';
      const pieLblFill = lblOutside ? lblColor : (lblColor !== '#fff' ? lblColor : '#fff');
      labelsSvg += `<text x="${px(mid,lr).toFixed(1)}" y="${py(mid,lr).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${lblFs}" fill="${pieLblFill}" font-family="sans-serif" font-weight="600">${escHtml(lbl)}</text>`;
    }
    angle = a2;
  });

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${bgDefs?`<defs>${bgDefs}</defs>`:""}`+bgSvg+`${slicesSvg}${labelsSvg}${legendSvg}</svg>`;
}
export const CHART_TYPES = [
  { id: 'bar', labelRu: 'Столбцы', labelEn: 'Bars' },
  { id: 'horizontalBar', labelRu: 'Полосы', labelEn: 'H-Bars' },
  { id: 'line', labelRu: 'Линии', labelEn: 'Line' },
  { id: 'pie', labelRu: 'Круг', labelEn: 'Pie' },
  { id: 'donut', labelRu: 'Кольцо', labelEn: 'Donut' },
  { id: 'explodedPie', labelRu: 'Круг+', labelEn: 'Pie+' },
  { id: 'explodedDonut', labelRu: 'Кольцо+', labelEn: 'Donut+' },
];

export function chartWrapStyle(d) {
  const cBg = d.chartBg || '';
  const cBlur = d.chartBgBlur || 0;
  const cSw = d.chartSw != null ? +d.chartSw : 0;
  const cStroke = d.chartStroke || '';
  const cRx = d.chartRx || 0;
  return {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: cRx || undefined,
    overflow: 'visible',
    boxSizing: 'border-box',
    background: cBg || undefined,
    backdropFilter: cBlur > 0 ? `blur(${cBlur}px)` : undefined,
    WebkitBackdropFilter: cBlur > 0 ? `blur(${cBlur}px)` : undefined,
    outline: cSw > 0 && cStroke ? `${cSw}px solid ${cStroke}` : undefined,
  };
}
