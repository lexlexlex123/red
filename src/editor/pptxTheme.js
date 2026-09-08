/** PPTX theme / schemeClr / slide bg / OMML (from js/26-export.js). */

export const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
export const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
export const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export const NS_M = 'http://schemas.openxmlformats.org/officeDocument/2006/math';

export function ommlToLatex(oMathNode){
  const nsM='http://schemas.openxmlformats.org/officeDocument/2006/math';
  function node2latex(n){
    if(!n||n.nodeType===3) return n?n.textContent:'';
    const ln=n.localName;
    const ch=Array.from(n.childNodes);
    const childTex=()=>ch.map(node2latex).join('');
    // Text run
    if(ln==='r'){
      const t=n.getElementsByTagNameNS(nsM,'t')[0];
      return t?t.textContent:'';
    }
    // Fraction
    if(ln==='f'){
      const num=n.getElementsByTagNameNS(nsM,'num')[0];
      const den=n.getElementsByTagNameNS(nsM,'den')[0];
      return '\\frac{'+ommlChildren(num)+'}{'+ommlChildren(den)+'}';
    }
    // Radical (sqrt)
    if(ln==='rad'){
      const deg=n.getElementsByTagNameNS(nsM,'deg')[0];
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      const degTex=ommlChildren(deg).trim();
      return degTex&&degTex!=='2'?'\\sqrt['+degTex+']{'+ommlChildren(e)+'}'
                                  :'\\sqrt{'+ommlChildren(e)+'}';
    }
    // Superscript
    if(ln==='sSup'){
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      const sup=n.getElementsByTagNameNS(nsM,'sup')[0];
      return ommlChildren(e)+'^{'+ommlChildren(sup)+'}';
    }
    // Subscript
    if(ln==='sSub'){
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      const sub=n.getElementsByTagNameNS(nsM,'sub')[0];
      return ommlChildren(e)+'_{'+ommlChildren(sub)+'}';
    }
    // Sub+Sup
    if(ln==='sSubSup'){
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      const sub=n.getElementsByTagNameNS(nsM,'sub')[0];
      const sup=n.getElementsByTagNameNS(nsM,'sup')[0];
      return ommlChildren(e)+'_{'+ommlChildren(sub)+'}^{'+ommlChildren(sup)+'}';
    }
    // Parenthesis / delimiter
    if(ln==='d'){
      const begChr=n.getElementsByTagNameNS(nsM,'begChr')[0];
      const endChr=n.getElementsByTagNameNS(nsM,'endChr')[0];
      const beg=begChr?begChr.getAttribute('m:val')||'(':  '(';
      const end=endChr?endChr.getAttribute('m:val')||')':  ')';
      const eSubs=Array.from(n.getElementsByTagNameNS(nsM,'e'));
      const inner=eSubs.map(ommlChildren).join(',');
      const lb=beg==='('?'\\left(': beg==='['?'\\left[': beg==='{'?'\\left\\{': '\\left.';
      const rb=end===')'?'\\right)': end===']'?'\\right]': end==='}'?'\\right\\}': '\\right.';
      return lb+inner+rb;
    }
    // Nary (sum, integral, product)
    if(ln==='nary'){
      const chrEl=n.getElementsByTagNameNS(nsM,'chr')[0];
      const chr=chrEl?chrEl.getAttribute('m:val')||'∑':'∑';
      const sub=n.getElementsByTagNameNS(nsM,'sub')[0];
      const sup=n.getElementsByTagNameNS(nsM,'sup')[0];
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      const CMD={'∑':'\\sum','∏':'\\prod','∫':'\\int','∬':'\\iint','∭':'\\iiint','∮':'\\oint'}[chr]||'\\sum';
      const lo=sub?'_{'+ommlChildren(sub)+'}':'';
      const hi=sup?'^{'+ommlChildren(sup)+'}':'';
      return CMD+lo+hi+' '+ommlChildren(e);
    }
    // Limit
    if(ln==='limLow'){
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      const lim=n.getElementsByTagNameNS(nsM,'lim')[0];
      return '\\lim_{'+ommlChildren(lim)+'}'+ommlChildren(e);
    }
    // Matrix
    if(ln==='m'){
      const rows=Array.from(n.getElementsByTagNameNS(nsM,'mr'));
      const tex=rows.map(r=>{
        const cells=Array.from(r.getElementsByTagNameNS(nsM,'e'));
        return cells.map(ommlChildren).join(' & ');
      }).join(' \\\\ ');
      return '\\begin{pmatrix}'+tex+'\\end{pmatrix}';
    }
    // Accent (hat, bar, etc.)
    if(ln==='acc'){
      const chrEl=n.getElementsByTagNameNS(nsM,'chr')[0];
      const chr=chrEl?chrEl.getAttribute('m:val')||'^':'^';
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      const ACC={'^':'\\hat','~':'\\tilde','‾':'\\bar','→':'\\vec','·':'\\dot','¨':'\\ddot'}[chr]||'\\hat';
      return ACC+'{'+ommlChildren(e)+'}';
    }
    // Bar / overline
    if(ln==='bar'){
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      return '\\overline{'+ommlChildren(e)+'}';
    }
    // Equation array / group
    if(ln==='eqArr'){
      const rows=Array.from(n.getElementsByTagNameNS(nsM,'e'));
      return rows.map(ommlChildren).join(' \\\\ ');
    }
    // oMath / oMathPara — just recurse children
    if(ln==='oMath'||ln==='oMathPara') return childTex();
    // Default — recurse
    return childTex();
  }
  function ommlChildren(n){
    if(!n) return '';
    return Array.from(n.childNodes).map(node2latex).join('');
  }
  // Map common Unicode math symbols to LaTeX
  function fixSymbols(s){
    return s
      .replace(/α/g,'\\alpha').replace(/β/g,'\\beta').replace(/γ/g,'\\gamma')
      .replace(/δ/g,'\\delta').replace(/ε/g,'\\epsilon').replace(/ζ/g,'\\zeta')
      .replace(/η/g,'\\eta').replace(/θ/g,'\\theta').replace(/ι/g,'\\iota')
      .replace(/κ/g,'\\kappa').replace(/λ/g,'\\lambda').replace(/μ/g,'\\mu')
      .replace(/ν/g,'\\nu').replace(/ξ/g,'\\xi').replace(/π/g,'\\pi')
      .replace(/ρ/g,'\\rho').replace(/σ/g,'\\sigma').replace(/τ/g,'\\tau')
      .replace(/υ/g,'\\upsilon').replace(/φ/g,'\\phi').replace(/χ/g,'\\chi')
      .replace(/ψ/g,'\\psi').replace(/ω/g,'\\omega')
      .replace(/Α/g,'A').replace(/Β/g,'B').replace(/Γ/g,'\\Gamma')
      .replace(/Δ/g,'\\Delta').replace(/Θ/g,'\\Theta').replace(/Λ/g,'\\Lambda')
      .replace(/Ξ/g,'\\Xi').replace(/Π/g,'\\Pi').replace(/Σ/g,'\\Sigma')
      .replace(/Φ/g,'\\Phi').replace(/Ψ/g,'\\Psi').replace(/Ω/g,'\\Omega')
      .replace(/±/g,'\\pm').replace(/∓/g,'\\mp').replace(/×/g,'\\times')
      .replace(/÷/g,'\\div').replace(/≤/g,'\\leq').replace(/≥/g,'\\geq')
      .replace(/≠/g,'\\neq').replace(/≈/g,'\\approx').replace(/≡/g,'\\equiv')
      .replace(/∞/g,'\\infty').replace(/∂/g,'\\partial').replace(/∇/g,'\\nabla')
      .replace(/∈/g,'\\in').replace(/∉/g,'\\notin').replace(/⊂/g,'\\subset')
      .replace(/⊃/g,'\\supset').replace(/∪/g,'\\cup').replace(/∩/g,'\\cap')
      .replace(/∧/g,'\\wedge').replace(/∨/g,'\\vee').replace(/¬/g,'\\neg')
      .replace(/→/g,'\\rightarrow').replace(/←/g,'\\leftarrow')
      .replace(/↔/g,'\\leftrightarrow').replace(/⇒/g,'\\Rightarrow')
      .replace(/⇔/g,'\\Leftrightarrow').replace(/·/g,'\\cdot')
      .replace(/…/g,'\\ldots').replace(/⋯/g,'\\cdots');
  }
  const raw=ommlChildren(oMathNode);
  return fixSymbols(raw).trim();
}

