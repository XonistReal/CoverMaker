import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { KIND_LABEL, PRODUCTS, formatPrice, fromPrice, getGame, getProduct } from '../data/catalog';
import type { Product, Status } from '../data/types';
import { Link, navigate } from '../router';
import { useCart, useUI, type ResolvedLine } from '../state/store';
import { GameArt } from './GameArt';
import { Icon } from './Icon';
import { StatusBadge, StatusDot } from './ui';
import './overlays.css';

/* Right-hand cart sheet. Mounted once in App, opened with useUI().openCart(). */

const EXIT_MS = 320;
const LEAVE_MS = 280;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const PAY_CHIPS = ['VISA', 'MC', 'APPLE PAY', 'PAYPAL', 'BTC', 'USDT'];

const STATUS_NOTE: Partial<Record<Status, string>> = {
  updating: 'Game just patched. Your key’s clock starts when this build is green again.',
  testing: 'New build in QA. Your key activates the moment it’s verified.',
  detected: 'Sales paused while we rebuild. We recommend waiting for the all-clear.',
};

const POPULAR: Product[] = PRODUCTS.filter((p) => p.popular && p.status === 'undetected')
  .sort((a, b) => b.sold - a.sold)
  .slice(0, 3);

const UPSELL = getProduct('spoofer-temp');

const EMPTY_TRUST = [
  { icon: 'zap', label: 'Instant keys' },
  { icon: 'activity', label: 'Live status' },
  { icon: 'headset', label: '24/7 support' },
];

/** Keeps an overlay mounted for its exit animation. */
function usePresence(open: boolean, ms: number) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(t);
  }, [open, ms]);
  return { visible: open || mounted, closing: mounted && !open };
}

