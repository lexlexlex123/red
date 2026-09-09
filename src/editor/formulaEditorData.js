/** Formula editor catalog — structures + symbols (v7.1 / Word-like). */

export const FORMULA_STRUCTS = [
  {
    titleRu: 'Дробь',
    titleEn: 'Fraction',
    icon: '\\frac{x}{y}',
    variants: [
      { labelRu: 'Простая дробь', labelEn: 'Simple fraction', latex: '\\frac{#0}{#1}' },
      { labelRu: 'Наклонная дробь', labelEn: 'Slash fraction', latex: '{#0}/{#1}' },
    ],
  },
  {
    titleRu: 'Индекс',
    titleEn: 'Index',
    icon: 'e^{x}',
    variants: [
      { labelRu: 'Верхний индекс', labelEn: 'Superscript', latex: '#0^{#1}' },
      { labelRu: 'Нижний индекс', labelEn: 'Subscript', latex: '#0_{#1}' },
      { labelRu: 'Верхний и нижний', labelEn: 'Sub + super', latex: '#0_{#1}^{#2}' },
      { labelRu: 'Верхний левый', labelEn: 'Left super', latex: '{}^{#1}#0' },
    ],
  },
  {
    titleRu: 'Корень',
    titleEn: 'Root',
    icon: '\\sqrt[n]{x}',
    variants: [
      { labelRu: 'Квадратный корень', labelEn: 'Square root', latex: '\\sqrt{#0}' },
      { labelRu: 'Корень n-й степени', labelEn: 'Nth root', latex: '\\sqrt[#1]{#0}' },
      { labelRu: 'Кубический корень', labelEn: 'Cube root', latex: '\\sqrt[3]{#0}' },
    ],
  },
  {
    titleRu: 'Интеграл',
    titleEn: 'Integral',
    icon: '\\int_{a}^{b}',
    variants: [
      { labelRu: 'Интеграл', labelEn: 'Integral', latex: '\\int #0' },
      { labelRu: 'Интеграл с пределами', labelEn: 'Definite integral', latex: '\\int_{#1}^{#2} #0' },
      { labelRu: 'Двойной интеграл', labelEn: 'Double integral', latex: '\\iint #0' },
      { labelRu: 'Тройной интеграл', labelEn: 'Triple integral', latex: '\\iiint #0' },
      { labelRu: 'Контурный интеграл', labelEn: 'Contour integral', latex: '\\oint #0' },
    ],
  },
  {
    titleRu: 'Сумма',
    titleEn: 'Sum',
    icon: '\\sum_{i=0}^{n}',
    variants: [
      { labelRu: 'Сумма', labelEn: 'Sum', latex: '\\sum #0' },
      { labelRu: 'Сумма с пределами', labelEn: 'Sum with limits', latex: '\\sum_{#1}^{#2} #0' },
      { labelRu: 'Произведение', labelEn: 'Product', latex: '\\prod_{#1}^{#2} #0' },
      { labelRu: 'Объединение', labelEn: 'Union', latex: '\\bigcup_{#1}^{#2} #0' },
      { labelRu: 'Пересечение', labelEn: 'Intersection', latex: '\\bigcap_{#1}^{#2} #0' },
    ],
  },
  {
    titleRu: 'Скобка',
    titleEn: 'Bracket',
    icon: '\\left(x\\right)',
    variants: [
      { labelRu: 'Круглые скобки', labelEn: 'Parentheses', latex: '\\left( #0 \\right)' },
      { labelRu: 'Квадратные скобки', labelEn: 'Brackets', latex: '\\left[ #0 \\right]' },
      { labelRu: 'Фигурные скобки', labelEn: 'Braces', latex: '\\left\\{ #0 \\right\\}' },
      { labelRu: 'Угловые скобки', labelEn: 'Angles', latex: '\\langle #0 \\rangle' },
      { labelRu: 'Модуль', labelEn: 'Absolute', latex: '\\left| #0 \\right|' },
      { labelRu: 'Норма', labelEn: 'Norm', latex: '\\left\\| #0 \\right\\|' },
      { labelRu: 'Скобка снизу', labelEn: 'Underbrace', latex: '\\underbrace{#0}_{#1}' },
      { labelRu: 'Скобка сверху', labelEn: 'Overbrace', latex: '\\overbrace{#0}^{#1}' },
    ],
  },
  {
    titleRu: 'Функция',
    titleEn: 'Function',
    icon: '\\sin\\theta',
    variants: [
      { labelRu: 'sin', labelEn: 'sin', latex: '\\sin #0' },
      { labelRu: 'cos', labelEn: 'cos', latex: '\\cos #0' },
      { labelRu: 'tan', labelEn: 'tan', latex: '\\tan #0' },
      { labelRu: 'log', labelEn: 'log', latex: '\\log_{#1} #0' },
      { labelRu: 'ln', labelEn: 'ln', latex: '\\ln #0' },
      { labelRu: 'exp', labelEn: 'exp', latex: '\\exp #0' },
      { labelRu: 'lim', labelEn: 'lim', latex: '\\lim_{#1 \\to #2} #0' },
      { labelRu: 'max', labelEn: 'max', latex: '\\max_{#1} #0' },
      { labelRu: 'min', labelEn: 'min', latex: '\\min_{#1} #0' },
    ],
  },
  {
    titleRu: 'Диакрит.',
    titleEn: 'Accent',
    icon: '\\dot{a}',
    variants: [
      { labelRu: 'Точка над', labelEn: 'Dot', latex: '\\dot{#0}' },
      { labelRu: 'Две точки', labelEn: 'Ddot', latex: '\\ddot{#0}' },
      { labelRu: 'Шляпка', labelEn: 'Hat', latex: '\\hat{#0}' },
      { labelRu: 'Тильда', labelEn: 'Tilde', latex: '\\tilde{#0}' },
      { labelRu: 'Черта над', labelEn: 'Overline', latex: '\\overline{#0}' },
      { labelRu: 'Вектор', labelEn: 'Vector', latex: '\\vec{#0}' },
      { labelRu: 'Черта под', labelEn: 'Underline', latex: '\\underline{#0}' },
      { labelRu: 'Стрелка над', labelEn: 'Over arrow', latex: '\\overrightarrow{#0}' },
    ],
  },
  {
    titleRu: 'Предел',
    titleEn: 'Limit',
    icon: '\\lim_{n\\to\\infty}',
    variants: [
      { labelRu: 'Предел', labelEn: 'Limit', latex: '\\lim_{#0} #1' },
      { labelRu: 'Предел справа', labelEn: 'Right limit', latex: '\\lim_{#0 \\to #1^+} #2' },
      { labelRu: 'Предел слева', labelEn: 'Left limit', latex: '\\lim_{#0 \\to #1^-} #2' },
      { labelRu: 'max/min', labelEn: 'max/min', latex: '\\max_{#0} #1' },
    ],
  },
  {
    titleRu: 'Оператор',
    titleEn: 'Operator',
    icon: '\\nabla',
    variants: [
      { labelRu: 'Набла', labelEn: 'Nabla', latex: '\\nabla #0' },
      { labelRu: 'Лапласиан', labelEn: 'Laplacian', latex: '\\nabla^2 #0' },
      { labelRu: 'Частная пр.', labelEn: 'Partial', latex: '\\frac{\\partial #0}{\\partial #1}' },
      { labelRu: 'Вторая частн.', labelEn: '2nd partial', latex: '\\frac{\\partial^2 #0}{\\partial #1^2}' },
      { labelRu: 'Производная', labelEn: 'Derivative', latex: '\\frac{d #0}{d #1}' },
    ],
  },
  {
    titleRu: 'Матрица',
    titleEn: 'Matrix',
    icon: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}',
    variants: [
      {
        labelRu: 'Матрица 2×2',
        labelEn: 'Matrix 2×2',
        latex: '\\begin{pmatrix} #0 & #1 \\\\ #2 & #3 \\end{pmatrix}',
      },
      {
        labelRu: 'Матрица 3×3',
        labelEn: 'Matrix 3×3',
        latex: '\\begin{pmatrix} #0 & #1 & #2 \\\\ #3 & #4 & #5 \\\\ #6 & #7 & #8 \\end{pmatrix}',
      },
      {
        labelRu: 'Детерминант',
        labelEn: 'Determinant',
        latex: '\\begin{vmatrix} #0 & #1 \\\\ #2 & #3 \\end{vmatrix}',
      },
      { labelRu: 'Система ур-й', labelEn: 'Cases', latex: '\\begin{cases} #0 \\\\ #1 \\end{cases}' },
      {
        labelRu: 'Столбец',
        labelEn: 'Column',
        latex: '\\begin{pmatrix} #0 \\\\ #1 \\end{pmatrix}',
      },
    ],
  },
];

