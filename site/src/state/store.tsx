import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { BRAND } from '../config';
import { NOW, getProduct } from '../data/catalog';
import type { Plan, Product } from '../data/types';

/* Front-end only: cart, auth and UI state live in React + localStorage. */

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
/* Stored data can be stale or hand-edited: validate it so a bad value never
   crashes the app. */
const MAX_QTY = 10;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function sanitizeCart(v: unknown): CartLine[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((l): l is Record<string, unknown> => isObj(l) && typeof l.productSlug === 'string' && typeof l.planId === 'string' && Number.isFinite(Number(l.qty)))
    .map((l) => ({
      productSlug: l.productSlug as string,
      planId: l.planId as string,
      qty: Math.min(MAX_QTY, Math.max(1, Math.round(Number(l.qty)))),
    }));
}

function sanitizeCoupon(v: unknown): Coupon | null {
  // Re-check against the live list so retired or edited codes drop off.
  if (!isObj(v) || typeof v.code !== 'string') return null;
  const percent = COUPONS[v.code];
  return percent ? { code: v.code, percent } : null;
}

function sanitizeUser(v: unknown): User | null {
  if (!isObj(v) || typeof v.email !== 'string' || !v.email) return null;
  const username = typeof v.username === 'string' && v.username.trim() ? v.username : v.email.split('@')[0] || 'player';
  const joined = typeof v.joined === 'string' && !Number.isNaN(Date.parse(v.joined)) ? v.joined : new Date(NOW).toISOString();
  return { email: v.email, username, joined };
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: state still works for this tab */
  }
}

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */

export interface CartLine {
  productSlug: string;
  planId: string;
  qty: number;
}

export interface ResolvedLine extends CartLine {
  product: Product;
  plan: Plan;
  lineTotal: number;
}

export interface Coupon {
  code: string;
  percent: number;
}

/** Codes the mock checkout accepts. */
export const COUPONS: Record<string, number> = { JUNKO10: 10, NIGHT20: 20 };

interface CartApi {
  lines: ResolvedLine[];
  count: number;
  subtotal: number;
  discount: number;
  total: number;
  coupon: Coupon | null;
  /** Adds up to the 10-per-plan cap. Returns how many units were actually added. */
  add: (productSlug: string, planId: string, qty?: number) => number;
  setQty: (productSlug: string, planId: string, qty: number) => void;
  remove: (productSlug: string, planId: string) => void;
  clear: () => void;
  /** Returns true if the code was accepted. */
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
}

/* ------------------------------------------------------------------ */
/* Auth (mock)                                                         */
/* ------------------------------------------------------------------ */

export interface User {
  email: string;
  username: string;
  joined: string;
}

interface AuthApi {
  user: User | null;
  /** Mock sign-in. `username` defaults to the part of the email before the @. */
  signIn: (email: string, username?: string) => void;
  signOut: () => void;
}

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */

export type AuthMode = 'signin' | 'register' | 'forgot';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: 'ok' | 'info' | 'warn' | 'bad';
}

interface UiApi {
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  authMode: AuthMode | null;
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
}

