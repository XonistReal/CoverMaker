import type { Doc } from '../types';
import { assets, getState, subscribe } from '../store';
import { importFile } from './assets';
import { debounce } from './util';

const DB = 'covermaker';
const STORE = 'kv';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function put(key: string, value: unknown) {
  const db = await open();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}

async function get<T>(key: string): Promise<T | undefined> {
  const db = await open();
  const v = await new Promise<T | undefined>((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => res(r.result as T | undefined);
    r.onerror = () => rej(r.error);
  });
  db.close();
  return v;
}

interface Saved {
  v: 1;
  doc: Doc;
  assets: { id: string; blob: Blob }[];
}

const saveNow = async () => {
  try {
    const doc = getState().doc;
    const used = new Set(doc.layers.flatMap((l) => (l.kind === 'image' ? [l.asset] : [])));
    const list: Saved['assets'] = [];
    for (const id of used) {
      const a = assets.get(id);
      if (a?.blob) list.push({ id, blob: a.blob });
    }
    await put('current', { v: 1, doc, assets: list } satisfies Saved);
  } catch {
    // storage blocked (private mode, sandbox); the editor still works without it
  }
};

export function startAutosave() {
  const save = debounce(saveNow, 900);
  let last = getState().doc;
  subscribe(() => {
    const d = getState().doc;
    if (d !== last) {
      last = d;
      save();
    }
  });
}

export async function loadSaved(): Promise<Doc | null> {
  try {
    const s = await get<Saved>('current');
    if (!s || s.v !== 1 || !s.doc?.layers) return null;
    await Promise.all(s.assets.map((a) => importFile(a.blob, a.id).catch(() => undefined)));
    return s.doc;
  } catch {
    return null;
  }
}
