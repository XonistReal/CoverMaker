import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { GameArt } from '../../components/GameArt';
import { Icon } from '../../components/Icon';
import { GameCard, ProductCard } from '../../components/ProductCard';
import { EmptyState, SectionHeader, StatusDot } from '../../components/ui';
import { GAMES, PRODUCTS, STATS, formatPrice, gameFromPrice, getGame, productsForGame, timeAgo } from '../../data/catalog';
import type { Genre } from '../../data/types';
import { Link, navigate } from '../../router';
import {
  GENRES,
  SORTS,
  defaultView,
  filterGames,
  filterProducts,
  filtersToPath,
  gameMatchesDirect,
  genreCounts,
  hasActiveFilters,
  readFilters,
  tokens,
  type Filters,
  type SortKey,
  type View,
} from './filters';
import { TrustRow } from './TrustRow';

const SUGGESTIONS = ['Fortnite', 'Spoofer', 'Radar', 'Valorant'];

const latestBuild = PRODUCTS.reduce((a, p) => (p.updatedAt > a ? p.updatedAt : a), PRODUCTS[0]?.updatedAt ?? '');

/** Tools built for a specific game (STATS.games leaves out the HWID spoofer utility, so the lead does too). */
const GAME_TOOLS = PRODUCTS.filter((p) => getGame(p.gameSlug)?.genre !== 'Utility').length;

const navHeight = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 68;

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Tracks whether a horizontally scrolling row can scroll further left / right (drives edge fades). */
function useScrollEdges<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const start = el.scrollLeft <= 2;
      const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
      setEdges((e) => (e.start === start && e.end === end ? e : { start, end }));
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
  return { ref, edges };
}

