import { BRAND } from '../config';
import type { ResolvedLine } from '../state/store';

/* Front-end only order history. Orders live in localStorage under "junko.orders". */

const KEY = `${BRAND.storageKey}.orders`;
const DAY = 86_400_000;

/** License key prefix from the brand config, e.g. "JNK". */
export const KEY_PREFIX = BRAND.keyPrefix;

export type PayMethodId = 'card' | 'apple' | 'google' | 'paypal' | 'crypto';
export type CryptoId = 'BTC' | 'ETH' | 'LTC' | 'USDT';

export interface OrderLine {
  productSlug: string;
  planId: string;
  productName: string;
  planLabel: string;
  /** null = lifetime */
  days: number | null;
  qty: number;
  unitPrice: number;
  /** One key per unit purchased. */
  keys: string[];
}

export interface Order {
  id: string;
  /** ISO date */
  createdAt: string;
  email: string;
  discord?: string;
  method: PayMethodId;
  crypto?: CryptoId;
  coupon?: string;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'paid';
}

export const METHOD_LABEL: Record<PayMethodId, string> = {
  card: 'Card',
  apple: 'Apple Pay',
  google: 'Google Pay',
  paypal: 'PayPal',
  crypto: 'Crypto',
};

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

export function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Order[]) : [];
    return Array.isArray(list) ? list.filter((o) => o && Array.isArray(o.lines)) : [];
  } catch {
    return [];
  }
}

/** Prepends the order (newest first). Silently keeps working if storage is unavailable. */
export function saveOrder(order: Order): void {
  try {
    const next = [order, ...loadOrders().filter((o) => o.id !== order.id)].slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the success screen still shows the order for this session */
  }
}

/* ------------------------------------------------------------------ */
/* Generators                                                          */
/* ------------------------------------------------------------------ */

/** Unambiguous alphabet: no 0/O, 1/I/L. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function rng(seedText: string) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function chunk(next: () => number, len: number) {
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(next() * ALPHABET.length)];
  return s;
}

/** Stable license key for a seed, e.g. "JNK-7F3K-Q9LM-2XWD". */
export function licenseKey(seed: string): string {
  const next = rng(seed);
  return [KEY_PREFIX, chunk(next, 4), chunk(next, 4), chunk(next, 4)].join('-');
}

/** Order number like "ORD-261118-7F3K". */
export function makeOrderId(date = new Date()): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const next = rng(`${date.getTime()}-${Math.random()}`);
  return `ORD-${yy}${mm}${dd}-${chunk(next, 4)}`;
}

interface BuildArgs {
  lines: ResolvedLine[];
  email: string;
  discord?: string;
  method: PayMethodId;
  crypto?: CryptoId;
  coupon?: string;
  subtotal: number;
  discount: number;
  total: number;
}

export function buildOrder(a: BuildArgs): Order {
  const now = new Date();
  const id = makeOrderId(now);
  return {
    id,
    createdAt: now.toISOString(),
    email: a.email,
    discord: a.discord || undefined,
    method: a.method,
    crypto: a.method === 'crypto' ? a.crypto : undefined,
    coupon: a.coupon,
    subtotal: a.subtotal,
    discount: a.discount,
    total: a.total,
    status: 'paid',
    lines: a.lines.map((l) => ({
      productSlug: l.productSlug,
      planId: l.planId,
      productName: l.product.name,
      planLabel: l.plan.label,
      days: l.plan.days,
      qty: l.qty,
      unitPrice: l.plan.price,
      keys: Array.from({ length: l.qty }, (_, i) => licenseKey(`${id}|${l.planId}|${i}`)),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* License helpers                                                     */
/* ------------------------------------------------------------------ */

/** "JNK-••••-••••-2XWD" */
export function maskKey(key: string): string {
  const parts = key.split('-');
  return parts.map((p, i) => (i === 0 || i === parts.length - 1 ? p : '••••')).join('-');
}

/** Expiry timestamp in ms, or null for lifetime. */
export function expiresAt(purchasedIso: string, days: number | null): number | null {
  if (days === null) return null;
  return new Date(purchasedIso).getTime() + days * DAY;
}

/** "6d 14h 22m", "14h 22m 10s", "4m 09s". */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(sec)}s`;
  return `${m}m ${pad(sec)}s`;
}

export { DAY };

/* ------------------------------------------------------------------ */
/* Loader (mock download)                                              */
/* ------------------------------------------------------------------ */

export const LOADER = {
  version: '3.8.2',
  size: '4.2 MB',
  file: `${BRAND.wordmark.charAt(0)}${BRAND.wordmark.slice(1).toLowerCase()}Loader-3.8.2.exe`,
  released: '2026-11-17T18:00:00Z',
  platform: 'Windows 10 / 11 · x64',
  sha256: '2acfbaba370d78cf8de0d446cc4a97d38472d07fe9340b65d6fc5622a0a3d4f8',
  changelog: [
    'Cold start is 40% faster on NVMe drives',
    'Keys from multiple products now load from one login',
    'Auto-pauses injection while a game update is downloading',
    'Fixed overlay flicker on 240 Hz monitors with HDR on',
  ],
};

/** Copy text to the clipboard with a legacy fallback. Resolves true on success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
