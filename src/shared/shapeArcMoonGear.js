/** Arc / moon / gear paths — ported from js/09-shapes.js (v7.1). */
'use strict';

// Arc path helper: cx,cy=center, rx,ry=radii, a1/a2=degrees (0=top, CW), mode=sector|chord
function _arcPath(cx, cy, rx, ry, a1, a2, mode, m, cornerR) {
  const erx = Math.max(1, rx - m), ery = Math.max(1, ry - m);
  const cr  = Math.max(0, cornerR || 0);
  const toRad = a => (a - 90) * Math.PI / 180;
  const r1 = toRad(a1), r2 = toRad(a2);
  const x1 = cx + erx*Math.cos(r1), y1 = cy + ery*Math.sin(r1);
  const x2 = cx + erx*Math.cos(r2), y2 = cy + ery*Math.sin(r2);
  const diff = ((a2 - a1) % 360 + 360) % 360;
  const large = diff > 180 ? 1 : 0;

  if (cr <= 0) {
    if (mode === 'sector')
      return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${erx} ${ery} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${erx} ${ery} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  }

  function unit(ax,ay,bx,by){const l=Math.hypot(bx-ax,by-ay)||1;return[(bx-ax)/l,(by-ay)/l];}
  function cwTan(rad){const tx=-erx*Math.sin(rad),ty=ery*Math.cos(rad);const l=Math.hypot(tx,ty)||1;return[tx/l,ty/l];}

  // Round a straight corner (no arc involved)
  function rcStraight(vx,vy,u1x,u1y,max1,u2x,u2y,max2){
    const r=Math.min(cr,max1,max2); if(r<0.5) return null;
    const p1x=vx+u1x*r,p1y=vy+u1y*r,p2x=vx+u2x*r,p2y=vy+u2y*r;
    const cosA=Math.max(-1,Math.min(1,u1x*u2x+u1y*u2y));
    const k=Math.max((4/3)*Math.tan(Math.acos(cosA)/4),0.55);
    return{p1x,p1y,cp1x:p1x-u1x*r*k,cp1y:p1y-u1y*r*k,
           p2x,p2y,cp2x:p2x-u2x*r*k,cp2y:p2y-u2y*r*k};
  }

  // How many degrees to offset arc endpoints for rounding
  // Limit to at most 35% of total arc so the shape stays recognisable
  const avgR = (erx + ery) / 2;
  const angStep = Math.min(cr / (avgR * Math.PI / 180), diff * 0.35);

  // Arc anchor points (on ellipse, offset from endpoints by angStep)
  const a1off = a1 + angStep, a2off = a2 - angStep;
  const ra1 = toRad(a1off), ra2 = toRad(a2off);
  const ax1 = cx + erx*Math.cos(ra1), ay1 = cy + ery*Math.sin(ra1);
  const ax2 = cx + erx*Math.cos(ra2), ay2 = cy + ery*Math.sin(ra2);
  const diffNew = ((a2off - a1off) % 360 + 360) % 360;
  const largeNew = diffNew > 180 ? 1 : 0;

  // Bezier transition from straight line into arc:
  // lineAnchor = point on straight line, distance r from arcEndpoint
  // arcAnchor  = point on ellipse angStep into arc
  // cp1: near lineAnchor, pulled along line toward arcEndpoint
  // cp2: near arcAnchor,  pulled along REVERSE arc tangent (ensures tangent continuity)
  function arcEntry(arcEndX, arcEndY, arcEndRad, lineUx, lineUy, arcAnchorX, arcAnchorY, arcAnchorRad) {
    const r = Math.min(cr, Math.hypot(arcEndX-cx, arcEndY-cy) * 0.45);
    const lax = arcEndX + lineUx*r, lay = arcEndY + lineUy*r;
    const cp1x = lax - lineUx*r*0.55, cp1y = lay - lineUy*r*0.55;
    // cp2: tangent-continuous arrival at arcAnchor
    const [tax,tay] = cwTan(arcAnchorRad);
    const chord = Math.hypot(arcAnchorX-arcEndX, arcAnchorY-arcEndY);
    const cp2x = arcAnchorX - tax*chord*0.45, cp2y = arcAnchorY - tay*chord*0.45;
    return {lax,lay,cp1x,cp1y,cp2x,cp2y};
  }

  // Exit from arc into straight line (reversed):
  function arcExit(arcEndX, arcEndY, arcEndRad, lineUx, lineUy, arcAnchorX, arcAnchorY, arcAnchorRad) {
    const r = Math.min(cr, Math.hypot(arcEndX-cx, arcEndY-cy) * 0.45);
    const lax = arcEndX + lineUx*r, lay = arcEndY + lineUy*r;
    const cp2x = lax - lineUx*r*0.55, cp2y = lay - lineUy*r*0.55;
    const [tax,tay] = cwTan(arcAnchorRad);
    const chord = Math.hypot(arcAnchorX-arcEndX, arcAnchorY-arcEndY);
    const cp1x = arcAnchorX + tax*chord*0.45, cp1y = arcAnchorY + tay*chord*0.45;
    return {lax,lay,cp1x,cp1y,cp2x,cp2y};
  }

  if (mode === 'sector') {
    const side = Math.hypot(x1-cx,y1-cy);
    const maxS = side * 0.45;

    // Entry at arc-start (x1,y1): line from cx, enters arc
    const [lu1x,lu1y] = unit(x1,y1,cx,cy);
    const eS = arcEntry(x1,y1,r1, lu1x,lu1y, ax1,ay1,ra1);

    // Exit at arc-end (x2,y2): arc exits to cx
    const [lu2x,lu2y] = unit(x2,y2,cx,cy);
    const eE = arcExit(x2,y2,r2, lu2x,lu2y, ax2,ay2,ra2);

    // Straight corner at center
    const [u5x,u5y]=unit(cx,cy,x2,y2);
    const [u6x,u6y]=unit(cx,cy,x1,y1);
    const cC = rcStraight(cx,cy, u5x,u5y,maxS, u6x,u6y,maxS);
    if (!cC) return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${erx} ${ery} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

    return `M ${cC.p2x.toFixed(2)} ${cC.p2y.toFixed(2)}`
      +` L ${eS.lax.toFixed(2)} ${eS.lay.toFixed(2)}`
      +` C ${eS.cp1x.toFixed(2)} ${eS.cp1y.toFixed(2)} ${eS.cp2x.toFixed(2)} ${eS.cp2y.toFixed(2)} ${ax1.toFixed(2)} ${ay1.toFixed(2)}`
      +` A ${erx} ${ery} 0 ${largeNew} 1 ${ax2.toFixed(2)} ${ay2.toFixed(2)}`
      +` C ${eE.cp1x.toFixed(2)} ${eE.cp1y.toFixed(2)} ${eE.cp2x.toFixed(2)} ${eE.cp2y.toFixed(2)} ${eE.lax.toFixed(2)} ${eE.lay.toFixed(2)}`
      +` L ${cC.p1x.toFixed(2)} ${cC.p1y.toFixed(2)}`
      +` C ${cC.cp1x.toFixed(2)} ${cC.cp1y.toFixed(2)} ${cC.cp2x.toFixed(2)} ${cC.cp2y.toFixed(2)} ${cC.p2x.toFixed(2)} ${cC.p2y.toFixed(2)} Z`;
  }

  // CHORD
  const chLen = Math.hypot(x2-x1,y2-y1);
  const maxR  = chLen * 0.45;
  const [chx,chy] = unit(x1,y1,x2,y2);

  const eS = arcEntry(x1,y1,r1,  chx, chy, ax1,ay1,ra1);
  const eE = arcExit (x2,y2,r2, -chx,-chy, ax2,ay2,ra2);

  return `M ${eS.lax.toFixed(2)} ${eS.lay.toFixed(2)}`
    +` C ${eS.cp1x.toFixed(2)} ${eS.cp1y.toFixed(2)} ${eS.cp2x.toFixed(2)} ${eS.cp2y.toFixed(2)} ${ax1.toFixed(2)} ${ay1.toFixed(2)}`
    +` A ${erx} ${ery} 0 ${largeNew} 1 ${ax2.toFixed(2)} ${ay2.toFixed(2)}`
    +` C ${eE.cp1x.toFixed(2)} ${eE.cp1y.toFixed(2)} ${eE.cp2x.toFixed(2)} ${eE.cp2y.toFixed(2)} ${eE.lax.toFixed(2)} ${eE.lay.toFixed(2)}`
    +` L ${eS.lax.toFixed(2)} ${eS.lay.toFixed(2)} Z`;
}




