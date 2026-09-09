/** Slide transition defs (ported from js/07-transitions.js). */

export const TRANSITION_DEFS = [
  {
    id: 'none',
    nameRu: 'Нет',
    nameEn: 'None',
    descRu: 'Мгновенная смена слайда без анимации.',
    descEn: 'Instant slide change with no animation.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="8" y1="8" x2="16" y2="16"/></svg>',
  },
  {
    id: 'fade',
    nameRu: 'Затухание',
    nameEn: 'Fade',
    descRu: 'Плавное перекрёстное затухание: предыдущий слайд исчезает, новый проявляется.',
    descEn: 'Smooth crossfade: the current slide fades out as the next fades in.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="6" width="16" height="12" rx="2" opacity=".35"/><rect x="6" y="8" width="16" height="12" rx="2"/></svg>',
  },
  {
    id: 'slide',
    nameRu: 'Сдвиг',
    nameEn: 'Slide',
    descRu: 'Новый слайд выезжает сбоку и сменяет предыдущий.',
    descEn: 'The next slide enters from the side, replacing the current one.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="14" height="14" rx="2" opacity=".4"/><rect x="9" y="5" width="14" height="14" rx="2"/><path d="M10 12h8M15 9l3 3-3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'slideUp',
    nameRu: 'Сдвиг вверх',
    nameEn: 'Slide Up',
    descRu: 'Новый слайд поднимается снизу вверх.',
    descEn: 'The next slide rises from the bottom.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2" opacity=".4"/><rect x="5" y="3" width="14" height="10" rx="2"/><path d="M12 16V8M9 11l3-3 3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'zoom',
    nameRu: 'Приближение',
    nameEn: 'Zoom In',
    descRu: 'Новый слайд увеличивается из центра, как эффект приближения.',
    descEn: 'The next slide scales up from the center.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4" stroke-linecap="round"/><path d="M11 8v6M8 11h6" stroke-linecap="round"/></svg>',
  },
  {
    id: 'zoomOut',
    nameRu: 'Отдаление',
    nameEn: 'Zoom Out',
    descRu: 'Новый слайд появляется из увеличенного состояния и уменьшается до нормального размера.',
    descEn: 'The next slide appears enlarged and scales down to full size.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4" stroke-linecap="round"/><path d="M8 11h6" stroke-linecap="round"/></svg>',
  },
  {
    id: 'flip',
    nameRu: 'Переворот',
    nameEn: 'Flip',
    descRu: 'Перелистывание как в книге.',
    descEn: 'Book page turn.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16" stroke-dasharray="2 2"/><path d="M8 8c0 4 1.5 8 4 8s4-4 4-8" stroke-linecap="round"/><path d="M6 6l2 2M18 6l-2 2" stroke-linecap="round"/></svg>',
  },
  {
    id: 'flipV',
    nameRu: 'Переворот ↕',
    nameEn: 'Flip Vertical',
    descRu: 'Переворот страницы сверху вниз.',
    descEn: 'Vertical page turn.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16" stroke-dasharray="2 2"/><path d="M8 8c4 0 8 1.5 8 4s-4 4-8 4" stroke-linecap="round"/><path d="M6 6l2 2M6 18l2-2" stroke-linecap="round"/></svg>',
  },
  {
    id: 'cube',
    nameRu: 'Куб',
    nameEn: 'Cube',
    descRu: 'Поворот грани куба с 3D-перспективой.',
    descEn: 'A 3D cube face rotation with perspective.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4l7 4v8l-7 4-7-4V8z"/><path d="M12 4v16M5 8l7 4 7-4" opacity=".55"/></svg>',
  },
  {
    id: 'dissolve',
    nameRu: 'Растворение',
    nameEn: 'Dissolve',
    descRu: 'Пиксельное растворение — дискретное наложение одного слайда на другой.',
    descEn: 'Pixel dissolve — a stepped blend between slides.',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor" opacity=".85"><rect x="4" y="5" width="3" height="3" rx=".5" opacity=".35"/><rect x="9" y="5" width="3" height="3" rx=".5" opacity=".55"/><rect x="14" y="5" width="3" height="3" rx=".5"/><rect x="6" y="10" width="3" height="3" rx=".5" opacity=".55"/><rect x="11" y="10" width="3" height="3" rx=".5" opacity=".35"/><rect x="16" y="10" width="3" height="3" rx=".5" opacity=".75"/><rect x="4" y="15" width="3" height="3" rx=".5"/><rect x="9" y="15" width="3" height="3" rx=".5" opacity=".55"/><rect x="14" y="15" width="3" height="3" rx=".5" opacity=".35"/></svg>',
  },
  {
    id: 'morph',
    nameRu: 'Морфинг',
    nameEn: 'Morph',
    descRu: 'Объекты с одинаковым именем плавно перемещаются между слайдами.',
    descEn: 'Objects with the same name smoothly move between slides.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="8" width="7" height="7" rx="1.5"/><rect x="13" y="9" width="7" height="7" rx="3.5"/><path d="M11 11.5h2" stroke-linecap="round" stroke-dasharray="1.5 1.5"/></svg>',
  },
  {
    id: 'push',
    nameRu: 'Выталкивание',
    nameEn: 'Push',
    descRu: 'Новый слайд выталкивает предыдущий в сторону.',
    descEn: 'The next slide pushes the current slide aside.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="10" height="12" rx="2" opacity=".4"/><rect x="9" y="6" width="12" height="12" rx="2"/><path d="M13 12h5M17 9l3 3-3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'wipe',
    nameRu: 'Шторка',
    nameEn: 'Wipe',
    descRu: 'Новый слайд открывается шторкой поверх предыдущего.',
    descEn: 'The next slide wipes open over the current slide.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="5" width="16" height="14" rx="2" opacity=".35"/><path d="M4 5v14" stroke-width="2.5"/><path d="M8 12h10" stroke-linecap="round"/><path d="M16 9l3 3-3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'split',
    nameRu: 'Раскрытие',
    nameEn: 'Split',
    descRu: 'Слайд раскрывается из центра — верхняя и нижняя части расходятся.',
    descEn: 'The slide opens from the center — top and bottom halves split apart.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="6" rx="1.5"/><rect x="5" y="13" width="14" height="6" rx="1.5"/><path d="M8 12h8" stroke-linecap="round" stroke-dasharray="2 2"/></svg>',
  },
  {
    id: 'reveal',
    nameRu: 'Занавес',
    nameEn: 'Reveal',
    descRu: 'Новый слайд отодвигает предыдущий, как открывающийся занавес.',
    descEn: 'The next slide pushes the previous one away like a curtain.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h8v14H4z" opacity=".45"/><path d="M12 5h8v14H12z"/><path d="M12 5v14" stroke-width="2.5"/></svg>',
  },
  {
    id: 'glitch',
    nameRu: 'Глитч',
    nameEn: 'Glitch',
    descRu: 'Цифровые искажения: смещение кадра, вспышки и цветовые артефакты.',
    descEn: 'Digital glitch: frame shifts, flashes, and color artifacts.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h10M4 17h14" stroke-linecap="round"/><path d="M14 10l3-2M16 14l4 1" stroke-linecap="round" opacity=".7"/></svg>',
  },
];

