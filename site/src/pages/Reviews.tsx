import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { Avatar, EmptyState, Stars } from '../components/ui';
import { BRAND } from '../config';
import { NOW, PRODUCTS, REVIEWS, formatDate, getGame, getProduct } from '../data/catalog';
import type { Review } from '../data/types';
import { Link } from '../router';
import { useAuth, useUI } from '../state/store';
import { DISTRIBUTION, EXTRA_REVIEWS, RATING_WORDS } from './reviews-data';
import './reviews.css';

const ALL: Review[] = [...REVIEWS, ...EXTRA_REVIEWS];
const PAGE = 12;
const MIN_CHARS = 20;
const MAX_CHARS = 500;

/** Reviews written on this device, kept until "verification" so a reload doesn't lose them. */
const MINE_KEY = `${BRAND.storageKey}.reviews`;
const MAX_SAVED = 20;

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

function toSavedReview(v: unknown): Review | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Record<string, unknown>;
  const p = typeof r.productSlug === 'string' ? getProduct(r.productSlug) : undefined;
  const author = typeof r.author === 'string' ? r.author.trim() : '';
  const text = typeof r.text === 'string' ? r.text.trim() : '';
  const ok =
    !!p &&
    typeof r.id === 'string' &&
    r.id.startsWith('mine-') &&
    author.length >= 1 &&
    author.length <= 64 &&
    typeof r.plan === 'string' &&
    (r.plan === '' || p.plans.some((pl) => pl.label === r.plan)) &&
    typeof r.rating === 'number' &&
    Number.isInteger(r.rating) &&
    r.rating >= 1 &&
    r.rating <= 5 &&
    text.length >= MIN_CHARS &&
    text.length <= MAX_CHARS &&
    typeof r.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    !Number.isNaN(Date.parse(r.date));
  if (!ok || !p) return null;
  return {
    id: r.id as string,
    author,
    productSlug: p.slug,
    plan: r.plan as string,
    rating: r.rating as Review['rating'],
    text,
    date: r.date as string,
    verified: false,
  };
}

function loadMine(): Review[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(MINE_KEY) ?? '[]');
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    const out: Review[] = [];
    for (const v of data) {
      const r = toSavedReview(v);
      if (!r || seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
      if (out.length >= MAX_SAVED) break;
    }
    return out;
  } catch {
    return [];
  }
}

function saveMine(list: Review[]) {
  try {
    if (list.length) localStorage.setItem(MINE_KEY, JSON.stringify(list.slice(0, MAX_SAVED)));
    else localStorage.removeItem(MINE_KEY);
  } catch {
    /* storage unavailable: the review still shows for this visit */
  }
}

type Sort = 'newest' | 'highest' | 'lowest';
const SORTS: { id: Sort; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'highest', label: 'Highest' },
  { id: 'lowest', label: 'Lowest' },
];

/** Newest first. On the same day your own pending reviews lead, latest first. */
const byDate = (a: Review, b: Review) => {
  const am = a.id.startsWith('mine-');
  const bm = b.id.startsWith('mine-');
  if (a.date !== b.date) return b.date.localeCompare(a.date);
  if (am !== bm) return am ? -1 : 1;
  return am ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id);
};

function sortReviews(list: Review[], sort: Sort) {
  const out = [...list];
  if (sort === 'newest') out.sort(byDate);
  if (sort === 'highest') out.sort((a, b) => b.rating - a.rating || byDate(a, b));
  if (sort === 'lowest') out.sort((a, b) => a.rating - b.rating || byDate(a, b));
  return out;
}

