import { StoreGame } from './store/StoreGame';
import { StoreIndex } from './store/StoreIndex';
import './store.css';

/** `#/store` (catalog with search + filters) and `#/store/<gameSlug>` (one game's products). */
export function StorePage({ gameSlug, query }: { gameSlug?: string; query: URLSearchParams }) {
  return gameSlug ? <StoreGame key={gameSlug} slug={gameSlug} /> : <StoreIndex query={query} />;
}
