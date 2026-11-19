import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { BRAND } from '../config';
import { KIND_LABEL, formatDate, formatPrice, getGame, getProduct } from '../data/catalog';
import type { Product } from '../data/types';
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { Avatar, EmptyState, StatusBadge } from '../components/ui';
import { Link, navigate, useRoute } from '../router';
import { useAuth, useUI } from '../state/store';
import {
  DAY,
  LOADER,
  METHOD_LABEL,
  copyText,
  expiresAt,
  formatRemaining,
  licenseKey,
  loadOrders,
  maskKey,
  type Order,
} from './orders';
import './dashboard.css';

/* ------------------------------------------------------------------ */
/* Types & data                                                        */
/* ------------------------------------------------------------------ */

type Tab = 'licenses' | 'orders' | 'downloads' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'licenses', label: 'Licenses', icon: 'key' },
  { id: 'orders', label: 'Orders', icon: 'list' },
  { id: 'downloads', label: 'Downloads', icon: 'download' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

interface License {
  key: string;
  product: Product;
  planLabel: string;
  days: number | null;
  purchasedAt: string;
  orderId: string;
  demo?: boolean;
}

const PERKS: { icon: string; title: string; body: string }[] = [
  { icon: 'key', title: 'Every license key', body: 'Reveal, copy and track expiry in one place.' },
  { icon: 'download', title: 'Loader & setup guides', body: 'Always the latest signed build.' },
  { icon: 'activity', title: 'Status alerts', body: 'Know the second your game patches.' },
  { icon: 'list', title: 'Orders & receipts', body: 'Full history, ready for any question.' },
];

const PREFS_KEY = `${BRAND.storageKey}.prefs`;

interface Prefs {
  twoFactor: boolean;
  statusAlerts: boolean;
  receipts: boolean;
  deals: boolean;
}
const DEFAULT_PREFS: Prefs = { twoFactor: false, statusAlerts: true, receipts: true, deals: false };

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}
function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: settings still apply for this visit */
  }
}

function licensesFrom(orders: Order[]): License[] {
  const out: License[] = [];
  for (const o of orders) {
    for (const l of o.lines) {
      const product = getProduct(l.productSlug);
      if (!product) continue;
      for (const key of l.keys) {
        out.push({ key, product, planLabel: l.planLabel, days: l.days, purchasedAt: o.createdAt, orderId: o.id });
      }
    }
  }
  return out;
}

function demoLicenses(now: number): License[] {
  const a = getProduct('valorant-nightfall');
  const b = getProduct('spoofer-perm');
  const out: License[] = [];
  if (a)
    out.push({
      key: licenseKey('demo-valorant'),
      product: a,
      planLabel: '1 Month',
      days: 30,
      purchasedAt: new Date(now - 9.38 * DAY).toISOString(),
      orderId: 'DEMO',
      demo: true,
    });
  if (b)
    out.push({
      key: licenseKey('demo-spoofer'),
      product: b,
      planLabel: 'Lifetime',
      days: null,
      purchasedAt: new Date(now - 41 * DAY).toISOString(),
      orderId: 'DEMO',
      demo: true,
    });
  return out;
}

function setupSteps(product: Product): string[] {
  const game = getGame(product.gameSlug)?.name ?? 'the game';
  switch (product.kind) {
    case 'spoofer':
      return [
        `Download the ${BRAND.name} Loader and run it as administrator before launching any game.`,
        'Paste your key and select the spoofer.',
        product.slug.includes('perm')
          ? 'Press Spoof and reboot once when asked. The new serials stick for good.'
          : 'Press Spoof and keep the loader open. Everything reverts when you restart.',
        'Launch your game on a fresh account and play as normal.',
      ];
    case 'radar':
      return [
        `Download the ${BRAND.name} Loader and run it as administrator.`,
        `Paste your key, select ${product.name} and start ${game}.`,
        'Scan the QR code to open the radar on your phone, tablet or second monitor.',
        'Filter loot by value and share the live link with your squad.',
      ];
    case 'unlocker':
      return [
        `Download the ${BRAND.name} Loader and run it as administrator.`,
        `Paste your key and select ${product.name}.`,
        `Start ${game} and toggle Unlock All before matchmaking.`,
        'Pick your loadout and play. Nothing is written to your account.',
      ];
    default:
      return [
        `Download the ${BRAND.name} Loader and run it as administrator.`,
        `Paste your key and select ${product.name}.`,
        `Start ${game}${product.requirements.mode === 'Any' ? '' : ` in ${product.requirements.mode.toLowerCase()} mode`}.`,
        'Press INSERT in game to open the menu. Configs sync to the cloud.',
      ];
  }
}

