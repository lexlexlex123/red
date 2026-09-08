const fs = require('fs');
const src = fs.readFileSync('js/02b-periodic.js', 'utf8');

function extractArray(name) {
  const start = src.indexOf(`const ${name}=`);
  if (start < 0) throw new Error('missing ' + name);
  const arrStart = src.indexOf('[', start);
  let depth = 0;
  let end = -1;
  for (let i = arrStart; i < src.length; i++) {
    const c = src[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return Function('return ' + src.slice(arrStart, end + 1))();
}

const elements = extractArray('PTE_ELEMENTS');
const props = extractArray('PTE_PROP');
fs.writeFileSync('src/editor/periodic-elements.json', JSON.stringify(elements));
fs.writeFileSync('src/editor/periodic-props.json', JSON.stringify(props));
console.log('ok', elements.length, props.length);
