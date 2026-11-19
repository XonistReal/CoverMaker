import { useLayoutEffect } from 'react';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { SupportWidget } from './components/SupportWidget';
import { Toasts } from './components/Toasts';
import { CheckoutPage } from './pages/Checkout';
import { DashboardPage } from './pages/Dashboard';
import { HomePage } from './pages/Home';
import { LegalPage } from './pages/Legal';
import { NotFoundPage } from './pages/NotFound';
import { ProductPage } from './pages/Product';
import { ReviewsPage } from './pages/Reviews';
import { StatusPage } from './pages/Status';
import { StorePage } from './pages/Store';
import { SupportPage } from './pages/Support';
import { useRoute, type Route } from './router';
import { StoreProvider } from './state/store';
import { BRAND } from './config';

const TITLES: Record<string, string> = {
  store: 'Store',
  status: 'Live status',
  reviews: 'Reviews',
  support: 'Support',
  checkout: 'Checkout',
  dashboard: 'Dashboard',
  legal: 'Legal',
};

function Page({ route }: { route: Route }) {
  const [a, b] = route.parts;
  switch (a) {
    case undefined:
      return <HomePage />;
    case 'store':
      return <StorePage gameSlug={b} query={route.query} />;
    case 'product':
      return b ? <ProductPage slug={b} /> : <NotFoundPage />;
    case 'status':
      return <StatusPage />;
    case 'reviews':
      return <ReviewsPage />;
    case 'support':
      return <SupportPage />;
    case 'checkout':
      return <CheckoutPage />;
    case 'dashboard':
      return <DashboardPage />;
    case 'legal':
      return <LegalPage doc={b ?? 'terms'} />;
    default:
      return <NotFoundPage />;
  }
}

export function App() {
  const route = useRoute();

  // Scroll to top on page change (not on query-only changes). Runs as a layout
  // effect so it lands before pages' own useEffect, letting them refine the title.
  const pageKey = route.parts.join('/');
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    const t = TITLES[route.parts[0] ?? ''];
    document.title = t ? `${t} · ${BRAND.name}` : `${BRAND.name}: premium game tools with live status`;
  }, [pageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <StoreProvider>
      <Navbar />
      <main id="main" key={pageKey} className="route-fade">
        <Page route={route} />
      </main>
      <Footer />
      <CartDrawer />
      <AuthModal />
      <SupportWidget />
      <Toasts />
    </StoreProvider>
  );
}
