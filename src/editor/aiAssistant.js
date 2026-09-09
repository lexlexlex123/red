/**
 * AI assistant helpers for React (GigaChat via /api/ai/cloud).
 * Executes a subset of legacy JSON commands against editorApi.
 */

import { editorApi } from './editorApi.js';
import { usePresentationStore } from '../stores/presentationStore.js';
import { useHistoryStore } from '../stores/historyStore.js';
import { emptySlide } from '../stores/presentationStore.js';

const SYS = `You are a slides editor assistant. Reply with a JSON array of commands only (or JSON then ||| short note).
Allowed commands:
{"cmd":"clearAll"}
{"cmd":"addSlide"}
{"cmd":"goSlide","n":1}
{"cmd":"addTitle","text":"..."}
{"cmd":"addBody","text":"..."}
{"cmd":"addText","text":"..."}
Rules: titles max 6 words; body max 2 short sentences; Russian unless user asks otherwise.
Start multi-slide decks with clearAll then addSlide/addTitle/addBody pairs.`;

let justCleared = false;

export async function checkAiStatus() {
  try {
    const res = await fetch('/api/ai/status', { method: 'GET', cache: 'no-store' });
    if (!res.ok) return { ok: false };
    return await res.json();
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function callAiCloud(messages) {
  const res = await fetch('/api/ai/cloud', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'system', content: SYS }, ...messages],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || res.statusText || 'AI error');
  }
  return data.choices?.[0]?.message?.content || '';
}

/** GigaChat proxy, or in-browser WebLLM when loaded and selected. */
export async function callAi(messages) {
  const { preferWebllm, chatWebllm } = await import('./webllm.js');
  if (preferWebllm()) return chatWebllm(messages);
  return callAiCloud(messages);
}

export function parseAiResponse(text) {
  let cmds = null;
  let msg = null;
  let searchText = text;
  const pipeIdx = text.indexOf('|||');
  if (pipeIdx >= 0) {
    searchText = text.slice(0, pipeIdx);
    msg = text.slice(pipeIdx + 3).trim();
  }
  const arrStart = searchText.indexOf('[');
  const arrEnd = searchText.lastIndexOf(']');
  if (arrStart >= 0 && arrEnd > arrStart) {
    try {
      const r = JSON.parse(searchText.slice(arrStart, arrEnd + 1));
      if (Array.isArray(r) && r.length) cmds = r;
    } catch (e) {}
  }
  if (!cmds) {
    const objStart = searchText.indexOf('{');
    const objEnd = searchText.lastIndexOf('}');
    if (objStart >= 0 && objEnd > objStart) {
      try {
        const r = JSON.parse(searchText.slice(objStart, objEnd + 1));
        if (r.cmd) cmds = [r];
      } catch (e) {}
    }
  }
  if (!cmds && !msg) msg = text;
  return { cmds, msg };
}

function pushHistory() {
  try {
    useHistoryStore.getState().push();
  } catch (e) {}
}

function addAiText(text, role) {
  const st = usePresentationStore.getState();
  const { canvasW, canvasH } = st;
  const isTitle = role === 'title';
  const id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const el = {
    id,
    type: 'text',
    x: Math.round(canvasW * 0.08),
    y: isTitle ? Math.round(canvasH * 0.12) : Math.round(canvasH * 0.32),
    w: Math.round(canvasW * 0.84),
    h: isTitle ? Math.round(canvasH * 0.16) : Math.round(canvasH * 0.45),
    rot: 0,
    text: text,
    html: String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'),
    textColor: '#ffffff',
    cs: isTitle
      ? 'font-size:48px;font-family:Georgia, serif;font-weight:700;text-align:center;'
      : 'font-size:28px;font-family:Georgia, serif;text-align:left;',
    anims: [],
  };
  usePresentationStore.getState().addElement(el);
}

export function execAiCommands(cmds) {
  const log = [];
  if (!Array.isArray(cmds)) return log;
  pushHistory();
  cmds.forEach((cmd) => {
    if (!cmd || !cmd.cmd) return;
    try {
      switch (cmd.cmd) {
        case 'clearAll': {
          const blank = emptySlide();
          usePresentationStore.setState({ slides: [blank], cur: 0 });
          justCleared = true;
          log.push('clearAll');
          break;
        }
        case 'addSlide': {
          if (justCleared) {
            justCleared = false;
            editorApi.pickSlide(0);
          } else {
            editorApi.addSlide();
          }
          log.push('addSlide');
          break;
        }
        case 'goSlide': {
          editorApi.pickSlide(Math.max(0, (+cmd.n || 1) - 1));
          log.push('goSlide');
          break;
        }
        case 'addTitle':
          addAiText(cmd.text || '', 'title');
          log.push('addTitle');
          break;
        case 'addBody':
        case 'addText':
          addAiText(cmd.text || '', 'body');
          log.push(cmd.cmd);
          break;
        case 'delSlide':
          editorApi.delSlide(usePresentationStore.getState().cur);
          log.push('delSlide');
          break;
        case 'dupSlide':
          editorApi.dupSlide(usePresentationStore.getState().cur);
          log.push('dupSlide');
          break;
        case 'editText': {
          const st = usePresentationStore.getState();
          const slide = st.slides[st.cur];
          const texts = (slide?.els || []).filter((e) => e.type === 'text');
          let target = null;
          if (cmd.role) target = texts.find((e) => e.textRole === cmd.role);
          else if (cmd.idx != null) target = texts[cmd.idx];
          else target = texts[0];
          if (target) {
            const esc = String(cmd.text || '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\n/g, '<br>');
            usePresentationStore.getState().patchElement(target.id, {
              html: '<div>' + esc + '</div>',
              text: cmd.text || '',
            });
            log.push('editText');
          } else {
            log.push('skip:editText');
          }
          break;
        }
        default:
          log.push('skip:' + cmd.cmd);
      }
    } catch (e) {
      log.push('err:' + cmd.cmd);
    }
  });
  return log;
}
