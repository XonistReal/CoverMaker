import { KIND_LABEL, formatPrice, fromPrice, gameFromPrice, gameStatus, getGame, productsForGame } from '../data/catalog';
import type { Game, Product } from '../data/types';
import { Link } from '../router';
import { GameArt } from './GameArt';
import { Icon } from './Icon';
import { StatusBadge, StatusDot } from './ui';

/** Tall poster card for a single product (home "Popular", store results). */
export function ProductCard({ product }: { product: Product }) {
  const game = getGame(product.gameSlug)!;
  return (
    <Link to={`/product/${product.slug}`} className="product-card" aria-label={`${product.name}, from ${formatPrice(fromPrice(product))}`}>
      <div className="product-card-art">
        <GameArt game={game} variant="poster" showName={false} />
        <div className="product-card-top">
          <span className="product-card-price">
            <span className="tiny mono">FROM</span>
            <strong>{formatPrice(fromPrice(product))}</strong>
          </span>
          <span className="row gap-4">
            {product.isNew && <span className="badge badge-solid">New</span>}
            {product.popular && !product.isNew && (
              <span className="badge badge-violet">
                <Icon name="flame" size={11} />
                Hot
              </span>
            )}
          </span>
        </div>
        <div className="product-card-hover">
          <span className="btn btn-primary btn-sm">
            View plans <Icon name="arrow-right" />
          </span>
        </div>
      </div>
      <div className="product-card-body">
        <div className="row gap-8" style={{ justifyContent: 'space-between' }}>
          <span className="tiny muted mono">{KIND_LABEL[product.kind].toUpperCase()}</span>
          <StatusBadge status={product.status} size="sm" />
        </div>
        <h3 className="product-card-title">{product.name}</h3>
        <p className="product-card-tag">{product.tagline}</p>
      </div>
    </Link>
  );
}

/** Game tile for "Find your game" grids: links to the game's product list. */
export function GameCard({ game }: { game: Game }) {
  const count = productsForGame(game.slug).length;
  const status = gameStatus(game.slug);
  return (
    <Link to={`/store/${game.slug}`} className="game-card" aria-label={`${game.name}: ${count} products`}>
      <GameArt game={game} variant="poster" />
      <div className="game-card-meta">
        <span className="row gap-8 tiny">
          <StatusDot status={status} />
          <span className="text-2">
            {count} {count === 1 ? 'product' : 'products'}
          </span>
        </span>
        <span className="tiny mono muted">from {formatPrice(gameFromPrice(game.slug))}</span>
      </div>
      {game.tag && <span className={`badge game-card-tag ${game.tag === 'new' ? 'badge-solid' : 'badge-violet'}`}>{game.tag}</span>}
    </Link>
  );
}
