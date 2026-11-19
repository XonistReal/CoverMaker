import { Icon } from '../../components/Icon';
import { Stars } from '../../components/ui';
import { BRAND } from '../../config';
import { STATS } from '../../data/catalog';
import { Link } from '../../router';
import { HeroBackdrop } from './HeroBackdrop';
import { HeroSearch } from './HeroSearch';
import { StatsStrip } from './StatsStrip';

export function Hero() {
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <HeroBackdrop />

      <div className="container home-hero-inner">
        <Link to="/reviews" className="home-hero-rating anim-fade-up">
          <Stars value={BRAND.rating} size={13} />
          <strong className="tabular">{BRAND.rating.toFixed(1)}</strong>
          <span className="home-hero-rating-sep" aria-hidden="true" />
          <span>{BRAND.reviewCount.toLocaleString('en-US')} verified reviews</span>
        </Link>

        <h1 id="home-hero-title" className="display home-hero-title">
          <span className="home-hero-line anim-fade-up" style={{ ['--delay' as string]: '80ms' }}>
            Play sharper.
          </span>
          <span className="home-hero-line grad-text anim-fade-up" style={{ ['--delay' as string]: '160ms' }}>
            Stay unseen.
          </span>
        </h1>

        <p className="lead home-hero-lead anim-fade-up" style={{ ['--delay' as string]: '240ms' }}>
          In-house tools for {STATS.games} games. Tested on fresh accounts before every release, delivered the second
          you pay, pulled the minute a patch lands.
        </p>

        <div className="home-hero-search anim-fade-up" style={{ ['--delay' as string]: '320ms' }}>
          <HeroSearch />
        </div>

        <Link to="/status" className="home-hero-status anim-fade-up" style={{ ['--delay' as string]: '400ms' }}>
          <span className="dot ok pulse" aria-hidden="true" />
          <span>
            <strong className="tabular">
              {STATS.undetected} of {STATS.products}
            </strong>{' '}
            products undetected right now
          </span>
          <Icon name="chevron-right" size={15} />
        </Link>
      </div>

      <div className="container home-hero-stats anim-fade-up" style={{ ['--delay' as string]: '480ms' }}>
        <StatsStrip />
      </div>
    </section>
  );
}
