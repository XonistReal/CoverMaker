import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { GameArt } from '../../components/GameArt';
import { Icon } from '../../components/Icon';
import { LogoMark } from '../../components/Logo';
import { BRAND } from '../../config';
import { STATUS_META } from '../../data/catalog';
import type { Game, Product, ProductKind } from '../../data/types';
import { buildVersion } from './setup';

/* Generated product visuals for the media gallery. Everything is CSS/SVG:
   no screenshots, no third-party art. */

export type ViewId = 'art' | 'esp' | 'menu' | 'radar' | 'loader' | 'spoof' | 'unlocks';

export const VIEWS_BY_KIND: Record<ProductKind, ViewId[]> = {
  external: ['art', 'esp', 'menu', 'radar'],
  internal: ['art', 'esp', 'menu', 'radar'],
  radar: ['art', 'radar', 'esp', 'loader'],
  unlocker: ['art', 'unlocks', 'menu', 'loader'],
  spoofer: ['art', 'spoof', 'menu', 'loader'],
};

export const VIEW_META: Record<ViewId, { label: string; caption: string }> = {
  art: { label: 'Overview', caption: 'Cover' },
  esp: { label: 'ESP preview', caption: 'Box, skeleton, health and distance ESP' },
  menu: { label: 'Menu', caption: 'The in-game menu, exactly as it ships' },
  radar: { label: 'Radar', caption: 'Live 2D radar with loot and extract markers' },
  loader: { label: 'Loader', caption: 'One-click loader with live build checks' },
  spoof: { label: 'Serial spoof', caption: 'Every identifier swapped in one run' },
  unlocks: { label: 'Unlocks', caption: 'Every cosmetic, toggled client-side' },
};

const MIN_H = 400;

/* ------------------------------------------------------------------ */
/* Scaled: lays children out at a fixed design width, then scales to fit */
/* ------------------------------------------------------------------ */

