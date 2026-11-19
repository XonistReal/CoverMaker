import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GameArt } from '../../components/GameArt';
import { Icon } from '../../components/Icon';
import { KIND_LABEL } from '../../data/catalog';
import type { Game, Product } from '../../data/types';
import { EspScene, VIEW_META, VIEWS_BY_KIND, ViewRender, type ViewId } from './Visuals';

const CLIP_SECONDS = 102;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function Media({ product, game }: { product: Product; game: Game }) {
  const views = VIEWS_BY_KIND[product.kind];
  const [active, setActive] = useState<ViewId>('art');
  const [videoOpen, setVideoOpen] = useState(false);
  const playRef = useRef<HTMLButtonElement>(null);
  const idx = views.indexOf(active);
  const go = (d: number) => setActive(views[(idx + d + views.length) % views.length]);

  return (
    <div className="pdp-media">
      <div className="pdp-stage" data-view={active}>
        <div key={active} className="pdp-stage-view" role="img" aria-label={`${product.name}: ${VIEW_META[active].label}`}>
          <ViewRender view={active} product={product} game={game} />
        </div>

        {active === 'art' && (
          <>
            <div className="pdp-stage-tags">
              <span className="pdp-glass-chip mono">{KIND_LABEL[product.kind].toUpperCase()}</span>
              {product.isNew && <span className="badge badge-solid">New</span>}
              {product.popular && !product.isNew && (
                <span className="pdp-glass-chip pdp-hot">
                  <Icon name="flame" size={12} /> Best seller
                </span>
              )}
            </div>
            <button ref={playRef} type="button" className="pdp-play" onClick={() => setVideoOpen(true)}>
              <span className="pdp-play-btn" aria-hidden="true">
                <Icon name="play" size={22} />
              </span>
              <span className="pdp-play-label">
                <strong>Watch gameplay</strong>
                <span className="mono">{fmt(CLIP_SECONDS)}</span>
              </span>
            </button>
          </>
        )}
        {active !== 'art' && (
          <span className="pdp-stage-caption">
            <strong>{VIEW_META[active].label}</strong>
            <span>{VIEW_META[active].caption}</span>
          </span>
        )}

        <div className="pdp-stage-nav">
          <span className="pdp-stage-count mono" aria-hidden="true">
            {idx + 1} / {views.length}
          </span>
          <button type="button" className="pdp-stage-arrow" onClick={() => go(-1)} aria-label="Previous image">
            <Icon name="chevron-left" size={18} />
          </button>
          <button type="button" className="pdp-stage-arrow" onClick={() => go(1)} aria-label="Next image">
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
      </div>

      <div className="pdp-thumbs" role="group" aria-label="Product media">
        {views.map((v) => (
          <button
            key={v}
            type="button"
            className={`pdp-thumb${v === active ? ' is-active' : ''}`}
            aria-pressed={v === active}
            aria-label={`Show ${VIEW_META[v].label}`}
            onClick={() => setActive(v)}
          >
            <span className="pdp-thumb-art" aria-hidden="true">
              {v === 'art' ? (
                <GameArt game={game} variant="banner" showName={false} />
              ) : (
                <ViewRender view={v} product={product} game={game} thumb />
              )}
              {v === 'art' && (
                <span className="pdp-thumb-play">
                  <Icon name="play" size={12} />
                </span>
              )}
            </span>
            <span className="pdp-thumb-label">{VIEW_META[v].label}</span>
          </button>
        ))}
      </div>

      {videoOpen && (
        <VideoModal
          product={product}
          game={game}
          onClose={() => {
            setVideoOpen(false);
            playRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Video modal (styled placeholder player, no real video)              */
/* ------------------------------------------------------------------ */

function VideoModal({ product, game, onClose }: { product: Product; game: Game; onClose: () => void }) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const barBtnRef = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Focus, scroll lock and restore.
  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  // Esc closes and Tab stays inside the dialog, wherever focus currently is (even <body>).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (e.key === 'Escape') {
        // Topmost overlay: stop here so the chat panel underneath stays open.
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const els = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'),
      );
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    // Capture phase on window runs before other overlays' document listeners.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // Fake playback clock.
  useEffect(() => {
    if (!playing) return;
    const iv = window.setInterval(() => {
      setT((v) => {
        if (v + 0.25 >= CLIP_SECONDS) {
          setPlaying(false);
          return CLIP_SECONDS;
        }
        return v + 0.25;
      });
    }, 250);
    return () => window.clearInterval(iv);
  }, [playing]);

  const toggle = () => {
    if (!playing && t >= CLIP_SECONDS) setT(0);
    setPlaying((p) => !p);
  };

  const pct = (t / CLIP_SECONDS) * 100;

  return createPortal(
    <div className="pdp-modal">
      <div className="pdp-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="pdp-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="pdp-modal-head">
          <div className="stack gap-4">
            <span className="eyebrow">Gameplay preview</span>
            <h2 id={titleId} className="h3">
              {product.name} in action
            </h2>
          </div>
          <button ref={closeRef} type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close video">
            <Icon name="x" />
          </button>
        </div>

        <div className={`pdp-player${playing ? ' is-playing' : ''}`}>
          <div className="pdp-player-frame">
            <EspScene game={game} playing={playing} />
            <div className="pdp-player-scan" aria-hidden="true" />
            <div className="pdp-player-top" aria-hidden="true">
              <span className="pdp-hud-chip">
                <span className={`pdp-hud-rec${playing ? ' is-on' : ''}`} /> {playing ? 'PLAYING' : 'PREVIEW'}
              </span>
              <span className="pdp-hud-chip">1080P60</span>
            </div>
            {!playing && (
              <button
                type="button"
                className="pdp-player-big"
                onClick={() => {
                  // This button unmounts once playback starts: hand focus to the bar's play/pause first.
                  barBtnRef.current?.focus({ preventScroll: true });
                  toggle();
                }}
                aria-label={t > 0 ? 'Resume preview' : 'Play preview'}
              >
                <Icon name="play" size={30} />
              </button>
            )}
          </div>
          <div className="pdp-player-bar">
            <button
              ref={barBtnRef}
              type="button"
              className="pdp-player-btn"
              onClick={toggle}
              aria-label={playing ? 'Pause preview' : 'Play preview'}
            >
              {playing ? (
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
                  <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
                </svg>
              ) : (
                <Icon name="play" size={16} />
              )}
            </button>
            <span className="pdp-player-time mono tabular">
              {fmt(t)} <span className="muted">/ {fmt(CLIP_SECONDS)}</span>
            </span>
            <span
              className="pdp-player-track"
              role="progressbar"
              aria-label="Playback progress"
              aria-valuemin={0}
              aria-valuemax={CLIP_SECONDS}
              aria-valuenow={Math.round(t)}
              aria-valuetext={`${fmt(t)} of ${fmt(CLIP_SECONDS)}`}
            >
              <span className="pdp-player-fill" style={{ width: `${pct}%` }} />
              <span className="pdp-player-knob" style={{ left: `${pct}%` }} />
            </span>
            <span className="pdp-player-icons" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
              </svg>
              <Icon name="settings" size={16} />
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
            </span>
          </div>
        </div>

        <p id={descId} className="pdp-modal-note small">
          <Icon name="info" size={15} />
          <span>
            Captured on a fresh test account with the stream-proof overlay on: OBS and Discord only see the clean game. The full
            menu tour lives in your dashboard after purchase.
          </span>
        </p>
      </div>
    </div>,
    document.body,
  );
}
