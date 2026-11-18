import { useEffect, useState } from 'react';
import { NAV_LINKS } from '../config';
import { Link, isActive, useRoute } from '../router';
import { useAuth, useCart, useOnlineCount, useUI } from '../state/store';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { Avatar } from './ui';

export function Navbar() {
  const route = useRoute();
  const { count } = useCart();
  const { openCart, openAuth } = useUI();
  const { user } = useAuth();
  const online = useOnlineCount();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  // Close the mobile sheet on navigation.
  useEffect(() => setMenuOpen(false), [route.path]);

  const isHome = route.path === '/';

  return (
    <>
      <header className={`nav${scrolled || menuOpen ? ' is-scrolled' : ''}${isHome ? '' : ' is-solid'}`}>
        <div className="container nav-inner">
          <Link to="/" aria-label="Nyxor home">
            <Logo />
          </Link>

          <div className="nav-online" title="Players online now">
            <span className="dot ok pulse" />
            <span className="stack">
              <strong className="tabular">{online.toLocaleString('en-US')}</strong>
              <span>online</span>
            </span>
          </div>

          <nav className="nav-links" aria-label="Main">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} to={l.href} className={`nav-link${isActive(route, l.href.slice(1)) ? ' is-active' : ''}`}>
                <Icon name={l.icon} />
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="nav-right">
            <button className="btn btn-quiet btn-icon cart-btn" onClick={openCart} aria-label={`Open cart, ${count} items`}>
              <Icon name="cart" size={19} />
              {count > 0 && <span className="cart-count">{count}</span>}
            </button>

            {user ? (
              <Link to="/dashboard" className="nav-user nav-auth-desktop">
                <Avatar name={user.username} size={30} />
                {user.username}
              </Link>
            ) : (
              <span className="row gap-8 nav-auth-desktop">
                <button className="btn btn-quiet" onClick={() => openAuth('register')}>
                  Register
                </button>
                <button className="btn btn-white" onClick={() => openAuth('signin')}>
                  <Icon name="user" />
                  Sign in
                </button>
              </span>
            )}

            <button
              className="btn btn-ghost btn-icon nav-burger"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <Icon name={menuOpen ? 'x' : 'menu'} size={20} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-label="Menu">
          <Link to="/" className={`nav-link${isHome ? ' is-active' : ''}`}>
            <Icon name="home" />
            Home
          </Link>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} to={l.href} className={`nav-link${isActive(route, l.href.slice(1)) ? ' is-active' : ''}`}>
              <Icon name={l.icon} />
              {l.label}
            </Link>
          ))}
          <div className="row gap-8" style={{ marginTop: 20 }}>
            <span className="dot ok pulse" />
            <span className="small muted">
              <strong className="tabular" style={{ color: 'var(--text)' }}>
                {online.toLocaleString('en-US')}
              </strong>{' '}
              players online
            </span>
          </div>
          <div className="stack gap-8" style={{ marginTop: 20 }}>
            {user ? (
              <Link to="/dashboard" className="btn btn-white btn-lg btn-block">
                <Icon name="user" />
                My dashboard
              </Link>
            ) : (
              <>
                <button className="btn btn-white btn-lg btn-block" onClick={() => { setMenuOpen(false); openAuth('signin'); }}>
                  Sign in
                </button>
                <button className="btn btn-ghost btn-lg btn-block" onClick={() => { setMenuOpen(false); openAuth('register'); }}>
                  Create account
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
