import { GameArt } from '../../components/GameArt';
import { Icon } from '../../components/Icon';
import { Avatar, Reveal, Stars } from '../../components/ui';
import { BRAND } from '../../config';
import { REVIEWS, getGame, getProduct, timeAgo } from '../../data/catalog';
import type { Review } from '../../data/types';
import { Link } from '../../router';
import { ScrollerArrows, useScrollerNav } from './ScrollerNav';

const ROW = REVIEWS.slice(0, 10);

function ReviewCard({ review }: { review: Review }) {
  const product = getProduct(review.productSlug);
  const game = product ? getGame(product.gameSlug) : undefined;
  return (
    <article className="card home-rev-card">
      <div className="home-rev-top">
        <Stars value={review.rating} size={14} />
        {product && (
          <Link to={`/product/${product.slug}`} className="home-rev-product">
            {game && (
              <span className="home-rev-product-tile">
                <GameArt game={game} variant="tile" />
              </span>
            )}
            <span className="home-rev-product-name">
              {product.name} · {review.plan}
            </span>
          </Link>
        )}
      </div>
      <Icon name="quote" size={22} className="home-rev-quote" />
      <p className="home-rev-text">{review.text}</p>
      <div className="home-rev-foot">
        <Avatar name={review.author} size={34} />
        <span className="home-rev-who">
          <strong>{review.author}</strong>
          <span className="tiny muted">{timeAgo(review.date + 'T12:00:00Z')}</span>
        </span>
        {review.verified && (
          <span className="home-rev-verified">
            <Icon name="check-circle" size={14} />
            Verified buyer
          </span>
        )}
      </div>
    </article>
  );
}

export function ReviewsRow() {
  const { ref, atStart, atEnd, page } = useScrollerNav<HTMLDivElement>();
  return (
    <section className="section home-sec home-rev" aria-labelledby="home-rev-title">
      <div className="container">
        <Reveal>
          <div className="section-head home-rev-head">
            <div className="titles">
              <span className="eyebrow">Reviews</span>
              <h2 id="home-rev-title" className="h2">
                Players <span className="grad-text">don’t hold back.</span>
              </h2>
              <p className="lead">Real feedback from verified buyers, unedited.</p>
            </div>
            <div className="home-rev-summary">
              <div className="home-rev-score">
                <span className="home-rev-big tabular">{BRAND.rating.toFixed(1)}</span>
                <span className="stack gap-4">
                  <Stars value={BRAND.rating} size={15} />
                  <span className="tiny muted">Based on {BRAND.reviewCount.toLocaleString('en-US')} ratings</span>
                </span>
              </div>
              <div className="row gap-8">
                <Link to="/reviews" className="btn btn-ghost btn-sm">
                  See all reviews <Icon name="arrow-right" />
                </Link>
                <ScrollerArrows label="reviews" atStart={atStart} atEnd={atEnd} onPage={page} />
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="scroller home-rev-row" ref={ref} role="list" aria-label="Customer reviews">
            {ROW.map((r) => (
              <div role="listitem" key={r.id} className="home-rev-item">
                <ReviewCard review={r} />
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
