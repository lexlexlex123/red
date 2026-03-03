// ══════════════ ANIMATION PANEL ══════════════
const ANIM_CSS={
  fadeIn:'el-fadein',slideUp:'el-slideup',slideDown:'el-slidedown',slideLeft:'el-slideleft',slideRight:'el-slideright',
  zoomIn:'el-zoomin',spinIn:'el-spin',bounceIn:'el-bounce',
  fadeOut:'el-fadeout',slideOut:'el-slideout',zoomOut:'el-zoomout',
  pulse:'el-pulse',shake:'el-shake',flash:'el-flash',
};
const ANIM_INFO={
  fadeIn:{label:'Fade In',cat:'entrance',icon:'▶'},slideUp:{label:'Slide Up',cat:'entrance',icon:'▲'},
  slideDown:{label:'Slide Down',cat:'entrance',icon:'▼'},slideLeft:{label:'Slide Left',cat:'entrance',icon:'◀'},
  slideRight:{label:'Slide Right',cat:'entrance',icon:'▶'},zoomIn:{label:'Zoom In',cat:'entrance',icon:'⊕'},
  spinIn:{label:'Spin In',cat:'entrance',icon:'↻'},bounceIn:{label:'Bounce',cat:'entrance',icon:'◉'},
  fadeOut:{label:'Fade Out',cat:'exit',icon:'◀'},slideOut:{label:'Slide Out',cat:'exit',icon:'↓'},
  zoomOut:{label:'Zoom Out',cat:'exit',icon:'⊖'},
  pulse:{label:'Pulse',cat:'emphasis',icon:'●'},shake:{label:'Shake',cat:'emphasis',icon:'~'},flash:{label:'Flash',cat:'emphasis',icon:'✦'},
};
function openAnimPanel(){
  document.getElementById('anim-panel').classList.add('open');
  renderAnimPanel();
}
function closeAnimPanel(){document.getElementById('anim-panel').classList.remove('open');}
function setElTrigger(val){
  if(!sel)return;
  if(val)sel.dataset.isTrigger='true';else delete sel.dataset.isTrigger;
  save();renderAnimPanel();saveState();
  toast(val?'Object is now a trigger — click on it to fire anims':'Trigger removed — click anywhere fires anims','ok');
}
function renderAnimPanel(){
  const container=document.getElementById('anim-slide-list');
  const empty=document.getElementById('anim-empty');
  const s=slides[cur];if(!s){empty&&(empty.style.display='block');return;}
  // Gather all animations from all elements on this slide, in order
  const allAnims=[];
  (s.els||[]).forEach((d,ei)=>{
    (d.anims||[]).forEach((a,ai)=>{
      allAnims.push({elIdx:ei,animIdx:ai,d,a,elId:d.id});
    });
  });
  // Sort by delay
  allAnims.sort((x,y)=>(x.a.delay||0)-(y.a.delay||0));
  container.innerHTML='';
  // "Add to selected" section
  if(sel){
    const hdr=document.createElement('div');hdr.className='anim-slide-label';hdr.textContent='Add to: '+getElLabel(sel);
    // Trigger object toggle
    const trigRow=document.createElement('div');
    const isTrig=sel.dataset.isTrigger==='true';
    trigRow.style.cssText='display:flex;align-items:center;gap:8px;padding:5px 0 8px;border-bottom:1px solid var(--border);margin-bottom:8px;';
    trigRow.innerHTML=`<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11px;color:${isTrig?'var(--accent)':'var(--text2)'}"><input type="checkbox" ${isTrig?'checked':''} style="accent-color:var(--accent)" onchange="setElTrigger(this.checked)"> 🎯 Object is Trigger</label><span style="font-size:9px;color:var(--text3)">${isTrig?'Click only on this object':'Click anywhere fires anims'}</span>`;
    const row=document.createElement('div');row.className='anim-add-row';
    const groups=[
      {cat:'entrance',names:['fadeIn','slideUp','zoomIn','bounceIn','spinIn','slideRight']},
      {cat:'exit',names:['fadeOut','slideOut','zoomOut']},
      {cat:'emphasis',names:['pulse','shake','flash']},
    ];
    groups.forEach(g=>{
      g.names.forEach(n=>{
        const btn=document.createElement('button');btn.className='anim-add-btn '+g.cat;
        btn.textContent=ANIM_INFO[n]?.label||n;
        btn.onclick=()=>addAnimToSel(n,g.cat);row.appendChild(btn);
      });
    });
    container.appendChild(hdr);container.appendChild(trigRow);container.appendChild(row);
    const divider=document.createElement('div');divider.className='anim-slide-label';divider.style.marginTop='8px';
    divider.textContent='Timeline ('+allAnims.length+' animations)';container.appendChild(divider);
  }else{
    const note=document.createElement('div');note.style.cssText='font-size:10px;color:var(--text3);margin-bottom:10px;';note.textContent='Select an element to add animations.';container.appendChild(note);
    const divider=document.createElement('div');divider.className='anim-slide-label';divider.textContent='Timeline ('+allAnims.length+' animations)';container.appendChild(divider);
  }
  if(allAnims.length===0){const n=document.createElement('div');n.style.cssText='font-size:10px;color:var(--text3);text-align:center;padding:12px 0;';n.textContent='No animations on this slide.';container.appendChild(n);return;}
  allAnims.forEach((entry,i)=>{
    const info=ANIM_INFO[entry.a.name]||{label:entry.a.name,cat:'entrance',icon:'▶'};
    const item=document.createElement('div');item.className='anim-entry';item.dataset.elidx=entry.elIdx;item.dataset.aidx=entry.animIdx;
    const hdr=document.createElement('div');hdr.className='anim-entry-hdr';
    const drag=document.createElement('span');drag.className='anim-drag';drag.textContent='⠿';drag.title='Drag to reorder';
    const num=document.createElement('div');num.className='anim-num';num.textContent=i+1;
    const catColor=info.cat==='entrance'?'#22c55e':info.cat==='exit'?'#ec4899':'#f59e0b';
    num.style.background=catColor;
    const ico=document.createElement('span');ico.className='anim-icon2';ico.textContent=info.icon;ico.style.color=catColor;
    const name=document.createElement('span');name.className='anim-name';name.textContent=info.label;
    const obj=document.createElement('span');obj.className='anim-obj';obj.textContent=getElLabel2(entry.d);
    const timing=document.createElement('span');timing.className='anim-timing';
    timing.textContent=formatTiming(entry.a);
    hdr.append(drag,num,ico,name,obj,timing);
    const body=document.createElement('div');body.className='anim-entry-body';
    body.innerHTML=`
      <div class="anim-row"><label>Delay (s)</label><input type="number" min="0" max="30" step="0.1" value="${entry.a.delay||0}" oninput="updateAnimEntry(${entry.elIdx},${entry.animIdx},'delay',+this.value)"></div>
      <div class="anim-row"><label>Duration (s)</label><input type="number" min="0.1" max="10" step="0.1" value="${entry.a.dur||0.5}" oninput="updateAnimEntry(${entry.elIdx},${entry.animIdx},'dur',+this.value)"></div>
      <div class="anim-row"><label>Effect</label><select onchange="updateAnimEntry(${entry.elIdx},${entry.animIdx},'name',this.value)">${Object.keys(ANIM_INFO).map(k=>`<option value="${k}"${entry.a.name===k?' selected':''}>${ANIM_INFO[k].label}</option>`).join('')}</select></div>
      <div class="anim-trigger-section">
        <div class="anim-trigger-label">Trigger</div>
        <div class="anim-row"><label>Type</label><select onchange="updateAnimEntry(${entry.elIdx},${entry.animIdx},'trigger',this.value)">
          <option value="auto"${(entry.a.trigger||'auto')==='auto'?' selected':''}>Auto (with prev)</option>
          <option value="click"${entry.a.trigger==='click'?' selected':''}>On click</option>
          <option value="afterPrev"${entry.a.trigger==='afterPrev'?' selected':''}>After previous</option>
          <option value="nav"${entry.a.trigger==='nav'?' selected':''}>Nav → slide then hide</option>
        </select></div>
        ${entry.a.trigger==='nav'?`<div class="anim-row"><label>Go to slide</label><select onchange="updateAnimEntry(${entry.elIdx},${entry.animIdx},'navTarget',+this.value)">${slides.map((ss,si)=>`<option value="${si}"${(entry.a.navTarget||0)===si?' selected':''}>${si+1}. ${ss.title}</option>`).join('')}</select></div>`:''}
      </div>
      <button class="anim-del-btn" onclick="deleteAnimEntry(${entry.elIdx},${entry.animIdx})">✕ Remove</button>
    `;
    hdr.onclick=(e)=>{if(e.target.classList.contains('anim-drag'))return;item.classList.toggle('open');};
    // Drag to reorder
    drag.draggable=true;
    drag.ondragstart=(e)=>{e.dataTransfer.setData('anim-from',JSON.stringify({ei:entry.elIdx,ai:entry.animIdx}));item.style.opacity='.4';};
    drag.ondragend=()=>{item.style.opacity='1';};
    item.ondragover=(e)=>{e.preventDefault();item.style.borderColor='var(--accent3)';};
    item.ondragleave=()=>{item.style.borderColor='';};
    item.ondrop=(e)=>{
      e.preventDefault();item.style.borderColor='';
      try{
        const from=JSON.parse(e.dataTransfer.getData('anim-from'));
        const toEi=+item.dataset.elidx,toAi=+item.dataset.aidx;
        reorderAnim(from.ei,from.ai,toEi,toAi);
      }catch(ex){}
    };
    item.append(hdr,body);container.appendChild(item);
  });
}
function getElLabel(el){if(!el)return '?';const t=el.dataset.type;if(t==='text')return 'Text';if(t==='shape')return 'Shape';if(t==='image')return 'Image';if(t==='svg')return 'SVG';if(t==='applet')return 'Applet';if(t==='code')return 'Code';if(t==='markdown')return 'Markdown';return '?';}
function getElLabel2(d){return d.type==='text'?'Text':d.type==='shape'?'Shape':d.type==='image'?'Image':d.type==='svg'?'SVG':d.type==='applet'?'Applet':d.type==='code'?'Code':d.type==='markdown'?'Markdown':'?';}
function formatTiming(a){return (a.delay||0)+'s · '+(a.dur||0.5)+'s';}
function addAnimToSel(name,cat){
  if(!sel)return toast('Select an element first');
  const anims=JSON.parse(sel.dataset.anims||'[]');
  anims.push({name,category:cat,delay:0,dur:0.5,trigger:'auto'});
  sel.dataset.anims=JSON.stringify(anims);
  save();renderAnimPanel();syncProps();saveState();
  toast('Animation "'+name+'" added','ok');
}
function updateAnimEntry(elIdx,animIdx,prop,val){
  if(!slides[cur]||!slides[cur].els[elIdx])return;
  const d=slides[cur].els[elIdx];const a=d.anims[animIdx];if(!a)return;
  a[prop]=val;
  if(prop==='name'){const info=ANIM_INFO[val];if(info)a.category=info.cat;}
  // Sync to DOM element
  const el=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
  if(el)el.dataset.anims=JSON.stringify(d.anims);
  save();renderAnimPanel();saveState();
}
function deleteAnimEntry(elIdx,animIdx){
  if(!slides[cur]||!slides[cur].els[elIdx])return;
  const d=slides[cur].els[elIdx];d.anims.splice(animIdx,1);
  const el=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
  if(el)el.dataset.anims=JSON.stringify(d.anims);
  save();renderAnimPanel();syncProps();saveState();
}
function reorderAnim(fromEi,fromAi,toEi,toAi){
  if(!slides[cur])return;
  const fromD=slides[cur].els[fromEi];const toD=slides[cur].els[toEi];if(!fromD||!toD)return;
  if(fromEi===toEi&&fromAi===toAi)return;
  pushUndo();
  const [anim]=fromD.anims.splice(fromAi,1);
  toD.anims.splice(toAi,0,anim);
  const el=document.getElementById('canvas').querySelector('[data-id="'+fromD.id+'"]');
  if(el)el.dataset.anims=JSON.stringify(fromD.anims);
  const el2=document.getElementById('canvas').querySelector('[data-id="'+toD.id+'"]');
  if(el2)el2.dataset.anims=JSON.stringify(toD.anims);
  save();renderAnimPanel();saveState();
}
function addAnim(name,category){
  if(!sel)return toast('Select an element first');
  addAnimToSel(name,category);
}
function removeAllAnims(){
  if(!sel)return;
  sel.dataset.anims='[]';save();renderAnimPanel();syncProps();saveState();
}