const PPTX_NS_A='http://schemas.openxmlformats.org/drawingml/2006/main';
export const PPTX_SCHEME_DEFAULT={
  dk1:'#000000',lt1:'#ffffff',dk2:'#44546a',lt2:'#e7e6e6',
  accent1:'#4472c4',accent2:'#ed7d31',accent3:'#a5a5a5',accent4:'#ffc000',
  accent5:'#5b9bd5',accent6:'#70ad47',
  hlink:'#0563c1',folHlink:'#954f72',
  bg1:'#ffffff',tx1:'#000000',bg2:'#e7e6e6',tx2:'#44546a'
};
function pptxHexRgb(hex){
  if(!hex) return null;
  const h=String(hex).replace('#','');
  if(h.length<6) return null;
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function pptxRgbHex(r,g,b){
  const t=x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0');
  return '#'+t(r)+t(g)+t(b);
}
function pptxApplyClrMods(hex,schemeClrEl){
  const rgb=pptxHexRgb(hex);
  if(!rgb||!schemeClrEl) return hex;
  let [r,g,b]=rgb;
  const lumMod=schemeClrEl.getElementsByTagNameNS(PPTX_NS_A,'lumMod')[0];
  const lumOff=schemeClrEl.getElementsByTagNameNS(PPTX_NS_A,'lumOff')[0];
  const shade=schemeClrEl.getElementsByTagNameNS(PPTX_NS_A,'shade')[0];
  const tint=schemeClrEl.getElementsByTagNameNS(PPTX_NS_A,'tint')[0];
  if(lumMod){ const f=+lumMod.getAttribute('val')/100000; r*=f; g*=f; b*=f; }
  if(lumOff){ const f=+lumOff.getAttribute('val')/100000; r+=255*f; g+=255*f; b+=255*f; }
  if(shade){ const f=+shade.getAttribute('val')/100000; r*=f; g*=f; b*=f; }
  if(tint){ const f=+tint.getAttribute('val')/100000; r=r+(255-r)*f; g=g+(255-g)*f; b=b+(255-b)*f; }
  return pptxRgbHex(r,g,b);
}
export async function pptxLoadTheme(zip){
  const map={...PPTX_SCHEME_DEFAULT};
  try{
    const xml=await zip.file('ppt/theme/theme1.xml')?.async('text');
    if(!xml) return map;
    const doc=new DOMParser().parseFromString(xml,'text/xml');
    const scheme=doc.getElementsByTagNameNS(PPTX_NS_A,'clrScheme')[0];
    if(!scheme) return map;
    ['dk1','lt1','dk2','lt2','accent1','accent2','accent3','accent4','accent5','accent6','hlink','folHlink'].forEach(name=>{
      const el=scheme.getElementsByTagNameNS(PPTX_NS_A,name)[0];
      if(!el) return;
      const rgb=el.getElementsByTagNameNS(PPTX_NS_A,'srgbClr')[0];
      const sys=el.getElementsByTagNameNS(PPTX_NS_A,'sysClr')[0];
      if(rgb){ const v=rgb.getAttribute('val'); if(v&&v.length>=6) map[name]='#'+v.slice(0,6).toLowerCase(); }
      else if(sys){ const v=sys.getAttribute('lastClr'); if(v&&v.length>=6) map[name]='#'+v.slice(-6).toLowerCase(); }
    });
    map.bg1=map.lt1||map.bg1; map.tx1=map.dk1||map.tx1;
    map.bg2=map.lt2||map.bg2; map.tx2=map.dk2||map.tx2;
  }catch(e){}
  return map;
}
export function pptxColorFromSolidFill(solidFill,theme){
  if(!solidFill) return '';
  const t=theme||PPTX_SCHEME_DEFAULT;
  const srgb=solidFill.getElementsByTagNameNS(PPTX_NS_A,'srgbClr')[0];
  if(srgb){
    const v=srgb.getAttribute('val');
    if(v&&v.length>=6) return '#'+v.slice(0,6).toLowerCase();
  }
  const scheme=solidFill.getElementsByTagNameNS(PPTX_NS_A,'schemeClr')[0];
  if(scheme){
    const name=scheme.getAttribute('val');
    let base=name&&t[name]?t[name]:'';
    if(!base&&name==='phClr') base=t.tx1||t.dk1||'#000000';
    if(base) return pptxApplyClrMods(base,scheme);
  }
  const sys=solidFill.getElementsByTagNameNS(PPTX_NS_A,'sysClr')[0];
  if(sys){
    const v=sys.getAttribute('lastClr');
    if(v&&v.length>=6) return '#'+v.slice(-6).toLowerCase();
  }
  return '';
}
export function pptxSlideBgColor(doc,theme,nsP){
  try{
    const cSld=doc.getElementsByTagNameNS(nsP,'cSld')[0];
    if(!cSld) return '';
    const bg=cSld.getElementsByTagNameNS(nsP,'bg')[0];
    if(bg){
      const bgRef=bg.getElementsByTagNameNS(nsP,'bgRef')[0];
      if(bgRef){
        const sfRef=bgRef.getElementsByTagNameNS(PPTX_NS_A,'solidFill')[0];
        if(sfRef){ const c=pptxColorFromSolidFill(sfRef,theme); if(c) return c; }
      }
      const bgPr=bg.getElementsByTagNameNS(nsP,'bgPr')[0]||bg.getElementsByTagNameNS(PPTX_NS_A,'bgPr')[0];
      if(bgPr){
        const sf=bgPr.getElementsByTagNameNS(PPTX_NS_A,'solidFill')[0];
        if(sf) return pptxColorFromSolidFill(sf,theme);
        const grad=bgPr.getElementsByTagNameNS(PPTX_NS_A,'gradFill')[0];
        if(grad){
          const gs=grad.getElementsByTagNameNS(PPTX_NS_A,'gs');
          for(const g of gs){
            const sf2=g.getElementsByTagNameNS(PPTX_NS_A,'solidFill')[0];
            if(sf2){ const c=pptxColorFromSolidFill(sf2,theme); if(c) return c; }
          }
        }
      }
    }
  }catch(e){}
  return '';
}
export function pptxDefaultTextColor(bgHex,theme){
  const t=theme||PPTX_SCHEME_DEFAULT;
  const rgb=pptxHexRgb(bgHex);
  if(rgb){
    const lum=(0.299*rgb[0]+0.587*rgb[1]+0.114*rgb[2])/255;
    if(lum<0.5) return t.lt1||'#ffffff';
    return t.tx1||t.dk1||'#000000';
  }
  return t.tx1||t.dk1||'#000000';
}
export function pptxSpStyle(sp,theme){
  const spPr=sp.getElementsByTagNameNS(NS_P,'spPr')[0]
    ||sp.getElementsByTagNameNS(PPTX_NS_A,'spPr')[0];
  if(!spPr) return {};
  let fill='',fillOp=1;
  if(spPr.getElementsByTagNameNS(PPTX_NS_A,'noFill')[0]) fillOp=0;
  else{
    const sf=spPr.getElementsByTagNameNS(PPTX_NS_A,'solidFill')[0];
    if(sf) fill=pptxColorFromSolidFill(sf,theme);
  }
  let stroke='',sw=0;
  const ln=spPr.getElementsByTagNameNS(PPTX_NS_A,'ln')[0];
  if(ln){
    const lw=+(ln.getAttribute('w')||0);
    if(lw>0) sw=Math.max(1,Math.round(lw/12700));
    const lnSf=ln.getElementsByTagNameNS(PPTX_NS_A,'solidFill')[0];
    if(lnSf) stroke=pptxColorFromSolidFill(lnSf,theme);
    if(ln.getElementsByTagNameNS(PPTX_NS_A,'noFill')[0]) sw=0;
  }
  return {fill,fillOp,stroke,sw};
}
export function pptxResolveRelTarget(relsPath,target){
  const slideDir=relsPath.replace(/_rels\/[^/]+$/,'');
  let p=(target||'').replace(/\\/g,'/');
  if(p.startsWith('/')) return p.replace(/^\//,'');
  const parts=slideDir.split('/');
  p.split('/').forEach(part=>{
    if(part==='..'){ if(parts.length) parts.pop(); }
    else if(part&&part!=='.') parts.push(part);
  });
  return parts.join('/');
}
export async function pptxSlideBgChain(zip,sf,doc,theme,parser,nsP,nsA,nsR){
  let c=pptxSlideBgColor(doc,theme,nsP);
  if(c) return c;
  try{
    const relsPath='ppt/slides/_rels/'+sf.split('/').pop()+'.rels';
    const rxml=await zip.file(relsPath)?.async('text');
    if(!rxml) return '';
    const rd=parser.parseFromString(rxml,'text/xml');
    const rels=Array.from(rd.getElementsByTagName('Relationship'));
    const layoutRel=rels.find(r=>(r.getAttribute('Type')||'').indexOf('/slideLayout')>=0);
    if(layoutRel){
      const layoutPath=pptxResolveRelTarget(relsPath,layoutRel.getAttribute('Target'));
      const lxml=await zip.file(layoutPath)?.async('text');
      if(lxml){
        const ld=parser.parseFromString(lxml,'text/xml');
        c=pptxSlideBgColor(ld,theme,nsP);
        if(c) return c;
        const lRelsPath=layoutPath.replace(/[^/]+$/,'_rels/'+layoutPath.split('/').pop()+'.rels');
        const lrxml=await zip.file(lRelsPath)?.async('text');
        if(lrxml){
          const lrd=parser.parseFromString(lrxml,'text/xml');
          const masterRel=Array.from(lrd.getElementsByTagName('Relationship')).find(r=>(r.getAttribute('Type')||'').indexOf('/slideMaster')>=0);
          if(masterRel){
            const masterPath=pptxResolveRelTarget(lRelsPath,masterRel.getAttribute('Target'));
            const mxml=await zip.file(masterPath)?.async('text');
            if(mxml){
              const md=parser.parseFromString(mxml,'text/xml');
              c=pptxSlideBgColor(md,theme,nsP);
              if(c) return c;
            }
          }
        }
      }
    }
  }catch(e){}
  return '';
}
