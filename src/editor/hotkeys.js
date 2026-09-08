/** Map physical keys so Ctrl+C / Ctrl+Z work on a Russian layout. */

const RU_TO_EN = {
  й: 'q',
  ц: 'w',
  у: 'e',
  к: 'r',
  е: 't',
  н: 'y',
  г: 'u',
  ш: 'i',
  щ: 'o',
  з: 'p',
  х: '[',
  ъ: ']',
  ф: 'a',
  ы: 's',
  в: 'd',
  а: 'f',
  п: 'g',
  р: 'h',
  о: 'j',
  л: 'k',
  д: 'l',
  ж: ';',
  э: "'",
  я: 'z',
  ч: 'x',
  с: 'c',
  м: 'v',
  и: 'b',
  т: 'n',
  ь: 'm',
  ',': '<',
  '.': '>',
};

function fromCode(code) {
  if (!code) return '';
  if (code.startsWith('Key') && code.length === 4) return code.slice(3).toLowerCase();
  if (code === 'BracketLeft') return '[';
  if (code === 'BracketRight') return ']';
  if (code === 'Minus') return '-';
  if (code === 'Equal') return '=';
  return '';
}

/** Latin letter or symbol for a keydown, independent of keyboard layout. */
export function latinKey(e) {
  const from = fromCode(e.code);
  if (from) return from;
  const k = e.key || '';
  if (RU_TO_EN[k]) return RU_TO_EN[k];
  if (RU_TO_EN[k.toLowerCase()]) return RU_TO_EN[k.toLowerCase()];
  return k.length === 1 ? k.toLowerCase() : k;
}

export function isBracketLeft(e) {
  return e.code === 'BracketLeft' || e.key === '[' || latinKey(e) === '[';
}

export function isBracketRight(e) {
  return e.code === 'BracketRight' || e.key === ']' || latinKey(e) === ']';
}
