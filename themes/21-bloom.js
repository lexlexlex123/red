/** 21 — Bloom */
(function(){
window._THEME_21_BLOOM = {
name:'Цветы', nameEn:'Bloom',
    desc:'Лепестки, ботанические узоры',descEn:'Petals, botanical patterns',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const rng=(s)=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      function petal(cx,cy,r,angle,col,op){const a=angle*Math.PI/180,ex=cx+Math.cos(a)*r*2,ey=cy+Math.sin(a)*r*2,c1x=cx+Math.cos(a-0.9)*r*1.4,c1y=cy+Math.sin(a-0.9)*r*1.4,c2x=cx+Math.cos(a+0.9)*r*1.4,c2y=cy+Math.sin(a+0.9)*r*1.4;return `<path d="M${cx.toFixed(1)},${cy.toFixed(1)} C${c1x.toFixed(1)},${c1y.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)} C${ex.toFixed(1)},${ey.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${cx.toFixed(1)},${cy.toFixed(1)} Z" fill="${col}" opacity="${op}"/>`;}
      function flower(cx,cy,r,c1,c2,op,n){let f='';for(let i=0;i<n;i++)f+=petal(cx,cy,r,i*(360/n),i%2===0?c1:c2,(+op*0.9).toFixed(2));f+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r*0.35).toFixed(1)}" fill="${c2}" opacity="${op}"/>`;return f;}
      let flowers='',petals='',anims='';
      if(isTitle){flowers+=flower(w*0.07,h*0.15,w*0.055,a1,a2,'0.18',6);flowers+=flower(w*0.93,h*0.12,w*0.045,a2,a1,'0.15',5);flowers+=flower(w*0.05,h*0.82,w*0.04,a2,a1,'0.13',7);flowers+=flower(w*0.95,h*0.80,w*0.05,a1,a2,'0.16',6);}else{flowers+=flower(w*0.04,h*0.15,w*0.045,a1,a2,'0.14',6);flowers+=flower(w*0.96,h*0.78,w*0.04,a2,a1,'0.12',5);}
      for(let i=0;i<(isTitle?20:12);i++){const px=rng(i*6)*w,py=rng(i*6+1)*h,pr=3+rng(i*6+2)*8,pa=rng(i*6+3)*360,col=i%2===0?a1:a2,op=(0.06+rng(i*6+4)*0.12).toFixed(2);if(doAnimate){const dur=(5+rng(i*6)*6).toFixed(1),delay=(rng(i*6+0.5)*4).toFixed(1),dx=((rng(i*6+1.5)-0.5)*80).toFixed(0);anims+=`<g opacity="${op}"><animateTransform attributeName="transform" type="translate" from="${px} -20" to="${+px+ +dx} ${h+20}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>${petal(0,0,pr,pa,col,1)}</g>`;}else petals+=petal(px,py,pr,pa,col,op);}
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${flowers}${doAnimate?anims:petals}</svg>`;
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  tplVariants(isRu){ return _themeTplFor('Bloom', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();
