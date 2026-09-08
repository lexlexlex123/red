/** 10 — Metro */
(function(){
window._THEME_10_METRO = {
name:'Метро',nameEn:'Metro',
    desc:'Цветные плитки, панели ездят как на ТВ',descEn:'Bold flat tiles, sliding news-style panels',
    animated: true,

    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const preWarm=isTitle?14:11;
      const ks='0.42 0 0.58 1;0.42 0 0.58 1';

      function _pingT(t){
        return t<=0.5?t*2:(1-t)*2;
      }
      function _pingPos(t,x0,x1){
        const p=2*t;
        return p<=1?x0+(x1-x0)*p:x1-(x1-x0)*(p-1);
      }

      function _staticRect(x,y,rw,rh,col,fillOp,strokeCol,strokeOp){
        const fill=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${col}" opacity="${fillOp}"/>`;
        const stroke=strokeCol?`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="none" stroke="${strokeCol}" stroke-width="${strokeOp>=0.22?1:0.8}" opacity="${strokeOp}"/>`:'';
        return fill+stroke;
      }

      function _driftRect(x,y,rw,rh,col,fillOp,strokeCol,strokeOp,anim){
        const rw2=anim&&(anim.rw2!=null)?anim.rw2:rw*1.42;
        const rh2=anim&&(anim.rh2!=null)?anim.rh2:rh*1.42;
        if(doAnimate&&anim){
          const dur=anim.dur,begin=(anim.begin-preWarm).toFixed(2);
          let tValues,wAnim='',hAnim='';
          if(anim.axis==='x'){
            const x0=x.toFixed(1),x1=(x+anim.delta).toFixed(1),y0=y.toFixed(1);
            tValues=`${x0},${y0};${x1},${y0};${x0},${y0}`;
            wAnim=`<animate attributeName="width" values="${rw.toFixed(1)};${rw2.toFixed(1)};${rw.toFixed(1)}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="${ks}"/>`;
          }else{
            const x0=x.toFixed(1),y0=y.toFixed(1),y1=(y+anim.delta).toFixed(1);
            tValues=`${x0},${y0};${x0},${y1};${x0},${y0}`;
            hAnim=`<animate attributeName="height" values="${rh.toFixed(1)};${rh2.toFixed(1)};${rh.toFixed(1)}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="${ks}"/>`;
          }
          const fill=`<rect x="0" y="0" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${col}" opacity="${fillOp}">${wAnim}${hAnim}</rect>`;
          const stroke=strokeCol?`<rect x="0" y="0" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="none" stroke="${strokeCol}" stroke-width="${strokeOp>=0.22?1:0.8}" opacity="${strokeOp}">${wAnim}${hAnim}</rect>`:'';
          return `<g>
            <animateTransform attributeName="transform" type="translate" values="${tValues}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="${ks}"/>
            ${fill}${stroke}
          </g>`;
        }
        let px=x,py=y,cw=rw,ch=rh;
        if(anim){
          let elapsed=preWarm-anim.begin;
          while(elapsed<0) elapsed+=anim.dur;
          elapsed%=anim.dur;
          const t=elapsed/anim.dur;
          const blend=_pingT(t);
          if(anim.axis==='x'){
            px=_pingPos(t,x,x+anim.delta);
            cw=rw+(rw2-rw)*blend;
          }else{
            py=_pingPos(t,y,y+anim.delta);
            ch=rh+(rh2-rh)*blend;
          }
        }
        const fill=`<rect x="0" y="0" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" fill="${col}" opacity="${fillOp}"/>`;
        const stroke=strokeCol?`<rect x="0" y="0" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" fill="none" stroke="${strokeCol}" stroke-width="${strokeOp>=0.22?1:0.8}" opacity="${strokeOp}"/>`:'';
        return `<g transform="translate(${px.toFixed(1)},${py.toFixed(1)})">${fill}${stroke}</g>`;
      }

      let frame='';
      if(isTitle){
        const edge1=w*.08,edge2=w*.025,edge2x=w*.09;
        frame+=`<rect x="0" y="0" width="${edge1.toFixed(1)}" height="${h}" fill="${a1}" opacity="0.55"/>
          <rect x="${edge2x.toFixed(1)}" y="0" width="${edge2.toFixed(1)}" height="${h}" fill="${a2}" opacity="0.3"/>`;
        frame+=_staticRect(w*.62,0,w*.38,h*.5,a1,0.2,a1,0.2);
        frame+=_staticRect(w*.62,h*.52,w*.22,h*.48,a2,0.16,a2,0.2);
        frame+=_staticRect(w*.86,h*.52,w*.14,h*.48,a1,0.25,a1,0.25);
        frame+=`<rect x="${(w-edge1).toFixed(1)}" y="0" width="${edge1.toFixed(1)}" height="${h}" fill="${a1}" opacity="0.55"/>
          <rect x="${(w-edge2x-edge2).toFixed(1)}" y="0" width="${edge2.toFixed(1)}" height="${h}" fill="${a2}" opacity="0.3"/>`;
      }else{
        frame+=`<rect x="0" y="0" width="${(w*.06).toFixed(1)}" height="${h}" fill="${a1}" opacity="0.55"/>
          <rect x="${(w*.07).toFixed(1)}" y="0" width="${(w*.02).toFixed(1)}" height="${h}" fill="${a2}" opacity="0.28"/>`;
        frame+=_staticRect(w*.72,0,w*.28,h*.55,a1,0.18,null,0);
        frame+=_staticRect(w*.72,h*.57,w*.16,h*.43,a2,0.14,null,0);
        frame+=_staticRect(w*.9,h*.57,w*.1,h*.43,a1,0.22,null,0);
      }

      const tickers=isTitle?[
        {x:w*.08,y:h*.05,rw:w*.62,rh:h*.058,c:a1,fo:0.14,a:'x',d:w*.44,rw2:w*.88,dur:19,b:0},
        {x:w*.18,y:h*.17,rw:w*.55,rh:h*.052,c:a2,fo:0.11,a:'x',d:-w*.5,rw2:w*.82,dur:22,b:1.5},
        {x:w*.04,y:h*.78,rw:w*.68,rh:h*.056,c:a2,fo:0.10,a:'x',d:w*.54,rw2:w*.92,dur:24,b:3},
        {x:w*.35,y:h*.9,rw:w*.58,rh:h*.05,c:a1,fo:0.09,a:'x',d:-w*.46,rw2:w*.8,dur:17,b:0.8},
      ]:[
        {x:w*.12,y:h*.08,rw:w*.56,rh:h*.05,c:a1,fo:0.12,a:'x',d:w*.4,rw2:w*.78,dur:21,b:0},
        {x:w*.16,y:h*.84,rw:w*.6,rh:h*.048,c:a2,fo:0.09,a:'x',d:-w*.44,rw2:w*.82,dur:23,b:2.2},
        {x:w*.86,y:h*.15,rw:w*.055,rh:h*.42,c:a1,fo:0.11,a:'y',d:h*.24,rh2:h*.58,dur:15,b:1.1},
      ];

      let body='';
      tickers.forEach(t=>{
        body+=_driftRect(t.x,t.y,t.rw,t.rh,t.c,t.fo,null,0,{axis:t.a,delta:t.d,dur:t.dur,begin:t.b,rw2:t.rw2,rh2:t.rh2});
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${frame}${body}</svg>`;
    },

    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  tplVariants(isRu){ return _themeTplFor('Metro', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();
