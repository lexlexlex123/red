import { create } from 'zustand';

export const useSelectionStore = create((set, get) => ({
  selId: null,
  multiSel: [],
  selConnId: null,
  selCamId: null,
  selInkIds: [],
  /** Selected table cell { elId, r, c } for props / structure tools. */
  tableCell: null,
  /** v7.1 `_tblSelSet`: all selected cells [{ r, c }] of the picked table. */
  tableCellSel: [],

  setSelId: (selId) => set({ selId: selId || null }),
  setMultiSel: (ids) => set({ multiSel: Array.isArray(ids) ? ids.map(String) : [] }),
  setSelConnId: (selConnId) => set({ selConnId: selConnId || null }),
  setSelCamId: (selCamId) => set({ selCamId: selCamId || null }),
  setSelInkIds: (ids) => set({ selInkIds: Array.isArray(ids) ? ids.map(String) : [] }),
  setTableCell: (tableCell) =>
    set({
      tableCell: tableCell || null,
      tableCellSel: tableCell ? [{ r: +tableCell.r, c: +tableCell.c }] : [],
    }),
  /** v7.1 multi-cell selection: anchor + every selected cell. */
  setTableCellSel: (anchor, cells) =>
    set({
      tableCell: anchor || null,
      tableCellSel: Array.isArray(cells) ? cells : anchor ? [{ r: +anchor.r, c: +anchor.c }] : [],
    }),
  clearTableCells: () => set({ tableCell: null, tableCellSel: [] }),
  clearSelection: () =>
    set({
      selId: null,
      multiSel: [],
      selConnId: null,
      selCamId: null,
      selInkIds: [],
      tableCell: null,
      tableCellSel: [],
    }),
  clearInkSelection: () => set({ selInkIds: [] }),

  pickOne(id) {
    const sid = id ? String(id) : null;
    const prev = get().tableCell;
    const keepCell = prev && sid && String(prev.elId) === sid;
    set({
      selId: sid,
      multiSel: sid ? [sid] : [],
      selConnId: null,
      selCamId: null,
      selInkIds: [],
      tableCell: keepCell ? prev : null,
      tableCellSel: keepCell ? get().tableCellSel : [],
    });
  },

  pickGroup(ids, primaryId) {
    const list = (ids || []).map(String).filter(Boolean);
    const sid = primaryId ? String(primaryId) : list[0] || null;
    set({
      selId: sid,
      multiSel: list,
      selConnId: null,
      selCamId: null,
      selInkIds: [],
      tableCell: null,
      tableCellSel: [],
    });
  },

  pickConnector(id) {
    const cid = id ? String(id) : null;
    set({ selConnId: cid, selId: null, multiSel: [], selCamId: null, selInkIds: [], tableCell: null, tableCellSel: [] });
  },

  pickCamera(id) {
    const cid = id ? String(id) : null;
    set({ selCamId: cid, selId: null, multiSel: [], selConnId: null, selInkIds: [], tableCell: null, tableCellSel: [] });
  },

  pickInk(ids, opts = {}) {
    const list = (Array.isArray(ids) ? ids : ids != null ? [ids] : []).map(String).filter(Boolean);
    const additive = !!opts.additive;
    let next = list;
    if (additive) {
      const cur = new Set(get().selInkIds.map(String));
      list.forEach((id) => {
        if (cur.has(id)) cur.delete(id);
        else cur.add(id);
      });
      next = [...cur];
    }
    set({
      selInkIds: next,
      selId: opts.keepObjectSel ? get().selId : null,
      multiSel: opts.keepObjectSel ? get().multiSel : [],
      selConnId: null,
      selCamId: null,
      tableCell: null,
      tableCellSel: [],
    });
  },

  togglePick(id) {
    if (!id) {
      set({ selId: null, multiSel: [], selConnId: null, selCamId: null, selInkIds: [], tableCell: null, tableCellSel: [] });
      return;
    }
    const sid = String(id);
    const cur = get().multiSel.map(String);
    let next;
    if (cur.includes(sid)) next = cur.filter((x) => x !== sid);
    else next = [...cur, sid];
    set({
      multiSel: next,
      selId: next.length ? next[next.length - 1] : null,
      selConnId: null,
      selCamId: null,
      selInkIds: [],
      tableCell: null,
      tableCellSel: [],
    });
  },

  hydrateFromLegacy: (payload) => {
    if (!payload) return;
    set({
      selId: payload.selId || null,
      multiSel: Array.isArray(payload.multiSel) ? payload.multiSel : [],
      selConnId: payload.selConnId || null,
      selCamId: payload.selCamId || null,
      selInkIds: Array.isArray(payload.selInkIds) ? payload.selInkIds : [],
      tableCell: null,
      tableCellSel: [],
    });
  },
}));
