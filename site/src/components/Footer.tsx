import { BRAND } from '../config';
import { GAMES, STATS } from '../data/catalog';
import { Link } from '../router';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { Stars } from './ui';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo />
            <p>{BRAND.blurb}</p>
            <div className="row gap-12" style={{ marginTop: 20 }}>
              <Stars value={BRAND.rating} />
              <span className="small text-2">
                <strong style={{ color: 'var(--text)' }}>{BRAND.rating}</strong> · {BRAND.reviewCount.toLocaleString('en-US')} reviews
              </span>
            </div>
            <div className="row gap-8" style={{ marginTop: 14 }}>
              <span className="dot ok pulse" />
              <Link to="/status" className="small text-2">
                {STATS.undetected} of {STATS.products} products undetected
              </Link>
            </div>
          </div>

          <div className="footer-col">
            <h2>Games</h2>
            <ul>
              {GAMES.slice(0, 7).map((g) => (
                <li key={g.slug}>
                  <Link to={`/store/${g.slug}`}>{g.name}</Link>
                </li>
              ))}
              <li>
                <Link to="/store" className="accent">
                  All {STATS.games} games →
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h2>Store</h2>
            <ul>
              <li><Link to="/store">Browse products</Link></li>
              <li><Link to="/store/hwid-spoofer">HWID spoofers</Link></li>
              <li><Link to="/status">Live status</Link></li>
              <li><Link to="/reviews">Reviews</Link></li>
              <li><Link to="/checkout">Checkout</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h2>Account</h2>
            <ul>
              <li><Link to="/dashboard">Dashboard</Link></li>
              <li><Link to="/dashboard?tab=licenses">License keys</Link></li>
              <li><Link to="/dashboard?tab=orders">Orders</Link></li>
              <li><Link to="/support">Support</Link></li>
              <li><Link to="/support?faq=1">FAQ</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h2>Legal</h2>
            <ul>
              <li><Link to="/legal/terms">Terms of Service</Link></li>
              <li><Link to="/legal/privacy">Privacy Policy</Link></li>
              <li><Link to="/legal/refunds">Refund Policy</Link></li>
              <li><Link to="/legal/cookies">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date('2026-11-18').getFullYear()} {BRAND.name}. Not affiliated with any game publisher.
          </span>
          <div className="footer-pay" aria-label="Accepted payments">
            <span>VISA</span>
            <span>MC</span>
            <span>PAYPAL</span>
            <span>BTC</span>
            <span>ETH</span>
            <span>LTC</span>
          </div>
          <div className="footer-social">
            <a href={BRAND.discordUrl} aria-label="Discord"><Icon name="discord" size={17} /></a>
            <a href="#/" aria-label="YouTube"><Icon name="youtube" size={17} /></a>
            <a href="#/" aria-label="X"><Icon name="x-brand" size={15} /></a>
            <a href="#/" aria-label="TikTok"><Icon name="tiktok" size={16} /></a>
          </div>
        </div>
      </div>
      <div className="footer-word" aria-hidden="true">{BRAND.wordmark}</div>
    </footer>
  );
}
