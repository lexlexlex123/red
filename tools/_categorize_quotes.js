// One-shot: add category field to QUOTE_BANK and rewrite js/02b-quotes-data.js
const fs = require('fs');
const path = require('path');

const CATS = [
  {id:'writers', nameRu:'Писатели', name:'Writers'},
  {id:'history', nameRu:'История', name:'History'},
  {id:'proverbs', nameRu:'Пословицы', name:'Proverbs'},
  {id:'philosophy', nameRu:'Философия', name:'Philosophy'},
  {id:'science', nameRu:'Наука', name:'Science'},
  {id:'spirit', nameRu:'Духовность', name:'Spirituality'},
  {id:'other', nameRu:'Разное', name:'Other'},
];

const byAuthor = {
  'Александр Пушкин':'writers','Владимир Маяковский':'writers','Маяковский':'writers',
  'Уильям Шекспир':'writers','Фёдор Тютчев':'writers','Булат Окуджава':'writers',
  'Михаил Лермонтов':'writers','Марк Твен':'writers','Василий Лебедев-Кумач':'writers',
  'Вергилий':'writers','Николай Гоголь':'writers','Константин Симонов':'writers',
  'Лев Толстой':'writers','Джордж Оруэлл':'writers','Сергей Есенин':'writers',
  'Фёдор Достоевский':'writers','Николай Некрасов':'writers','Лев Ошанин':'writers',
  'Жан-Поль Сартр':'writers','Альбер Камю':'writers','Франц Кафка':'writers',
  'Антуан де Сент-Экзюпери':'writers','Оскар Уайльд':'writers','Пауло Коэльо':'writers',
  'Герман Гессе':'writers','Рэй Брэдбери':'writers','Эрнест Хемингуэй':'writers',
  'Антон Чехов':'writers','Максим Горький':'writers','Михаил Булгаков':'writers',
  'Александр Блок':'writers','Евгений Евтушенко':'writers','Владимир Короленко':'writers',
  'Иоганн Вольфганг Гёте':'writers','Гейне':'writers','Стендаль':'writers',
  'Франсуа Рабле':'writers','О. Генри':'writers','Марсель Пруст':'writers',
  'Маргарет Митчелл':'writers','Анатоль Франс':'writers','Александр Грин':'writers',
  'Вивиан Грин':'writers','Гораций':'writers','Овидий':'writers','Плавт':'writers',
  'Теренций':'writers','Ювенал':'writers','Генри Уодсворт Лонгфелло':'writers',
  'Михаил Матусовский':'writers','Владимир Харитонов':'writers','Эзоп':'writers',

  'Уинстон Черчилль':'history','Гай Юлий Цезарь':'history','Наполеон Бонапарт':'history',
  'Томас Джефферсон':'history','Александр Суворов':'history','Иосиф Сталин':'history',
  'Махатма Ганди':'history','Мартин Лютер Кинг':'history','Джон Кеннеди':'history',
  'Элеонора Рузвельт':'history','Теодор Рузвельт':'history','Франклин Рузвельт':'history',
  'Нельсон Мандела':'history','Владимир Ленин':'history','Вячеслав Молотов':'history',
  'Екатерина II':'history','Отто фон Бисмарк':'history','Людовик XIV':'history',
  'Генрих IV':'history','Перикл':'history','Веспасиан':'history','Август':'history',
  'Лорд Актон':'history','Александр Горчаков':'history','Уильям Гладстон':'history',
  'Бенджамин Дизраэли':'history','Эдмунд Бёрк':'history','Василий Клочков':'history',
  'Ираклий Тоидзе':'history','Юрий Гагарин':'history','Сунь-цзы':'history',
  'Миямото Мусаси':'history','Ямамото Цунэтомо':'history','Вегеций':'history',
  'Саллюстий':'history','Тит Ливий':'history','Никколо Макиавелли':'history',
  'Карл Маркс':'history','Фридрих Энгельс':'history','Бенджамин Франклин':'history',
  'Папа Бонифаций VIII':'history','Михаил Покровский':'history',

  'Сократ':'philosophy','Платон':'philosophy','Аристотель':'philosophy',
  'Фридрих Ницше':'philosophy','Рене Декарт':'philosophy','Иммануил Кант':'philosophy',
  'Гераклит':'philosophy','Сенека':'philosophy','Цицерон':'philosophy',
  'Марк Аврелий':'philosophy','Эпиктет':'philosophy','Блез Паскаль':'philosophy',
  'Вольтер':'philosophy','Жан-Жак Руссо':'philosophy','Фрэнсис Бэкон':'philosophy',
  'Конфуций':'philosophy','Лао-цзы':'philosophy','Гегель':'philosophy',
  'Карл Юнг':'philosophy','Зигмунд Фрейд':'philosophy','Виктор Франкл':'philosophy',
  'Протагор':'philosophy','Фалес':'philosophy','Солон':'philosophy','Клеобул':'philosophy',
  'Людвиг Фейербах':'philosophy','Публилий Сир':'philosophy','Квинтилиан':'philosophy',
  'Ульпиан':'philosophy','Симонид':'philosophy','Плиний':'philosophy',

  'Альберт Эйнштейн':'science','Исаак Ньютон':'science','Томас Эдисон':'science',
  'Леонардо да Винчи':'science','Гиппократ':'science','Архимед':'science',
  'Галилео Галилей':'science','Чарльз Дарвин':'science','Луи Пастер':'science',
  'Ибн Сина':'science','Клод Бернар':'science','Парацельс':'science',
  'Герберт Спенсер':'science',

  'Библия':'spirit','Экклезиаст':'spirit','Будда':'spirit','Далай-лама':'spirit',
  'Буддийская мудрость':'spirit',

  'Стив Джобс':'other','Генри Форд':'other','Билл Гейтс':'other','Питер Друкер':'other',
  'Наполеон Хилл':'other','Зиг Зиглар':'other','Марк Цукерберг':'other',
  'Мухаммед Али':'other','Джон Леннон':'other','Чарльз Чаплин':'other',
  'Брюс Ли':'other','Брюс Спрингстин':'other','Боно':'other','Опра Уинфри':'other',
  'Джон Вуден':'other','Хелен Келлер':'other','Арианна Хаффингтон':'other',
  'Норман Винсент Пил':'other','Рой Т. Беннет':'other','Сьюзи Кассем':'other',
  'Аллен Сондерс':'other','Аноним':'other',
};

