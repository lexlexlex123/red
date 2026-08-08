// ══════════════ PERIODIC TABLE APPLET ══════════════
const PTE_CAT_LABEL={"alkali":"Щелочной металл","alkaline-earth":"Щёлочноземельный","transition":"Переходный металл","post-transition":"Постпереходный металл","metalloid":"Металлоид","nonmetal":"Неметалл","halogen":"Галоген","noble":"Инертный газ","lanthanide":"Лантаноид","actinide":"Актиноид"};
const PTE_CAT_COLOR={"alkali":"#ef4444","alkaline-earth":"#f97316","transition":"#3b82f6","post-transition":"#6366f1","metalloid":"#14b8a6","nonmetal":"#22c55e","halogen":"#a855f7","noble":"#06b6d4","lanthanide":"#ec4899","actinide":"#eab308"};
const PTE_ELEMENTS=[{"Z":1,"s":"H","ru":"Водород","en":"Hydrogen","m":1.008,"c":"nonmetal","g":1,"p":1,"d":"Г. Кавендиш","y":1766},{"Z":2,"s":"He","ru":"Гелий","en":"Helium","m":4.003,"c":"noble","g":18,"p":1,"d":"Я. Янссен / Н. Локьер","y":1868},{"Z":3,"s":"Li","ru":"Литий","en":"Lithium","m":6.94,"c":"alkali","g":1,"p":2,"d":"Й. Арфведсон","y":1817},{"Z":4,"s":"Be","ru":"Бериллий","en":"Beryllium","m":9.012,"c":"alkaline-earth","g":2,"p":2,"d":"Л. Воклен","y":1798},{"Z":5,"s":"B","ru":"Бор","en":"Boron","m":10.81,"c":"metalloid","g":13,"p":2,"d":"Ж. Гей-Люссак / Л. Тенар","y":1808},{"Z":6,"s":"C","ru":"Углерод","en":"Carbon","m":12.011,"c":"nonmetal","g":14,"p":2,"d":"известен с древности","y":null},{"Z":7,"s":"N","ru":"Азот","en":"Nitrogen","m":14.007,"c":"nonmetal","g":15,"p":2,"d":"Д. Резерфорд","y":1772},{"Z":8,"s":"O","ru":"Кислород","en":"Oxygen","m":15.999,"c":"nonmetal","g":16,"p":2,"d":"К. Шееле / Дж. Пристли","y":1774},{"Z":9,"s":"F","ru":"Фтор","en":"Fluorine","m":18.998,"c":"halogen","g":17,"p":2,"d":"А. Муассан","y":1886},{"Z":10,"s":"Ne","ru":"Неон","en":"Neon","m":20.18,"c":"noble","g":18,"p":2,"d":"У. Рамзай / М. Траверс","y":1898},{"Z":11,"s":"Na","ru":"Натрий","en":"Sodium","m":22.99,"c":"alkali","g":1,"p":3,"d":"Г. Дэви","y":1807},{"Z":12,"s":"Mg","ru":"Магний","en":"Magnesium","m":24.305,"c":"alkaline-earth","g":2,"p":3,"d":"Г. Дэви","y":1808},{"Z":13,"s":"Al","ru":"Алюминий","en":"Aluminium","m":26.982,"c":"post-transition","g":13,"p":3,"d":"Г. К. Эрстед","y":1825},{"Z":14,"s":"Si","ru":"Кремний","en":"Silicon","m":28.085,"c":"metalloid","g":14,"p":3,"d":"Й. Берцелиус","y":1824},{"Z":15,"s":"P","ru":"Фосфор","en":"Phosphorus","m":30.974,"c":"nonmetal","g":15,"p":3,"d":"Х. Бранд","y":1669},{"Z":16,"s":"S","ru":"Сера","en":"Sulfur","m":32.06,"c":"nonmetal","g":16,"p":3,"d":"известна с древности","y":null},{"Z":17,"s":"Cl","ru":"Хлор","en":"Chlorine","m":35.45,"c":"halogen","g":17,"p":3,"d":"К. Шееле","y":1774},{"Z":18,"s":"Ar","ru":"Аргон","en":"Argon","m":39.95,"c":"noble","g":18,"p":3,"d":"У. Рамзай / Дж. Рэлей","y":1894},{"Z":19,"s":"K","ru":"Калий","en":"Potassium","m":39.098,"c":"alkali","g":1,"p":4,"d":"Г. Дэви","y":1807},{"Z":20,"s":"Ca","ru":"Кальций","en":"Calcium","m":40.078,"c":"alkaline-earth","g":2,"p":4,"d":"Г. Дэви","y":1808},{"Z":21,"s":"Sc","ru":"Скандий","en":"Scandium","m":44.956,"c":"transition","g":3,"p":4,"d":"Л. Нильсон","y":1879},{"Z":22,"s":"Ti","ru":"Титан","en":"Titanium","m":47.867,"c":"transition","g":4,"p":4,"d":"У. Грегор","y":1791},{"Z":23,"s":"V","ru":"Ванадий","en":"Vanadium","m":50.942,"c":"transition","g":5,"p":4,"d":"А. М. дель Рио","y":1801},{"Z":24,"s":"Cr","ru":"Хром","en":"Chromium","m":51.996,"c":"transition","g":6,"p":4,"d":"Л. Воклен","y":1797},{"Z":25,"s":"Mn","ru":"Марганец","en":"Manganese","m":54.938,"c":"transition","g":7,"p":4,"d":"Ю. Ган","y":1774},{"Z":26,"s":"Fe","ru":"Железо","en":"Iron","m":55.845,"c":"transition","g":8,"p":4,"d":"известно с древности","y":null},{"Z":27,"s":"Co","ru":"Кобальт","en":"Cobalt","m":58.933,"c":"transition","g":9,"p":4,"d":"Г. Брандт","y":1735},{"Z":28,"s":"Ni","ru":"Никель","en":"Nickel","m":58.693,"c":"transition","g":10,"p":4,"d":"А. Кронстедт","y":1751},{"Z":29,"s":"Cu","ru":"Медь","en":"Copper","m":63.546,"c":"transition","g":11,"p":4,"d":"известна с древности","y":null},{"Z":30,"s":"Zn","ru":"Цинк","en":"Zinc","m":65.38,"c":"transition","g":12,"p":4,"d":"А. Маргграф","y":1746},{"Z":31,"s":"Ga","ru":"Галлий","en":"Gallium","m":69.723,"c":"post-transition","g":13,"p":4,"d":"П. Э. Лекок де Буабодран","y":1875},{"Z":32,"s":"Ge","ru":"Германий","en":"Germanium","m":72.63,"c":"metalloid","g":14,"p":4,"d":"К. Винклер","y":1886},{"Z":33,"s":"As","ru":"Мышьяк","en":"Arsenic","m":74.922,"c":"metalloid","g":15,"p":4,"d":"известен с древности","y":null},{"Z":34,"s":"Se","ru":"Селен","en":"Selenium","m":78.971,"c":"nonmetal","g":16,"p":4,"d":"Й. Берцелиус","y":1817},{"Z":35,"s":"Br","ru":"Бром","en":"Bromine","m":79.904,"c":"halogen","g":17,"p":4,"d":"А. Ж. Балар","y":1826},{"Z":36,"s":"Kr","ru":"Криптон","en":"Krypton","m":83.798,"c":"noble","g":18,"p":4,"d":"У. Рамзай / М. Траверс","y":1898},{"Z":37,"s":"Rb","ru":"Рубидий","en":"Rubidium","m":85.468,"c":"alkali","g":1,"p":5,"d":"Р. Бунзен / Г. Кирхгоф","y":1861},{"Z":38,"s":"Sr","ru":"Стронций","en":"Strontium","m":87.62,"c":"alkaline-earth","g":2,"p":5,"d":"Т. Хоуп","y":1790},{"Z":39,"s":"Y","ru":"Иттрий","en":"Yttrium","m":88.906,"c":"transition","g":3,"p":5,"d":"Й. Гадолин","y":1794},{"Z":40,"s":"Zr","ru":"Цирконий","en":"Zirconium","m":91.224,"c":"transition","g":4,"p":5,"d":"М. Клапрот","y":1789},{"Z":41,"s":"Nb","ru":"Ниобий","en":"Niobium","m":92.906,"c":"transition","g":5,"p":5,"d":"Ч. Хатчетт","y":1801},{"Z":42,"s":"Mo","ru":"Молибден","en":"Molybdenum","m":95.95,"c":"transition","g":6,"p":5,"d":"К. Шееле","y":1778},{"Z":43,"s":"Tc","ru":"Технеций","en":"Technetium","m":98,"c":"transition","g":7,"p":5,"d":"К. Перриер / Э. Сегре","y":1937},{"Z":44,"s":"Ru","ru":"Рутений","en":"Ruthenium","m":101.07,"c":"transition","g":8,"p":5,"d":"К. Клаус","y":1844},{"Z":45,"s":"Rh","ru":"Родий","en":"Rhodium","m":102.91,"c":"transition","g":9,"p":5,"d":"У. Волластон","y":1803},{"Z":46,"s":"Pd","ru":"Палладий","en":"Palladium","m":106.42,"c":"transition","g":10,"p":5,"d":"У. Волластон","y":1803},{"Z":47,"s":"Ag","ru":"Серебро","en":"Silver","m":107.87,"c":"transition","g":11,"p":5,"d":"известно с древности","y":null},{"Z":48,"s":"Cd","ru":"Кадмий","en":"Cadmium","m":112.41,"c":"transition","g":12,"p":5,"d":"Ф. Штромейер","y":1817},{"Z":49,"s":"In","ru":"Индий","en":"Indium","m":114.82,"c":"post-transition","g":13,"p":5,"d":"Ф. Райх / Т. Рихтер","y":1863},{"Z":50,"s":"Sn","ru":"Олово","en":"Tin","m":118.71,"c":"post-transition","g":14,"p":5,"d":"известно с древности","y":null},{"Z":51,"s":"Sb","ru":"Сурьма","en":"Antimony","m":121.76,"c":"metalloid","g":15,"p":5,"d":"известна с древности","y":null},{"Z":52,"s":"Te","ru":"Теллур","en":"Tellurium","m":127.6,"c":"metalloid","g":16,"p":5,"d":"Ф. Мюллер фон Райхенштейн","y":1782},{"Z":53,"s":"I","ru":"Иод","en":"Iodine","m":126.9,"c":"halogen","g":17,"p":5,"d":"Б. Куртуа","y":1811},{"Z":54,"s":"Xe","ru":"Ксенон","en":"Xenon","m":131.29,"c":"noble","g":18,"p":5,"d":"У. Рамзай / М. Траверс","y":1898},{"Z":55,"s":"Cs","ru":"Цезий","en":"Caesium","m":132.91,"c":"alkali","g":1,"p":6,"d":"Р. Бунзен / Г. Кирхгоф","y":1860},{"Z":56,"s":"Ba","ru":"Барий","en":"Barium","m":137.33,"c":"alkaline-earth","g":2,"p":6,"d":"Г. Дэви","y":1808},{"Z":57,"s":"La","ru":"Лантан","en":"Lanthanum","m":138.91,"c":"lanthanide","g":3,"p":6,"d":"К. Мосандер","y":1839},{"Z":58,"s":"Ce","ru":"Церий","en":"Cerium","m":140.12,"c":"lanthanide","g":null,"p":6,"d":"Й. Берцелиус / В. Хизингер","y":1803},{"Z":59,"s":"Pr","ru":"Празеодим","en":"Praseodymium","m":140.91,"c":"lanthanide","g":null,"p":6,"d":"К. Ауэр фон Вельсбах","y":1885},{"Z":60,"s":"Nd","ru":"Неодим","en":"Neodymium","m":144.24,"c":"lanthanide","g":null,"p":6,"d":"К. Ауэр фон Вельсбах","y":1885},{"Z":61,"s":"Pm","ru":"Прометий","en":"Promethium","m":145,"c":"lanthanide","g":null,"p":6,"d":"Дж. Марински / Л. Гленденин / Ч. Кориэлл","y":1945},{"Z":62,"s":"Sm","ru":"Самарий","en":"Samarium","m":150.36,"c":"lanthanide","g":null,"p":6,"d":"П. Э. Лекок де Буабодран","y":1879},{"Z":63,"s":"Eu","ru":"Европий","en":"Europium","m":151.96,"c":"lanthanide","g":null,"p":6,"d":"Э. Демарсе","y":1901},{"Z":64,"s":"Gd","ru":"Гадолиний","en":"Gadolinium","m":157.25,"c":"lanthanide","g":null,"p":6,"d":"Ж. Ш. де Мариньяк","y":1880},{"Z":65,"s":"Tb","ru":"Тербий","en":"Terbium","m":158.93,"c":"lanthanide","g":null,"p":6,"d":"К. Мосандер","y":1843},{"Z":66,"s":"Dy","ru":"Диспрозий","en":"Dysprosium","m":162.5,"c":"lanthanide","g":null,"p":6,"d":"П. Э. Лекок де Буабодран","y":1886},{"Z":67,"s":"Ho","ru":"Гольмий","en":"Holmium","m":164.93,"c":"lanthanide","g":null,"p":6,"d":"М. Делафонтен / Ж. Л. Соре","y":1878},{"Z":68,"s":"Er","ru":"Эрбий","en":"Erbium","m":167.26,"c":"lanthanide","g":null,"p":6,"d":"К. Мосандер","y":1843},{"Z":69,"s":"Tm","ru":"Тулий","en":"Thulium","m":168.93,"c":"lanthanide","g":null,"p":6,"d":"П. Т. Клеве","y":1879},{"Z":70,"s":"Yb","ru":"Иттербий","en":"Ytterbium","m":173.05,"c":"lanthanide","g":null,"p":6,"d":"Ж. Ш. де Мариньяк","y":1878},{"Z":71,"s":"Lu","ru":"Лютеций","en":"Lutetium","m":174.97,"c":"lanthanide","g":3,"p":6,"d":"Ж. Урбен / К. Ауэр фон Вельсбах","y":1907},{"Z":72,"s":"Hf","ru":"Гафний","en":"Hafnium","m":178.49,"c":"transition","g":4,"p":6,"d":"Д. Костер / Д. Хевеши","y":1923},{"Z":73,"s":"Ta","ru":"Тантал","en":"Tantalum","m":180.95,"c":"transition","g":5,"p":6,"d":"А. Экеберг","y":1802},{"Z":74,"s":"W","ru":"Вольфрам","en":"Tungsten","m":183.84,"c":"transition","g":6,"p":6,"d":"Х. и Ф. д’Эльгуйар","y":1783},{"Z":75,"s":"Re","ru":"Рений","en":"Rhenium","m":186.21,"c":"transition","g":7,"p":6,"d":"В. и И. Ноддак / О. Берг","y":1925},{"Z":76,"s":"Os","ru":"Осмий","en":"Osmium","m":190.23,"c":"transition","g":8,"p":6,"d":"С. Теннант","y":1803},{"Z":77,"s":"Ir","ru":"Иридий","en":"Iridium","m":192.22,"c":"transition","g":9,"p":6,"d":"С. Теннант","y":1803},{"Z":78,"s":"Pt","ru":"Платина","en":"Platinum","m":195.08,"c":"transition","g":10,"p":6,"d":"А. де Ульоа","y":1735},{"Z":79,"s":"Au","ru":"Золото","en":"Gold","m":196.97,"c":"transition","g":11,"p":6,"d":"известно с древности","y":null},{"Z":80,"s":"Hg","ru":"Ртуть","en":"Mercury","m":200.59,"c":"transition","g":12,"p":6,"d":"известна с древности","y":null},{"Z":81,"s":"Tl","ru":"Таллий","en":"Thallium","m":204.38,"c":"post-transition","g":13,"p":6,"d":"У. Крукс","y":1861},{"Z":82,"s":"Pb","ru":"Свинец","en":"Lead","m":207.2,"c":"post-transition","g":14,"p":6,"d":"известен с древности","y":null},{"Z":83,"s":"Bi","ru":"Висмут","en":"Bismuth","m":208.98,"c":"post-transition","g":15,"p":6,"d":"К. Жоффруа","y":1753},{"Z":84,"s":"Po","ru":"Полоний","en":"Polonium","m":209,"c":"post-transition","g":16,"p":6,"d":"М. Склодовская-Кюри / П. Кюри","y":1898},{"Z":85,"s":"At","ru":"Астат","en":"Astatine","m":210,"c":"halogen","g":17,"p":6,"d":"Д. Корсон / К. Маккензи / Э. Сегре","y":1940},{"Z":86,"s":"Rn","ru":"Радон","en":"Radon","m":222,"c":"noble","g":18,"p":6,"d":"Э. Дорн","y":1900},{"Z":87,"s":"Fr","ru":"Франций","en":"Francium","m":223,"c":"alkali","g":1,"p":7,"d":"М. Перей","y":1939},{"Z":88,"s":"Ra","ru":"Радий","en":"Radium","m":226,"c":"alkaline-earth","g":2,"p":7,"d":"М. Склодовская-Кюри / П. Кюри","y":1898},{"Z":89,"s":"Ac","ru":"Актиний","en":"Actinium","m":227,"c":"actinide","g":3,"p":7,"d":"А. Дебьерн","y":1899},{"Z":90,"s":"Th","ru":"Торий","en":"Thorium","m":232.04,"c":"actinide","g":null,"p":7,"d":"Й. Берцелиус","y":1828},{"Z":91,"s":"Pa","ru":"Протактиний","en":"Protactinium","m":231.04,"c":"actinide","g":null,"p":7,"d":"К. Фаянс / О. Гёринг","y":1913},{"Z":92,"s":"U","ru":"Уран","en":"Uranium","m":238.03,"c":"actinide","g":null,"p":7,"d":"М. Клапрот","y":1789},{"Z":93,"s":"Np","ru":"Нептуний","en":"Neptunium","m":237,"c":"actinide","g":null,"p":7,"d":"Э. Макмиллан / Ф. Эйблсон","y":1940},{"Z":94,"s":"Pu","ru":"Плутоний","en":"Plutonium","m":244,"c":"actinide","g":null,"p":7,"d":"Г. Сиборг и др.","y":1940},{"Z":95,"s":"Am","ru":"Америций","en":"Americium","m":243,"c":"actinide","g":null,"p":7,"d":"Г. Сиборг и др.","y":1944},{"Z":96,"s":"Cm","ru":"Кюрий","en":"Curium","m":247,"c":"actinide","g":null,"p":7,"d":"Г. Сиборг и др.","y":1944},{"Z":97,"s":"Bk","ru":"Берклий","en":"Berkelium","m":247,"c":"actinide","g":null,"p":7,"d":"Г. Сиборг и др.","y":1949},{"Z":98,"s":"Cf","ru":"Калифорний","en":"Californium","m":251,"c":"actinide","g":null,"p":7,"d":"Г. Сиборг и др.","y":1950},{"Z":99,"s":"Es","ru":"Эйнштейний","en":"Einsteinium","m":252,"c":"actinide","g":null,"p":7,"d":"А. Гиорсо и др.","y":1952},{"Z":100,"s":"Fm","ru":"Фермий","en":"Fermium","m":257,"c":"actinide","g":null,"p":7,"d":"А. Гиорсо и др.","y":1952},{"Z":101,"s":"Md","ru":"Менделевий","en":"Mendelevium","m":258,"c":"actinide","g":null,"p":7,"d":"А. Гиорсо и др.","y":1955},{"Z":102,"s":"No","ru":"Нобелий","en":"Nobelium","m":259,"c":"actinide","g":null,"p":7,"d":"А. Гиорсо и др. / ОИЯИ","y":1966},{"Z":103,"s":"Lr","ru":"Лоуренсий","en":"Lawrencium","m":266,"c":"actinide","g":3,"p":7,"d":"А. Гиорсо и др. / ОИЯИ","y":1961},{"Z":104,"s":"Rf","ru":"Резерфордий","en":"Rutherfordium","m":267,"c":"transition","g":4,"p":7,"d":"ОИЯИ / Беркли","y":1969},{"Z":105,"s":"Db","ru":"Дубний","en":"Dubnium","m":268,"c":"transition","g":5,"p":7,"d":"ОИЯИ / Беркли","y":1970},{"Z":106,"s":"Sg","ru":"Сиборгий","en":"Seaborgium","m":269,"c":"transition","g":6,"p":7,"d":"ОИЯИ / Беркли","y":1974},{"Z":107,"s":"Bh","ru":"Борий","en":"Bohrium","m":270,"c":"transition","g":7,"p":7,"d":"GSI (Дармштадт)","y":1981},{"Z":108,"s":"Hs","ru":"Хассий","en":"Hassium","m":269,"c":"transition","g":8,"p":7,"d":"GSI (Дармштадт)","y":1984},{"Z":109,"s":"Mt","ru":"Мейтнерий","en":"Meitnerium","m":278,"c":"transition","g":9,"p":7,"d":"GSI (Дармштадт)","y":1982},{"Z":110,"s":"Ds","ru":"Дармштадтий","en":"Darmstadtium","m":281,"c":"transition","g":10,"p":7,"d":"GSI (Дармштадт)","y":1994},{"Z":111,"s":"Rg","ru":"Рентгений","en":"Roentgenium","m":282,"c":"transition","g":11,"p":7,"d":"GSI (Дармштадт)","y":1994},{"Z":112,"s":"Cn","ru":"Коперниций","en":"Copernicium","m":285,"c":"transition","g":12,"p":7,"d":"GSI (Дармштадт)","y":1996},{"Z":113,"s":"Nh","ru":"Нихоний","en":"Nihonium","m":286,"c":"post-transition","g":13,"p":7,"d":"RIKEN (Япония)","y":2004},{"Z":114,"s":"Fl","ru":"Флеровий","en":"Flerovium","m":289,"c":"post-transition","g":14,"p":7,"d":"ОИЯИ (Дубна)","y":1999},{"Z":115,"s":"Mc","ru":"Московий","en":"Moscovium","m":290,"c":"post-transition","g":15,"p":7,"d":"ОИЯИ / LLNL","y":2003},{"Z":116,"s":"Lv","ru":"Ливерморий","en":"Livermorium","m":293,"c":"post-transition","g":16,"p":7,"d":"ОИЯИ / LLNL","y":2000},{"Z":117,"s":"Ts","ru":"Теннессин","en":"Tennessine","m":294,"c":"halogen","g":17,"p":7,"d":"ОИЯИ / ORNL / Vanderbilt","y":2010},{"Z":118,"s":"Og","ru":"Оганесон","en":"Oganesson","m":294,"c":"noble","g":18,"p":7,"d":"ОИЯИ / LLNL","y":2006}];

