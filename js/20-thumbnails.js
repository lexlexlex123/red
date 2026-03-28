// ══════════════ THUMBNAILS ══════════════
function drawThumbs(){
  const list=document.getElementById('slide-list');list.innerHTML='';
  document.getElementById('sb-count').textContent=slides.length;
  slides.forEach((s,i)=>{
    const t=document.createElement('div');t.className='sthumb'+(i===cur?' active':'');t.dataset.ar=ar;
    t.onclick=()=>pickSlide(i);t.draggable=true;
    t.ondragstart=e=>{e.dataTransfer.setData('text/plain',String(i));t.classList.add('dragging');};
    t.ondragend=()=>t.classList.remove('dragging');
    t.ondragover=e=>{e.preventDefault();t.classList.add('dover');};
    t.ondragleave=()=>t.classList.remove('dover');
    t.ondrop=e=>{e.preventDefault();t.classList.remove('dover');reorder(+e.dataTransfer.getData('text/plain'),i);};

    // Canvas thumbnail
    const cnv=document.createElement('canvas');
    cnv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;';
    t.appendChild(cnv);

    const snum=document.createElement('div');snum.className='snum';snum.textContent=i+1;
    t.appendChild(snum);
    if(s.trans&&s.trans!=='none'){const tb=document.createElement('div');tb.className='tbadge';t.appendChild(tb);}
    if(s.auto>0){const ab=document.createElement('div');ab.className='autobadge';t.appendChild(ab);}
    list.appendChild(t);

    // Render canvas async (next frame so layout is calculated)
    requestAnimationFrame(()=>renderThumbCanvas(cnv,s,i));
  });
}

