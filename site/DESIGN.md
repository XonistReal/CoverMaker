# Nyxor front-end: design & code contract

Front-end only. All data is mock data in `src/data/catalog.ts`; cart/auth live in `src/state/store.tsx` + localStorage. No backend calls.

## Stack
Vite + React 18 + TypeScript (strict, `noUnusedLocals`). Hash router in `src/router.tsx` (`useRoute`, `navigate`, `Link`, `href`). No other runtime deps: do **not** add npm packages.

## Brand
Name, wordmark, rating, etc. come from `src/config.ts` (`BRAND`). Never hard-code "Nyxor" in copy, use `BRAND.name`. Original brand: no third-party game logos, character art or screenshots. Game visuals come from `<GameArt game variant="poster|banner|tile" />`.

## Visual language
- Near-black surfaces (`--bg`, `--bg-2`, `--surface`, `--surface-2`, `--surface-3`), hairline borders (`--line`, `--line-2`, `--line-3`).
- One accent: ice cyan `--accent` (plus `--accent-soft`, `--accent-line`, `--accent-ink` for text on accent). Violet `--violet` only for soft glows / "hot" badges.
- Status colours: `--ok` (undetected), `--warn` (updating), `--info` (testing), `--bad` (detected), each with a `-soft` variant.
- Type: `--font-display` (Unbounded) for headings, `--font-body` (Inter), `--font-mono` (JetBrains Mono) for labels, keys, numbers in HUD-style UI.
- Headline pattern: first line white, second line accent (`.accent` or `.grad-text`).
- Radii: `--r-sm` 10, `--r` 14, `--r-lg` 20, `--r-xl` 28. Easing `--ease`.
- Generous spacing; sections use `.section` (big) or `.section-sm`. Pages use `.page` (adds nav offset) + `.container`.

## Existing global classes (src/styles/global.css)
Layout: `.container .container-narrow .section .section-sm .page .stack .row .wrap .gap-{4,8,12,16,24,32} .grow .center .sr-only`
Type: `.display .h1 .h2 .h3 .h4 .lead .muted .text-2 .small .tiny .mono .eyebrow .accent .dim .grad-text .tabular`
Buttons: `.btn` + `.btn-primary | .btn-white | .btn-ghost | .btn-quiet | .btn-danger`, sizes `.btn-sm .btn-lg`, `.btn-block`, `.btn-icon`; `<span class="chip-arrow">` inside a button for the dark arrow chip.
Surfaces: `.card .card-pad .card-hover .panel .divider .icon-tile(.is-accent)`
Badges: `.pill`, `.badge` + `.badge-accent|ok|warn|info|bad|violet|solid`, `.dot` + `.ok|.warn|.info|.bad` + `.pulse`
Forms: `.field .label .input .select .textarea .input-wrap(> svg + .input) .checkbox .switch[aria-checked] .segmented(button[aria-selected])`
Decor: `.bg-grid .bg-dots .glow-blob .hairline-top`, `.section-head(.is-center)`, `.scroller` (horizontal snap row), `.marquee > .marquee-track(.reverse)` (duplicate children for seamless loop, `--dur`), `.reveal` (use `<Reveal>`), `.shimmer`, `.anim-fade-up`, `.crumbs`, `.table`, `.empty`.

## Shared components (import, don't re-implement)
- `components/Icon.tsx`: `<Icon name="..." size? />`. Names: store activity star star-fill headset cart user users search arrow-right arrow-left arrow-up-right chevron-down/up/left/right check check-circle x plus minus shield shield-check zap clock gamepad box eye eye-off crosshair sliders cpu radar unlock lock key message mail menu filter refresh card bitcoin wallet copy download log-out settings trash tag flame sparkles info alert globe monitor play rocket quote external home grid list gift ticket send bolt layers thumbs-up calendar wrench discord youtube x-brand tiktok. If you need a glyph that isn't there, draw an inline `<svg>` in your own file.
- `components/ui.tsx`: `StatusBadge`, `StatusDot`, `Stars`, `SectionHeader`, `Reveal`, `Accordion`, `Avatar`, `Breadcrumbs`, `EmptyState`, `CountUp`.
- `components/GameArt.tsx`: generated cover art.
- `components/ProductCard.tsx`: `ProductCard` (product poster card), `GameCard` (game tile).
- `components/Logo.tsx`: `Logo`, `LogoMark`.
- State: `useCart()` (lines, count, subtotal, discount, total, coupon, add, setQty, remove, clear, applyCoupon, removeCoupon), `useAuth()` (user, signIn, signOut), `useUI()` (openCart/closeCart/cartOpen, openAuth(mode)/closeAuth/authMode, chatOpen/setChatOpen, toast({title, body?, tone?})), `useOnlineCount()`.
- Data helpers (`data/catalog.ts`): `GAMES PRODUCTS REVIEWS FAQS CHANGELOG STATUS_META KIND_LABEL STATS getGame getProduct productsForGame reviewsForProduct fromPrice gameFromPrice gameStatus formatPrice timeAgo formatDate NOW`.

## Rules for page code
1. Each page/section owns its own CSS file next to it, imported from its TSX (e.g. `import './store.css'`). Prefix every class with the page's prefix (`home-`, `menu-`, `store-`, `pdp-`, `status-`, `rev-`, `cart-`, `auth-`, `chat-`, `co-`, `dash-`, `sup-`, `legal-`, `nf-`) so files never collide.
2. Do not edit shared files (`global.css`, `components.css`, `ui.tsx`, `Icon.tsx`, `GameArt.tsx`, `ProductCard.tsx`, `catalog.ts`, `types.ts`, `store.tsx`, `router.tsx`, `App.tsx`, `config.ts`). Put extra mock data (setup steps, uptime history, etc.) in your own file.
3. Use tokens (`var(--...)`), never raw hex for brand colours.
4. Mobile first-class: must look right at 390px wide with zero horizontal page scroll; check 768px and 1440px too. Touch targets ≥ 40px.
5. Accessible: real `<button>`s and `<a>`s, labels on inputs, `aria-*` on toggles/tabs/dialogs, visible focus, Esc closes overlays, honour `prefers-reduced-motion` (global CSS already shortens animations).
6. Motion is subtle and purposeful: fade/slide on reveal, hover lifts, no bouncing.
7. Copy is confident, specific and short. No lorem ipsum. Don't promise "100% ban-proof"; status honesty is part of the brand.
8. Payments are UI only: choose a method, then "you'll be redirected to our secure processor". Never render card-number/CVV fields.