function _pteBySymbol(sym){
  if(!sym) return null;
  const s=String(sym).trim();
  return PTE_ELEMENTS.find(e=>e.s===s||e.s.toLowerCase()===s.toLowerCase())||null;
}
function _pteEsc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _pteHexRgba(hex,a){
  if(!hex||hex==='transparent'||hex==='none') return 'rgba(0,0,0,0)';
  const h=String(hex).replace('#','');
  if(h.length!==6) return hex;
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  const alpha=(a==null||isNaN(a))?1:Math.max(0,Math.min(1,+a));
  return 'rgba('+r+','+g+','+b+','+alpha+')';
}
function _pteDefaultBgScheme(theme){
  // Нейтральный фон схемы: светлый в светлой теме, тёмный в тёмной (col 7, row 7)
  return {col:7, row:7};
}
function _pteDefaultFgScheme(){
  return {col:7, row:0}; // контрастный текст: чёрный / белый
}
function _pteMixHex(hex, other, t){
  const h=String(hex||'').replace('#','');
  const o=String(other||'').replace('#','');
  if(h.length!==6||o.length!==6) return hex||other||'#888888';
  const mix=function(a,b){ return Math.max(0,Math.min(255,Math.round(a+(b-a)*t))); };
  const r=mix(parseInt(h.slice(0,2),16),parseInt(o.slice(0,2),16));
  const g=mix(parseInt(h.slice(2,4),16),parseInt(o.slice(2,4),16));
  const b=mix(parseInt(h.slice(4,6),16),parseInt(o.slice(4,6),16));
  return '#'+[r,g,b].map(function(x){ return x.toString(16).padStart(2,'0'); }).join('');
}
function _pteLuma(hex){
  const h=String(hex||'').replace('#','');
  if(h.length!==6) return 0;
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return (0.2126*r+0.7152*g+0.0722*b)/255;
}
function _pteResolveColors(d){
  const p=(typeof _appletTheme==='function')?_appletTheme():{dark:true,ac1:'#3b82f6',text:'#e2e8f0',head:'#ffffff'};
  const themeDark=p.dark!==false;
  let bg=d.genBg||'', fg=d.genColor||'';
  const theme=(typeof THEMES!=='undefined'&&typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)?THEMES[appliedThemeIdx]:null;
  if(!bg&&typeof _resolveSchemeColor==='function'&&theme){
    bg=_resolveSchemeColor(d.genBgScheme||_pteDefaultBgScheme(theme),theme)||'';
  }
  if(!bg) bg=themeDark?'#1e293b':'#f8fafc';
  // Светлость карточки — от её фона, не от темы редактора
  const isDark=_pteLuma(bg)<0.45;
  if(!fg&&typeof _resolveSchemeColor==='function'&&theme){
    fg=_resolveSchemeColor(d.genColorScheme||_pteDefaultFgScheme(),theme)||'';
  }
  if(!fg) fg=isDark?'#f8fafc':'#0f172a';
  // После смены схемы fg/bg могут совпасть — принудительный контраст
  if(isDark && _pteLuma(fg)<0.55) fg='#f8fafc';
  else if(!isDark && _pteLuma(fg)>0.45) fg='#0f172a';
  const accent=p.ac1||(isDark?'#818cf8':'#4f46e5');
  // Градиент только у дефолтного фона схемы (7,7); ручной/другой цвет — сплошной
  const s=d.genBgScheme;
  const useGrad=!!(s && +s.col===7 && +s.row===7);
  let bg88=bg, bg89=_pteMixHex(bg, isDark?'#000000':'#ffffff', isDark?0.42:0.62);
  // Если слоты 88/89 текущей темы той же светлости — берём их (как раньше визуально)
  if(useGrad&&typeof _resolveSchemeColor==='function'&&theme){
    const c88=_resolveSchemeColor({col:7,row:7},theme);
    const c89=_resolveSchemeColor({col:7,row:8},theme);
    if(c88&&c89&&((_pteLuma(c88)<0.45)===isDark)){
      bg88=c88;
      bg89=c89;
    }
  }
  return {bg,fg,isDark,accent,bg88,bg89,useGrad};
}


