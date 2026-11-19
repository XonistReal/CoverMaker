import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { EmptyState, StatusBadge, StatusDot } from '../components/ui';
import { BRAND } from '../config';
import {
  CHANGELOG,
  GAMES,
  KIND_LABEL,
  NOW,
  PRODUCTS,
  STATUS_META,
  gameStatus,
  getProduct,
  timeAgo,
} from '../data/catalog';
import type { Game, Product, Status } from '../data/types';
import { Link } from '../router';
import { useUI } from '../state/store';
import {
  CHANGE_KIND,
  HISTORY_DAYS,
  clockUTC,
  dayDetail,
  dayLabel,
  formatUptime,
  uptimeFor,
  uptimeTone,
} from './status-data';
import './status.css';

const ORDER: Status[] = ['undetected', 'updating', 'testing', 'detected'];
type Filter = Status | 'all';

/** Per-row delay of the fake "checking…" cascade. */
const CHECK_LEAD = 340;
const CHECK_STEP = 40;

const COUNTS = ORDER.reduce(
  (acc, s) => ({ ...acc, [s]: PRODUCTS.filter((p) => p.status === s).length }),
  {} as Record<Status, number>,
);
const AVG_UPTIME = PRODUCTS.reduce((a, p) => a + uptimeFor(p).uptime, 0) / PRODUCTS.length;

