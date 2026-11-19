import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { BRAND } from '../config';
import { PRODUCTS, STATUS_META, formatDate, formatPrice, getGame, getProduct } from '../data/catalog';
import type { Status } from '../data/types';
import { GameArt } from '../components/GameArt';
import { ProductCard } from '../components/ProductCard';
import { Icon } from '../components/Icon';
import { Avatar, Breadcrumbs, EmptyState, SectionHeader, StatusBadge } from '../components/ui';
import { Link, navigate } from '../router';
import { useAuth, useCart, useUI, type ResolvedLine } from '../state/store';
import {
  LOADER,
  METHOD_LABEL,
  buildOrder,
  copyText,
  saveOrder,
  type CryptoId,
  type Order,
  type PayMethodId,
} from './orders';
import './checkout.css';

/* ------------------------------------------------------------------ */
/* Static data                                                         */
/* ------------------------------------------------------------------ */

type Step = 0 | 1 | 2;
type Phase = 'form' | 'processing' | 'done';

const STEPS: { label: string; hint: string }[] = [
  { label: 'Account', hint: 'Where we deliver your keys' },
  { label: 'Payment', hint: 'Choose how you want to pay' },
  { label: 'Review', hint: 'Check everything and pay' },
];

interface Method {
  id: PayMethodId;
  title: string;
  blurb: string;
  fee: string;
  marks: string[];
}

const METHODS: Method[] = [
  {
    id: 'card',
    title: 'Credit or debit card',
    blurb: 'Visa, Mastercard and Amex, processed by our secure partner.',
    fee: 'No fee',
    marks: ['VISA', 'MC', 'AMEX'],
  },
  {
    id: 'apple',
    title: 'Apple Pay',
    blurb: 'One tap with Face ID or Touch ID, processed by our secure partner.',
    fee: 'No fee',
    marks: ['iPhone', 'Mac'],
  },
  {
    id: 'google',
    title: 'Google Pay',
    blurb: 'Any card saved to your Google account, processed by our secure partner.',
    fee: 'No fee',
    marks: ['Android', 'Chrome'],
  },
  {
    id: 'paypal',
    title: 'PayPal',
    blurb: 'Pay with your balance or a linked card. Goods & services only.',
    fee: 'No fee',
    marks: ['Balance', 'Linked card'],
  },
  {
    id: 'crypto',
    title: 'Crypto',
    blurb: 'Send from any wallet or exchange. Your key unlocks as soon as the network confirms.',
    fee: 'Network fee only',
    marks: ['BTC', 'ETH', 'LTC', 'USDT'],
  },
];

const COINS: { id: CryptoId; name: string; note: string }[] = [
  { id: 'BTC', name: 'Bitcoin', note: '1 confirmation · about 10 min' },
  { id: 'ETH', name: 'Ethereum', note: '12 confirmations · about 3 min' },
  { id: 'LTC', name: 'Litecoin', note: '2 confirmations · about 5 min' },
  { id: 'USDT', name: 'Tether', note: 'TRC-20 or ERC-20 · about 2 min' },
];

const STATUS_NOTE: Partial<Record<Status, string>> = {
  updating: 'Game just patched. The clock on this key starts when the build is green again.',
  testing: 'New build in QA. This key activates the moment it is verified.',
  detected: 'Sales paused while we rebuild. We recommend waiting for the all-clear.',
};

const TRUST: { icon: string; title: string; body: string }[] = [
  { icon: 'zap', title: 'Instant delivery', body: 'Keys land in your inbox and dashboard in seconds.' },
  { icon: 'lock', title: 'Encrypted checkout', body: 'We never see or store your payment details.' },
  { icon: 'clock', title: 'Clock pauses on updates', body: 'No lost time while a game patch is rebuilt.' },
  { icon: 'headset', title: '24/7 human support', body: 'Median first reply under 4 minutes.' },
];

const PROCESS_MSGS = ['Securing your session', 'Confirming with our payment partner', 'Generating your license keys'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const CRUMBS = [{ label: 'Home', to: '/' }, { label: 'Store', to: '/store' }, { label: 'Checkout' }];

const POPULAR = PRODUCTS.filter((p) => p.popular && p.status === 'undetected')
  .sort((a, b) => b.sold - a.sold)
  .slice(0, 4);

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function MethodGlyph({ id }: { id: PayMethodId }) {
  switch (id) {
    case 'card':
      return <Icon name="card" size={20} />;
    case 'apple':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="6" y="2.5" width="11" height="19" rx="2.5" />
          <path d="M10.5 18.5h2" />
          <path d="M19.5 9.5a4 4 0 0 1 0 5M21.8 7.5a7 7 0 0 1 0 9" />
        </svg>
      );
    case 'google':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M5 8.5a5 5 0 0 1 0 7" />
          <path d="M9 6a9 9 0 0 1 0 12" />
          <path d="M13 3.5a13 13 0 0 1 0 17" />
          <path d="M17 1.8a16 16 0 0 1 0 20.4" opacity="0.5" />
        </svg>
      );
    case 'paypal':
      return <Icon name="wallet" size={20} />;
    case 'crypto':
      return <Icon name="bitcoin" size={20} />;
  }
}

