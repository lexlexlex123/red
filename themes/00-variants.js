/** Template variants for slide-props panel (per decorative theme). */
function _themeTplFor(nameEn, isRu) {
  const title = isRu ? 'Главный' : 'Title';
  const content = isRu ? 'Побочный' : 'Content';
  if (nameEn === 'Notebook · Grid') {
    return [
      { style: 'title', mirror: false, tip: isRu ? 'Крупная' : 'Large' },
      { style: 'content', mirror: false, tip: isRu ? 'Мелкая' : 'Fine' },
      { style: 'axes-center', mirror: false, tip: isRu ? 'Оси · центр' : 'Axes · center' },
      { style: 'axes-q1', mirror: false, tip: isRu ? 'Оси · I четверть' : 'Axes · Q1' },
      { style: 'axes-q1inv', mirror: false, tip: isRu ? 'Оси · I четверть ↓' : 'Axes · Q1 ↓' },
      { style: 'axes-q1right', mirror: false, tip: isRu ? 'Оси · правая половина' : 'Axes · right half' },
    ];
  }
  if (nameEn === 'Notebook · Lined') {
    return [
      { style: 'title', mirror: false, tip: isRu ? 'Крупная' : 'Large' },
      { style: 'content', mirror: false, tip: isRu ? 'Мелкая' : 'Fine' },
    ];
  }
  if (nameEn === 'Storm') {
    return [
      { style: 'title', mirror: false, tip: isRu ? 'Гроза' : 'Storm' },
      { style: 'content', mirror: false, tip: isRu ? 'Гроза · тише' : 'Storm · soft' },
      { style: 'rain', mirror: false, tip: isRu ? 'Дождь' : 'Rain' },
    ];
  }
  if (nameEn === 'Layers') {
    return [
      { style: 'title', mirror: false, tip: isRu ? 'Сверху' : 'Top' },
      { style: 'bottom', mirror: false, tip: isRu ? 'Снизу' : 'Bottom' },
      { style: 'content', mirror: false, tip: isRu ? 'Сверху и снизу' : 'Top & bottom' },
      { style: 'sides', mirror: false, tip: isRu ? 'По бокам' : 'Sides' },
    ];
  }
  if (nameEn === 'Circuit') {
    return [
      { style: 'title', mirror: false, tip: isRu ? 'Главный · крупная схема' : 'Title · large circuit' },
      { style: 'content', mirror: false, tip: isRu ? 'Побочный · углы' : 'Content · corners' },
      { style: 'diag-alt', mirror: false, tip: isRu ? '↙ Левый низ + правый верх' : 'Bottom-left + top-right' },
      { style: 'single', mirror: false, tip: isRu ? 'Только правый низ' : 'Bottom-right only' },
    ];
  }
  if (nameEn === 'Swamp') {
    return [
      { style: 'title', mirror: false, tip: isRu ? 'С кувшинкой' : 'With lily pad' },
      { style: 'content', mirror: false, tip: isRu ? 'Два листа · ряска' : 'Two pads · duckweed' },
      { style: 'arc', mirror: false, tip: isRu ? 'Два листа · по дуге' : 'Two pads · arc' },
    ];
  }
  if (nameEn === 'Tile') {
    return [
      { style: 'frame', mirror: false, tip: isRu ? 'Рамка · главный' : 'Frame · title' },
      { style: 'bands', mirror: false, tip: isRu ? 'Две полосы · побочный' : 'Two bands · content' },
      { style: 'full', mirror: false, tip: isRu ? 'Полная сетка' : 'Full grid' },
      { style: 'split', mirror: false, tip: isRu ? 'Две панели' : 'Two panels' },
      { style: 'mosaic', mirror: false, tip: isRu ? 'Мозаика' : 'Mosaic' },
    ];
  }
  if (nameEn === 'Cosmos') {
    return [
      { style: 'title', mirror: false, tip: title },
      { style: 'content', mirror: false, tip: content },
      { style: 'void', mirror: false, tip: isRu ? 'Звёздный разгон' : 'Star warp' },
    ];
  }
  const variants = [
    { style: 'title', mirror: false, tip: title },
    { style: 'content', mirror: false, tip: content },
  ];
  if (nameEn === 'Prism') {
    variants.push(
      { style: 'title', mirror: true, tip: isRu ? 'Главный, другая диагональ' : 'Title, other diagonal' },
      { style: 'content', mirror: true, tip: isRu ? 'Побочный, другая диагональ' : 'Content, other diagonal' }
    );
  }
  return variants;
}
