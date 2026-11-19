import { Icon } from '../../components/Icon';
import { Reveal } from '../../components/ui';
import { BRAND } from '../../config';
import { Link } from '../../router';

const external = /^https?:/i.test(BRAND.discordUrl);

export function FinalCta() {
  return (
    <section className="section home-sec home-cta" aria-labelledby="home-cta-title">
      <div className="container">
        <Reveal className="home-cta-panel">
          <div className="home-cta-bg" aria-hidden="true">
            <div className="bg-grid home-cta-grid" />
            <div className="home-cta-ring home-cta-ring-a" />
            <div className="home-cta-ring home-cta-ring-b" />
            <div className="home-cta-beam" />
          </div>

          <div className="home-cta-content">
            <span className="pill home-cta-pill">
              <span className="dot ok pulse" aria-hidden="true" />
              Keys deliver instantly, 24/7
            </span>
            <h2 id="home-cta-title" className="display home-cta-title">
              Your next match
              <br />
              <span className="grad-text">starts in minutes.</span>
            </h2>
            <p className="lead home-cta-lead">
              Pick a game, check its live status and be in-game before the lobby fills. Join the Discord for patch alerts
              and giveaways.
            </p>
            <div className="home-cta-actions">
              <Link to="/store" className="btn btn-primary btn-lg">
                Browse the store
                <span className="chip-arrow">
                  <Icon name="arrow-right" />
                </span>
              </Link>
              <a
                href={BRAND.discordUrl}
                className="btn btn-ghost btn-lg"
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <Icon name="discord" />
                Join our Discord
              </a>
            </div>
            <ul className="home-cta-trust">
              <li>
                <Icon name="zap" size={15} /> Instant delivery
              </li>
              <li>
                <Icon name="clock" size={15} /> Keys pause during updates
              </li>
              <li>
                <Icon name="headset" size={15} /> 24/7 human support
              </li>
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