/** [валентность, плотность г/см³|null, тип решётки] по Z−1 */
const PTE_PROP=[['I',9e-05,'hex'],['0',0.00018,'fcc'],['I',0.534,'bcc'],['II',1.85,'hcp'],['III',2.34,'tet'],['II, IV',2.27,'hex'],['III, V',0.00125,'hex'],['II',0.00143,'cub'],['I',0.0017,'cub'],['0',0.0009,'fcc'],['I',0.97,'bcc'],['II',1.74,'hcp'],['III',2.7,'fcc'],['IV',2.33,'dia'],['III, V',1.82,'ort'],['II, IV, VI',2.07,'ort'],['I, III, V, VII',0.0032,'ort'],['0',0.0018,'fcc'],['I',0.86,'bcc'],['II',1.55,'fcc'],['III',2.99,'hcp'],['II, III, IV',4.51,'hcp'],['II, III, IV, V',6.11,'bcc'],['II, III, VI',7.19,'bcc'],['II, III, IV, VI, VII',7.47,'bcc'],['II, III',7.87,'bcc'],['II, III',8.86,'hcp'],['II',8.9,'fcc'],['I, II',8.96,'fcc'],['II',7.14,'hcp'],['III',5.91,'ort'],['II, IV',5.32,'dia'],['III, V',5.73,'hex'],['II, IV, VI',4.81,'hex'],['I, III, V',3.12,'ort'],['0',0.0037,'fcc'],['I',1.53,'bcc'],['II',2.64,'fcc'],['III',4.47,'hcp'],['IV',6.52,'hcp'],['III, V',8.57,'bcc'],['II, III, IV, VI',10.28,'bcc'],['IV, VII',11.5,'hcp'],['II, III, IV, VI, VIII',12.37,'hcp'],['I, II, III, IV',12.41,'fcc'],['II, IV',12.02,'fcc'],['I',10.49,'fcc'],['II',8.65,'hcp'],['III',7.31,'tet'],['II, IV',7.31,'tet'],['III, V',6.7,'hex'],['II, IV, VI',6.24,'hex'],['I, III, V, VII',4.93,'ort'],['0, II, IV, VI, VIII',0.0059,'fcc'],['I',1.93,'bcc'],['II',3.62,'bcc'],['III',6.15,'hex'],['III, IV',6.77,'fcc'],['III, IV',6.77,'hex'],['III',7.01,'hex'],['III',7.26,'hex'],['II, III',7.52,'hex'],['II, III',5.24,'bcc'],['III',7.9,'hcp'],['III, IV',8.23,'hcp'],['III',8.55,'hcp'],['III',8.8,'hcp'],['III',9.07,'hcp'],['III',9.32,'hcp'],['II, III',6.9,'fcc'],['III',9.84,'hcp'],['IV',13.31,'hcp'],['V',16.65,'bcc'],['II, III, IV, V, VI',19.25,'bcc'],['II, IV, VI, VII',21.02,'hcp'],['II, III, IV, VI, VIII',22.59,'hcp'],['II, III, IV, VI',22.56,'fcc'],['II, IV',21.45,'fcc'],['I, III',19.32,'fcc'],['I, II',13.53,'hex'],['I, III',11.85,'hcp'],['II, IV',11.34,'fcc'],['III, V',9.78,'hex'],['II, IV',9.2,'cub'],['I, III, V',null,'unk'],['0',0.0097,'fcc'],['I',null,'bcc'],['II',5.5,'bcc'],['III',10.07,'fcc'],['IV',11.72,'fcc'],['IV, V',15.37,'tet'],['III, IV, V, VI',19.05,'ort'],['III, IV, V, VI',20.45,'ort'],['III, IV, V, VI',19.86,'mon'],['III, IV, V, VI',13.67,'hex'],['III, IV',13.51,'hcp'],['III, IV',14.78,'hex'],['III, IV',15.1,'hex'],['III',null,'unk'],['III',null,'unk'],['II, III',null,'unk'],['II, III',null,'unk'],['III',null,'unk'],['IV',null,'unk'],['V',null,'unk'],['VI',null,'unk'],['VII',null,'unk'],['VIII',null,'unk'],['',null,'unk'],['',null,'unk'],['',null,'unk'],['',null,'unk'],['',null,'unk'],['',null,'unk'],['',null,'unk'],['',null,'unk'],['',null,'unk'],['0',null,'unk']];
const PTE_XT_LABEL={bcc:'ОЦК (объёмно-центрированная)',fcc:'ГЦК (гранецентрированная)',hcp:'ГПУ (гекс. плотнейшая)',dia:'Алмазная',hex:'Гексагональная',tet:'Тетрагональная',ort:'Ромбическая',mon:'Моноклинная',cub:'Кубическая',unk:'Не установлена'};
function _pteProps(el){
  const row=(el&&el.Z>=1&&el.Z<=118)?PTE_PROP[el.Z-1]:null;
  if(!row) return {v:'',den:null,xt:'unk'};
  return {v:row[0]||'',den:row[1],xt:row[2]||'unk'};
}
function _pteFmtDensity(den){
  if(den==null||den===''||(typeof den==='number'&&isNaN(den))) return '—';
  const n=+den;
  if(n<0.01){
    const exp=n.toExponential(1); // e.g. 9.0e-5
    return exp.replace(/e([+-]?)(\d+)/i,function(_,s,d){ return '×10'+(s==='-'?'⁻':'⁺')+d; })+' г/см³';
  }
  if(n<1) return n.toFixed(3)+' г/см³';
  if(n<10) return n.toFixed(2)+' г/см³';
  return n.toFixed(1)+' г/см³';
}
/** Точки решётки в единичном кубе [0..1]³. */
function _pteLatticePoints(xt){
  const C=[[0,0,0],[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1],[1,1,1]];
  if(xt==='bcc') return C.concat([[0.5,0.5,0.5]]);
  if(xt==='fcc') return C.concat([[0.5,0.5,0],[0.5,0,0.5],[0,0.5,0.5],[0.5,0.5,1],[0.5,1,0.5],[1,0.5,0.5]]);
  if(xt==='dia') return [[0,0,0],[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1],[1,1,1],
    [0.25,0.25,0.25],[0.75,0.75,0.25],[0.75,0.25,0.75],[0.25,0.75,0.75]];
  if(xt==='hcp') return [
    [0.15,0.2,0.15],[0.85,0.2,0.15],[0.5,0.2,0.85],
    [0.15,0.55,0.5],[0.85,0.55,0.5],
    [0.15,0.9,0.15],[0.85,0.9,0.15],[0.5,0.9,0.85]
  ];
  if(xt==='hex') return [
    [0.25,0.2,0.2],[0.75,0.2,0.2],[0.9,0.2,0.5],[0.75,0.2,0.8],[0.25,0.2,0.8],[0.1,0.2,0.5],
    [0.25,0.8,0.2],[0.75,0.8,0.2],[0.9,0.8,0.5],[0.75,0.8,0.8],[0.25,0.8,0.8],[0.1,0.8,0.5]
  ];
  if(xt==='tet'||xt==='ort'||xt==='mon'||xt==='cub') return C;
  if(xt==='unk') return [];
  return C;
}
/** Пары точек (в [0..1]³) — рёбра каркаса. */
function _pteLatticeEdgePairs(xt){
  const C=[[0,0,0],[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1],[1,1,1]];
  const cube=[[0,1],[0,2],[0,3],[1,4],[1,5],[2,4],[2,6],[3,5],[3,6],[4,7],[5,7],[6,7]]
    .map(function(ij){ return [C[ij[0]],C[ij[1]]]; });
  if(xt==='bcc'){
    const mid=[0.5,0.5,0.5];
    return cube.concat(C.map(function(c){ return [c,mid]; }));
  }
  if(xt==='fcc'||xt==='cub'||xt==='tet'||xt==='ort'||xt==='mon') return cube;
  if(xt==='dia'){
    // куб + тетраэдрические связи к внутренним узлам
    const t=[[0.25,0.25,0.25],[0.75,0.75,0.25],[0.75,0.25,0.75],[0.25,0.75,0.75]];
    const bonds=[
      [C[0],t[0]],[C[4],t[1]],[C[5],t[2]],[C[6],t[3]],
      [t[0],t[1]],[t[0],t[2]],[t[0],t[3]],[t[1],t[2]],[t[1],t[3]],[t[2],t[3]]
    ];
    return cube.concat(bonds);
  }
  if(xt==='hcp'){
    const p=_pteLatticePoints('hcp');
    // нижний треугольник, верхний, средние связи, вертикали
    return [
      [p[0],p[1]],[p[1],p[2]],[p[2],p[0]],
      [p[5],p[6]],[p[6],p[7]],[p[7],p[5]],
      [p[0],p[3]],[p[1],p[4]],[p[2],p[3]],[p[2],p[4]],
      [p[3],p[5]],[p[4],p[6]],[p[3],p[7]],[p[4],p[7]],
      [p[0],p[5]],[p[1],p[6]],[p[2],p[7]]
    ];
  }
  if(xt==='hex'){
    const p=_pteLatticePoints('hex');
    const e=[];
    for(let i=0;i<6;i++){ e.push([p[i],p[(i+1)%6]]); e.push([p[6+i],p[6+(i+1)%6]]); e.push([p[i],p[6+i]]); }
    return e;
  }
  return cube;
}
function _pteBondHTML(a,b){
  const dx=b[0]-a[0], dy=b[1]-a[1], dz=b[2]-a[2];
  const len=Math.sqrt(dx*dx+dy*dy+dz*dz);
  if(len<0.5) return '';
  const mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2, mz=(a[2]+b[2])/2;
  const ry=-Math.atan2(dz,dx)*180/Math.PI;
  const rz=Math.atan2(dy,Math.sqrt(dx*dx+dz*dz))*180/Math.PI;
  return '<b class="bond" style="width:'+len.toFixed(1)+'px;margin-left:'+(-len/2).toFixed(1)+'px;'
    +'transform:translate3d('+mx.toFixed(1)+'px,'+my.toFixed(1)+'px,'+mz.toFixed(1)+'px) '
    +'rotateY('+ry.toFixed(2)+'deg) rotateZ('+rz.toFixed(2)+'deg)"></b>';
}
function _pteShadeHex(hex,t){
  const h=String(hex||'').replace('#','');
  if(h.length!==6) return hex||'#888';
  const mix=function(c){ return Math.max(0,Math.min(255,Math.round(c*(1-t)))); };
  const r=mix(parseInt(h.slice(0,2),16)), g=mix(parseInt(h.slice(2,4),16)), b=mix(parseInt(h.slice(4,6),16));
  return '#'+[r,g,b].map(function(x){ return x.toString(16).padStart(2,'0'); }).join('');
}
function _pteLatticeHTML(xt, accent, fg){
  const pts=_pteLatticePoints(xt);
  if(!pts.length){
    return '<div class="lat-wrap"><div class="lat-empty">решётка неизвестна</div></div>';
  }
  const HALF=50;
  const to3=function(p){ return [(p[0]-0.5)*2*HALF,(p[1]-0.5)*2*HALF,(p[2]-0.5)*2*HALF]; };
  const edges=_pteLatticeEdgePairs(xt).map(function(pair){
    return _pteBondHTML(to3(pair[0]), to3(pair[1]));
  }).join('');
  // atom-pos крутится с решёткой; atom-ball контр-вращается → всегда «лицом» к камере (объёмный шар)
  const atoms=pts.map(function(p){
    const q=to3(p);
    return '<span class="atom-pos" style="transform:translate3d('+q[0].toFixed(1)+'px,'+q[1].toFixed(1)+'px,'+q[2].toFixed(1)+'px)">'
      +'<i class="atom-ball"></i></span>';
  }).join('');
  return '<div class="lat-wrap"><div class="lat-stage"><div class="lat-spin">'+edges+atoms+'</div></div></div>';
}

