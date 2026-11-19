# Junko storefront (front end)

Front end for **Junko** (junko.rip), a dark, premium game-tools storefront. Everything runs in the browser with mock data: there is no backend yet, so carts, accounts, orders, reviews and tickets are stored in `localStorage`, and checkout stops at "redirecting to the payment processor".

## Run it

```bash
cd site
npm install
npm run dev        # http://localhost:5180
```

```bash
npm run build      # typecheck + production build -> dist/index.html (one self-contained file)
npm run preview    # serve the build on http://localhost:5181
```

`dist/index.html` has all JS and CSS inlined and uses hash routing (`#/store`, `#/product/...`), so you can open it straight from disk or drop it on any static host.

## Pages

| Route | What it is |
| --- | --- |
| `#/` | Home: hero search, stats, game marquee, best sellers, interactive menu demo, why us, how it works, reviews, FAQ |
| `#/store`, `#/store/<game>`, `#/store?q=` | Catalogue with filters, sort and search; per-game pages |
| `#/product/<slug>` | Product page: plans, quantity, gallery, features, requirements, setup, reviews, changelog |
| `#/status` | Live status board with uptime history |
| `#/reviews` | Reviews with filters and a write-a-review form |
| `#/support` | Help centre, FAQ search, ticket form |
| `#/checkout` | Checkout (payment method picker only, no card fields) and order confirmation |
| `#/dashboard` | Orders, license keys, downloads, settings |
| `#/legal/<terms\|privacy\|refunds\|cookies>` | Legal documents |

Also: cart drawer, sign-in / register modal, support chat widget and toasts.

## Customising

- **Brand** (name, wordmark, domain, email, Discord link, rating, key prefix): `src/config.ts`
- **Accent colour**: `--accent-h` (hue) at the top of `src/styles/global.css`
- **Games, products, prices, reviews, FAQ, changelog**: `src/data/catalog.ts`
- **Coupons** (demo): `COUPONS` in `src/state/store.tsx` (`JUNKO10`, `NIGHT20`)

Design and code conventions for the project are in [`DESIGN.md`](./DESIGN.md).

## Hooking up a backend later

The mock layer is small on purpose:

- `src/data/catalog.ts`: replace the constants with API calls.
- `src/state/store.tsx`: cart, auth and UI state (`signIn` and coupons are the parts to swap).
- `src/pages/orders.ts`: order creation and license keys.
- `src/pages/Checkout.tsx`: `pay()` is where you would hand off to your payment processor.
