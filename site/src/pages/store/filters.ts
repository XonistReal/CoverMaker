import {
  GAMES,
  KIND_LABEL,
  PRODUCTS,
  fromPrice,
  gameFromPrice,
  gameStatus,
  getGame,
  productsForGame,
} from '../../data/catalog';
import type { Game, Genre, Product } from '../../data/types';

/* Store filter state lives in the URL (`#/store?q=&genre=&view=&status=&sort=`) so every result is shareable. */

export type View = 'games' | 'products';
export type SortKey = 'popular' | 'price-asc' | 'price-desc' | 'updated';

export const SORTS: { id: SortKey; label: string; short: string }[] = [
  { id: 'popular', label: 'Most popular', short: 'Popular' },
  { id: 'price-asc', label: 'Price: low to high', short: 'Price: low' },
  { id: 'price-desc', label: 'Price: high to low', short: 'Price: high' },
  { id: 'updated', label: 'Recently updated', short: 'Updated' },
];

/** Genres in the order they first appear in the catalog. */
export const GENRES: Genre[] = GAMES.reduce<Genre[]>((acc, g) => (acc.includes(g.genre) ? acc : [...acc, g.genre]), []);

export interface Filters {
  q: string;
  genre: Genre | null;
  view: View;
  /** True when `view` came from the URL rather than the default. */
  viewExplicit: boolean;
  undetected: boolean;
  sort: SortKey;
}

const isSort = (s: string | null): s is SortKey => SORTS.some((o) => o.id === s);
const isGenre = (s: string | null): s is Genre => GENRES.some((g) => g === s);

/** With a search query the default view is products (that's what people are looking for). */
export const defaultView = (q: string): View => (q.trim() ? 'products' : 'games');

export function readFilters(query: URLSearchParams): Filters {
  const q = query.get('q') ?? '';
  const v = query.get('view');
  const explicit = v === 'games' || v === 'products';
  const g = query.get('genre');
  const s = query.get('sort');
  return {
    q,
    genre: isGenre(g) ? g : null,
    view: explicit ? (v as View) : defaultView(q),
    viewExplicit: explicit,
    undetected: query.get('status') === 'undetected',
    sort: isSort(s) ? s : 'popular',
  };
}

/** Serialise filters back to a `/store?...` path, leaving defaults out so URLs stay short. */
export function filtersToPath(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.genre) p.set('genre', f.genre);
  if (f.view !== defaultView(f.q)) p.set('view', f.view);
  if (f.undetected) p.set('status', 'undetected');
  if (f.sort !== 'popular') p.set('sort', f.sort);
  const qs = p.toString();
  return '/store' + (qs ? `?${qs}` : '');
}

export const hasActiveFilters = (f: Filters) => Boolean(f.q.trim() || f.genre || f.undetected);

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const tokens = (q: string) => norm(q).split(' ').filter(Boolean);

const gameHay = new Map<string, string>(
  GAMES.map((g) => [g.slug, norm(`${g.name} ${g.short} ${g.slug} ${g.genre}`)]),
);

const productHay = new Map<string, string>(
  PRODUCTS.map((p) => {
    const g = getGame(p.gameSlug);
    const feats = p.features.flatMap((f) => f.items).join(' ');
    return [
      p.slug,
      norm(`${p.name} ${g?.name ?? ''} ${g?.short ?? ''} ${g?.genre ?? ''} ${KIND_LABEL[p.kind]} ${p.kind} ${p.tagline} ${feats}`),
    ];
  }),
);

const matchAll = (hay: string, ts: string[]) => ts.every((t) => hay.includes(t));

/** Game matches on its own name / genre (used for the "jump to game" strip). */
export const gameMatchesDirect = (g: Game, ts: string[]) => ts.length > 0 && matchAll(gameHay.get(g.slug) ?? '', ts);

export const productMatches = (p: Product, ts: string[]) => !ts.length || matchAll(productHay.get(p.slug) ?? '', ts);