function getPeriodicHTML(palette,cfg){
  cfg=cfg||{};
  const el=_pteBySymbol(cfg.pteSymbol)||_pteBySymbol('Fe');
  const isIcon=!!cfg.pteIcon;
  const colors=_pteResolveColors(cfg);
  const op=cfg.genBgOp!=null?+cfg.genBgOp:0.92;
  const blur=cfg.genBgBlur!=null?+cfg.genBgBlur:0;
  const catLabel=PTE_CAT_LABEL[el.c]||el.c;
  const catCol=PTE_CAT_COLOR[el.c]||colors.accent;
  const mass=(typeof el.m==='number')?(Number.isInteger(el.m)?String(el.m):el.m.toFixed(el.m<10?3:2)):String(el.m);
  const group=el.g!=null?el.g:'—';
  const prop=_pteProps(el);
  const densTxt=_pteFmtDensity(prop.den);
  const valTxt=prop.v?prop.v:'—';
  const histLine=isIcon?'':(el.y!=null?('Открыл: '+el.d+' · '+el.y):('Известен: '+el.d));
  const bgCss=colors.useGrad
    ? ('linear-gradient(135deg,'+_pteHexRgba(colors.bg88,op)+' 0%,'+_pteHexRgba(colors.bg89,op)+' 50%,'+_pteHexRgba(colors.bg88,op)+' 100%)')
    : _pteHexRgba(colors.bg,op);
  const accent=colors.accent;
  const accentMid=_pteShadeHex(accent,0.25);
  const accentDark=_pteShadeHex(accent,0.55);
  const fg=colors.fg;
  const shadow=colors.isDark
    ? '0 6px 20px rgba(0,0,0,.4)'
    : '0 6px 18px rgba(15,23,42,.16)';
  const blurCss=blur>0?('backdrop-filter:blur('+blur+'px);-webkit-backdrop-filter:blur('+blur+'px);'):'';
  const symSize=isIcon?56:56;
  const nameSize=isIcon?17:18;
  const pad=isIcon?'12px 14px 12px 20px':'12px 14px 10px 20px';
  const justify=isIcon?'center':'flex-start';
  const lattice=isIcon?'':_pteLatticeHTML(prop.xt,accent,fg);
  const propsBlock=isIcon?'':(
    '<div class="props">'
    +'<div class="prop"><span class="pl">Валентность</span><span class="pv">'+_pteEsc(valTxt)+'</span></div>'
    +'<div class="prop"><span class="pl">Плотность</span><span class="pv">'+_pteEsc(densTxt)+'</span></div>'
    +'</div>'
  );
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'
    +'*{box-sizing:border-box;margin:0;padding:0}'
    +'html,body{width:100%;height:100%;overflow:hidden;background:transparent;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;'
    +'display:flex;align-items:center;justify-content:center}'
    +'.wrap{width:calc(100% - 40px);height:calc(100% - 40px);border-radius:14px;box-shadow:'+shadow+'}'
    +'.card{width:100%;height:100%;padding:'+pad+';display:flex;flex-direction:column;justify-content:'+justify+';gap:6px;'
    +'background:'+bgCss+';'+blurCss+'color:'+fg+';border-radius:14px;border:none;'
    +'position:relative;overflow:hidden}'
    +'.card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:10px;background:'+catCol+'}'
    +'.top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}'
    +'.z{font-size:14px;font-weight:700;opacity:.7;color:'+fg+'}'
    +'.mass{font-size:12px;opacity:.6;font-variant-numeric:tabular-nums;color:'+fg+'}'
    +'.sym{font-size:'+symSize+'px;font-weight:800;line-height:1;letter-spacing:-.03em;margin:2px 0 0;color:'+accent+';text-shadow:0 2px 14px '+accent+'33}'
    +'.name{font-size:'+nameSize+'px;font-weight:700;line-height:1.15;color:'+fg+'}'
    +'.en{font-size:11px;opacity:.55;margin-top:1px;color:'+fg+'}'
    +'.meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}'
    +'.chip{font-size:10px;padding:2px 7px;border-radius:999px;background:'+catCol+'22;border:1px solid '+catCol+'55;color:'+fg+'}'
    +'.props{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}'
    +'.prop{background:'+fg+'0d;border:1px solid '+fg+'18;border-radius:8px;padding:5px 8px}'
    +'.pl{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.04em;opacity:.55;margin-bottom:2px}'
    +'.pv{font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.2}'
    +'.lat-wrap{margin-top:8px;display:flex;align-items:center;justify-content:center;min-height:148px}'
    +'.lat-stage{width:148px;height:148px;perspective:320px;flex-shrink:0}'
    +'.lat-spin{width:148px;height:148px;position:relative;transform-style:preserve-3d;'
    +'animation:pteSpin 10s linear infinite}'
    +'@keyframes pteSpin{from{transform:rotateX(-24deg) rotateY(0deg)}to{transform:rotateX(-24deg) rotateY(360deg)}}'
    +'@keyframes pteFace{from{transform:rotateY(0deg) rotateX(24deg)}to{transform:rotateY(-360deg) rotateX(24deg)}}'
    +'.atom-pos{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d}'
    +'.atom-ball{position:absolute;left:-11px;top:-11px;width:22px;height:22px;border-radius:50%;'
    +'animation:pteFace 10s linear infinite;'
    +'background:'
    +'radial-gradient(circle at 30% 26%,#ffffff 0%,rgba(255,255,255,.75) 8%,rgba(255,255,255,.2) 22%,transparent 40%),'
    +'radial-gradient(circle at 50% 46%,'+accent+' 0%,'+accentMid+' 42%,'+accentDark+' 78%,#0a0a0a 100%);'
    +'box-shadow:inset -5px -6px 12px rgba(0,0,0,.55),inset 3px 3px 7px rgba(255,255,255,.4),'
    +'1px 4px 10px rgba(0,0,0,.45);'
    +'transform-style:preserve-3d}'
    +'.bond{position:absolute;left:50%;top:50%;height:2.5px;margin-top:-1.25px;border-radius:2px;'
    +'background:linear-gradient(90deg,'+fg+'22,'+fg+'66,'+fg+'22);'
    +'box-shadow:0 0 2px '+fg+'33;transform-style:preserve-3d;transform-origin:center center}'
    +'.lat-empty{width:148px;height:148px;display:flex;align-items:center;justify-content:center;font-size:12px;opacity:.45;text-align:center}'
    +'.hist{margin-top:auto;padding-top:8px;font-size:10px;line-height:1.35;opacity:.72;border-top:1px solid '+fg+'22;color:'+fg+'}'
    +'</style></head><body><div class="wrap"><div class="card">'
    +'<div class="top"><span class="z">'+el.Z+'</span><span class="mass">'+_pteEsc(mass)+'</span></div>'
    +'<div class="sym">'+_pteEsc(el.s)+'</div>'
    +'<div class="name">'+_pteEsc(el.ru)+'</div>'
    +'<div class="en">'+_pteEsc(el.en)+'</div>'
    +(isIcon?'':('<div class="meta"><span class="chip">'+_pteEsc(catLabel)+'</span>'
      +'<span class="chip">период '+el.p+'</span><span class="chip">группа '+group+'</span></div>'))
    +propsBlock
    +lattice
    +(histLine?'<div class="hist">'+_pteEsc(histLine)+'</div>':'')
    +'</div></div></body></html>';
}
window.getPeriodicHTML=getPeriodicHTML;
window.PTE_ELEMENTS=PTE_ELEMENTS;
window._pteBySymbol=_pteBySymbol;