// Build moon SVG using clipPath: outer circle minus offset inner circle
// phase: 0=full circle, 0.5=half, 1=thin crescent right, -1=thin crescent left, wraps
// Returns an SVG string (not path), or path string for clip-path use

// Build trapezoid path from top-inset and bottom-inset parameters
// trapTop: inset from each side at top (0=full width, 0.5=triangle)
// trapBot: inset from each side at bottom
function _trapPath(x, y, w, h, trapTop, trapBot, rx) {
  const tl = Math.max(0, Math.min(w*0.49, trapTop * w));  // top-left x offset
  const tr = Math.max(0, Math.min(w*0.49, trapTop * w));  // top-right x offset  
  const bl = Math.max(0, Math.min(w*0.49, trapBot * w));
  const br = Math.max(0, Math.min(w*0.49, trapBot * w));
  const pts = [
    {x: x+tl,   y: y},
    {x: x+w-tr, y: y},
    {x: x+w-br, y: y+h},
    {x: x+bl,   y: y+h},
  ];
  if (rx > 0) return _roundedPolygonPath(pts, rx);
  return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y} L ${pts[2].x},${pts[2].y} L ${pts[3].x},${pts[3].y} Z`;
}
function _moonPath(cx, cy, rx, ry, phase, cornerR) {
  const p = Math.max(-1, Math.min(1, phase));
  const absP = Math.abs(p);

  const fe = `M ${(cx+rx).toFixed(2)},${cy.toFixed(2)} A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(cx-rx).toFixed(2)},${cy.toFixed(2)} A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(cx+rx).toFixed(2)},${cy.toFixed(2)} Z`;
  if (absP >= 0.98) return fe;

  const sign = p > 0 ? 1 : -1;
  const ix = cx + sign * absP * rx;
  const iyPart = 1 - absP * absP;
  if (iyPart <= 0) return fe;
  const iy = Math.sqrt(iyPart) * ry;
  if (iy < 0.5) return fe;

  const outerSweep = sign > 0 ? 0 : 1;
  const innerSweep = 1 - outerSweep;
  const f = v => v.toFixed(2);

  return `M ${f(ix)},${f(cy-iy)} A ${f(rx)} ${f(ry)} 0 1 ${outerSweep} ${f(ix)},${f(cy+iy)} A ${f(rx)} ${f(ry)} 0 0 ${innerSweep} ${f(ix)},${f(cy-iy)} Z`;
}

function _moonSVG(cx, cy, rx, ry, phase, cornerR, fAttr, sAttr, extra, shadow, uid) {
  const p = Math.max(-1, Math.min(1, phase));
  const moonPath = _moonPath(cx, cy, rx, ry, p, cornerR);
  return `<path d="${moonPath}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
}