export function Scaled({ base = 760, min = 560, children }: { base?: number; min?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ s: 1, w: base, h: base * 0.625 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (!cw || !ch) return;
      // Design width between `min` and `base`, and never shorter than MIN_H design pixels.
      const w0 = Math.max(min, Math.min(base, cw));
      const s = Math.min(cw / w0, ch / MIN_H);
      setBox((b) => (Math.abs(b.s - s) < 0.001 && Math.abs(b.h - ch / s) < 0.5 ? b : { s, w: cw / s, h: ch / s }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [base, min]);
  return (
    <div ref={ref} className="pdp-scaled">
      <div
        className="pdp-scaled-inner"
        style={{
          width: box.w,
          height: box.h,
          transform: `scale(${box.s})`,
          // Space (in design px) kept clear at the bottom for the stage caption and arrows.
          ['--pdp-band' as string]: `${Math.ceil(66 / box.s)}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ESP scene                                                           */
/* ------------------------------------------------------------------ */

interface Target {
  x: number;
  y: number;
  h: number;
  name: string;
  dist: number;
  hp: number;
  shield: number;
  occluded?: boolean;
  cls: string;
}

const TARGETS: Target[] = [
  { x: 228, y: 352, h: 104, name: 'ghost_ttv', dist: 64, hp: 1, shield: 0.4, occluded: true, cls: 'mid' },
  { x: 338, y: 304, h: 46, name: 'kirra', dist: 142, hp: 0.55, shield: 0, cls: 'far' },
  { x: 506, y: 436, h: 206, name: 'R4ZOR', dist: 18, hp: 0.72, shield: 0.9, cls: 'near' },
];

function Soldier({ t }: { t: Target }) {
  const s = t.h / 100;
  return (
    <g transform={`translate(${t.x} ${t.y}) scale(${s})`}>
      <g className="pdp-esp-body">
        <circle cx="0" cy="-91" r="8.5" />
        <path d="M-13 -80 Q0 -85 13 -80 L15 -50 L11 -46 L12 -1 L4 -1 L1 -38 L-1 -38 L-4 -1 L-12 -1 L-11 -46 L-15 -50 Z" />
        <path d="M-7 -67 L32 -71 L33 -66.5 L-6 -62 Z" />
        <path d="M10 -77 L23 -67 L19 -63.5 L8 -71 Z" />
      </g>
      <g className="pdp-esp-skel" strokeWidth={1.6 / s}>
        <path d="M0 -82 L0 -46 M-12 -78 L12 -78 M-12 -78 L-14 -62 L-4 -64 M12 -78 L20 -67 L28 -69 M-7 -46 L7 -46 M-7 -46 L-8 -24 L-8 -2 M7 -46 L8 -24 L8 -2" />
        <circle cx="0" cy="-91" r="8.5" />
      </g>
    </g>
  );
}

function EspBox({ t, locked }: { t: Target; locked?: boolean }) {
  const w = t.h * 0.46;
  const x0 = t.x - w / 2 + 3;
  const y0 = t.y - t.h - 4;
  const x1 = x0 + w;
  const y1 = t.y + 2;
  const c = Math.max(6, w * 0.26);
  const corners = `M${x0} ${y0 + c}V${y0}H${x0 + c} M${x1 - c} ${y0}H${x1}V${y0 + c} M${x1} ${y1 - c}V${y1}H${x1 - c} M${x0 + c} ${y1}H${x0}V${y1 - c}`;
  const bh = y1 - y0;
  const small = t.h < 60;
  const fs = small ? 9 : t.h < 120 ? 10.5 : 12;
  const tagW = t.name.length * fs * 0.62 + 14;
  return (
    <g className={`pdp-esp-box${t.occluded ? ' is-occluded' : ''}${locked ? ' is-locked' : ''}`}>
      <path d={corners} className="pdp-esp-corners" />
      {!small && <rect x={x0} y={y0} width={w} height={bh} className="pdp-esp-fill" />}
      {/* health + shield */}
      <rect x={x0 - 7} y={y0} width="3" height={bh} className="pdp-esp-bar-bg" />
      <rect x={x0 - 7} y={y0 + bh * (1 - t.hp)} width="3" height={bh * t.hp} className="pdp-esp-hp" />
      {t.shield > 0 && (
        <>
          <rect x={x0 - 12} y={y0} width="3" height={bh} className="pdp-esp-bar-bg" />
          <rect x={x0 - 12} y={y0 + bh * (1 - t.shield)} width="3" height={bh * t.shield} className="pdp-esp-sh" />
        </>
      )}
      {/* name tag */}
      <g transform={`translate(${t.x + 3 - tagW / 2} ${y0 - fs - 12})`}>
        <rect width={tagW} height={fs + 8} rx="4" className="pdp-esp-tag" />
        <text x={tagW / 2} y={fs + 2} textAnchor="middle" className="pdp-esp-name" fontSize={fs}>
          {t.name}
        </text>
      </g>
      <text x={t.x + 3} y={y1 + fs + 6} textAnchor="middle" className="pdp-esp-dist" fontSize={fs - 1}>
        {t.dist}m
      </text>
    </g>
  );
}

export function EspScene({ game, playing = false }: { game: Game; playing?: boolean }) {
  const id = useId().replace(/:/g, '');
  const { hue, hue2 } = game;
  const near = TARGETS[2];
  const head = { x: near.x, y: near.y - near.h * 0.91 };
  return (
    <div className={`pdp-esp${playing ? ' is-playing' : ''}`} style={{ ['--pdp-h' as string]: hue }}>
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`hsl(${hue} 40% 10%)`} />
            <stop offset="0.5" stopColor={`hsl(${hue} 45% 20%)`} />
            <stop offset="0.585" stopColor={`hsl(${hue2} 50% 30%)`} />
            <stop offset="0.586" stopColor={`hsl(${hue} 22% 10%)`} />
            <stop offset="1" stopColor="#040509" />
          </linearGradient>
          <radialGradient id={`${id}-sun`} cx="0.64" cy="0.58" r="0.42">
            <stop offset="0" stopColor={`hsl(${hue2} 90% 70%)`} stopOpacity="0.55" />
            <stop offset="1" stopColor={`hsl(${hue2} 90% 50%)`} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-fog`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.45" stopColor={`hsl(${hue} 40% 40%)`} stopOpacity="0" />
            <stop offset="0.6" stopColor={`hsl(${hue} 40% 40%)`} stopOpacity="0.16" />
            <stop offset="0.75" stopColor={`hsl(${hue} 40% 40%)`} stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${id}-vig`} cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.7" />
          </radialGradient>
        </defs>

        <rect width="800" height="500" fill={`url(#${id}-sky)`} />
        <rect width="800" height="500" fill={`url(#${id}-sun)`} />

        {/* skyline */}
        <g fill={`hsl(${hue} 30% 7%)`}>
          <path d="M0 292V236h46v-20h30v76zM70 292V250h40v-30h22v72zM600 292V226h36v-34h28v100zM660 292V244h50v48zM700 292V206h26v-18h40v104zM760 292V232h40v60z" />
          <path d="M150 292v-22h60v22zM300 292v-14h80v14zM480 292v-26h70v26z" opacity="0.8" />
        </g>
        <g fill={`hsl(${hue2} 90% 70%)`} opacity="0.45">
          <rect x="612" y="236" width="3" height="3" />
          <rect x="624" y="250" width="3" height="3" />
          <rect x="712" y="220" width="3" height="3" />
          <rect x="736" y="244" width="3" height="3" />
          <rect x="20" y="248" width="3" height="3" />
        </g>
        <rect width="800" height="500" fill={`url(#${id}-fog)`} />

        {/* ground grid */}
        <g className="pdp-esp-grid">
          {[-500, -300, -150, -50, 50, 150, 250, 350, 450, 550, 650, 750, 850, 950, 1100, 1300].map((x) => (
            <line key={x} x1="400" y1="292" x2={x} y2="500" />
          ))}
          {[300, 312, 328, 350, 380, 422, 480].map((y) => (
            <line key={y} x1="0" y1={y} x2="800" y2={y} />
          ))}
        </g>

        {/* cover */}
        <g className="pdp-esp-cover">
          <path d="M160 362V318h112v44z" />
          <path d="M160 318l10-8h112l-10 8z" opacity="0.7" />
          <path d="M272 362V318l10-8v44z" opacity="0.55" />
          <path d="M640 352v-30h70v30z" />
        </g>

        {/* loot */}
        <g className="pdp-esp-loot">
          <path d="M318 410l8-9 8 9-8 9z" />
          <text x="340" y="414">
            Gold AR · 9m
          </text>
          <path d="M672 316l6-7 6 7-6 7z" />
          <text x="690" y="320">
            Med kit · 31m
          </text>
        </g>

        {/* snapline to far target */}
        <line x1="400" y1="500" x2={TARGETS[1].x + 3} y2={TARGETS[1].y + 2} className="pdp-esp-snap" />

        {TARGETS.map((t) => (
          <g key={t.name} className={`pdp-esp-t pdp-esp-t-${t.cls}`}>
            <Soldier t={t} />
            {/* occluded target sits behind the crate */}
            {t.occluded && <path d="M160 362V318h112v44z" className="pdp-esp-cover-front" />}
            <EspBox t={t} locked={t === near} />
          </g>
        ))}

        {/* FOV + aim */}
        <circle cx="400" cy="250" r="128" className="pdp-esp-fov" />
        <line x1="400" y1="250" x2={head.x + 3} y2={head.y} className="pdp-esp-aim" />
        <circle cx={head.x + 3} cy={head.y} r="5" className="pdp-esp-aimdot" />
        <g className="pdp-esp-cross">
          <path d="M400 238v7M400 255v7M388 250h7M405 250h7" />
          <circle cx="400" cy="250" r="1.6" />
        </g>
        <rect width="800" height="500" fill={`url(#${id}-vig)`} />
      </svg>
      <div className="pdp-esp-hud">
        <span className="pdp-hud-chip">
          <LogoMark size={14} />
          {BRAND.wordmark} <span className="dim">/</span> VISUALS
        </span>
        <span className="pdp-hud-chip">
          <span className="pdp-hud-live" /> 3 TARGETS <span className="dim">·</span> 144 FPS
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* In-game menu mock                                                   */
/* ------------------------------------------------------------------ */

const ON_PATTERN = [true, true, false, true, true, false, true];

export function MenuMock({ product, game }: { product: Product; game: Game }) {
  const groups = product.features;
  const active = groups[0];
  const isSpoof = product.kind === 'spoofer';
  const isUnlock = product.kind === 'unlocker';
  const isPerm = product.plans.some((p) => p.days === null);
  const meta = STATUS_META[product.status];
  const rows = active.items.slice(0, 6);
  return (
    <div className="pdp-mock pdp-mock-menu">
      <div className="pdp-mock-backdrop">
        <GameArt game={game} variant="banner" showName={false} />
      </div>
      <div className="pdp-win pdp-menu-win">
        <div className="pdp-win-bar">
          <span className="row gap-8">
            <LogoMark size={16} />
            <strong className="pdp-win-brand">{BRAND.wordmark}</strong>
            <span className="pdp-win-sep" />
            <span className="pdp-win-title">{product.name}</span>
          </span>
          <span className="row gap-8">
            <span className={`pdp-win-status tone-${meta.tone}`}>
              <span className={`dot ${meta.tone}`} /> {meta.label}
            </span>
            <span className="pdp-win-ver">v{buildVersion(product)}</span>
            <span className="pdp-win-ctl" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </span>
        </div>
        <div className="pdp-menu-body">
          <aside className="pdp-menu-side">
            {groups.map((g, i) => (
              <span key={g.group} className={`pdp-menu-tab${i === 0 ? ' is-active' : ''}`}>
                <Icon name={g.icon} size={14} />
                {g.group}
              </span>
            ))}
            <span className="pdp-menu-tab">
              <Icon name="layers" size={14} />
              Configs
            </span>
            <span className="pdp-menu-tab">
              <Icon name="settings" size={14} />
              Settings
            </span>
            <span className="pdp-menu-user">
              <span className="pdp-menu-ava">K</span>
              <span>
                <b>kxzzy</b>
                <em>29 days left</em>
              </span>
            </span>
          </aside>
          <div className="pdp-menu-main">
            <div className="pdp-menu-head">
              <span>
                <b>{active.group}</b>
                <em>
                  {rows.length} of {active.items.length} options
                </em>
              </span>
              <span className="pdp-menu-key">
                {isSpoof ? 'Spoof now' : isUnlock ? 'Hotkey' : 'Aim key'}{' '}
                <kbd>{isSpoof ? 'F8' : isUnlock ? 'F5' : 'MOUSE 5'}</kbd>
              </span>
            </div>
            <div className="pdp-menu-grid">
              {rows.map((label, i) => (
                <span key={label} className="pdp-menu-row">
                  <span className="pdp-menu-label">{label}</span>
                  <span className={`pdp-mini-switch${ON_PATTERN[i % ON_PATTERN.length] ? ' is-on' : ''}`} />
                </span>
              ))}
            </div>
            {isSpoof ? (
              <div className="pdp-menu-extra">
                <span className="pdp-menu-seg">
                  <i className={isPerm ? undefined : 'is-on'}>Temp</i>
                  <i className={isPerm ? 'is-on' : undefined}>Perm</i>
                </span>
                <span className="pdp-menu-progress">
                  <span>
                    Identifiers spoofed <b>6 / 6</b>
                  </span>
                  <span className="pdp-menu-track">
                    <span style={{ width: '100%' }} />
                  </span>
                </span>
              </div>
            ) : isUnlock ? (
              <div className="pdp-menu-extra">
                <span className="pdp-menu-progress">
                  <span>
                    Items unlocked <b>1,284 / 1,284</b>
                  </span>
                  <span className="pdp-menu-track">
                    <span style={{ width: '100%' }} />
                  </span>
                </span>
              </div>
            ) : (
              <div className="pdp-menu-extra">
                <span className="pdp-menu-slider">
                  <span>
                    Smoothing <b>62%</b>
                  </span>
                  <span className="pdp-menu-track">
                    <span style={{ width: '62%' }} />
                    <i style={{ left: '62%' }} />
                  </span>
                </span>
                <span className="pdp-menu-slider">
                  <span>
                    FOV <b>120°</b>
                  </span>
                  <span className="pdp-menu-track">
                    <span style={{ width: '40%' }} />
                    <i style={{ left: '40%' }} />
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Radar mock                                                          */
/* ------------------------------------------------------------------ */

const ENEMIES = [
  { x: 262, y: 118, r: 30 },
  { x: 120, y: 150, r: 150 },
  { x: 300, y: 262, r: 220 },
  { x: 168, y: 300, r: 330 },
];
const SQUAD = [
  { x: 186, y: 214, r: -20 },
  { x: 214, y: 226, r: 15 },
];
const LOOT = [
  { x: 242, y: 166 },
  { x: 140, y: 250 },
  { x: 318, y: 190 },
  { x: 98, y: 206 },
  { x: 252, y: 318 },
];

export function RadarMock({ game, compact = false }: { game: Game; compact?: boolean }) {
  const id = useId().replace(/:/g, '');
  const { hue } = game;
  return (
    <div className="pdp-mock pdp-mock-radar">
      <div className="pdp-radar-wrap">
        <svg viewBox="0 0 400 400" className="pdp-radar" aria-hidden="true">
          <defs>
            <radialGradient id={`${id}-bg`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor={`hsl(${hue} 40% 14%)`} />
              <stop offset="1" stopColor={`hsl(${hue} 30% 6%)`} />
            </radialGradient>
            <linearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="hsl(191 100% 63%)" stopOpacity="0" />
              <stop offset="1" stopColor="hsl(191 100% 63%)" stopOpacity="0.38" />
            </linearGradient>
            <clipPath id={`${id}-clip`}>
              <circle cx="200" cy="200" r="190" />
            </clipPath>
          </defs>
          <circle cx="200" cy="200" r="190" fill={`url(#${id}-bg)`} />
          <g clipPath={`url(#${id}-clip)`}>
            {/* terrain */}
            <g className="pdp-radar-terrain">
              <path d="M40 90c40-30 90-20 110 10s-10 70-50 70-90-40-60-80z" />
              <path d="M250 270c30-20 80-10 100 20s0 70-40 70-80-60-60-90z" />
              <path d="M230 40h70v50h-70zM90 300h60v40H90zM300 120h40v60h-40z" />
            </g>
            <g className="pdp-radar-roads">
              <path d="M0 230C120 210 160 140 400 160" />
              <path d="M180 0c10 120 40 250-20 400" />
            </g>
            <g className="pdp-radar-sweep">
              <path d="M200 200L390 200A190 190 0 0 0 334 66Z" fill={`url(#${id}-sweep)`} />
              <line x1="200" y1="200" x2="390" y2="200" />
            </g>
          </g>
          <g className="pdp-radar-rings">
            {[47, 95, 142, 190].map((r) => (
              <circle key={r} cx="200" cy="200" r={r} />
            ))}
            <path d="M200 10v380M10 200h380" />
          </g>
          <text x="200" y="28" textAnchor="middle" className="pdp-radar-n">
            N
          </text>
          <text x="206" y="150" className="pdp-radar-scale">
            50m
          </text>
          <text x="206" y="104" className="pdp-radar-scale">
            100m
          </text>
          {/* extract */}
          <g className="pdp-radar-exfil">
            <rect x="322" y="300" width="14" height="14" rx="2" />
            <text x="342" y="312">
              EXFIL
            </text>
          </g>
          {LOOT.map((l, i) => (
            <path key={i} d={`M${l.x} ${l.y - 6}l6 6-6 6-6-6z`} className="pdp-radar-loot" />
          ))}
          {ENEMIES.map((e, i) => (
            <g key={i} transform={`translate(${e.x} ${e.y}) rotate(${e.r})`} className="pdp-radar-enemy">
              <path d="M0 0L-12 -26A28 28 0 0 1 12 -26Z" className="pdp-radar-cone" />
              <circle r="6" />
            </g>
          ))}
          {SQUAD.map((s, i) => (
            <g key={i} transform={`translate(${s.x} ${s.y}) rotate(${s.r})`} className="pdp-radar-squad">
              <path d="M0 -8L6 6L0 3L-6 6Z" />
            </g>
          ))}
          <g transform="translate(200 200)" className="pdp-radar-me">
            <circle r="16" className="pdp-radar-me-ring" />
            <path d="M0 -10L8 8L0 4L-8 8Z" />
          </g>
        </svg>
      </div>
      {!compact && (
        <div className="pdp-radar-panel">
          <div className="pdp-radar-panel-head">
            <span>
              <b>Live radar</b>
              <em>{game.name}</em>
            </span>
            <span className="pdp-hud-chip">
              <span className="pdp-hud-live" /> LIVE
            </span>
          </div>
          <ul className="pdp-radar-legend">
            <li>
              <i className="lg-enemy" /> Enemies <b>4</b>
            </li>
            <li>
              <i className="lg-squad" /> Squad <b>2</b>
            </li>
            <li>
              <i className="lg-loot" /> High-value loot <b>5</b>
            </li>
            <li>
              <i className="lg-exfil" /> Extracts <b>1</b>
            </li>
          </ul>
          <div className="pdp-radar-near">
            <span className="pdp-radar-near-h">Nearest</span>
            <span>
              R4ZOR <em>42m · NE</em>
            </span>
            <span>
              Gold AR <em>18m · N</em>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loader mock                                                         */
/* ------------------------------------------------------------------ */

export function LoaderMock({ product, game }: { product: Product; game: Game }) {
  const meta = STATUS_META[product.status];
  const ok = product.status !== 'detected';
  const steps = [
    { t: 'Authenticating license', v: 'ok' },
    { t: `Checking build v${buildVersion(product)}`, v: 'ok' },
    { t: `Status: ${meta.label}`, v: ok ? 'ok' : 'hold' },
    { t: product.kind === 'spoofer' ? 'Reading hardware serials' : `Waiting for ${game.name}`, v: 'wait' },
  ];
  return (
    <div className="pdp-mock pdp-mock-loader">
      <div className="pdp-win pdp-loader-win">
        <div className="pdp-win-bar">
          <span className="row gap-8">
            <LogoMark size={16} />
            <strong className="pdp-win-brand">{BRAND.wordmark}</strong>
            <span className="pdp-win-title">Loader</span>
          </span>
          <span className="pdp-win-ctl" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="pdp-loader-body">
          <div className="pdp-loader-left">
            <div className="pdp-loader-prod">
              <GameArt game={game} variant="tile" />
              <span className="grow">
                <b>{product.name}</b>
                <em className={`tone-${meta.tone}`}>
                  <span className={`dot ${meta.tone}`} /> {meta.label}
                </em>
              </span>
            </div>
            <span className="pdp-loader-key">
              <Icon name="key" size={14} />
              {BRAND.wordmark.slice(0, 3)}-••••-••••-7F3A
              <Icon name="check-circle" size={14} />
            </span>
            <span className={`pdp-loader-btn${ok ? '' : ' is-off'}`}>
              {ok ? (product.kind === 'spoofer' ? 'Spoof & launch' : 'Launch') : 'Paused'}
              <Icon name={ok ? 'play' : 'lock'} size={14} />
            </span>
          </div>
          <div className="pdp-loader-right">
            <span className="pdp-loader-log-h">
              Session log <span className="pdp-win-ver">v{buildVersion(product)}</span>
            </span>
            <ul className="pdp-loader-log">
              {steps.map((s) => (
                <li key={s.t} className={`is-${s.v}`}>
                  <span>{s.t}</span>
                  <span className="pdp-loader-dots" />
                  <b>{s.v === 'ok' ? 'OK' : s.v === 'hold' ? 'HOLD' : <i className="pdp-spin" />}</b>
                </li>
              ))}
            </ul>
          </div>
          <span className="pdp-loader-foot">
            <span>Subscription · 29 days left</span>
            <span>Stream-proof</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Spoofer mock                                                        */
/* ------------------------------------------------------------------ */

const SERIALS = [
  { k: 'Disk serial', a: 'S4EVNX0R418273', b: 'WD-WX81A39K2210' },
  { k: 'SMBIOS UUID', a: '4C4C4544-0038-4B10', b: '8F2A11C0-93DE-77A1' },
  { k: 'Baseboard', a: 'MS-7C02-1A2B3C', b: 'PRX-4E91-0B7DD2' },
  { k: 'MAC address', a: '00:1A:2B:3C:4D:5E', b: '9C:4E:36:A1:07:F2' },
  { k: 'GPU ID', a: 'GPU-7f3a19c2-e1', b: 'GPU-c81e04ab-5d' },
];

export function SpoofMock({ product }: { product: Product }) {
  const perm = product.plans.some((p) => p.days === null);
  return (
    <div className="pdp-mock pdp-mock-spoof">
      <div className="pdp-win pdp-spoof-win">
        <div className="pdp-win-bar">
          <span className="row gap-8">
            <LogoMark size={16} />
            <strong className="pdp-win-brand">{BRAND.wordmark}</strong>
            <span className="pdp-win-sep" />
            <span className="pdp-win-title">Hardware identity</span>
          </span>
          <span className="pdp-win-status tone-ok">
            <span className="dot ok" /> Spoofed
          </span>
        </div>
        <div className="pdp-spoof-body">
          <div className="pdp-spoof-row is-head">
            <span>Identifier</span>
            <span>Original</span>
            <span>New</span>
          </div>
          {SERIALS.map((s) => (
            <div key={s.k} className="pdp-spoof-row">
              <span>{s.k}</span>
              <span className="pdp-spoof-old">{s.a}</span>
              <span className="pdp-spoof-new">
                <Icon name="check" size={12} />
                {s.b}
              </span>
            </div>
          ))}
          <div className="pdp-spoof-foot">
            <span className="pdp-menu-progress">
              <span>
                All identifiers changed <b>{perm ? 'Permanent' : 'Reverts on reboot'}</b>
              </span>
              <span className="pdp-menu-track">
                <span style={{ width: '100%' }} />
              </span>
            </span>
            <span className="pdp-hud-chip">TPM-AWARE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Unlocks mock                                                        */
/* ------------------------------------------------------------------ */

const UNLOCK_KINDS = ['Operator', 'Camo', 'Reticle', 'Blueprint', 'Emblem', 'Card'];

export function UnlocksMock({ game }: { game: Game }) {
  return (
    <div className="pdp-mock pdp-mock-unlocks">
      <div className="pdp-win pdp-unlock-win">
        <div className="pdp-win-bar">
          <span className="row gap-8">
            <LogoMark size={16} />
            <strong className="pdp-win-brand">{BRAND.wordmark}</strong>
            <span className="pdp-win-sep" />
            <span className="pdp-win-title">Unlock all</span>
          </span>
          <span className="pdp-win-status tone-ok">
            <span className="dot ok" /> 1,284 / 1,284
          </span>
        </div>
        <div className="pdp-unlock-grid">
          {Array.from({ length: 12 }, (_, i) => {
            const h = (game.hue + i * 37) % 360;
            return (
              <span
                key={i}
                className="pdp-unlock-tile"
                style={{ background: `linear-gradient(140deg, hsl(${h} 80% 52%), hsl(${(h + 60) % 360} 70% 22%))` }}
              >
                <span className="pdp-unlock-ck">
                  <Icon name="check" size={10} />
                </span>
                <em>{UNLOCK_KINDS[i % UNLOCK_KINDS.length]}</em>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Renders one gallery view (non-art) at the right scale. */
export function ViewRender({
  view,
  product,
  game,
  thumb = false,
}: {
  view: ViewId;
  product: Product;
  game: Game;
  thumb?: boolean;
}) {
  const min = thumb ? 640 : 560;
  switch (view) {
    case 'esp':
      return <EspScene game={game} />;
    case 'menu':
      return (
        <Scaled min={min}>
          <MenuMock product={product} game={game} />
        </Scaled>
      );
    case 'radar':
      return (
        <Scaled min={min}>
          <RadarMock game={game} compact={thumb} />
        </Scaled>
      );
    case 'loader':
      return (
        <Scaled min={min}>
          <LoaderMock product={product} game={game} />
        </Scaled>
      );
    case 'spoof':
      return (
        <Scaled min={min}>
          <SpoofMock product={product} />
        </Scaled>
      );
    case 'unlocks':
      return (
        <Scaled min={min}>
          <UnlocksMock game={game} />
        </Scaled>
      );
    default:
      return <GameArt game={game} variant="banner" />;
  }
}