/** Фиксированные размеры режимов (не зависят от текущего ресайза пользователя). */
const PTE_CARD_W=300, PTE_CARD_H=540;
const PTE_ICON_SIZE=200; // квадрат

function _pteDefaultSize(isIcon){
  if(isIcon) return {w:PTE_ICON_SIZE, h:PTE_ICON_SIZE};
  return {w:PTE_CARD_W, h:PTE_CARD_H};
}

/** Выставить стандартный размер, сохранив центр элемента. */
function _pteApplyDefaultSize(d, dom){
  const sz=_pteDefaultSize(!!d.pteIcon);
  const cx=(d.x||0)+(d.w||sz.w)/2;
  const cy=(d.y||0)+(d.h||sz.h)/2;
  d.w=sz.w;
  d.h=sz.h;
  d.x=Math.round(cx-sz.w/2);
  d.y=Math.round(cy-sz.h/2);
  d._appletAspect=sz.w/sz.h;
  if(dom){
    dom.style.left=d.x+'px';
    dom.style.top=d.y+'px';
    dom.style.width=d.w+'px';
    dom.style.height=d.h+'px';
    dom.dataset.appletAspect=d._appletAspect;
  }
}

let _pteModalMode='insert', _pteReselectId=null;

function openPeriodicModal(opts){
  opts=opts||{};
  _pteModalMode=opts.mode==='reselect'?'reselect':'insert';
  _pteReselectId=opts.elId||null;
  let modal=document.getElementById('pte-modal');
  if(!modal){
    modal=document.createElement('div');
    modal.className='modal-ov';
    modal.id='pte-modal';
    modal.innerHTML='<div class="modal" style="max-width:920px;width:94vw;max-height:88vh;display:flex;flex-direction:column">'
      +'<h3 style="margin:0 0 8px">🧪 Таблица Менделеева</h3>'
      +'<div style="display:flex;gap:8px;margin-bottom:10px;align-items:center">'
      +'<input id="pte-search" type="search" placeholder="Поиск: Fe, железо, 26…" style="flex:1;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:7px 10px;font-size:13px"/>'
      +'<button class="mbtn" type="button" id="pte-cancel-btn">Отмена</button></div>'
      +'<div id="pte-grid" style="overflow:auto;flex:1;min-height:280px;padding:2px 2px 8px"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('mousedown',function(e){ if(e.target===modal) modal.classList.remove('open'); });
    modal.querySelector('#pte-cancel-btn').onclick=function(){ modal.classList.remove('open'); };
    modal.querySelector('#pte-search').addEventListener('input',function(e){ _pteBuildGrid(e.target.value); });
  }
  const inp=document.getElementById('pte-search');
  if(inp) inp.value='';
  _pteBuildGrid('');
  modal.classList.add('open');
  setTimeout(function(){ if(inp) inp.focus(); },30);
}
window.openPeriodicModal=openPeriodicModal;

