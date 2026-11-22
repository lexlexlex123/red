/** Named groups of slides for the thumb strip (PowerPoint-style sections). */

export const SECTION_MAJOR_V = 26;
export const SECTION_MAJOR_H = 72;

export function trimmedSectionTitle(slide) {
  return String(slide?.sectionTitle || '').trim();
}

export function hasDeckSections(slides) {
  return (slides || []).some((s) => trimmedSectionTitle(s));
}

export function defaultSectionName(ru, n) {
  return ru ? `Раздел ${n}` : `Section ${n}`;
}

export function nextSectionName(slides, ru) {
  const used = new Set((slides || []).map(trimmedSectionTitle).filter(Boolean));
  let n = 1;
  while (used.has(defaultSectionName(ru, n))) n += 1;
  return defaultSectionName(ru, n);
}

export function collectSections(slides, ru) {
  const list = slides || [];
  if (!hasDeckSections(list)) return [];
  const out = [];
  let i = 0;
  while (i < list.length) {
    const start = i;
    const raw = trimmedSectionTitle(list[i]);
    const title = raw || defaultSectionName(ru, out.length + 1);
    let end = i + 1;
    while (end < list.length && !trimmedSectionTitle(list[end])) end += 1;
    out.push({
      start,
      end,
      title,
      collapsed: !!list[start]?.sectionCollapsed,
      count: end - start,
    });
    i = end;
  }
  return out;
}

export function sectionContaining(slides, index, ru) {
  const i = index | 0;
  return collectSections(slides, ru).find((s) => i >= s.start && i < s.end) || null;
}

export function applyStartSection(slides, index, ru) {
  if (!slides?.length) return -1;
  const i = Math.max(0, Math.min(slides.length - 1, index | 0));
  if (trimmedSectionTitle(slides[i])) return i;
  const any = hasDeckSections(slides);
  if (!any && i > 0 && !trimmedSectionTitle(slides[0])) {
    slides[0].sectionTitle = defaultSectionName(ru, 1);
  }
  slides[i].sectionTitle = nextSectionName(slides, ru);
  slides[i].sectionCollapsed = false;
  return i;
}

export function applyRenameSection(slides, index, title) {
  if (!slides?.[index]) return false;
  const name = String(title || '').trim();
  slides[index].sectionTitle = name;
  if (!name) slides[index].sectionCollapsed = false;
  return true;
}

export function applyRemoveSection(slides, index) {
  if (!slides?.[index]) return false;
  slides[index].sectionTitle = '';
  slides[index].sectionCollapsed = false;
  return true;
}

export function applyToggleSectionCollapsed(slides, index) {
  if (!slides?.[index]) return false;
  slides[index].sectionCollapsed = !slides[index].sectionCollapsed;
  return true;
}

/** Before splicing deleted indices, copy a deleted section's title onto the next remaining slide. */
export function inheritSectionsBeforeDelete(slides, indices) {
  const del = new Set(indices || []);
  for (let i = 0; i < slides.length; i++) {
    if (!del.has(i)) continue;
    const title = trimmedSectionTitle(slides[i]);
    if (!title) continue;
    let j = i + 1;
    while (j < slides.length && del.has(j)) j += 1;
    if (j >= slides.length) continue;
    if (trimmedSectionTitle(slides[j])) continue;
    slides[j].sectionTitle = title;
    slides[j].sectionCollapsed = !!slides[i].sectionCollapsed;
  }
}

export function buildStripLayout(slides, { itemMajor, addMajor, ru, horiz, flat }) {
  const list = slides || [];
  const sectionMajor = horiz ? SECTION_MAJOR_H : SECTION_MAJOR_V;
  const items = [];
  let pos = 0;
  // Flat strip — no section headers in the UI.
  if (flat !== false) {
    for (let i = 0; i < list.length; i++) {
      items.push({ kind: 'slide', i, pos, major: itemMajor });
      pos += itemMajor;
    }
    return { items, total: pos + addMajor, addMajor, hasSections: false, sections: [] };
  }
  const sections = collectSections(list, ru);
  if (!sections.length) {
    for (let i = 0; i < list.length; i++) {
      items.push({ kind: 'slide', i, pos, major: itemMajor });
      pos += itemMajor;
    }
    return { items, total: pos + addMajor, addMajor, hasSections: false, sections };
  }
  for (const sec of sections) {
    items.push({
      kind: 'section',
      i: sec.start,
      title: sec.title,
      count: sec.count,
      collapsed: sec.collapsed,
      pos,
      major: sectionMajor,
    });
    pos += sectionMajor;
    if (!sec.collapsed) {
      for (let i = sec.start; i < sec.end; i++) {
        items.push({ kind: 'slide', i, pos, major: itemMajor });
        pos += itemMajor;
      }
    }
  }
  return { items, total: pos + addMajor, addMajor, hasSections: true, sections };
}

export function insertIndexFromPointer(layout, slidesLen, pos, skip) {
  const skipSet = skip instanceof Set ? skip : new Set(skip || []);
  const items = layout?.items || [];
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it.kind === 'section') {
      if (pos < it.pos + it.major * 0.5) return it.i;
      continue;
    }
    if (skipSet.has(it.i)) continue;
    if (pos < it.pos + it.major * 0.5) return it.i;
  }
  return slidesLen;
}

export function insertLinePos(layout, insertAt, slidesLen) {
  const items = layout?.items || [];
  for (const it of items) {
    if (it.kind === 'slide' && it.i === insertAt) return it.pos;
    if (it.kind === 'section' && it.i === insertAt) return it.pos;
  }
  if (insertAt >= slidesLen) return Math.max(0, (layout?.total || 0) - (layout?.addMajor || 0));
  let lastSec = null;
  for (const it of items) {
    if (it.kind === 'section' && it.i <= insertAt) lastSec = it;
  }
  if (lastSec) return lastSec.pos + lastSec.major;
  return Math.max(0, (layout?.total || 0) - (layout?.addMajor || 0));
}
