import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { GameArt } from '../../components/GameArt';
import { Icon } from '../../components/Icon';
import { StatusBadge } from '../../components/ui';
import {
  GAMES,
  KIND_LABEL,
  PRODUCTS,
  formatPrice,
  fromPrice,
  gameFromPrice,
  gameStatus,
  getGame,
  productsForGame,
} from '../../data/catalog';
import type { Game, Product, Status } from '../../data/types';
import { navigate } from '../../router';

interface Hit {
  key: string;
  to: string;
  game: Game;
  title: string;
  meta: string;
  status: Status;
  price: number;
}

/** 3 = prefix, 2 = word start, 1 = substring, 0 = no match. */
function score(hay: string, q: string) {
  const i = hay.toLowerCase().indexOf(q);
  if (i < 0) return 0;
  if (i === 0) return 3;
  return /[\s:-]/.test(hay[i - 1]) ? 2 : 1;
}

const gameHit = (g: Game): Hit => {
  const n = productsForGame(g.slug).length;
  return {
    key: `g-${g.slug}`,
    to: `/store/${g.slug}`,
    game: g,
    title: g.name,
    meta: `${n} ${n === 1 ? 'product' : 'products'} · ${g.genre}`,
    status: gameStatus(g.slug),
    price: gameFromPrice(g.slug),
  };
};

const productHit = (p: Product): Hit => {
  const g = getGame(p.gameSlug)!;
  return {
    key: `p-${p.slug}`,
    to: `/product/${p.slug}`,
    game: g,
    title: p.name,
    meta: `${g.name} · ${KIND_LABEL[p.kind]}`,
    status: p.status,
    price: fromPrice(p),
  };
};

const POPULAR = PRODUCTS.filter((p) => p.popular).slice(0, 5).map(productHit);

function runSearch(raw: string): { games: Hit[]; products: Hit[] } {
  const q = raw.trim().toLowerCase();
  if (!q) return { games: [], products: POPULAR };

  const games = GAMES.map((g) => ({ g, s: Math.max(score(g.name, q), score(g.short, q) * 0.9, score(g.genre, q) * 0.4) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map((x) => gameHit(x.g));

  const products = PRODUCTS.map((p) => {
    const g = getGame(p.gameSlug)!;
    const s = Math.max(
      score(p.name, q),
      score(g.name, q) * 0.95,
      score(KIND_LABEL[p.kind], q) * 0.6,
      score(p.tagline, q) * 0.3,
    );
    return { p, s };
  })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (a.p.status === 'undetected' ? -1 : 1))
    .slice(0, 5)
    .map((x) => productHit(x.p));

  return { games, products };
}

function highlight(text: string, q: string): ReactNode {
  const n = q.trim();
  if (!n) return text;
  const i = text.toLowerCase().indexOf(n.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + n.length)}</mark>
      {text.slice(i + n.length)}
    </>
  );
}

export function HeroSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const listId = `${uid}-list`;
  const inputId = `${uid}-input`;
  const optId = (i: number) => `${uid}-opt-${i}`;

  const { games, products } = useMemo(() => runSearch(q), [q]);
  const flat = useMemo(() => [...games, ...products], [games, products]);

  useEffect(() => setActive(-1), [q]);

  // Close on outside pointer.
  useEffect(() => {
    if (!open) return;
    const on = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', on);
    return () => document.removeEventListener('pointerdown', on);
  }, [open]);

  // Keep the highlighted option visible inside the scrolling list.
  useEffect(() => {
    if (active < 0) return;
    document.getElementById(optId(active))?.scrollIntoView({ block: 'nearest' });
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };
  const submit = () => {
    const t = q.trim();
    go(t ? `/store?q=${encodeURIComponent(t)}` : '/store');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        if (flat.length) setActive((a) => (a >= flat.length - 1 ? 0 : a + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        if (flat.length) setActive((a) => (a <= 0 ? flat.length - 1 : a - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (open && active >= 0 && flat[active]) go(flat[active].to);
        else submit();
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          setOpen(false);
          setActive(-1);
        } else if (q) {
          setQ('');
        }
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const hasQuery = q.trim().length > 0;

  const renderOption = (h: Hit, index: number) => (
    <li
      key={h.key}
      id={optId(index)}
      role="option"
      aria-selected={active === index}
      className="home-search-opt"
      onMouseDown={(e) => e.preventDefault()}
      onMouseMove={() => active !== index && setActive(index)}
      onClick={() => go(h.to)}
    >
      <span className="home-search-tile">
        <GameArt game={h.game} variant="tile" />
      </span>
      <span className="home-search-opt-text">
        <span className="home-search-opt-title">{highlight(h.title, q)}</span>
        <span className="home-search-opt-meta">{h.meta}</span>
      </span>
      <span className="home-search-opt-side">
        <StatusBadge status={h.status} size="sm" />
        <span className="home-search-opt-price">
          from <strong>{formatPrice(h.price)}</strong>
        </span>
      </span>
    </li>
  );

  return (
    <div className="home-search" ref={wrapRef}>
      <form
        role="search"
        className="home-search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Search games and products
        </label>
        <Icon name="search" size={20} className="home-search-icon" />
        <input
          id={inputId}
          className="home-search-input"
          type="text"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search a game or tool…"
          value={q}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? optId(active) : undefined}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {hasQuery && (
          <button
            type="button"
            className="home-search-clear"
            aria-label="Clear search"
            onClick={() => {
              setQ('');
              (document.getElementById(inputId) as HTMLInputElement | null)?.focus();
            }}
          >
            <Icon name="x" size={15} />
          </button>
        )}
        <button type="submit" className="btn btn-primary home-search-btn">
          <span>
            Browse<span className="home-hide-xs"> store</span>
          </span>
          <span className="chip-arrow">
            <Icon name="arrow-right" />
          </span>
        </button>
      </form>

      {open && (
        <div className="home-search-pop">
          <ul role="listbox" id={listId} aria-label="Search suggestions" className="home-search-list">
            {games.length > 0 && (
              <li role="presentation" className="home-search-group">
                Games
              </li>
            )}
            {games.map((h, i) => renderOption(h, i))}
            {products.length > 0 && (
              <li role="presentation" className="home-search-group">
                {hasQuery ? 'Products' : 'Popular right now'}
              </li>
            )}
            {products.map((h, i) => renderOption(h, games.length + i))}
          </ul>

          {flat.length === 0 && (
            <div className="home-search-empty">
              <span className="icon-tile">
                <Icon name="search" />
              </span>
              <div>
                <strong>No match for “{q.trim()}”</strong>
                <p>Try a game name like Rust, Valorant or Apex, or browse the full store.</p>
              </div>
            </div>
          )}

          <div className="home-search-foot">
            <span className="home-search-keys" aria-hidden="true">
              <kbd>↑</kbd>
              <kbd>↓</kbd> navigate
              <kbd>↵</kbd> open
              <kbd>esc</kbd> close
            </span>
            <button
              type="button"
              className="home-search-all"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => (hasQuery ? submit() : go('/store?view=products'))}
            >
              {hasQuery ? (
                <>
                  All results for “<span className="home-search-all-q">{q.trim()}</span>”
                </>
              ) : (
                <>All {PRODUCTS.length} products</>
              )}
              <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