function _pteCellHtml(e){
  const col=PTE_CAT_COLOR[e.c]||'#64748b';
  return '<button type="button" data-pte="'+e.s+'" title="'+_pteEsc(e.ru)+'" '
    +'style="width:100%;aspect-ratio:1/1.05;border-radius:7px;border:1px solid '+col+'66;background:'+col+'22;'
    +'color:var(--text);cursor:pointer;padding:3px 2px;display:flex;flex-direction:column;align-items:center;justify-content:center;'
    +'font-family:inherit">'
    +'<span style="font-size:8px;opacity:.65;line-height:1">'+e.Z+'</span>'
    +'<span style="font-size:13px;font-weight:800;line-height:1.1;color:'+col+'">'+e.s+'</span></button>';
}

function _pteBuildGrid(q){
  const grid=document.getElementById('pte-grid');
  if(!grid) return;
  q=String(q||'').trim().toLowerCase();
  const list=!q?PTE_ELEMENTS:PTE_ELEMENTS.filter(e=>
    e.s.toLowerCase().includes(q)||e.ru.toLowerCase().includes(q)||e.en.toLowerCase().includes(q)||String(e.Z)===q);
  if(!q) grid.innerHTML=_pteRenderTable();
  else grid.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:4px">'+list.map(_pteCellHtml).join('')+'</div>';
  grid.querySelectorAll('[data-pte]').forEach(function(btn){
    btn.onclick=function(){ _ptePick(btn.getAttribute('data-pte')); };
  });
}

