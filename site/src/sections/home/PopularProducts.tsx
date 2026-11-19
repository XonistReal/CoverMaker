import { Icon } from '../../components/Icon';
import { ProductCard } from '../../components/ProductCard';
import { Reveal, SectionHeader } from '../../components/ui';
import { PRODUCTS } from '../../data/catalog';
import { Link } from '../../router';
import { ScrollerArrows, useScrollerNav } from './ScrollerNav';

const POPULAR = PRODUCTS.filter((p) => p.popular);

export function PopularProducts() {
  const { ref, atStart, atEnd, page } = useScrollerNav<HTMLDivElement>();
  return (
    <section className="section home-sec home-pop" aria-labelledby="home-pop-title">
      <div className="container">
        <Reveal>
          <SectionHeader
            eyebrow="Best sellers"
            title={
              <span id="home-pop-title">
                Popular <span className="grad-text">products</span>
              </span>
            }
            lead="The tools our players pick most, each one live-tested this week."
            action={
              <>
                <Link to="/store" className="btn btn-ghost btn-sm">
                  Browse all <Icon name="arrow-right" />
                </Link>
                <ScrollerArrows label="products" atStart={atStart} atEnd={atEnd} onPage={page} />
              </>
            }
          />
        </Reveal>
        <Reveal delay={80}>
          <div className="scroller home-pop-row" ref={ref} role="list" aria-label="Popular products">
            {POPULAR.map((p) => (
              <div role="listitem" key={p.slug} className="home-pop-item">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
