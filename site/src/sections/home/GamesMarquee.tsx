import { GameArt } from '../../components/GameArt';
import { Icon } from '../../components/Icon';
import { StatusDot } from '../../components/ui';
import { GAMES, STATS, formatPrice, gameFromPrice, gameStatus, productsForGame } from '../../data/catalog';
import type { Game } from '../../data/types';
import { Link } from '../../router';

const ROW_A = GAMES;
const ROW_B = [...GAMES.slice(8), ...GAMES.slice(0, 8)].reverse();
/** Room kept between a focused chip and the row edge (matches `scroll-padding-inline` in home.css). */
const FOCUS_PAD = 24;

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

/**
 * One looping row. `decorative` rows repeat games already listed in the first row, so they stay out of the
 * tab order and the accessibility tree. Focus inside a row stops its animation (see home.css) so the focused
 * chip stays put; when focus leaves, the row's scroll offset is reset before the loop resumes.
 */
function Row({ games, reverse, dur, decorative }: { games: Game[]; reverse?: boolean; dur: string; decorative?: boolean }) {
  return (
    <div
      className={`marquee home-games-row${decorative ? ' is-decorative' : ''}`}
      aria-hidden={decorative || undefined}
      onFocus={(e) => {
        // The browser leaves a half-visible chip where it is: bring the whole chip and its ring into view.
        const row = e.currentTarget;
        const r = (e.target as HTMLElement).getBoundingClientRect();
        const box = row.getBoundingClientRect();
        if (r.left < box.left + FOCUS_PAD) row.scrollLeft -= box.left + FOCUS_PAD - r.left;
        else if (r.right > box.right - FOCUS_PAD) row.scrollLeft += r.right - (box.right - FOCUS_PAD);
      }}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        // Reduced motion shows a static, user-scrollable strip instead: leave its position alone.
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) e.currentTarget.scrollLeft = 0;
      }}
    >
      <div className={`marquee-track${reverse ? ' reverse' : ''}`} style={{ ['--dur' as string]: dur }}>
        {games.map((g) => (
          <GameChip key={g.slug} game={g} hidden={decorative} />
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
            {STATS.games} games, <span className="grad-text">one account.</span>
          </h2>
          <Link to="/store" className="home-link-arrow">
            All games <Icon name="arrow-right" size={15} />
          </Link>
        </div>
      </div>
      <div className="home-games-rows">
        <Row games={ROW_A} dur="70s" />
        <Row games={ROW_B} dur="80s" reverse decorative />
      </div>
    </section>
  );
}