function useColumnCount() {
  const get = () => (window.innerWidth >= 1080 ? 3 : window.innerWidth >= 700 ? 2 : 1);
  const [n, setN] = useState(get);
  useEffect(() => {
    const on = () => setN(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return n;
}

/** Greedy masonry: each card goes to the currently shortest column (by estimated height). Stable for appended items. */
function toColumns(list: Review[], n: number) {
  const cols: Review[][] = Array.from({ length: n }, () => []);
  const heights = new Array(n).fill(0);
  for (const r of list) {
    let k = 0;
    for (let i = 1; i < n; i++) if (heights[i] < heights[k] - 1) k = i;
    cols[k].push(r);
    heights[k] += 190 + Math.ceil(r.text.length / 48) * 24;
  }
  return cols;
}

export function ReviewsPage() {
  const [product, setProduct] = useState<string>('all');
  const [rating, setRating] = useState<number>(0);
  const [sort, setSort] = useState<Sort>('newest');
  const [visible, setVisible] = useState(PAGE);
  const [batchStart, setBatchStart] = useState(0);
  const [mine, setMine] = useState<Review[]>(loadMine);
  const [writing, setWriting] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const cols = useColumnCount();

  useEffect(() => saveMine(mine), [mine]);

  const pool = useMemo(() => [...mine, ...ALL], [mine]);

  const productOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of pool) counts.set(r.productSlug, (counts.get(r.productSlug) ?? 0) + 1);
    return PRODUCTS.filter((p) => counts.has(p.slug)).map((p) => ({ slug: p.slug, name: p.name, count: counts.get(p.slug)! }));
  }, [pool]);

  const byProduct = useMemo(() => (product === 'all' ? pool : pool.filter((r) => r.productSlug === product)), [pool, product]);
  const starCounts = useMemo(() => {
    const c = [0, 0, 0, 0, 0, 0];
    for (const r of byProduct) c[r.rating]++;
    return c;
  }, [byProduct]);

  const filtered = useMemo(
    () => sortReviews(rating ? byProduct.filter((r) => r.rating === rating) : byProduct, sort),
    [byProduct, rating, sort],
  );
  const shown = filtered.slice(0, visible);
  const columns = useMemo(() => toColumns(shown, cols), [shown, cols]);
  const remaining = filtered.length - shown.length;
  const indexOf = useMemo(() => new Map(shown.map((r, i) => [r.id, i])), [shown]);

  const reset = () => {
    setVisible(PAGE);
    setBatchStart(0);
  };
  const changeProduct = (v: string) => {
    setProduct(v);
    reset();
  };
  const changeRating = (v: number) => {
    setRating((cur) => (cur === v ? 0 : v));
    reset();
  };
  const changeSort = (v: Sort) => {
    setSort(v);
    reset();
  };
  const clearAll = () => {
    setProduct('all');
    setRating(0);
    reset();
  };
  const loadMore = () => {
    setBatchStart(visible);
    setVisible((v) => v + PAGE);
  };

  const pickFromChart = (stars: number) => {
    changeRating(stars);
    const el = toolbarRef.current;
    if (el && el.getBoundingClientRect().top > window.innerHeight * 0.75) {
      el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    }
  };

  const onSubmitted = (r: Review) => {
    setMine((m) => [r, ...m].slice(0, MAX_SAVED));
    setProduct('all');
    setRating(0);
    setSort('newest');
    reset();
    // Bring the new (pending) card into view once the dialog has closed.
    window.setTimeout(() => toolbarRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' }), 120);
  };

  const filteredActive = product !== 'all' || rating !== 0;

  return (
    <div className="page rev">
      <div className="rev-glow" aria-hidden="true">
        <div className="bg-grid" />
        <div className="glow-blob rev-glow-a" />
        <div className="glow-blob rev-glow-b" />
      </div>

      <div className="container">
        {/* Header ----------------------------------------------------- */}
        <header className="rev-head">
          <div className="rev-head-titles anim-fade-up">
            <span className="eyebrow">Reviews</span>
            <h1 className="h1">
              Real players.
              <br />
              <span className="accent">Real receipts.</span>
            </h1>
            <p className="lead">
              Every review is tied to a real order and checked before it goes live. We never edit or hide the low ones,
              because they keep us honest.
            </p>
            <div className="rev-head-cta">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => setWriting(true)}>
                <Icon name="message" /> Write a review
              </button>
              <Link to="/store" className="btn btn-ghost btn-lg">
                Browse the store <Icon name="arrow-right" />
              </Link>
            </div>
            <ul className="rev-trust">
              <li>
                <Icon name="shield-check" size={16} /> Verified purchases only
              </li>
              <li>
                <Icon name="eye" size={16} /> Low scores stay up
              </li>
            </ul>
          </div>

          <section className="rev-score anim-fade-up" style={{ ['--delay' as string]: '120ms' } as CSSProperties} aria-label="Rating summary">
            <div className="rev-score-main">
              <span className="rev-score-num tabular">{BRAND.rating.toFixed(1)}</span>
              <span className="rev-score-meta">
                <Stars value={BRAND.rating} size={18} />
                <span className="rev-score-count">
                  <strong className="tabular">{BRAND.reviewCount.toLocaleString('en-US')}</strong> star ratings
                </span>
                <span className="rev-score-badge">
                  <Icon name="check-circle" size={13} /> Verified buyers
                </span>
              </span>
            </div>
            <div className="rev-dist" role="group" aria-label="Filter by star rating">
              {DISTRIBUTION.map((d, i) => {
                const active = rating === d.stars;
                return (
                  <button
                    key={d.stars}
                    type="button"
                    className={`rev-dist-row${active ? ' is-active' : ''}${rating && !active ? ' is-dim' : ''}`}
                    aria-pressed={active}
                    aria-label={`${d.stars} ${d.stars === 1 ? 'star' : 'stars'}: ${d.count.toLocaleString('en-US')} ratings, ${d.pct < 1 ? 'under 1' : Math.round(d.pct)}%. Show only ${d.stars}-star written reviews`}
                    onClick={() => pickFromChart(d.stars)}
                  >
                    <span className="rev-dist-label tabular">
                      {d.stars}
                      <Icon name="star-fill" size={11} />
                    </span>
                    <span className="rev-dist-track">
                      <span
                        className="rev-dist-fill"
                        style={{ ['--w' as string]: `${Math.max(d.pct, 0.8)}%`, ['--delay' as string]: `${200 + i * 70}ms` } as CSSProperties}
                      />
                    </span>
                    <span className="rev-dist-pct mono tabular">{d.pct < 1 ? '<1' : Math.round(d.pct)}%</span>
                    <span className="rev-dist-n mono tabular">{d.count.toLocaleString('en-US')}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </header>

        {/* Toolbar ---------------------------------------------------- */}
        <div className="rev-toolbar" ref={toolbarRef}>
          <label className="rev-select-wrap">
            <span className="sr-only">Filter by product</span>
            <Icon name="box" size={16} />
            <select className="select rev-select" value={product} onChange={(e) => changeProduct(e.target.value)}>
              <option value="all">All products ({pool.length})</option>
              {productOptions.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.name} ({o.count})
                </option>
              ))}
            </select>
          </label>

          <div className="rev-chips-wrap">
            <div className="rev-chips" role="group" aria-label="Filter by rating">
              <button type="button" className="rev-chip" aria-pressed={rating === 0} onClick={() => changeRating(0)}>
                All
              </button>
              {[5, 4, 3, 2, 1].map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rev-chip"
                  aria-pressed={rating === s}
                  onClick={() => changeRating(s)}
                  aria-label={`${s} ${s === 1 ? 'star' : 'stars'} (${starCounts[s]} written ${starCounts[s] === 1 ? 'review' : 'reviews'})`}
                >
                  {s}
                  <Icon name="star-fill" size={12} className="rev-chip-star" />
                  <span className="rev-chip-n tabular">{starCounts[s]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="segmented rev-sort" role="group" aria-label="Sort reviews">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={sort === s.id ? 'is-active' : undefined}
                aria-pressed={sort === s.id}
                onClick={() => changeSort(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rev-resultline small muted" aria-live="polite">
          <span>
            Showing <strong className="text-2">{shown.length}</strong> of{' '}
            <strong className="text-2">{filtered.length}</strong> written {filtered.length === 1 ? 'review' : 'reviews'}
            {product !== 'all' && (
              <>
                {' '}
                for <strong className="text-2">{getProduct(product)?.name}</strong>
              </>
            )}
          </span>
          {filteredActive && (
            <button type="button" className="rev-clear" onClick={clearAll}>
              <Icon name="x" size={13} /> Clear filters
            </button>
          )}
        </div>

        {/* Grid ------------------------------------------------------- */}
        {filtered.length === 0 ? (
          <div className="card rev-empty">
            <EmptyState
              icon="star"
              title="No reviews match yet"
              body="Nobody has left that rating for this product. Try another filter, or be the first to write one."
              action={
                <div className="row gap-8 wrap" style={{ justifyContent: 'center' }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
                    Clear filters
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setWriting(true)}>
                    Write a review
                  </button>
                </div>
              }
            />
          </div>
        ) : (
          <div className="rev-grid" style={{ ['--cols' as string]: cols } as CSSProperties}>
            {columns.map((col, ci) => (
              <div key={ci} className="rev-col">
                {col.map((r) => {
                  const i = indexOf.get(r.id) ?? 0;
                  const delay = i >= batchStart ? Math.min(i - batchStart, 11) * 45 : 0;
                  return <ReviewCard key={r.id} review={r} delay={delay} />;
                })}
              </div>
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="rev-more">
            <div className="rev-more-bar" aria-hidden="true">
              <span style={{ width: `${(shown.length / filtered.length) * 100}%` }} />
            </div>
            {remaining > 0 ? (
              <button type="button" className="btn btn-ghost btn-lg" onClick={loadMore}>
                Load more reviews
                <span className="rev-more-n mono">+{Math.min(PAGE, remaining)}</span>
              </button>
            ) : (
              <p className="small muted">
                That's every written review{filteredActive ? ' for this filter' : ''}.{' '}
                <button type="button" className="rev-inline-link" onClick={() => setWriting(true)}>
                  Add yours
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      {writing && createPortal(<ReviewModal onClose={() => setWriting(false)} onSubmitted={onSubmitted} />, document.body)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

function ReviewCard({ review: r, delay }: { review: Review; delay: number }) {
  const p = getProduct(r.productSlug);
  const game = p ? getGame(p.gameSlug) : undefined;
  return (
    <article
      className={`rev-card anim-fade-up${r.verified ? '' : ' is-pending'}`}
      style={{ ['--delay' as string]: `${delay}ms` } as CSSProperties}
    >
      <div className="rev-card-top">
        <Stars value={r.rating} size={14} />
        <time className="mono tiny muted" dateTime={r.date}>
          {formatDate(r.date)}
        </time>
      </div>
      <p className="rev-card-text">{r.text}</p>
      {p && (
        <Link to={`/product/${p.slug}`} className="rev-card-product">
          {game && (
            <span className="rev-card-art" aria-hidden="true">
              <GameArt game={game} variant="tile" showName={false} />
            </span>
          )}
          <span className="rev-card-product-name">{p.name}</span>
          <Icon name="arrow-up-right" size={13} />
        </Link>
      )}
      <footer className="rev-card-foot">
        <Avatar name={r.author} size={34} />
        <span className="rev-card-who">
          <strong>{r.author}</strong>
          {r.plan && <span className="tiny muted">{r.plan} plan</span>}
        </span>
        {r.verified ? (
          <span className="rev-card-verified">
            <Icon name="check-circle" size={14} /> Verified buyer
          </span>
        ) : (
          <span className="rev-card-pending">
            <Icon name="clock" size={13} /> Pending
          </span>
        )}
      </footer>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Write-a-review modal                                                */
/* ------------------------------------------------------------------ */

const FOCUSABLE = 'a[href], button:not([disabled]), select:not([disabled]), textarea, input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ReviewModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: (r: Review) => void }) {
  const { user } = useAuth();
  const { toast } = useUI();
  const uid = useId();
  const [productSlug, setProductSlug] = useState('');
  const [plan, setPlan] = useState('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLSelectElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const starRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const timer = useRef<number>();

  const product = getProduct(productSlug);
  const chars = text.trim().length;

  const errors = {
    product: !productSlug ? 'Pick the product you bought.' : '',
    rating: !rating ? 'Tap a star to rate it.' : '',
    text: chars < MIN_CHARS ? `A few more words, please (at least ${MIN_CHARS} characters).` : '',
    name: !user && name.trim().length < 2 ? 'Add a display name (2+ characters).' : '',
  };
  const show = (k: keyof typeof errors) => (tried ? errors[k] : '');

  const busyRef = useRef(busy);
  busyRef.current = busy;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Esc closes and Tab stays inside the dialog, wherever focus currently is.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!busyRef.current) closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Focus, scroll lock, restore focus on close.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const f = window.setTimeout(() => productRef.current?.focus(), 30);
    return () => {
      window.clearTimeout(f);
      window.clearTimeout(timer.current);
      root.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, []);

  const setStars = (n: number, focus = false) => {
    const v = Math.max(1, Math.min(5, n));
    setRating(v);
    if (focus) starRefs.current[v - 1]?.focus();
  };

  const onStarKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setStars((rating || 0) + 1, true);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setStars((rating || 2) - 1, true);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setStars(1, true);
    } else if (e.key === 'End') {
      e.preventDefault();
      setStars(5, true);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setTried(true);
    if (errors.product) return productRef.current?.focus();
    if (errors.rating) return starRefs.current[0]?.focus();
    if (errors.text) return textRef.current?.focus();
    if (errors.name) return nameRef.current?.focus();

    setBusy(true);
    timer.current = window.setTimeout(() => {
      onSubmitted({
        id: `mine-${Date.now()}`,
        author: user?.username ?? name.trim(),
        productSlug,
        plan,
        rating: rating as Review['rating'],
        text: text.trim(),
        date: new Date(NOW).toISOString().slice(0, 10),
        verified: false,
      });
      toast({
        title: 'Thanks! Your review is pending verification',
        body: 'We match it to your order first. It usually goes live within 24 hours.',
        tone: 'ok',
      });
      onClose();
    }, 700);
  };

  const shownStars = hover || rating;
  const err = (k: keyof typeof errors) => (show(k) ? `${uid}-${k}-err` : undefined);

  return (
    <div className="rev-modal-root">
      <div className="rev-modal-backdrop" onClick={() => !busy && onClose()} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="rev-modal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-desc`}
      >
        <div className="rev-modal-head">
          <span className="icon-tile is-accent" aria-hidden="true">
            <Icon name="star" />
          </span>
          <div className="grow">
            <h2 id={`${uid}-title`} className="h3">
              Write a review
            </h2>
            <p id={`${uid}-desc`} className="small muted">
              Tell other players how it went. We verify every review against a real order.
            </p>
          </div>
          <button type="button" className="btn btn-quiet btn-icon btn-sm rev-modal-x" onClick={onClose} aria-label="Close" disabled={busy}>
            <Icon name="x" />
          </button>
        </div>

        <form className="rev-form" onSubmit={submit} noValidate>
          <div className="rev-form-row">
            <div className="field">
              <label className="label" htmlFor={`${uid}-product`}>
                Product
              </label>
              <select
                id={`${uid}-product`}
                ref={productRef}
                className="select"
                value={productSlug}
                onChange={(e) => {
                  setProductSlug(e.target.value);
                  setPlan('');
                }}
                aria-invalid={!!show('product')}
                aria-describedby={err('product')}
              >
                <option value="" disabled>
                  Choose a product…
                </option>
                {PRODUCTS.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
              {show('product') && (
                <span id={`${uid}-product-err`} className="rev-err">
                  <Icon name="alert" size={13} /> {errors.product}
                </span>
              )}
            </div>
            <div className="field">
              <label className="label" htmlFor={`${uid}-plan`}>
                Plan <span className="muted">(optional)</span>
              </label>
              <select
                id={`${uid}-plan`}
                className="select"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                disabled={!product}
              >
                <option value="">{product ? 'Select plan' : 'Pick a product first'}</option>
                {product?.plans.map((pl) => (
                  <option key={pl.id} value={pl.label}>
                    {pl.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <span className="label" id={`${uid}-rating-label`}>
              Your rating
            </span>
            <div className="rev-pick">
              <div
                className="rev-pick-stars"
                role="radiogroup"
                aria-labelledby={`${uid}-rating-label`}
                aria-describedby={err('rating')}
                aria-invalid={!!show('rating')}
                onMouseLeave={() => setHover(0)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    ref={(el) => {
                      starRefs.current[n - 1] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} ${n === 1 ? 'star' : 'stars'}, ${RATING_WORDS[n]}`}
                    tabIndex={(rating || 1) === n ? 0 : -1}
                    className={`rev-pick-star${shownStars >= n ? ' is-on' : ''}${hover && hover >= n ? ' is-hover' : ''}`}
                    onClick={() => setStars(n)}
                    onMouseEnter={() => setHover(n)}
                    onKeyDown={onStarKey}
                  >
                    <Icon name="star-fill" size={30} />
                  </button>
                ))}
              </div>
              <span className={`rev-pick-word${shownStars ? ' is-set' : ''}`} aria-hidden="true">
                {shownStars ? RATING_WORDS[shownStars] : 'Tap to rate'}
              </span>
            </div>
            {show('rating') && (
              <span id={`${uid}-rating-err`} className="rev-err">
                <Icon name="alert" size={13} /> {errors.rating}
              </span>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor={`${uid}-text`}>
              Your review
            </label>
            <textarea
              id={`${uid}-text`}
              ref={textRef}
              className="textarea"
              rows={5}
              maxLength={MAX_CHARS}
              placeholder="What did you play, how was setup, would you buy again?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={!!show('text')}
              aria-describedby={`${uid}-count${err('text') ? ` ${err('text')}` : ''}`}
            />
            <div className="rev-form-meta">
              {show('text') ? (
                <span id={`${uid}-text-err`} className="rev-err">
                  <Icon name="alert" size={13} /> {errors.text}
                </span>
              ) : (
                <span className="tiny muted">Be specific. Keep keys and personal info out of it.</span>
              )}
              <span id={`${uid}-count`} className={`rev-count mono${chars >= MIN_CHARS ? ' is-ok' : ''}`}>
                {text.length}/{MAX_CHARS}
              </span>
            </div>
          </div>

          {user ? (
            <div className="rev-posting">
              <Avatar name={user.username} size={30} />
              <span className="small text-2">
                Posting as <strong>{user.username}</strong>
              </span>
            </div>
          ) : (
            <div className="field">
              <label className="label" htmlFor={`${uid}-name`}>
                Display name
              </label>
              <input
                id={`${uid}-name`}
                ref={nameRef}
                className="input"
                maxLength={24}
                placeholder="How should we credit you?"
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!show('name')}
                aria-describedby={err('name')}
              />
              {show('name') && (
                <span id={`${uid}-name-err`} className="rev-err">
                  <Icon name="alert" size={13} /> {errors.name}
                </span>
              )}
            </div>
          )}

          <div className="rev-form-actions">
            <button type="button" className="btn btn-quiet" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className={`btn btn-primary${busy ? ' is-busy' : ''}`} aria-busy={busy}>
              {busy ? (
                <>
                  <span className="rev-spinner" aria-hidden="true" /> Submitting…
                </>
              ) : (
                <>
                  Submit review <Icon name="send" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
