/** 08 — Layers */
(function(){
window._THEME_08_LAYERS = {
name:'Слои',nameEn:'Layers',
    desc:'Переливающиеся волны, эффект бархата',descEn:'Velvet wave layers, shimmering depth',
    animated: true,

    _wpts(yb,amp,per,W,steps){
      // Ширина: 3W (от -W до 2W) — достаточно для translate -W без пустот
      const p=[];
      for(let i=0;i<=steps;i++){
        const x = -W + W*3*i/steps;
        const phase = (x+W)/W * per;
        const y = yb + amp*Math.sin(phase*Math.PI*2);
        p.push(x.toFixed(2)+','+y.toFixed(2));
      }
      return p.join(' ');
    },

    _wptsV(xb,amp,per,H,steps){
      // Высота: 3H (от -H до 2H) — для вертикального скролла вдоль края
      const p=[];
      for(let i=0;i<=steps;i++){
        const y = -H + H*3*i/steps;
        const phase = (y+H)/H * per;
        const x = xb + amp*Math.sin(phase*Math.PI*2);
        p.push(x.toFixed(2)+','+y.toFixed(2));
      }
      return p.join(' ');
    },

    _layer(w,h,yb,amp,per,topEdge,hDur,vDur,dy,col,opF,opS,sw,doAnim){
      const S=160; // много шагов = плавная волна
      const pts=this._wpts(yb,amp,per,w,S);
      const isTop=(topEdge===0);
      // fill: от края (top или bottom) до волны
      const fill = isTop
        ? `M${-w},${-h} ${-w},${topEdge} ${pts} ${w*2},${topEdge} ${w*2},${-h} Z`
        : `M${-w},${h*2} ${-w},${topEdge} ${pts} ${w*2},${topEdge} ${w*2},${h*2} Z`;

      if(!doAnim){
        return `<path d="${fill}" fill="${col}" opacity="${opF}"/>`;
      }
      const hAn=`<animateTransform attributeName="transform" type="translate" values="0,0;${-w},0" dur="${hDur}s" begin="0s" repeatCount="indefinite" calcMode="linear"/>`;
      const vAn=`<animateTransform attributeName="transform" type="translate" additive="sum" values="0,0;0,${dy};0,0" dur="${vDur}s" begin="0s" repeatCount="indefinite" calcMode="spline" keySplines="0.4,0,0.6,1;0.4,0,0.6,1" keyTimes="0;0.5;1"/>`;
      return `<path d="${fill}" fill="${col}" opacity="${opF}">${hAn}${vAn}</path>`;
    },

    _layerV(w,h,xb,amp,per,sideEdge,vDur,hDur,dx,col,opF,opS,sw,doAnim){
      const S=160;
      const pts=this._wptsV(xb,amp,per,h,S);
      const isLeft=(sideEdge===0);
      const fill = isLeft
        ? `M${-w},${-h} ${sideEdge},${-h} ${pts} ${sideEdge},${h*2} ${-w},${h*2} Z`
        : `M${w*2},${-h} ${sideEdge},${-h} ${pts} ${sideEdge},${h*2} ${w*2},${h*2} Z`;

      if(!doAnim){
        return `<path d="${fill}" fill="${col}" opacity="${opF}"/>`;
      }
      // Скролл вдоль края (по Y) + пульсация вглубь слайда (по X)
      const vAn=`<animateTransform attributeName="transform" type="translate" values="0,0;0,${-h}" dur="${vDur}s" begin="0s" repeatCount="indefinite" calcMode="linear"/>`;
      const hAn=`<animateTransform attributeName="transform" type="translate" additive="sum" values="0,0;${dx},0;0,0" dur="${hDur}s" begin="0s" repeatCount="indefinite" calcMode="spline" keySplines="0.4,0,0.6,1;0.4,0,0.6,1" keyTimes="0;0.5;1"/>`;
      return `<path d="${fill}" fill="${col}" opacity="${opF}">${vAn}${hAn}</path>`;
    },

    _layerDefs(a1,a2){
      return [
        {yf:.10,af:.050,per:2,op_f:.26,op_s:.68,sw:1.9,col:a1,hd:12,vd:6.5,dy:18},
        {yf:.20,af:.042,per:2,op_f:.20,op_s:.50,sw:1.5,col:a2,hd:16,vd:8.2,dy:22},
        {yf:.30,af:.035,per:3,op_f:.14,op_s:.36,sw:1.2,col:a1,hd:21,vd:5.8,dy:16},
        {yf:.39,af:.028,per:2,op_f:.10,op_s:.27,sw:0.9,col:a2,hd:27,vd:9.4,dy:20},
        {yf:.47,af:.022,per:3,op_f:.07,op_s:.19,sw:0.7,col:a1,hd:34,vd:7.1,dy:14},
        {yf:.54,af:.017,per:2,op_f:.05,op_s:.13,sw:0.5,col:a2,hd:43,vd:11.0,dy:18},
        {yf:.60,af:.013,per:3,op_f:.03,op_s:.08,sw:0.4,col:a1,hd:55,vd:8.8,dy:12},
      ];
    },

    _glow(w,h,a1,cx,cy,r){
      const uid='lyg'+Math.random().toString(36).slice(2,7);
      return `<defs><radialGradient id="${uid}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0%" stop-color="${a1}" stop-opacity="0.11"/><stop offset="100%" stop-color="${a1}" stop-opacity="0"/></radialGradient></defs>`+
             `<rect width="${w}" height="${h}" fill="url(#${uid})"/>`;
    },

    _doAnim(doAnimate){
      return doAnimate !== false && !!(this.animated && (typeof _layoutAnimated === 'undefined' || _layoutAnimated));
    },

    titleSvg(w,h,a1,a2,doAnimate){
      let body=this._glow(w,h,a1,'80%','22%','50%');
      const anim=this._doAnim(doAnimate);
      this._layerDefs(a1,a2).forEach(lv=>{
        body+=this._layer(w,h,lv.yf*h,lv.af*h,lv.per,0,lv.hd,lv.vd,lv.dy,lv.col,lv.op_f,lv.op_s,lv.sw,anim);
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${body}</svg>`;
    },

    // Волны у верхнего и нижнего края.
    // Смещение к краю как раньше (~300px на h≈675) — на слайде гармония;
    // на миниатюре то же отношение h, чтобы волны были видны в превью.
    contentSvg(w,h,a1,a2,doAnimate){
      let body=this._glow(w,h,a1,'50%','50%','55%');
      const anim=this._doAnim(doAnimate);
      const push=h*(300/675);
      this._layerDefs(a1,a2).forEach(lv=>{
        const ampH=lv.af*h;
        body+=this._layer(w,h,lv.yf*h-push,ampH,lv.per,0,lv.hd,lv.vd,lv.dy,lv.col,lv.op_f,lv.op_s,lv.sw,anim);
        body+=this._layer(w,h,h*(1-lv.yf)+push,ampH,lv.per,h,Math.round(lv.hd*1.18),lv.vd*0.88,-lv.dy,lv.col,lv.op_f,lv.op_s,lv.sw,anim);
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${body}</svg>`;
    },

    // Как главный (title), но только снизу
    bottomSvg(w,h,a1,a2,doAnimate){
      let body=this._glow(w,h,a1,'20%','78%','50%');
      const anim=this._doAnim(doAnimate);
      this._layerDefs(a1,a2).forEach(lv=>{
        body+=this._layer(w,h,h*(1-lv.yf),lv.af*h,lv.per,h,lv.hd,lv.vd,-lv.dy,lv.col,lv.op_f,lv.op_s,lv.sw,anim);
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${body}</svg>`;
    },

    // Вертикальные волны по левому и правому краю (то же смещение к краю, что у content)
    sidesSvg(w,h,a1,a2,doAnimate){
      let body=this._glow(w,h,a1,'50%','50%','55%');
      const anim=this._doAnim(doAnimate);
      const push=w*(300/675);
      this._layerDefs(a1,a2).forEach(lv=>{
        const ampW=lv.af*w;
        body+=this._layerV(w,h,lv.yf*w-push,ampW,lv.per,0,lv.hd,lv.vd,lv.dy,lv.col,lv.op_f,lv.op_s,lv.sw,anim);
        body+=this._layerV(w,h,w*(1-lv.yf)+push,ampW,lv.per,w,Math.round(lv.hd*1.18),lv.vd*0.88,-lv.dy,lv.col,lv.op_f,lv.op_s,lv.sw,anim);
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${body}</svg>`;
    },

    variantSvg(w,h,a1,a2,style){
      const st=style||'title';
      const doAnim=this._doAnim(true);
      if(st==='bottom') return this.bottomSvg(w,h,a1,a2,doAnim);
      if(st==='sides') return this.sidesSvg(w,h,a1,a2,doAnim);
      if(st==='content') return this.contentSvg(w,h,a1,a2,doAnim);
      return this.titleSvg(w,h,a1,a2,doAnim);
    },
  tplVariants(isRu){ return _themeTplFor('Layers', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();