function useProcessSteps(active: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active) {
      setI(0);
      return;
    }
    const t = window.setInterval(() => setI((n) => Math.min(PROCESS_MSGS.length - 1, n + 1)), 560);
    return () => window.clearInterval(t);
  }, [active]);
  return i;
}

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

function lineSavings(lines: ResolvedLine[]) {
  return lines.reduce((s, l) => s + ((l.plan.compareAt ?? l.plan.price) - l.plan.price) * l.qty, 0);
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function CheckoutPage() {
  const cart = useCart();
  const { user, signIn } = useAuth();
  const { openAuth, openCart, toast } = useUI();
  const uid = useId();

  const [phase, setPhase] = useState<Phase>('form');
  const [order, setOrder] = useState<Order | null>(null);
  const [step, setStep] = useState<Step>(0);
  const [maxStep, setMaxStep] = useState<Step>(0);

  const [email, setEmail] = useState(user?.email ?? '');
  const [emailError, setEmailError] = useState('');
  const [discord, setDiscord] = useState('');

  const [method, setMethod] = useState<PayMethodId>('card');
  const [coin, setCoin] = useState<CryptoId>('BTC');

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [agree, setAgree] = useState(false);
  const [agreeError, setAgreeError] = useState(false);

  const [summaryOpen, setSummaryOpen] = useState(false);

  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const emailRef = useRef<HTMLInputElement>(null);
  const coinRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const timer = useRef<number>();
  const prevStep = useRef<Step>(0);
  const msgIndex = useProcessSteps(phase === 'processing');

  // Signing in from the auth modal fills the email.
  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Move focus (and the viewport, if needed) to the step that just opened.
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    const el = stepRefs.current[step];
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 80 || top > window.innerHeight * 0.55) el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    el.querySelector<HTMLElement>('.co-step-title')?.focus({ preventScroll: true });
  }, [step]);

  const go = (s: Step) => {
    setStep(s);
    setMaxStep((m) => (s > m ? s : m));
  };

  /* -- Done ------------------------------------------------------- */
  if (phase === 'done' && order) {
    return <Success order={order} />;
  }

  /* -- Empty ------------------------------------------------------ */
  if (cart.lines.length === 0) {
    return (
      <div className="page co">
        <div className="container">
          <Breadcrumbs items={CRUMBS} />
          <div className="co-empty card">
            <div className="glow-blob co-empty-glow" aria-hidden="true" />
            <EmptyState
              as="h1"
              icon="cart"
              title="Your cart is empty"
              body="Pick a product and a plan, then come back here. Checkout takes under a minute and your key arrives instantly."
              action={
                <Link to="/store" className="btn btn-primary btn-lg co-empty-btn">
                  Browse store
                  <span className="chip-arrow">
                    <Icon name="arrow-right" />
                  </span>
                </Link>
              }
            />
            <ul className="co-empty-trust">
              {TRUST.slice(0, 3).map((t) => (
                <li key={t.title}>
                  <Icon name={t.icon} size={16} />
                  {t.title}
                </li>
              ))}
            </ul>
          </div>

          <section className="co-popular">
            <SectionHeader
              eyebrow="Popular right now"
              title={
                <>
                  Start with <span className="accent">a best seller</span>
                </>
              }
              action={
                <Link to="/store" className="btn btn-ghost btn-sm">
                  View all products <Icon name="arrow-right" />
                </Link>
              }
            />
            <div className="co-popular-grid">
              {POPULAR.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  const { lines, subtotal, discount, total, coupon } = cart;
  const methodMeta = METHODS.find((m) => m.id === method)!;
  const coinMeta = COINS.find((c) => c.id === coin)!;
  const methodText = method === 'crypto' ? `Crypto · ${coin}` : METHOD_LABEL[method];

  /* -- Handlers --------------------------------------------------- */
  const submitAccount = (e: FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    const err = !v ? 'Enter the email your keys should go to.' : !EMAIL_RE.test(v) ? 'That email doesn’t look right. Check for typos.' : '';
    if (err) {
      setEmailError(err);
      emailRef.current?.focus();
      return;
    }
    setEmailError('');
    setEmail(v);
    go(1);
  };

  // Radio-group keys for the coin picker: one Tab stop, arrows move the selection.
  const onCoinKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = COINS.findIndex((c) => c.id === coin);
    const map: Record<string, number> = {
      ArrowRight: i + 1,
      ArrowDown: i + 1,
      ArrowLeft: i - 1,
      ArrowUp: i - 1,
      Home: 0,
      End: COINS.length - 1,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    const n = (map[e.key] + COINS.length) % COINS.length;
    setCoin(COINS[n].id);
    coinRefs.current[n]?.focus();
  };

  const submitPayment = (e: FormEvent) => {
    e.preventDefault();
    go(2);
  };

  const applyCode = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return setCodeError('Enter a code first.');
    if (cart.applyCoupon(c)) {
      setCodeError('');
      setCode('');
      toast({ title: `${c} applied`, body: 'Your discount is reflected in the total.' });
    } else {
      setCodeError(`“${c}” isn’t a valid or active code.`);
    }
  };

  const pay = (e: FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setAgreeError(true);
      return;
    }
    setPhase('processing');
    timer.current = window.setTimeout(() => {
      const o = buildOrder({
        lines,
        email,
        discord: discord.trim(),
        method,
        crypto: coin,
        coupon: coupon?.code,
        subtotal,
        discount,
        total,
      });
      saveOrder(o);
      setOrder(o);
      if (!user) signIn(email);
      cart.clear();
      setPhase('done');
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }, 1700);
  };

  const stepState = (i: number) => (i === step ? 'is-active' : i < step || i <= maxStep ? 'is-done' : 'is-upcoming');
  const busy = phase === 'processing';

  /* -- Render ----------------------------------------------------- */
  return (
    <div className="page co">
      <div className="co-bg" aria-hidden="true">
        <div className="bg-grid" />
        <div className="glow-blob co-glow-a" />
      </div>
      <div className="container co-container">
        <header className="co-head">
          <div className="co-head-titles">
            <Breadcrumbs items={CRUMBS} />
            <h1 className="co-title">
              Secure <span className="accent">checkout</span>
            </h1>
            <p className="co-sub">
              <Icon name="lock" size={14} /> Secure connection · Keys delivered the second payment clears
            </p>
          </div>

          <ol className="co-progress" aria-label="Checkout progress">
            {STEPS.map((s, i) => {
              const cls = i < step ? 'is-done' : i === step ? 'is-current' : '';
              return (
                <li key={s.label} className={`co-prog ${cls}`}>
                  <button
                    type="button"
                    className="co-prog-btn"
                    onClick={() => go(i as Step)}
                    disabled={i > maxStep || busy}
                    aria-current={i === step ? 'step' : undefined}
                  >
                    <span className="co-prog-dot">{i < step ? <Icon name="check" size={14} strokeWidth={2.6} /> : i + 1}</span>
                    <span className="co-prog-text">
                      <span className="co-prog-label">{s.label}</span>
                      <span className="co-prog-hint">{s.hint}</span>
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <span className="co-prog-bar" aria-hidden="true">
                      <span style={{ transform: `scaleX(${i < step ? 1 : 0})` }} />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </header>

        <div className="co-grid">
          {/* ---------------- Steps ---------------- */}
          <div className={`co-main${busy ? ' is-busy' : ''}`}>
            {/* Step 1: Account */}
            <section
              ref={(el) => {
                stepRefs.current[0] = el;
              }}
              className={`co-step card ${stepState(0)}`}
              aria-labelledby={`${uid}-s0`}
            >
              <StepHead
                n={1}
                id={`${uid}-s0`}
                title="Account"
                state={stepState(0)}
                summary={
                  <>
                    <span className="mono">{email}</span>
                    {discord.trim() && (
                      <span className="co-step-sum-sep">
                        <Icon name="discord" size={13} /> {discord.trim()}
                      </span>
                    )}
                  </>
                }
                hint="Your keys and receipt are sent here."
                onEdit={busy ? undefined : () => go(0)}
              />
              {step === 0 && (
                <form className="co-step-body" onSubmit={submitAccount} noValidate>
                  {user ? (
                    <div className="co-signed">
                      <Avatar name={user.username} size={38} />
                      <div className="grow">
                        <div className="co-signed-name">Signed in as {user.username}</div>
                        <div className="tiny muted">Keys will also appear in your dashboard.</div>
                      </div>
                      <span className="badge badge-ok">
                        <Icon name="check" size={11} strokeWidth={2.6} /> Verified
                      </span>
                    </div>
                  ) : (
                    <div className="co-signin">
                      <Icon name="user" size={16} />
                      <span>
                        Already have an account?{' '}
                        <button type="button" className="co-link" onClick={() => openAuth('signin')}>
                          Sign in
                        </button>{' '}
                        <span className="muted">for faster checkout.</span>
                      </span>
                    </div>
                  )}

                  <div className="co-fields">
                    <div className="field">
                      <label className="label" htmlFor={`${uid}-email`}>
                        Email address
                      </label>
                      <div className="input-wrap">
                        <Icon name="mail" />
                        <input
                          ref={emailRef}
                          id={`${uid}-email`}
                          className={`input${emailError ? ' co-invalid' : ''}`}
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (emailError) setEmailError('');
                          }}
                          aria-invalid={!!emailError}
                          aria-describedby={`${uid}-email-msg`}
                        />
                      </div>
                      <span
                        key={emailError ? 'error' : 'help'}
                        id={`${uid}-email-msg`}
                        className={emailError ? 'co-error' : 'co-help'}
                        role={emailError ? 'alert' : undefined}
                      >
                        {emailError || 'Your license keys and receipt are sent here. No spam, ever.'}
                      </span>
                    </div>

                    <div className="field">
                      <label className="label" htmlFor={`${uid}-discord`}>
                        Discord username <span className="co-optional">Optional</span>
                      </label>
                      <div className="input-wrap">
                        <Icon name="discord" />
                        <input
                          id={`${uid}-discord`}
                          className="input"
                          type="text"
                          autoComplete="off"
                          placeholder="username"
                          value={discord}
                          onChange={(e) => setDiscord(e.target.value)}
                          aria-describedby={`${uid}-discord-msg`}
                        />
                      </div>
                      <span id={`${uid}-discord-msg`} className="co-help">
                        Get the customer role and a ping when your product updates.
                      </span>
                    </div>
                  </div>

                  <div className="co-step-actions">
                    <button type="submit" className="btn btn-primary btn-lg">
                      Continue to payment
                      <span className="chip-arrow">
                        <Icon name="arrow-right" />
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Step 2: Payment */}
            <section
              ref={(el) => {
                stepRefs.current[1] = el;
              }}
              className={`co-step card ${stepState(1)}`}
              aria-labelledby={`${uid}-s1`}
            >
              <StepHead
                n={2}
                id={`${uid}-s1`}
                title="Payment method"
                state={stepState(1)}
                summary={
                  <span className="row gap-8">
                    <span className="co-step-glyph">
                      <MethodGlyph id={method} />
                    </span>
                    {methodText}
                  </span>
                }
                hint="Cards, Apple Pay, Google Pay, PayPal or crypto."
                onEdit={busy || maxStep < 1 ? undefined : () => go(1)}
              />
              {step === 1 && (
                <form className="co-step-body" onSubmit={submitPayment}>
                  <fieldset className="co-methods">
                    <legend className="sr-only">Payment method</legend>
                    {METHODS.map((m) => {
                      const on = method === m.id;
                      return (
                        <label key={m.id} className={`co-method${on ? ' is-on' : ''}${m.id === 'crypto' ? ' is-wide' : ''}`}>
                          <input
                            type="radio"
                            name={`${uid}-method`}
                            value={m.id}
                            checked={on}
                            onChange={() => setMethod(m.id)}
                            className="co-method-input"
                          />
                          <span className="co-method-glyph">
                            <MethodGlyph id={m.id} />
                          </span>
                          <span className="co-method-text">
                            <span className="co-method-title">{m.title}</span>
                            <span className="co-method-blurb">{m.blurb}</span>
                            <span className="co-method-foot">
                              <span className={`co-fee${m.id === 'crypto' ? ' is-net' : ''}`}>{m.fee}</span>
                              {m.marks.map((mk) => (
                                <span key={mk} className="co-mark">
                                  {mk}
                                </span>
                              ))}
                            </span>
                          </span>
                          <span className="co-method-radio" aria-hidden="true" />
                        </label>
                      );
                    })}
                  </fieldset>

                  {method === 'crypto' && (
                    <div className="co-coins">
                      <div className="co-coins-head">
                        <span className="label" id={`${uid}-coin`}>
                          Choose a coin
                        </span>
                        <span className="tiny muted">{coinMeta.note}</span>
                      </div>
                      <div className="co-coin-row" role="radiogroup" aria-labelledby={`${uid}-coin`} onKeyDown={onCoinKey}>
                        {COINS.map((c, i) => (
                          <button
                            key={c.id}
                            ref={(el) => {
                              coinRefs.current[i] = el;
                            }}
                            type="button"
                            role="radio"
                            aria-checked={coin === c.id}
                            tabIndex={coin === c.id ? 0 : -1}
                            className="co-coin"
                            onClick={() => setCoin(c.id)}
                          >
                            <span className="co-coin-sym mono">{c.id}</span>
                            <span className="co-coin-name">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="co-notice" role="note">
                    <span className="icon-tile is-accent">
                      <Icon name="shield-check" />
                    </span>
                    <div>
                      <strong>You’ll be redirected to our secure payment partner to complete payment.</strong>
                      <p>
                        {method === 'crypto'
                          ? `You’ll get ${coin === 'ETH' || coin === 'LTC' ? 'an' : 'a'} ${coin} address and QR code there. Send the exact amount and come straight back; your key unlocks on confirmation.`
                          : `We never see or store your ${method === 'paypal' ? 'PayPal login' : 'card details'}. Your key is delivered the moment payment clears.`}
                      </p>
                    </div>
                  </div>

                  <div className="co-step-actions">
                    <button type="button" className="btn btn-ghost btn-lg" onClick={() => go(0)}>
                      <Icon name="arrow-left" /> Back
                    </button>
                    <button type="submit" className="btn btn-primary btn-lg">
                      Continue to review
                      <span className="chip-arrow">
                        <Icon name="arrow-right" />
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Step 3: Review */}
            <section
              ref={(el) => {
                stepRefs.current[2] = el;
              }}
              className={`co-step card ${stepState(2)}`}
              aria-labelledby={`${uid}-s2`}
            >
              <StepHead
                n={3}
                id={`${uid}-s2`}
                title="Review & pay"
                state={stepState(2)}
                summary={null}
                hint="Confirm your order, add a code and pay."
              />
              {step === 2 && (
                <div className="co-step-body">
                  <div className="co-recap">
                    <div className="co-recap-item">
                      <span className="co-recap-k">Deliver to</span>
                      <span className="co-recap-v mono">{email}</span>
                      <button type="button" className="co-link tiny" onClick={() => go(0)} disabled={busy}>
                        Change
                      </button>
                    </div>
                    <div className="co-recap-item">
                      <span className="co-recap-k">Pay with</span>
                      <span className="co-recap-v">
                        <span className="co-step-glyph">
                          <MethodGlyph id={method} />
                        </span>
                        {methodText}
                      </span>
                      <button type="button" className="co-link tiny" onClick={() => go(1)} disabled={busy}>
                        Change
                      </button>
                    </div>
                  </div>

                  <ul className="co-review-lines">
                    {lines.map((l) => {
                      const game = getGame(l.product.gameSlug)!;
                      const note = STATUS_NOTE[l.product.status];
                      return (
                        <li key={`${l.productSlug}|${l.planId}`} className="co-review-line">
                          <GameArt game={game} variant="tile" className="co-tile" />
                          <div className="co-review-info">
                            <div className="co-review-name">{l.product.name}</div>
                            <div className="co-review-meta">
                              <span>{l.plan.label}</span>
                              <span className="dim">·</span>
                              <span>Qty {l.qty}</span>
                              <span className="dim">·</span>
                              <span className="co-instant">
                                <Icon name="zap" size={12} /> Instant key
                              </span>
                            </div>
                            {note && (
                              <div className={`co-review-note tone-${STATUS_META[l.product.status].tone}`}>
                                <StatusBadge status={l.product.status} size="sm" />
                                <span>{note}</span>
                              </div>
                            )}
                          </div>
                          <div className="co-review-price tabular">{formatPrice(l.lineTotal)}</div>
                        </li>
                      );
                    })}
                  </ul>

                  {coupon ? (
                    <div className="co-coupon-on">
                      <Icon name="tag" size={16} />
                      <span className="co-coupon-text">
                        <strong className="mono">{coupon.code}</strong> applied · {coupon.percent}% off
                      </span>
                      <span className="co-coupon-save tabular">−{formatPrice(discount)}</span>
                      <button
                        type="button"
                        className="btn btn-quiet btn-icon btn-sm"
                        onClick={cart.removeCoupon}
                        aria-label={`Remove code ${coupon.code}`}
                        disabled={busy}
                      >
                        <Icon name="x" size={15} />
                      </button>
                    </div>
                  ) : (
                    <form className="co-coupon" onSubmit={applyCode} noValidate>
                      <label className="label" htmlFor={`${uid}-code`}>
                        Discount code
                      </label>
                      <div className="co-coupon-row">
                        <div className="input-wrap grow">
                          <Icon name="tag" />
                          <input
                            id={`${uid}-code`}
                            className={`input mono co-code-input${codeError ? ' co-invalid' : ''}`}
                            placeholder="ENTER CODE"
                            value={code}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(e) => {
                              setCode(e.target.value.toUpperCase());
                              if (codeError) setCodeError('');
                            }}
                            aria-invalid={!!codeError}
                            aria-describedby={codeError ? `${uid}-code-msg` : undefined}
                            disabled={busy}
                          />
                        </div>
                        <button type="submit" className="btn btn-ghost" disabled={busy}>
                          Apply
                        </button>
                      </div>
                      {codeError && (
                        <span id={`${uid}-code-msg`} className="co-error" role="alert">
                          {codeError}
                        </span>
                      )}
                    </form>
                  )}

                  <form onSubmit={pay} noValidate>
                    <dl className="co-totals">
                      <div>
                        <dt>Subtotal</dt>
                        <dd className="tabular">{formatPrice(subtotal)}</dd>
                      </div>
                      {discount > 0 && (
                        <div className="is-discount">
                          <dt>Discount{coupon ? ` (${coupon.code})` : ''}</dt>
                          <dd className="tabular">−{formatPrice(discount)}</dd>
                        </div>
                      )}
                      <div>
                        <dt>Processing</dt>
                        {methodMeta.fee === 'No fee' ? (
                          <dd className="co-free">Free</dd>
                        ) : (
                          <dd className="co-net">Network fee, paid from your wallet</dd>
                        )}
                      </div>
                      <div className="is-total">
                        <dt>Total due today</dt>
                        <dd className="tabular">{formatPrice(total)}</dd>
                      </div>
                    </dl>

                    <label className={`checkbox co-agree${agreeError ? ' is-error' : ''}`}>
                      <input
                        type="checkbox"
                        checked={agree}
                        onChange={(e) => {
                          setAgree(e.target.checked);
                          if (e.target.checked) setAgreeError(false);
                        }}
                        aria-invalid={agreeError}
                        aria-describedby={agreeError ? `${uid}-agree-msg` : undefined}
                        disabled={busy}
                      />
                      <span>
                        I agree to the{' '}
                        <a href="#/legal/terms" target="_blank" rel="noopener noreferrer">
                          Terms of Service
                          <Icon name="external" size={12} className="co-ext" />
                          <span className="sr-only"> (opens in new tab)</span>
                        </a>{' '}
                        and{' '}
                        <a href="#/legal/refunds" target="_blank" rel="noopener noreferrer">
                          Refund Policy
                          <Icon name="external" size={12} className="co-ext" />
                          <span className="sr-only"> (opens in new tab)</span>
                        </a>
                        , and understand digital keys are delivered instantly.
                      </span>
                    </label>
                    {agreeError && (
                      <span id={`${uid}-agree-msg`} className="co-error co-agree-msg" role="alert">
                        Please accept the terms to continue.
                      </span>
                    )}

                    <button type="submit" className={`btn btn-primary btn-lg btn-block co-pay${busy ? ' is-busy' : ''}`} disabled={busy}>
                      {busy ? (
                        <>
                          <span className="co-spinner" aria-hidden="true" /> Processing…
                        </>
                      ) : (
                        <>
                          <Icon name="lock" /> Pay {formatPrice(total)}
                        </>
                      )}
                    </button>
                    <p className="co-pay-note">
                      <Icon name="external" size={13} /> You’ll be redirected to our secure payment partner to complete payment.
                    </p>
                  </form>
                </div>
              )}
            </section>

            {busy && (
              <div className="co-processing" role="status" aria-live="assertive">
                <div className="co-proc-card">
                  <div className="co-proc-ring" aria-hidden="true">
                    <svg viewBox="0 0 80 80" className="co-proc-svg">
                      <circle cx="40" cy="40" r="34" className="co-proc-track" />
                      <circle cx="40" cy="40" r="34" className="co-proc-arc" />
                    </svg>
                    <Icon name="lock" size={22} />
                  </div>
                  <div className="co-proc-title">Processing payment</div>
                  <ul className="co-proc-steps">
                    {PROCESS_MSGS.map((m, i) => (
                      <li key={m} className={i < msgIndex ? 'is-done' : i === msgIndex ? 'is-now' : ''}>
                        <span className="co-proc-tick">{i < msgIndex ? <Icon name="check" size={11} strokeWidth={3} /> : null}</span>
                        {m}
                      </li>
                    ))}
                  </ul>
                  <div className="co-proc-bar" aria-hidden="true">
                    <span />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ---------------- Summary ---------------- */}
          <OrderSummary
            lines={lines}
            subtotal={subtotal}
            discount={discount}
            total={total}
            couponCode={coupon?.code}
            open={summaryOpen}
            onToggle={() => setSummaryOpen((o) => !o)}
            onEdit={busy ? undefined : openCart}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step header                                                         */
/* ------------------------------------------------------------------ */

function StepHead({
  n,
  id,
  title,
  state,
  summary,
  hint,
  onEdit,
}: {
  n: number;
  id: string;
  title: string;
  state: string;
  summary: ReactNode;
  hint: string;
  onEdit?: () => void;
}) {
  const done = state === 'is-done';
  return (
    <header className="co-step-head">
      <span className="co-step-num" aria-hidden="true">
        {done ? <Icon name="check" size={15} strokeWidth={2.6} /> : n}
      </span>
      <div className="grow">
        <h2 className="co-step-title" id={id} tabIndex={-1}>
          <span className="sr-only">Step {n}: </span>
          {title}
        </h2>
        {done && summary ? <div className="co-step-sum">{summary}</div> : state !== 'is-active' && <div className="co-step-hint">{hint}</div>}
      </div>
      {done && onEdit && (
        <button type="button" className="btn btn-quiet btn-sm co-edit" onClick={onEdit} aria-label={`Edit ${title.toLowerCase()}`}>
          Edit
        </button>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Order summary                                                       */
/* ------------------------------------------------------------------ */

function OrderSummary({
  lines,
  subtotal,
  discount,
  total,
  couponCode,
  open,
  onToggle,
  onEdit,
}: {
  lines: ResolvedLine[];
  subtotal: number;
  discount: number;
  total: number;
  couponCode?: string;
  open: boolean;
  onToggle: () => void;
  onEdit?: () => void;
}) {
  const bodyId = useId();
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const saved = lineSavings(lines) + discount;
  return (
    <aside className={`co-sum${open ? ' is-open' : ''}`} aria-label="Order summary">
      <button type="button" className="co-sum-toggle" onClick={onToggle} aria-expanded={open} aria-controls={bodyId}>
        <span className="co-sum-toggle-l">
          <Icon name="cart" size={17} />
          {open ? 'Hide' : 'Show'} order summary
          <Icon name="chevron-down" size={15} className="co-sum-chev" />
        </span>
        <span className="co-sum-toggle-total tabular">{formatPrice(total)}</span>
      </button>

      <div className="co-sum-body" id={bodyId}>
        <div className="co-sum-inner">
          <div className="co-sum-card card">
            <div className="co-sum-head">
              <div>
                <h2 className="co-sum-title">Order summary</h2>
                <span className="tiny muted">
                  {count} {count === 1 ? 'item' : 'items'} · delivered instantly
                </span>
              </div>
              {onEdit && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
                  Edit cart
                </button>
              )}
            </div>

            <ul className="co-sum-lines">
              {lines.map((l) => {
                const game = getGame(l.product.gameSlug)!;
                return (
                  <li key={`${l.productSlug}|${l.planId}`} className="co-sum-line">
                    <span className="co-sum-art">
                      <GameArt game={game} variant="tile" className="co-tile" />
                      {l.qty > 1 && <span className="co-sum-qty">{l.qty}</span>}
                    </span>
                    <div className="co-sum-info">
                      <div className="co-sum-name">{l.product.name}</div>
                      <div className="co-sum-meta">
                        <span className="co-plan">{l.plan.label}</span>
                        <span>
                          {l.qty} × {formatPrice(l.plan.price)}
                        </span>
                      </div>
                    </div>
                    <div className="co-sum-price">
                      <span className="tabular">{formatPrice(l.lineTotal)}</span>
                      {l.plan.compareAt && <s className="tabular">{formatPrice(l.plan.compareAt * l.qty)}</s>}
                    </div>
                  </li>
                );
              })}
            </ul>

            <dl className="co-totals co-sum-totals">
              <div>
                <dt>Subtotal</dt>
                <dd className="tabular">{formatPrice(subtotal)}</dd>
              </div>
              <div className={discount > 0 ? 'is-discount' : ''}>
                <dt>Discount{couponCode ? ` (${couponCode})` : ''}</dt>
                <dd className="tabular">{discount > 0 ? `−${formatPrice(discount)}` : '—'}</dd>
              </div>
              <div className="is-total">
                <dt>Total</dt>
                <dd>
                  <span className="co-cur mono">{BRAND.currency}</span>
                  <span className="tabular">{formatPrice(total)}</span>
                </dd>
              </div>
            </dl>

            {saved > 0.009 && (
              <div className="co-saved">
                <Icon name="sparkles" size={15} /> You’re saving <strong className="tabular">{formatPrice(saved)}</strong> on this order
              </div>
            )}
          </div>

          <ul className="co-trust">
            {TRUST.map((t) => (
              <li key={t.title}>
                <span className="co-trust-ic">
                  <Icon name={t.icon} size={16} />
                </span>
                <div>
                  <strong>{t.title}</strong>
                  <span>{t.body}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Success                                                             */
/* ------------------------------------------------------------------ */

function Success({ order }: { order: Order }) {
  const { toast } = useUI();
  const [copied, setCopied] = useState<string | null>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const keyCount = order.lines.reduce((s, l) => s + l.keys.length, 0);

  useEffect(() => {
    headRef.current?.focus({ preventScroll: true });
  }, []);

  const copy = async (key: string) => {
    const ok = await copyText(key);
    if (ok) {
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
      toast({ title: 'License key copied', body: key });
    } else {
      toast({ title: 'Couldn’t copy automatically', body: 'Select the key and copy it manually.', tone: 'warn' });
    }
  };

  const download = () =>
    toast({ title: 'Download starting', body: `${LOADER.file} · ${LOADER.size}`, tone: 'info' });

  const methodText = order.method === 'crypto' && order.crypto ? `Crypto · ${order.crypto}` : METHOD_LABEL[order.method];

  return (
    <div className="page co co-done">
      <div className="co-bg" aria-hidden="true">
        <div className="bg-grid" />
        <div className="glow-blob co-glow-ok" />
      </div>
      <div className="container-narrow co-success">
        <div className="co-check" aria-hidden="true">
          <span className="co-check-ring" />
          <span className="co-check-ring is-2" />
          <svg viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="44" className="co-check-circle" />
            <path d="M30 49.5 42.5 62 66 36" className="co-check-path" />
          </svg>
        </div>

        <span className="eyebrow co-done-eyebrow">Payment confirmed</span>
        <h1 className="co-done-title" ref={headRef} tabIndex={-1}>
          You’re in.
          <br />
          <span className="grad-text">Your {keyCount === 1 ? 'key is' : 'keys are'} ready.</span>
        </h1>
        <p className="co-done-lead">
          We sent your receipt and {keyCount === 1 ? 'license key' : 'license keys'} to <strong>{order.email}</strong>. They’re
          saved in your dashboard too.
        </p>

        <div className="co-done-meta">
          <span className="co-meta-chip">
            <span className="muted">Order</span> <span className="mono">#{order.id}</span>
          </span>
          <span className="co-meta-chip">
            <span className="muted">Paid</span> <span className="tabular">{formatPrice(order.total)}</span>
          </span>
          <span className="co-meta-chip">
            <span className="muted">Via</span> {methodText}
          </span>
          <span className="co-meta-chip">
            <span className="muted">Date</span> {formatDate(order.createdAt)}
          </span>
        </div>

        <div className="co-done-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={download}>
            <Icon name="download" /> Download loader
          </button>
          <button type="button" className="btn btn-white btn-lg" onClick={() => navigate('/dashboard?tab=licenses')}>
            Go to dashboard
            <span className="chip-arrow">
              <Icon name="arrow-right" />
            </span>
          </button>
        </div>

        <section className="co-keys card" aria-labelledby="co-keys-title">
          <header className="co-keys-head">
            <div className="row gap-12">
              <span className="icon-tile is-accent">
                <Icon name="key" />
              </span>
              <div>
                <h2 className="co-keys-title" id="co-keys-title">
                  Your license {keyCount === 1 ? 'key' : 'keys'}
                </h2>
                <span className="tiny muted">Keep these private. Each key binds to one PC on first login.</span>
              </div>
            </div>
          </header>
          <ul className="co-keys-list">
            {order.lines.flatMap((l, li) =>
              l.keys.map((k, ki) => {
                const product = getProduct(l.productSlug);
                const game = product ? getGame(product.gameSlug) : undefined;
                return (
                  <li key={k} className="co-key-row" style={{ ['--i' as string]: li + ki }}>
                    {game && <GameArt game={game} variant="tile" className="co-tile" />}
                    <div className="co-key-info">
                      <div className="co-key-name">
                        {l.productName}
                        {l.keys.length > 1 && <span className="muted"> · #{ki + 1}</span>}
                      </div>
                      <div className="tiny muted">
                        {l.planLabel} · {l.days === null ? 'Never expires' : `${l.days} ${l.days === 1 ? 'day' : 'days'} of access`}
                      </div>
                    </div>
                    <div className="co-key-box">
                      <code className="co-key-code">{k}</code>
                      <button
                        type="button"
                        className={`btn btn-sm co-copy${copied === k ? ' is-copied' : ''}`}
                        onClick={() => copy(k)}
                        aria-label={`Copy key for ${l.productName}`}
                      >
                        <Icon name={copied === k ? 'check' : 'copy'} size={15} />
                        <span>{copied === k ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </li>
                );
              }),
            )}
          </ul>
        </section>

        <section className="co-next" aria-label="Next steps">
          {[
            { icon: 'download', t: 'Download the loader', b: `${BRAND.name} Loader v${LOADER.version}, ${LOADER.size}. Run it before the game.` },
            { icon: 'key', t: 'Paste your key', b: 'Log in once. The key binds to this PC and remembers you.' },
            { icon: 'gamepad', t: 'Launch and play', b: 'Open the game, press INSERT for the menu. Configs sync to the cloud.' },
          ].map((s, i) => (
            <div key={s.t} className="co-next-card card">
              <span className="co-next-n mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="icon-tile">
                <Icon name={s.icon} />
              </span>
              <strong>{s.t}</strong>
              <p>{s.b}</p>
            </div>
          ))}
        </section>

        <p className="co-done-help">
          Stuck on setup? <Link to="/support">Talk to a human</Link>, we answer 24/7.
        </p>
      </div>
    </div>
  );
}
