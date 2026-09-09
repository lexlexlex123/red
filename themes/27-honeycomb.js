/** 27 — Honeycomb */
(function(){
window._THEME_27_HONEYCOMB = {
name:'Соты', nameEn:'Honeycomb',
    desc:'Переливающаяся сетка: волны прозрачности по соседям',descEn:'Shimmering hex grid: opacity ripples through neighbors',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const rng=s=>{let x=Math.sin(s*53.2+9.1)*43758.5;return x-Math.floor(x);};
      const f=n=>n.toFixed(1);
      const hexR=isTitle?26:20;
      const dx=hexR*1.732, dy=hexR*1.5;
      const cols=Math.ceil(w/dx)+3;
      const rows=Math.ceil(h/dy)+3;
      // Крупные соты (title) — 3 пика; мелкие (content) — 6
      const peakN=isTitle?3:5;
      const steps=doAnimate?56:1;
      const durSec=isTitle?22:18;
      const maxOp=0.3, stepOp=0.03; // шире радиус: ~10 колец до 0
      const minPeakSep=isTitle?8:6; // пики держат дистанцию (в гекс-шагах)
      const colMin=0, colMax=cols-2, rowMin=0, rowMax=rows-2;

      function hexD(hx,hy,r){
        let d='';
        for(let k=0;k<6;k++){
          const a=Math.PI/6+k*Math.PI/3;
          d+=(k?'L':'M')+f(hx+Math.cos(a)*r)+','+f(hy+Math.sin(a)*r);
        }
        return d+'Z';
      }
      function hexCenter(col,row){
        return {x:col*dx+(row%2?dx*0.5:0), y:row*dy};
      }
      function oddrToCube(col,row){
        const x=col-(row-(row&1))/2;
        const z=row;
        return {x, y:-x-z, z};
      }
      function cubeDist(a,b){
        return (Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.z-b.z))/2;
      }
      function hexNeighbors(col,row){
        // odd-r offset: чётные и нечётные ряды
        const even=(row&1)===0;
        const raw=even
          ?[[col+1,row],[col-1,row],[col,row-1],[col-1,row-1],[col,row+1],[col-1,row+1]]
          :[[col+1,row],[col-1,row],[col+1,row-1],[col,row-1],[col+1,row+1],[col,row+1]];
        return raw.filter(([c,r])=>c>=colMin&&c<=colMax&&r>=rowMin&&r<=rowMax);
      }
      function randCell(seed){
        return {
          col:colMin+Math.floor(rng(seed)*(colMax-colMin+1)),
          row:rowMin+Math.floor(rng(seed+17)*(rowMax-rowMin+1))
        };
      }
      function farEnough(col,row,others){
        const c=oddrToCube(col,row);
        for(let i=0;i<others.length;i++){
          if(cubeDist(c, oddrToCube(others[i].col, others[i].row))<minPeakSep) return false;
        }
        return true;
      }
      function randCellFar(seed,others){
        for(let t=0;t<48;t++){
          const c=randCell(seed+t*19);
          if(farEnough(c.col,c.row,others)) return c;
        }
        return randCell(seed);
      }
      function stepToward(col,row,tCol,tRow){
        if(col===tCol&&row===tRow) return {col,row};
        const ns=hexNeighbors(col,row);
        if(!ns.length) return {col,row};
        const target=oddrToCube(tCol,tRow);
        let best=ns[0], bestD=Infinity;
        for(let i=0;i<ns.length;i++){
          const d=cubeDist(oddrToCube(ns[i][0],ns[i][1]), target);
          const tie=rng(col*13+row*29+tCol*7+tRow*3+i)*0.01;
          if(d+tie<bestD){ bestD=d+tie; best=ns[i]; }
        }
        return {col:best[0], row:best[1]};
      }

      // Все пики вместе: старты/цели с разнесением, шаги только на соседа
      const peakPaths=[];
      const starts=[];
      const targets=[];
      for(let p=0;p<peakN;p++){
        const start=randCellFar(p*101+3, starts);
        starts.push(start);
        peakPaths.push([{col:start.col,row:start.row}]);
      }
      for(let p=0;p<peakN;p++){
        const others=starts.filter((_,i)=>i!==p).concat(targets);
        targets.push(randCellFar(p*101+50, others));
      }
      for(let s=1;s<steps;s++){
        for(let p=0;p<peakN;p++){
          let pos=peakPaths[p][s-1];
          let target=targets[p];
          const start=starts[p];
          const remaining=steps-s;
          const distHome=cubeDist(oddrToCube(pos.col,pos.row), oddrToCube(start.col,start.row));
          if(remaining<=distHome){
            target={col:start.col,row:start.row};
            targets[p]=target;
          }else if(pos.col===target.col&&pos.row===target.row){
            const others=[];
            for(let i=0;i<peakN;i++) if(i!==p) others.push(peakPaths[i][s-1]);
            target=randCellFar(p*101+80+s, others);
            targets[p]=target;
          }
          pos=stepToward(pos.col,pos.row,target.col,target.row);
          peakPaths[p].push({col:pos.col,row:pos.row});
        }
      }

      function opacityAt(col,row,stepIdx){
        const cell=oddrToCube(col,row);
        let op=0;
        for(let p=0;p<peakN;p++){
          const pk=peakPaths[p][Math.min(stepIdx, peakPaths[p].length-1)];
          const dist=cubeDist(cell, oddrToCube(pk.col, pk.row));
          // 0.3 → 0.27 → … → 0 (шаг 0.03, широкий радиус)
          op=Math.max(op, Math.max(0, maxOp-stepOp*dist));
        }
        return op;
      }

      const cells=[];
      for(let row=-1;row<rows;row++){
        for(let col=-1;col<cols;col++){
          const c=hexCenter(col,row);
          if(c.x<-hexR||c.y<-hexR||c.x>w+hexR||c.y>h+hexR) continue;
          const ops=[];
          for(let fi=0;fi<steps;fi++){
            ops.push(opacityAt(col,row, fi));
          }
          cells.push({x:c.x,y:c.y,ops});
        }
      }

      let hexSvg='';
      cells.forEach((cell,idx)=>{
        const colFill=idx%3===0?a1:(idx%3===1?a2:a1);
        const op0=cell.ops[0].toFixed(3);
        if(doAnimate && steps>1){
          // discrete: пик «перескакивает» только на соседа — без interpolate между кадрами
          const vals=cell.ops.map(o=>o.toFixed(3)).join(';');
          const keyTimes=cell.ops.map((_,i)=>(i/(cell.ops.length-1)).toFixed(4)).join(';');
          hexSvg+=`<path d="${hexD(cell.x,cell.y,hexR*0.92)}" fill="none" stroke="${colFill}" stroke-width="1.15" opacity="${op0}">
            <animate attributeName="opacity" values="${vals}" keyTimes="${keyTimes}" dur="${durSec}s" begin="0s" repeatCount="indefinite" calcMode="linear"/>
          </path>`;
        }else{
          hexSvg+=`<path d="${hexD(cell.x,cell.y,hexR*0.92)}" fill="none" stroke="${colFill}" stroke-width="1" opacity="${op0}"/>`;
        }
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${hexSvg}</svg>`;
    },
    titleSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,true,d!==false);},
    contentSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,false,d!==false);},
  tplVariants(isRu){ return _themeTplFor('Honeycomb', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();