function trapTab(e: ReactKeyboardEvent, root: HTMLElement | null) {
  if (e.key !== 'Tab' || !root) return;
  const els = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
  if (!els.length) return;
  const first = els[0];
  const last = els[els.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !root.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

const lineKey = (l: { productSlug: string; planId: string }) => `${l.productSlug}|${l.planId}`;

export function CartDrawer() {
  const { cartOpen, closeCart, authMode } = useUI();
  const cart = useCart();
  const { visible, closing } = usePresence(cartOpen, EXIT_MS);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState<string[]>([]);

  // Move focus in on open, give it back on close.
  useEffect(() => {
    if (!cartOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    const raf = window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    return () => {
      window.cancelAnimationFrame(raf);
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [cartOpen]);

  // Esc closes (unless the auth modal is stacked on top).
  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && authMode === null) {
        e.preventDefault();
        closeCart();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cartOpen, authMode, closeCart]);

  if (!visible) return null;

  const { lines, count, subtotal, discount, total, coupon } = cart;
  const isEmpty = lines.length === 0;
  const savings =
    lines.reduce((s, l) => s + ((l.plan.compareAt ?? l.plan.price) - l.plan.price) * l.qty, 0) + discount;
  const showUpsell = !!UPSELL && !isEmpty && !lines.some((l) => l.product.kind === 'spoofer');

  const removeLine = (l: ResolvedLine) => {
    const k = lineKey(l);
    setLeaving((ls) => (ls.includes(k) ? ls : [...ls, k]));
    window.setTimeout(() => {
      cart.remove(l.productSlug, l.planId);
      setLeaving((ls) => ls.filter((x) => x !== k));
    }, LEAVE_MS);
  };

  const checkout = () => {
    closeCart();
    navigate('/checkout');
  };
  const browse = () => {
    closeCart();
    navigate('/store');
  };

  return (
    <div className={`cart-root${closing ? ' is-closing' : ''}`}>
      <div className="cart-backdrop" onClick={closeCart} aria-hidden="true" />
      <aside
        ref={panelRef}
        className="cart-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        onKeyDown={(e) => trapTab(e, panelRef.current)}
      >
        <header className="cart-head">
          <div className="cart-head-text">
            <h2 id="cart-title" className="cart-title">
              Your cart <span className="cart-title-n tabular">({count})</span>
            </h2>
            <p className="cart-head-sub">
              <Icon name="zap" size={13} />
              Instant delivery to your dashboard
            </p>
          </div>
          <button ref={closeRef} className="cart-close" onClick={closeCart} aria-label="Close cart">
            <Icon name="x" size={18} />
          </button>
        </header>

        {isEmpty ? (
          <EmptyCart onNavigate={closeCart} onBrowse={browse} />
        ) : (
          <>
            <div className="cart-body">
              <ul className="cart-lines" aria-label="Items in your cart">
                {lines.map((l, i) => (
                  <CartLineRow
                    key={lineKey(l)}
                    line={l}
                    index={i}
                    leaving={leaving.includes(lineKey(l))}
                    onRemove={() => removeLine(l)}
                    onQty={(q) => cart.setQty(l.productSlug, l.planId, q)}
                    onNavigate={closeCart}
                  />
                ))}
              </ul>

              {showUpsell && UPSELL && (
                <div className="cart-upsell">
                  <span className="cart-upsell-icon" aria-hidden="true">
                    <Icon name="shield-check" size={18} />
                  </span>
                  <div className="cart-upsell-text">
                    <span className="cart-upsell-title">Pair it with a spoofer</span>
                    <span className="cart-upsell-sub">
                      {UPSELL.name} · {UPSELL.plans[0].label}
                    </span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm cart-upsell-add"
                    onClick={() => cart.add(UPSELL.slug, UPSELL.plans[0].id)}
                    aria-label={`Add ${UPSELL.name}, ${UPSELL.plans[0].label}, ${formatPrice(UPSELL.plans[0].price)}`}
                  >
                    <Icon name="plus" size={14} />
                    <span className="tabular">{formatPrice(UPSELL.plans[0].price)}</span>
                  </button>
                </div>
              )}

              {coupon ? (
                <div className="cart-coupon is-applied">
                  <Icon name="ticket" size={16} />
                  <span className="grow">
                    Code <strong className="mono">{coupon.code}</strong> applied
                  </span>
                  <span className="badge badge-ok">−{coupon.percent}%</span>
                  <button className="cart-coupon-remove" onClick={cart.removeCoupon}>
                    Remove
                  </button>
                </div>
              ) : (
                <div className="cart-coupon">
                  <Icon name="ticket" size={16} />
                  <span>
                    Have a code? <span className="text-2">Apply it at checkout.</span>
                  </span>
                </div>
              )}
            </div>

            <footer className="cart-foot">
              <dl className="cart-sums">
                <div className="cart-sum">
                  <dt>Subtotal</dt>
                  <dd className="tabular">{formatPrice(subtotal)}</dd>
                </div>
                {coupon && discount > 0 && (
                  <div className="cart-sum is-discount">
                    <dt>
                      Discount <span className="mono">({coupon.code})</span>
                    </dt>
                    <dd className="tabular">−{formatPrice(discount)}</dd>
                  </div>
                )}
                <div className="cart-sum is-total">
                  <dt>
                    Total
                    {savings > 0.009 && (
                      <span className="cart-savings">
                        <Icon name="tag" size={12} />
                        Saving {formatPrice(savings)}
                      </span>
                    )}
                  </dt>
                  <dd className="tabular">{formatPrice(total)}</dd>
                </div>
              </dl>

              <button className="btn btn-primary btn-lg btn-block cart-checkout" onClick={checkout}>
                <Icon name="lock" />
                Checkout
                <span className="chip-arrow">
                  <Icon name="arrow-right" />
                </span>
              </button>

              <div className="cart-foot-row">
                <button className="cart-continue" onClick={closeCart}>
                  <Icon name="arrow-left" size={14} />
                  Continue shopping
                </button>
                <span className="cart-secure-note">
                  <Icon name="shield-check" size={14} />
                  Secure checkout
                </span>
              </div>
              <span className="cart-pay" aria-label="Accepted payment methods">
                {PAY_CHIPS.map((p) => (
                  <span key={p}>{p}</span>
                ))}
              </span>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface LineProps {
  line: ResolvedLine;
  index: number;
  leaving: boolean;
  onRemove: () => void;
  onQty: (qty: number) => void;
  onNavigate: () => void;
}

function CartLineRow({ line, index, leaving, onRemove, onQty, onNavigate }: LineProps) {
  const { product, plan, qty, lineTotal } = line;
  const game = getGame(product.gameSlug);
  const to = `/product/${product.slug}`;
  const note = STATUS_NOTE[product.status];

  return (
    <li
      className={`cart-line${leaving ? ' is-leaving' : ''}`}
      style={{ ['--i' as string]: index }}
      aria-hidden={leaving || undefined}
    >
      <div className="cart-line-clip">
        <div className="cart-line-card">
          <Link to={to} className="cart-line-art" onClick={onNavigate} tabIndex={-1} aria-hidden="true">
            {game && <GameArt game={game} variant="tile" showName={false} />}
          </Link>

          <div className="cart-line-main">
            <div className="cart-line-top">
              <div className="cart-line-titles">
                <Link to={to} className="cart-line-name" onClick={onNavigate}>
                  {product.name}
                </Link>
                <div className="cart-line-meta">
                  <span className="cart-plan">
                    <Icon name="clock" size={12} />
                    {plan.label}
                  </span>
                  <StatusBadge status={product.status} size="sm" />
                </div>
              </div>
              <button
                className="cart-remove"
                onClick={onRemove}
                aria-label={`Remove ${product.name}, ${plan.label}`}
                title="Remove"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>

            {note && (
              <p className={`cart-line-note tone-${product.status}`}>
                <Icon name="info" size={13} />
                {note}
              </p>
            )}

            <div className="cart-line-bottom">
              <div className="cart-qty" role="group" aria-label={`Quantity of ${product.name}`}>
                <button onClick={() => onQty(qty - 1)} disabled={qty <= 1} aria-label="Decrease quantity">
                  <Icon name="minus" size={14} />
                </button>
                <output className="tabular" aria-live="polite">
                  {qty}
                </output>
                <button onClick={() => onQty(qty + 1)} disabled={qty >= 10} aria-label="Increase quantity">
                  <Icon name="plus" size={14} />
                </button>
              </div>
              <div className="cart-line-price">
                {qty > 1 ? (
                  <span className="cart-unit tabular">
                    {qty} × {formatPrice(plan.price)}
                  </span>
                ) : (
                  plan.compareAt && <s className="cart-compare tabular">{formatPrice(plan.compareAt)}</s>
                )}
                <strong className="tabular">{formatPrice(lineTotal)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */

function EmptyCart({ onNavigate, onBrowse }: { onNavigate: () => void; onBrowse: () => void }) {
  return (
    <div className="cart-body cart-empty">
      <div className="cart-empty-hero">
        <span className="cart-empty-icon" aria-hidden="true">
          <Icon name="cart" size={26} />
        </span>
        <h3 className="cart-empty-title">Your cart is empty</h3>
        <p className="cart-empty-sub">Pick a game, choose a plan and your key lands in seconds.</p>
      </div>

      <div className="cart-pop">
        <span className="cart-pop-label">
          <Icon name="flame" size={13} />
          Popular right now
        </span>
        <ul className="cart-pop-list">
          {POPULAR.map((p) => {
            const game = getGame(p.gameSlug);
            return (
              <li key={p.slug}>
                <Link to={`/product/${p.slug}`} className="cart-pop-item" onClick={onNavigate}>
                  <span className="cart-pop-art">{game && <GameArt game={game} variant="tile" showName={false} />}</span>
                  <span className="cart-pop-text">
                    <span className="cart-pop-name">{p.name}</span>
                    <span className="cart-pop-meta">
                      <StatusDot status={p.status} />
                      {KIND_LABEL[p.kind]}
                    </span>
                  </span>
                  <span className="cart-pop-price">
                    <span>from</span>
                    <strong className="tabular">{formatPrice(fromPrice(p))}</strong>
                  </span>
                  <Icon name="chevron-right" size={16} className="cart-pop-chev" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <button className="btn btn-primary btn-lg btn-block" onClick={onBrowse}>
        Browse store
        <span className="chip-arrow">
          <Icon name="arrow-right" />
        </span>
      </button>

      <ul className="cart-trust">
        {EMPTY_TRUST.map((t) => (
          <li key={t.label}>
            <Icon name={t.icon} size={15} />
            {t.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