function _moonClipPath(cx, cy, rx, ry, phase) {
  const p = Math.max(-1, Math.min(1, phase));
  const moonPath = _moonPath(cx, cy, rx, ry, p, 0);
  return `path('${moonPath}')`;
}


// Build gear path: nTeeth teeth with straight radial sides and arc top/bottom
function _gearPath(cx, cy, erx, ery, nTeeth, toothDepth) {
  nTeeth = Math.max(3, Math.min(60, nTeeth));
  toothDepth = Math.max(0.05, Math.min(0.6, toothDepth));

  const outerRx = erx, outerRy = ery;
  const innerRx = erx * (1 - toothDepth);
  const innerRy = ery * (1 - toothDepth);

  const seg = Math.PI / nTeeth;
  const da = seg * 0.10; // rounding offset on tooth top corners

  let d = '';

  for (let i = 0; i < nTeeth; i++) {
    const base = i * 2 * seg - Math.PI / 2;
    const gS = base;           // gap start angle
    const gE = base + seg;     // gap end / tooth start angle
    const tE = base + 2 * seg; // tooth end angle

    // Points
    const igSx = cx + innerRx * Math.cos(gS),  igSy = cy + innerRy * Math.sin(gS);
    const igEx = cx + innerRx * Math.cos(gE),   igEy = cy + innerRy * Math.sin(gE);
    const ogLx = cx + outerRx * Math.cos(gE),   ogLy = cy + outerRy * Math.sin(gE);
    const ogL1x= cx + outerRx * Math.cos(gE+da),ogL1y= cy + outerRy * Math.sin(gE+da);
    const ogR1x= cx + outerRx * Math.cos(tE-da),ogR1y= cy + outerRy * Math.sin(tE-da);
    const ogRx = cx + outerRx * Math.cos(tE),   ogRy = cy + outerRy * Math.sin(tE);
    const irRx = cx + innerRx * Math.cos(tE),   irRy = cy + innerRy * Math.sin(tE);

    if (i === 0) d += `M ${igSx.toFixed(2)} ${igSy.toFixed(2)} `;
    else         d += `L ${igSx.toFixed(2)} ${igSy.toFixed(2)} `;

    // Inner arc (gap)
    d += `A ${innerRx.toFixed(2)} ${innerRy.toFixed(2)} 0 0 1 ${igEx.toFixed(2)} ${igEy.toFixed(2)} `;
    // Straight line up (left side of tooth) - ends before top-left corner
    d += `L ${ogLx.toFixed(2)} ${ogLy.toFixed(2)} `;
    // Rounded top-left corner: Q from ogL through ogL to ogL1
    // (short arc to da position gives the rounding feel)
    d += `A ${outerRx.toFixed(2)} ${outerRy.toFixed(2)} 0 0 1 ${ogL1x.toFixed(2)} ${ogL1y.toFixed(2)} `;
    // Outer arc (tooth top)
    d += `A ${outerRx.toFixed(2)} ${outerRy.toFixed(2)} 0 0 1 ${ogR1x.toFixed(2)} ${ogR1y.toFixed(2)} `;
    // Rounded top-right corner
    d += `A ${outerRx.toFixed(2)} ${outerRy.toFixed(2)} 0 0 1 ${ogRx.toFixed(2)} ${ogRy.toFixed(2)} `;
    // Straight line down (right side of tooth)
    d += `L ${irRx.toFixed(2)} ${irRy.toFixed(2)} `;
  }
  d += 'Z';
  return d;
}

export function arcPath(cx, cy, rx, ry, a1, a2, mode, m, cornerR) {
  return _arcPath(cx, cy, rx, ry, a1, a2, mode, m, cornerR);
}
export function moonPath(cx, cy, rx, ry, phase, cornerR) {
  return _moonPath(cx, cy, rx, ry, phase, cornerR);
}
export function moonSVG(cx, cy, rx, ry, phase, cornerR, fAttr, sAttr, extra, shadow, uid) {
  return _moonSVG(cx, cy, rx, ry, phase, cornerR, fAttr, sAttr, extra, shadow, uid);
}
export function gearPath(cx, cy, erx, ery, nTeeth, toothDepth) {
  return _gearPath(cx, cy, erx, ery, nTeeth, toothDepth);
}
