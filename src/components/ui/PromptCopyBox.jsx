import React, { useState } from 'react';
import { useUiStore } from '../../stores/uiStore';

/** Scrollable LLM prompt with a copy button in the top-right corner. */
export default function PromptCopyBox({ text, maxHeight = 180, style }) {
  const lang = useUiStore((s) => s.lang);
  const showToast = useUiStore((s) => s.showToast);
  const ru = lang !== 'en';
  const [copied, setCopied] = useState(false);
  const body = String(text || '');

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      showToast(ru ? 'Скопировано' : 'Copied', 'ok');
      setTimeout(() => setCopied(false), 1200);
    } catch (_) {
      showToast(ru ? 'Не удалось скопировать' : 'Copy failed', 'err');
    }
  }

  return (
    <div
      className="react-prompt-copy"
      style={{
        position: 'relative',
        marginTop: 10,
        border: '1px solid rgba(0,0,0,.08)',
        borderRadius: 6,
        background: 'rgba(0,0,0,.03)',
        ...style,
      }}
    >
      <button
        type="button"
        className="react-prompt-copy-btn"
        title={ru ? 'Копировать в буфер' : 'Copy to clipboard'}
        aria-label={ru ? 'Копировать' : 'Copy'}
        onClick={copy}
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          zIndex: 1,
          width: 28,
          height: 28,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(0,0,0,.12)',
          borderRadius: 6,
          background: copied ? 'rgba(99,102,241,.15)' : '#fff',
          color: '#334155',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        )}
      </button>
      <pre
        className="react-props-muted"
        style={{
          margin: 0,
          padding: '8px 36px 8px 10px',
          lineHeight: 1.4,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontSize: 11,
          maxHeight,
          overflow: 'auto',
        }}
      >
        {body}
      </pre>
    </div>
  );
}
