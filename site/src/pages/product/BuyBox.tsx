import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import { GameArt } from '../../components/GameArt';
import { Icon } from '../../components/Icon';
import { Stars, StatusBadge } from '../../components/ui';
import { KIND_LABEL, formatPrice, timeAgo } from '../../data/catalog';
import type { Game, Plan, Product } from '../../data/types';
import { Link } from '../../router';
import { useUI } from '../../state/store';
import { PAYMENTS, TRUST } from './setup';

export interface Purchase {
  plan: Plan;
  setPlanId: (id: string) => void;
  qty: number;
  setQty: (n: number) => void;
  canBuy: boolean;
  add: () => void;
  buy: () => void;
}

const savePct = (p: Plan) => (p.compareAt ? Math.round((1 - p.price / p.compareAt) * 100) : 0);
const perDay = (p: Plan) => (p.days ? formatPrice(p.price / p.days) : null);
const planSub = (p: Plan) =>
  p.days === null ? 'Pay once, keep it forever' : p.days === 1 ? '24 hours of access' : `${p.days} days of access`;

/* ------------------------------------------------------------------ */
/* Plan picker (radio cards, arrow-key accessible)                     */
/* ------------------------------------------------------------------ */

function PlanPicker({
  plans,
  value,
  onChange,
  disabled,
}: {
  plans: Plan[];
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const select = (i: number) => {
    const n = (i + plans.length) % plans.length;
    onChange(plans[n].id);
    refs.current[n]?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const map: Record<string, number> = {
      ArrowDown: i + 1,
      ArrowRight: i + 1,
      ArrowUp: i - 1,
      ArrowLeft: i - 1,
      Home: 0,
      End: plans.length - 1,
    };
    if (e.key in map) {
      e.preventDefault();
      select(map[e.key]);
    }
  };
  return (
    <div className="pdp-plans-wrap">
      <div className="pdp-label-row">
        <span id={labelId} className="pdp-label">
          Choose your plan
        </span>
        <span className="tiny muted">Prices in USD</span>
      </div>
      <div
        className={`pdp-plans${disabled ? ' is-disabled' : ''}`}
        role="radiogroup"
        aria-labelledby={labelId}
        aria-disabled={disabled || undefined}
      >
        {plans.map((p, i) => {
          const checked = p.id === value;
          const save = savePct(p);
          const lifetime = p.days === null;
          const pd = perDay(p);
          return (
            <button
              key={p.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              disabled={disabled}
              className={`pdp-plan${checked ? ' is-checked' : ''}${lifetime ? ' is-lifetime' : ''}`}
              onClick={() => onChange(p.id)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {lifetime && (
                <span className="pdp-ribbon">
                  <Icon name="sparkles" size={11} /> Best value
                </span>
              )}
              <span className="pdp-radio" aria-hidden="true" />
              <span className="pdp-plan-main">
                <span className="pdp-plan-name">
                  {p.label}
                  {save > 0 && <span className="badge badge-ok">Save {save}%</span>}
                </span>
                <span className="pdp-plan-sub">{planSub(p)}</span>
              </span>
              <span className="pdp-plan-price">
                <span className="pdp-plan-amt">
                  {p.compareAt && <s>{formatPrice(p.compareAt)}</s>}
                  <strong className="tabular">{formatPrice(p.price)}</strong>
                </span>
                <span className="pdp-plan-day mono">{pd ? `${pd}/day` : 'one-time'}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quantity stepper                                                    */
/* ------------------------------------------------------------------ */

function QtyStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="pdp-qty" role="group" aria-label="Quantity">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">
        <Icon name="minus" size={16} />
      </button>
      <output className="tabular" aria-live="polite" aria-label={`Quantity ${value}`}>
        {value}
      </output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= 10} aria-label="Increase quantity">
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status notices                                                      */
/* ------------------------------------------------------------------ */

function DetectedNotice({ product }: { product: Product }) {
  const { toast } = useUI();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const id = useId();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;
    setDone(v);
    setEmail('');
    toast({ title: "You're on the list", body: `We'll email ${v} the moment ${product.name} is green again.`, tone: 'ok' });
  };
  return (
    <div className="pdp-notice tone-bad" id="pdp-notify">
      <div className="pdp-notice-head">
        <span className="pdp-notice-icon">
          <Icon name="alert" size={18} />
        </span>
        <div>
          <strong>Sales paused: build detected</strong>
          <p>
            Anti-cheat flagged the current build, so we stopped sales and extended every active key while we rebuild. Please don't
            load it until it shows green again.
          </p>
        </div>
      </div>
      {done ? (
        <p className="pdp-notify-done">
          <Icon name="check-circle" size={16} /> We'll email <b>{done}</b> as soon as it's back.
        </p>
      ) : (
        <form className="pdp-notify" onSubmit={submit}>
          <label htmlFor={id} className="pdp-notify-label">
            Notify me when it's back
          </label>
          <div className="pdp-notify-row">
            <span className="input-wrap grow">
              <Icon name="mail" />
              <input
                id={id}
                className="input"
                type="email"
                required
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </span>
            <button type="submit" className="btn btn-white">
              Notify me
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function StatusNotice({ product }: { product: Product }) {
  if (product.status === 'detected') return <DetectedNotice product={product} />;
  if (product.status === 'updating')
    return (
      <div className="pdp-notice tone-warn">
        <div className="pdp-notice-head">
          <span className="pdp-notice-icon">
            <Icon name="refresh" size={18} />
          </span>
          <div>
            <strong>Updating after the latest patch</strong>
            <p>
              Keys are paused during updates, so active subscriptions don't lose a minute. Buy now and your time starts when the
              build is verified.
            </p>
          </div>
        </div>
      </div>
    );
  if (product.status === 'testing')
    return (
      <div className="pdp-notice tone-info">
        <div className="pdp-notice-head">
          <span className="pdp-notice-icon">
            <Icon name="shield" size={18} />
          </span>
          <div>
            <strong>New build in testing</strong>
            <p>We're verifying this build on test accounts. Purchases are open; check the live status before you load.</p>
          </div>
        </div>
      </div>
    );
  return null;
}

/* ------------------------------------------------------------------ */
/* Buy box                                                             */
/* ------------------------------------------------------------------ */

export function BuyBox({
  product,
  game,
  purchase,
  actionsRef,
  onReviews,
}: {
  product: Product;
  game: Game;
  purchase: Purchase;
  actionsRef: RefObject<HTMLDivElement>;
  onReviews: () => void;
}) {
  const { plan, qty, setQty, setPlanId, canBuy, add, buy } = purchase;
  const total = plan.price * qty;
  const stockPct = product.stock ? Math.max(6, Math.min(100, (product.stock / 50) * 100)) : 0;

  return (
    <div className="pdp-buy">
      <div className="pdp-buy-head">
        <Link to={`/store/${game.slug}`} className="eyebrow pdp-game-link">
          {game.name}
          {!game.name.toLowerCase().includes(KIND_LABEL[product.kind].toLowerCase()) && (
            <span className="pdp-kind">{KIND_LABEL[product.kind]}</span>
          )}
        </Link>
        <h1 className="pdp-title">{product.name}</h1>
        <div className="pdp-meta">
          <StatusBadge status={product.status} />
          <button type="button" className="pdp-rating" onClick={onReviews}>
            <Stars value={product.rating} size={14} />
            <strong>{product.rating.toFixed(1)}</strong>
            <span>({product.reviews.toLocaleString('en-US')} reviews)</span>
          </button>
          <span className="pdp-sold">
            <Icon name="flame" size={14} />
            {product.sold.toLocaleString('en-US')}+ sold
          </span>
        </div>
        <p className="pdp-tagline">{product.tagline}</p>
        <span className="pdp-updated tiny">
          <Icon name="clock" size={13} /> Build updated {timeAgo(product.updatedAt)}
        </span>
      </div>

      <StatusNotice product={product} />

      <PlanPicker plans={product.plans} value={plan.id} onChange={setPlanId} disabled={!canBuy} />

      {product.stock !== undefined && canBuy && (
        <div className="pdp-stock" role="status">
          <div className="pdp-stock-row">
            <span>
              <Icon name="alert" size={14} />
              <span>
                Only <b>{product.stock} keys</b> left at this price
              </span>
            </span>
            <span className="mono tiny">{product.stock} / 50</span>
          </div>
          <span className="pdp-stock-bar" aria-hidden="true">
            <span style={{ width: `${stockPct}%` }} />
          </span>
        </div>
      )}

      {canBuy && (
        <div className="pdp-qty-row">
          <div className="stack gap-4">
            <span className="pdp-label">Quantity</span>
            <QtyStepper value={qty} onChange={setQty} />
          </div>
          <div className="pdp-total">
            <span className="pdp-label">Total</span>
            <strong className="tabular">{formatPrice(total)}</strong>
            {qty > 1 && (
              <span className="tiny muted tabular">
                {qty} × {formatPrice(plan.price)}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="pdp-actions" ref={actionsRef}>
        {canBuy ? (
          <>
            <button type="button" className="btn btn-primary btn-lg" onClick={add}>
              <Icon name="cart" /> Add to cart
            </button>
            <button type="button" className="btn btn-white btn-lg" onClick={buy}>
              Buy now <Icon name="arrow-right" />
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost btn-lg pdp-paused-btn" disabled>
            <Icon name="lock" /> Sales paused while we rebuild
          </button>
        )}
      </div>

      <ul className="pdp-trust">
        {TRUST.map((t) => (
          <li key={t.title}>
            <span className="pdp-trust-icon">
              <Icon name={t.icon} size={16} />
            </span>
            <span>
              <strong>{t.title}</strong>
              <span>{t.body}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="pdp-pay">
        <span className="pdp-label">Accepted payments</span>
        <ul className="pdp-pay-list">
          {PAYMENTS.map((p) => (
            <li key={p.label}>
              {p.icon && <Icon name={p.icon} size={13} />}
              {p.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile sticky buy bar                                               */
/* ------------------------------------------------------------------ */

export function MobileBuyBar({
  product,
  game,
  purchase,
  watchRef,
}: {
  product: Product;
  game: Game;
  purchase: Purchase;
  watchRef: RefObject<HTMLDivElement>;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // Show once the real buttons have scrolled up past the top of the viewport, and hide again once the
    // footer comes into view so the bar never sits on top of it (that also drops --sticky-bottom).
    // A scroll listener (not IntersectionObserver) so big jumps, e.g. back to top, are caught too.
    let raf = 0;
    const check = () => {
      raf = 0;
      const el = watchRef.current;
      if (!el) return;
      const footer = document.querySelector('.footer');
      setShow(el.getBoundingClientRect().bottom < 0 && (!footer || footer.getBoundingClientRect().top > window.innerHeight));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [watchRef]);

  // Let floating widgets (chat button, toasts) lift above the bar while it's visible.
  useEffect(() => {
    const root = document.documentElement;
    if (show && window.matchMedia('(max-width: 960px)').matches) root.style.setProperty('--sticky-bottom', '76px');
    else root.style.removeProperty('--sticky-bottom');
    return () => {
      root.style.removeProperty('--sticky-bottom');
    };
  }, [show]);

  // React 18 has no `inert` prop: set it directly so hidden controls can't take focus.
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    barRef.current?.toggleAttribute('inert', !show);
  }, [show]);

  const { plan, qty, canBuy, add } = purchase;
  return (
    <div ref={barRef} className={`pdp-bar${show ? ' is-shown' : ''}`} aria-hidden={!show}>
      <div className="pdp-bar-inner">
        <span className="pdp-bar-art">
          <GameArt game={game} variant="tile" />
        </span>
        <span className="pdp-bar-info">
          <span className="pdp-bar-name">{product.name}</span>
          <span className="pdp-bar-plan">
            {canBuy ? (
              <>
                <span className="pdp-bar-plan-label">
                  {plan.label}
                  {qty > 1 ? ` × ${qty}` : ''}
                </span>
                <span className="pdp-bar-sep">·</span>
                <b className="tabular">{formatPrice(plan.price * qty)}</b>
              </>
            ) : (
              <span className="pdp-bar-paused">Sales paused</span>
            )}
          </span>
        </span>
        {canBuy ? (
          <button type="button" className="btn btn-primary" onClick={add}>
            <Icon name="cart" /> Add to cart
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-white"
            onClick={() =>
              document.getElementById('pdp-notify')?.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                block: 'center',
              })
            }
          >
            Notify me
          </button>
        )}
      </div>
    </div>
  );
}
