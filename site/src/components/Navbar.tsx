import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { BRAND, NAV_LINKS } from '../config';
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

  const burgerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the mobile sheet on navigation.
  useEffect(() => setMenuOpen(false), [route.path]);

  // While the sheet is open it behaves like a modal: page scroll is locked,
  // focus moves in and is trapped (burger + sheet), Esc closes it, and it
  // closes itself if the viewport grows past the mobile breakpoint.
  useEffect(() => {
    if (!menuOpen) return;
    const root = document.documentElement;
    root.style.overflow = 'hidden';
    const focusables = () => [
      burgerRef.current,
      ...Array.from(menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []),
    ].filter((el): el is HTMLElement => !!el);
    menuRef.current?.querySelector<HTMLElement>('a[href]')?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        burgerRef.current?.focus();
      } else if (e.key === 'Tab') {
        const els = focusables();
        const i = els.indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : i === -1 || i === els.length - 1 ? 0 : i + 1;
        e.preventDefault();
        els[next]?.focus();
      }
    };
    const mq = window.matchMedia('(min-width: 861px)');
    const onMq = () => mq.matches && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onMq);
    return () => {
      root.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onMq);
    };
  }, [menuOpen]);

  // Any link in the sheet closes it, including one to the current page.
  const closeOnLink = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('a')) setMenuOpen(false);
  };

  const isHome = route.path === '/';

  return (
    <>
      <header className={`nav${scrolled || menuOpen ? ' is-scrolled' : ''}${isHome ? '' : ' is-solid'}`}>
        <div className="container nav-inner">
          <Link to="/" aria-label={`${BRAND.name} home`} onClick={() => setMenuOpen(false)}>
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
              ref={burgerRef}
              className="btn btn-ghost btn-icon nav-burger"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <Icon name={menuOpen ? 'x' : 'menu'} size={20} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div id="mobile-menu" ref={menuRef} className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" onClick={closeOnLink}>
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
