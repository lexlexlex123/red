#!/usr/bin/env node
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

const ROOT        = path.join(__dirname, '..');
const PORT        = process.env.PORT || 8000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL       = process.env.AI_MODEL || 'qwen2.5:0.5b';
const AUTO_OPEN   = process.env.NO_BROWSER !== '1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.bin': 'application/octet-stream',
  '.webmanifest': 'application/manifest+json',
};

let AI_CONFIG = {};
try {
  AI_CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'ai-config.json'), 'utf8'));
} catch (e) {}

const GIGACHAT_CREDS = process.env.GIGACHAT_CREDENTIALS || AI_CONFIG.gigachat_credentials || '';
const GIGACHAT_MODEL = process.env.GIGACHAT_MODEL || AI_CONFIG.gigachat_model || 'GigaChat';
const GIGACHAT_SCOPE = process.env.GIGACHAT_SCOPE || AI_CONFIG.gigachat_scope || 'GIGACHAT_API_PERS';
const USE_GIGACHAT = !!(GIGACHAT_CREDS && (AI_CONFIG.provider === 'gigachat' || process.env.GIGACHAT_CREDENTIALS));

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"`
    : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd);
}

function httpsJson(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({ ...opts, agent: httpsAgent }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(d) });
        } catch (e) {
          resolve({ status: res.statusCode, body: d });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

let _gigaToken = { token: '', expires: 0, creds: '' };

async function getGigaChatToken(credentials) {
  const creds = credentials || GIGACHAT_CREDS;
  if (!creds) throw new Error('Нет ключа GigaChat');
  if (_gigaToken.token && _gigaToken.creds === creds && Date.now() < _gigaToken.expires - 60000) {
    return _gigaToken.token;
  }
  const rqUid = crypto.randomUUID();
  const form = 'scope=' + encodeURIComponent(GIGACHAT_SCOPE);
  const r = await httpsJson({
    hostname: 'ngw.devices.sberbank.ru',
    port: 9443,
    path: '/api/v2/oauth',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      RqUID: rqUid,
      Authorization: 'Basic ' + creds,
      'Content-Length': Buffer.byteLength(form),
    },
  }, form);
  if (r.status !== 200 || !r.body.access_token) {
    const msg = (r.body && (r.body.message || r.body.error_description || r.body.error)) || ('HTTP ' + r.status);
    throw new Error('GigaChat OAuth: ' + msg);
  }
  const exp = r.body.expires_at;
  _gigaToken = {
    token: r.body.access_token,
    expires: exp > 1e12 ? exp : exp * 1000,
    creds,
  };
  return _gigaToken.token;
}

async function proxyToGigaChat(req, res) {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', async () => {
    let payload;
    try { payload = JSON.parse(body); } catch (e) {
      res.writeHead(400);
      res.end('Bad JSON');
      return;
    }
    try {
      const creds = (payload.gigachat_credentials || '').trim() || GIGACHAT_CREDS;
      if (!creds) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.writeHead(503);
        res.end(JSON.stringify({ error: { message: 'Добавьте gigachat_credentials в ai-config.json' } }));
        return;
      }
      const token = await getGigaChatToken(creds);
      const ob = JSON.stringify({
        model: GIGACHAT_MODEL,
        messages: payload.messages || [],
        temperature: payload.temperature != null ? payload.temperature : 0.3,
        max_tokens: payload.max_tokens || 4000,
        stream: false,
      });
      const r = await httpsJson({
        hostname: 'gigachat.devices.sberbank.ru',
        port: 443,
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer ' + token,
          'Content-Length': Buffer.byteLength(ob),
        },
      }, ob);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.writeHead(r.status === 200 ? 200 : r.status);
      res.end(typeof r.body === 'string' ? r.body : JSON.stringify(r.body));
    } catch (e) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.writeHead(502);
      res.end(JSON.stringify({ error: { message: e.message } }));
    }
  });
}

