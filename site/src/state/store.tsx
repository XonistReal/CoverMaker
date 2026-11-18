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
import { getProduct } from '../data/catalog';
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
export const COUPONS: Record<string, number> = { NYX10: 10, NIGHT20: 20 };

interface CartApi {
  lines: ResolvedLine[];
  count: number;
  subtotal: number;
  discount: number;
  total: number;
  coupon: Coupon | null;
  add: (productSlug: string, planId: string, qty?: number) => void;
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
  signIn: (email: string) => void;
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

  /* Lock page scroll while an overlay is open. */
  useEffect(() => {
    const locked = cartOpen || authMode !== null;
    document.documentElement.style.overflow = locked ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [cartOpen, authMode]);

  /* Cart ----------------------------------------------------------- */
  const [raw, setRaw] = useState<CartLine[]>(() => load<CartLine[]>('nyx.cart', []));
  const [coupon, setCoupon] = useState<Coupon | null>(() => load<Coupon | null>('nyx.coupon', null));
  useEffect(() => save('nyx.cart', raw), [raw]);
  useEffect(() => save('nyx.coupon', coupon), [coupon]);

  const cart = useMemo<CartApi>(() => {
    const lines: ResolvedLine[] = [];
    for (const l of raw) {
      const product = getProduct(l.productSlug);
      const plan = product?.plans.find((p) => p.id === l.planId);
      if (product && plan) lines.push({ ...l, product, plan, lineTotal: plan.price * l.qty });
    }
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const discount = coupon ? Math.round(subtotal * coupon.percent) / 100 : 0;
    const same = (l: CartLine, s: string, p: string) => l.productSlug === s && l.planId === p;
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
      coupon,
      add: (s, p, qty = 1) =>
        setRaw((r) =>
          r.some((l) => same(l, s, p))
            ? r.map((l) => (same(l, s, p) ? { ...l, qty: Math.min(10, l.qty + qty) } : l))
            : [...r, { productSlug: s, planId: p, qty }],
        ),
      setQty: (s, p, qty) =>
        setRaw((r) =>
          qty <= 0 ? r.filter((l) => !same(l, s, p)) : r.map((l) => (same(l, s, p) ? { ...l, qty: Math.min(10, qty) } : l)),
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
  const [user, setUser] = useState<User | null>(() => load<User | null>('nyx.user', null));
  useEffect(() => save('nyx.user', user), [user]);
  const auth = useMemo<AuthApi>(
    () => ({
      user,
      signIn: (email) =>
        setUser({ email, username: email.split('@')[0] || 'player', joined: new Date('2026-11-18').toISOString() }),
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
