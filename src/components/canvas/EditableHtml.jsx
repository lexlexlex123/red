import React, { useLayoutEffect, useRef } from 'react';

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
  className,
  style,
  selectAll,
  clearOnEdit,
  onBulletClick,
  onKeyDown,
}) {
  const ref = useRef(null);
  const htmlRef = useRef(html);
  const onCommitRef = useRef(onCommit);
  const committedRef = useRef(false);
  /** Holds DOM html after leave-edit commit until props catch up. */
  const pendingHtmlRef = useRef(null);
  htmlRef.current = html;
  onCommitRef.current = onCommit;

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
    const next = pendingHtmlRef.current != null ? pendingHtmlRef.current : html || '';
    if (pendingHtmlRef.current != null && pendingHtmlRef.current === (html || '')) {
      pendingHtmlRef.current = null;
    }
    if (node.innerHTML !== next) node.innerHTML = next;
  }, [html, editing]);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !editing) return undefined;
    committedRef.current = false;
    pendingHtmlRef.current = null;
    if (clearOnEdit) {
      node.innerHTML = '';
    } else if (!node.innerHTML && htmlRef.current) {
      node.innerHTML = htmlRef.current;
    }
    node.focus({ preventScroll: true });
    placeCaret(node, !!selectAll && !clearOnEdit);
    return () => {
      // Parent often clears editing before blur (click canvas / other el).
      commitNow(node);
    };
  }, [editing, selectAll, clearOnEdit]);

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      contentEditable={editing ? 'true' : undefined}
      tabIndex={editing ? 0 : undefined}
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={
        editing
          ? (e) => {
              commitNow(e.currentTarget);
            }
          : undefined
      }
      onPointerDownCapture={
        editing
          ? (e) => {
              e.stopPropagation();
              const marker = e.target.closest?.('[data-list-bullet]');
              if (marker) {
                e.preventDefault();
                onBulletClick?.();
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