function matches(p: Product, game: Game, q: string) {
  if (!q) return true;
  const hay = `${p.name} ${game.name} ${game.short} ${KIND_LABEL[p.kind]} ${STATUS_META[p.status].label}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t));
}

export function StatusPage() {
  const { toast } = useUI();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  // Fake live clock: the page "boots" at NOW and runs in real time from there.
  const mountedAt = useRef(Date.now());
  const [lastChecked, setLastChecked] = useState(NOW);
  const [checkElapsed, setCheckElapsed] = useState<number | null>(null);
  const checking = checkElapsed !== null;

  const groups = useMemo(() => {
    return GAMES.map((game) => ({
      game,
      products: PRODUCTS.filter(
        (p) => p.gameSlug === game.slug && (filter === 'all' || p.status === filter) && matches(p, game, q.trim()),
      ),
    })).filter((g) => g.products.length > 0);
  }, [filter, q]);

  const visibleCount = groups.reduce((a, g) => a + g.products.length, 0);
  const checkTotal = CHECK_LEAD + PRODUCTS.length * CHECK_STEP + 120;

  useEffect(() => {
    if (!checking) return;
    const t0 = performance.now();
    const id = window.setInterval(() => {
      const e = performance.now() - t0;
      if (e >= checkTotal) {
        window.clearInterval(id);
        setCheckElapsed(null);
        setLastChecked(NOW + (Date.now() - mountedAt.current));
        toast({
          title: 'All systems checked',
          body: `${PRODUCTS.length} tools verified · ${COUNTS.undetected} undetected`,
          tone: 'ok',
        });
      } else {
        setCheckElapsed(e);
      }
    }, 40);
    return () => window.clearInterval(id);
    // Only (re)start when a check begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking]);

  const recheck = () => {
    if (!checking) setCheckElapsed(0);
  };

  const pick = (s: Filter) => setFilter((cur) => (cur === s && s !== 'all' ? 'all' : s));
  const clearAll = () => {
    setFilter('all');
    setQ('');
  };

  let rowIndex = 0;

  return (
    <div className="page status">
      <div className="status-glow" aria-hidden="true">
        <div className="bg-grid" />
        <div className="glow-blob status-glow-a" />
        <div className="glow-blob status-glow-b" />
      </div>

      <div className="container">
        {/* Header ------------------------------------------------------ */}
        <header className="status-head anim-fade-up">
          <div className="status-head-titles">
            <span className="eyebrow">Live status</span>
            <h1 className="h1">
              Know before
              <br />
              <span className="accent">you load in.</span>
            </h1>
            <p className="lead">
              Every build is checked on fresh accounts around the clock. The moment a game patches we flip it to
              Updating and pause your key, so the colour you see here is the truth.
            </p>
          </div>

          <div className="status-hero" aria-busy={checking}>
            <div className="status-hero-top">
              <span className="status-hero-ring" aria-hidden="true">
                <StatusDot status="undetected" />
              </span>
              <div className="status-hero-figure">
                <strong className="tabular">
                  {COUNTS.undetected}
                  <span>/{PRODUCTS.length}</span>
                </strong>
                <span className="small text-2">tools undetected</span>
              </div>
              <div className="status-hero-avg">
                <strong className="mono tabular">{formatUptime(AVG_UPTIME)}</strong>
                <span className="tiny muted">30-day uptime</span>
              </div>
            </div>

            <div className="status-hero-meter" aria-hidden="true">
              {ORDER.map((s) =>
                COUNTS[s] ? (
                  <span key={s} className={`tone-${STATUS_META[s].tone}`} style={{ flexGrow: COUNTS[s] }} />
                ) : null,
              )}
            </div>

            <div className="status-hero-foot">
              <span className="status-hero-checked mono">
                {checking ? (
                  <span className="accent">Checking {PRODUCTS.length} tools…</span>
                ) : (
                  <>
                    Last checked <span className="text-2">{clockUTC(lastChecked)} UTC</span>
                    <SinceTicker since={lastChecked} mountedAt={mountedAt.current} />
                  </>
                )}
              </span>
              <button
                type="button"
                className={`btn btn-ghost btn-sm btn-icon status-refresh${checking ? ' is-spinning' : ''}`}
                onClick={recheck}
                aria-label="Re-check all tools"
                title="Re-check all tools"
                disabled={checking}
              >
                <Icon name="refresh" size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Summary ------------------------------------------------------ */}
        <div className="status-summary" role="group" aria-label="Filter by status">
          {ORDER.map((s, i) => {
            const m = STATUS_META[s];
            const active = filter === s;
            return (
              <button
                key={s}
                type="button"
                className={`status-sum tone-${m.tone}${active ? ' is-active' : ''}`}
                aria-pressed={active}
                onClick={() => pick(s)}
                style={{ ['--delay' as string]: `${80 + i * 60}ms` } as CSSProperties}
              >
                <span className="status-sum-top">
                  <span className="status-sum-label">
                    <StatusDot status={s} pulse={COUNTS[s] > 0} />
                    {m.label}
                  </span>
                  <span className="status-sum-check" aria-hidden="true">
                    <Icon name={active ? 'check' : 'filter'} size={13} />
                  </span>
                </span>
                <span className="status-sum-count tabular">
                  {COUNTS[s]}
                  <span className="status-sum-of">/{PRODUCTS.length}</span>
                </span>
                <span className="status-sum-hint">{m.hint}</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar ------------------------------------------------------ */}
        <div className="status-toolbar">
          <label className="input-wrap status-search">
            <span className="sr-only">Search tools</span>
            <Icon name="search" />
            <input
              className="input"
              type="search"
              placeholder="Search a game or tool…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button type="button" className="status-search-clear" onClick={() => setQ('')} aria-label="Clear search">
                <Icon name="x" size={14} />
              </button>
            )}
          </label>
          <div className="status-seg-wrap">
            <div className="segmented status-seg" role="group" aria-label="Status filter">
              {(['all', ...ORDER] as Filter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={filter === s ? 'is-active' : undefined}
                  aria-pressed={filter === s}
                  onClick={() => setFilter(s)}
                >
                  {s !== 'all' && <span className={`dot ${STATUS_META[s].tone}`} aria-hidden="true" />}
                  {s === 'all' ? 'All' : STATUS_META[s].label}
                  <span className="status-seg-n tabular">{s === 'all' ? PRODUCTS.length : COUNTS[s]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="status-layout">
          {/* Main list ------------------------------------------------- */}
          <div className="status-main">
            <div className="status-resultline small muted">
              <span>
                Showing <strong className="text-2">{visibleCount}</strong> {visibleCount === 1 ? 'tool' : 'tools'} across{' '}
                <strong className="text-2">{groups.length}</strong> {groups.length === 1 ? 'game' : 'games'}
              </span>
              {(filter !== 'all' || q) && (
                <button type="button" className="status-clear" onClick={clearAll}>
                  <Icon name="x" size={13} /> Clear filters
                </button>
              )}
            </div>

            {groups.length === 0 ? (
              <div className="card status-empty">
                <EmptyState
                  icon="search"
                  title="No tools match that"
                  body="Try another game name, or show every status again."
                  action={
                    <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
                      Reset filters
                    </button>
                  }
                />
              </div>
            ) : (
              <>
                <div className="status-cols mono" aria-hidden="true">
                  <span>Product</span>
                  <span>Status</span>
                  <span>Updated</span>
                  <span>{HISTORY_DAYS}-day uptime</span>
                </div>
                <div className="status-groups">
                  {groups.map(({ game, products }) => {
                    const best = gameStatus(game.slug);
                    const total = PRODUCTS.filter((p) => p.gameSlug === game.slug).length;
                    return (
                      <section
                        key={game.slug}
                        className={`status-group${total === 1 ? ' is-single' : ''}`}
                        aria-labelledby={`sg-${game.slug}`}
                      >
                        <header className="status-group-head">
                          <Link to={`/store/${game.slug}`} className="status-group-art" tabIndex={-1} aria-hidden="true">
                            <GameArt game={game} variant="tile" showName={false} />
                          </Link>
                          <div className="status-group-name">
                            <h2 id={`sg-${game.slug}`} className="h4">
                              <Link to={`/store/${game.slug}`}>{game.name}</Link>
                            </h2>
                            <span className="tiny muted mono">
                              <span className="status-group-genre">{game.genre.toUpperCase()} · </span>
                              {total} {total === 1 ? 'TOOL' : 'TOOLS'}
                            </span>
                          </div>
                          <span className="status-group-best">
                            {total > 1 && <span className="tiny muted status-group-best-label">Best available</span>}
                            <StatusBadge status={best} size="sm" />
                          </span>
                        </header>
                        <ul className="status-rows">
                          {products.map((p) => {
                            const idx = rowIndex++;
                            const pending =
                              checkElapsed !== null && checkElapsed < CHECK_LEAD + idx * CHECK_STEP;
                            return <StatusRow key={p.slug} product={p} pending={pending} checking={checking} />;
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              </>
            )}
            <section className="status-alert">
              <span className="icon-tile is-accent" aria-hidden="true">
                <Icon name="discord" />
              </span>
              <div className="grow">
                <h2 className="h4">Get pinged the second it's green</h2>
                <p className="small muted">Status alerts land in our Discord the moment a build changes. No spam, just signal.</p>
              </div>
              <a href={BRAND.discordUrl} className="btn btn-white">
                Join the Discord <Icon name="arrow-up-right" />
              </a>
            </section>
          </div>

          {/* Sidebar --------------------------------------------------- */}
          <aside className="status-side" aria-label="Changes and legend">
            <section className="card status-panel status-panel-feed" aria-labelledby="status-feed-title">
              <div className="status-panel-head">
                <h2 id="status-feed-title" className="h4">
                  Recent changes
                </h2>
                <span className="badge">
                  <span className="dot ok pulse" aria-hidden="true" /> Live
                </span>
              </div>
              <ol className="status-feed">
                {CHANGELOG.map((c, i) => {
                  const p = getProduct(c.productSlug);
                  const k = CHANGE_KIND[c.kind];
                  return (
                    <li key={i} className={`status-feed-item tone-${k.tone}`}>
                      <span className="status-feed-icon" aria-hidden="true">
                        <Icon name={k.icon} size={15} />
                      </span>
                      <div className="status-feed-body">
                        <div className="status-feed-top">
                          {p ? (
                            <Link to={`/product/${p.slug}`} className="status-feed-product">
                              {p.name}
                            </Link>
                          ) : (
                            <span className="status-feed-product">{c.productSlug}</span>
                          )}
                          <time className="tiny mono muted" dateTime={c.date}>
                            {timeAgo(c.date)}
                          </time>
                        </div>
                        <p className="status-feed-text">{c.text}</p>
                        <span className="status-feed-kind mono">{k.label}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className="card status-panel status-panel-legend" aria-labelledby="status-legend-title">
              <div className="status-panel-head">
                <h2 id="status-legend-title" className="h4">
                  What the colours mean
                </h2>
              </div>
              <ul className="status-legend">
                {ORDER.map((s) => (
                  <li key={s}>
                    <StatusBadge status={s} size="sm" />
                    <span className="small text-2">{STATUS_META[s].hint}</span>
                  </li>
                ))}
              </ul>
              <div className="status-note">
                <span className="status-note-icon" aria-hidden="true">
                  <Icon name="clock" size={16} />
                </span>
                <p className="small">
                  <strong>Keys are paused while Updating.</strong> The clock on every active key stops until the build
                  is green again, so you never lose time you paid for.
                </p>
              </div>
            </section>

          </aside>
        </div>
      </div>
    </div>
  );
}

/** "· 14s ago" next to the last-checked time. Owns its own timer so the page doesn't re-render every second. */
function SinceTicker({ since, mountedAt }: { since: number; mountedAt: number }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const now = NOW + (Date.now() - mountedAt);
  const s = Math.max(0, Math.round((now - since) / 1000));
  const label = s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
  return <span className="status-since"> · {label}</span>;
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function StatusRow({ product: p, pending, checking }: { product: Product; pending: boolean; checking: boolean }) {
  const h = uptimeFor(p);
  const tone = uptimeTone(h.uptime);
  return (
    <li className={`status-row${pending ? ' is-pending' : ''}${checking && !pending ? ' is-verified' : ''}`}>
      <div className="status-cell-name">
        <Link to={`/product/${p.slug}`} className="status-row-name">
          {p.name}
        </Link>
        <div className="status-row-meta">
          <span className="mono">{KIND_LABEL[p.kind].toUpperCase()}</span>
          <span className="status-row-upd-m">
            <span aria-hidden="true">·</span> Updated {timeAgo(p.updatedAt)}
          </span>
          {p.status === 'updating' && (
            <span className="status-row-flag tone-warn">
              <Icon name="clock" size={11} /> Keys paused
            </span>
          )}
          {p.status === 'detected' && (
            <span className="status-row-flag tone-bad">
              <Icon name="lock" size={11} /> Sales paused
            </span>
          )}
        </div>
      </div>
      <div className="status-cell-status">
        {pending ? (
          <span className="status-checking">
            <span className="status-spinner" aria-hidden="true" />
            Checking
          </span>
        ) : (
          <StatusBadge status={p.status} size="sm" />
        )}
      </div>
      <div className="status-cell-updated">
        <span className="mono small text-2">{timeAgo(p.updatedAt)}</span>
      </div>
      <div className="status-cell-uptime">
        <UptimeStrip product={p} />
        <span className={`status-pct mono tabular tone-${tone}`}>{formatUptime(h.uptime)}</span>
        <div className="status-strip-cap tiny mono" aria-hidden="true">
          <span>{HISTORY_DAYS}d ago</span>
          <span className={`tone-${tone}`}>{formatUptime(h.uptime)} uptime</span>
          <span>Today</span>
        </div>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* 30-day uptime strip                                                 */
/* ------------------------------------------------------------------ */

function UptimeStrip({ product }: { product: Product }) {
  const h = uptimeFor(product);
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const locate = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const i = Math.floor(((e.clientX - r.left) / r.width) * h.days.length);
    setHover(Math.max(0, Math.min(h.days.length - 1, i)));
  };

  const counts = h.days.reduce(
    (acc, d) => ({ ...acc, [d.status]: (acc[d.status] ?? 0) + 1 }),
    {} as Partial<Record<Status, number>>,
  );
  const summary = ORDER.filter((s) => counts[s])
    .map((s) => `${counts[s]} ${counts[s] === 1 ? 'day' : 'days'} ${STATUS_META[s].label.toLowerCase()}`)
    .join(', ');

  const day = hover !== null ? h.days[hover] : null;
  const x = hover !== null ? ((hover + 0.5) / h.days.length) * 100 : 0;

  return (
    <div
      ref={ref}
      className={`status-strip${hover !== null ? ' is-hovering' : ''}`}
      role="img"
      aria-label={`${HISTORY_DAYS}-day uptime ${formatUptime(h.uptime)}: ${summary}.`}
      onPointerMove={locate}
      onPointerDown={locate}
      onPointerLeave={() => setHover(null)}
    >
      {h.days.map((d, i) => (
        <span
          key={i}
          className={`status-bar tone-${STATUS_META[d.status].tone}${i === hover ? ' is-hover' : ''}${
            i === h.days.length - 1 ? ' is-today' : ''
          }`}
        />
      ))}
      {day && (
        <div className="status-tip" style={{ ['--x' as string]: `${x}%` } as CSSProperties} aria-hidden="true">
          <span className="status-tip-box">
            <span className="status-tip-date mono">
              {hover === h.days.length - 1 ? 'Today' : dayLabel(day.date)}
            </span>
            <span className="status-tip-state">
              <span className={`dot ${STATUS_META[day.status].tone}`} />
              {STATUS_META[day.status].label}
            </span>
            <span className="status-tip-detail">{dayDetail(day)}</span>
          </span>
          <span className="status-tip-arrow" />
        </div>
      )}
    </div>
  );
}