function renderThumbCanvas(cnv,s,slideIdx){
  const TW=160,TH=ar==='4:3'?120:90;
  cnv.width=TW;cnv.height=TH;
  const ctx=cnv.getContext('2d');
  const scaleX=TW/canvasW,scaleY=TH/canvasH;

  // Background
  const _themeForBg=(typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)?THEMES[appliedThemeIdx]:null;
  const _themeBg=_themeForBg?_themeForBg.bg:'#1a1a2e';
  const bg=(s.bg==='custom'||s.bg==='theme')?(s.bgc||_themeBg):((BGS.find(b=>b.id===s.bg)||BGS[0]).s);
  if(bg.startsWith('linear-gradient')||bg.startsWith('radial-gradient')){
    // Parse gradient for canvas
    const stops=parseGradientStops(bg);
    let grad;
    if(bg.startsWith('linear-gradient')){
      const angle=parseLinearAngle(bg);
      const rad=angle*Math.PI/180;
      const cx=TW/2,cy=TH/2,len=Math.sqrt(TW*TW+TH*TH)/2;
      grad=ctx.createLinearGradient(cx-Math.sin(rad)*len,cy+Math.cos(rad)*len,cx+Math.sin(rad)*len,cy-Math.cos(rad)*len);
    } else {
      grad=ctx.createRadialGradient(TW/2,TH/2,0,TW/2,TH/2,Math.max(TW,TH));
    }
    stops.forEach(([pos,col])=>grad.addColorStop(pos,col));
    ctx.fillStyle=grad;
  } else {
    ctx.fillStyle=bg||'#111';
  }
  ctx.fillRect(0,0,TW,TH);

  // Draw elements (sorted by z, decor first)
  const els=s.els||[];
  els.forEach(d=>{
    if(d._isDecor){drawThumbDecorSvg(ctx,d,scaleX,scaleY,TW,TH);return;}
    if(d.type==='text')drawThumbText(ctx,d,scaleX,scaleY);
    else if(d.type==='shape')drawThumbShape(ctx,d,scaleX,scaleY);
    else if(d.type==='image')drawThumbImage(ctx,d,scaleX,scaleY);
    else if(d.type==='code')drawThumbCode(ctx,d,scaleX,scaleY);
    else if(d.type==='markdown')drawThumbMarkdown(ctx,d,scaleX,scaleY);
    else if(d.type==='icon')drawThumbIcon(ctx,d,scaleX,scaleY);
    else if(d.type==='table')drawThumbTable(ctx,d,scaleX,scaleY);
    else if(d.type==='formula')drawThumbFormula(ctx,d,scaleX,scaleY);
    else if(d.type==='graph')drawThumbGraph(ctx,d,scaleX,scaleY);
    else if(d.type==='lego')drawThumbLego(ctx,d,scaleX,scaleY);
  });

  // Draw connectors
  if (s.connectors && s.connectors.length) {
    const elMap = {};
    s.els.forEach(d => { elMap[d.id] = d; });
    function _tAnchor(elId, otherId, fromEdge, gap) {
      const d = elMap[elId]; if (!d) return {x:0,y:0};
      const cx = d.x+d.w/2, cy = d.y+d.h/2;
      gap = gap||0;
      const od = elMap[otherId];
      const ox = od?od.x+od.w/2:cx, oy = od?od.y+od.h/2:cy;
      const dx=ox-cx,dy=oy-cy, dist=Math.sqrt(dx*dx+dy*dy)||1;
      const ux=dx/dist, uy=dy/dist;
      if (!fromEdge) return {x:cx+ux*gap, y:cy+uy*gap};
      let ex,ey;
      if(Math.abs(dx)*d.h>Math.abs(dy)*d.w){ex=dx>0?d.x+d.w:d.x;ey=cy;}
      else{ex=cx;ey=dy>0?d.y+d.h:d.y;}
      return {x:ex+ux*gap, y:ey+uy*gap};
    }
    s.connectors.forEach(conn => {
      const gap = conn.gap||0;
      const p1 = _tAnchor(conn.fromId, conn.toId,   conn.fromAnchor==='edge', gap);
      const p2 = _tAnchor(conn.toId,   conn.fromId, conn.toAnchor==='edge',   gap);
      const sw  = (conn.sw||2) * scaleX;
      const dash = conn.dash||'solid';
      ctx.save();
      ctx.strokeStyle = conn.color||'#60a5fa';
      ctx.lineWidth   = sw;
      ctx.lineCap     = 'round';
      if (dash==='dot')  ctx.setLineDash([0, sw*4]);
      else if (dash==='dash') ctx.setLineDash([sw*5, sw*3]);
      else ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(p1.x*scaleX, p1.y*scaleY);
      ctx.lineTo(p2.x*scaleX, p2.y*scaleY);
      ctx.stroke();
      ctx.restore();
    });
  }
}

