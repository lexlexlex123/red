/**
 * In-browser WebLLM (WebGPU) — 7.1 parity for the AI chat backend.
 * Library: /libs/web-llm/web-llm-iife.js (offline) with CDN fallback.
 */

const LS_KEY = 'sf_webllm_cfg';

export const WEBLLM_MODELS = [
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 1B  (~800 MB) — быстрая' },
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 3B  (~2 GB)' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', label: 'Phi-3.5 Mini  (~2 GB) — лучшая для текста' },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', label: 'Gemma 2 2B    (~1.5 GB)' },
  { id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC', label: 'Mistral 7B    (~4 GB) — топ качество' },
];

export const WEBLLM_SYS = `You are a JSON-only presentation assistant. OUTPUT ONLY A JSON ARRAY — start with [ end with ].
NO text before or after the array. NO markdown. ONLY valid JSON array.

COMMANDS: clearAll, addSlide, addTitle(text), addBody(text), editText(role,text), goSlide(n), delSlide, dupSlide.

RULES:
- New presentation: start with clearAll then add slides.
- Each slide: addSlide + addTitle + addBody.
- addTitle: MAX 5-6 words.
- addBody: MAX 3-4 short sentences (40-60 words). If more info needed — use more slides instead.
- NEVER put long paragraphs in one slide. Split into multiple slides.
- NEVER use clearAll when editing existing slides — only for NEW presentations.
- "remove extra text", "shorten", "keep only important" -> editText(role=body, text=short_text)
- To edit existing text: goSlide(n) + editText(role,text).
- Use Russian for text unless asked otherwise.

IMPORTANT: "write presentation about X", "create slides about X", "make presentation" = clearAll + multiple addSlide+addTitle+addBody. MINIMUM 3 slides.`;

let engine = null;
let ready = false;
let modelId = '';
let loading = false;
let useCloud = false;
let progress = '';
const listeners = new Set();

function emit() {
  const st = getWebllmState();
  listeners.forEach((fn) => {
    try {
      fn(st);
    } catch (e) {}
  });
}

export function subscribeWebllm(fn) {
  listeners.add(fn);
  fn(getWebllmState());
  return () => listeners.delete(fn);
}

export function getCfg() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {};
  } catch (e) {
    return {};
  }
}

function saveCfg(c) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(c));
  } catch (e) {}
}

export function getWebllmState() {
  const saved = getCfg().modelId || '';
  return {
    ready,
    loading,
    modelId,
    savedModelId: saved,
    useCloud,
    progress,
    shortName: (modelId || saved).split('-').slice(0, 3).join('-'),
  };
}

export function setUseCloud(v) {
  useCloud = !!v;
  emit();
}

export function preferWebllm() {
  return ready && !!engine && !useCloud;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CSS.escape(src)}"]`);
    if (existing) {
      if (window._WebLLMLib || window._WebLLM) {
        resolve(true);
        return;
      }
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => reject(new Error('load failed ' + src)));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error('load failed ' + src));
    document.head.appendChild(s);
  });
}

async function ensureLib() {
  if (window._WebLLM?.CreateMLCEngine) return window._WebLLM;
  try {
    await loadScript('/libs/web-llm/web-llm-iife.js');
    if (window._WebLLMLib?.CreateMLCEngine) {
      window._WebLLM = window._WebLLMLib;
      return window._WebLLM;
    }
  } catch (e) {}
  if (navigator.onLine) {
    const mod = await import('https://esm.run/@mlc-ai/web-llm');
    window._WebLLM = mod;
    return mod;
  }
  throw new Error('WebLLM недоступен. Проверьте libs/web-llm/web-llm-iife.js');
}

export async function checkWebGPU() {
  if (!navigator.gpu) {
    return { ok: false, reason: 'WebGPU не поддерживается. Используйте Chrome 113+ или Edge 113+.' };
  }
  const adapter = await navigator.gpu.requestAdapter().catch(() => null);
  if (!adapter) {
    return { ok: false, reason: 'GPU адаптер не найден. Обновите драйверы видеокарты.' };
  }
  const info = adapter.info || {};
  return { ok: true, vendor: info.vendor || '', device: info.device || '' };
}

export async function loadWebllm(nextId, onProgress) {
  if (loading) return false;
  const gpu = await checkWebGPU();
  if (!gpu.ok) throw new Error(gpu.reason);
  loading = true;
  ready = false;
  progress = 'Инициализация WebLLM…';
  emit();
  try {
    const { CreateMLCEngine } = await ensureLib();
    engine = await CreateMLCEngine(nextId, {
      initProgressCallback: (p) => {
        const pct = p.progress != null ? Math.round(p.progress * 100) : null;
        progress = (p.text || 'Загрузка…') + (pct != null ? ' · ' + pct + '%' : '');
        if (onProgress) onProgress(progress, pct);
        emit();
      },
    });
    modelId = nextId;
    ready = true;
    useCloud = false;
    progress = '';
    saveCfg({ modelId: nextId });
    emit();
    return true;
  } catch (e) {
    engine = null;
    ready = false;
    progress = '';
    emit();
    throw e;
  } finally {
    loading = false;
    emit();
  }
}

function isPresRequest(text) {
  const t = String(text || '').toLowerCase();
  return /создай|напиши|сделай|придумай|подготовь/.test(t) && /презентац|слайд/.test(t);
}

export async function chatWebllm(messages) {
  if (!ready || !engine) throw new Error('Модель не загружена');
  const last = [...(messages || [])].reverse().find((m) => m.role === 'user');
  const userMsg = last?.content || '';
  if (isPresRequest(userMsg)) {
    const topic =
      userMsg
        .replace(/создай|напиши|сделай|придумай|подготовь/gi, '')
        .replace(/презентацию|презентация|слайды|слайдов|на несколько/gi, '')
        .replace(/\s+/g, ' ')
        .trim() || 'тема';
    const numMatch = userMsg.match(/(\d+)\s*слайд/);
    const n = Math.min(Math.max(numMatch ? +numMatch[1] : 4, 3), 6);
    const sys =
      'You are a JSON generator. Output ONLY a valid JSON array, nothing else. ' +
      'Create ' +
      n +
      ' slides about "' +
      topic +
      '" in Russian. ' +
      'REQUIRED FORMAT: [{"cmd":"clearAll"},{"cmd":"addSlide"},{"cmd":"addTitle","text":"ЗАГОЛОВОК"},{"cmd":"addBody","text":"ТЕКСТ"},...] ' +
      'Rules: addTitle = max 5 Russian words. addBody = max 2 Russian sentences. Always start with clearAll.';
    const stream = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: sys },
        {
          role: 'user',
          content: 'Generate JSON array for ' + n + ' slides about "' + topic + '" in Russian. Start with [{"cmd":"clearAll"}',
        },
      ],
      temperature: 0.05,
      max_tokens: 1800,
      stream: true,
    });
    let full = '';
    for await (const chunk of stream) {
      full += chunk.choices[0]?.delta?.content || '';
    }
    return full;
  }
  const stream = await engine.chat.completions.create({
    messages: [{ role: 'system', content: WEBLLM_SYS }, ...(messages || [])],
    temperature: 0.3,
    max_tokens: 1800,
    stream: true,
  });
  let full = '';
  for await (const chunk of stream) {
    full += chunk.choices[0]?.delta?.content || '';
  }
  return full;
}