/** Default formula color in theme palette: position «15» (col 0, row 4). */
export const FORMULA_DEFAULT_COLOR_SCHEME = { col: 0, row: 4 };

/** [label, latex, title] */
export const FORMULA_SYMBOL_GROUPS = [
  {
    nameRu: 'Греческие',
    nameEn: 'Greek',
    syms: [
      ['α', '\\alpha', 'α'],
      ['β', '\\beta', 'β'],
      ['γ', '\\gamma', 'γ'],
      ['δ', '\\delta', 'δ'],
      ['θ', '\\theta', 'θ'],
      ['λ', '\\lambda', 'λ'],
      ['μ', '\\mu', 'μ'],
      ['σ', '\\sigma', 'σ'],
      ['φ', '\\phi', 'φ'],
      ['ω', '\\omega', 'ω'],
      ['π', '\\pi', 'π'],
      ['ε', '\\varepsilon', 'ε'],
      ['Σ', '\\Sigma', 'Σ'],
      ['Π', '\\Pi', 'Π'],
      ['Δ', '\\Delta', 'Δ'],
      ['Ω', '\\Omega', 'Ω'],
      ['Γ', '\\Gamma', 'Γ'],
      ['Λ', '\\Lambda', 'Λ'],
      ['Θ', '\\Theta', 'Θ'],
    ],
  },
  {
    nameRu: 'Операции',
    nameEn: 'Ops',
    syms: [
      ['±', '\\pm', '±'],
      ['×', '\\times', '×'],
      ['÷', '\\div', '÷'],
      ['·', '\\cdot', '·'],
      ['∂', '\\partial', '∂'],
      ['∇', '\\nabla', '∇'],
      ['∞', '\\infty', '∞'],
      ['∝', '\\propto', '∝'],
      ['∫', '\\int', '∫'],
      ['∬', '\\iint', '∬'],
      ['∮', '\\oint', '∮'],
      ['∑', '\\sum', '∑'],
      ['∏', '\\prod', '∏'],
    ],
  },
  {
    nameRu: 'Отношения',
    nameEn: 'Relations',
    syms: [
      ['=', '=', '='],
      ['≠', '\\neq', '≠'],
      ['<', '<', '<'],
      ['>', '>', '>'],
      ['≤', '\\leq', '≤'],
      ['≥', '\\geq', '≥'],
      ['≈', '\\approx', '≈'],
      ['≡', '\\equiv', '≡'],
      ['∈', '\\in', '∈'],
      ['∉', '\\notin', '∉'],
      ['⊂', '\\subset', '⊂'],
      ['⊆', '\\subseteq', '⊆'],
      ['∪', '\\cup', '∪'],
      ['∩', '\\cap', '∩'],
      ['∅', '\\emptyset', '∅'],
      ['→', '\\to', '→'],
      ['⟹', '\\Rightarrow', '⟹'],
      ['⟺', '\\Leftrightarrow', '⟺'],
    ],
  },
  {
    nameRu: 'Прочее',
    nameEn: 'Misc',
    syms: [
      ['ℝ', '\\mathbb{R}', 'ℝ'],
      ['ℤ', '\\mathbb{Z}', 'ℤ'],
      ['ℕ', '\\mathbb{N}', 'ℕ'],
      ['ℂ', '\\mathbb{C}', 'ℂ'],
      ['∀', '\\forall', '∀'],
      ['∃', '\\exists', '∃'],
      ['¬', '\\neg', '¬'],
      ['∧', '\\land', '∧'],
      ['∨', '\\lor', '∨'],
      ['⊕', '\\oplus', '⊕'],
      ['…', '\\ldots', '…'],
      ['⋯', '\\cdots', '⋯'],
      ['∴', '\\therefore', '∴'],
      ['|', '|', '|'],
      ['&', '\\&', '&'],
      ['sin', '\\sin ', 'sin'],
      ['cos', '\\cos ', 'cos'],
      ['tan', '\\tan ', 'tan'],
      ['ln', '\\ln ', 'ln'],
      ['log', '\\log ', 'log'],
      ['lim', '\\lim ', 'lim'],
    ],
  },
];

export function structLatexForTextarea(template, selectedText) {
  const ph = '\\placeholder{}';
  if (selectedText && String(selectedText).trim()) {
    const s = String(selectedText).trim();
    let slot = s;
    if (!(s.startsWith('{') && s.endsWith('}'))) {
      if (!/^[a-zA-Z0-9]$/.test(s) && !/^\\[a-zA-Z]+/.test(s)) slot = `{${s}}`;
    }
    return template.replace(/#0(?!\d)/g, slot).replace(/#([1-9]\d*)/g, ph);
  }
  return template.replace(/#\d+/g, ph);
}

export function structLatexForMathLive(template, useSelectionInPrimary) {
  if (useSelectionInPrimary) {
    return template.replace(/#0(?!\d)/g, '#@').replace(/#([1-9]\d*)/g, '#?');
  }
  return template.replace(/#\d+/g, '#?');
}