function parseGradientStops(css){
  const stops=[];
  // Extract color stops from gradient string
  const inner=css.replace(/^(linear|radial)-gradient\(\s*/,'').replace(/\)\s*$/,'');
  // Split by commas but not inside parens
  const parts=[];let depth=0,cur2='';
  for(const ch of inner){if(ch==='(')depth++;else if(ch===')')depth--;if(ch===','&&depth===0){parts.push(cur2.trim());cur2='';}else cur2+=ch;}
  if(cur2.trim())parts.push(cur2.trim());
  // Filter out angle/position, collect color stops
  let idx=0;
  const colorParts=parts.filter(p=>!/^\d+deg$/.test(p)&&!/^(to |ellipse|circle|farthest)/i.test(p));
  colorParts.forEach((p,i)=>{
    const m=p.match(/(#[0-9a-f]{3,8}|rgba?\([^)]+\)|[a-z]+)\s*(\d+%)?/i);
    if(m){const pos=m[2]?parseFloat(m[2])/100:(i/(Math.max(1,colorParts.length-1)));stops.push([pos,m[1]]);}
  });
  return stops.length?stops:[[0,'#111'],[1,'#333']];
}
function parseLinearAngle(css){
  const m=css.match(/(\d+)deg/);if(m)return+m[1];
  if(/to right/.test(css))return 90;if(/to left/.test(css))return 270;
  if(/to bottom/.test(css))return 180;if(/to top/.test(css))return 0;
  return 135;
}

function drawThumbText(ctx,d,sx,sy){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  ctx.save();
  if(d.rot){ctx.translate(x+w/2,y+h/2);ctx.rotate(d.rot*Math.PI/180);ctx.translate(-(x+w/2),-(y+h/2));}

  // Background
  if(d.textBg){
    const r=parseInt(d.textBg.slice(1,3),16),g2=parseInt(d.textBg.slice(3,5),16),b2=parseInt(d.textBg.slice(5,7),16);
    const op=d.textBgOp!=null?d.textBgOp:0.12;
    ctx.fillStyle=`rgba(${r},${g2},${b2},${op})`;
    ctx.fillRect(x,y,w,h);
  }

  // Parse style string for font props
  const cs=d.cs||'';
  const fs=Math.max(6,(parseFloat(cs.match(/font-size:\s*([\d.]+)px/)?.[1]||48)*sx));
  const fw=cs.includes('700')||cs.includes('bold')?'bold':'normal';
  const col=cs.match(/\bcolor:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/)?.[1]||'#fff';
  ctx.font=`${fw} ${fs.toFixed(1)}px Inter,sans-serif`;
  ctx.fillStyle=col;
  ctx.globalAlpha=d.elOpacity!=null?+d.elOpacity:1;

  // Extract lines from html, preserving list markers as text prefixes
  const tmp=document.createElement('div');tmp.innerHTML=d.html||'';
  // Replace list markers with text equivalents before extracting text
  tmp.querySelectorAll('span[data-list-num]').forEach((sp,i)=>{sp.textContent=sp.textContent||((i+1)+'.');});
  tmp.querySelectorAll('span[data-list-bullet]').forEach(sp=>{sp.textContent='•';});
  // Split by BR into lines
  const rawHtml=(d.html||'').replace(/<br\s*\/?>/gi,'\n');
  const tmp2=document.createElement('div');tmp2.innerHTML=rawHtml;
  tmp2.querySelectorAll('span[data-list-num]').forEach((sp,i)=>{sp.textContent=sp.textContent||((i+1)+'.');});
  tmp2.querySelectorAll('span[data-list-bullet]').forEach(sp=>{sp.textContent='•';});
  const fullTxt=tmp2.textContent||tmp2.innerText||'';
  const isUppercase=cs.includes('uppercase');
  const rawLines=fullTxt.split('\n');

  // Word-wrap simplified
  const lineH=fs*1.3;
  let lineY=y+lineH;
  const valign=d.valign||'top';
  if(valign==='middle')lineY=y+(h-lineH)/2+lineH*.6;
  else if(valign==='bottom')lineY=y+h-8*sy;

  const ta=(cs.match(/text-align:\s*(\w+)/)?.[1])||'left';
  ctx.textAlign=ta==='center'?'center':ta==='right'?'right':'left';
  const tx=ta==='center'?x+w/2:ta==='right'?x+w-4*sx:x+6*sx;

  for(const rawLine of rawLines){
    const displayLine=isUppercase?rawLine.toUpperCase():rawLine;
    const words=displayLine.split(/\s+/).filter(Boolean);
    let line='';
    for(const word of words){
      const test=line?line+' '+word:word;
      if(ctx.measureText(test).width>w-8*sx&&line){
        ctx.fillText(line,tx,lineY); line=word; lineY+=lineH;
        if(lineY>y+h)break;
      } else line=test;
    }
    if(line&&lineY<=y+h){ctx.fillText(line,tx,lineY); lineY+=lineH;}
    if(lineY>y+h)break;
  }
  ctx.restore();
}

function drawThumbShape(ctx,d,sx,sy){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  ctx.save();
  if(d.rot){ctx.translate(x+w/2,y+h/2);ctx.rotate(d.rot*Math.PI/180);ctx.translate(-(x+w/2),-(y+h/2));}
  const fill=d.fill||'#3b82f6';
  const op=d.fillOp!=null?+d.fillOp:1;
  ctx.globalAlpha=op;
  ctx.fillStyle=fill;
  const sw=d.sw!=null?+d.sw*Math.min(sx,sy):0;
  if(sw>0){ctx.strokeStyle=d.stroke||'#1d4ed8';ctx.lineWidth=sw;}
  const shape=d.shape||'rect';
  const rx=+(d.rx||0)*Math.min(sx,sy);
  if(shape==='rect'){
    if(rx>0){drawRoundRect(ctx,x,y,w,h,rx);ctx.fill();if(sw>0)ctx.stroke();}
    else{ctx.fillRect(x,y,w,h);if(sw>0)ctx.strokeRect(x,y,w,h);}
  } else if(shape==='circle'||shape==='ellipse'){
    ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);ctx.fill();if(sw>0)ctx.stroke();
  } else if(shape==='triangle'){
    ctx.beginPath();ctx.moveTo(x+w/2,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath();ctx.fill();if(sw>0)ctx.stroke();
  } else if(shape==='star'){
    drawStar(ctx,x+w/2,y+h/2,w/2,h/2,5);ctx.fill();if(sw>0)ctx.stroke();
  } else if(shape==='diamond'){
    ctx.beginPath();ctx.moveTo(x+w/2,y);ctx.lineTo(x+w,y+h/2);ctx.lineTo(x+w/2,y+h);ctx.lineTo(x,y+h/2);ctx.closePath();ctx.fill();if(sw>0)ctx.stroke();
  } else if(shape==='arrow'){
    const aw=w*.4,ah=h*.45;
    ctx.beginPath();ctx.moveTo(x,y+h*.3);ctx.lineTo(x+aw,y+h*.3);ctx.lineTo(x+aw,y);ctx.lineTo(x+w,y+h/2);ctx.lineTo(x+aw,y+h);ctx.lineTo(x+aw,y+h*.7);ctx.lineTo(x,y+h*.7);ctx.closePath();ctx.fill();if(sw>0)ctx.stroke();
  } else {
    // Fallback: draw rectangle
    ctx.fillRect(x,y,w,h);if(sw>0)ctx.strokeRect(x,y,w,h);
  }
  ctx.restore();
}

function drawRoundRect(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}
function drawStar(ctx,cx,cy,rx,ry,pts){
  ctx.beginPath();
  for(let i=0;i<pts*2;i++){const a=i*Math.PI/pts-Math.PI/2;const r2=i%2===0?1:.4;ctx.lineTo(cx+Math.cos(a)*rx*r2,cy+Math.sin(a)*ry*r2);}
  ctx.closePath();
}

// Image cache for thumbnails
const _thumbImgCache={};
function drawThumbImage(ctx,d,sx,sy){
  if(!d.src)return;
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  const cL=d.imgCropL||0,cT=d.imgCropT||0,cR=d.imgCropR||0,cB=d.imgCropB||0;
  const hasCrop=cL||cT||cR||cB;
  const drawIt=(img)=>{
    ctx.save();
    if(d.rot){ctx.translate(x+w/2,y+h/2);ctx.rotate(d.rot*Math.PI/180);ctx.translate(-(x+w/2),-(y+h/2));}
    if(hasCrop){const fW=(d.w+cL+cR)*sx,fH=(d.h+cT+cB)*sy;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,x-cL*sx,y-cT*sy,fW,fH);ctx.restore();}
    else{ctx.drawImage(img,x,y,w,h);}
    ctx.restore();
  };
  if(_thumbImgCache[d.src]){drawIt(_thumbImgCache[d.src]);return;}
  const img=new Image();
  img.onload=()=>{_thumbImgCache[d.src]=img;drawThumbs();};
  img.onerror=()=>{};
  img.src=d.src;
  ctx.save();ctx.fillStyle="rgba(255,255,255,0.1)";ctx.fillRect(x,y,w,h);ctx.restore();
}

function drawThumbCode(ctx,d,sx,sy){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  const T=CODE_THEMES[d.codeTheme||'dark']||CODE_THEMES.dark;
  ctx.save();
  ctx.fillStyle=T.bg;ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='rgba(128,128,128,.2)';ctx.lineWidth=0.5;ctx.strokeRect(x,y,w,h);
  // Draw simulated code lines
  const lh=(d.codeFs||13)*sx*1.4;
  const raw=d.codeRaw||'';const lines=raw.split('\n').slice(0,Math.floor(h/lh));
  ctx.font=`${Math.max(4,(d.codeFs||13)*sx*0.85)}px monospace`;
  lines.forEach((line,i)=>{
    const iy=y+6*sy+(i+1)*lh;if(iy>y+h-4)return;
    // Color-code simple patterns
    const isKw=/^\s*(const|let|var|function|def|class|if|return|import|from)\b/.test(line);
    ctx.fillStyle=isKw?T.kw:line.includes('//')||line.includes('#')?T.cmt:T.text;
    ctx.fillText(line.substring(0,Math.floor(w/(Math.max(4,(d.codeFs||13)*sx*0.85)*0.6))),x+8*sx,iy);
  });
  ctx.restore();
}

function drawThumbMarkdown(ctx,d,sx,sy){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  ctx.save();
  ctx.fillStyle='rgba(255,255,255,0.03)';ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=0.5;ctx.strokeRect(x,y,w,h);
  // Parse markdown for visual preview
  const raw=d.mdRaw||'';
  const lines=raw.split('\n').slice(0,20);
  let iy=y+12*sy;
  lines.forEach(line=>{
    if(iy>y+h-8)return;
    const isH1=/^#\s/.test(line);const isH2=/^##\s/.test(line);
    const isBullet=/^[-*]\s/.test(line);
    const fs=isH1?Math.max(5,(d.mdFs||16)*sx*1.2):isH2?Math.max(4,(d.mdFs||16)*sx*1.0):Math.max(4,(d.mdFs||16)*sx*0.75);
    ctx.font=`${isH1||isH2?'bold ':''} ${fs}px Inter,sans-serif`;
    ctx.fillStyle=isH1||isH2?'#fff':'rgba(255,255,255,.6)';
    const txt=line.replace(/^#+\s/,'').replace(/^[-*]\s/,isBullet?'• ':'');
    ctx.fillText(txt.substring(0,Math.floor(w/(fs*0.55))),x+(isBullet?14:8)*sx,iy);
    iy+=fs*1.5;
    if(isH1){ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(x+6*sx,iy,w*0.7,0.5);iy+=4;}
  });
  ctx.restore();
}

// Icon SVG cache: svgContent string → HTMLImageElement (loaded)
const _thumbIconCache={};

function drawThumbIcon(ctx,d,sx,sy){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  ctx.save();
  if(d.rot){ctx.translate(x+w/2,y+h/2);ctx.rotate(d.rot*Math.PI/180);ctx.translate(-(x+w/2),-(y+h/2));}

  // Build SVG with explicit pixel dimensions so browser scales it correctly
  // (SVGs without width/height may render at native viewBox size, causing wrong scale)
  const ic=typeof ICONS!=='undefined'?ICONS.find(function(e){return e.id===d.iconId;}):null;
  let svgStr=d.svgContent||'';
  if(ic&&typeof _buildIconSVG==='function'){
    svgStr=_buildIconSVG(ic,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle||'stroke',d.shadow===true||d.shadow==='true',d.shadowBlur,d.shadowColor);
  }
  // Replace style="width:100%;height:100%..." with explicit pixel size
  const pw=Math.round(w), ph=Math.round(h);
  const svgSized=svgStr.replace(/<svg /,'<svg width="'+pw+'" height="'+ph+'" ');

  if(svgSized){
    const key=svgSized;
    if(_thumbIconCache[key]){
      ctx.drawImage(_thumbIconCache[key],x,y,w,h);
    } else if(_thumbIconCache[key]!==null){
      _thumbIconCache[key]=null;
      const blob=new Blob([svgSized],{type:'image/svg+xml'});
      const url=URL.createObjectURL(blob);
      const img=new Image();
      img.onload=()=>{
        _thumbIconCache[key]=img;
        URL.revokeObjectURL(url);
        document.querySelectorAll('#slide-list .sthumb canvas').forEach((cnv,i)=>{
          const s=slides[i];
          if(s&&s.els&&s.els.some(e=>e.type==='icon'&&e.id===d.id)){
            renderThumbCanvas(cnv,s,i);
          }
        });
      };
      img.onerror=()=>{URL.revokeObjectURL(url); delete _thumbIconCache[key];};
      img.src=url;
      ctx.fillStyle=d.iconColor||'#3b82f6';
      ctx.globalAlpha=0.6;
      ctx.beginPath();ctx.arc(x+w/2,y+h/2,Math.min(w,h)*0.3,0,Math.PI*2);ctx.fill();
    }
  } else {
    ctx.fillStyle=d.iconColor||'#3b82f6';
    ctx.globalAlpha=0.6;
    ctx.beginPath();ctx.arc(x+w/2,y+h/2,Math.min(w,h)*0.3,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

function drawThumbTable(ctx,d,sx,sy){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  if(!d.rows||!d.cols)return;
  ctx.save();
  if(d.rot){ctx.translate(x+w/2,y+h/2);ctx.rotate(d.rot*Math.PI/180);ctx.translate(-(x+w/2),-(y+h/2));}
  const headerBg=d.headerBg||'#3b82f6';
  const cellBg=d.cellBg||'rgba(30,41,59,0.27)';
  const borderColor=d.borderColor||'#3b82f680';
  const bw=Math.max(0.5,(d.borderW||1)*Math.min(sx,sy));
  // Row heights and col widths (fractional)
  const rhs=(d.rowHeights||Array(d.rows).fill(1/d.rows)).map(f=>f*h);
  const cws=(d.colWidths||Array(d.cols).fill(1/d.cols)).map(f=>f*w);
  let cy=y;
  for(let r=0;r<d.rows;r++){
    const rh=rhs[r]||h/d.rows;
    let cx=x;
    for(let c=0;c<d.cols;c++){
      const cw=cws[c]||w/d.cols;
      const isH=d.headerRow&&r===0;
      // Parse cell bg color (may have alpha hex)
      const bgRaw=isH?headerBg:cellBg;
      ctx.fillStyle=bgRaw.length>7?bgRaw.slice(0,7):bgRaw;
      ctx.globalAlpha=isH?1:0.4;
      ctx.fillRect(cx,cy,cw,rh);
      cx+=cw;
    }
    cy+=rh;
  }
  // Draw grid lines
  ctx.globalAlpha=0.7;
  ctx.strokeStyle=borderColor.length>7?borderColor.slice(0,7):borderColor;
  ctx.lineWidth=bw;
  // Horizontal lines
  let gy=y;
  for(let r=0;r<=d.rows;r++){
    ctx.beginPath();ctx.moveTo(x,gy);ctx.lineTo(x+w,gy);ctx.stroke();
    if(r<d.rows)gy+=rhs[r]||h/d.rows;
  }
  // Vertical lines
  let gx=x;
  for(let c=0;c<=d.cols;c++){
    ctx.beginPath();ctx.moveTo(gx,y);ctx.lineTo(gx,y+h);ctx.stroke();
    if(c<d.cols)gx+=cws[c]||w/d.cols;
  }
  ctx.restore();
}

function drawThumbDecorSvg(ctx,d,sx,sy,TW,TH){
  // Render SVG decor via Image
  if(!d.svgContent)return;
  const key='decor_'+d.id;
  if(_thumbImgCache[key]){ctx.drawImage(_thumbImgCache[key],0,0,TW,TH);return;}
  const blob=new Blob([d.svgContent],{type:'image/svg+xml'});
  const url=URL.createObjectURL(blob);
  const img=new Image();
  img.onload=()=>{_thumbImgCache[key]=img;URL.revokeObjectURL(url);drawThumbs();};
  img.onerror=()=>{URL.revokeObjectURL(url);};
  img.src=url;
}

// Invalidate image cache on slide changes (decor colors update etc)
function invalidateThumbCache(){
  // Remove decor entries (SVG changes with theme)
  Object.keys(_thumbImgCache).forEach(k=>{if(k.startsWith('decor_'))delete _thumbImgCache[k];});
}
function reorder(from,to){
  if(from===to)return;save();pushUndo();const[r]=slides.splice(from,1);slides.splice(to,0,r);cur=to;renderAll();saveState();
}
function renderAll(){drawThumbs();load();}

// ── Formula thumbnail via SVG→Image ─────────────────────────────────────────
const _thumbFormulaCache={};
function drawThumbFormula(ctx,d,sx,sy){
  if(!d.formulaSvg)return;
  const key='formula_'+d.id+'_'+(d.formulaColor||'');
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  const color=d.formulaColor||'#ffffff';
  // Inject color into SVG for canvas rendering
  const coloredSvg=d.formulaSvg.replace(/currentColor/g,color);
  const svgBlob=`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(h)}">`+
    `<foreignObject width="100%" height="100%">`+
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${color};">`+
    coloredSvg+`</div></foreignObject></svg>`;
  if(_thumbFormulaCache[key]){
    ctx.drawImage(_thumbFormulaCache[key],x,y,w,h);return;
  }
  const blob=new Blob([svgBlob],{type:'image/svg+xml'});
  const url=URL.createObjectURL(blob);
  const img=new Image();
  img.onload=()=>{_thumbFormulaCache[key]=img;URL.revokeObjectURL(url);drawThumbs();};
  img.onerror=()=>{URL.revokeObjectURL(url);
    // fallback: draw colored rect
    ctx.save();ctx.globalAlpha=0.4;ctx.fillStyle=color;
    ctx.fillRect(x,y,w,h);ctx.restore();
  };
  img.src=url;
}

// ── Graph thumbnail via stored dataURL ──────────────────────────────────────
const _thumbGraphCache={};
function drawThumbGraph(ctx,d,sx,sy){
  if(!d.graphImg)return;
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  const key='graph_'+d.id+'_'+(d.graphColor||'')+'_'+(d.graphBg||'');
  if(_thumbGraphCache[key]){ctx.drawImage(_thumbGraphCache[key],x,y,w,h);return;}
  // Invalidate old cache entries for this element
  Object.keys(_thumbGraphCache).forEach(k=>{ if(k.startsWith('graph_'+d.id+'_')) delete _thumbGraphCache[k]; });
  const img=new Image();
  img.onload=()=>{_thumbGraphCache[key]=img;drawThumbs();};
  img.src=d.graphImg;
}

function drawThumbLego(ctx, d, sx, sy) {
  const U=40,SH=10,FH=12,TH=36,SW=26;
  const c = d.legoColor || '#e3000b';
  const blend = (hex,r2,g2,b2,t) => { const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return '#'+[r,g,b].map((v,i)=>Math.round(v+([r2,g2,b2][i]-v)*t).toString(16).padStart(2,'0')).join(''); };
  const dark = blend(c,0,0,0,0.28);

  if (d.legoStair) {
    const dir = d.legoStair;
    const bw = 2*U, totalH = SH+TH;
    const x=d.x*sx, y=d.y*sy;
    const yTop=y+SH*sy, yBot=y+totalH*sy, yVert=y+(SH+FH)*sy;
    // Inverted slope: top wide (2U), right side drops vertically to yVert, then diagonal to bottom-left
    ctx.fillStyle=c; ctx.beginPath();
    if(dir==='right'){ ctx.moveTo(x,yTop); ctx.lineTo(x+bw*sx,yTop); ctx.lineTo(x+bw*sx,yVert); ctx.lineTo(x+U*sx,yBot); ctx.lineTo(x,yBot); }
    else { ctx.moveTo(x,yTop); ctx.lineTo(x+bw*sx,yTop); ctx.lineTo(x+bw*sx,yBot); ctx.lineTo(x+U*sx,yBot); ctx.lineTo(x,yVert); }
    ctx.closePath(); ctx.fill();
    // shadow under narrow base
    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.fillRect(x+(dir==='right'?0:U)*sx, yBot-2*sy, U*sx, 2*sy);
    // two studs on top
    ctx.fillStyle=blend(c,0,0,0,0.18);
    for(let i=0;i<2;i++){ const sx2=x+(i*U+(U-SW)/2)*sx; ctx.beginPath(); ctx.roundRect(sx2,y,SW*sx,SH*sy,1); ctx.fill(); }
  } else if (d.legoSlope) {
    const dir = d.legoSlope;
    const n = d.legoStuds, bw=n*U, totalH=SH+TH;
    const x=d.x*sx, y=d.y*sy;
    const hiIdx=dir==='slope-right'?0:n-1, hiX=hiIdx*U;
    const yBodyTop=y+SH*sy, yBot=y+totalH*sy, yLoTop=yBot-FH*sy;
    // high block
    ctx.fillStyle=c; ctx.beginPath(); ctx.roundRect(x+hiX*sx, yBodyTop, U*sx, TH*sy, 1); ctx.fill();
    // slope trapezoid
    ctx.fillStyle=c; ctx.beginPath();
    if(dir==='slope-right'){ ctx.moveTo(x+U*sx,yBodyTop); ctx.lineTo(x+bw*sx,yLoTop); ctx.lineTo(x+bw*sx,yBot); ctx.lineTo(x+U*sx,yBot); }
    else { ctx.moveTo(x,yLoTop); ctx.lineTo(x+(n-1)*U*sx,yBodyTop); ctx.lineTo(x+(n-1)*U*sx,yBot); ctx.lineTo(x,yBot); }
    ctx.closePath(); ctx.fill();
    // shadow
    ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(x, yBot-2*sy, bw*sx, 2*sy);
    // stud
    ctx.fillStyle=blend(c,0,0,0,0.18);
    const sx2=x+(hiX+(U-SW)/2)*sx; ctx.beginPath(); ctx.roundRect(sx2,y,SW*sx,SH*sy,1); ctx.fill();
  } else {
    const bh = d.legoTall ? TH : FH;
    const bw = d.legoStuds * U;
    const x = d.x * sx, y = d.y * sy;
    const w = bw * sx, h = (bh+SH) * sy;
    const bodyY = y + SH*sy;
    const bodyH = bh * sy;
    // тело
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.roundRect(x, bodyY, w, bodyH, 1*sx);
    ctx.fill();
    // тень снизу
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x, bodyY+bodyH-2*sy, w, 2*sy);
    // пупырышки
    ctx.fillStyle = blend(c, 0, 0, 0, 0.18);
    for(let i=0;i<d.legoStuds;i++){
      const sx2 = x + (i*U + (U-SW)/2)*sx;
      const sw2 = SW*sx;
      ctx.beginPath();
      ctx.roundRect(sx2, y, sw2, SH*sy, 1*sx);
      ctx.fill();
    }
  }
}
function _blendHex(hex,r2,g2,b2,t){
  const h=hex.replace('#','');
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return '#'+[r,g,b].map((v,i)=>Math.round(v+([r2,g2,b2][i]-v)*t).toString(16).padStart(2,'0')).join('');
}
