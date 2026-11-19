import { useId, type CSSProperties } from 'react';
import type { Game } from '../data/types';

/**
 * Generated cover art for a game. No third-party artwork: each cover is
 * built from the game's two hues, a seeded set of slashes, a reticle and a
 * huge outlined monogram, so every game gets a distinct but on-brand poster.
 *
 * Variants:
 *  - poster: tall product / game card
 *  - banner: wide header on game & product pages
 *  - tile:   small square thumbnail (cart, tables, search results)
 */

type Variant = 'poster' | 'banner' | 'tile';

function seed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

interface Props {
  game: Game;
  variant?: Variant;
  /** Show the game name inside the art (poster/banner). */
  showName?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function GameArt({ game, variant = 'poster', showName = true, className = '', style }: Props) {
  const rnd = seed(game.slug);
  const { hue, hue2 } = game;
  const W = variant === 'banner' ? 1200 : variant === 'tile' ? 200 : 600;
  const H = variant === 'banner' ? 420 : variant === 'tile' ? 200 : 800;

  const slashes = Array.from({ length: variant === 'tile' ? 2 : 4 }, (_, i) => {
    const x = W * (0.15 + rnd() * 0.85);
    const w = W * (0.05 + rnd() * 0.14);
    const skew = W * (0.25 + rnd() * 0.25);
    const o = 0.18 + rnd() * 0.5;
    return { x, w, skew, o, i };
  });
  const ringX = W * (0.55 + rnd() * 0.25);
  const ringY = H * (0.28 + rnd() * 0.22);
  const ringR = Math.min(W, H) * (variant === 'banner' ? 0.36 : 0.3);
  const rot = -8 + rnd() * 6;
  // Unique per instance: shared ids break when the first copy sits in a display:none subtree.
  const uid = useId().replace(/:/g, '');
  const gid = `ga-${game.slug}-${variant}-${uid}`;

  return (
    <div
      className={`game-art variant-${variant} ${className}`}
      style={{ ...style, ['--h1' as string]: hue, ['--h2' as string]: hue2 }}
      aria-hidden={showName ? undefined : true}
    >
      <svg className="game-art-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id={`${gid}-a`} cx="75%" cy="18%" r="85%">
            <stop offset="0" stopColor={`hsl(${hue} 90% 58%)`} stopOpacity="0.95" />
            <stop offset="0.45" stopColor={`hsl(${hue} 80% 30%)`} stopOpacity="0.55" />
            <stop offset="1" stopColor="#06070a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${gid}-b`} cx="5%" cy="100%" r="80%">
            <stop offset="0" stopColor={`hsl(${hue2} 90% 55%)`} stopOpacity="0.7" />
            <stop offset="1" stopColor="#06070a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${gid}-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.35" stopColor="#06070a" stopOpacity="0" />
            <stop offset="1" stopColor="#06070a" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id={`${gid}-slash`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={`hsl(${hue} 100% 65%)`} />
            <stop offset="1" stopColor={`hsl(${hue2} 100% 55%)`} />
          </linearGradient>
          <pattern id={`${gid}-scan`} width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="1" fill="#fff" opacity="0.05" />
          </pattern>
        </defs>

        <rect width={W} height={H} fill="#0a0c12" />
        <rect width={W} height={H} fill={`url(#${gid}-a)`} />
        <rect width={W} height={H} fill={`url(#${gid}-b)`} />

        {/* slashes */}
        <g style={{ mixBlendMode: 'screen' }}>
          {slashes.map((s) => (
            <polygon
              key={s.i}
              points={`${s.x},0 ${s.x + s.w},0 ${s.x + s.w - s.skew},${H} ${s.x - s.skew},${H}`}
              fill={`url(#${gid}-slash)`}
              opacity={s.o * 0.55}
            />
          ))}
        </g>

        {/* monogram */}
        {variant !== 'tile' && (
          <text
            x={variant === 'banner' ? W * 0.97 : W * 0.5}
            y={variant === 'banner' ? H * 0.82 : H * 0.6}
            textAnchor={variant === 'banner' ? 'end' : 'middle'}
            transform={`rotate(${rot} ${W / 2} ${H / 2})`}
            className="game-art-mono"
            fontSize={variant === 'banner' ? H * 0.78 : W * (game.short.length > 3 ? 0.36 : 0.46)}
            fill="none"
            stroke={`hsl(${hue} 100% 80%)`}
            strokeOpacity="0.22"
            strokeWidth={variant === 'banner' ? 2 : 2.5}
          >
            {game.short}
          </text>
        )}

        {/* reticle */}
        <g stroke={`hsl(${hue} 100% 85%)`} fill="none" opacity={variant === 'tile' ? 0.5 : 0.38}>
          <circle cx={ringX} cy={ringY} r={ringR} strokeWidth="1.5" strokeDasharray="3 9" />
          <circle cx={ringX} cy={ringY} r={ringR * 0.62} strokeWidth="1.2" />
          <circle cx={ringX} cy={ringY} r={ringR * 0.08} strokeWidth="2" />
          <path
            d={`M${ringX - ringR * 1.15} ${ringY}H${ringX - ringR * 0.75}M${ringX + ringR * 0.75} ${ringY}H${ringX + ringR * 1.15}M${ringX} ${ringY - ringR * 1.15}V${ringY - ringR * 0.75}M${ringX} ${ringY + ringR * 0.75}V${ringY + ringR * 1.15}`}
            strokeWidth="2"
          />
        </g>

        <rect width={W} height={H} fill={`url(#${gid}-scan)`} />
        {variant !== 'tile' && <rect width={W} height={H} fill={`url(#${gid}-fade)`} />}
      </svg>

      {variant === 'tile' && <span className="game-art-tile-mono">{game.short}</span>}
      {showName && variant !== 'tile' && (
        <span className="game-art-name">
          <span className="game-art-name-text">{game.name}</span>
        </span>
      )}
    </div>
  );
}
