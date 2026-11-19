import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '../../components/Icon';
import { Avatar, EmptyState, Stars } from '../../components/ui';
import { CHANGELOG, formatDate, reviewsForProduct, timeAgo } from '../../data/catalog';
import type { ChangelogEntry, Game, Product, Review } from '../../data/types';
import { Link } from '../../router';
import { useUI } from '../../state/store';
import { EXTRA_REVIEWS } from '../reviews-data';
import { ratingDistribution, setupSteps } from './setup';

export type TabId = 'features' | 'requirements' | 'setup' | 'reviews' | 'changelog';

export function ProductTabs({
  product,
  game,
  tab,
  onTab,
}: {
  product: Product;
  game: Game;
  tab: TabId;
  onTab: (t: TabId) => void;
}) {
  const base = useId();
  // Same review set as #/reviews (catalog reviews plus the older ones behind its "Load more"), newest first.
  const reviews = [...reviewsForProduct(product.slug), ...EXTRA_REVIEWS.filter((r) => r.productSlug === product.slug)].sort(
    (a, b) => b.date.localeCompare(a.date),
  );
  const changes = CHANGELOG.filter((c) => c.productSlug === product.slug);
  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'features', label: 'Features', count: product.features.reduce((n, g) => n + g.items.length, 0) },
    { id: 'requirements', label: 'Requirements' },
    { id: 'setup', label: 'Setup' },
    { id: 'reviews', label: 'Reviews', count: product.reviews },
    { id: 'changelog', label: 'Changelog', count: changes.length || undefined },
  ];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = tabs.findIndex((t) => t.id === tab);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const map: Record<string, number> = { ArrowRight: idx + 1, ArrowLeft: idx - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const n = (map[e.key] + tabs.length) % tabs.length;
    onTab(tabs[n].id);
    refs.current[n]?.focus();
  };

  return (
    <section className="pdp-tabs" id="pdp-details" aria-label="Product details">
      <div className="pdp-tablist-wrap">
        <div className="pdp-tablist" role="tablist" aria-label="Product details">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={`${base}-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={t.id === tab}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={t.id === tab ? 0 : -1}
              className="pdp-tab"
              onClick={() => onTab(t.id)}
              onKeyDown={onKey}
            >
              {t.label}
              {t.count !== undefined && <span className="pdp-tab-count mono">{t.count.toLocaleString('en-US')}</span>}
            </button>
          ))}
        </div>
      </div>
      <div
        key={tab}
        className="pdp-panel"
        role="tabpanel"
        id={`${base}-panel-${tab}`}
        aria-labelledby={`${base}-tab-${tab}`}
        tabIndex={0}
      >
        {tab === 'features' && <FeaturesPanel product={product} />}
        {tab === 'requirements' && <RequirementsPanel product={product} />}
        {tab === 'setup' && <SetupPanel product={product} game={game} />}
        {tab === 'reviews' && <ReviewsPanel product={product} reviews={reviews} />}
        {tab === 'changelog' && <ChangelogPanel product={product} changes={changes} />}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Features                                                            */
/* ------------------------------------------------------------------ */

function FeaturesPanel({ product }: { product: Product }) {
  const total = product.features.reduce((n, g) => n + g.items.length, 0);
  return (
    <div className="stack gap-24">
      <div className="pdp-overview">
        <div className="stack gap-12">
          <h2 className="h3">What you get with {product.name}</h2>
          <p className="text-2">{product.description}</p>
        </div>
        <dl className="pdp-facts">
          <div>
            <dt>Features</dt>
            <dd className="tabular">
              {total} in {product.features.length} groups
            </dd>
          </div>
          <div>
            <dt>Last build</dt>
            <dd>{timeAgo(product.updatedAt)}</dd>
          </div>
          <div>
            <dt>Stream-proof</dt>
            <dd>{product.requirements.streamProof ? 'Yes' : 'Not needed'}</dd>
          </div>
          <div>
            <dt>Controller</dt>
            <dd>{product.requirements.controller ? 'Supported' : 'M&K only'}</dd>
          </div>
        </dl>
      </div>
      <div className="pdp-feature-grid">
        {product.features.map((g) => (
          <article key={g.group} className="pdp-feature card">
            <header className="pdp-feature-head">
              <span className="icon-tile is-accent">
                <Icon name={g.icon} />
              </span>
              <div>
                <h3 className="h4">{g.group}</h3>
                <span className="tiny muted mono">{g.items.length} features</span>
              </div>
            </header>
            <ul className="pdp-checks">
              {g.items.map((it) => (
                <li key={it}>
                  <Icon name="check" size={14} />
                  {it}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Requirements                                                        */
/* ------------------------------------------------------------------ */

function Bool({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span className={`pdp-bool ${ok ? 'is-yes' : 'is-no'}`}>
      <Icon name={ok ? 'check' : 'x'} size={13} />
      {ok ? yes : no}
    </span>
  );
}

function RequirementsPanel({ product }: { product: Product }) {
  const { setChatOpen } = useUI();
  const r = product.requirements;
  const rows: { k: string; icon: string; v: ReactNode }[] = [
    { k: 'Operating system', icon: 'monitor', v: r.os },
    { k: 'CPU', icon: 'cpu', v: r.cpu },
    { k: 'Window mode', icon: 'grid', v: r.mode === 'Any' ? 'Any (fullscreen, borderless, windowed)' : r.mode },
    { k: 'Stream-proof', icon: 'eye-off', v: <Bool ok={r.streamProof} yes="Hidden from OBS & Discord" no="Not applicable" /> },
    { k: 'Controller support', icon: 'gamepad', v: <Bool ok={r.controller} yes="Supported" no="Mouse & keyboard only" /> },
    {
      k: 'HWID spoofer',
      icon: 'shield',
      v: (
        <span className={`pdp-bool ${r.spoofer === 'Recommended' ? 'is-warn' : 'is-yes'}`}>
          <Icon name={r.spoofer === 'Recommended' ? 'info' : 'check'} size={13} />
          {product.kind === 'spoofer' ? 'Not needed: this is the spoofer' : r.spoofer}
        </span>
      ),
    },
  ];
  return (
    <div className="pdp-req">
      <div className="card pdp-req-table">
        <table className="table">
          <caption className="sr-only">System requirements for {product.name}</caption>
          <tbody>
            {rows.map((row) => (
              <tr key={row.k}>
                <th scope="row">
                  <span className="row gap-12">
                    <Icon name={row.icon} size={16} />
                    {row.k}
                  </span>
                </th>
                <td>{row.v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <aside className="card card-pad pdp-req-aside">
        <span className="icon-tile">
          <Icon name="wrench" />
        </span>
        <h3 className="h4">Not sure your PC qualifies?</h3>
        <p className="small muted">
          Send us your specs and we'll confirm compatibility before you pay. If it won't run and we can't fix it, you get a refund
          or store credit.
        </p>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => setChatOpen(true)}>
          <Icon name="message" /> Ask support
        </button>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

function SetupPanel({ product, game }: { product: Product; game: Game }) {
  const { setChatOpen } = useUI();
  const steps = setupSteps(product, game.name);
  return (
    <div className="pdp-setup">
      <ol className="pdp-steps">
        {steps.map((s, i) => (
          <li key={s.title} className="pdp-step">
            <span className="pdp-step-num mono">{String(i + 1).padStart(2, '0')}</span>
            <div className="pdp-step-body">
              <h3 className="h4">
                <Icon name={s.icon} size={16} />
                {s.title}
              </h3>
              <p className="small text-2">{s.body}</p>
              {s.hint && <kbd className="pdp-kbd">{s.hint}</kbd>}
            </div>
          </li>
        ))}
      </ol>
      <aside className="pdp-help card">
        <span className="pdp-help-glow" aria-hidden="true" />
        <span className="icon-tile is-accent">
          <Icon name="headset" />
        </span>
        <h3 className="h3">Need help? Add 1-on-1 setup</h3>
        <p className="small text-2">
          A setup specialist connects over remote desktop, configures {product.name} with you and runs a test match. Most sessions
          take under 15 minutes.
        </p>
        <ul className="pdp-help-list small">
          <li>
            <Icon name="check" size={14} /> Windows settings done for you
          </li>
          <li>
            <Icon name="check" size={14} /> Tuned legit config to start from
          </li>
          <li>
            <Icon name="check" size={14} /> Available 24/7, no appointment
          </li>
        </ul>
        <button type="button" className="btn btn-primary btn-block" onClick={() => setChatOpen(true)}>
          <Icon name="message" /> Chat with a specialist
        </button>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

function ReviewsPanel({ product, reviews }: { product: Product; reviews: Review[] }) {
  const dist = ratingDistribution(product.rating);
  return (
    <div className="pdp-reviews">
      <aside className="card card-pad pdp-rev-summary">
        <span className="pdp-rev-score">{product.rating.toFixed(1)}</span>
        <Stars value={product.rating} size={18} />
        <span className="small muted">Based on {product.reviews.toLocaleString('en-US')} verified ratings</span>
        <ul className="pdp-rev-bars">
          {dist.map((p, i) => (
            <li key={i}>
              <span className="mono tiny">{5 - i}</span>
              <Icon name="star-fill" size={11} />
              <span className="pdp-rev-track" aria-hidden="true">
                <span style={{ width: `${p}%` }} />
              </span>
              <span className="mono tiny muted pdp-rev-pct">{p}%</span>
            </li>
          ))}
        </ul>
        <Link to="/reviews" className="btn btn-ghost btn-block">
          Read all store reviews <Icon name="arrow-right" />
        </Link>
      </aside>
      <div className="pdp-rev-list">
        {reviews.length ? (
          reviews.map((r) => (
            <article key={r.id} className="card pdp-rev">
              <header className="pdp-rev-head">
                <Avatar name={r.author} size={38} />
                <div className="grow">
                  <strong>{r.author}</strong>
                  <span className="tiny muted">
                    {r.verified && (
                      <span className="pdp-verified">
                        <Icon name="check-circle" size={12} /> Verified buyer
                      </span>
                    )}
                    {r.verified && ' · '}
                    {timeAgo(r.date + 'T12:00:00Z')}
                  </span>
                </div>
                <span className="pill">{r.plan}</span>
              </header>
              <Stars value={r.rating} size={14} />
              <p className="text-2">{r.text}</p>
            </article>
          ))
        ) : (
          <div className="card pdp-rev-empty">
            <EmptyState
              icon="message"
              title="No written reviews yet"
              body={`${product.name} has ${product.reviews.toLocaleString('en-US')} star ratings but nobody has written one up yet. Grab a key and be the first: reviews open once your key activates.`}
              action={
                <Link to="/reviews" className="btn btn-ghost btn-sm">
                  Read store reviews <Icon name="arrow-right" />
                </Link>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Changelog                                                           */
/* ------------------------------------------------------------------ */

const KIND_BADGE: Record<ChangelogEntry['kind'], { cls: string; label: string; icon: string }> = {
  update: { cls: 'badge-accent', label: 'Update', icon: 'refresh' },
  status: { cls: 'badge-warn', label: 'Status', icon: 'activity' },
  feature: { cls: 'badge-violet', label: 'Feature', icon: 'sparkles' },
  fix: { cls: 'badge-ok', label: 'Fix', icon: 'wrench' },
};

function ChangelogPanel({ product, changes }: { product: Product; changes: ChangelogEntry[] }) {
  if (!changes.length)
    return (
      <div className="card">
        <EmptyState
          icon="check-circle"
          title="No changes in the last 30 days"
          body={`${product.name} has been stable. Last verified ${timeAgo(product.updatedAt)}; the live status page shows every update the moment it happens.`}
          action={
            <Link to="/status" className="btn btn-ghost btn-sm">
              <Icon name="activity" /> Live status
            </Link>
          }
        />
      </div>
    );
  return (
    <ol className="pdp-log">
      {changes.map((c) => {
        const b = KIND_BADGE[c.kind];
        return (
          <li key={c.date + c.text} className="pdp-log-item">
            <span className="pdp-log-dot" aria-hidden="true">
              <Icon name={b.icon} size={14} />
            </span>
            <div className="pdp-log-card card">
              <div className="row gap-8 wrap">
                <span className={`badge ${b.cls}`}>{b.label}</span>
                <time className="tiny muted mono" dateTime={c.date}>
                  {formatDate(c.date)} · {timeAgo(c.date)}
                </time>
              </div>
              <p>{c.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
