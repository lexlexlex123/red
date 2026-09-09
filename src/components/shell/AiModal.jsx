import React, { useEffect, useRef, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { versionAttr } from '../../editor/versions.js';
import { callAi, checkAiStatus, execAiCommands, parseAiResponse } from '../../editor/aiAssistant.js';
import { editorApi } from '../../editor/editorApi';
import { setChatDictationSink } from '../../editor/dictation.js';
import {
  WEBLLM_MODELS,
  checkWebGPU,
  getCfg,
  getWebllmState,
  loadWebllm,
  preferWebllm,
  setUseCloud,
  subscribeWebllm,
} from '../../editor/webllm.js';

export default function AiModal() {
  const open = useUiStore((s) => s.aiModalOpen);
  const close = useUiStore((s) => s.closeAiModal);
  const lang = useUiStore((s) => s.lang);
  const showToast = useUiStore((s) => s.showToast);
  const dictationOn = useUiStore((s) => s.dictationOn);
  const dictationMode = useUiStore((s) => s.dictationMode);
  const [input, setInput] = useState('');
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [wllm, setWllm] = useState(getWebllmState);
  const [showWllm, setShowWllm] = useState(false);
  const [modelPick, setModelPick] = useState(() => getCfg().modelId || WEBLLM_MODELS[0].id);
  const [gpuHint, setGpuHint] = useState('');
  const ru = lang !== 'en';
  const inputRef = useRef('');
  const interimLenRef = useRef(0);
  inputRef.current = input;

  useEffect(() => subscribeWebllm(setWllm), []);

  useEffect(() => {
    if (!open) return;
    checkAiStatus().then(setStatus).catch(() => setStatus({ ok: false }));
    checkWebGPU().then((g) => {
      setGpuHint(g.ok ? '' : g.reason);
    }).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    setChatDictationSink({
      append(finals, interims) {
        let v = inputRef.current;
        if (interimLenRef.current > 0) {
          v = v.slice(0, -interimLenRef.current);
          interimLenRef.current = 0;
        }
        if (String(finals || '').trim()) {
          const sep = v.length > 0 && !v.endsWith(' ') ? ' ' : '';
          v += sep + String(finals).trim();
        }
        if (interims) {
          const sep = v.length > 0 ? ' ' : '';
          const interim = sep + interims;
          v += interim;
          interimLenRef.current = interim.length;
        }
        inputRef.current = v;
        setInput(v);
      },
    });
    return () => {
      setChatDictationSink(null);
      if (useUiStore.getState().dictationMode === 'chat') {
        void import('../../editor/dictation.js').then((m) => m.stopDictation()).catch(() => {});
      }
    };
  }, [open]);

  if (!open) return null;

  const localOn = preferWebllm();
  const gigaOk = !!status?.configured;

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (!localOn && !gigaOk) {
      showToast(ru ? 'Нет AI: загрузите WebLLM или настройте GigaChat' : 'No AI: load WebLLM or configure GigaChat', 'err');
      return;
    }
    setBusy(true);
    setInput('');
    interimLenRef.current = 0;
    setLog((prev) => [...prev, { role: 'user', content: text }]);
    try {
      const history = [...log, { role: 'user', content: text }].slice(-8);
      const raw = await callAi(history);
      const { cmds, msg } = parseAiResponse(raw);
      if (cmds?.length) {
        const done = execAiCommands(cmds);
        setLog((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: (msg || (ru ? 'Готово' : 'Done')) + (done.length ? `\n[${done.join(', ')}]` : ''),
          },
        ]);
        showToast(ru ? 'Команды AI выполнены' : 'AI commands applied', 'ok');
      } else {
        setLog((prev) => [...prev, { role: 'assistant', content: msg || raw || '…' }]);
      }
    } catch (e) {
      const err = e?.message || String(e);
      setLog((prev) => [...prev, { role: 'assistant', content: '⚠ ' + err }]);
      showToast(
        localOn
          ? ru ? 'WebLLM не ответил' : 'WebLLM failed'
          : ru ? 'AI недоступен (run.bat + ai-config.json)' : 'AI unavailable',
        'err'
      );
    } finally {
      setBusy(false);
    }
  }

  async function onLoadModel() {
    try {
      await loadWebllm(modelPick);
      setShowWllm(false);
      showToast(ru ? 'WebLLM готов' : 'WebLLM ready', 'ok');
    } catch (e) {
      showToast(e?.message || 'WebLLM', 'err');
    }
  }

  const statusText = localOn
    ? ru
      ? `WebLLM · ${wllm.shortName || 'загружена'}`
      : `WebLLM · ${wllm.shortName || 'ready'}`
    : gigaOk
      ? ru
        ? 'GigaChat настроен (локальный прокси).'
        : 'GigaChat configured (local proxy).'
      : ru
        ? 'Нужен run.bat и ключ в ai-config.json — или WebLLM в браузере'
        : 'Need run.bat + ai-config.json, or in-browser WebLLM';

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="AI"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 10 }}
        {...versionAttr('AiModal')}
      >
        <h2>{ru ? 'AI ассистент' : 'AI assistant'}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <p className="react-props-muted" style={{ margin: 0, flex: 1 }}>
            {wllm.loading ? wllm.progress || (ru ? 'Загрузка модели…' : 'Loading model…') : statusText}
          </p>
          <button
            type="button"
            className={localOn ? 'primary' : undefined}
            title={ru ? 'Модель в браузере' : 'In-browser model'}
            onClick={() => {
              if (wllm.ready) {
                setUseCloud(false);
                setShowWllm(false);
              } else {
                setShowWllm((v) => !v);
              }
            }}
            style={{ fontSize: 11, whiteSpace: 'nowrap' }}
          >
            {wllm.ready ? '✅ WebLLM' : '🧠 WebLLM'}
          </button>
          <button
            type="button"
            className={!localOn && gigaOk ? 'primary' : undefined}
            title="GigaChat"
            onClick={() => setUseCloud(true)}
            style={{ fontSize: 11, whiteSpace: 'nowrap' }}
          >
            {gigaOk ? '✓ GigaChat' : '⚙ GigaChat'}
          </button>
        </div>
        {showWllm ? (
          <div
            style={{
              background: 'var(--surface2, #1e293b)',
              border: '1px solid var(--border2, #334155)',
              borderRadius: 8,
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 12,
            }}
          >
            {gpuHint ? <div style={{ color: '#f87171' }}>{gpuHint}</div> : null}
            <label style={{ fontSize: 11, opacity: 0.75 }}>{ru ? 'Модель' : 'Model'}</label>
            <select value={modelPick} onChange={(e) => setModelPick(e.target.value)} disabled={wllm.loading}>
              {WEBLLM_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <button type="button" className="primary" disabled={wllm.loading} onClick={() => void onLoadModel()}>
              {wllm.loading
                ? wllm.progress || '…'
                : wllm.ready
                  ? ru
                    ? 'Сменить модель'
                    : 'Change model'
                  : ru
                    ? 'Загрузить модель'
                    : 'Load model'}
            </button>
            <div style={{ fontSize: 10, opacity: 0.6 }}>
              {ru
                ? 'Кэшируется в браузере. Chrome 113+ · GPU 3+ GB VRAM'
                : 'Cached in the browser. Chrome 113+ · GPU 3+ GB VRAM'}
            </div>
          </div>
        ) : null}
        <div
          style={{
            flex: 1,
            minHeight: 180,
            maxHeight: 320,
            overflow: 'auto',
            background: 'var(--panel2, #0f172a)',
            borderRadius: 8,
            padding: 10,
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          {log.length === 0 ? (
            <div style={{ opacity: 0.6 }}>
              {ru
                ? 'Пример: «создай презентацию про космос на 4 слайда»'
                : 'Example: “create a 4-slide deck about space”'}
            </div>
          ) : (
            log.map((m, i) => (
              <div key={i} style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                <strong>{m.role === 'user' ? (ru ? 'Вы' : 'You') : 'AI'}:</strong> {m.content}
              </div>
            ))
          )}
        </div>
        <textarea
          rows={3}
          value={input}
          disabled={busy}
          placeholder={ru ? 'Сообщение…' : 'Message…'}
          onChange={(e) => {
            interimLenRef.current = 0;
            setInput(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          style={{ width: '100%', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            type="button"
            className={dictationOn && dictationMode === 'chat' ? 'dictation-on' : undefined}
            title={ru ? 'Диктовка в поле чата' : 'Dictate into chat'}
            onClick={() => void editorApi.toggleChatDictation()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            {dictationOn && dictationMode === 'chat' ? (ru ? 'Стоп' : 'Stop') : ru ? 'Диктовка' : 'Dictate'}
          </button>
          <button type="button" onClick={close}>
            {ru ? 'Закрыть' : 'Close'}
          </button>
          <button type="button" className="primary" disabled={busy || !input.trim()} onClick={() => void send()}>
            {busy ? '…' : ru ? 'Отправить' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