function _pteRenderTable(){
  const byZ={}; PTE_ELEMENTS.forEach(e=>{ byZ[e.Z]=e; });
  const slots=[
    [1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2],
    [3,4,null,null,null,null,null,null,null,null,null,null,5,6,7,8,9,10],
    [11,12,null,null,null,null,null,null,null,null,null,null,13,14,15,16,17,18],
    [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36],
    [37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54],
    [55,56,57,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86],
    [87,88,89,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118]
  ];
  let html='<div style="display:grid;grid-template-columns:repeat(18,minmax(0,1fr));gap:3px;width:100%">';
  slots.forEach(function(row){
    row.forEach(function(z){
      if(!z){ html+='<div></div>'; return; }
      const e=byZ[z]; html+=e?_pteCellHtml(e):'<div></div>';
    });
  });
  html+='</div>';
  html+='<div style="margin-top:10px;font-size:11px;color:var(--text3);margin-bottom:4px">Лантаноиды</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(15,minmax(0,1fr));gap:3px">';
  for(let z=57;z<=71;z++) if(byZ[z]) html+=_pteCellHtml(byZ[z]);
  html+='</div><div style="margin-top:8px;font-size:11px;color:var(--text3);margin-bottom:4px">Актиноиды</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(15,minmax(0,1fr));gap:3px">';
  for(let z=89;z<=103;z++) if(byZ[z]) html+=_pteCellHtml(byZ[z]);
  html+='</div>';
  return html;
}

function _ptePick(symbol){
  const modal=document.getElementById('pte-modal');
  if(modal) modal.classList.remove('open');
  if(_pteModalMode==='reselect'&&_pteReselectId){ _pteApplySymbol(_pteReselectId,symbol); return; }
  insertPeriodicApplet(symbol);
}

