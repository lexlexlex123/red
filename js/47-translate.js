// ══════════════════════════════════════════════════════════════════
// 47-translate.js — EN ↔ RU перевод и транскрипция текстовых блоков
// Перевод: подпись = целевой язык («английский» / «russian»).
// Транскрипция: EN → IPA, RU → латиница (Google dt=rm; RU также локально).
// Движок перевода: Google Translate (сеть) → Chrome Translator → Bergamot.
// ══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  let _busy = false;
  const _chromeTranslators = Object.create(null);

  // ── Bergamot (локальные модели) ─────────────────────────────────
  let _bergCall = null;
  let _bergWorker = null;
  const _bergLoaded = Object.create(null);
  let _bergInitPromise = null;

  const BERG_PAIR = {
    'en|ru': {
      dir: 'enru',
      model: 'model.enru.intgemm.alphas.bin',
      lex: 'lex.50.50.enru.s2t.bin',
      vocab: 'vocab.enru.spm'
    },
    'ru|en': {
      dir: 'ruen',
      model: 'model.ruen.intgemm.alphas.bin',
      lex: 'lex.50.50.ruen.s2t.bin',
      vocab: 'vocab.ruen.spm'
    }
  };

  function _toast(msg, type) {
    if (typeof toast === 'function') toast(msg, type);
  }

  function _t(key, fallback) {
    try {
      if (typeof t === 'function') {
        const v = t(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    return fallback;
  }

  function _pageUrl(rel) {
    try {
      return new URL(rel, window.location.href).href;
    } catch (e) {
      return rel;
    }
  }

  /** Доля кириллицы/латиницы → 'ru' | 'en' | 'mixed' | 'empty' */
  function detectTextLang(text) {
    const raw = String(text || '');
    const letters = raw.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, '');
    if (!letters.length) return 'empty';
    let cyr = 0, lat = 0;
    for (let i = 0; i < letters.length; i++) {
      if (/[а-яА-ЯёЁ]/.test(letters[i])) cyr++;
      else lat++;
    }
    const total = cyr + lat;
    if (cyr / total >= 0.7) return 'ru';
    if (lat / total >= 0.7) return 'en';
    return 'mixed';
  }

  /** Цель перевода и подпись кнопки по тексту */
  function translateTargetFromText(text) {
    const det = detectTextLang(text);
    if (det === 'en') {
      return { from: 'en', to: 'ru', label: 'russian', detected: det };
    }
    return {
      from: 'ru',
      to: 'en',
      label: 'английский',
      detected: det
    };
  }

  function _plainFromRoot(root) {
    if (!root) return '';
    if (typeof _toCharObjs === 'function') {
      try {
        return _toCharObjs(root.innerHTML).map(function (o) { return o.ch; }).join('');
      } catch (e) {}
    }
    return (root.innerText || root.textContent || '').replace(/\u200b/g, '');
  }

  function _rebuildChars(oldChars, newText) {
    const oldLines = [[]];
    for (let i = 0; i < oldChars.length; i++) {
      const c = oldChars[i];
      if (c.ch === '\n') oldLines.push([]);
      else oldLines[oldLines.length - 1].push(c);
    }
    const newLines = String(newText).split('\n');
    const out = [];
    for (let li = 0; li < newLines.length; li++) {
      if (li) out.push({ ch: '\n', style: {} });
      const srcLine = oldLines[Math.min(li, oldLines.length - 1)] || [];
      let base = {};
      for (let j = 0; j < srcLine.length; j++) {
        if (srcLine[j].style && Object.keys(srcLine[j].style).length) {
          base = Object.assign({}, srcLine[j].style);
          break;
        }
      }
      if (!Object.keys(base).length && oldChars.length) {
        for (let j = 0; j < oldChars.length; j++) {
          if (oldChars[j].ch !== '\n' && oldChars[j].style) {
            base = Object.assign({}, oldChars[j].style);
            break;
          }
        }
      }
      const line = newLines[li];
      for (let k = 0; k < line.length; k++) {
        out.push({ ch: line[k], style: Object.assign({}, base) });
      }
    }
    return out;
  }

  async function _detectSourceApi(text, fallback) {
    if ('LanguageDetector' in self) {
      try {
        const avail = await LanguageDetector.availability();
        if (avail === 'available' || avail === 'downloadable') {
          const detector = await LanguageDetector.create({
            monitor: function (m) {
              m.addEventListener('downloadprogress', function () {});
            }
          });
          const results = await detector.detect(text);
          if (results && results[0]) {
            const code = results[0].detectedLanguage;
            if (code === 'en' || code === 'ru') return code;
          }
        }
      } catch (e) {}
    }
    return fallback;
  }

  function _ensureBergamot() {
    if (_bergInitPromise) return _bergInitPromise;
    _bergInitPromise = (async function () {
      if (typeof Worker === 'undefined') throw new Error('NO_WORKER');
      const workerUrl = _pageUrl('libs/bergamot/translator-worker.js');
      const worker = new Worker(workerUrl);
      _bergWorker = worker;
      let serial = 0;
      const pending = new Map();
      worker.addEventListener('message', function (ev) {
        const data = ev.data || {};
        const id = data.id;
        if (!pending.has(id)) return;
        const p = pending.get(id);
        pending.delete(id);
        if (data.error) {
          const err = new Error((data.error && data.error.message) || 'Bergamot worker error');
          if (data.error && data.error.stack) err.stack = data.error.stack;
          p.reject(err);
        } else {
          p.resolve(data.result);
        }
      });
      worker.addEventListener('error', function (e) {
        console.warn('[bergamot worker]', e);
      });
      _bergCall = function (name) {
        const args = Array.prototype.slice.call(arguments, 1);
        return new Promise(function (resolve, reject) {
          const id = ++serial;
          pending.set(id, { resolve: resolve, reject: reject });
          worker.postMessage({ id: id, name: name, args: args });
        });
      };
      await _bergCall('initialize', { cacheSize: 2048, useNativeIntGemm: false });
    })().catch(function (e) {
      _bergInitPromise = null;
      _bergCall = null;
      if (_bergWorker) {
        try { _bergWorker.terminate(); } catch (x) {}
        _bergWorker = null;
      }
      throw e;
    });
    return _bergInitPromise;
  }

  async function _fetchBuf(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('MODEL_FETCH ' + url + ' ' + res.status);
    return await res.arrayBuffer();
  }

  async function _loadBergModel(from, to, onProgress) {
    const key = from + '|' + to;
    if (_bergLoaded[key]) return;
    await _ensureBergamot();
    const spec = BERG_PAIR[key];
    if (!spec) throw new Error('NO_PAIR ' + key);

    if (typeof onProgress === 'function') onProgress(5);
    const base = _pageUrl('libs/translate-models/' + spec.dir + '/');
    const [model, shortlist, vocab] = await Promise.all([
      _fetchBuf(base + spec.model),
      _fetchBuf(base + spec.lex),
      _fetchBuf(base + spec.vocab)
    ]);
    if (typeof onProgress === 'function') onProgress(70);

    await _bergCall('loadTranslationModel', { from: from, to: to }, {
      model: model,
      shortlist: shortlist,
      vocabs: [vocab],
      config: { 'gemm-precision': 'int8shiftAlphaAll' }
    });
    _bergLoaded[key] = true;
    if (typeof onProgress === 'function') onProgress(100);
  }

  async function _translateViaBergamot(text, from, to, onProgress) {
    await _loadBergModel(from, to, onProgress);
    const lines = String(text).split('\n');
    const texts = [];
    const map = [];
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) {
        map.push(-1);
      } else {
        map.push(texts.length);
        texts.push({ text: lines[i], html: false });
      }
    }
    if (!texts.length) return text;

    const result = await _bergCall('translate', {
      models: [{ from: from, to: to }],
      texts: texts
    });
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      if (map[i] < 0) out.push(lines[i]);
      else out.push(result[map[i]].target.text);
    }
    return out.join('\n');
  }

  async function _googleTranslateChunk(text, from, to) {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
      encodeURIComponent(from) +
      '&tl=' +
      encodeURIComponent(to) +
      '&dt=t&q=' +
      encodeURIComponent(text);
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 8000) : null;
    let res;
    try {
      res = await fetch(url, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        signal: ctrl ? ctrl.signal : undefined
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!res || !res.ok) throw new Error('GOOGLE_HTTP ' + (res && res.status));
    const data = await res.json();
    if (!data || !data[0]) throw new Error('GOOGLE_BAD_JSON');
    let out = '';
    for (let i = 0; i < data[0].length; i++) {
      if (data[0][i] && data[0][i][0] != null) out += data[0][i][0];
    }
    return out;
  }

  async function _translateViaGoogle(text, from, to, onProgress) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('OFFLINE');
    }
    const raw = String(text || '');
    // Короткий текст — одним запросом (лучше контекст)
    if (raw.length <= 1500) {
      if (typeof onProgress === 'function') onProgress(100);
      return await _googleTranslateChunk(raw, from, to);
    }
    // Длинный — по строкам, чтобы сохранить переносы и не упереться в лимит URL
    const lines = raw.split('\n');
    const out = [];
    let done = 0;
    const total = lines.filter(function (l) { return l.trim(); }).length || 1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) {
        out.push(line);
        continue;
      }
      if (line.length <= 1500) {
        out.push(await _googleTranslateChunk(line, from, to));
      } else {
        // Слишком длинная строка — режем по предложениям
        let rest = line;
        let built = '';
        while (rest.length > 1500) {
          let cut = rest.lastIndexOf('. ', 1500);
          if (cut < 600) cut = rest.lastIndexOf(' ', 1500);
          if (cut < 600) cut = 1500;
          else cut += 1;
          built += await _googleTranslateChunk(rest.slice(0, cut).trimEnd(), from, to);
          rest = rest.slice(cut).trimStart();
          if (rest) built += ' ';
        }
        if (rest) built += await _googleTranslateChunk(rest, from, to);
        out.push(built);
      }
      done++;
      if (typeof onProgress === 'function') onProgress(Math.round((done / total) * 100));
    }
    return out.join('\n');
  }

  async function _getChromeTranslator(from, to, onProgress) {
    if (!('Translator' in self)) return null;
    // Без сети не начинаем скачивание пакета Google
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const key = from + '|' + to;
      if (_chromeTranslators[key]) return _chromeTranslators[key];
      try {
        const avail = await Translator.availability({
          sourceLanguage: from,
          targetLanguage: to
        });
        if (avail !== 'available') return null;
      } catch (e) {
        return null;
      }
    }
    const key = from + '|' + to;
    if (_chromeTranslators[key]) return _chromeTranslators[key];

    const opts = { sourceLanguage: from, targetLanguage: to };
    let availability = 'unavailable';
    try {
      availability = await Translator.availability(opts);
    } catch (e) {
      return null;
    }
    if (availability === 'unavailable') return null;

    const translator = await Translator.create({
      sourceLanguage: from,
      targetLanguage: to,
      monitor: function (m) {
        m.addEventListener('downloadprogress', function (e) {
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : Math.round((e.loaded || 0) * 100);
          if (typeof onProgress === 'function') onProgress(pct);
          else _toast(_t('toastTranslateDownloading', 'Загрузка модели Google') + ': ' + pct + '%', 'ok');
        });
      }
    });
    _chromeTranslators[key] = translator;
    return translator;
  }

  async function _translateViaChrome(text, from, to, onProgress) {
    const chrome = await _getChromeTranslator(from, to, onProgress);
    if (!chrome) return null;
    const lines = String(text).split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) { out.push(line); continue; }
      out.push(await chrome.translate(line));
    }
    return out.join('\n');
  }

  async function translatePlain(text, from, to, onProgress) {
    const trimmed = String(text || '');
    if (!trimmed.trim()) return trimmed;

    // 1) Google Translate по сети — лучшее качество
    try {
      return await _translateViaGoogle(trimmed, from, to, onProgress);
    } catch (e) {
      console.warn('[translate] Google:', e);
    }

    // 2) Встроенный Translator Chrome (модели Google, скачиваются при наличии сети)
    try {
      const viaChrome = await _translateViaChrome(trimmed, from, to, onProgress);
      if (viaChrome != null) return viaChrome;
    } catch (e) {
      console.warn('[translate] Chrome Translator:', e);
    }

    // 3) Офлайн: локальный Bergamot
    try {
      if (typeof onProgress === 'function') onProgress(0);
      _toast(_t('toastTranslateOfflineLocal', 'Нет сети — локальный перевод'), 'ok');
      return await _translateViaBergamot(trimmed, from, to, onProgress);
    } catch (e) {
      console.warn('[translate] Bergamot:', e);
    }

    throw new Error('NO_ENGINE');
  }

  const RU_LAT = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y',
    'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
    'х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':"'",'ы':'y','ь':"'",'э':'e','ю':'yu','я':'ya'
  };

  function _translitRuToLat(text) {
    let out = '';
    const s = String(text || '');
    for (let i = 0; i < s.length; i++) {
      const ch = s.charAt(i);
      const low = ch.toLowerCase();
      const lat = RU_LAT[low];
      if (lat == null) { out += ch; continue; }
      if (!lat) continue;
      out += ch === low ? lat : (lat.charAt(0).toUpperCase() + lat.slice(1));
    }
    return out;
  }

  function _srcTranslitFromPayload(data) {
    if (!data) return '';
    if (data.sentences && data.sentences.length) {
      let out = '';
      for (let i = 0; i < data.sentences.length; i++) {
        const s = data.sentences[i];
        if (s && s.src_translit) out += s.src_translit;
      }
      return String(out).trim();
    }
    if (Array.isArray(data) && data[0] && data[0].length) {
      const last = data[0][data[0].length - 1];
      if (Array.isArray(last) && last.length > 3 && last[3]) return String(last[3]).trim();
    }
    return '';
  }

  function _wrapIpaLines(s) {
    return String(s || '').split('\n').map(function (line) {
      const lead = line.match(/^\s*/)[0];
      const t = line.trim();
      if (!t) return line;
      if (t.indexOf('[') >= 0) return line;
      return lead + '[' + t + ']';
    }).join('\n');
  }

  /**
   * Британская школьная IPA (Spotlight / Starlight / Rainbow English):
   * [i:] [ɪ] [e] [æ] [a:] [ɒ] [ɔ:] [ʊ] [u:] [ʌ] [ə] [ɜ:]
   * [eɪ] [aɪ] [ɔɪ] [əʊ] [aʊ] [ɪə] [eə] [ʊə] [ju:]
   * [θ] [ð] [ʃ] [ʒ] [tʃ] [dʒ] [ŋ] [j] [w]
   * долгота «:», ударение «'» перед слогом, квадратные скобки.
   */
  function _toRuSchoolIpa(ipa) {
    let s = String(ipa || '').trim();
    s = s.replace(/^[\/\[\(]+/, '').replace(/[\/\]\)]+$/, '');
    s = s.replace(/ː/g, ':').replace(/ˑ/g, '');
    s = s.replace(/[.|]/g, '').replace(/\s+/g, '');
    s = s.replace(/ˌ/g, '');
    s = s.replace(/oʊ/g, 'əʊ').replace(/ɔʊ/g, 'əʊ');
    s = s.replace(/ɛə/g, 'eə').replace(/ʊə/g, 'ʊə');
    s = s.replace(/ɜɹ/g, 'ɜ:').replace(/ɝ:?/g, 'ɜ:').replace(/ɚ/g, 'ə');
    s = s.replace(/əɹ/g, 'ə').replace(/ər(?![aeiouæɑɒəɛɪʊɔj])/g, 'ə');
    s = s.replace(/ɑɹ/g, 'ɑ:').replace(/ɔɹ/g, 'ɔ:');
    s = s.replace(/ɪɹ/g, 'ɪə').replace(/ɛɹ/g, 'eə').replace(/eɹ/g, 'eə').replace(/ʊɹ/g, 'ʊə');
    s = s.replace(/ɹ/g, 'r');
    s = s.replace(/([aɑɔɜəiɪeæʊuʌ:])r(?![aeiouæɑɒəɛɪʊɔj])/g, '$1');
    s = s.replace(/ɡ/g, 'g').replace(/ɫ/g, 'l');
    s = s.replace(/ɾ/g, 't').replace(/t̬/g, 't').replace(/ʔ/g, '');
    s = s.replace(/[ʰʲ̩̯̃̆̈]/g, '');
    s = s.replace(/ɛ/g, 'e').replace(/ɨ/g, 'ɪ').replace(/ɐ/g, 'ə');
    s = s.replace(/ɑɪ/g, 'aɪ').replace(/ɑ:/g, 'a:').replace(/ɑ/g, 'a');
    s = s.replace(/ʧ/g, 'tʃ').replace(/ʤ/g, 'dʒ');
    s = s.replace(/ˈ/g, "'");
    if (/^'[^']+$/.test(s)) {
      const core = s.slice(1);
      const vows = core.match(/əʊ|aʊ|eɪ|aɪ|ɔɪ|ɪə|eə|ʊə|ju:|i:|u:|a:|ɔ:|ɜ:|[iɪeæɒɔʊuʌə]/g);
      if (!vows || vows.length <= 1) s = core;
    }
    return s;
  }

  const SCHOOL_IPA = {
    a:'ə', an:'ən', the:'ðə', to:'tu:', of:'əv', and:'ænd', in:'ɪn', on:'ɒn', for:'fɔ:',
    with:'wɪð', from:'frɒm', at:'æt', by:'baɪ', as:'æz', or:'ɔ:', but:'bʌt', if:'ɪf',
    i:'aɪ', you:'ju:', he:'hi:', she:'ʃi:', we:'wi:', they:'ðeɪ', it:'ɪt', me:'mi:',
    my:'maɪ', your:'jɔ:', his:'hɪz', her:'hɜ:', our:'aʊə', their:'ðeə', who:'hu:',
    what:'wɒt', where:'weə', when:'wen', why:'waɪ', how:'haʊ', which:'wɪtʃ',
    this:'ðɪs', that:'ðæt', these:'ði:z', those:'ðəʊz', there:'ðeə', here:'hɪə',
    is:'ɪz', are:'a:', was:'wɒz', were:'wɜ:', be:'bi:', been:'bi:n', being:'bi:ɪŋ',
    am:'æm', have:'hæv', has:'hæz', had:'hæd', do:'du:', does:'dʌz', did:'dɪd',
    not:'nɒt', no:'nəʊ', yes:'jes', can:'kæn', will:'wɪl', would:'wʊd',
    should:'ʃʊd', could:'kʊd', may:'meɪ', must:'mʌst',
    bee:'bi:', see:'si:', sea:'si:', tea:'ti:', tree:'tri:', three:'θri:',
    green:'gri:n', please:'pli:z', read:'ri:d', eat:'i:t', sleep:'sli:p',
    sit:'sɪt', big:'bɪg', milk:'mɪlk', fish:'fɪʃ', six:'sɪks', pig:'pɪg',
    pen:'pen', ten:'ten', red:'red', bed:'bed', egg:'eg', desk:'desk',
    cat:'kæt', black:'blæk', apple:"'æpl", bag:'bæg', hat:'hæt', map:'mæp',
    car:'ka:', park:'pa:k', father:"'fa:ðə", class:'kla:s', garden:"'ga:dn",
    dog:'dɒg', box:'bɒks', hot:'hɒt', clock:'klɒk', frog:'frɒg',
    door:'dɔ:', four:'fɔ:', ball:'bɔ:l', horse:'hɔ:s', morning:"'mɔ:nɪŋ",
    book:'bʊk', look:'lʊk', put:'pʊt', good:'gʊd', foot:'fʊt',
    too:'tu:', food:'fu:d', blue:'blu:', school:'sku:l', two:'tu:', who:'hu:',
    moon:'mu:n', room:'ru:m', fruit:'fru:t',
    cup:'kʌp', sun:'sʌn', love:'lʌv', mother:"'mʌðə", brother:"'brʌðə",
    come:'kʌm', some:'sʌm', one:'wʌn', under:"'ʌndə",
    bird:'bɜ:d', girl:'gɜ:l', teacher:"'ti:tʃə", sister:"'sɪstə",
    name:'neɪm', day:'deɪ', play:'pleɪ', table:"'teɪbl", make:'meɪk',
    take:'teɪk', eight:'eɪt', they:'ðeɪ', grey:'greɪ',
    like:'laɪk', time:'taɪm', five:'faɪv', nine:'naɪn', white:'waɪt',
    bike:'baɪk', night:'naɪt', my:'maɪ',
    boy:'bɔɪ', toy:'tɔɪ',
    go:'gəʊ', home:'həʊm', hello:"hə'ləʊ", open:"'əʊpən", yellow:"'jeləʊ",
    old:'əʊld', clothes:'kləʊðz',
    now:'naʊ', house:'haʊs', down:'daʊn', brown:'braʊn', mouse:'maʊs',
    near:'nɪə', ear:'ɪə', year:'jɪə',
    hair:'heə', chair:'tʃeə', bear:'beə',
    thank:'θæŋk', think:'θɪŋk', three:'θri:',
    the:'ðə', they:'ðeɪ',
    ship:'ʃɪp', she:'ʃi:', fish:'fɪʃ',
    cheap:'tʃi:p', much:'mʌtʃ', teacher:"'ti:tʃə",
    just:'dʒʌst', jump:'dʒʌmp', page:'peɪdʒ',
    long:'lɒŋ', sing:'sɪŋ',
    yes:'jes', yellow:"'jeləʊ", you:'ju:',
    we:'wi:', what:'wɒt',
    new:'nju:', student:"'stju:dnt",
    hello:"hə'ləʊ", goodbye:"gʊd'baɪ", please:'pli:z',
    friend:'frend', family:"'fæmɪli", people:"'pi:pl",
    water:"'wɔ:tə", daughter:"'dɔ:tə",
    little:"'lɪtl", pretty:"'prɪti",
    computer:"kəm'pju:tə",
    "don't":'dəʊnt', "can't":'ka:nt', "i'm":'aɪm', "it's":'ɪts',
    "that's":'ðæts', "he's":'hi:z', "she's":'ʃi:z', "we're":'wɪə',
    "you're":'jʊə', "they're":'ðeə', "isn't":'ɪznt', "aren't":'a:nt'
  };

  function _schoolIpa(ipa) {
    return _toRuSchoolIpa(ipa);
  }

  function _websterToIpa(raw) {
    let s = String(raw || '');
    s = s.replace(/o\u035Eo/gi, 'u:');
    s = s.replace(/o\u035Do/gi, 'ʊ');
    s = s.replace(/T\u035FH/g, 'ð').replace(/t\u035Fh/g, 'ð');
    s = s.replace(/TH/g, 'θ').replace(/Th/g, 'θ').replace(/th/g, 'θ');
    s = s.replace(/NG/g, 'ŋ').replace(/Ng/g, 'ŋ').replace(/ng/g, 'ŋ');
    s = s.replace(/ZH/g, 'ʒ').replace(/Zh/g, 'ʒ').replace(/zh/g, 'ʒ');
    s = s.replace(/SH/g, 'ʃ').replace(/Sh/g, 'ʃ').replace(/sh/g, 'ʃ');
    s = s.replace(/CH/g, 'tʃ').replace(/Ch/g, 'tʃ').replace(/ch/g, 'tʃ');
    s = s.replace(/ē/g, 'i:').replace(/Ē/g, 'i:').replace(/e\u0304/gi, 'i:');
    s = s.replace(/ā/g, 'eɪ').replace(/Ā/g, 'eɪ').replace(/a\u0304/gi, 'eɪ');
    s = s.replace(/ī/g, 'aɪ').replace(/Ī/g, 'aɪ').replace(/i\u0304/gi, 'aɪ');
    s = s.replace(/ō/g, 'əʊ').replace(/Ō/g, 'əʊ').replace(/o\u0304/gi, 'əʊ');
    s = s.replace(/ū/g, 'u:').replace(/Ū/g, 'u:').replace(/u\u0304/gi, 'u:');
    s = s.replace(/ä/g, 'a:').replace(/â/g, 'eə').replace(/ô/g, 'ɔ:').replace(/ü/g, 'u:');
    s = s.replace(/ă/g, 'æ').replace(/ĕ/g, 'e').replace(/ĭ/g, 'ɪ').replace(/ŏ/g, 'ɒ').replace(/ŭ/g, 'ʌ');
    s = s.replace(/y(?=u:)/g, 'j');
    return _toRuSchoolIpa(s);
  }

  function _pickDictPhonetic(entries) {
    const cands = [];
    if (!Array.isArray(entries)) return '';
    entries.forEach(function (en) {
      if (en && en.phonetic) cands.push({ text: en.phonetic, uk: false });
      (en && en.phonetics || []).forEach(function (p) {
        if (!p || !p.text) return;
        const audio = String(p.audio || '');
        cands.push({
          text: p.text,
          uk: /uk|gb|oxford/i.test(audio)
        });
      });
    });
    if (!cands.length) return '';
    cands.sort(function (a, b) {
      function score(x) {
        let n = 0;
        if (x.uk) n += 10;
        if (/əʊ|ɪə|eə|ɒ|ɜ:|ɜː/.test(x.text)) n += 6;
        if (/oʊ|ɝ|ɚ|ɑɹ/.test(x.text) && !x.uk) n -= 4;
        return n;
      }
      return score(b) - score(a);
    });
    return _toRuSchoolIpa(cands[0].text);
  }

  const _ipaCache = Object.create(null);

  async function _dictIpa(word) {
    const key = String(word || '').toLowerCase();
    if (!key) return '';
    if (Object.prototype.hasOwnProperty.call(_ipaCache, key)) return _ipaCache[key];
    try {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 6000) : null;
      let res;
      try {
        res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(key), {
          method: 'GET',
          credentials: 'omit',
          signal: ctrl ? ctrl.signal : undefined
        });
      } finally {
        if (timer) clearTimeout(timer);
      }
      if (!res || !res.ok) {
        _ipaCache[key] = '';
        return '';
      }
      const ipa = _pickDictPhonetic(await res.json());
      _ipaCache[key] = ipa || '';
      return _ipaCache[key];
    } catch (e) {
      _ipaCache[key] = '';
      return '';
    }
  }

  async function _transcribeEnglishWord(word) {
    const key = String(word || '').toLowerCase();
    if (SCHOOL_IPA[key]) return SCHOOL_IPA[key];
    const dict = await _dictIpa(word);
    if (dict) return dict;
    try {
      return _websterToIpa(await _googleTranscribeChunk(word, 'en'));
    } catch (e) {
      return '';
    }
  }

  async function _transcribeEnglish(text, onProgress) {
    const parts = String(text || '').split(/([A-Za-z]+(?:'[A-Za-z]+)?)/);
    const words = [];
    for (let i = 0; i < parts.length; i++) {
      if (/^[A-Za-z]/.test(parts[i])) words.push(i);
    }
    let done = 0;
    const total = words.length || 1;
    for (let w = 0; w < words.length; w++) {
      const i = words[w];
      const ipa = await _transcribeEnglishWord(parts[i]);
      parts[i] = ipa ? '[' + ipa + ']' : parts[i];
      done++;
      if (typeof onProgress === 'function') onProgress(Math.round((done / total) * 100));
    }
    return parts.join('');
  }

  async function _googleTranscribeChunk(text, from) {
    const to = from === 'en' ? 'ru' : 'en';
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&dj=1&sl=' +
      encodeURIComponent(from) +
      '&tl=' +
      encodeURIComponent(to) +
      '&dt=t&dt=rm&q=' +
      encodeURIComponent(text);
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 8000) : null;
    let res;
    try {
      res = await fetch(url, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        signal: ctrl ? ctrl.signal : undefined
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!res || !res.ok) throw new Error('GOOGLE_HTTP ' + (res && res.status));
    const data = await res.json();
    const out = _srcTranslitFromPayload(data);
    if (!out) throw new Error('GOOGLE_NO_TRANSLIT');
    return out;
  }

  async function _googleTranscribe(text, from, onProgress) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('OFFLINE');
    }
    const raw = String(text || '');
    if (raw.length <= 1500) {
      if (typeof onProgress === 'function') onProgress(100);
      return await _googleTranscribeChunk(raw, from);
    }
    const lines = raw.split('\n');
    const out = [];
    let done = 0;
    const total = lines.filter(function (l) { return l.trim(); }).length || 1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) { out.push(line); continue; }
      if (line.length <= 1500) {
        out.push(await _googleTranscribeChunk(line, from));
      } else {
        let rest = line;
        let built = '';
        while (rest.length > 1500) {
          let cut = rest.lastIndexOf('. ', 1500);
          if (cut < 600) cut = rest.lastIndexOf(' ', 1500);
          if (cut < 600) cut = 1500;
          else cut += 1;
          built += await _googleTranscribeChunk(rest.slice(0, cut).trimEnd(), from);
          rest = rest.slice(cut).trimStart();
          if (rest) built += ' ';
        }
        if (rest) built += await _googleTranscribeChunk(rest, from);
        out.push(built);
      }
      done++;
      if (typeof onProgress === 'function') onProgress(Math.round((done / total) * 100));
    }
    return out.join('\n');
  }

  async function transcribePlain(text, from, onProgress) {
    const trimmed = String(text || '');
    if (!trimmed.trim()) return trimmed;
    let en = trimmed;
    if (from !== 'en') {
      try {
        en = await translatePlain(trimmed, from === 'ru' ? 'ru' : from, 'en', onProgress);
      } catch (e) {
        if (from === 'ru') {
          _toast(_t('toastTranscribeOfflineLocal', 'Нет сети — локальная транскрипция'), 'ok');
          return _translitRuToLat(trimmed);
        }
        throw e;
      }
    }
    const out = await _transcribeEnglish(en, onProgress);
    if (!out.trim() || out === trimmed) throw new Error('NO_ENGINE');
    return out;
  }

  function syncTranslateBtn() {
    const btn = document.getElementById('btn-translate-text');
    const lab = document.getElementById('btn-translate-text-label');
    const tbtn = document.getElementById('btn-transcribe-text');
    if (lab && (!sel || sel.dataset.type !== 'text')) {
      lab.textContent = 'английский';
    }
    let empty = true;
    if (sel && sel.dataset.type === 'text') {
      const root = typeof _rtContent === 'function' ? _rtContent(sel) : (sel.querySelector('.tel') || sel.querySelector('.ec'));
      const plain = _plainFromRoot(root);
      const tgt = translateTargetFromText(plain);
      if (lab) lab.textContent = tgt.label;
      empty = tgt.detected === 'empty';
    }
    const off = _busy || empty || !sel || sel.dataset.type !== 'text';
    if (btn) {
      btn.disabled = off;
      btn.style.opacity = off ? '0.55' : '';
    }
    if (tbtn) {
      tbtn.disabled = off;
      tbtn.style.opacity = off ? '0.55' : '';
    }
  }

  function _commitPlainToSelected(elId, root, dom, newPlain) {
    if (typeof _toCharObjs === 'function' && typeof _charObjsToHtml === 'function') {
      const oldChars = _toCharObjs(root.innerHTML);
      const newChars = _rebuildChars(oldChars, newPlain);
      root.innerHTML = _charObjsToHtml(newChars);
    } else {
      root.textContent = newPlain;
    }
    const d = slides[cur] && slides[cur].els.find(function (e) { return e.id === elId; });
    if (d && d.type === 'text') {
      d.html = typeof _htmlWithoutStruts === 'function'
        ? _htmlWithoutStruts(root.innerHTML)
        : root.innerHTML;
    }
    if (typeof _rtNormalizeTextDisplay === 'function') {
      _rtNormalizeTextDisplay(root, (d && d.cs) || '', d && d.bulletGap);
    }
    if (typeof _rtUpdateCharCounter === 'function') _rtUpdateCharCounter(dom || sel, root);
    return d;
  }

  function _finishTextChange(d, dom, okMsg) {
    if (typeof fitTextHeight === 'function' && d) {
      try { fitTextHeight(d); } catch (e) {}
      if (dom && d.h) dom.style.height = d.h + 'px';
    }
    if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
    else if (typeof _updateSelFrames === 'function') _updateSelFrames();
    if (typeof save === 'function') save();
    if (typeof drawThumbs === 'function') drawThumbs();
    if (typeof saveState === 'function') saveState();
    _busy = false;
    syncTranslateBtn();
    if (typeof syncProps === 'function') syncProps();
    if (okMsg) _toast(okMsg, 'ok');
  }

  function _selectedTextRoot() {
    if (!sel || sel.dataset.type !== 'text') return null;
    const elId = sel.dataset.id;
    const dom = document.getElementById('canvas') &&
      document.getElementById('canvas').querySelector('[data-id="' + elId + '"]');
    const root = typeof _rtContent === 'function'
      ? _rtContent(dom || sel)
      : ((dom || sel).querySelector('.tel') || (dom || sel).querySelector('.ec'));
    return root ? { elId: elId, dom: dom, root: root } : null;
  }

  async function translateSelectedText() {
    if (_busy) return;
    const ctx = _selectedTextRoot();
    if (!ctx) {
      _toast(_t('toastTranslateNeedText', 'Выберите текстовый блок'), 'err');
      return;
    }
    const plain = _plainFromRoot(ctx.root);
    if (!plain.trim()) {
      _toast(_t('toastTranslateEmpty', 'Нет текста для перевода'), 'err');
      return;
    }

    const tgt = translateTargetFromText(plain);
    let from = tgt.from;
    if (tgt.detected === 'mixed' || tgt.detected === 'empty') {
      from = await _detectSourceApi(plain, 'ru');
      if (from === tgt.to) from = tgt.to === 'en' ? 'ru' : 'en';
    }

    const lab = document.getElementById('btn-translate-text-label');
    _busy = true;
    syncTranslateBtn();
    if (lab) lab.textContent = '…';

    try {
      if (typeof pushUndo === 'function') pushUndo();
      const translated = await translatePlain(plain, from, tgt.to, function (pct) {
        if (lab) lab.textContent = pct + '%';
      });
      const d = _commitPlainToSelected(ctx.elId, ctx.root, ctx.dom, translated);
      requestAnimationFrame(function () {
        _finishTextChange(
          d,
          ctx.dom,
          tgt.to === 'en'
            ? _t('toastTranslatedEn', 'Переведено на английский')
            : _t('toastTranslatedRu', 'Переведено на русский')
        );
      });
    } catch (e) {
      _busy = false;
      syncTranslateBtn();
      if (e && e.message === 'NO_ENGINE') {
        _toast(
          _t(
            'toastTranslateNoEngine',
            'Нет сети и не удалось запустить локальный переводчик'
          ),
          'err'
        );
      } else {
        console.warn('[translate]', e);
        _toast(_t('toastTranslateFail', 'Не удалось перевести'), 'err');
      }
    }
  }

  async function transcribeSelectedText() {
    if (_busy) return;
    const ctx = _selectedTextRoot();
    if (!ctx) {
      _toast(_t('toastTranslateNeedText', 'Выберите текстовый блок'), 'err');
      return;
    }
    const plain = _plainFromRoot(ctx.root);
    if (!plain.trim()) {
      _toast(_t('toastTranslateEmpty', 'Нет текста для перевода'), 'err');
      return;
    }

    const tgt = translateTargetFromText(plain);
    let from = tgt.from;
    if (tgt.detected === 'mixed' || tgt.detected === 'empty') {
      from = await _detectSourceApi(plain, 'ru');
    }

    _busy = true;
    syncTranslateBtn();

    try {
      if (typeof pushUndo === 'function') pushUndo();
      const out = await transcribePlain(plain, from);
      const d = _commitPlainToSelected(ctx.elId, ctx.root, ctx.dom, out);
      requestAnimationFrame(function () {
        _finishTextChange(d, ctx.dom, _t('toastTranscribed', 'Транскрибировано'));
      });
    } catch (e) {
      _busy = false;
      syncTranslateBtn();
      if (e && e.message === 'NO_ENGINE') {
        _toast(
          _t('toastTranscribeNoEngine', 'Нет сети и не удалось сделать транскрипцию локально'),
          'err'
        );
      } else {
        console.warn('[transcribe]', e);
        _toast(_t('toastTranscribeFail', 'Не удалось сделать транскрипцию'), 'err');
      }
    }
  }

  // Прогрев WASM в фоне после загрузки страницы (не блокирует UI)
  function _prefetchBergamot() {
    setTimeout(function () {
      _ensureBergamot().catch(function () {});
    }, 2500);
  }
  if (document.readyState === 'complete') _prefetchBergamot();
  else window.addEventListener('load', _prefetchBergamot);

  window.detectTextLang = detectTextLang;
  window.translateTargetFromText = translateTargetFromText;
  window.syncTranslateBtn = syncTranslateBtn;
  window.translateSelectedText = translateSelectedText;
  window.transcribeSelectedText = transcribeSelectedText;
  window.translatePlain = translatePlain;

  window.applyTranslationToHtml = function (html, translatedPlain) {
    if (typeof _toCharObjs === 'function' && typeof _charObjsToHtml === 'function') {
      try {
        return _charObjsToHtml(_rebuildChars(_toCharObjs(html || ''), translatedPlain));
      } catch (e) {}
    }
    return String(translatedPlain == null ? '' : translatedPlain);
  };

  const _lfWaitByKey = Object.create(null);

  window._prepareLangFadeAnim = async function (d, anim, ai) {
    if (!d) return;
    if (ai == null || ai < 0) ai = (d.anims || []).indexOf(anim);
    if (ai < 0) ai = (d.anims || []).length - 1;
    const key = (d.id || '') + ':' + ai;
    const job = (async function () {
      const prev = (d.anims || []);
      let prevAi = -1;
      for (let i = 0; i < ai; i++) {
        if (prev[i] && prev[i].name === 'langFade') prevAi = i;
      }
      if (prevAi >= 0 && _lfWaitByKey[d.id + ':' + prevAi]) {
        try { await _lfWaitByKey[d.id + ':' + prevAi]; } catch (e) {}
      }
      const liveD = (typeof slides !== 'undefined' && typeof cur !== 'undefined'
        && slides[cur] && slides[cur].els.find(function (x) { return x.id === d.id; })) || d;
      const liveAnim = (liveD.anims && liveD.anims[ai]) || anim;
      if (!liveAnim || liveAnim.name !== 'langFade') return;
      if (prevAi >= 0 && liveD.anims && liveD.anims[prevAi] && liveD.anims[prevAi].toHtml) {
        liveAnim.fromHtml = liveD.anims[prevAi].toHtml;
      }
      const html = liveAnim.fromHtml || '';
      const plain = html.replace(/<[^>]*>/g, '').replace(/\u200b/g, '');
      if (!plain.trim()) {
        liveAnim.toHtml = html;
        return;
      }
      const tgt = translateTargetFromText(plain);
      let from = tgt.from;
      if (tgt.detected === 'mixed' || tgt.detected === 'empty') {
        from = await _detectSourceApi(plain, 'ru');
        if (from === tgt.to) from = tgt.to === 'en' ? 'ru' : 'en';
      }
      const translated = await translatePlain(plain, from, tgt.to);
      const again = (typeof slides !== 'undefined' && typeof cur !== 'undefined'
        && slides[cur] && slides[cur].els.find(function (x) { return x.id === d.id; })) || liveD;
      const dest = (again.anims && again.anims[ai]) || liveAnim;
      dest.fromHtml = html;
      dest.fromLang = from;
      dest.toLang = tgt.to;
      dest.toHtml = window.applyTranslationToHtml(html, translated);
      const cv = document.getElementById('canvas');
      const el = cv && cv.querySelector('.el[data-id="' + d.id + '"]');
      if (el) el.dataset.anims = JSON.stringify(again.anims || []);
      if (typeof save === 'function') save();
      if (typeof saveState === 'function') saveState();
      if (typeof renderAnimPanel === 'function') renderAnimPanel();
      if (typeof window._refreshAnimTimeline === 'function') window._refreshAnimTimeline();
    })();
    _lfWaitByKey[key] = job;
    try {
      await job;
    } catch (e) {
      console.warn('[langFade] translate failed', e);
      if (typeof toast === 'function') {
        toast(e && e.message === 'NO_ENGINE'
          ? 'Нет переводчика для анимации «Перевод»'
          : 'Не удалось перевести для анимации', 'err');
      }
    }
  };
})();
