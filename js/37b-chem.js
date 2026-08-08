// ══════════════ CHEMISTRY STRUCTURES ══════════════
// Detect chemical formulas and render labelled structural diagrams
// (used by «Построить график» for chemistry formulas).

(function () {

  // Common element symbols (school + frequent)
  const _ELEMENTS = new Set([
    'H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar',
    'K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr',
    'Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe',
    'Cs','Ba','La','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn',
    'Fr','Ra','Ac','Th','Pa','U','Np','Pu'
  ]);

  // ── Normalize LaTeX / plain → compact formula key (e.g. H2SO4) ─────────────
  function _normalizeChemFormula(raw) {
    if (!raw) return '';
    let s = String(raw).trim();
    s = s.replace(/^\$+|\$+$/g, '');
    s = s.replace(/\\[\[\(]|\\[\]\)]/g, '');
    // \ce{...}, \mathrm{...}, \text{...}
    for (let i = 0; i < 4; i++) {
      s = s.replace(/\\(?:ce|mathrm|mathbf|text|textrm|textit)\{([^{}]*)\}/g, '$1');
    }
    s = s.replace(/\\left|\\right/g, '');
    s = s.replace(/\\cdot/g, '·').replace(/\\times/g, '·');
    s = s.replace(/_\{([^}]*)\}/g, '$1');
    s = s.replace(/\^\{([^}]*)\}/g, '^$1');
    s = s.replace(/_([0-9a-zA-Z+\-]+)/g, '$1');
    s = s.replace(/\^([0-9+\-]+)/g, '^$1');
    s = s.replace(/[{}\\]/g, '');
    s = s.replace(/\s+/g, '');
    // unicode subscripts → digits
    const subMap = { '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9' };
    s = s.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, ch => subMap[ch] || ch);
    return s;
  }

  function _looksLikeChem(norm) {
    if (!norm || norm.length < 1 || norm.length > 40) return false;
    // Reject obvious math
    if (/[xy=∫∑∏√]|sin|cos|tan|log|lim|frac|sqrt|infty|partial/i.test(norm)) return false;
    if (!/^[A-Za-z0-9()[\]^+.\-·•]+$/.test(norm)) return false;
    if (!/[A-Z]/.test(norm)) return false;
    let i = 0;
    while (i < norm.length) {
      const ch = norm[i];
      if (/[0-9()[\]^+.\-·•]/.test(ch)) { i++; continue; }
      const two = norm.slice(i, i + 2);
      if (_ELEMENTS.has(two)) { i += 2; continue; }
      if (_ELEMENTS.has(ch)) { i += 1; continue; }
      return false;
    }
    return true;
  }

  // Pretty display: H2SO4 → H₂SO₄
  function _prettyFormula(norm) {
    const sub = '₀₁₂₃₄₅₆₇₈₉';
    return String(norm).replace(/(\d+)/g, digits =>
      digits.split('').map(d => sub[+d] || d).join('')
    ).replace(/\^([+\-]?\d*)/g, (_, e) => {
      const sup = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻' };
      return (e || '').split('').map(c => sup[c] || c).join('');
    });
  }

  // Structure: atoms[{id,el,x,y}], bonds[{a,b,order}]
  // Coordinates in abstract units; renderer scales to fit.
  function _mol(name, atoms, bonds) {
    return { name, atoms, bonds };
  }
  function _a(id, el, x, y) { return { id, el, x, y }; }
  function _b(a, b, order) { return { a, b, order: order || 1 }; }

  // ── Russian names database (school chemistry) ──────────────────────────────
  const _CHEM_NAMES = {
    // Water / peroxide / hydrides
    H2O: 'вода', HOH: 'вода', H2O2: 'пероксид водорода', H2S: 'сероводород',
    H2Se: 'селенид водорода', NH3: 'аммиак', PH3: 'фосфин', AsH3: 'арсин',
    SiH4: 'силан', CH4: 'метан',

    // Diatomic gases / halogens
    H2: 'водород', O2: 'кислород', N2: 'азот', F2: 'фтор', Cl2: 'хлор',
    Br2: 'бром', I2: 'иод', O3: 'озон',

    // Oxides — nonmetals
    CO: 'угарный газ', CO2: 'углекислый газ', NO: 'оксид азота(II)',
    NO2: 'оксид азота(IV)', N2O: 'оксид азота(I)', N2O3: 'оксид азота(III)',
    N2O5: 'оксид азота(V)', SO2: 'сернистый газ', SO3: 'оксид серы(VI)',
    P2O5: 'оксид фосфора(V)', P4O10: 'оксид фосфора(V)', SiO2: 'диоксид кремния',
    Cl2O: 'оксид хлора(I)', Cl2O7: 'оксид хлора(VII)',

    // Oxides — metals
    Na2O: 'оксид натрия', K2O: 'оксид калия', Li2O: 'оксид лития',
    MgO: 'оксид магния', CaO: 'оксид кальция', BaO: 'оксид бария',
    Al2O3: 'оксид алюминия', FeO: 'оксид железа(II)', Fe2O3: 'оксид железа(III)',
    Fe3O4: 'оксид железа(II,III)', CuO: 'оксид меди(II)', Cu2O: 'оксид меди(I)',
    ZnO: 'оксид цинка', MnO2: 'оксид марганца(IV)', Cr2O3: 'оксид хрома(III)',
    CrO3: 'оксид хрома(VI)', PbO: 'оксид свинца(II)', PbO2: 'оксид свинца(IV)',
    Ag2O: 'оксид серебра', HgO: 'оксид ртути(II)', TiO2: 'оксид титана(IV)',
    SnO2: 'оксид олова(IV)',

    // Acids
    HF: 'плавиковая кислота', HCl: 'соляная кислота', HBr: 'бромоводородная кислота',
    HI: 'иодоводородная кислота', H2SO4: 'серная кислота', H2SO3: 'сернистая кислота',
    HNO3: 'азотная кислота', HNO2: 'азотистая кислота', H2CO3: 'угольная кислота',
    H3PO4: 'фосфорная кислота', H3PO3: 'фосфористая кислота', H3BO3: 'борная кислота',
    H2SiO3: 'кремниевая кислота', HClO: 'хлорноватистая кислота',
    HClO2: 'хлористая кислота', HClO3: 'хлорноватая кислота',
    HClO4: 'хлорная кислота', H2S2O3: 'тиосерная кислота',
    HCOOH: 'муравьиная кислота', CH3COOH: 'уксусная кислота', C2H4O2: 'уксусная кислота',
    C2H5COOH: 'пропионовая кислота', C6H5COOH: 'бензойная кислота',
    H2C2O4: 'щавелевая кислота', C2H2O4: 'щавелевая кислота',

    // Bases / hydroxides
    NaOH: 'гидроксид натрия', KOH: 'гидроксид калия', LiOH: 'гидроксид лития',
    'Ca(OH)2': 'гидроксид кальция', 'Ba(OH)2': 'гидроксид бария',
    'Mg(OH)2': 'гидроксид магния', 'Al(OH)3': 'гидроксид алюминия',
    'Fe(OH)2': 'гидроксид железа(II)', 'Fe(OH)3': 'гидроксид железа(III)',
    'Cu(OH)2': 'гидроксид меди(II)', 'Zn(OH)2': 'гидроксид цинка',
    NH4OH: 'гидроксид аммония', 'Cr(OH)3': 'гидроксид хрома(III)',

    // Salts — chlorides / halides
    NaCl: 'хлорид натрия', KCl: 'хлорид калия', LiCl: 'хлорид лития',
    CaCl2: 'хлорид кальция', MgCl2: 'хлорид магния', BaCl2: 'хлорид бария',
    AlCl3: 'хлорид алюминия', FeCl2: 'хлорид железа(II)', FeCl3: 'хлорид железа(III)',
    CuCl2: 'хлорид меди(II)', CuCl: 'хлорид меди(I)', ZnCl2: 'хлорид цинка',
    AgCl: 'хлорид серебра', NH4Cl: 'хлорид аммония', HgCl2: 'хлорид ртути(II)',
    NaBr: 'бромид натрия', KBr: 'бромид калия', NaI: 'иодид натрия',
    KI: 'иодид калия', AgBr: 'бромид серебра', AgI: 'иодид серебра',
    CaF2: 'фторид кальция', NaF: 'фторид натрия',

    // Salts — sulfates / sulfites / sulfides
    Na2SO4: 'сульфат натрия', K2SO4: 'сульфат калия', CaSO4: 'сульфат кальция',
    MgSO4: 'сульфат магния', BaSO4: 'сульфат бария', CuSO4: 'сульфат меди(II)',
    FeSO4: 'сульфат железа(II)', 'Fe2(SO4)3': 'сульфат железа(III)',
    ZnSO4: 'сульфат цинка', 'Al2(SO4)3': 'сульфат алюминия',
    Na2SO3: 'сульфит натрия', Na2S: 'сульфид натрия', FeS: 'сульфид железа(II)',
    CuS: 'сульфид меди(II)', ZnS: 'сульфид цинка', PbS: 'сульфид свинца(II)',
    Na2S2O3: 'тиосульфат натрия',

    // Salts — carbonates / bicarbonates / nitrates / phosphates
    Na2CO3: 'карбонат натрия', K2CO3: 'карбонат калия', CaCO3: 'карбонат кальция',
    MgCO3: 'карбонат магния', BaCO3: 'карбонат бария', 'CuCO3': 'карбонат меди(II)',
    NaHCO3: 'гидрокарбонат натрия', KHCO3: 'гидрокарбонат калия',
    'Ca(HCO3)2': 'гидрокарбонат кальция',
    NaNO3: 'нитрат натрия', KNO3: 'нитрат калия', AgNO3: 'нитрат серебра',
    'Ca(NO3)2': 'нитрат кальция',
    'Ba(NO3)2': 'нитрат бария', 'Pb(NO3)2': 'нитрат свинца(II)',
    'Cu(NO3)2': 'нитрат меди(II)', NH4NO3: 'нитрат аммония',
    Na3PO4: 'фосфат натрия', 'Ca3(PO4)2': 'фосфат кальция',
    'FePO4': 'фосфат железа(III)', 'Na2HPO4': 'гидрофосфат натрия',
    'NaH2PO4': 'дигидрофосфат натрия',

    // Other common salts / reagents
    KMnO4: 'перманганат калия', K2Cr2O7: 'дихромат калия', K2CrO4: 'хромат калия',
    Na2CrO4: 'хромат натрия', NaClO: 'гипохлорит натрия', CaOCl2: 'хлорная известь',
    'Ca(ClO)2': 'гипохлорит кальция', Na2SiO3: 'силикат натрия',
    CuSO4_5H2O: 'медный купорос', 'CuSO4·5H2O': 'медный купорос',
    FeSO4_7H2O: 'железный купорос', 'FeSO4·7H2O': 'железный купорос',
    Na2SO4_10H2O: 'глауберова соль', 'Na2SO4·10H2O': 'глауберова соль',
    CaSO4_2H2O: 'гипс', 'CaSO4·2H2O': 'гипс',
    KAlSO42_12H2O: 'квасцы', 'KAl(SO4)2·12H2O': 'квасцы',
    Na2O2: 'пероксид натрия', KO2: 'супероксид калия',
    CaC2: 'карбид кальция', Al4C3: 'карбид алюминия', Fe3C: 'карбид железа',
    SiC: 'карбид кремния', CS2: 'сероуглерод',

    // Organics — alkanes / alkenes / alkynes
    C2H6: 'этан', C2H4: 'этилен', C2H2: 'ацетилен', C3H8: 'пропан',
    C3H6: 'пропилен', C3H4: 'пропин', C4H10: 'бутан', C4H8: 'бутен',
    C4H6: 'бутадиен', C5H12: 'пентан', C6H14: 'гексан', C8H18: 'октан',
    C6H6: 'бензол', C7H8: 'толуол', C8H10: 'ксилол', C10H8: 'нафталин',

    // Organics — alcohols / ethers / carbonyls
    CH3OH: 'метанол', C2H5OH: 'этанол', C2H6O: 'этанол', CH3CH2OH: 'этанол',
    C3H7OH: 'пропанол', C3H8O: 'пропанол', C4H9OH: 'бутанол',
    C6H5OH: 'фенол', CH3OCH3: 'диметиловый эфир', CH3OCH2CH3: 'метилэтиловый эфир',
    HCHO: 'формальдегид', CH2O: 'формальдегид', CH3CHO: 'ацетальдегид',
    CH3COCH3: 'ацетон', C3H6O: 'ацетон',

    // Organics — other common
    CH3Cl: 'хлорметан', CH2Cl2: 'дихлорметан', CHCl3: 'хлороформ',
    CCl4: 'тетрахлорметан', C2H5Cl: 'хлорэтан', C2H3Cl: 'винилхлорид',
    C2H4Cl2: 'дихлорэтан', C6H5Cl: 'хлорбензол', C6H5NO2: 'нитробензол',
    C6H5NH2: 'анилин', C6H12O6: 'глюкоза', C12H22O11: 'сахароза',
    C2H4O2: 'уксусная кислота', CH3CO2H: 'уксусная кислота',
    CH2CHCN: 'акрилонитрил', C2H3N: 'акрилонитрил',
    HCN: 'циановодород', COCl2: 'фосген',

    // Ions / special school formulas often typed as compounds
    NH4: 'аммоний', OH: 'гидроксид', SO4: 'сульфат', CO3: 'карбонат',
    NO3: 'нитрат', PO4: 'фосфат', MnO4: 'перманганат', Cr2O7: 'дихромат',
  };

  function _nameFromMap(key) {
    if (!key) return null;
    if (_CHEM_NAMES[key]) return _CHEM_NAMES[key];
    const lower = String(key).toLowerCase();
    for (const k of Object.keys(_CHEM_NAMES)) {
      if (k.toLowerCase() === lower) return _CHEM_NAMES[k];
    }
    return null;
  }

  const _COMPOUNDS = {
    // Water
    H2O: _mol('вода', [
      _a('O','O',0,0), _a('H1','H',-1.1,0.7), _a('H2','H',1.1,0.7)
    ], [_b('O','H1'), _b('O','H2')]),

    // Sulfuric acid — matches reference layout
    H2SO4: _mol('серная кислота', [
      _a('S','S',0,0),
      _a('O1','O',1.35,-0.95), _a('O2','O',1.35,0.95),
      _a('O3','O',-1.35,-0.95), _a('O4','O',-1.35,0.95),
      _a('H1','H',-2.55,-0.95), _a('H2','H',-2.55,0.95)
    ], [
      _b('S','O1',2), _b('S','O2',2),
      _b('S','O3',1), _b('S','O4',1),
      _b('O3','H1'), _b('O4','H2')
    ]),

    // Nitric acid
    HNO3: _mol('азотная кислота', [
      _a('N','N',0,0),
      _a('O1','O',1.3,-0.85), _a('O2','O',1.3,0.85),
      _a('O3','O',-1.35,0), _a('H','H',-2.5,0)
    ], [
      _b('N','O1',2), _b('N','O2',1), _b('N','O3',1), _b('O3','H')
    ]),

    // Hydrochloric / hydrogen chloride
    HCl: _mol('соляная кислота', [
      _a('H','H',-1.0,0), _a('Cl','Cl',1.0,0)
    ], [_b('H','Cl')]),
    HCL: null, // alias filled below

    // Carbonic acid
    H2CO3: _mol('угольная кислота', [
      _a('C','C',0,0),
      _a('O1','O',1.35,0),
      _a('O2','O',-0.85,-1.15), _a('O3','O',-0.85,1.15),
      _a('H1','H',-2.1,-1.15), _a('H2','H',-2.1,1.15)
    ], [
      _b('C','O1',2), _b('C','O2'), _b('C','O3'),
      _b('O2','H1'), _b('O3','H2')
    ]),

    // Phosphoric acid
    H3PO4: _mol('фосфорная кислота', [
      _a('P','P',0,0),
      _a('O1','O',0,-1.45),
      _a('O2','O',1.35,0.75), _a('O3','O',-1.35,0.75), _a('O4','O',0,1.45),
      _a('H1','H',2.5,0.75), _a('H2','H',-2.5,0.75), _a('H3','H',0,2.55)
    ], [
      _b('P','O1',2), _b('P','O2'), _b('P','O3'), _b('P','O4'),
      _b('O2','H1'), _b('O3','H2'), _b('O4','H3')
    ]),

    // Carbon dioxide
    CO2: _mol('углекислый газ', [
      _a('C','C',0,0), _a('O1','O',-1.5,0), _a('O2','O',1.5,0)
    ], [_b('C','O1',2), _b('C','O2',2)]),

    // Carbon monoxide
    CO: _mol('угарный газ', [
      _a('C','C',-0.9,0), _a('O','O',0.9,0)
    ], [_b('C','O',3)]),

    // Methane
    CH4: _mol('метан', [
      _a('C','C',0,0),
      _a('H1','H',0,-1.35), _a('H2','H',1.25,0.7),
      _a('H3','H',-1.25,0.7), _a('H4','H',0,1.45)
    ], [_b('C','H1'), _b('C','H2'), _b('C','H3'), _b('C','H4')]),

    // Ammonia
    NH3: _mol('аммиак', [
      _a('N','N',0,0.2),
      _a('H1','H',0,-1.2), _a('H2','H',-1.2,0.95), _a('H3','H',1.2,0.95)
    ], [_b('N','H1'), _b('N','H2'), _b('N','H3')]),

    // Oxygen / nitrogen / hydrogen / chlorine
    O2: _mol('кислород', [
      _a('O1','O',-0.9,0), _a('O2','O',0.9,0)
    ], [_b('O1','O2',2)]),
    N2: _mol('азот', [
      _a('N1','N',-0.9,0), _a('N2','N',0.9,0)
    ], [_b('N1','N2',3)]),
    H2: _mol('водород', [
      _a('H1','H',-0.85,0), _a('H2','H',0.85,0)
    ], [_b('H1','H2')]),
    Cl2: _mol('хлор', [
      _a('Cl1','Cl',-1.1,0), _a('Cl2','Cl',1.1,0)
    ], [_b('Cl1','Cl2')]),

    // Sulfur oxides
    SO2: _mol('сернистый газ', [
      _a('S','S',0,0), _a('O1','O',-1.35,-0.85), _a('O2','O',1.35,-0.85)
    ], [_b('S','O1',2), _b('S','O2',2)]),
    SO3: _mol('оксид серы(VI)', [
      _a('S','S',0,0),
      _a('O1','O',0,-1.4), _a('O2','O',1.25,0.85), _a('O3','O',-1.25,0.85)
    ], [_b('S','O1',2), _b('S','O2',2), _b('S','O3',2)]),

    // Sodium chloride / hydroxide
    NaCl: _mol('хлорид натрия', [
      _a('Na','Na',-1.2,0), _a('Cl','Cl',1.2,0)
    ], [_b('Na','Cl')]),
    NaOH: _mol('гидроксид натрия', [
      _a('Na','Na',-1.6,0), _a('O','O',0.2,0), _a('H','H',1.5,0)
    ], [_b('Na','O'), _b('O','H')]),

    // Calcium hydroxide
    'Ca(OH)2': _mol('гидроксид кальция', [
      _a('Ca','Ca',0,0),
      _a('O1','O',-1.5,-1.0), _a('O2','O',1.5,-1.0),
      _a('H1','H',-2.6,-1.0), _a('H2','H',2.6,-1.0)
    ], [_b('Ca','O1'), _b('Ca','O2'), _b('O1','H1'), _b('O2','H2')]),

    // Ethanol
    C2H5OH: _mol('этанол', [
      _a('C1','C',-1.2,0), _a('C2','C',0.2,0),
      _a('O','O',1.4,0), _a('H','H',2.5,0),
      _a('H1','H',-1.8,-1.0), _a('H2','H',-1.8,1.0), _a('H3','H',-2.2,0),
      _a('H4','H',0.2,-1.15), _a('H5','H',0.2,1.15)
    ], [
      _b('C1','C2'), _b('C2','O'), _b('O','H'),
      _b('C1','H1'), _b('C1','H2'), _b('C1','H3'),
      _b('C2','H4'), _b('C2','H5')
    ]),
    C2H6O: null, // alias → ethanol

    // Acetic acid
    CH3COOH: _mol('уксусная кислота', [
      _a('C1','C',-1.3,0), _a('C2','C',0.2,0),
      _a('O1','O',1.1,-1.05), _a('O2','O',1.15,1.0),
      _a('H','H',2.35,1.0),
      _a('H1','H',-1.9,-1.0), _a('H2','H',-1.9,1.0), _a('H3','H',-2.4,0)
    ], [
      _b('C1','C2'), _b('C2','O1',2), _b('C2','O2'), _b('O2','H'),
      _b('C1','H1'), _b('C1','H2'), _b('C1','H3')
    ]),

    // Glucose (simplified chain label only — too complex; show skeletal stub)
    C6H12O6: _mol('глюкоза', [
      _a('C1','C',-2.4,0), _a('C2','C',-1.2,0), _a('C3','C',0,0),
      _a('C4','C',1.2,0), _a('C5','C',2.4,0), _a('C6','C',3.6,0),
      _a('O','O',-2.4,-1.2)
    ], [
      _b('C1','C2'), _b('C2','C3'), _b('C3','C4'), _b('C4','C5'), _b('C5','C6'),
      _b('C1','O',2)
    ]),

    // Ozone
    O3: _mol('озон', [
      _a('O1','O',-1.2,0.5), _a('O2','O',0,-0.5), _a('O3','O',1.2,0.5)
    ], [_b('O1','O2'), _b('O2','O3',2)]),

    // Hydrogen peroxide
    H2O2: _mol('пероксид водорода', [
      _a('O1','O',-0.7,0), _a('O2','O',0.7,0),
      _a('H1','H',-1.8,-0.7), _a('H2','H',1.8,0.7)
    ], [_b('O1','O2'), _b('O1','H1'), _b('O2','H2')]),

    // Hydrogen sulfide
    H2S: _mol('сероводород', [
      _a('S','S',0,0), _a('H1','H',-1.15,0.75), _a('H2','H',1.15,0.75)
    ], [_b('S','H1'), _b('S','H2')]),

    // Methanol
    CH3OH: _mol('метанол', [
      _a('C','C',-0.9,0), _a('O','O',0.7,0), _a('H','H',1.85,0),
      _a('H1','H',-1.5,-1.0), _a('H2','H',-1.5,1.0), _a('H3','H',-2.0,0)
    ], [_b('C','O'), _b('O','H'), _b('C','H1'), _b('C','H2'), _b('C','H3')]),

    // Benzene (simplified)
    C6H6: _mol('бензол', [
      _a('C1','C',0,-1.4), _a('C2','C',1.21,-0.7), _a('C3','C',1.21,0.7),
      _a('C4','C',0,1.4), _a('C5','C',-1.21,0.7), _a('C6','C',-1.21,-0.7)
    ], [
      _b('C1','C2',2), _b('C2','C3'), _b('C3','C4',2),
      _b('C4','C5'), _b('C5','C6',2), _b('C6','C1')
    ]),

    // Calcium carbonate
    CaCO3: _mol('карбонат кальция', [
      _a('Ca','Ca',-2.0,0),
      _a('C','C',0.4,0),
      _a('O1','O',1.7,0), _a('O2','O',-0.3,-1.2), _a('O3','O',-0.3,1.2)
    ], [
      _b('Ca','O2'), _b('C','O1',2), _b('C','O2'), _b('C','O3')
    ]),

    // Iron(III) oxide
    Fe2O3: _mol('оксид железа(III)', [
      _a('Fe1','Fe',-1.4,0), _a('Fe2','Fe',1.4,0),
      _a('O1','O',0,-1.2), _a('O2','O',-1.4,1.3), _a('O3','O',1.4,1.3)
    ], [
      _b('Fe1','O1'), _b('Fe2','O1'), _b('Fe1','O2'), _b('Fe2','O3')
    ]),

    // Silicon dioxide
    SiO2: _mol('диоксид кремния', [
      _a('Si','Si',0,0), _a('O1','O',-1.5,0), _a('O2','O',1.5,0)
    ], [_b('Si','O1',2), _b('Si','O2',2)]),

    // Potassium permanganate (simplified)
    KMnO4: _mol('перманганат калия', [
      _a('K','K',-2.2,0),
      _a('Mn','Mn',0.3,0),
      _a('O1','O',0.3,-1.4), _a('O2','O',1.6,0.8),
      _a('O3','O',-1.0,0.8), _a('O4','O',1.5,-0.7)
    ], [
      _b('K','O3'), _b('Mn','O1',2), _b('Mn','O2',2), _b('Mn','O3'), _b('Mn','O4')
    ]),

    // ── New structured compounds ─────────────────────────────────────────────

    // Halogens / diatomics
    F2: _mol('фтор', [
      _a('F1','F',-1.0,0), _a('F2','F',1.0,0)
    ], [_b('F1','F2')]),
    Br2: _mol('бром', [
      _a('Br1','Br',-1.15,0), _a('Br2','Br',1.15,0)
    ], [_b('Br1','Br2')]),
    I2: _mol('иод', [
      _a('I1','I',-1.2,0), _a('I2','I',1.2,0)
    ], [_b('I1','I2')]),

    // Nitrogen oxides
    NO: _mol('оксид азота(II)', [
      _a('N','N',-0.9,0), _a('O','O',0.9,0)
    ], [_b('N','O',2)]),
    NO2: _mol('оксид азота(IV)', [
      _a('N','N',0,0), _a('O1','O',-1.25,-0.85), _a('O2','O',1.25,-0.85)
    ], [_b('N','O1',2), _b('N','O2')]),
    N2O: _mol('оксид азота(I)', [
      _a('N1','N',-1.4,0), _a('N2','N',0,0), _a('O','O',1.4,0)
    ], [_b('N1','N2',2), _b('N2','O')]),

    // Simple metal oxides
    MgO: _mol('оксид магния', [
      _a('Mg','Mg',-1.2,0), _a('O','O',1.2,0)
    ], [_b('Mg','O')]),
    CaO: _mol('оксид кальция', [
      _a('Ca','Ca',-1.2,0), _a('O','O',1.2,0)
    ], [_b('Ca','O')]),
    CuO: _mol('оксид меди(II)', [
      _a('Cu','Cu',-1.2,0), _a('O','O',1.2,0)
    ], [_b('Cu','O')]),
    ZnO: _mol('оксид цинка', [
      _a('Zn','Zn',-1.2,0), _a('O','O',1.2,0)
    ], [_b('Zn','O')]),
    FeO: _mol('оксид железа(II)', [
      _a('Fe','Fe',-1.2,0), _a('O','O',1.2,0)
    ], [_b('Fe','O')]),
    Na2O: _mol('оксид натрия', [
      _a('Na1','Na',-1.5,-0.7), _a('Na2','Na',-1.5,0.7), _a('O','O',1.0,0)
    ], [_b('Na1','O'), _b('Na2','O')]),
    Al2O3: _mol('оксид алюминия', [
      _a('Al1','Al',-1.5,0), _a('Al2','Al',1.5,0),
      _a('O1','O',0,-1.2), _a('O2','O',-1.5,1.3), _a('O3','O',1.5,1.3)
    ], [_b('Al1','O1'), _b('Al2','O1'), _b('Al1','O2'), _b('Al2','O3')]),

    // Halogen acids
    HF: _mol('плавиковая кислота', [
      _a('H','H',-1.0,0), _a('F','F',1.0,0)
    ], [_b('H','F')]),
    HBr: _mol('бромоводородная кислота', [
      _a('H','H',-1.1,0), _a('Br','Br',1.1,0)
    ], [_b('H','Br')]),
    HI: _mol('иодоводородная кислота', [
      _a('H','H',-1.15,0), _a('I','I',1.15,0)
    ], [_b('H','I')]),

    // Bases
    KOH: _mol('гидроксид калия', [
      _a('K','K',-1.6,0), _a('O','O',0.2,0), _a('H','H',1.5,0)
    ], [_b('K','O'), _b('O','H')]),
    'Ba(OH)2': _mol('гидроксид бария', [
      _a('Ba','Ba',0,0),
      _a('O1','O',-1.5,-1.0), _a('O2','O',1.5,-1.0),
      _a('H1','H',-2.6,-1.0), _a('H2','H',2.6,-1.0)
    ], [_b('Ba','O1'), _b('Ba','O2'), _b('O1','H1'), _b('O2','H2')]),
    'Mg(OH)2': _mol('гидроксид магния', [
      _a('Mg','Mg',0,0),
      _a('O1','O',-1.5,-1.0), _a('O2','O',1.5,-1.0),
      _a('H1','H',-2.6,-1.0), _a('H2','H',2.6,-1.0)
    ], [_b('Mg','O1'), _b('Mg','O2'), _b('O1','H1'), _b('O2','H2')]),

    // Common salts (ionic two-atom layouts)
    KCl: _mol('хлорид калия', [
      _a('K','K',-1.2,0), _a('Cl','Cl',1.2,0)
    ], [_b('K','Cl')]),
    KBr: _mol('бромид калия', [
      _a('K','K',-1.25,0), _a('Br','Br',1.25,0)
    ], [_b('K','Br')]),
    KI: _mol('иодид калия', [
      _a('K','K',-1.3,0), _a('I','I',1.3,0)
    ], [_b('K','I')]),
    AgNO3: _mol('нитрат серебра', [
      _a('Ag','Ag',-2.0,0),
      _a('N','N',0.4,0),
      _a('O1','O',1.7,0), _a('O2','O',-0.3,-1.2), _a('O3','O',-0.3,1.2)
    ], [
      _b('Ag','O2'), _b('N','O1',2), _b('N','O2'), _b('N','O3')
    ]),
    Na2CO3: _mol('карбонат натрия', [
      _a('Na1','Na',-2.2,-0.8), _a('Na2','Na',-2.2,0.8),
      _a('C','C',0.4,0),
      _a('O1','O',1.7,0), _a('O2','O',-0.3,-1.2), _a('O3','O',-0.3,1.2)
    ], [
      _b('Na1','O2'), _b('Na2','O3'), _b('C','O1',2), _b('C','O2'), _b('C','O3')
    ]),
    NaHCO3: _mol('гидрокарбонат натрия', [
      _a('Na','Na',-2.2,0),
      _a('C','C',0.3,0),
      _a('O1','O',1.6,0), _a('O2','O',-0.4,-1.15), _a('O3','O',-0.4,1.15),
      _a('H','H',-1.5,1.15)
    ], [
      _b('Na','O2'), _b('C','O1',2), _b('C','O2'), _b('C','O3'), _b('O3','H')
    ]),
    CuSO4: _mol('сульфат меди(II)', [
      _a('Cu','Cu',-2.2,0),
      _a('S','S',0.4,0),
      _a('O1','O',1.7,-0.9), _a('O2','O',1.7,0.9),
      _a('O3','O',-0.7,-1.1), _a('O4','O',-0.7,1.1)
    ], [
      _b('Cu','O3'), _b('S','O1',2), _b('S','O2',2), _b('S','O3'), _b('S','O4')
    ]),
    Na2SO4: _mol('сульфат натрия', [
      _a('Na1','Na',-2.3,-0.8), _a('Na2','Na',-2.3,0.8),
      _a('S','S',0.4,0),
      _a('O1','O',1.7,-0.9), _a('O2','O',1.7,0.9),
      _a('O3','O',-0.7,-1.1), _a('O4','O',-0.7,1.1)
    ], [
      _b('Na1','O3'), _b('Na2','O4'),
      _b('S','O1',2), _b('S','O2',2), _b('S','O3'), _b('S','O4')
    ]),
    NH4Cl: _mol('хлорид аммония', [
      _a('N','N',-1.0,0),
      _a('H1','H',-1.0,-1.2), _a('H2','H',-2.1,0.6), _a('H3','H',0.1,0.6),
      _a('H4','H',-1.0,1.3),
      _a('Cl','Cl',1.8,0)
    ], [
      _b('N','H1'), _b('N','H2'), _b('N','H3'), _b('N','H4'), _b('N','Cl')
    ]),
    CaCl2: _mol('хлорид кальция', [
      _a('Ca','Ca',0,0), _a('Cl1','Cl',-1.6,0), _a('Cl2','Cl',1.6,0)
    ], [_b('Ca','Cl1'), _b('Ca','Cl2')]),
    FeCl3: _mol('хлорид железа(III)', [
      _a('Fe','Fe',0,0),
      _a('Cl1','Cl',0,-1.5), _a('Cl2','Cl',1.35,0.85), _a('Cl3','Cl',-1.35,0.85)
    ], [_b('Fe','Cl1'), _b('Fe','Cl2'), _b('Fe','Cl3')]),
    ZnCl2: _mol('хлорид цинка', [
      _a('Zn','Zn',0,0), _a('Cl1','Cl',-1.5,0), _a('Cl2','Cl',1.5,0)
    ], [_b('Zn','Cl1'), _b('Zn','Cl2')]),
    BaCl2: _mol('хлорид бария', [
      _a('Ba','Ba',0,0), _a('Cl1','Cl',-1.6,0), _a('Cl2','Cl',1.6,0)
    ], [_b('Ba','Cl1'), _b('Ba','Cl2')]),
    KNO3: _mol('нитрат калия', [
      _a('K','K',-2.0,0),
      _a('N','N',0.4,0),
      _a('O1','O',1.7,0), _a('O2','O',-0.3,-1.2), _a('O3','O',-0.3,1.2)
    ], [
      _b('K','O2'), _b('N','O1',2), _b('N','O2'), _b('N','O3')
    ]),
    NaNO3: _mol('нитрат натрия', [
      _a('Na','Na',-2.0,0),
      _a('N','N',0.4,0),
      _a('O1','O',1.7,0), _a('O2','O',-0.3,-1.2), _a('O3','O',-0.3,1.2)
    ], [
      _b('Na','O2'), _b('N','O1',2), _b('N','O2'), _b('N','O3')
    ]),

    // Organics
    C2H6: _mol('этан', [
      _a('C1','C',-0.9,0), _a('C2','C',0.9,0),
      _a('H1','H',-1.5,-1.0), _a('H2','H',-1.5,1.0), _a('H3','H',-1.9,0),
      _a('H4','H',1.5,-1.0), _a('H5','H',1.5,1.0), _a('H6','H',1.9,0)
    ], [
      _b('C1','C2'),
      _b('C1','H1'), _b('C1','H2'), _b('C1','H3'),
      _b('C2','H4'), _b('C2','H5'), _b('C2','H6')
    ]),
    C2H4: _mol('этилен', [
      _a('C1','C',-0.9,0), _a('C2','C',0.9,0),
      _a('H1','H',-1.6,-0.95), _a('H2','H',-1.6,0.95),
      _a('H3','H',1.6,-0.95), _a('H4','H',1.6,0.95)
    ], [
      _b('C1','C2',2),
      _b('C1','H1'), _b('C1','H2'), _b('C2','H3'), _b('C2','H4')
    ]),
    C2H2: _mol('ацетилен', [
      _a('C1','C',-0.85,0), _a('C2','C',0.85,0),
      _a('H1','H',-2.1,0), _a('H2','H',2.1,0)
    ], [_b('C1','C2',3), _b('C1','H1'), _b('C2','H2')]),
    C3H8: _mol('пропан', [
      _a('C1','C',-1.5,0), _a('C2','C',0,0), _a('C3','C',1.5,0),
      _a('H1','H',-2.1,-1.0), _a('H2','H',-2.1,1.0),
      _a('H3','H',0,-1.15), _a('H4','H',0,1.15),
      _a('H5','H',2.1,-1.0), _a('H6','H',2.1,1.0)
    ], [
      _b('C1','C2'), _b('C2','C3'),
      _b('C1','H1'), _b('C1','H2'), _b('C2','H3'), _b('C2','H4'),
      _b('C3','H5'), _b('C3','H6')
    ]),
    HCOOH: _mol('муравьиная кислота', [
      _a('C','C',0,0),
      _a('O1','O',1.2,-0.95), _a('O2','O',1.2,0.95),
      _a('H1','H',-1.3,0), _a('H2','H',2.35,0.95)
    ], [
      _b('C','O1',2), _b('C','O2'), _b('C','H1'), _b('O2','H2')
    ]),
    CH2O: _mol('формальдегид', [
      _a('C','C',0,0), _a('O','O',1.35,0),
      _a('H1','H',-0.9,-1.0), _a('H2','H',-0.9,1.0)
    ], [_b('C','O',2), _b('C','H1'), _b('C','H2')]),
    CH3CHO: _mol('ацетальдегид', [
      _a('C1','C',-1.2,0), _a('C2','C',0.3,0),
      _a('O','O',1.4,-0.9),
      _a('H1','H',-1.8,-1.0), _a('H2','H',-1.8,1.0), _a('H3','H',-2.2,0),
      _a('H4','H',0.3,1.2)
    ], [
      _b('C1','C2'), _b('C2','O',2), _b('C2','H4'),
      _b('C1','H1'), _b('C1','H2'), _b('C1','H3')
    ]),
    CH3COCH3: _mol('ацетон', [
      _a('C1','C',-1.5,0), _a('C2','C',0,0), _a('C3','C',1.5,0),
      _a('O','O',0,-1.35),
      _a('H1','H',-2.1,-1.0), _a('H2','H',-2.1,1.0),
      _a('H3','H',2.1,-1.0), _a('H4','H',2.1,1.0)
    ], [
      _b('C1','C2'), _b('C2','C3'), _b('C2','O',2),
      _b('C1','H1'), _b('C1','H2'), _b('C3','H3'), _b('C3','H4')
    ]),
  };

  // Aliases
  _COMPOUNDS.HCL = _COMPOUNDS.HCl;
  _COMPOUNDS.C2H6O = _COMPOUNDS.C2H5OH;
  _COMPOUNDS.HOH = _COMPOUNDS.H2O;
  _COMPOUNDS.CH3CH2OH = _COMPOUNDS.C2H5OH;
  _COMPOUNDS.C2H4O2 = _COMPOUNDS.CH3COOH;
  _COMPOUNDS.CH3CO2H = _COMPOUNDS.CH3COOH;
  _COMPOUNDS.HCHO = _COMPOUNDS.CH2O;
  _COMPOUNDS.C3H6O = _COMPOUNDS.CH3COCH3;
  _COMPOUNDS.ETHENE = _COMPOUNDS.C2H4;
  _COMPOUNDS.ETHYLENE = _COMPOUNDS.C2H4;
  _COMPOUNDS.ACETYLENE = _COMPOUNDS.C2H2;
  _COMPOUNDS.ETHYNE = _COMPOUNDS.C2H2;

  // Presets for formula editor (latex + label) — ~40 school-useful entries
  const _CHEM_PRESETS = [
    { label: 'Вода', latex: 'H_{2}O' },
    { label: 'Серная к-та', latex: 'H_{2}SO_{4}' },
    { label: 'Азотная к-та', latex: 'HNO_{3}' },
    { label: 'Соляная к-та', latex: 'HCl' },
    { label: 'Угольная к-та', latex: 'H_{2}CO_{3}' },
    { label: 'Фосфорная к-та', latex: 'H_{3}PO_{4}' },
    { label: 'Уксусная к-та', latex: 'CH_{3}COOH' },
    { label: 'Муравьиная к-та', latex: 'HCOOH' },
    { label: 'CO₂', latex: 'CO_{2}' },
    { label: 'CO', latex: 'CO' },
    { label: 'SO₂', latex: 'SO_{2}' },
    { label: 'NO₂', latex: 'NO_{2}' },
    { label: 'Метан', latex: 'CH_{4}' },
    { label: 'Этан', latex: 'C_{2}H_{6}' },
    { label: 'Этилен', latex: 'C_{2}H_{4}' },
    { label: 'Ацетилен', latex: 'C_{2}H_{2}' },
    { label: 'Пропан', latex: 'C_{3}H_{8}' },
    { label: 'Аммиак', latex: 'NH_{3}' },
    { label: 'Метанол', latex: 'CH_{3}OH' },
    { label: 'Этанол', latex: 'C_{2}H_{5}OH' },
    { label: 'Ацетон', latex: 'CH_{3}COCH_{3}' },
    { label: 'Бензол', latex: 'C_{6}H_{6}' },
    { label: 'Глюкоза', latex: 'C_{6}H_{12}O_{6}' },
    { label: 'NaOH', latex: 'NaOH' },
    { label: 'KOH', latex: 'KOH' },
    { label: 'Ca(OH)₂', latex: 'Ca(OH)_{2}' },
    { label: 'NaCl', latex: 'NaCl' },
    { label: 'KCl', latex: 'KCl' },
    { label: 'Na₂CO₃', latex: 'Na_{2}CO_{3}' },
    { label: 'NaHCO₃', latex: 'NaHCO_{3}' },
    { label: 'CaCO₃', latex: 'CaCO_{3}' },
    { label: 'CuSO₄', latex: 'CuSO_{4}' },
    { label: 'AgNO₃', latex: 'AgNO_{3}' },
    { label: 'KMnO₄', latex: 'KMnO_{4}' },
    { label: 'O₂', latex: 'O_{2}' },
    { label: 'H₂', latex: 'H_{2}' },
    { label: 'N₂', latex: 'N_{2}' },
    { label: 'Cl₂', latex: 'Cl_{2}' },
    { label: 'H₂O₂', latex: 'H_{2}O_{2}' },
    { label: 'H₂S', latex: 'H_{2}S' },
  ];

  function lookupChem(raw) {
    const norm = _normalizeChemFormula(raw);
    if (!norm) return null;
    const key = norm.replace(/·/g, '');
    let info = _COMPOUNDS[key] || _COMPOUNDS[key.toUpperCase()] || null;
    // try case-preserving element keys already in map
    if (!info) {
      for (const k of Object.keys(_COMPOUNDS)) {
        if (k.toLowerCase() === key.toLowerCase() && _COMPOUNDS[k]) {
          info = _COMPOUNDS[k];
          break;
        }
      }
    }
    const chem = _looksLikeChem(norm);
    if (!chem && !info) return null;
    let atoms = info ? info.atoms : null;
    let bonds = info ? info.bonds : null;
    // Unknown compound: synthesize a structural sketch from the formula
    if ((!atoms || !atoms.length) && chem) {
      const synth = _synthesizeStructure(key);
      if (synth) { atoms = synth.atoms; bonds = synth.bonds; }
    }
    return {
      key: key,
      pretty: _prettyFormula(key),
      name: (info && info.name) || _nameFromMap(key) || 'химическое соединение',
      atoms: atoms,
      bonds: bonds,
      known: !!info,
      synthesized: !!(chem && !info)
    };
  }

  /** Parse H2SO4 / Ca(OH)2 → {H:2,S:1,O:4} */
  function _countAtoms(formula) {
    let s = String(formula || '').replace(/·/g, '').replace(/\^[^A-Z(]*/g, '');
    if (!s) return null;
    // Expand parentheses: Ca(OH)2 → CaOH OH, then recount (simple one-level + nested)
    for (let guard = 0; guard < 8; guard++) {
      const m = s.match(/\(([A-Za-z0-9]+)\)(\d*)/);
      if (!m) break;
      const inner = m[1];
      const mult = m[2] ? +m[2] : 1;
      s = s.slice(0, m.index) + inner.repeat(Math.min(mult, 12)) + s.slice(m.index + m[0].length);
    }
    const counts = {};
    const re = /([A-Z][a-z]?)(\d*)/g;
    let mm;
    while ((mm = re.exec(s)) !== null) {
      const el = mm[1];
      if (!_ELEMENTS.has(el)) continue;
      const n = mm[2] ? +mm[2] : 1;
      counts[el] = (counts[el] || 0) + Math.min(n, 48);
    }
    return Object.keys(counts).length ? counts : null;
  }

  /**
   * Build a schematic molecule for unknown formulas:
   * heavy atoms form a backbone; hydrogens attach around them.
   */
  function _synthesizeStructure(key) {
    const counts = _countAtoms(key);
    if (!counts) return null;
    const heavyOrder = ['C','Si','B','P','N','S','Se','As','I','Br','Cl','F','O','Na','K','Ca','Mg','Al','Fe','Cu','Zn','Ag','Mn','Cr','Ti','Ba','Li','Be'];
    const heavies = [];
    const hydrogens = [];
    Object.keys(counts).forEach(el => {
      for (let i = 0; i < counts[el]; i++) {
        if (el === 'H') hydrogens.push(el);
        else heavies.push(el);
      }
    });
    // Prefer typical center atoms first
    heavies.sort((a, b) => {
      const ia = heavyOrder.indexOf(a); const ib = heavyOrder.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    if (!heavies.length && !hydrogens.length) return null;

    const atoms = [];
    const bonds = [];
    let uid = 0;
    const mk = (el, x, y) => {
      const id = 's' + (uid++);
      atoms.push({ id, el, x, y });
      return id;
    };

    if (!heavies.length) {
      // Only H — small cluster
      const n = Math.min(hydrogens.length, 8);
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
        mk('H', Math.cos(ang) * 0.9, Math.sin(ang) * 0.9);
      }
      for (let i = 1; i < atoms.length; i++) bonds.push({ a: atoms[0].id, b: atoms[i].id, order: 1 });
      return { atoms, bonds };
    }

    // Backbone: place heavy atoms along a zigzag / ring
    const nH = heavies.length;
    const backboneIds = [];
    if (nH === 1) {
      backboneIds.push(mk(heavies[0], 0, 0));
    } else if (nH <= 6) {
      const R = Math.max(1.1, 0.55 * nH);
      for (let i = 0; i < nH; i++) {
        const ang = -Math.PI / 2 + (2 * Math.PI * i) / nH;
        backboneIds.push(mk(heavies[i], Math.cos(ang) * R, Math.sin(ang) * R));
      }
      for (let i = 0; i < nH; i++) {
        bonds.push({ a: backboneIds[i], b: backboneIds[(i + 1) % nH], order: 1 });
      }
    } else {
      // Zigzag chain for larger formulas
      for (let i = 0; i < nH; i++) {
        const x = (i - (nH - 1) / 2) * 1.15;
        const y = (i % 2 === 0) ? 0 : 0.7;
        backboneIds.push(mk(heavies[i], x, y));
        if (i > 0) bonds.push({ a: backboneIds[i - 1], b: backboneIds[i], order: 1 });
      }
    }

    // Attach hydrogens around backbone atoms
    const hCount = Math.min(hydrogens.length, 36);
    for (let i = 0; i < hCount; i++) {
      const bi = i % backboneIds.length;
      const parent = atoms.find(a => a.id === backboneIds[bi]);
      if (!parent) continue;
      const around = 1 + Math.floor(i / backboneIds.length);
      const ang = -Math.PI / 2 + (2 * Math.PI * (i + around * 0.37)) / Math.max(3, Math.ceil(hCount / backboneIds.length) + 1);
      const hx = parent.x + Math.cos(ang) * 0.95;
      const hy = parent.y + Math.sin(ang) * 0.95;
      const hid = mk('H', hx, hy);
      bonds.push({ a: parent.id, b: hid, order: 1 });
    }
    return { atoms, bonds };
  }

  function isChemFormula(raw) {
    return !!lookupChem(raw);
  }

  // ── Draw structural diagram onto canvas ───────────────────────────────────
  // Canvas is always transparent; background/blur/opacity live on the DOM element.
  // opts.showFormula (default true) — draw formula text at top
  // opts.showName (default true) — draw compound name
  function renderChemStructure(raw, opts) {
    opts = opts || {};
    const info = lookupChem(raw);
    if (!info) return { error: 'not chem', dataUrl: null };

    const W = opts.w || 720;
    const H = opts.h || 640;
    const fg = opts.fg || '#111111';
    const isDark = !!opts.isDark;
    const showFormula = opts.showFormula !== false;
    const showName = opts.showName !== false;

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const formulaFs = Math.round(W * 0.11);
    const nameFs = Math.round(W * 0.055);
    const padTop = Math.round(H * 0.08);
    let headerH = padTop;

    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (showFormula) {
      ctx.font = '700 ' + formulaFs + 'px "Times New Roman", "Liberation Serif", Georgia, serif';
      ctx.fillText(info.pretty, W / 2, padTop);
      headerH = padTop + formulaFs * 1.15;
    }
    if (showName) {
      ctx.font = '600 ' + nameFs + 'px "Times New Roman", "Liberation Serif", Georgia, serif';
      ctx.fillText(info.name, W / 2, headerH);
      headerH += nameFs * 1.6;
    } else if (showFormula) {
      headerH += nameFs * 0.4;
    }

    // Structure area
    const structTop = Math.max(headerH, Math.round(H * 0.04));
    const structBottom = H - Math.round(H * 0.06);
    const structH = Math.max(40, structBottom - structTop);
    const structMidY = structTop + structH / 2;

    if (info.atoms && info.atoms.length) {
      _drawMolecule(ctx, info.atoms, info.bonds, W / 2, structMidY, Math.min(W * 0.78, structH * 1.1), fg);
    } else {
      ctx.font = 'italic ' + Math.round(nameFs * 0.85) + 'px Georgia, serif';
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = fg;
      ctx.fillText('структура не найдена', W / 2, structMidY);
      ctx.globalAlpha = 1;
    }

    return {
      dataUrl: cv.toDataURL('image/png'),
      chemKey: info.key,
      chemName: info.name,
      pretty: info.pretty,
      known: !!info.known,
      synthesized: !!info.synthesized,
      error: null
    };
  }

  function _drawMolecule(ctx, atoms, bonds, cx, cy, box, color) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    atoms.forEach(a => {
      if (a.x < minX) minX = a.x; if (a.x > maxX) maxX = a.x;
      if (a.y < minY) minY = a.y; if (a.y > maxY) maxY = a.y;
    });
    const spanX = Math.max(0.5, maxX - minX);
    const spanY = Math.max(0.5, maxY - minY);
    const scale = Math.min(box / spanX, box / spanY) * 0.72;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const map = {};
    atoms.forEach(a => {
      map[a.id] = {
        x: cx + (a.x - midX) * scale,
        y: cy + (a.y - midY) * scale,
        el: a.el
      };
    });

    const atomFs = Math.max(22, Math.round(scale * 0.55));
    const bondW = Math.max(2.5, scale * 0.06);
    const bondGap = Math.max(4, scale * 0.12);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    (bonds || []).forEach(bd => {
      const A = map[bd.a], B = map[bd.b];
      if (!A || !B) return;
      const dx = B.x - A.x, dy = B.y - A.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      // Stop bonds before atom labels (no punched circles)
      const shrink = atomFs * 0.72;
      const x1 = A.x + ux * shrink, y1 = A.y + uy * shrink;
      const x2 = B.x - ux * shrink, y2 = B.y - uy * shrink;
      const px = -uy, py = ux;
      const order = bd.order || 1;
      ctx.lineWidth = bondW;
      if (order === 1) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      } else if (order === 2) {
        const o = bondGap * 0.55;
        ctx.beginPath(); ctx.moveTo(x1 + px * o, y1 + py * o); ctx.lineTo(x2 + px * o, y2 + py * o); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1 - px * o, y1 - py * o); ctx.lineTo(x2 - px * o, y2 - py * o); ctx.stroke();
      } else {
        const o = bondGap * 0.7;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1 + px * o, y1 + py * o); ctx.lineTo(x2 + px * o, y2 + py * o); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1 - px * o, y1 - py * o); ctx.lineTo(x2 - px * o, y2 - py * o); ctx.stroke();
      }
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + atomFs + 'px "Times New Roman", "Liberation Serif", Georgia, serif';
    ctx.fillStyle = color;
    atoms.forEach(a => {
      const p = map[a.id];
      if (!p) return;
      ctx.fillText(p.el, p.x, p.y + 1);
    });
  }

  // Default: transparent background; text color follows theme
  function chemThemeColors(theme) {
    const isDark = theme ? theme.dark !== false : true;
    let fg = isDark ? '#ffffff' : '#111111';
    try {
      if (theme && typeof window._resolveSchemeColor === 'function') {
        const c = window._resolveSchemeColor({ col: 7, row: 0 }, theme);
        if (c) fg = c;
      }
    } catch (e) {}
    return { bg: '', fg: fg, isDark: isDark };
  }

  window._chemLookup = lookupChem;
  window._chemIsFormula = isChemFormula;
  window._chemNormalize = _normalizeChemFormula;
  window._chemPretty = _prettyFormula;
  window._chemRender = renderChemStructure;
  window._chemPresets = _CHEM_PRESETS;
  window._chemThemeColors = chemThemeColors;

  /** H2SO4 → H_{2}SO_{4} for MathJax */
  function formulaKeyToLatex(key) {
    if (!key) return '';
    return String(key)
      .replace(/([A-Za-z\)\]])(\d+)/g, '$1_{$2}')
      .replace(/\^([+\-]?\d+)/g, '^{$1}');
  }
  window._chemKeyToLatex = formulaKeyToLatex;

  /**
   * Найти ключ формулы по русскому названию из речи
   * («азотистой кислоты» → HNO2, «серная кислота» → H2SO4).
   */
  function findChemBySpokenName(spoken) {
    if (!spoken) return null;
    const s = String(spoken).toLowerCase().replace(/ё/g, 'е')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (s.length < 3) return null;
    let bestKey = null, bestScore = 0;
    const entries = Object.assign({}, _CHEM_NAMES);
    // also compound names from _COMPOUNDS
    try {
      for (const k of Object.keys(_COMPOUNDS)) {
        if (_COMPOUNDS[k] && _COMPOUNDS[k].name) entries[k] = _COMPOUNDS[k].name;
      }
    } catch (e) {}
    for (const [key, name] of Object.entries(entries)) {
      if (!name) continue;
      const words = String(name).toLowerCase().replace(/ё/g, 'е').split(/\s+/);
      let score = 0;
      for (const w of words) {
        const stem = w.replace(/(ая|ой|ый|ое|ая|ую|ые|ых|ым|ом|ами|ах|ия|ии|ию|ие|ей|ью|я|ы|е|у|а)$/u, '');
        if (stem.length >= 3 && s.includes(stem)) score += stem.length;
        else if (w.length >= 4 && s.includes(w.slice(0, Math.min(5, w.length)))) score += 3;
      }
      if (score > bestScore) { bestScore = score; bestKey = key; }
    }
    return bestScore >= 5 ? bestKey : null;
  }
  window._chemFindBySpokenName = findChemBySpokenName;

})();