function insertPeriodicApplet(symbol){
  const a=(typeof APPLETS!=='undefined')?APPLETS.find(x=>x.id==='periodic'):null;
  if(!a){ if(typeof toast==='function') toast('Аплет не найден','err'); return; }
  const el=_pteBySymbol(symbol)||_pteBySymbol('Fe');
  if(typeof pushUndo==='function') pushUndo();
  const sz=_pteDefaultSize(false);
  const w=sz.w, h=sz.h;
  const x=Math.round(((typeof canvasW!=='undefined'?canvasW:1200)-w)/2);
  const y=Math.round(((typeof canvasH!=='undefined'?canvasH:675)-h)/2);
  const theme=(typeof THEMES!=='undefined'&&typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)?THEMES[appliedThemeIdx]:null;
  const bgScheme=_pteDefaultBgScheme(theme);
  const fgScheme=_pteDefaultFgScheme();
  let bg='',fg='';
  if(typeof _resolveSchemeColor==='function'&&theme){
    bg=_resolveSchemeColor(bgScheme,theme)||'';
    fg=_resolveSchemeColor(fgScheme,theme)||'';
  }
  const cfg={pteSymbol:el.s,pteIcon:false,genBg:bg,genColor:fg,genBgOp:0.92,genBgBlur:0,genBgScheme:bgScheme,genColorScheme:fgScheme};
  const d={
    id:'e'+(++ec),type:'applet',x,y,w,h,rot:0,anims:[],
    appletId:'periodic',appletHtml:getPeriodicHTML(null,cfg),_appletAspect:w/h,
    pteSymbol:el.s,pteIcon:false,
    genBg:bg,genColor:fg,genBgOp:0.92,genBgBlur:0,
    genBgScheme:bgScheme,genColorScheme:fgScheme
  };
  slides[cur].els.push(d);
  if(typeof mkEl==='function') mkEl(d);
  const dom=document.getElementById('canvas')&&document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
  if(dom&&typeof pick==='function') pick(dom);
  if(typeof save==='function') save();
  if(typeof drawThumbs==='function') drawThumbs();
  if(typeof saveState==='function') saveState();
  if(typeof toast==='function') toast(el.ru+' ('+el.s+')','ok');
}
window.insertPeriodicApplet=insertPeriodicApplet;

function _pteApplySymbol(elId,symbol){
  if(typeof pushUndo==='function') pushUndo();
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===elId);
  if(!d||d.appletId!=='periodic') return;
  const el=_pteBySymbol(symbol); if(!el) return;
  d.pteSymbol=el.s;
  refreshPeriodicEl(elId);
  if(typeof syncProps==='function') syncProps();
  if(typeof toast==='function') toast(el.ru+' ('+el.s+')','ok');
}

function refreshPeriodicEl(elId,opts){
  opts=opts||{};
  const s=slides[cur]; if(!s) return;
  const d=s.els.find(x=>x.id===elId);
  if(!d||d.appletId!=='periodic') return;
  d.appletHtml=getPeriodicHTML(null,{
    pteSymbol:d.pteSymbol,pteIcon:!!d.pteIcon,
    genBg:d.genBg,genColor:d.genColor,genBgOp:d.genBgOp,genBgBlur:d.genBgBlur,
    genBgScheme:d.genBgScheme,genColorScheme:d.genColorScheme
  });
  const dom=document.getElementById('canvas')&&document.getElementById('canvas').querySelector('[data-id="'+elId+'"]');
  if(dom){
    dom.dataset.appletHtml=d.appletHtml;
    dom.dataset.pteSymbol=d.pteSymbol||'';
    dom.dataset.pteIcon=d.pteIcon?'true':'false';
    if(d.genColor!=null) dom.dataset.genColor=d.genColor||'';
    if(d.genBg!=null) dom.dataset.genBg=d.genBg||'';
    if(d.genBgOp!=null) dom.dataset.genBgOp=String(d.genBgOp);
    if(d.genBgBlur!=null) dom.dataset.genBgBlur=String(d.genBgBlur);
    dom.dataset.genColorScheme=d.genColorScheme?JSON.stringify(d.genColorScheme):'';
    dom.dataset.genBgScheme=d.genBgScheme?JSON.stringify(d.genBgScheme):'';
    const iframe=dom.querySelector('iframe');
    if(iframe) iframe.srcdoc=d.appletHtml;
  }
  if(!opts.silent){
    if(typeof save==='function') save();
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
  }
}
window.refreshPeriodicEl=refreshPeriodicEl;

function syncPeriodicProps(){
  if(!sel||sel.dataset.appletId!=='periodic') return;
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(!d) return;
  const el=_pteBySymbol(d.pteSymbol)||_pteBySymbol('Fe');
  const nameEl=document.getElementById('pte-props-name');
  if(nameEl) nameEl.textContent=el?(el.ru+' ('+el.s+')'):'—';
  const icon=document.getElementById('pte-icon-mode');
  const iconLbl=document.getElementById('pte-icon-label');
  if(icon) icon.checked=!!d.pteIcon;
  if(iconLbl) iconLbl.textContent=d.pteIcon?'Иконка':'Карточка';
  const colors=_pteResolveColors(d);
  const bgPrev=document.getElementById('pte-bg-preview');
  if(bgPrev) bgPrev.style.background=d.genBg||colors.bg||'transparent';
  const bgHex=document.getElementById('pte-bg-hex');
  if(bgHex) bgHex.value=(typeof _colorFieldDisplay==='function')?_colorFieldDisplay(d.genBg||colors.bg,d.genBgScheme):(d.genBg||colors.bg||'');
  const fgPrev=document.getElementById('pte-fg-preview');
  if(fgPrev) fgPrev.style.background=d.genColor||colors.fg;
  const fgHex=document.getElementById('pte-fg-hex');
  if(fgHex) fgHex.value=(typeof _colorFieldDisplay==='function')?_colorFieldDisplay(d.genColor||colors.fg,d.genColorScheme):(d.genColor||colors.fg||'');
  const op=document.getElementById('pte-bg-op');
  if(op) op.value=d.genBgOp!=null?d.genBgOp:0.92;
  const blur=document.getElementById('pte-bg-blur');
  if(blur) blur.value=d.genBgBlur!=null?d.genBgBlur:0;
}
window.syncPeriodicProps=syncPeriodicProps;

function setPeriodicProp(prop,val,schemeRef){
  if(!sel||sel.dataset.appletId!=='periodic') return;
  const elId=sel.dataset.id;
  // pushUndo → save() пересоздаёт объекты в slides — ищем d ПОСЛЕ undo
  if(typeof pushUndo==='function') pushUndo();
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===elId);
  if(!d||d.appletId!=='periodic') return;
  d[prop]=val;
  if(prop==='genBg'){
    d.genBgScheme=(schemeRef!==undefined)?schemeRef:null;
    sel.dataset.genBg=val||'';
    sel.dataset.genBgScheme=d.genBgScheme?JSON.stringify(d.genBgScheme):'';
  }
  if(prop==='genColor'){
    d.genColorScheme=(schemeRef!==undefined)?schemeRef:null;
    sel.dataset.genColor=val||'';
    sel.dataset.genColorScheme=d.genColorScheme?JSON.stringify(d.genColorScheme):'';
  }
  if(prop==='genBgOp') sel.dataset.genBgOp=String(val);
  if(prop==='genBgBlur') sel.dataset.genBgBlur=String(val);
  if(prop==='pteIcon'){
    d.pteIcon=!!val;
    sel.dataset.pteIcon=d.pteIcon?'true':'false';
    _pteApplyDefaultSize(d, sel);
    if(typeof syncPos==='function') syncPos();
    if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
  }
  refreshPeriodicEl(d.id);
  syncPeriodicProps();
}
window.setPeriodicProp=setPeriodicProp;

function reselectPeriodicElement(){
  if(!sel||sel.dataset.appletId!=='periodic') return;
  openPeriodicModal({mode:'reselect',elId:sel.dataset.id});
}
window.reselectPeriodicElement=reselectPeriodicElement;
