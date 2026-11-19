import { useEffect, useState } from 'react';
import { BRAND } from '../config';
import { PRODUCTS } from '../data/catalog';
import { Icon } from '../components/Icon';
import { ProductCard } from '../components/ProductCard';
import { Link, useRoute } from '../router';
import './notfound.css';

/* =====================================================================
   404: any unknown route. A glitching "4 [reticle] 4" in a viewfinder,
   a way back, and the four most popular live products.
   ===================================================================== */

const POPULAR = PRODUCTS.filter((p) => p.popular && p.status === 'undetected')
  .sort((a, b) => b.sold - a.sold)
  .slice(0, 4);

const QUICK_LINKS = [
  { label: 'Live status', to: '/status', icon: 'activity' },
  { label: 'Support', to: '/support', icon: 'headset' },
  { label: 'Reviews', to: '/reviews', icon: 'star' },
  { label: 'Dashboard', to: '/dashboard', icon: 'grid' },
];

function Reticle() {
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg className="nf-reticle" viewBox="0 0 200 200" aria-hidden="true">
      <circle className="nf-ret-halo" cx="100" cy="100" r="92" />
      <g className="nf-ret-spin">
        <circle className="nf-ret-dash" cx="100" cy="100" r="84" />
        {ticks.map((a) => (
          <line
            key={a}
            className={a % 90 === 0 ? 'nf-ret-tick is-major' : 'nf-ret-tick'}
            x1="100"
            y1={a % 90 === 0 ? 4 : 10}
            x2="100"
            y2="18"
            transform={`rotate(${a} 100 100)`}
          />
        ))}
      </g>
      <circle className="nf-ret-ring" cx="100" cy="100" r="58" />
      <g className="nf-ret-cross">
        <line x1="100" y1="30" x2="100" y2="78" />
        <line x1="100" y1="122" x2="100" y2="170" />
        <line x1="30" y1="100" x2="78" y2="100" />
        <line x1="122" y1="100" x2="170" y2="100" />
      </g>
      <circle className="nf-ret-dot" cx="100" cy="100" r="5" />
      <circle className="nf-ret-ping" cx="100" cy="100" r="5" />
    </svg>
  );
}

export function NotFoundPage() {
  const route = useRoute();
  const requested = `#${route.path}${route.query.toString() ? `?${route.query.toString()}` : ''}`;
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
    document.title = `Page not found · ${BRAND.name}`;
  }, []);

  return (
    <div className="page nf">
      <div className="nf-bg" aria-hidden="true">
        <div className="bg-grid" />
        <div className="glow-blob nf-glow-a" />
        <div className="glow-blob nf-glow-b" />
      </div>

      <div className="container">
        <section className="nf-hero" aria-labelledby="nf-title">
          <div className="nf-frame anim-fade-up">
            <span className="nf-corner is-tl" aria-hidden="true" />
            <span className="nf-corner is-tr" aria-hidden="true" />
            <span className="nf-corner is-bl" aria-hidden="true" />
            <span className="nf-corner is-br" aria-hidden="true" />
            <span className="nf-hud nf-hud-tl" aria-hidden="true">
              <span className="nf-rec" />
              Signal lost
            </span>
            <span className="nf-hud nf-hud-tr" aria-hidden="true">
              ERR · 0x194
            </span>
            <span className="nf-hud nf-hud-bl" aria-hidden="true">
              X 404.00 · Y 000.00
            </span>
            <span className="nf-hud nf-hud-br" aria-hidden="true">
              Ping ∞ ms
            </span>

            <div className="nf-code" role="img" aria-label="Error 404">
              <span className="nf-digit" data-text="4">
                4
              </span>
              <Reticle />
              <span className="nf-digit" data-text="4">
                4
              </span>
              <span className="nf-scan" aria-hidden="true" />
            </div>
          </div>

          <div className="nf-copy anim-fade-up" style={{ ['--delay' as string]: '120ms' }}>
            <span className="eyebrow">Error 404 · Lobby not found</span>
            <h1 className="h1 nf-title" id="nf-title">
              This lobby <span className="accent">doesn’t exist.</span>
            </h1>
            <p className="lead nf-lead">
              The page you were looking for was moved, renamed or never spawned in. Respawn somewhere useful.
            </p>

            <div className="nf-path" title={requested}>
              <span className="nf-path-label">Requested</span>
              <code className="nf-path-value">{requested}</code>
              <span className="nf-path-status">404</span>
            </div>

            <div className="nf-actions">
              <Link to="/" className="btn btn-primary btn-lg">
                <Icon name="home" />
                Back to home
              </Link>
              <Link to="/store" className="btn btn-ghost btn-lg">
                <Icon name="store" />
                Browse the store
              </Link>
              {canGoBack && (
                <button type="button" className="btn btn-quiet btn-lg nf-back" onClick={() => window.history.back()}>
                  <Icon name="arrow-left" />
                  Go back
                </button>
              )}
            </div>

            <nav className="nf-quick" aria-label="Popular pages">
              <span className="nf-quick-label">Or jump to</span>
              {QUICK_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className="nf-quick-link">
                  <Icon name={l.icon} size={14} />
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <section className="nf-popular" aria-labelledby="nf-popular-title">
          <div className="nf-popular-head">
            <div className="stack gap-12">
              <span className="eyebrow">Popular right now</span>
              <h2 className="h2" id="nf-popular-title">
                Drop back in
                <span className="accent"> with a favourite.</span>
              </h2>
            </div>
            <Link to="/store" className="btn btn-ghost btn-sm nf-popular-all">
              View all products
              <Icon name="arrow-right" />
            </Link>
          </div>
          <div className="nf-grid">
            {POPULAR.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
