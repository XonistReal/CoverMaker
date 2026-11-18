import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/**
 * Tiny hash router. URLs look like `#/store?q=rust` or `#/product/fortnite-umbra`.
 * Hash routing keeps the built single-file `index.html` working from any host or from disk.
 */

export interface Route {
  /** Path segments, e.g. ['product', 'fortnite-umbra']. Empty array = home. */
  parts: string[];
  path: string;
  query: URLSearchParams;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = '/' + pathPart.split('/').filter(Boolean).join('/');
  return { parts: path.split('/').filter(Boolean), path, query: new URLSearchParams(queryPart) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Navigate to `#/path?query`. Accepts '/store', '#/store' or 'store'. */
export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const clean = to.replace(/^#/, '');
  const hash = '#' + (clean.startsWith('/') ? clean : '/' + clean);
  if (opts.replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

/** Build an href for a path: href('/product/x') -> '#/product/x'. */
export const href = (path: string) => '#' + (path.startsWith('/') ? path : '/' + path);

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

/** Anchor that routes via the hash. Works with middle-click / new tab since href is real. */
export function Link({ to, onClick, ...rest }: LinkProps) {
  const target = href(to.replace(/^#/, ''));
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
  };
  return <a href={target} onClick={handle} {...rest} />;
}

/** True when the current path is `path` or nested under it. */
export function isActive(route: Route, path: string) {
  const p = path.replace(/^#/, '');
  if (p === '/') return route.path === '/';
  return route.path === p || route.path.startsWith(p + '/');
}