const CartCtx = createContext<CartApi | null>(null);
const AuthCtx = createContext<AuthApi | null>(null);
const UiCtx = createContext<UiApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  /* UI ------------------------------------------------------------- */
  const [cartOpen, setCartOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismissToast = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = nextId.current++;
      setToasts((ts) => [...ts.slice(-3), { ...t, id }]);
      window.setTimeout(() => dismissToast(id), 3800);
    },
    [dismissToast],
  );

  const ui = useMemo<UiApi>(
    () => ({
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      authMode,
      openAuth: (mode = 'signin') => setAuthMode(mode),
      closeAuth: () => setAuthMode(null),
      chatOpen,
      setChatOpen,
      toasts,
      toast,
      dismissToast,
    }),
    [cartOpen, authMode, chatOpen, toasts, toast, dismissToast],
  );

  /* Lock page scroll while an overlay is open. The chat only covers the page
     on phones (it becomes a near full-screen sheet), so it locks there only. */
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 560px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 560px)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    const locked = cartOpen || authMode !== null || (chatOpen && narrow);
    document.documentElement.style.overflow = locked ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [cartOpen, authMode, chatOpen, narrow]);

  /* Cart ----------------------------------------------------------- */
  const [raw, setRaw] = useState<CartLine[]>(() => sanitizeCart(load<unknown>(`${BRAND.storageKey}.cart`, [])));
  const [coupon, setCoupon] = useState<Coupon | null>(() => sanitizeCoupon(load<unknown>(`${BRAND.storageKey}.coupon`, null)));
  useEffect(() => save(`${BRAND.storageKey}.cart`, raw), [raw]);
  useEffect(() => save(`${BRAND.storageKey}.coupon`, coupon), [coupon]);

  const cart = useMemo<CartApi>(() => {
    const lines: ResolvedLine[] = [];
    for (const l of raw) {
      const product = getProduct(l.productSlug);
      const plan = product?.plans.find((p) => p.id === l.planId);
      if (product && plan) lines.push({ ...l, product, plan, lineTotal: plan.price * l.qty });
    }
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const discount = coupon ? Math.min(subtotal, Math.round(subtotal * coupon.percent) / 100) : 0;
    const same = (l: CartLine, s: string, p: string) => l.productSlug === s && l.planId === p;
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
      coupon,
      add: (s, p, qty = 1) => {
        const have = raw.find((l) => same(l, s, p))?.qty ?? 0;
        const added = Math.max(0, Math.min(MAX_QTY, have + qty) - have);
        if (added > 0)
          setRaw((r) =>
            r.some((l) => same(l, s, p))
              ? r.map((l) => (same(l, s, p) ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l))
              : [...r, { productSlug: s, planId: p, qty: Math.min(MAX_QTY, qty) }],
          );
        return added;
      },
      setQty: (s, p, qty) =>
        setRaw((r) =>
          qty <= 0 ? r.filter((l) => !same(l, s, p)) : r.map((l) => (same(l, s, p) ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)),
        ),
      remove: (s, p) => setRaw((r) => r.filter((l) => !same(l, s, p))),
      clear: () => {
        setRaw([]);
        setCoupon(null);
      },
      applyCoupon: (code) => {
        const c = code.trim().toUpperCase();
        if (COUPONS[c]) {
          setCoupon({ code: c, percent: COUPONS[c] });
          return true;
        }
        return false;
      },
      removeCoupon: () => setCoupon(null),
    };
  }, [raw, coupon]);

  /* Auth ----------------------------------------------------------- */
  const [user, setUser] = useState<User | null>(() => sanitizeUser(load<unknown>(`${BRAND.storageKey}.user`, null)));
  useEffect(() => save(`${BRAND.storageKey}.user`, user), [user]);
  const auth = useMemo<AuthApi>(
    () => ({
      user,
      signIn: (email, username) =>
        setUser({
          email,
          username: username?.trim() || email.split('@')[0] || 'player',
          joined: new Date(NOW).toISOString(),
        }),
      signOut: () => setUser(null),
    }),
    [user],
  );

  return (
    <UiCtx.Provider value={ui}>
      <AuthCtx.Provider value={auth}>
        <CartCtx.Provider value={cart}>{children}</CartCtx.Provider>
      </AuthCtx.Provider>
    </UiCtx.Provider>
  );
}

function need<T>(v: T | null, name: string): T {
  if (!v) throw new Error(`${name} must be used inside <StoreProvider>`);
  return v;
}

export const useCart = () => need(useContext(CartCtx), 'useCart');
export const useAuth = () => need(useContext(AuthCtx), 'useAuth');
export const useUI = () => need(useContext(UiCtx), 'useUI');

/** Fake "players online" counter that drifts a little so the nav feels live. */
export function useOnlineCount(base = 1240) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const t = window.setInterval(() => {
      setN((v) => Math.max(base - 80, Math.min(base + 80, v + Math.round((Math.random() - 0.48) * 9))));
    }, 2600);
    return () => window.clearInterval(t);
  }, [base]);
  return n;
}
