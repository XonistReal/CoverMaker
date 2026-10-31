import { useSyncExternalStore } from 'react';
import type { Asset, Brush, Doc, Layer } from './types';
import { emptyDoc } from './defaults';
import { applyCase } from './render/text';

export type Tool = 'select' | 'draw';
export type Panel = 'styles' | 'add' | 'layer' | 'fx' | 'export';

export interface State {
  doc: Doc;
  selected: string | null;
  tool: Tool;
  brush: { brush: Brush; color: string; size: number };
  panel: Panel;
  past: Doc[];
  future: Doc[];
  committed: Doc;
  assetsRev: number;
  toast: { msg: string; id: number } | null;
}

export const assets = new Map<string, Asset>();

let state: State = (() => {
  const doc = emptyDoc();
  return {
    doc,
    selected: null,
    tool: 'select',
    brush: { brush: 'crayon', color: '#ff7a1a', size: 14 },
    panel: 'styles',
    past: [],
    future: [],
    committed: doc,
    assetsRev: 0,
    toast: null,
  };
})();

const listeners = new Set<() => void>();
export const getState = () => state;
export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  listeners.forEach((l) => l());
}
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}

// ---------- history ----------
export function commit() {
  if (state.doc === state.committed) return;
  const past = [...state.past, state.committed].slice(-80);
  setState({ past, future: [], committed: state.doc });
}

export function setDoc(doc: Doc, save = true) {
  setState({ doc });
  if (save) commit();
}

export function updateDoc(fn: (d: Doc) => Doc, save = true) {
  setDoc(fn(state.doc), save);
}

export function undo() {
  commit();
  if (!state.past.length) return;
  const prev = state.past[state.past.length - 1];
  setState({
    past: state.past.slice(0, -1),
    future: [state.doc, ...state.future].slice(0, 80),
    doc: prev,
    committed: prev,
  });
  fixSelection();
}

export function redo() {
  if (!state.future.length) return;
  const next = state.future[0];
  setState({ past: [...state.past, state.doc], future: state.future.slice(1), doc: next, committed: next });
  fixSelection();
}

function fixSelection() {
  if (state.selected && !state.doc.layers.some((l) => l.id === state.selected)) setState({ selected: null });
}

// ---------- layers ----------
export const getLayer = (id: string | null) => (id ? state.doc.layers.find((l) => l.id === id) ?? null : null);

export function updateLayer<T extends Layer>(id: string, patch: Partial<T> | ((l: T) => Partial<T>), save = true) {
  updateDoc(
    (d) => ({
      ...d,
      layers: d.layers.map((l) => (l.id === id ? ({ ...l, ...(typeof patch === 'function' ? patch(l as T) : patch) } as Layer) : l)),
    }),
    save,
  );
}

export function addLayer(l: Layer, select = true) {
  updateDoc((d) => ({ ...d, layers: [...d.layers, l] }));
  if (select) setState({ selected: l.id, panel: 'layer' });
}

export function removeLayer(id: string) {
  updateDoc((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== id) }));
  if (state.selected === id) setState({ selected: null });
}

export function moveLayer(id: string, dir: 1 | -1 | 'top' | 'bottom') {
  updateDoc((d) => {
    const i = d.layers.findIndex((l) => l.id === id);
    if (i < 0) return d;
    const layers = [...d.layers];
    const [l] = layers.splice(i, 1);
    let j = dir === 'top' ? layers.length : dir === 'bottom' ? 0 : i + dir;
    j = Math.max(0, Math.min(layers.length, j));
    layers.splice(j, 0, l);
    return { ...d, layers };
  });
}

export function duplicateLayer(id: string) {
  const l = getLayer(id);
  if (!l) return;
  const copy = {
    ...JSON.parse(JSON.stringify(l)),
    id: `${l.id}c${Math.random().toString(36).slice(2, 6)}`,
    x: l.x + 30,
    y: l.y + 30,
    name: l.name + ' copy',
  } as Layer;
  updateDoc((d) => {
    const i = d.layers.findIndex((x) => x.id === id);
    const layers = [...d.layers];
    layers.splice(i + 1, 0, copy);
    return { ...d, layers };
  });
  setState({ selected: copy.id });
}

/** Changing the artist/title/tracklist rewrites every text layer that plays that role. */
export function setMeta(key: 'artist' | 'title' | 'tracks', value: string, save = true) {
  updateDoc((d) => {
    const meta = { ...d.meta, [key]: value };
    const role = key === 'tracks' ? 'tracks' : key;
    return {
      ...d,
      meta,
      layers: d.layers.map((l) => (l.kind === 'text' && l.role === role ? { ...l, text: roleText(role, meta) } : l)),
    };
  }, save);
}

export function roleText(role: 'artist' | 'title' | 'tracks', meta: Doc['meta']) {
  if (role === 'tracks') {
    return meta.tracks
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t, i) => `${i + 1}. ${t}`)
      .join('\n');
  }
  return meta[role];
}

export { applyCase };

let toastId = 0;
export function toast(msg: string) {
  const id = ++toastId;
  setState({ toast: { msg, id } });
  setTimeout(() => {
    if (state.toast?.id === id) setState({ toast: null });
  }, 2600);
}
