#!/usr/bin/env node
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { exec } = require('child_process');

const PORT        = process.env.PORT        || 3000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL       = process.env.AI_MODEL    || 'qwen2.5:0.5b';
const ROOT        = __dirname;
const AUTO_OPEN   = process.env.NO_BROWSER  !== '1';

// ── Groq ──────────────────────────────────────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL   = process.env.GROQ_MODEL   || 'llama-3.1-8b-instant';
const USE_GROQ     = !!GROQ_API_KEY;

const MIME = {
  '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
  '.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml',
  '.ico':'image/x-icon','.wasm':'application/wasm','.bin':'application/octet-stream',
};

function openBrowser(url){
  const cmd = process.platform==='win32' ? `start "" "${url}"`
            : process.platform==='darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd);
}

function ollamaReq(p, body){
  return new Promise((resolve,reject)=>{
    const url=new URL(OLLAMA_HOST+p);
    const ssl=url.protocol==='https:';
    const opts={hostname:url.hostname,port:url.port||(ssl?443:80),
      path:url.pathname,method:body?'POST':'GET',
      headers:body?{'Content-Type':'application/json'}:{}};
    const req=(ssl?https:http).request(opts,res=>{
      let d=''; res.on('data',c=>d+=c);
      res.on('end',()=>{try{resolve({s:res.statusCode,b:JSON.parse(d)});}catch(e){resolve({s:res.statusCode,b:d});}});
    });
    req.on('error',reject);
    if(body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function checkOllama(){ try{ const r=await ollamaReq('/api/tags'); return r.s===200; }catch(e){return false;} }
async function modelExists(){ try{ const r=await ollamaReq('/api/tags'); return (r.b?.models||[]).some(m=>m.name===MODEL||m.name===MODEL+':latest'); }catch(e){return false;} }

function pullModel(){
  return new Promise((resolve,reject)=>{
    console.log(`  Скачивание ${MODEL}...`);
    const url=new URL(OLLAMA_HOST+'/api/pull');
    const ssl=url.protocol==='https:';
    const body=JSON.stringify({name:MODEL,stream:true});
    const opts={hostname:url.hostname,port:url.port||(ssl?443:80),
      path:'/api/pull',method:'POST',
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}};
    const req=(ssl?https:http).request(opts,res=>{
      let buf='';
      res.on('data',chunk=>{
        buf+=chunk.toString();
        const lines=buf.split('\n'); buf=lines.pop();
        lines.forEach(l=>{if(!l.trim())return;
          try{ const e=JSON.parse(l);
            if(e.status){ const p=e.total?` ${Math.round(e.completed/e.total*100)}%`:'';
              process.stdout.write(`\r  ${e.status}${p}          `); }
            if(e.status==='success'){console.log();resolve();}
          }catch(e){}
        });
      });
      res.on('end',()=>{console.log();resolve();});
    });
    req.on('error',reject); req.write(body); req.end();
  });
}

function proxyToGroq(req, res) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    let payload; try { payload = JSON.parse(body); } catch(e) { res.writeHead(400); res.end('Bad JSON'); return; }
    const ob = JSON.stringify({
      model: GROQ_MODEL,
      messages: payload.messages || [],
      stream: true,
      temperature: payload.temperature || 0.7,
      max_tokens: payload.max_tokens || 512,
    });
    const opts = {
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_API_KEY,
        'Content-Length': Buffer.byteLength(ob),
      },
    };
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const px = https.request(opts, groqRes => {
      let buf = '';
      groqRes.on('data', chunk => {
        buf += chunk.toString();
        const lines = buf.split('\n'); buf = lines.pop();
        lines.forEach(l => {
          if (!l.startsWith('data:')) return;
          const data = l.slice(5).trim();
          if (data === '[DONE]') { res.write('data: [DONE]\n\n'); return; }
          try {
            const e = JSON.parse(data);
            const text = e.choices?.[0]?.delta?.content;
            if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
          } catch(e) {}
        });
      });
      groqRes.on('end', () => { res.write('data: [DONE]\n\n'); res.end(); });
    });
    px.on('error', e => { res.writeHead(502); res.end(JSON.stringify({ error: 'Groq: ' + e.message })); });
    px.write(ob); px.end();
  });
}

