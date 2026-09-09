import React, { useEffect, useRef } from 'react';
import {
  appletSandbox,
  appletStepMessage,
  counterMountHtml,
  postToAppletIframe,
} from '../../editor/applets.js';
import { isFlipAppletId } from '../../editor/flipApplet.js';
import { editorApi } from '../../editor/editorApi';

/**
 * Applet iframe host.
 * @param {'edit'|'preview'} mode — edit keeps selection overlay; preview is interactive.
 */
export default function AppletView({
  el,
  mode = 'edit',
  onPointerDown,
  selected,
  style,
  className,
  onNotesLive,
}) {
  const iframeRef = useRef(null);
  // Preview: bake live group value so linked counters continue from last click.
  const html =
    mode === 'preview' && el?.appletId === 'counter'
      ? counterMountHtml(el)
      : el?.appletHtml || '';
  const stepMsg = appletStepMessage(el?.appletId);
  const cntGroupId =
    el?.appletId === 'counter' ? String(el.cntGroupId || '').trim() : '';
  const interactive = mode === 'preview';
  const isFlip = isFlipAppletId(el?.appletId);
  const notesLive =
    el?.appletId === 'notes' && (interactive || !!selected);
  const iframeLive =
    (interactive &&
      (el?.appletId === 'calculator' ||
        isFlip ||
        el?.appletId === 'notes')) ||
    notesLive;
  const iframePE = iframeLive ? 'auto' : 'none';
  const showOverlay = !iframeLive && !(interactive && isFlip);

  useEffect(() => {
    if (!interactive || el?.appletId !== 'timer') return undefined;
    const t = window.setTimeout(() => {
      postToAppletIframe(iframeRef.current, { type: 'timerStart' });
    }, 80);
    return () => clearTimeout(t);
  }, [interactive, el?.appletId, el?.id, html]);

  // Keep flip face in sync (props toggle, undo) without reloading srcDoc.
  useEffect(() => {
    if (!isFlip) return undefined;
    const t = window.setTimeout(() => {
      postToAppletIframe(iframeRef.current, {
        type: 'flipSet',
        back: el?.flipFace === 'back',
      });
    }, 40);
    return () => clearTimeout(t);
  }, [isFlip, el?.id, el?.flipFace]);

  useEffect(() => {
    if (el?.appletId !== 'notes' || !onNotesLive) return undefined;
    const onMsg = (e) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const d = e.data;
      if (!d || d.type !== 'notesUpdate') return;
      onNotesLive(el.id, {
        notesText: d.text !== undefined ? d.text : undefined,
        notesBg: d.bg !== undefined ? d.bg : undefined,
      });
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [el?.id, el?.appletId, onNotesLive]);

  function fireStep() {
    if (!stepMsg) return;
    postToAppletIframe(iframeRef.current, { type: stepMsg });
  }

  function onHostPointerDown(e) {
    if (notesLive) {
      // Let iframe receive focus; still select on first click in edit
      if (mode === 'edit' && !selected) onPointerDown?.(e);
      else e.stopPropagation();
      return;
    }
    if (interactive && stepMsg && !isFlip) {
      e.stopPropagation();
      fireStep();
      return;
    }
    onPointerDown?.(e);
  }

  function onDoubleClick(e) {
    if (mode === 'edit' && el?.appletId === 'periodic') {
      e.stopPropagation();
      e.preventDefault();
      editorApi.reselectPeriodicElement(el.id);
      return;
    }
    if (mode === 'edit' && stepMsg) {
      e.stopPropagation();
      e.preventDefault();
      fireStep();
    }
  }

  const brdW = el?.genBorderWidth != null ? +el.genBorderWidth : 0;
  const brdC = el?.genBorderColor || 'rgba(99,102,241,0.22)';
  const rx = el?.rx != null ? +el.rx : 0;
  const isGenChrome = ['clock', 'timer', 'generator', 'counter'].includes(el?.appletId);
  const showBorder = isGenChrome && brdW > 0;

  return (
    <div
      className={className}
      data-id={el.id}
      data-applet-id={el.appletId || ''}
      data-cnt-group-id={cntGroupId || undefined}
      style={{
        ...style,
        boxSizing: 'border-box',
        padding: 0,
        overflow: 'hidden',
        background: 'transparent',
        borderRadius: rx > 0 ? rx : style?.borderRadius,
        // Border is an overlay (v7.1) — CSS border on this box gets clipped R/B by parents.
        border: 'none',
        position: style?.position || 'relative',
        cursor: el?.appletId === 'periodic' || stepMsg || iframeLive ? 'pointer' : undefined,
      }}
      onPointerDown={onHostPointerDown}
      onDoubleClick={onDoubleClick}
      title={
        mode === 'edit' && el?.appletId === 'periodic'
          ? 'Double-click to change element'
          : mode === 'edit' && stepMsg
            ? 'Double-click to step'
            : el?.appletId === 'notes' && mode === 'edit'
              ? 'Select to edit note'
              : undefined
      }
    >
      {html ? (
        <>
          <iframe
            ref={iframeRef}
            title={el.appletId || 'applet'}
            data-applet-id={el.appletId || ''}
            sandbox={appletSandbox(el)}
            srcDoc={html}
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              display: 'block',
              pointerEvents: iframePE,
              background: 'transparent',
            }}
          />
          {showOverlay ? <div className="react-hf-overlay" /> : null}
          {showBorder ? (
            <div
              className="applet-border-overlay"
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: rx > 0 ? rx : undefined,
                border: `${brdW}px solid ${brdC}`,
                boxSizing: 'border-box',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
          ) : null}
        </>
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: 12,
          }}
        >
          {el.appletId || 'applet'}
        </div>
      )}
    </div>
  );
}