function ollamaReq(p, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(OLLAMA_HOST + p);
    const ssl = url.protocol === 'https:';
    const opts = {
      hostname: url.hostname,
      port: url.port || (ssl ? 443 : 80),
      path: url.pathname,
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
    };
    const req = (ssl ? https : http).request(opts, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        try { resolve({ s: res.statusCode, b: JSON.parse(d) }); }
        catch (e) { resolve({ s: res.statusCode, b: d }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function checkOllama() {
  try { const r = await ollamaReq('/api/tags'); return r.s === 200; }
  catch (e) { return false; }
}

async function modelExists() {
  try {
    const r = await ollamaReq('/api/tags');
    return (r.b?.models || []).some((m) => m.name === MODEL || m.name === MODEL + ':latest');
  } catch (e) { return false; }
}

function pullModel() {
  return new Promise((resolve, reject) => {
    console.log(`  Скачивание ${MODEL}...`);
    const url = new URL(OLLAMA_HOST + '/api/pull');
    const ssl = url.protocol === 'https:';
    const body = JSON.stringify({ name: MODEL, stream: true });
    const opts = {
      hostname: url.hostname,
      port: url.port || (ssl ? 443 : 80),
      path: '/api/pull',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = (ssl ? https : http).request(opts, (res) => {
      let buf = '';
      res.on('data', (chunk) => {
        buf += chunk.toString();
        const lines = buf.split('\n');
        buf = lines.pop();
        lines.forEach((l) => {
          if (!l.trim()) return;
          try {
            const e = JSON.parse(l);
            if (e.status) {
              const p = e.total ? ` ${Math.round(e.completed / e.total * 100)}%` : '';
              process.stdout.write(`\r  ${e.status}${p}          `);
            }
            if (e.status === 'success') { console.log(); resolve(); }
          } catch (e) {}
        });
      });
      res.on('end', () => { console.log(); resolve(); });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function proxyToOllama(req, res) {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    let payload;
    try { payload = JSON.parse(body); } catch (e) {
      res.writeHead(400);
      res.end('Bad JSON');
      return;
    }
    const ob = JSON.stringify({
      model: MODEL,
      messages: payload.messages || [],
      stream: true,
      options: { temperature: payload.temperature || 0.7, num_predict: payload.max_tokens || 512 },
    });
    const url = new URL(OLLAMA_HOST + '/api/chat');
    const ssl = url.protocol === 'https:';
    const opts = {
      hostname: url.hostname,
      port: url.port || (ssl ? 443 : 80),
      path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(ob) },
    };
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const px = (ssl ? https : http).request(opts, (ollamaRes) => {
      let buf = '';
      ollamaRes.on('data', (chunk) => {
        buf += chunk.toString();
        const lines = buf.split('\n');
        buf = lines.pop();
        lines.forEach((l) => {
          if (!l.trim()) return;
          try {
            const e = JSON.parse(l);
            if (e.message?.content) res.write(`data: ${JSON.stringify({ text: e.message.content })}\n\n`);
            if (e.done) res.write('data: [DONE]\n\n');
          } catch (e) {}
        });
      });
      ollamaRes.on('end', () => { res.write('data: [DONE]\n\n'); res.end(); });
    });
    px.on('error', (e) => { res.writeHead(502); res.end(JSON.stringify({ error: 'Ollama: ' + e.message })); });
    px.write(ob);
    px.end();
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/api/ai/cloud' && req.method === 'POST') {
    proxyToGigaChat(req, res);
    return;
  }

  if (req.url === '/api/ai' && req.method === 'POST') {
    proxyToOllama(req, res);
    return;
  }

  if (req.url === '/api/ai/status') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200);
    res.end(JSON.stringify({
      ok: true,
      model: GIGACHAT_MODEL,
      provider: 'gigachat',
      configured: !!GIGACHAT_CREDS,
    }));
    return;
  }

  let urlPath = req.url.split('?')[0];
  try { urlPath = decodeURIComponent(urlPath); } catch (e) {}
  if (urlPath === '/') urlPath = '/index.html';
  const rel = urlPath.replace(/^\/+/, '');
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const mime = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Content-Type', mime);
    res.writeHead(200);
    fs.createReadStream(filePath).pipe(res);
  });
});

async function main() {
  console.log('\n  ╔══════════════════════════════════════════╗');
  console.log('  ║      Слайды — редактор + AI              ║');
  console.log('  ╚══════════════════════════════════════════╝\n');

  const indexScript = path.join(ROOT, 'images', 'build-index.js');
  if (fs.existsSync(indexScript)) {
    process.stdout.write('  Обновление галереи images... ');
    try {
      require('child_process').execSync(`node "${indexScript}"`, { cwd: ROOT, stdio: 'pipe' });
      console.log('OK');
    } catch (e) {
      console.log('пропуск');
      console.warn('  ⚠ image-index.js:', e.message || 'ошибка генерации');
    }
  }

  const gigachatMode = USE_GIGACHAT || AI_CONFIG.provider === 'gigachat';

  if (gigachatMode) {
    if (GIGACHAT_CREDS) {
      process.stdout.write('  Проверка GigaChat... ');
      try {
        await getGigaChatToken();
        console.log('OK');
        console.log(`  ✓ AI: GigaChat (${GIGACHAT_MODEL})\n`);
      } catch (e) {
        console.log('ошибка');
        console.warn('  ⚠ GigaChat:', e.message);
        console.warn('  Проверьте gigachat_credentials в ai-config.json\n');
      }
    } else {
      console.log('  ⚙ GigaChat: ключ не в ai-config.json — можно ввести в панели AI (⚙ Ключ)\n');
    }
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`  ✓ http://127.0.0.1:${PORT}\n`);
      if (AUTO_OPEN) setTimeout(() => openBrowser(`http://127.0.0.1:${PORT}/`), 600);
    });
    return;
  }

  process.stdout.write('  Проверка Ollama... ');
  const ollamaOk = await checkOllama();
  if (!ollamaOk) {
    console.log('не найден');
    console.log('  ⚠ Для AI: добавьте GigaChat в ai-config.json');
    console.log('    https://developers.sber.ru/studio\n');
  } else {
    console.log('OK');
    process.stdout.write(`  Проверка модели ${MODEL}... `);
    const exists = await modelExists();
    if (!exists) {
      console.log('не найдена');
      try { await pullModel(); } catch (e) { console.warn('Ошибка скачивания:', e.message); }
    } else console.log('OK');
  }

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n  ✓ http://127.0.0.1:${PORT}`);
    console.log(`  ✓ AI: ${ollamaOk ? MODEL + ' (Ollama)' : 'недоступен (настройте GigaChat)'}\n`);
    if (AUTO_OPEN) setTimeout(() => openBrowser(`http://127.0.0.1:${PORT}/`), 600);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
