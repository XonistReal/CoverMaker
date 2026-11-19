import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { ProductCard } from '../components/ProductCard';
import { Breadcrumbs, EmptyState, Reveal, SectionHeader } from '../components/ui';
import { BRAND } from '../config';
import { KIND_LABEL, PRODUCTS, getGame, getProduct } from '../data/catalog';
import type { Game, Product } from '../data/types';
import { Link, navigate } from '../router';
import { useCart, useUI } from '../state/store';
import { BuyBox, MobileBuyBar, type Purchase } from './product/BuyBox';
import { Media } from './product/Media';
import { ProductTabs, type TabId } from './product/Tabs';
import './product.css';

export function ProductPage({ slug }: { slug: string }) {
  const product = getProduct(slug);
  const game = product ? getGame(product.gameSlug) : undefined;
  const missing = !product || !game;

  // App's generic title would otherwise stay on this screen; ProductView sets the product title itself.
  useEffect(() => {
    if (missing) document.title = `Product not found · ${BRAND.name}`;
  }, [missing]);

  if (!product || !game) {
    return (
      <div className="page container">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Store', to: '/store' }, { label: 'Not found' }]} />
        <div className="pdp-missing card">
          <EmptyState
            as="h1"
            icon="search"
            title="We couldn't find that product"
            body="It may have been renamed or retired. Everything that's live right now is in the store."
            action={
              <Link to="/store" className="btn btn-primary">
                Back to store <Icon name="arrow-right" />
              </Link>
            }
          />
        </div>
        <section className="pdp-related">
          <SectionHeader
            eyebrow="Popular right now"
            title={
              <>
                Maybe you were <span className="accent">looking for</span>
              </>
            }
          />
          <div className="pdp-related-row">
            {PRODUCTS.filter((p) => p.popular && p.status === 'undetected')
              .slice(0, 4)
              .map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
          </div>
        </section>
      </div>
    );
  }
  return <ProductView product={product} game={game} />;
}

/** Cart caps every plan at 10 keys (see useCart().add). */
const MAX_PER_PLAN = 10;
const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

function usePurchase(product: Product): Purchase {
  const cart = useCart();
  const { toast, openCart } = useUI();
  const [planId, setPlanId] = useState(() => (product.plans.find((p) => p.days === 30) ?? product.plans[0]).id);
  const [qty, setQtyRaw] = useState(1);
  const plan = product.plans.find((p) => p.id === planId) ?? product.plans[0];
  const canBuy = product.status !== 'detected';
  const limitToast = (added: number) =>
    toast(
      added > 0
        ? {
            title: `Added ${added} (${MAX_PER_PLAN}-key limit per plan)`,
            body: `Your cart now holds the maximum ${MAX_PER_PLAN} × ${product.name} · ${plan.label}.`,
            tone: 'warn',
          }
        : {
            title: 'Limit reached',
            body: `Your cart already holds ${MAX_PER_PLAN} × ${product.name} · ${plan.label}, the most per plan.`,
            tone: 'warn',
          },
    );
  return {
    plan,
    setPlanId,
    qty,
    setQty: (n) => setQtyRaw(Math.max(1, Math.min(MAX_PER_PLAN, n))),
    canBuy,
    add: () => {
      if (!canBuy) return;
      const added = cart.add(product.slug, plan.id, qty);
      // The cart drawer is the confirmation; a toast on top would cover its Checkout button on phones.
      // Only when the per-plan cap trimmed the order do we skip the drawer and explain instead.
      if (added === qty) openCart();
      else limitToast(added);
    },
    buy: () => {
      if (!canBuy) return;
      const added = cart.add(product.slug, plan.id, qty);
      if (added < qty) limitToast(added);
      navigate('/checkout');
    },
  };
}

function ProductView({ product, game }: { product: Product; game: Game }) {
  const purchase = usePurchase(product);
  const [tab, setTab] = useState<TabId>('features');
  const actionsRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // App sets a generic route title in a layout effect; refine it with the product name.
  useEffect(() => {
    document.title = `${product.name} · ${BRAND.name}`;
  }, [product.name]);

  const related = useMemo(() => {
    const same = PRODUCTS.filter((p) => p.gameSlug === product.gameSlug && p.slug !== product.slug);
    const popular = PRODUCTS.filter((p) => p.popular && p.gameSlug !== product.gameSlug && p.status !== 'detected');
    return { same: same.length > 0, list: [...same, ...popular].slice(0, 4) };
  }, [product]);

  const highlights = product.features.flatMap((g) => g.items.slice(0, 2)).slice(0, 6);
  const r = product.requirements;
  const platform = r.os.replace(/ \(.*\)/, '');
  const specs =
    product.kind === 'spoofer'
      ? [
          { k: 'Type', v: KIND_LABEL[product.kind] },
          { k: 'Platform', v: platform },
          { k: 'Spoof mode', v: product.plans.some((p) => p.days === null) ? 'Permanent' : 'Temporary' },
          { k: 'Coverage', v: `${product.features.find((g) => g.group === 'Coverage')?.items.length ?? 6} anti-cheats` },
        ]
      : [
          { k: 'Type', v: KIND_LABEL[product.kind] },
          { k: 'Platform', v: platform },
          { k: 'Window mode', v: r.mode },
          { k: 'Spoofer', v: r.spoofer },
        ];

  const openTab = (t: TabId) => {
    setTab(t);
    tabsRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  };

  return (
    <div className="pdp" style={{ ['--pdp-h' as string]: game.hue, ['--pdp-h2' as string]: game.hue2 }}>
      <div className="pdp-glow" aria-hidden="true" />
      <div className="page container pdp-page">
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Store', to: '/store' },
            { label: game.name, to: `/store/${game.slug}` },
            { label: product.name },
          ]}
        />

        <div className="pdp-grid">
          <div className="pdp-col-left">
            <div className="pdp-col-media">
              <Media product={product} game={game} />
            </div>

            <div className="pdp-col-info">
              <dl className="pdp-specs">
                {specs.map((sp) => (
                  <div key={sp.k}>
                    <dt>{sp.k}</dt>
                    <dd>{sp.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="pdp-highlights">
                <span className="pdp-label">Highlights</span>
                <ul>
                  {highlights.map((h) => (
                    <li key={h}>
                      <span className="pdp-hl-check">
                        <Icon name="check" size={12} />
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
                <button type="button" className="pdp-hl-more" onClick={() => openTab('features')}>
                  See all features <Icon name="arrow-right" size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="pdp-col-buy">
            <BuyBox
              product={product}
              game={game}
              purchase={purchase}
              actionsRef={actionsRef}
              onReviews={() => openTab('reviews')}
            />
          </div>
        </div>

        <div ref={tabsRef} className="pdp-tabs-anchor">
          <ProductTabs product={product} game={game} tab={tab} onTab={setTab} />
        </div>

        {related.list.length > 0 && (
          <Reveal as="section" className="pdp-related">
            <SectionHeader
              eyebrow={related.same ? 'Same game' : 'Popular right now'}
              title={
                related.same ? (
                  <>
                    More for <span className="accent">{game.name}</span>
                  </>
                ) : (
                  <>
                    You might <span className="accent">also like</span>
                  </>
                )
              }
              lead={
                related.same
                  ? `Other ${game.name} tools, then what players are buying today.`
                  : 'Hand-picked best sellers that are green right now.'
              }
              action={
                <Link to="/store" className="btn btn-ghost btn-sm">
                  Browse store <Icon name="arrow-right" />
                </Link>
              }
            />
            <div className="pdp-related-row">
              {related.list.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </Reveal>
        )}
      </div>

      <MobileBuyBar product={product} game={game} purchase={purchase} watchRef={actionsRef} />
    </div>
  );
}