/** True while the media query matches. */
function useMedia(query: string) {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  const [match, setMatch] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Live clock for countdowns. */
function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

function InfinityIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <path d="M12 12c-2-2.7-3.8-4-5.5-4a4 4 0 0 0 0 8c1.7 0 3.5-1.3 5.5-4Zm0 0c2 2.7 3.8 4 5.5 4a4 4 0 0 0 0-8c-1.7 0-3.5 1.3-5.5 4Z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return <Gate />;
  return <Dashboard />;
}

/* ------------------------------------------------------------------ */
/* Signed-out gate                                                     */
/* ------------------------------------------------------------------ */

function Gate() {
  const { openAuth } = useUI();
  return (
    <div className="page dash dash-guest">
      <div className="dash-bg" aria-hidden="true">
        <div className="bg-dots" />
        <div className="glow-blob dash-glow-a" />
        <div className="glow-blob dash-glow-b" />
      </div>
      <div className="container dash-gate-wrap">
        <section className="dash-gate card" aria-labelledby="dash-gate-title">
          <div className="dash-gate-preview" aria-hidden="true">
            <div className="dash-gp-card">
              <span className="dash-gp-tile" />
              <div className="dash-gp-lines">
                <span />
                <span />
              </div>
              <span className="dash-gp-badge">
                <span className="dot ok" /> Active
              </span>
            </div>
            <div className="dash-gp-key mono">
              <Icon name="lock" size={14} />
              ••••-••••-••••-••••
            </div>
          </div>

          <span className="eyebrow">Members area</span>
          <h1 className="dash-gate-title" id="dash-gate-title">
            Your keys,
            <br />
            <span className="accent">all in one place.</span>
          </h1>
          <p className="dash-gate-lead">
            Sign in to see your licenses, download the loader and manage your orders. Keys from checkout land here instantly.
          </p>

          <ul className="dash-perks">
            {PERKS.map((p) => (
              <li key={p.title}>
                <span className="dash-perk-ic">
                  <Icon name={p.icon} size={17} />
                </span>
                <div>
                  <strong>{p.title}</strong>
                  <span>{p.body}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="dash-gate-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => openAuth('signin')}>
              <Icon name="user" /> Sign in
            </button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => openAuth('register')}>
              Create account
            </button>
          </div>
          <p className="dash-gate-foot">
            Bought as a guest? Your account was created at checkout. Use the same email to sign in.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Signed-in dashboard                                                 */
/* ------------------------------------------------------------------ */

function Dashboard() {
  const { user } = useAuth();
  const route = useRoute();
  const now = useNow(1000);
  const [orders] = useState<Order[]>(loadOrders);
  const [mountedAt] = useState(() => Date.now());
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ licenses: null, orders: null, downloads: null, settings: null });

  const q = route.query.get('tab');
  const tab: Tab = TABS.some((t) => t.id === q) ? (q as Tab) : 'licenses';

  const real = useMemo(() => licensesFrom(orders), [orders]);
  const isDemo = real.length === 0;
  const licenses = isDemo ? demoLicenses(mountedAt) : real;

  if (!user) return null;

  const active = real.filter((l) => {
    const exp = expiresAt(l.purchasedAt, l.days);
    return exp === null || exp > now;
  }).length;
  const spent = orders.reduce((s, o) => s + o.total, 0);

  const select = (id: Tab, focus = false) => {
    navigate(`/dashboard?tab=${id}`, { replace: true });
    if (focus) window.requestAnimationFrame(() => tabRefs.current[id]?.focus());
  };

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = TABS.length - 1;
    if (n < 0) return;
    e.preventDefault();
    select(TABS[n].id, true);
  };

  const counts: Partial<Record<Tab, number>> = { licenses: licenses.length, orders: orders.length };

  return (
    <div className="page dash">
      <div className="dash-bg" aria-hidden="true">
        <div className="bg-grid" />
        <div className="glow-blob dash-glow-a" />
      </div>
      <div className="container dash-container">
        <section className="dash-hero card" aria-label="Account overview">
          <div className="dash-hero-art" aria-hidden="true" />
          <div className="dash-hero-main">
            <span className="dash-avatar">
              <Avatar name={user.username} size={68} />
              <span className="dash-avatar-dot" />
            </span>
            <div className="dash-hero-text">
              <span className="dash-hello mono">Welcome back</span>
              <h1 className="dash-name">{user.username}</h1>
              <div className="dash-meta">
                <span>
                  <Icon name="mail" size={14} /> {user.email}
                </span>
                <span>
                  <Icon name="calendar" size={14} /> Member since {formatDate(user.joined)}
                </span>
              </div>
            </div>
          </div>
          <dl className="dash-stats">
            <div>
              <dt>Active keys</dt>
              <dd className="tabular">{active}</dd>
            </div>
            <div>
              <dt>Orders</dt>
              <dd className="tabular">{orders.length}</dd>
            </div>
            <div>
              <dt>Total spent</dt>
              <dd className="tabular">{formatPrice(spent)}</dd>
            </div>
          </dl>
        </section>

        <div className="dash-tabs-wrap">
          <div className="dash-tabs" role="tablist" aria-label="Dashboard sections" onKeyDown={onTabKey}>
            {TABS.map((t) => {
              const on = tab === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`dash-tab-${t.id}`}
                  aria-selected={on}
                  aria-controls={`dash-panel-${t.id}`}
                  tabIndex={on ? 0 : -1}
                  className="dash-tab"
                  onClick={() => select(t.id)}
                >
                  <Icon name={t.icon} size={16} />
                  {t.label}
                  {counts[t.id] !== undefined && <span className="dash-tab-count tabular">{counts[t.id]}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div
          key={tab}
          className="dash-panel"
          role="tabpanel"
          id={`dash-panel-${tab}`}
          aria-labelledby={`dash-tab-${tab}`}
          tabIndex={0}
        >
          {tab === 'licenses' && <LicensesPanel licenses={licenses} demo={isDemo} now={now} />}
          {tab === 'orders' && <OrdersPanel orders={orders} />}
          {tab === 'downloads' && <DownloadsPanel />}
          {tab === 'settings' && <SettingsPanel />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Licenses                                                            */
/* ------------------------------------------------------------------ */

function PanelHead({ title, sub, action }: { title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="dash-panel-head">
      <div>
        <h2 className="dash-panel-title">{title}</h2>
        <p className="dash-panel-sub">{sub}</p>
      </div>
      {action}
    </div>
  );
}

function LicensesPanel({ licenses, demo, now }: { licenses: License[]; demo: boolean; now: number }) {
  return (
    <>
      <PanelHead
        title="Your licenses"
        sub={demo ? 'Here’s what your keys will look like once you buy.' : 'Reveal, copy and track every key you own.'}
        action={
          <Link to="/store" className="btn btn-ghost btn-sm">
            <Icon name="plus" size={15} /> Buy another
          </Link>
        }
      />
      {demo && (
        <div className="dash-demo-note">
          <span className="badge badge-violet">Demo</span>
          <p>
            These two licenses are examples so you can explore the dashboard. Your real keys appear here the moment you check out.
          </p>
          <Link to="/store" className="btn btn-primary btn-sm">
            Browse store <Icon name="arrow-right" />
          </Link>
        </div>
      )}
      <div className="dash-lic-grid">
        {licenses.map((l, i) => (
          <LicenseCard key={l.key} lic={l} now={now} index={i} />
        ))}
      </div>
    </>
  );
}

function LicenseCard({ lic, now, index }: { lic: License; now: number; index: number }) {
  const { toast } = useUI();
  const [revealed, setRevealed] = useState(false);
  const [guide, setGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const guideId = useId();
  const game = getGame(lic.product.gameSlug);
  const frozenAt = useRef(now).current;
  const exp = expiresAt(lic.purchasedAt, lic.days);
  // While a build is updating the clock is paused, so the countdown stops ticking.
  const pausable = lic.product.status === 'updating';
  const remaining = exp === null ? null : exp - (pausable ? frozenAt : now);
  const expired = remaining !== null && remaining <= 0;
  const pct = exp === null || lic.days === null ? 100 : Math.max(0, Math.min(100, ((remaining ?? 0) / (lic.days * DAY)) * 100));
  const fresh = !lic.demo && now - new Date(lic.purchasedAt).getTime() < 60 * 60 * 1000;
  const low = remaining !== null && remaining > 0 && remaining < DAY;
  const paused = lic.product.status === 'updating' && !expired;

  const copy = async () => {
    const ok = await copyText(lic.key);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast({ title: 'License key copied', body: `${lic.product.name} · ${maskKey(lic.key)}` });
    } else {
      toast({ title: 'Couldn’t copy automatically', body: 'Reveal the key and copy it manually.', tone: 'warn' });
    }
  };

  const download = () => toast({ title: 'Download starting', body: `${LOADER.file} · ${LOADER.size}`, tone: 'info' });

  return (
    <article className={`dash-lic card${expired ? ' is-expired' : ''}`} style={{ ['--i' as string]: index }}>
      <div className="dash-lic-top">
        {game && <GameArt game={game} variant="tile" className="dash-tile" />}
        <div className="dash-lic-head">
          <div className="dash-lic-tags">
            <span className="tiny mono muted">{KIND_LABEL[lic.product.kind].toUpperCase()}</span>
            {lic.demo && <span className="badge badge-violet">Demo</span>}
            {fresh && <span className="badge badge-solid">New</span>}
          </div>
          <h3 className="dash-lic-name">{lic.product.name}</h3>
          <div className="dash-lic-plan">
            <span className="dash-plan">{lic.planLabel}</span>
            <span>Bought {formatDate(lic.purchasedAt)}</span>
          </div>
        </div>
        <StatusBadge status={lic.product.status} size="sm" />
      </div>

      <div className="dash-key">
        <div className="dash-key-row">
          <Icon name="key" size={15} className="dash-key-ic" />
          <code className={`dash-key-code${revealed ? ' is-revealed' : ''}`} aria-label={revealed ? lic.key : 'License key hidden'}>
            {revealed ? lic.key : maskKey(lic.key)}
          </code>
          <button
            type="button"
            className="btn btn-quiet btn-icon btn-sm dash-key-btn"
            onClick={() => setRevealed((r) => !r)}
            aria-pressed={revealed}
            aria-label={revealed ? 'Hide key' : 'Reveal key'}
            title={revealed ? 'Hide key' : 'Reveal key'}
          >
            <Icon name={revealed ? 'eye-off' : 'eye'} size={16} />
          </button>
          <button
            type="button"
            className={`btn btn-quiet btn-icon btn-sm dash-key-btn${copied ? ' is-copied' : ''}`}
            onClick={copy}
            aria-label="Copy key"
            title="Copy key"
          >
            <Icon name={copied ? 'check' : 'copy'} size={16} />
          </button>
        </div>
      </div>

      <div className={`dash-exp${low ? ' is-low' : ''}${expired ? ' is-expired' : ''}${exp === null ? ' is-life' : ''}`}>
        <div className="dash-exp-row">
          {exp === null ? (
            <span className="dash-exp-label">
              <InfinityIcon /> Lifetime access
            </span>
          ) : expired ? (
            <span className="dash-exp-label">
              <Icon name="clock" size={15} /> Expired {formatDate(new Date(exp).toISOString())}
            </span>
          ) : (
            <span className="dash-exp-label">
              <Icon name="clock" size={15} /> {paused ? 'Paused at' : 'Expires in'}
            </span>
          )}
          <span className="dash-exp-value mono tabular">
            {exp === null ? 'Never expires' : expired ? 'Renew to continue' : formatRemaining(remaining ?? 0)}
          </span>
        </div>
        <div className="dash-exp-bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        {paused && (
          <p className="dash-exp-note">
            <Icon name="info" size={13} /> Build is updating. Your clock is paused until it’s green again.
          </p>
        )}
      </div>

      <div className="dash-lic-actions">
        {expired ? (
          <Link to={`/product/${lic.product.slug}`} className="btn btn-primary btn-sm">
            <Icon name="refresh" /> Renew
          </Link>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={download}>
            <Icon name="download" /> Download loader
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setGuide((g) => !g)}
          aria-expanded={guide}
          aria-controls={guideId}
        >
          <Icon name="list" /> Setup guide
          <Icon name="chevron-down" size={14} className={`dash-chev${guide ? ' is-open' : ''}`} />
        </button>
      </div>

      <div className={`dash-guide${guide ? ' is-open' : ''}`} id={guideId}>
        <div className="dash-guide-inner">
          <ol className="dash-guide-list">
            {setupSteps(lic.product).map((s, i) => (
              <li key={i}>
                <span className="dash-guide-n mono">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <Link to={`/product/${lic.product.slug}`} className="dash-guide-more">
            Full product page <Icon name="arrow-up-right" size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

function OrdersPanel({ orders }: { orders: Order[] }) {
  const { toast } = useUI();
  // Render either the table or the cards (not both) so generated art IDs never live inside a hidden subtree.
  const compact = useMedia('(max-width: 820px)');
  const receipt = (o: Order) => toast({ title: 'Receipt sent', body: `A copy of #${o.id} is on its way to ${o.email}.`, tone: 'info' });
  const methodText = (o: Order) => (o.method === 'crypto' && o.crypto ? `Crypto · ${o.crypto}` : METHOD_LABEL[o.method]);
  const itemCount = (o: Order) => o.lines.reduce((s, l) => s + l.qty, 0);

  if (orders.length === 0) {
    return (
      <>
        <PanelHead title="Orders" sub="Every purchase and receipt, newest first." />
        <div className="card dash-empty">
          <EmptyState
            icon="box"
            title="No orders yet"
            body="Your receipts show up here the moment you check out. Keys are delivered instantly."
            action={
              <Link to="/store" className="btn btn-primary">
                Browse store <Icon name="arrow-right" />
              </Link>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PanelHead title="Orders" sub="Every purchase and receipt, newest first." />
      {!compact && (
        <div className="card dash-table-card">
          <table className="table dash-table">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Date</th>
                <th scope="col">Items</th>
                <th scope="col">Payment</th>
                <th scope="col" className="dash-num">
                  Total
                </th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Receipt</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <span className="mono dash-oid">#{o.id}</span>
                  </td>
                  <td className="muted">{formatDate(o.createdAt)}</td>
                  <td>
                    <OrderItems order={o} />
                  </td>
                  <td className="text-2">{methodText(o)}</td>
                  <td className="dash-num tabular dash-total">{formatPrice(o.total)}</td>
                  <td>
                    <span className="badge badge-ok">
                      <Icon name="check" size={11} strokeWidth={2.6} /> Paid
                    </span>
                  </td>
                  <td className="dash-num">
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => receipt(o)}>
                      <Icon name="mail" size={15} /> Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {compact && (
        <ul className="dash-order-cards">
          {orders.map((o) => (
            <li key={o.id} className="card dash-order-card">
              <div className="dash-oc-top">
                <div>
                  <span className="mono dash-oid">#{o.id}</span>
                  <div className="tiny muted">
                    {formatDate(o.createdAt)} · {itemCount(o)} {itemCount(o) === 1 ? 'item' : 'items'} · {methodText(o)}
                  </div>
                </div>
                <span className="badge badge-ok">
                  <Icon name="check" size={11} strokeWidth={2.6} /> Paid
                </span>
              </div>
              <OrderItems order={o} />
              <div className="dash-oc-foot">
                <span className="dash-total tabular">{formatPrice(o.total)}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => receipt(o)}>
                  <Icon name="mail" size={15} /> Receipt
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function OrderItems({ order }: { order: Order }) {
  return (
    <div className="dash-items">
      <span className="dash-item-stack" aria-hidden="true">
        {order.lines.slice(0, 3).map((l) => {
          const p = getProduct(l.productSlug);
          const g = p ? getGame(p.gameSlug) : undefined;
          return g ? <GameArt key={l.planId} game={g} variant="tile" className="dash-mini" /> : null;
        })}
      </span>
      <span className="dash-item-names">
        {order.lines.map((l, i) => (
          <span key={l.planId}>
            {l.productName}
            <span className="muted">
              {' '}
              · {l.planLabel}
              {l.qty > 1 ? ` ×${l.qty}` : ''}
            </span>
            {i < order.lines.length - 1 && <br />}
          </span>
        ))}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Downloads                                                           */
/* ------------------------------------------------------------------ */

function DownloadsPanel() {
  const { toast } = useUI();
  const [copied, setCopied] = useState(false);

  const download = () => toast({ title: 'Download starting', body: `${LOADER.file} · ${LOADER.size}`, tone: 'info' });
  const copyHash = async () => {
    const ok = await copyText(LOADER.sha256);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast({ title: 'Checksum copied', body: 'Compare it with Get-FileHash in PowerShell.' });
    }
  };

  return (
    <>
      <PanelHead title="Downloads" sub="One loader for every product you own. Always grab it from here." />
      <div className="dash-dl-grid">
        <section className="card dash-loader" aria-labelledby="dash-loader-title">
          <div className="dash-loader-top">
            <span className="dash-loader-ic">
              <Icon name="box" size={26} />
            </span>
            <div className="grow">
              <div className="row gap-8 wrap">
                <h3 className="dash-loader-title" id="dash-loader-title">
                  {BRAND.name} Loader
                </h3>
                <span className="badge badge-ok">Latest</span>
              </div>
              <p className="small muted">Signed build · works with every product on your account</p>
            </div>
          </div>

          <dl className="dash-loader-meta">
            <div>
              <dt>Version</dt>
              <dd className="mono">v{LOADER.version}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd className="mono">{LOADER.size}</dd>
            </div>
            <div>
              <dt>Platform</dt>
              <dd>{LOADER.platform}</dd>
            </div>
            <div>
              <dt>Released</dt>
              <dd>{formatDate(LOADER.released)}</dd>
            </div>
          </dl>

          <div className="dash-hash">
            <div className="dash-hash-head">
              <span className="dash-hash-label mono">SHA-256</span>
              <button type="button" className={`btn btn-quiet btn-sm dash-hash-copy${copied ? ' is-copied' : ''}`} onClick={copyHash}>
                <Icon name={copied ? 'check' : 'copy'} size={14} /> {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <code className="dash-hash-code">{LOADER.sha256}</code>
          </div>

          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={download}>
            <Icon name="download" /> Download v{LOADER.version}
            <span className="dash-dl-size mono">{LOADER.size}</span>
          </button>

          <div className="dash-changelog">
            <h4 className="dash-cl-title">What’s new in {LOADER.version}</h4>
            <ul>
              {LOADER.changelog.map((c) => (
                <li key={c}>
                  <Icon name="check" size={14} strokeWidth={2.4} />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="dash-dl-side">
          <section className="card dash-side-card" aria-labelledby="dash-before">
            <h3 className="dash-side-title" id="dash-before">
              Before you launch
            </h3>
            <ul className="dash-check">
              <li>
                <Icon name="monitor" size={16} /> Windows 10 or 11, version 22H2 or newer
              </li>
              <li>
                <Icon name="shield" size={16} /> Right-click the loader and run as administrator
              </li>
              <li>
                <Icon name="layers" size={16} /> Use borderless windowed for overlays
              </li>
              <li>
                <Icon name="activity" size={16} /> Check live status before every session
              </li>
            </ul>
            <Link to="/status" className="dash-side-link">
              Open live status <Icon name="arrow-right" size={14} />
            </Link>
          </section>

          <section className="card dash-side-card dash-help" aria-labelledby="dash-help">
            <span className="icon-tile is-accent">
              <Icon name="headset" />
            </span>
            <h3 className="dash-side-title" id="dash-help">
              Want a hand with setup?
            </h3>
            <p className="small muted">
              A specialist connects over remote desktop, sets everything up with you and runs a test match.
            </p>
            <Link to="/support" className="btn btn-ghost btn-sm">
              Talk to support <Icon name="arrow-right" />
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

function Switch({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  const id = useId();
  return (
    <div className="dash-toggle">
      <div className="dash-toggle-text">
        <span className="dash-toggle-label" id={`${id}-l`}>
          {label}
        </span>
        <span className="dash-toggle-desc" id={`${id}-d`}>
          {desc}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        className="switch dash-switch"
        aria-checked={on}
        aria-labelledby={`${id}-l`}
        aria-describedby={`${id}-d`}
        onClick={() => onChange(!on)}
      />
    </div>
  );
}

function SettingsPanel() {
  const { user, signIn, signOut } = useAuth();
  const { toast } = useUI();
  const uid = useId();
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  const setPref = <K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    setPrefs((p) => {
      const next = { ...p, [k]: v };
      savePrefs(next);
      return next;
    });
  };

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      toast({ title: 'Check your details', body: 'Username can’t be empty and the email needs to be valid.', tone: 'warn' });
      return;
    }
    signIn(email.trim(), username.trim());
    setUsername(username.trim());
    setEmail(email.trim());
    toast({ title: 'Profile saved', body: 'Your changes are live across your account.' });
  };

  const doSignOut = () => {
    signOut();
    toast({ title: 'Signed out', body: 'See you next session.', tone: 'info' });
    navigate('/');
  };

  return (
    <>
      <PanelHead title="Settings" sub="Profile, security and how we keep in touch." />
      <div className="dash-set-grid">
        <form className="card dash-set-card" onSubmit={saveProfile} aria-labelledby={`${uid}-profile`}>
          <div className="dash-set-head">
            <span className="icon-tile">
              <Icon name="user" />
            </span>
            <div>
              <h3 className="dash-side-title" id={`${uid}-profile`}>
                Profile
              </h3>
              <p className="tiny muted">How you appear in support chats and reviews.</p>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor={`${uid}-user`}>
              Username
            </label>
            <div className="input-wrap">
              <Icon name="user" />
              <input id={`${uid}-user`} className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor={`${uid}-mail`}>
              Email
            </label>
            <div className="input-wrap">
              <Icon name="mail" />
              <input
                id={`${uid}-mail`}
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>
          <div className="dash-set-actions">
            <button type="submit" className="btn btn-primary">
              Save changes
            </button>
          </div>
        </form>

        <section className="card dash-set-card" aria-labelledby={`${uid}-sec`}>
          <div className="dash-set-head">
            <span className="icon-tile">
              <Icon name="shield-check" />
            </span>
            <div>
              <h3 className="dash-side-title" id={`${uid}-sec`}>
                Security
              </h3>
              <p className="tiny muted">Keep your keys locked to you.</p>
            </div>
          </div>
          <Switch
            on={prefs.twoFactor}
            onChange={(v) => {
              setPref('twoFactor', v);
              toast({
                title: v ? 'Two-factor authentication on' : 'Two-factor authentication off',
                body: v ? 'We’ll ask for a code from your authenticator app at sign-in.' : 'You can turn it back on any time.',
                tone: v ? 'ok' : 'warn',
              });
            }}
            label="Two-factor authentication"
            desc="Require a code from an authenticator app when you sign in."
          />
          <div className="dash-row-line">
            <div className="dash-toggle-text">
              <span className="dash-toggle-label">Password</span>
              <span className="dash-toggle-desc">We’ll email you a secure reset link.</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => toast({ title: 'Reset link sent', body: `Check ${user?.email ?? 'your inbox'}.`, tone: 'info' })}
            >
              Change
            </button>
          </div>
          <div className="dash-row-line">
            <div className="dash-toggle-text">
              <span className="dash-toggle-label">HWID resets</span>
              <span className="dash-toggle-desc">Moved PC? 2 free resets left this month.</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => toast({ title: 'HWID reset requested', body: 'Your keys unbind within a minute.', tone: 'info' })}
            >
              Reset
            </button>
          </div>
        </section>

        <section className="card dash-set-card" aria-labelledby={`${uid}-notif`}>
          <div className="dash-set-head">
            <span className="icon-tile">
              <Icon name="mail" />
            </span>
            <div>
              <h3 className="dash-side-title" id={`${uid}-notif`}>
                Email notifications
              </h3>
              <p className="tiny muted">Only the emails you actually want.</p>
            </div>
          </div>
          <Switch
            on={prefs.statusAlerts}
            onChange={(v) => setPref('statusAlerts', v)}
            label="Status alerts"
            desc="When a product you own goes Updating or back to Undetected."
          />
          <Switch on={prefs.receipts} onChange={(v) => setPref('receipts', v)} label="Order receipts" desc="A receipt and your keys for every purchase." />
          <Switch on={prefs.deals} onChange={(v) => setPref('deals', v)} label="Drops & deals" desc="New games and the occasional discount code. Max twice a month." />
        </section>

        <section className="card dash-set-card dash-session" aria-labelledby={`${uid}-session`}>
          <div className="dash-set-head">
            <span className="icon-tile">
              <Icon name="monitor" />
            </span>
            <div>
              <h3 className="dash-side-title" id={`${uid}-session`}>
                Session
              </h3>
              <p className="tiny muted">You’re signed in on this browser.</p>
            </div>
          </div>
          <div className="dash-device">
            <span className="dot ok pulse" aria-hidden="true" />
            <div className="grow">
              <div className="dash-toggle-label">This device</div>
              <div className="dash-toggle-desc">Active now · {user?.email}</div>
            </div>
          </div>
          <button type="button" className="btn btn-danger btn-block" onClick={doSignOut}>
            <Icon name="log-out" /> Sign out
          </button>
        </section>
      </div>
    </>
  );
}
