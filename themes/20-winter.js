/** 20 — Winter */
(function(){
window._THEME_20_WINTER = {
name:'Зима', nameEn:'Winter',
    desc:'Снежинки, иней, кристаллы льда',descEn:'Snowflakes, frost crystals',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='wn'+Math.random().toString(36).slice(2,7);
      const rng=(s)=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      const preWarm=isTitle?15:13;
      const nFlakes=isTitle?52:32;

      function sf(cx,cy,r,col,op){
        let d='';
        for(let arm=0;arm<6;arm++){
          const a=arm*60*Math.PI/180;
          const ex=cx+Math.cos(a)*r, ey=cy+Math.sin(a)*r;
          d+=`<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${col}" stroke-width="1" opacity="${op}"/>`;
          for(const t of[0.4,0.65]){
            const bx=cx+Math.cos(a)*r*t, by=cy+Math.sin(a)*r*t, bl=r*0.28;
            for(const ba of[a+Math.PI/3,a-Math.PI/3])
              d+=`<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx+Math.cos(ba)*bl).toFixed(1)}" y2="${(by+Math.sin(ba)*bl).toFixed(1)}" stroke="${col}" stroke-width="0.7" opacity="${op}"/>`;
          }
        }
        return `<g>${d}<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r*0.1).toFixed(1)}" fill="${col}" opacity="${op}"/></g>`;
      }

      const _flakeXY=(t,sx,phase,swayA,h,r,dx)=>{
        const y=-r*2+(h+r*4)*t;
        const x=sx+Math.sin(phase+t*Math.PI*2)*swayA+dx*t;
        return [x,y];
      };

      let body='', hasBlur=false;
      for(let i=0;i<nFlakes;i++){
        const col=i%3===0?a2:a1;
        const isBlur=rng(i*5+40)>0.68;
        const fr=isBlur?(9+rng(i*5+2)*20):(3.5+rng(i*5+2)*10);
        const opBase=isTitle?(isBlur?0.07:0.10):(isBlur?0.05:0.07);
        const op=(opBase+rng(i*5+3)*(isBlur?0.09:0.16)).toFixed(2);
        const sx=rng(i*5+11)*w;
        const swayA=8+rng(i*5+5)*24;
        const phase=rng(i*5+6)*Math.PI*2;
        const dur=6+rng(i*5)*7;
        const delay=rng(i*5+0.5)*dur;
        const begin=(delay-preWarm).toFixed(2);
        const spinDur=(2.2+rng(i*5+8)*3.5).toFixed(2);
        const spinDir=rng(i*5+9)>0.5?1:-1;
        const dx=(rng(i*5+1.5)-0.5)*48;
        const blurAttr=isBlur?` filter="url(#${uid}blur)"`:'';
        if(isBlur) hasBlur=true;

        if(doAnimate){
          const steps=28;
          const xV=[],yV=[];
          for(let k=0;k<=steps;k++){
            const t=k/steps;
            const [lx,ly]=_flakeXY(t,sx,phase,swayA,h,fr,dx);
            xV.push(lx.toFixed(1)); yV.push(ly.toFixed(1));
          }
          const kv=xV.map((x,k)=>`${x},${yV[k]}`).join(';');
          body+=`<g opacity="${op}"${blurAttr}>
            <animateTransform attributeName="transform" type="translate" values="${kv}" dur="${dur.toFixed(1)}s" begin="${begin}s" repeatCount="indefinite" calcMode="linear"/>
            <g>
              <animateTransform attributeName="transform" type="rotate" from="0" to="${(360*spinDir).toFixed(0)}" dur="${spinDur}s" repeatCount="indefinite" calcMode="linear"/>
              ${sf(0,0,fr,col,1)}
            </g>
          </g>`;
        } else {
          let elapsed=preWarm-delay;
          while(elapsed<0) elapsed+=dur;
          elapsed%=dur;
          const t=elapsed/dur;
          const [lx,ly]=_flakeXY(t,sx,phase,swayA,h,fr,dx);
          const rot=((elapsed/+spinDur)*360*spinDir)%360;
          body+=`<g transform="translate(${lx.toFixed(1)},${ly.toFixed(1)}) rotate(${rot.toFixed(0)})" opacity="${op}"${blurAttr}>${sf(0,0,fr,col,1)}</g>`;
        }
      }

      const defs=hasBlur?`<defs><filter id="${uid}blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${isTitle?3.2:2.6}"/></filter></defs>`:'';
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${defs}${body}</svg>`;
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  tplVariants(isRu){ return _themeTplFor('Winter', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();