function catOf(author) {
  const a = String(author || '').trim();
  if (byAuthor[a]) return byAuthor[a];
  if (/пословиц|мудрость|афоризм|правило|изречение|максима/i.test(a)) return 'proverbs';
  return 'other';
}

const file = path.join(__dirname, '..', 'js', '02b-quotes-data.js');
const raw = fs.readFileSync(file, 'utf8');
const bankIdx = raw.indexOf('window.QUOTE_BANK=');
if (bankIdx < 0) {
  console.error('QUOTE_BANK not found');
  process.exit(1);
}
let bankStr = raw.slice(bankIdx + 'window.QUOTE_BANK='.length).trim();
// Drop trailing junk: ;  or ;\n (literal) or real newlines
bankStr = bankStr.replace(/(?:\\n)+$/g, '').replace(/;+\s*$/, '');
const bank = JSON.parse(bankStr);
const out = bank.map((r) => {
  const text = Array.isArray(r) ? r[0] : (r.text || r.q);
  const author = Array.isArray(r) ? r[1] : (r.author || r.a);
  const existing = Array.isArray(r) && r[2] ? String(r[2]) : '';
  const cat = existing && CATS.some((c) => c.id === existing) ? existing : catOf(author);
  return [String(text), String(author), cat];
});
const counts = {};
for (const r of out) counts[r[2]] = (counts[r[2]] || 0) + 1;
console.log(counts);

const body =
  '// Банк цитат для аплета «Цитата» (' + out.length + ')\n' +
  '// Формат: [текст, автор, категория]. Категории: writers|history|proverbs|philosophy|science|spirit|other\n' +
  'window.QUOTE_CATEGORIES=' + JSON.stringify(CATS) + ';\n' +
  'window.QUOTE_BANK=' + JSON.stringify(out) + ';\n';
fs.writeFileSync(file, body);
console.log('wrote', file, 'count=', out.length);
