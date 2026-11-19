import { GameArt } from '../../components/GameArt';
import { Icon } from '../../components/Icon';
import { StatusDot } from '../../components/ui';
import { GAMES, STATS, formatPrice, gameFromPrice, gameStatus, productsForGame } from '../../data/catalog';
import type { Game } from '../../data/types';
import { Link } from '../../router';

const ROW_A = GAMES;
const ROW_B = [...GAMES.slice(8), ...GAMES.slice(0, 8)].reverse();

function GameChip({ game, hidden }: { game: Game; hidden?: boolean }) {
  const count = productsForGame(game.slug).length;
  return (
    <Link
      to={`/store/${game.slug}`}
      className="home-game-chip"
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      aria-label={hidden ? undefined : `${game.name}: ${count} ${count === 1 ? 'product' : 'products'}`}
    >
      <span className="home-game-chip-tile">
        <GameArt game={game} variant="tile" />
      </span>
      <span className="home-game-chip-text">
        <span className="home-game-chip-name">{game.name}</span>
        <span className="home-game-chip-meta">
          <StatusDot status={gameStatus(game.slug)} pulse={false} />
          from {formatPrice(gameFromPrice(game.slug))}
        </span>
      </span>
      {game.tag && <span className={`badge ${game.tag === 'new' ? 'badge-accent' : 'badge-violet'}`}>{game.tag}</span>}
    </Link>
  );
}

function Row({ games, reverse, dur }: { games: Game[]; reverse?: boolean; dur: string }) {
  return (
    <div className="marquee home-games-row">
      <div className={`marquee-track${reverse ? ' reverse' : ''}`} style={{ ['--dur' as string]: dur }}>
        {games.map((g) => (
          <GameChip key={g.slug} game={g} />
        ))}
        {games.map((g) => (
          <GameChip key={`${g.slug}-dup`} game={g} hidden />
        ))}
      </div>
    </div>
  );
}

export function GamesMarquee() {
  return (
    <section className="section-sm home-games" aria-labelledby="home-games-title">
      <div className="container">
        <div className="home-games-head">
          <span className="home-games-label">
            <span className="eyebrow">Supported games</span>
          </span>
          <h2 id="home-games-title" className="h3 home-games-title">
            {STATS.games} games, <span className="muted">one account.</span>
          </h2>
          <Link to="/store" className="home-link-arrow">
            All games <Icon name="arrow-right" size={15} />
          </Link>
        </div>
      </div>
      <div className="home-games-rows">
        <Row games={ROW_A} dur="70s" />
        <Row games={ROW_B} dur="80s" reverse />
      </div>
    </section>
  );
}
