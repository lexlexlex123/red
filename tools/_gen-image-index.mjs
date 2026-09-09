import fs from 'fs';

const src = fs.readFileSync('images/image-index.js', 'utf8');
let s = src.replace(/^[\s\S]*?(?=const IMAGE_INDEX =)/, '');
s = s.replace('const IMAGE_INDEX =', 'export const IMAGE_INDEX =');
s = s.replace(/\];\s*$/, `];

export const IMAGE_CAT_NAMES = {
  nature: 'Природа',
  animals: 'Животные',
  birds: 'Птицы',
  business: 'Бизнес',
  technology: 'Технологии',
  backgrounds: 'Фоны',
  textures: 'Текстуры',
  people: 'Люди',
  abstract: 'Абстракция',
  icons_png: 'Иконки PNG',
  smiles: 'Смайлики',
  decor: 'Декор',
  fish: 'Рыбы',
  food: 'Еда',
};

export function buildImageCats() {
  const seen = new Set();
  const cats = [];
  for (const id of Object.keys(IMAGE_CAT_NAMES)) {
    if (IMAGE_INDEX.some((x) => x.cat === id)) {
      seen.add(id);
      cats.push({ id, name: IMAGE_CAT_NAMES[id] });
    }
  }
  for (const img of IMAGE_INDEX) {
    if (!seen.has(img.cat)) {
      seen.add(img.cat);
      const name =
        IMAGE_CAT_NAMES[img.cat] ||
        img.cat.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      cats.push({ id: img.cat, name });
    }
  }
  return cats.length ? cats : [{ id: 'all', name: 'Все' }];
}

export function imagesForCategory(catId) {
  if (!catId || catId === 'all') return IMAGE_INDEX.slice();
  return IMAGE_INDEX.filter((x) => x.cat === catId);
}
`);
fs.writeFileSync('src/editor/image-index.js', s);
console.log('wrote', fs.statSync('src/editor/image-index.js').size);
