import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  audioPlayerLayout,
  audioPlayerTheme,
  registerAudioPlayer,
} from '../../editor/mediaPlay.js';

export { audioPlayerLayout };

function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function eventClientX(e) {
  if (e == null) return 0;
  if (Number.isFinite(e.clientX)) return e.clientX;
  const t = e.touches?.[0] || e.changedTouches?.[0];
  return t && Number.isFinite(t.clientX) ? t.clientX : 0;
}

/**
 * Scheme-coloured audio chrome: light/dark cover, palette «15» controls,
 * time text contrasting the cover. Adaptive: full → no time → icon-only.
 */
export default function ThemedAudioPlayer({
  elId,
  src,
  themeOrIdx,
  volume = 1,
  loop = false,
  autoPlay = false,
  /** When true (show/preview), block pointer/click so slide nav does not fire. */
  isolatePointer = false,
  style,
  className,
}) {
  const t = audioPlayerTheme(themeOrIdx);
  const rootRef = useRef(null);
  const audioRef = useRef(null);
  const btnRef = useRef(null);
  const trackRef = useRef(null);
  const rafRef = useRef(0);
  const durRef = useRef(0);
  const srcRef = useRef(src);
  const isolateRef = useRef(isolatePointer);
  const layoutRef = useRef('full');
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [box, setBox] = useState({ w: 200, h: 40 });
  // Blob object URL — HTTP audio without Accept-Ranges has seekable [0,0] and cannot scrub.
  const [playSrc, setPlaySrc] = useState(() => src || '');

  srcRef.current = src;
  isolateRef.current = isolatePointer;

  const layout = audioPlayerLayout(box.w, box.h);
  layoutRef.current = layout;
  const endPad = Math.max(14, Math.round(box.h / 2));
  const iconOnly = layout === 'icon';
  const showTime = layout === 'full';
  const showTrack = layout === 'full' || layout === 'notime';
  // Scale chrome with height (no hard caps — tall pills must look proportional).
  const iconSize = iconOnly
    ? Math.max(22, Math.round(Math.min(box.w, box.h) * 0.5))
    : Math.max(18, Math.round(box.h * 0.58));
  const glyphSize = Math.max(12, Math.round(iconSize * (iconOnly ? 0.72 : 0.66)));
  const timeFont = Math.max(11, Math.round(box.h * 0.34));
  const timeMinW = Math.max(56, Math.round(timeFont * 5.6));
  const trackHit = Math.max(14, Math.round(box.h * 0.5));
  const trackBar = Math.max(3, Math.round(box.h * 0.11));
  const gap = iconOnly ? 0 : Math.max(6, Math.round(box.h * 0.14));
  const padLeft = iconOnly ? 0 : Math.max(8, Math.round(box.h * 0.2));

  useEffect(() => {
    let cancelled = false;
    let created = null;
    setPlaySrc('');
    setCur(0);
    setDur(0);
    durRef.current = 0;
    if (!src) return undefined;

    const isLocalBlob = src.startsWith('blob:') || src.startsWith('data:');
    if (isLocalBlob) {
      setPlaySrc(src);
      return undefined;
    }

    (async () => {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setPlaySrc(created);
      } catch (err) {
        if (!cancelled) setPlaySrc(src);
      }
    })();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [src]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const apply = () => {
      const w = el.clientWidth || 0;
      const h = el.clientHeight || 0;
      setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    apply();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return undefined;
    a.volume = Math.max(0, Math.min(1, +volume || 0));
    a.loop = !!loop;

    const syncTime = () => {
      setCur(a.currentTime || 0);
      if (Number.isFinite(a.duration) && a.duration > 0) {
        durRef.current = a.duration;
        setDur(a.duration);
      }
    };
    const tick = () => {
      syncTime();
      if (!a.paused && !a.ended) rafRef.current = requestAnimationFrame(tick);
    };
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        durRef.current = a.duration;
        setDur(a.duration);
      }
    };
    const onPlay = () => {
      setPlaying(true);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
      syncTime();
    };
    const onEnd = () => {
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
      syncTime();
    };

    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('durationchange', onMeta);
    a.addEventListener('timeupdate', syncTime);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnd);

    if (a.readyState >= 1) onMeta();
    if (autoPlay && playSrc) a.play().catch(() => {});

    return () => {
      cancelAnimationFrame(rafRef.current);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('durationchange', onMeta);
      a.removeEventListener('timeupdate', syncTime);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnd);
    };
  }, [playSrc, volume, loop, autoPlay]);

  useEffect(() => {
    if (elId == null || !audioRef.current) return undefined;
    return registerAudioPlayer(elId, {
      play: () => {
        const el = audioRef.current;
        if (!el) return null;
        el.play().catch(() => {});
        return el;
      },
      pause: () => audioRef.current?.pause(),
      toggle: () => {
        const el = audioRef.current;
        if (!el) return null;
        if (el.paused) el.play().catch(() => {});
        else el.pause();
        return el;
      },
      getAudio: () => audioRef.current,
    });
  }, [elId, src]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const stop = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const toggleAudio = () => {
      const a = audioRef.current;
      if (!a) return;
      if (!playSrc && !a.src && !srcRef.current) return;
      if (a.paused) a.play().catch(() => {});
      else a.pause();
    };

    const seekToClientX = (clientX) => {
      const a = audioRef.current;
      const track = trackRef.current;
      if (!a || !track) return false;
      const total =
        Number.isFinite(a.duration) && a.duration > 0 ? a.duration : durRef.current;
      if (!total) return false;
      const rect = track.getBoundingClientRect();
      if (!(rect.width > 0)) return false;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      try {
        a.currentTime = ratio * total;
      } catch (err) {
        return false;
      }
      durRef.current = total;
      setCur(a.currentTime);
      setDur(total);
      return true;
    };

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' && e.button != null && e.button !== 0) return;
      const a = audioRef.current;
      const btn = btnRef.current;
      const track = trackRef.current;
      if (!a) return;
      const target = e.target;
      if (!(target instanceof Node) || !root.contains(target)) return;

      const onBtn = btn && (target === btn || btn.contains(target));
      const onTrack = track && (target === track || track.contains(target));

      // Play only on the triangle — not the whole cover (editor needs the rest for drag).
      // In show, empty chrome is still isolated below so slide does not advance.
      if (onBtn) {
        stop(e);
        toggleAudio();
        return;
      }

      if (layoutRef.current === 'icon') {
        if (isolateRef.current) stop(e);
        return;
      }

      if (onTrack) {
        stop(e);
        const pointerId = e.pointerId;
        const x0 = eventClientX(e);
        if (!seekToClientX(x0)) {
          const once = () => {
            a.removeEventListener('loadedmetadata', once);
            a.removeEventListener('durationchange', once);
            seekToClientX(x0);
          };
          a.addEventListener('loadedmetadata', once);
          a.addEventListener('durationchange', once);
          try {
            if (a.readyState < 1) a.load();
          } catch (err) {}
        }
        try {
          track.setPointerCapture?.(pointerId);
        } catch (err) {}
        const onMove = (ev) => {
          if (ev.pointerId !== pointerId) return;
          stop(ev);
          seekToClientX(eventClientX(ev));
        };
        const onUp = (ev) => {
          if (ev.pointerId !== pointerId) return;
          stop(ev);
          window.removeEventListener('pointermove', onMove, true);
          window.removeEventListener('pointerup', onUp, true);
          window.removeEventListener('pointercancel', onUp, true);
          try {
            track.releasePointerCapture?.(pointerId);
          } catch (err) {}
        };
        window.addEventListener('pointermove', onMove, true);
        window.addEventListener('pointerup', onUp, true);
        window.addEventListener('pointercancel', onUp, true);
        return;
      }

      if (isolateRef.current) stop(e);
    };

    const onClick = (e) => {
      if (!isolateRef.current) return;
      if (!(e.target instanceof Node) || !root.contains(e.target)) return;
      stop(e);
    };

    root.addEventListener('pointerdown', onPointerDown, true);
    root.addEventListener('click', onClick, true);
    return () => {
      root.removeEventListener('pointerdown', onPointerDown, true);
      root.removeEventListener('click', onClick, true);
    };
  }, [playSrc]);

  const progress = dur > 0 ? Math.max(0, Math.min(1, cur / dur)) : 0;

  return (
    <div
      ref={rootRef}
      className={`react-themed-audio${iconOnly ? ' is-icon' : ''}${className ? ` ${className}` : ''}`}
      data-audio-player="1"
      data-audio-layout={layout}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: iconOnly ? 'center' : 'flex-start',
        gap,
        paddingLeft: padLeft,
        paddingRight: 0,
        boxSizing: 'border-box',
        borderRadius: 999,
        background: t.panel,
        color: t.controls,
        userSelect: 'none',
        touchAction: 'none',
        cursor: iconOnly ? 'pointer' : undefined,
        ...style,
      }}
    >
      <audio ref={audioRef} src={playSrc || undefined} preload="auto" playsInline style={{ display: 'none' }} />
      <button
        ref={btnRef}
        type="button"
        className="react-themed-audio-btn"
        aria-label={playing ? 'Pause' : 'Play'}
        style={{
          flex: '0 0 auto',
          width: iconSize,
          height: iconSize,
          border: 'none',
          padding: 0,
          margin: 0,
          background: 'transparent',
          color: t.controls,
          cursor: 'pointer',
          pointerEvents: 'auto',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {playing ? (
          <svg width={glyphSize} height={glyphSize} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="5" y="4" width="5" height="16" rx="1" />
            <rect x="14" y="4" width="5" height="16" rx="1" />
          </svg>
        ) : (
          <svg width={glyphSize} height={glyphSize} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 4.5v15l13-7.5L7 4.5z" />
          </svg>
        )}
      </button>
      {showTime ? (
        <span
          className="react-themed-audio-time"
          style={{
            flex: '0 0 auto',
            font: `600 ${timeFont}px/1 ui-sans-serif, system-ui, sans-serif`,
            color: t.time,
            minWidth: timeMinW,
            fontVariantNumeric: 'tabular-nums',
            pointerEvents: 'none',
          }}
        >
          {fmtTime(cur)} / {fmtTime(dur)}
        </span>
      ) : null}
      {showTrack ? (
        <div
          ref={trackRef}
          className="react-themed-audio-track"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={Math.round(dur || 0)}
          aria-valuenow={Math.round(cur || 0)}
          style={{
            flex: 1,
            minWidth: 24,
            height: trackHit,
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              width: '100%',
              height: trackBar,
              borderRadius: Math.max(2, Math.round(trackBar / 2)),
              background: `color-mix(in srgb, ${t.controls} 28%, ${t.panel})`,
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                background: t.controls,
                borderRadius: 2,
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      ) : (
        <div ref={trackRef} style={{ display: 'none' }} aria-hidden="true" />
      )}
      {showTrack ? (
        <div aria-hidden="true" style={{ flex: '0 0 auto', width: endPad, height: 1, pointerEvents: 'none' }} />
      ) : null}
    </div>
  );
}
