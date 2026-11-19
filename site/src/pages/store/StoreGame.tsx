import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { GameArt } from '../../components/GameArt';
import { Icon } from '../../components/Icon';
import { GameCard } from '../../components/ProductCard';
import { Breadcrumbs, EmptyState, SectionHeader, StatusBadge, Stars } from '../../components/ui';
import {
  GAMES,
  KIND_LABEL,
  STATUS_META,
  formatPrice,
  fromPrice,
  gameFromPrice,
  gameStatus,
  getGame,
  productsForGame,
  timeAgo,
} from '../../data/catalog';
import type { Game, Product, Status } from '../../data/types';
import { BRAND } from '../../config';
import { Link } from '../../router';
import { GENRE_ICON, compactNumber, keyFeatures } from './filters';
import { TrustRow } from './TrustRow';

const STATUS_ORDER: Status[] = ['undetected', 'testing', 'updating', 'detected'];

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Name the tab after the game (App's generic route title is set first, in a layout effect). */
function useGameTitle(name: string | undefined) {
  useEffect(() => {
    if (name) document.title = `${name} · ${BRAND.name}`;
  }, [name]);
}

export function StoreGame({ slug }: { slug: string }) {
  const game = getGame(slug);
  useGameTitle(game?.name);
  if (!game) return <GameNotFound />;

  const products = productsForGame(slug).sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
      Number(!!b.popular) - Number(!!a.popular) ||
      b.sold - a.sold,
  );
  const status = gameStatus(slug);
  const reviews = products.reduce((n, p) => n + p.reviews, 0);
  const rating = reviews ? products.reduce((n, p) => n + p.rating * p.reviews, 0) / reviews : 0;
  const sold = products.reduce((n, p) => n + p.sold, 0);
  const latest = products.reduce((a, p) => (p.updatedAt > a ? p.updatedAt : a), products[0]?.updatedAt ?? '');
  const live = products.filter((p) => p.status === 'undetected').length;

  const others = [
    ...GAMES.filter((g) => g.slug !== slug && g.genre === game.genre),
    ...GAMES.filter((g) => g.slug !== slug && g.genre !== game.genre),
  ];

  return (
    <div
      className="page store store-game"
      style={{ '--gh1': game.hue, '--gh2': game.hue2 } as CSSProperties}
    >
      <div className="store-game-glow" aria-hidden="true" />
      <div className="container">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Store', to: '/store' }, { label: game.name }]} />

        {/* ---------------- Hero ---------------- */}
        <section className="store-hero" aria-labelledby="store-game-title">
          <GameArt game={game} variant="banner" showName={false} className="store-hero-art" />
          <div className="store-hero-shade" aria-hidden="true" />
          <div className="store-hero-body">
            <div className="store-hero-main">
              <div className="store-hero-tags">
                <span className="pill store-hero-pill">
                  <Icon name={GENRE_ICON[game.genre]} />
                  {game.genre}
                </span>
                {game.tag && (
                  <span className={`badge ${game.tag === 'new' ? 'badge-solid' : 'badge-violet store-hot'}`}>
                    {game.tag === 'hot' && <Icon name="flame" size={11} />}
                    {game.tag}
                  </span>
                )}
              </div>
              <h1 id="store-game-title" className="store-hero-title">
                {game.name}
              </h1>
              <div className="store-hero-meta">
                <StatusBadge status={status} />
                <span className="store-hero-fact">
                  <Icon name="layers" size={15} />
                  {products.length} {products.length === 1 ? 'product' : 'products'}
                </span>
                {products.length > 0 && (
                  <span className="store-hero-fact">
                    from <strong>{formatPrice(gameFromPrice(slug))}</strong>
                  </span>
                )}
              </div>
            </div>

            {products.length > 0 && (
              <dl className="store-hero-stats">
                <div>
                  <dt>Rating</dt>
                  <dd>
                    <Icon name="star-fill" size={14} className="store-star" />
                    {rating.toFixed(1)}
                    <small>{compactNumber(reviews)} reviews</small>
                  </dd>
                </div>
                <div>
                  <dt>Live now</dt>
                  <dd>
                    {live}/{products.length}
                    <small>undetected</small>
                  </dd>
                </div>
                <div>
                  <dt>Last build</dt>
                  <dd>
                    {timeAgo(latest)}
                    <small>{compactNumber(sold)} keys sold</small>
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </section>

        {/* ---------------- Products ---------------- */}
        <section className="store-list" aria-labelledby="store-list-title">
          <div className="store-list-head">
            <h2 id="store-list-title" className="h3">
              {game.genre === 'Utility' ? `All ${game.name}` : `Available for ${game.name}`}
              <span className="store-list-n tabular">{products.length}</span>
            </h2>
            <p className="small muted">
              <Icon name="shield-check" size={15} />
              Every build is tested on fresh accounts before it ships.
            </p>
          </div>
          {products.length ? (
            <ul className="store-rows">
              {products.map((p, i) => (
                <li key={p.slug} style={{ '--i': i } as CSSProperties}>
                  <ProductRow product={p} game={game} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="clock"
              title="Nothing on sale right now"
              body="We're building tools for this game. Check the live status page for updates."
              action={
                <Link to="/status" className="btn btn-ghost">
                  Live status <Icon name="arrow-right" />
                </Link>
              }
            />
          )}
        </section>

        <TrustRow className="store-trust-game" />

        {/* ---------------- Other games ---------------- */}
        <OtherGames games={others} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product row                                                         */
/* ------------------------------------------------------------------ */

function ProductRow({ product: p, game }: { product: Product; game: Game }) {
  const paused = p.status === 'detected';
  const to = `/product/${p.slug}`;
  const feats = keyFeatures(p);
  const minPrice = fromPrice(p);

  return (
    <article className={`store-row${paused ? ' is-paused' : ''}`}>
      <Link to={to} className="store-row-art" tabIndex={-1} aria-hidden="true">
        <GameArt game={game} variant="poster" showName={false} />
      </Link>

      <div className="store-row-head">
        <div className="store-row-tags">
          <span className="badge">{KIND_LABEL[p.kind]}</span>
          <StatusBadge status={p.status} size="sm" />
          {p.isNew && <span className="badge badge-solid">New</span>}
          {p.popular && !p.isNew && !paused && (
            <span className="badge badge-violet">
              <Icon name="flame" size={11} />
              Hot
            </span>
          )}
        </div>
        <h3 className="store-row-title">
          <Link to={to}>{p.name}</Link>
        </h3>
        <p className="store-row-tagline">{p.tagline}</p>
      </div>

      <div className="store-row-body">
        <ul className="store-row-feats" aria-label="Key features">
          {feats.map((f) => (
            <li key={f.text}>
              <Icon name={f.icon} size={14} />
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
        <ul className="store-plans" aria-label={paused ? 'Plans (sales paused)' : 'Plans'}>
          {p.plans.map((pl) => (
            <li key={pl.id} className="store-plan">
              <span className="store-plan-label">{pl.label}</span>
              <span className="store-plan-price tabular">{formatPrice(pl.price)}</span>
              {pl.compareAt && !paused && (
                <span className="store-plan-save">−{Math.round((1 - pl.price / pl.compareAt) * 100)}%</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="store-row-side">
        {paused ? (
          <div className="store-row-paused" role="note">
            <span className="store-row-paused-title">
              <Icon name="alert" size={15} />
              Sales paused
            </span>
            <span>Don't load it until it's green again. Active keys are extended.</span>
          </div>
        ) : (
          <div className="store-row-price">
            <span className="store-row-from">From</span>
            <strong className="tabular">{formatPrice(minPrice)}</strong>
            {p.status === 'undetected' ? (
              <span className="store-row-rating">
                <Stars value={p.rating} size={12} />
                <span>
                  {p.rating.toFixed(1)} <span className="muted">({p.reviews})</span>
                </span>
              </span>
            ) : (
              <span className={`store-row-note tone-${STATUS_META[p.status].tone}`}>
                <Icon name={p.status === 'testing' ? 'info' : 'refresh'} size={13} />
                {p.status === 'testing' ? 'New build in QA' : 'Rebuilding, keys paused'}
              </span>
            )}
          </div>
        )}
        <div className="store-row-facts">
          <span>
            <Icon name="clock" size={13} />
            Updated {timeAgo(p.updatedAt)}
          </span>
          {p.stock && !paused ? (
            <span className="store-row-stock">
              <Icon name="flame" size={13} />
              {p.stock} keys left
            </span>
          ) : (
            <span>
              <Icon name="users" size={13} />
              {compactNumber(p.sold)} sold
            </span>
          )}
        </div>
        <Link to={to} className={`btn btn-block ${paused ? 'btn-ghost' : 'btn-primary'}`}>
          View product
          <Icon name="arrow-right" />
        </Link>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Other games scroller                                                */
/* ------------------------------------------------------------------ */

function OtherGames({ games }: { games: Game[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft <= 4);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = 'ResizeObserver' in window ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, []);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 16;
    const step = first ? first.getBoundingClientRect().width + gap : el.clientWidth * 0.8;
    const per = Math.max(1, Math.floor((el.clientWidth + gap) / step));
    el.scrollBy({ left: dir * step * per, behavior: reduceMotion() ? 'auto' : 'smooth' });
  };

  if (!games.length) return null;

  return (
    <section className="store-others" aria-labelledby="store-others-title">
      <div className="store-others-head">
        <div className="titles">
          <span className="eyebrow">Keep browsing</span>
          <h2 id="store-others-title" className="h2">
            Other <span className="accent">games</span>
          </h2>
        </div>
        <div className="row gap-8">
          <Link to="/store" className="btn btn-ghost btn-sm store-others-all">
            All games
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-icon store-arrow"
            onClick={() => page(-1)}
            disabled={atStart}
            aria-label="Scroll to previous games"
          >
            <Icon name="arrow-left" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon store-arrow"
            onClick={() => page(1)}
            disabled={atEnd}
            aria-label="Scroll to more games"
          >
            <Icon name="arrow-right" />
          </button>
        </div>
      </div>
      <div ref={ref} className="scroller store-scroller">
        {games.map((g) => (
          <GameCard key={g.slug} game={g} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Unknown slug                                                        */
/* ------------------------------------------------------------------ */

function GameNotFound() {
  useEffect(() => {
    document.title = `Game not found · ${BRAND.name}`;
  }, []);
  return (
    <div className="page store">
      <div className="container">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Store', to: '/store' }, { label: 'Not found' }]} />
        <div className="store-missing">
          <EmptyState
            as="h1"
            icon="gamepad"
            title="We don't cover that game (yet)"
            body="The link may be old, or the game hasn't joined the lineup. Browse everything we support instead."
            action={
              <div className="store-empty-actions">
                <Link to="/store" className="btn btn-primary">
                  <Icon name="arrow-left" />
                  Back to store
                </Link>
                <Link to="/support" className="btn btn-quiet">
                  Request a game
                </Link>
              </div>
            }
          />
        </div>
        <SectionHeader
          eyebrow="Try these"
          title={
            <>
              Popular <span className="accent">right now</span>
            </>
          }
        />
        <div className="store-grid store-grid-games">
          {GAMES.slice(0, 6).map((g, i) => (
            <div key={g.slug} className="store-cell" style={{ '--i': i } as CSSProperties}>
              <GameCard game={g} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