function proxyToOllama(req,res){
  let body='';
  req.on('data',c=>body+=c);
  req.on('end',()=>{
    let payload; try{payload=JSON.parse(body);}catch(e){res.writeHead(400);res.end('Bad JSON');return;}
    const ob=JSON.stringify({model:MODEL,messages:payload.messages||[],stream:true,
      options:{temperature:payload.temperature||0.7,num_predict:payload.max_tokens||512}});
    const url=new URL(OLLAMA_HOST+'/api/chat');
    const ssl=url.protocol==='https:';
    const opts={hostname:url.hostname,port:url.port||(ssl?443:80),
      path:'/api/chat',method:'POST',
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(ob)}};
    res.setHeader('Content-Type','text/event-stream');
    res.setHeader('Cache-Control','no-cache');
    res.setHeader('Access-Control-Allow-Origin','*');
    const px=(ssl?https:http).request(opts,ollamaRes=>{
      let buf='';
      ollamaRes.on('data',chunk=>{
        buf+=chunk.toString();
        const lines=buf.split('\n'); buf=lines.pop();
        lines.forEach(l=>{if(!l.trim())return;
          try{ const e=JSON.parse(l);
            if(e.message?.content) res.write(`data: ${JSON.stringify({text:e.message.content})}\n\n`);
            if(e.done) res.write('data: [DONE]\n\n');
          }catch(e){}
        });
      });
      ollamaRes.on('end',()=>{res.write('data: [DONE]\n\n');res.end();});
    });
    px.on('error',e=>{res.writeHead(502);res.end(JSON.stringify({error:'Ollama: '+e.message}));});
    px.write(ob); px.end();
  });
}

const server=http.createServer((req,res)=>{
  if(req.method==='OPTIONS'){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    res.writeHead(204);res.end();return;
  }
  if(req.url==='/api/ai'&&req.method==='POST'){
    if(USE_GROQ) proxyToGroq(req,res); else proxyToOllama(req,res);
    return;
  }
  if(req.url==='/api/ai/status'){
    if(USE_GROQ){
      res.setHeader('Content-Type','application/json');
      res.setHeader('Access-Control-Allow-Origin','*');
      res.writeHead(200);
      res.end(JSON.stringify({ok:true,model:GROQ_MODEL,provider:'groq'}));
      return;
    }
    checkOllama().then(ok=>{
      res.setHeader('Content-Type','application/json');
      res.setHeader('Access-Control-Allow-Origin','*');
      res.writeHead(ok?200:503);
      res.end(JSON.stringify({ok,model:MODEL,ollama:OLLAMA_HOST}));
    });return;
  }
  let urlPath=req.url.split('?')[0];
  if(urlPath==='/') urlPath='/index.html';
  const filePath=path.join(ROOT,urlPath);
  if(!filePath.startsWith(ROOT)){res.writeHead(403);res.end();return;}
  fs.stat(filePath,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
    const mime=MIME[path.extname(filePath).toLowerCase()]||'application/octet-stream';
    res.setHeader('Cross-Origin-Opener-Policy','same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Cache-Control','no-cache');
    res.setHeader('Content-Type',mime);
    res.writeHead(200);
    fs.createReadStream(filePath).pipe(res);
  });
});

async function main(){
  console.log('\n  ╔══════════════════════════════════════════╗');
  console.log('  ║      Редактор презентаций + AI           ║');
  console.log('  ╚══════════════════════════════════════════╝\n');
  if(USE_GROQ){
    console.log(`  ✓ AI: Groq (${GROQ_MODEL})\n`);
    server.listen(PORT,()=>{
      console.log(`  ✓ http://localhost:${PORT}\n`);
      if(AUTO_OPEN) setTimeout(()=>openBrowser(`http://localhost:${PORT}`),600);
    });
    return;
  }
  process.stdout.write('  Проверка Ollama... ');
  const ollamaOk=await checkOllama();
  if(!ollamaOk){
    console.log('не найден\n');
    console.log('  ⚠ Ollama не запущен. Установка: https://ollama.com/download');
    console.log('  После установки: ollama serve\n');
    console.log('  Редактор запустится без AI.\n');
  } else {
    console.log('OK');
    process.stdout.write(`  Проверка модели ${MODEL}... `);
    const exists=await modelExists();
    if(!exists){ console.log('не найдена'); try{await pullModel();}catch(e){console.warn('Ошибка скачивания:',e.message);} }
    else console.log('OK');
  }
  server.listen(PORT,()=>{
    console.log(`\n  ✓ http://localhost:${PORT}`);
    console.log(`  ✓ AI: ${ollamaOk?MODEL+' (Ollama)':'недоступен'}\n`);
    if(AUTO_OPEN) setTimeout(()=>openBrowser(`http://localhost:${PORT}`),600);
  });
}
main().catch(e=>{console.error(e);process.exit(1);});
