import React, { useEffect, useMemo, useRef } from 'react';

/**
 * Full-height code editor: line numbers + syntax highlight under transparent textarea.
 * Mirrors legacy #cm-editor-wrap / #hf-editor-wrap.
 */
export default function CodeEditorPane({
  value,
  onChange,
  highlightHtml,
  themeBg = '#0d1117',
  themeText = '#e6edf3',
  themeBorder = '#21262d',
  themeGutter = '#4a5568',
  placeholder = '',
  glass = false,
}) {
  const scrollRef = useRef(null);
  const linesRef = useRef(null);
  const taRef = useRef(null);

  const lineCount = useMemo(() => Math.max(1, String(value || '').split('\n').length), [value]);
  const lineNums = useMemo(
    () =>
      Array.from({ length: lineCount }, (_, i) => i + 1)
        .join('\n'),
    [lineCount]
  );

  useEffect(() => {
    const area = scrollRef.current;
    const lines = linesRef.current;
    if (!area || !lines) return undefined;
    const onScroll = () => {
      lines.scrollTop = area.scrollTop;
    };
    area.addEventListener('scroll', onScroll);
    return () => area.removeEventListener('scroll', onScroll);
  }, []);

  function onKeyDown(e) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = `${value.slice(0, start)}  ${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      try {
        ta.selectionStart = ta.selectionEnd = start + 2;
      } catch (err) {}
    });
  }

  const wrapBg = glass
    ? themeBg === '#f8f9fa' || themeBg.startsWith('rgba(248')
      ? 'rgba(248,249,250,0.72)'
      : 'rgba(13,17,23,0.72)'
    : themeBg;

  return (
    <div
      className="code-editor-pane"
      style={{
        background: wrapBg,
        borderColor: themeBorder,
        backdropFilter: glass ? 'blur(10px)' : undefined,
        WebkitBackdropFilter: glass ? 'blur(10px)' : undefined,
      }}
    >
      <pre
        ref={linesRef}
        className="code-editor-lines"
        style={{ color: themeGutter, borderColor: themeBorder, background: wrapBg }}
        aria-hidden="true"
      >
        {lineNums}
      </pre>
      <div ref={scrollRef} className="code-editor-scroll">
        <pre
          className="code-editor-hl"
          style={{ color: themeText }}
          aria-hidden="true"
          dangerouslySetInnerHTML={{
            __html: highlightHtml || escapeHtml(value) || '&nbsp;',
          }}
        />
        <textarea
          ref={taRef}
          className="code-editor-ta"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          placeholder={placeholder}
          style={{ caretColor: themeText }}
        />
      </div>
    </div>
  );
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function countCodeLines(value) {
  return Math.max(1, String(value || '').split('\n').length);
}