/** In the games view a game shows if it, or any of its products, matches the query. */
export const gameMatches = (g: Game, ts: string[]) =>
  !ts.length || gameMatchesDirect(g, ts) || productsForGame(g.slug).some((p) => productMatches(p, ts));

/* ------------------------------------------------------------------ */
/* Filtering + sorting                                                 */
/* ------------------------------------------------------------------ */

const latestUpdate = (slug: string) =>
  Math.max(0, ...productsForGame(slug).map((p) => new Date(p.updatedAt).getTime()));

export function filterGames(f: Filters, ignoreGenre = false): Game[] {
  const ts = tokens(f.q);
  const list = GAMES.filter(
    (g) =>
      (ignoreGenre || !f.genre || g.genre === f.genre) &&
      (!f.undetected || productsForGame(g.slug).some((p) => p.status === 'undetected')) &&
      gameMatches(g, ts),
  );
  const order = new Map(GAMES.map((g, i) => [g.slug, i]));
  const rank = (g: Game) => (gameStatus(g.slug) === 'detected' ? 1 : 0);
  switch (f.sort) {
    case 'price-asc':
      return list.sort((a, b) => gameFromPrice(a.slug) - gameFromPrice(b.slug));
    case 'price-desc':
      return list.sort((a, b) => gameFromPrice(b.slug) - gameFromPrice(a.slug));
    case 'updated':
      return list.sort((a, b) => latestUpdate(b.slug) - latestUpdate(a.slug));
    default:
      // Curated catalog order, but anything with sales paused drops to the end.
      return list.sort((a, b) => rank(a) - rank(b) || order.get(a.slug)! - order.get(b.slug)!);
  }
}

export function filterProducts(f: Filters, ignoreGenre = false): Product[] {
  const ts = tokens(f.q);
  const list = PRODUCTS.filter((p) => {
    const g = getGame(p.gameSlug);
    return (
      (ignoreGenre || !f.genre || g?.genre === f.genre) &&
      (!f.undetected || p.status === 'undetected') &&
      productMatches(p, ts)
    );
  });
  const paused = (p: Product) => (p.status === 'detected' ? 1 : 0);
  switch (f.sort) {
    case 'price-asc':
      return list.sort((a, b) => fromPrice(a) - fromPrice(b));
    case 'price-desc':
      return list.sort((a, b) => fromPrice(b) - fromPrice(a));
    case 'updated':
      return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    default:
      return list.sort(
        (a, b) => paused(a) - paused(b) || Number(!!b.popular) - Number(!!a.popular) || b.sold - a.sold,
      );
  }
}

/** Per-genre counts for the current view, honouring every filter except genre itself. */
export function genreCounts(f: Filters): { all: number; byGenre: Record<Genre, number> } {
  const byGenre = Object.fromEntries(GENRES.map((g) => [g, 0])) as Record<Genre, number>;
  if (f.view === 'games') {
    const list = filterGames(f, true);
    list.forEach((g) => (byGenre[g.genre] += 1));
    return { all: list.length, byGenre };
  }
  const list = filterProducts(f, true);
  list.forEach((p) => {
    const g = getGame(p.gameSlug);
    if (g) byGenre[g.genre] += 1;
  });
  return { all: list.length, byGenre };
}

/* ------------------------------------------------------------------ */
/* Product row helpers                                                 */
/* ------------------------------------------------------------------ */

/** 3–4 headline features: the first item of each group, topped up from the first group. */
export function keyFeatures(p: Product, max = 4): { icon: string; text: string }[] {
  const out: { icon: string; text: string }[] = p.features
    .filter((g) => g.items.length)
    .map((g) => ({ icon: g.icon, text: g.items[0] }));
  const first = p.features[0];
  for (let i = 1; out.length < max && first && i < first.items.length; i++) {
    out.push({ icon: first.icon, text: first.items[i] });
  }
  return out.slice(0, max);
}

export const compactNumber = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}K` : String(n);

export const GENRE_ICON: Record<Genre, string> = {
  'Battle Royale': 'crosshair',
  Tactical: 'shield',
  Extraction: 'box',
  Survival: 'flame',
  Arena: 'zap',
  Utility: 'cpu',
};
