/** 37 — Tile */
(function(){
window._THEME_37_TILE = {
name:'Плитка', nameEn:'Tile',
    desc:'Сетка плиток, крупные блоки, смена цвета', descEn:'Tile grid, large blocks, color flips',
    animated: true,
    // 18×10: equal edge/gap + square cells on 16:9
    _cols:18, _rows:10,
    _metrics(w,h){
      const cols=this._cols, rows=this._rows;
      let g=(rows*w-cols*h)/(rows-cols);
      let s=(w-(cols+1)*g)/cols;
      if(!(g>0.5&&s>2) || Math.abs((h-(rows+1)*g)/rows-s)>0.05){
        const alpha=0.2;
        s=Math.min(w/(cols+(cols+1)*alpha), h/(rows+(rows+1)*alpha));
        g=s*alpha;
      }
      const gw=cols*s+(cols+1)*g;
      const gh=rows*s+(rows+1)*g;
      return {cols,rows,s,g, ox:(w-gw)/2, oy:(h-gh)/2};
    },
    _swatch(a1,a2){
      const th=typeof _activeThemeForScheme==='function'?_activeThemeForScheme():(typeof _activeTheme==='function'?_activeTheme():null);
      const sw=(c,r,fb)=>(th&&typeof _schemeSwatchColor==='function'&&_schemeSwatchColor(th,c,r))||fb;
      return {c19:sw(0,8,a2||'#c45c3e'), c29:sw(1,8,a1||'#9a8f84')};
    },
    /** Large tiles as [c0,r0,c1,r1] inclusive. Rest = 1×1. */
    _layoutRects(style){
      const st=style||'full';
      if(st==='split'){
        return [[1,1,10,8],[12,1,16,3]];
      }
      if(st==='frame'||st==='border'||st==='title'){
        return [[2,2,15,7]];
      }
      if(st==='mosaic'){
        return [
          [0,0,1,1],[3,0,4,1],[7,0,8,0],[13,0,15,1],
          [2,1,2,2],[5,1,6,2],[9,1,10,2],[16,1,17,2],
          [0,3,1,4],[4,3,5,4],[11,3,12,4],[14,3,15,5],
          [2,4,3,5],[7,4,8,5],[16,5,17,6],
          [0,6,1,7],[2,6,5,8],[8,6,9,7],[11,6,12,7],
          [6,7,7,8],[13,7,14,8],[16,8,17,9],
          [0,9,2,9],[8,9,10,9],[12,9,13,9],
        ];
      }
      if(st==='bands'||st==='strips'||st==='content'){
        return [[1,1,16,2],[1,4,16,8]];
      }
      return []; // full — only 1×1
    },
    _cellOcc(rects,cols,rows){
      const occ=Array.from({length:rows},()=>Array(cols).fill(null));
      rects.forEach((R,ri)=>{
        const[c0,r0,c1,r1]=R;
        for(let r=r0;r<=r1;r++) for(let c=c0;c<=c1;c++){
          if(r>=0&&r<rows&&c>=0&&c<cols) occ[r][c]=ri;
        }
      });
      return occ;
    },
    _build(w,h,a1,a2,style,doAnimate){
      const uid='tl'+Math.random().toString(36).slice(2,7);
      const rng=s=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      const {c19,c29}=this._swatch(a1,a2);
      const M=this._metrics(w,h);
      const {cols,rows,s,g,ox,oy}=M;
      const f=n=>n.toFixed(2);
      const rects=this._layoutRects(style);
      const occ=this._cellOcc(rects,cols,rows);
      const seedBase=(style||'full').length*97+cols*13;

      let svg='';
      // Large merged tiles (color 29 dominant, occasional 19)
      rects.forEach((R,ri)=>{
        const[c0,r0,c1,r1]=R;
        const x=ox+g+c0*(s+g);
        const y=oy+g+r0*(s+g);
        const bw=(c1-c0+1)*s+(c1-c0)*g;
        const bh=(r1-r0+1)*s+(r1-r0)*g;
        const fill=rng(seedBase+ri*19+3)<0.18?c19:c29;
        svg+=`<rect x="${f(x)}" y="${f(y)}" width="${f(bw)}" height="${f(bh)}" rx="${f(Math.min(3,s*0.08))}" fill="${fill}"/>`;
      });

      // 1×1 cells
      let cellI=0;
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          if(occ[r][c]!=null) continue;
          const x=ox+g+c*(s+g);
          const y=oy+g+r*(s+g);
          const seed=seedBase+r*131+c*17+7;
          const use29=rng(seed)<0.22;
          const fill=use29?c29:c19;
          const alt=use29?c19:c29;
          const rx=Math.min(2.2,s*0.08);
          if(doAnimate && rng(seed+41)<0.28){
            const dur=(3.5+rng(seed+5)*5.5).toFixed(1);
            const beg=(-(rng(seed+9)*(+dur))).toFixed(2);
            // Mostly stay on primary; brief flip to alt
            const hold=0.62+rng(seed+11)*0.2;
            const t1=hold.toFixed(2);
            const t2=(hold+0.08+rng(seed+13)*0.1).toFixed(2);
            svg+=`<rect x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}" rx="${f(rx)}" fill="${fill}">`+
              `<animate attributeName="fill" values="${fill};${fill};${alt};${alt};${fill}" `+
              `keyTimes="0;${t1};${t1};${t2};1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="discrete"/>`+
              `</rect>`;
          } else {
            svg+=`<rect x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}" rx="${f(rx)}" fill="${fill}"/>`;
          }
          cellI++;
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${svg}</svg>`;
    },
    variantSvg(w,h,a1,a2,style,doAnimate){
      const anim=doAnimate===false?false:(this.animated&&((typeof _layoutAnimated!=='undefined')?_layoutAnimated:true));
      return this._build(w,h,a1,a2,style||'full',anim);
    },
    titleSvg(w,h,a1,a2,d){ return this._build(w,h,a1,a2,'frame',d!==false); },
    contentSvg(w,h,a1,a2,d){ return this._build(w,h,a1,a2,'bands',d!==false); },
  tplVariants(isRu){ return _themeTplFor('Tile', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();