export const TRANS_DUR_OPTIONS = [0, 250, 500, 750, 800, 1000, 1200, 1500, 2000];

export const TRANS_RIBBON_DURS = [
  { ms: 250, nameRu: 'Быстро', nameEn: 'Fast' },
  { ms: 500, nameRu: 'Нормально', nameEn: 'Normal' },
  { ms: 800, nameRu: 'Медленно', nameEn: 'Slow' },
  { ms: 1200, nameRu: 'Очень медленно', nameEn: 'Very slow' },
];

export function transitionDef(id) {
  return TRANSITION_DEFS.find((t) => t.id === id) || TRANSITION_DEFS[0];
}

export function effectiveTrans(slide, globalTrans) {
  const t = slide?.trans;
  if (t && t !== 'none') return t;
  if (t === 'none') return 'none';
  return globalTrans && globalTrans !== 'none' ? globalTrans : 'none';
}

export function effectiveTransDur(slide, globalDur = 500) {
  if (slide?.transDur != null && +slide.transDur > 0) return +slide.transDur;
  return +globalDur > 0 ? +globalDur : 500;
}

/** CSS class for enter animation (F5 / export / playback). */
export function enterClass(trans) {
  switch (trans) {
    case 'fade':
    case 'dissolve':
    case 'morph':
      return 'pv-enter-fade';
    case 'slide':
      return 'pv-enter-slide';
    case 'push':
      return 'pv-enter-push';
    case 'wipe':
      return 'pv-enter-wipe';
    case 'reveal':
      return 'pv-enter-reveal';
    case 'slideUp':
      return 'pv-enter-slide-up';
    case 'zoom':
      return 'pv-enter-zoom';
    case 'zoomOut':
      return 'pv-enter-zoom-out';
    case 'flip':
    case 'flipV':
      return 'pv-enter-flip';
    case 'cube':
      return 'pv-enter-cube';
    case 'glitch':
      return 'pv-enter-glitch';
    case 'split':
      return 'pv-enter-split';
    default:
      return '';
  }
}