export function StoreIndex({ query }: { query: URLSearchParams }) {
  const f = readFilters(query);
  const ts = tokens(f.q);

  const games = filterGames(f);
  const products = filterProducts(f);
  const counts = genreCounts(f);
  const active = hasActiveFilters(f);
  const results = f.view === 'games' ? games.length : products.length;
  const directGames =
    f.view === 'products' && ts.length
      ? GAMES.filter((g) => gameMatchesDirect(g, ts) && (!f.genre || g.genre === f.genre))
      : [];

  const update = (patch: Partial<Filters>) => navigate(filtersToPath({ ...f, ...patch }), { replace: true });

  const setQuery = (q: string) => {
    const patch: Partial<Filters> = { q };
    // Starting a search jumps to products (and shows matching games above them);
    // clearing it falls back to whatever the default view is.
    if (!f.q.trim() && q.trim()) patch.view = defaultView(q);
    if (f.q.trim() && !q.trim() && !f.viewExplicit) patch.view = defaultView('');
    update(patch);
  };

  const clearAll = () => update({ q: '', genre: null, undetected: false, view: f.viewExplicit ? f.view : 'games' });

  /* ---------- search input: "/" to focus, Esc to clear ---------- */
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      // Never pull focus out of an overlay (cart, sign in, menu, phone chat) into the page behind it.
      if (t?.closest('[role="dialog"]') || document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (f.q) {
        e.preventDefault();
        setQuery('');
      } else {
        e.currentTarget.blur();
      }
    }
  };

  /* ---------- sticky toolbar: solid background once stuck ---------- */
  const barRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const bar = barRef.current;
      if (!bar) return;
      const sticky = getComputedStyle(bar).position === 'sticky';
      setStuck(sticky && window.scrollY > 0 && bar.getBoundingClientRect().top <= navHeight() + 0.5);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  /* ---------- keep results in view when filters change while scrolled down ---------- */
  const resultsRef = useRef<HTMLElement>(null);
  const signature = `${f.q}|${f.genre}|${f.view}|${f.undetected}|${f.sort}`;
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = resultsRef.current;
    const bar = barRef.current;
    if (!el || !bar) return;
    const sticky = getComputedStyle(bar).position === 'sticky';
    const offset = navHeight() + (sticky ? bar.offsetHeight : 0) + 8;
    const top = el.getBoundingClientRect().top;
    if (top < offset) {
      window.scrollTo({ top: window.scrollY + top - offset, behavior: reduceMotion() ? 'auto' : 'smooth' });
    }
  }, [signature]);

  const chips = useScrollEdges<HTMLDivElement>();

  // Keep the active genre chip visible inside the sideways-scrolling filter row (phones, shared links).
  useEffect(() => {
    const row = chips.ref.current;
    const chip = row?.querySelector<HTMLElement>('.store-chip[aria-pressed="true"]');
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
    const pad = 24;
    const left = chip.offsetLeft; // row is position: relative, so this is in scroll coordinates
    if (left < row.scrollLeft + pad || left + chip.offsetWidth > row.scrollLeft + row.clientWidth - pad) {
      row.scrollTo({ left: Math.max(0, left - row.clientWidth / 2 + chip.offsetWidth / 2), behavior: 'auto' });
    }
  }, [f.genre, chips.ref]);
  const sort = SORTS.find((s) => s.id === f.sort) ?? SORTS[0];
  const noun = f.view === 'games' ? (results === 1 ? 'game' : 'games') : results === 1 ? 'product' : 'products';
  // The HWID spoofer tile is a utility, not a game: count it apart so this line agrees with the header.
  const utilityHits = f.view === 'games' ? games.filter((g) => g.genre === 'Utility').length : 0;
  const gameHits = results - utilityHits;

  return (
    <div className="page store">
      <div className="store-glow" aria-hidden="true">
        <div className="bg-grid" />
        <span className="glow-blob store-glow-a" />
        <span className="glow-blob store-glow-b" />
      </div>

      {/* ---------------- Header ---------------- */}
      <header className="container store-head">
        <SectionHeader
          as="h1"
          eyebrow="Store"
          title={
            <>
              Every game.
              <br />
              <span className="accent">Every edge.</span>
            </>
          }
          lead={`${GAME_TOOLS} tools across ${STATS.games} games, plus HWID spoofers. Built in-house, tested on fresh accounts before every release, and pulled the moment a patch lands.`}
          action={
            <Link to="/status" className="store-live" aria-label="Open live status">
              <span className="store-live-top">
                <StatusDot status="undetected" />
                <span className="store-live-num tabular">
                  {STATS.undetected}
                  <span className="muted">/{STATS.products}</span>
                </span>
                <span className="store-live-label">
                  tools undetected
                  <span className="muted">right now</span>
                </span>
              </span>
              <span className="store-live-sub">
                <span>
                  <Icon name="clock" size={13} /> Last build {timeAgo(latestBuild)}
                </span>
                <span className="store-live-link">
                  Live status <Icon name="arrow-right" size={13} />
                </span>
              </span>
            </Link>
          }
        />
        <TrustRow />
      </header>

      {/* ---------------- Toolbar ---------------- */}
      <div ref={barRef} className={`store-bar${stuck ? ' is-stuck' : ''}`}>
        <div className="container store-bar-inner">
          <div className="store-search input-wrap">
            <Icon name="search" />
            <label className="sr-only" htmlFor="store-q">
              Search games, products and features
            </label>
            <input
              id="store-q"
              ref={inputRef}
              className="input"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search games, tools, features…"
              value={f.q}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
            />
            {f.q ? (
              <button
                type="button"
                className="store-search-clear"
                aria-label="Clear search"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
              >
                <Icon name="x" size={15} />
              </button>
            ) : (
              <kbd className="store-kbd" aria-hidden="true">
                /
              </kbd>
            )}
          </div>

          <div className="store-sort">
            <Icon name="sliders" size={16} className="store-sort-icon" />
            <span className="store-sort-text" aria-hidden="true">
              <span className="store-sort-pre">Sort</span>
              {sort.short}
            </span>
            <Icon name="chevron-down" size={15} className="store-sort-caret" />
            <select
              aria-label="Sort by"
              value={f.sort}
              onChange={(e) => update({ sort: e.target.value as SortKey })}
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="segmented store-view" role="group" aria-label="Show">
            {(
              [
                ['games', 'Games', 'grid', games.length],
                ['products', 'Products', 'layers', products.length],
              ] as [View, string, string, number][]
            ).map(([v, label, icon, n]) => (
              <button
                key={v}
                type="button"
                className={f.view === v ? 'is-active' : undefined}
                aria-pressed={f.view === v}
                onClick={() => update({ view: v })}
              >
                <Icon name={icon} size={15} />
                {label}
                <span className="store-view-n tabular">{n}</span>
              </button>
            ))}
          </div>

          <div
            ref={chips.ref}
            className={`store-filters${chips.edges.start ? '' : ' fade-start'}${chips.edges.end ? '' : ' fade-end'}`}
          >
            <button
              type="button"
              role="switch"
              aria-checked={f.undetected}
              className="store-status"
              onClick={() => update({ undetected: !f.undetected })}
            >
              <span className="switch" aria-hidden="true" />
              <span>Undetected only</span>
            </button>
            <span className="store-filters-sep" aria-hidden="true" />
            <div className="store-chips" role="group" aria-label="Filter by genre">
              <button
                type="button"
                className="store-chip"
                aria-pressed={!f.genre}
                onClick={() => update({ genre: null })}
              >
                All
                <span className="store-chip-n tabular">{counts.all}</span>
              </button>
              {GENRES.map((g: Genre) => (
                <button
                  key={g}
                  type="button"
                  className={`store-chip${counts.byGenre[g] === 0 && f.genre !== g ? ' is-empty' : ''}`}
                  aria-pressed={f.genre === g}
                  onClick={() => update({ genre: f.genre === g ? null : g })}
                >
                  {g}
                  <span className="store-chip-n tabular">{counts.byGenre[g]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Results ---------------- */}
      <section ref={resultsRef} className="container store-results" aria-label="Results">
        <div className="store-meta">
          <p className="store-count" aria-live="polite">
            {utilityHits > 0 ? (
              <>
                {gameHits > 0 && (
                  <>
                    <strong className="tabular">{gameHits}</strong> {gameHits === 1 ? 'game' : 'games'} +{' '}
                  </>
                )}
                <strong className="tabular">{utilityHits}</strong> {utilityHits === 1 ? 'utility' : 'utilities'}
              </>
            ) : (
              <>
                <strong className="tabular">{results}</strong> {noun}
              </>
            )}
            {f.q.trim() && (
              <>
                {' '}
                for <span className="store-count-q">“{f.q.trim()}”</span>
              </>
            )}
            {f.genre && (
              <>
                {' '}
                in <span className="text-2">{f.genre}</span>
              </>
            )}
            {f.undetected && <span className="store-count-flag">Undetected only</span>}
          </p>
          {active && (
            <button type="button" className="btn btn-quiet btn-sm store-clear" onClick={clearAll}>
              <Icon name="x" size={15} />
              Clear filters
            </button>
          )}
        </div>

        {directGames.length > 0 && (
          <div className="store-jump">
            <span className="store-jump-label">Games</span>
            <div className="store-jump-list">
              {directGames.map((g) => {
                const n = productsForGame(g.slug).length;
                return (
                  <Link key={g.slug} to={`/store/${g.slug}`} className="store-jump-item">
                    <GameArt game={g} variant="tile" />
                    <span className="store-jump-text">
                      <strong>{g.name}</strong>
                      <span>
                        {n} {n === 1 ? 'product' : 'products'} · from {formatPrice(gameFromPrice(g.slug))}
                      </span>
                    </span>
                    <Icon name="arrow-up-right" size={16} />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {results === 0 ? (
          <div className="store-empty">
            <EmptyState
              icon={f.q.trim() ? 'search' : 'filter'}
              title={f.q.trim() ? `Nothing matches “${f.q.trim()}”` : 'Nothing matches these filters'}
              body={
                f.undetected
                  ? 'Try another genre or turn off “Undetected only” to see tools that are mid-update.'
                  : 'Check the spelling, try a game name or a feature like “ESP”, or clear your filters.'
              }
              action={
                <div className="store-empty-actions">
                  <button type="button" className="btn btn-ghost" onClick={clearAll}>
                    <Icon name="refresh" />
                    Clear filters
                  </button>
                  <div className="store-suggest">
                    <span className="tiny muted">Popular:</span>
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="store-chip"
                        onClick={() =>
                          update({ q: s, genre: null, undetected: false, view: defaultView(s) })
                        }
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              }
            />
          </div>
        ) : f.view === 'games' ? (
          <div className="store-grid store-grid-games">
            {games.map((g, i) => (
              <div key={g.slug} className="store-cell" style={{ '--i': Math.min(i, 12) } as CSSProperties}>
                <GameCard game={g} />
              </div>
            ))}
          </div>
        ) : (
          <div className="store-grid store-grid-products">
            {products.map((p, i) => (
              <div key={p.slug} className="store-cell" style={{ '--i': Math.min(i, 12) } as CSSProperties}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
