import { Component, type ErrorInfo, type ReactNode } from 'react';
import { BRAND } from '../config';

/**
 * Last-resort fallback so a crash never leaves a blank page. The usual cause
 * in a front-end-only build is stale data in localStorage, so the recovery
 * button clears this site's keys before reloading.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info.componentStack);
  }

  private reset = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(`${BRAND.storageKey}.`))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* storage blocked: a reload is still worth a try */
    }
    window.location.hash = '#/';
    window.location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="container-narrow" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="empty" role="alert">
          <h1 className="h3">Something went wrong</h1>
          <p className="small" style={{ maxWidth: 420 }}>
            {BRAND.name} hit an unexpected error. Resetting clears the cart and sign-in saved in this browser, then reloads
            the page.
          </p>
          <button className="btn btn-primary" onClick={this.reset}>
            Reset and reload
          </button>
        </div>
      </div>
    );
  }
}
