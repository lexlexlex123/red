import { create } from 'zustand';
import { usePresentationStore } from './presentationStore';

function snap() {
  const s = usePresentationStore.getState();
  return JSON.stringify({
    slides: s.slides,
    cur: s.cur,
    title: s.title,
    canvasW: s.canvasW,
    canvasH: s.canvasH,
    ar: s.ar,
    appliedThemeIdx: s.appliedThemeIdx,
    layoutIdx: s.layoutIdx,
    pnSettings: s.pnSettings,
  });
}

function restore(raw) {
  const data = JSON.parse(raw);
  usePresentationStore.getState().restoreSnapshot(data);
  if (data.pnSettings) {
    usePresentationStore.getState().setPnSettings(data.pnSettings);
  }
}

export const useHistoryStore = create((set, get) => ({
  undoStack: [],
  redoStack: [],
  undoLen: 0,
  redoLen: 0,
  canUndo: false,
  canRedo: false,

  push() {
    const next = [...get().undoStack, snap()].slice(-80);
    set({
      undoStack: next,
      redoStack: [],
      undoLen: next.length,
      redoLen: 0,
      canUndo: next.length > 0,
      canRedo: false,
    });
  },

  undo() {
    const { undoStack, redoStack } = get();
    if (!undoStack.length) return;
    const current = snap();
    const prev = undoStack[undoStack.length - 1];
    restore(prev);
    const nextUndo = undoStack.slice(0, -1);
    const nextRedo = [...redoStack, current];
    set({
      undoStack: nextUndo,
      redoStack: nextRedo,
      undoLen: nextUndo.length,
      redoLen: nextRedo.length,
      canUndo: nextUndo.length > 0,
      canRedo: true,
    });
  },

  redo() {
    const { undoStack, redoStack } = get();
    if (!redoStack.length) return;
    const current = snap();
    const next = redoStack[redoStack.length - 1];
    restore(next);
    const nextRedo = redoStack.slice(0, -1);
    const nextUndo = [...undoStack, current];
    set({
      undoStack: nextUndo,
      redoStack: nextRedo,
      undoLen: nextUndo.length,
      redoLen: nextRedo.length,
      canUndo: true,
      canRedo: nextRedo.length > 0,
    });
  },

  clear() {
    set({
      undoStack: [],
      redoStack: [],
      undoLen: 0,
      redoLen: 0,
      canUndo: false,
      canRedo: false,
    });
  },

  /** Drop the last undo frame (e.g. no-op erase). */
  discardLast() {
    const undoStack = get().undoStack.slice(0, -1);
    set({
      undoStack,
      undoLen: undoStack.length,
      canUndo: undoStack.length > 0,
    });
  },
}));
