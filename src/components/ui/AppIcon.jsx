import React, { useEffect, useState } from 'react';
import { chromeIconId, getAppIcon } from '../../editor/app-icons-data.js';
import { buildIconSVG } from '../../editor/iconSvg.js';
import { getIconById, onIconsChanged, onIconsReady } from '../../editor/iconsLazy.js';

const SYNONYMS = {
  add: 'plus',
  del: 'clear',
  trash: 'clear',
  left: 'alignLeft',
  centerH: 'alignCenterH',
  right: 'alignRight',
  top: 'alignTop',
  centerV: 'alignCenterV',
  bottom: 'alignBottom',
  center: 'align',
  front: 'layerFront',
  up: 'layerUp',
  down: 'layerDown',
  back: 'layerBack',
};

function resolveChromeNum(id, name) {
  if (id != null && id !== '') {
    const n = chromeIconId(id);
    if (n) return n;
  }
  if (name == null || name === '') return null;
  const key = SYNONYMS[name] || name;
  return chromeIconId(key);
}

function resolveIcon(id, name) {
  const num = resolveChromeNum(id, name);
  if (!num) return null;
  const sid = String(num);
  return getIconById(sid) || getAppIcon(sid);
}

/**
 * Monochrome chrome icon from catalog category «Приложение».
 * Looked up by numeric catalog id (1001+) so names cannot collide.
 * `name` is only a map onto that id. Color / sw / fillOp are per-component.
 */
export default function AppIcon({
  id,
  name,
  size = 18,
  color = 'currentColor',
  sw = 1.8,
  fillOp = 0,
  className = '',
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const offReady = onIconsReady(bump);
    const offChanged = onIconsChanged(bump);
    return () => {
      offReady();
      offChanged();
    };
  }, []);

  const ic = resolveIcon(id, name);
  if (!ic) return null;
  const svg = buildIconSVG(ic, color, sw, fillOp);
  if (!svg) return null;
  return (
    <span
      className={`app-icon${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      data-icon-id={ic.id}
      style={{ width: size, height: size, color }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
