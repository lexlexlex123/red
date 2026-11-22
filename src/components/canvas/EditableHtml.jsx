import React, { useLayoutEffect, useRef } from 'react';
import { editorApi } from '../../editor/editorApi.js';

function placeCaret(node, selectAll) {
  if (!node) return;
  try {
    const range = document.createRange();
    range.selectNodeContents(node);
    if (!selectAll) range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  } catch (_) {
    /* ignore */
  }
}

/** contentEditable that does not reset the caret on parent re-renders. */
export default function EditableHtml({
  html,
  editing,
  onCommit,
  onLiveChange,
  className,
  style,
  selectAll,
  clearOnEdit,
  seedText,
  onSeedConsumed,
  onBulletClick,
  onKeyDown,
  suppressBlurCommit,
}) {
  const ref = useRef(null);
  const htmlRef = useRef(html);
  const onCommitRef = useRef(onCommit);
  const onLiveChangeRef = useRef(onLiveChange);
  const onSeedConsumedRef = useRef(onSeedConsumed);
  const suppressBlurCommitRef = useRef(suppressBlurCommit);
  const committedRef = useRef(false);
  /** Holds DOM html after leave-edit commit until props catch up. */
  const pendingHtmlRef = useRef(null);
  htmlRef.current = html;
  onCommitRef.current = onCommit;
  onLiveChangeRef.current = onLiveChange;
  onSeedConsumedRef.current = onSeedConsumed;
  suppressBlurCommitRef.current = suppressBlurCommit;

  function commitNow(node) {
    if (!node || committedRef.current) return;
    committedRef.current = true;
    const next = node.innerHTML;
    pendingHtmlRef.current = next;
    onCommitRef.current?.(next);
  }

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || editing) return;
    let next = pendingHtmlRef.current != null ? pendingHtmlRef.current : html || '';
    if (pendingHtmlRef.current != null && pendingHtmlRef.current === (html || '')) {
      pendingHtmlRef.current = null;
    }
    const pendingText = String(pendingHtmlRef.current || '')
      .replace(/<[^>]+>/g, '')
      .replace(/[\u00a0\s]/g, '');
    if (!pendingText && html && html !== pendingHtmlRef.current) {
      next = html;
      pendingHtmlRef.current = null;
    }
    if (node.innerHTML !== next) node.innerHTML = next;
  }, [html, editing]);

  const clearOnEditRef = useRef(clearOnEdit);
  const seedTextRef = useRef(seedText);
  clearOnEditRef.current = clearOnEdit;
  seedTextRef.current = seedText;

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !editing) return undefined;
    committedRef.current = false;
    pendingHtmlRef.current = null;
    const shouldClear = !!clearOnEditRef.current;
    const seed = seedTextRef.current;
    if (shouldClear) {
      node.innerHTML = '';
    } else if (!node.innerHTML && htmlRef.current) {
      node.innerHTML = htmlRef.current;
    }
    node.focus({ preventScroll: true });
    placeCaret(node, !!selectAll && !shouldClear);
    if (seed) {
      try {
        document.execCommand('insertText', false, seed);
      } catch {
        node.appendChild(document.createTextNode(seed));
        placeCaret(node, false);
      }
    }
    // Drop one-shot clear/seed flags after apply (do not re-run this effect).
    if (shouldClear || seed) onSeedConsumedRef.current?.();
    onLiveChangeRef.current?.(node.innerHTML);
    return () => {
      // Parent often clears editing before blur (click canvas / other el).
      if (!suppressBlurCommitRef.current) commitNow(node);
    };
  }, [editing, selectAll]);

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      contentEditable={editing ? 'true' : undefined}
      tabIndex={editing ? 0 : undefined}
      suppressContentEditableWarning
      spellCheck={false}
      onInput={
        editing && onLiveChange
          ? (e) => {
              onLiveChangeRef.current?.(e.currentTarget.innerHTML);
            }
          : undefined
      }
      onBlur={
        editing
          ? (e) => {
              if (suppressBlurCommitRef.current) return;
              // Focus moved into a modal / quickbar that keeps editing alive.
              const next = e.relatedTarget;
              if (next && typeof next.closest === 'function' && next.closest('[data-keep-text-edit]')) {
                return;
              }
              // relatedTarget is often null when clicking toolbar buttons; defer and re-check.
              const node = e.currentTarget;
              requestAnimationFrame(() => {
                if (suppressBlurCommitRef.current) return;
                const ae = document.activeElement;
                if (ae === node) return;
                if (ae && typeof ae.closest === 'function' && ae.closest('[data-keep-text-edit]')) {
                  return;
                }
                commitNow(node);
              });
            }
          : undefined
      }
      onClickCapture={(e) => {
        const a = e.target.closest?.('a[href]');
        if (!a || !e.currentTarget.contains(a)) return;
        e.preventDefault();
        // Ctrl/Cmd+click opens the link in the editor; plain click only selects/edits.
        if (e.ctrlKey || e.metaKey) {
          e.stopPropagation();
          const href = a.getAttribute('href');
          if (href) editorApi.followLink(href);
        }
      }}
      onPointerDownCapture={
        editing
          ? (e) => {
              e.stopPropagation();
              const marker = e.target.closest?.('[data-list-bullet]');
              if (marker) {
                e.preventDefault();
                onBulletClick?.(marker);
              }
            }
          : undefined
      }
      onKeyDown={
        editing
          ? (e) => {
              e.stopPropagation();
              if (onKeyDown) onKeyDown(e);
              if (e.defaultPrevented) return;
              if (e.key === 'Escape') {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }
          : undefined
      }
    />
  );
}