/** Per-slide resolved transition for export/playback. */
export function deckTransData(slides, globalTrans, globalTransDur) {
  return (slides || []).map((s) => ({
    t: effectiveTrans(s, globalTrans),
    d: effectiveTransDur(s, globalTransDur),
  }));
}

export const PLAYBACK_TRANS_CSS = `
.pv-enter-fade{animation:pvFade var(--pv-dur,500ms) ease both}
.pv-enter-slide{animation:pvSlide var(--pv-dur,500ms) ease both}
.pv-enter-slide-up{animation:pvSlideUp var(--pv-dur,500ms) ease both}
.pv-enter-zoom{animation:pvZoom var(--pv-dur,500ms) ease both}
.pv-enter-zoom-out{animation:pvZoomOut var(--pv-dur,500ms) ease both}
.pv-enter-flip{animation:pvFlip var(--pv-dur,500ms) ease both;transform-style:preserve-3d}
.pv-enter-glitch{animation:pvGlitch var(--pv-dur,500ms) steps(2,end) both}
.pv-enter-split{animation:pvSplit var(--pv-dur,500ms) ease both}
.pv-enter-push{animation:pvPush var(--pv-dur,500ms) ease both}
.pv-enter-wipe{animation:pvWipe var(--pv-dur,500ms) ease both}
.pv-enter-reveal{animation:pvReveal var(--pv-dur,500ms) ease both}
.pv-enter-cube{animation:pvCube var(--pv-dur,500ms) ease both;transform-style:preserve-3d}
@keyframes pvFade{from{opacity:0}to{opacity:1}}
@keyframes pvSlide{from{opacity:.4;transform:translateX(8%)}to{opacity:1;transform:none}}
@keyframes pvSlideUp{from{opacity:.4;transform:translateY(10%)}to{opacity:1;transform:none}}
@keyframes pvZoom{from{opacity:.3;transform:scale(.86)}to{opacity:1;transform:none}}
@keyframes pvZoomOut{from{opacity:.3;transform:scale(1.14)}to{opacity:1;transform:none}}
@keyframes pvFlip{from{opacity:.5;transform:perspective(1200px) rotateY(-55deg)}to{opacity:1;transform:none}}
@keyframes pvGlitch{0%{transform:translate(0,0);filter:none}25%{transform:translate(-6px,2px);filter:hue-rotate(90deg)}50%{transform:translate(5px,-2px);filter:hue-rotate(-40deg)}100%{transform:none;filter:none}}
@keyframes pvSplit{from{opacity:0;transform:scaleY(0)}to{opacity:1;transform:scaleY(1)}}
@keyframes pvPush{from{opacity:.4;transform:translateX(10%)}to{opacity:1;transform:none}}
@keyframes pvWipe{from{opacity:0;clip-path:polygon(0 0,0 0,0 100%,0 100%)}to{opacity:1;clip-path:polygon(0 0,100% 0,100% 100%,0 100%)}}
@keyframes pvReveal{from{opacity:.4;transform:translateX(-10%)}to{opacity:1;transform:none}}
@keyframes pvCube{from{opacity:.5;transform:perspective(1000px) rotateX(-45deg)}to{opacity:1;transform:none}}
`.replace(/\n/g, '');

