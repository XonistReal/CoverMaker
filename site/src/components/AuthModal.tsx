import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { BRAND } from '../config';
import { Link } from '../router';
import { useAuth, useUI, type AuthMode } from '../state/store';
import { Icon } from './Icon';
import { Logo, LogoMark } from './Logo';
import { Avatar, Stars } from './ui';
import './overlays.css';

/* Sign in / register / forgot password. Mounted once in App, opened with useUI().openAuth(mode). */

const EXIT_MS = 300;
const SUBMIT_MS = 700;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,20}$/;
const DISCORD_DEMO_EMAIL = 'shadowfox@discord.gg';

const COPY: Record<AuthMode, { title: string; sub: string; cta: string }> = {
  signin: { title: 'Welcome back', sub: 'Sign in to reach your keys, loaders and order history.', cta: 'Sign in' },
  register: { title: 'Create your account', sub: 'Takes 20 seconds. Every key and guide you buy lives here.', cta: 'Create account' },
  forgot: { title: 'Reset your password', sub: 'Enter the email on your account and we’ll send you a reset link.', cta: 'Send reset link' },
};

const PERKS = [
  { icon: 'zap', title: 'Instant delivery', body: 'Keys land in your dashboard the second payment clears.' },
  { icon: 'activity', title: 'Live build status', body: 'See the moment a game patches, before you load in.' },
  { icon: 'headset', title: '24/7 human support', body: 'Real people, median first reply under 4 minutes.' },
];

function usePresence(open: boolean, ms: number) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(t);
  }, [open, ms]);
  return { visible: open || mounted, closing: mounted && !open };
}

function trapTab(e: ReactKeyboardEvent, root: HTMLElement | null) {
  if (e.key !== 'Tab' || !root) return;
  const els = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
  if (!els.length) return;
  const first = els[0];
  const last = els[els.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !root.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

export function AuthModal() {
  const { authMode, closeAuth } = useUI();
  const open = authMode !== null;
  const { visible, closing } = usePresence(open, EXIT_MS);
  const lastMode = useRef<AuthMode>('signin');
  if (authMode) lastMode.current = authMode;

  // Esc closes; focus goes back where it came from.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAuth();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (prev && prev !== document.body && document.contains(prev)) {
        prev.focus({ preventScroll: true });
        return;
      }
      // The trigger is gone (signing in swaps "Sign in" for the account link, the phone menu closes as the modal
      // opens): land on the account entry point.
      const fallback = Array.from(document.querySelectorAll<HTMLElement>('.nav-user, .nav-burger')).find(
        (el) => el.getClientRects().length > 0,
      );
      fallback?.focus({ preventScroll: true });
    };
  }, [open, closeAuth]);

  if (!visible) return null;

  return (
    <div className={`auth-root${closing ? ' is-closing' : ''}`}>
      <div className="auth-backdrop" onClick={closeAuth} aria-hidden="true" />
      <AuthDialog mode={authMode ?? lastMode.current} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Field = 'username' | 'email' | 'password' | 'confirm' | 'terms';
type Errors = Partial<Record<Field, string>>;

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) s++;
  const score = pw ? Math.max(1, s) : 0;
  const label = ['', 'Weak', 'Fair', 'Good', 'Strong'][score];
  return { score, label };
}

function AuthDialog({ mode }: { mode: AuthMode }) {
  const { closeAuth, openAuth, toast } = useUI();
  const { signIn } = useAuth();
  const dialogRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const sentRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [blurred, setBlurred] = useState<Partial<Record<Field, boolean>>>({});
  const [loading, setLoading] = useState<'email' | 'discord' | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Reset per-mode state and focus the first field whenever the mode changes.
  useEffect(() => {
    setSubmitted(false);
    setBlurred({});
    setPassword('');
    setConfirm('');
    setShowPw(false);
    setSentTo(null);
    setLoading(null);
    window.clearTimeout(timer.current);
    const raf = window.requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [mode]);

  // The form is swapped for "Check your inbox": put focus on its heading so it isn't dropped to <body>.
  useEffect(() => {
    if (sentTo) sentRef.current?.focus({ preventScroll: true });
  }, [sentTo]);

  const validate = (): Errors => {
    const e: Errors = {};
    const em = email.trim();
    if (!em) e.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(em)) e.email = 'That doesn’t look like a valid email.';
    if (mode === 'forgot') return e;
    if (!password) e.password = mode === 'register' ? 'Choose a password.' : 'Enter your password.';
    else if (password.length < 8) e.password = 'Use at least 8 characters.';
    if (mode === 'register') {
      const u = username.trim();
      if (!u) e.username = 'Pick a username.';
      else if (!USERNAME_RE.test(u)) e.username = '3–20 characters: letters, numbers, dot, dash or underscore.';
      if (!confirm) e.confirm = 'Repeat your password.';
      else if (confirm !== password) e.confirm = 'Passwords don’t match.';
      if (!terms) e.terms = 'Please accept the Terms and Refund Policy.';
    }
    return e;
  };

  const all = validate();
  const show = (f: Field, value: string | boolean) =>
    submitted || (blurred[f] && value !== '' && value !== false) ? all[f] : undefined;
  const errors: Errors = {
    email: show('email', email),
    password: show('password', password),
    username: show('username', username),
    confirm: show('confirm', confirm),
    terms: submitted ? all.terms : undefined,
  };
  const blur = (f: Field) => () => setBlurred((b) => (b[f] ? b : { ...b, [f]: true }));

  const finish = (mail: string, name: string, title: string) => {
    signIn(mail, name);
    toast({ title, body: `Signed in as ${name}. Your dashboard is ready.`, tone: 'ok' });
    closeAuth();
  };

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    if (loading) return;
    setSubmitted(true);
    if (Object.keys(all).length) {
      window.requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
      return;
    }
    setLoading('email');
    const mail = email.trim();
    timer.current = window.setTimeout(() => {
      if (mode === 'forgot') {
        setLoading(null);
        setSentTo(mail);
        return;
      }
      const name = mode === 'register' ? username.trim() : mail.split('@')[0];
      finish(mail, name, mode === 'register' ? `Welcome to ${BRAND.name}, ${name}` : `Welcome back, ${name}`);
    }, SUBMIT_MS);
  };

  const discord = () => {
    if (loading) return;
    setLoading('discord');
    timer.current = window.setTimeout(() => {
      const name = DISCORD_DEMO_EMAIL.split('@')[0];
      finish(DISCORD_DEMO_EMAIL, name, `Connected with Discord`);
    }, SUBMIT_MS);
  };

  const copy = COPY[mode];
  const pw = strength(password);

  return (
    <div
      ref={dialogRef}
      className={`auth-dialog mode-${mode}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      aria-describedby="auth-sub"
      onKeyDown={(e) => trapTab(e, dialogRef.current)}
    >
      <BrandPanel />

      <div className="auth-main">
        <span className="auth-handle" aria-hidden="true" />
        <button className="auth-close" onClick={closeAuth} aria-label="Close">
          <Icon name="x" size={18} />
        </button>

        <div className="auth-mobile-brand" aria-hidden="true">
          <LogoMark size={22} />
          <span>{BRAND.wordmark}</span>
        </div>

        <div className="auth-swap" key={sentTo ? 'sent' : mode}>
          {sentTo ? (
            <div className="auth-sent">
              <span className="auth-sent-icon" aria-hidden="true">
                <Icon name="mail" size={26} />
                <span className="auth-sent-check">
                  <Icon name="check" size={12} strokeWidth={3} />
                </span>
              </span>
              <h2 id="auth-title" className="auth-title" ref={sentRef} tabIndex={-1}>
                Check your inbox
              </h2>
              <p id="auth-sub" className="auth-sub">
                We sent a reset link to <strong className="auth-strong">{sentTo}</strong>. It expires in 30 minutes. Can’t
                see it? Check spam or promotions.
              </p>
              <div className="auth-sent-actions">
                <button className="btn btn-primary btn-lg btn-block" onClick={() => openAuth('signin')}>
                  Back to sign in
                </button>
                <button
                  className="btn btn-quiet btn-block"
                  onClick={() => toast({ title: 'Reset link re-sent', body: `Sent again to ${sentTo}.`, tone: 'info' })}
                >
                  <Icon name="refresh" />
                  Resend email
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="auth-head">
                {mode === 'forgot' && (
                  <button className="auth-back" onClick={() => openAuth('signin')}>
                    <Icon name="arrow-left" size={15} />
                    Back to sign in
                  </button>
                )}
                <h2 id="auth-title" className="auth-title">
                  {copy.title}
                </h2>
                <p id="auth-sub" className="auth-sub">
                  {copy.sub}
                </p>
              </div>

              {mode !== 'forgot' && (
                <>
                  <button
                    type="button"
                    className="btn btn-lg btn-block auth-discord"
                    onClick={discord}
                    aria-disabled={!!loading || undefined}
                  >
                    {loading === 'discord' ? <span className="auth-spinner" aria-hidden="true" /> : <Icon name="discord" />}
                    {loading === 'discord' ? 'Connecting to Discord…' : 'Continue with Discord'}
                  </button>
                  <div className="auth-or">
                    <span>or with email</span>
                  </div>
                </>
              )}

              <form ref={formRef} className="auth-form" onSubmit={onSubmit} noValidate>
                {mode === 'register' && (
                  <AuthField id="auth-username" label="Username" icon="user" error={errors.username}>
                    <input
                      id="auth-username"
                      className="input"
                      type="text"
                      autoComplete="username"
                      placeholder="nightowl"
                      value={username}
                      maxLength={20}
                      onChange={(e) => setUsername(e.target.value)}
                      onBlur={blur('username')}
                      aria-invalid={!!errors.username}
                      aria-describedby={errors.username ? 'auth-username-err' : undefined}
                    />
                  </AuthField>
                )}

                <AuthField id="auth-email" label="Email" icon="mail" error={errors.email}>
                  <input
                    id="auth-email"
                    className="input"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={blur('email')}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'auth-email-err' : undefined}
                  />
                </AuthField>

                {mode !== 'forgot' && (
                  <AuthField
                    id="auth-password"
                    label="Password"
                    icon="lock"
                    error={errors.password}
                    aside={
                      mode === 'signin' && (
                        <button type="button" className="auth-link" onClick={() => openAuth('forgot')}>
                          Forgot password?
                        </button>
                      )
                    }
                    trailing={
                      <button
                        type="button"
                        className="auth-eye"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                        aria-pressed={showPw}
                      >
                        <Icon name={showPw ? 'eye-off' : 'eye'} size={17} />
                      </button>
                    }
                  >
                    <input
                      id="auth-password"
                      className="input"
                      type={showPw ? 'text' : 'password'}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={blur('password')}
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? 'auth-password-err' : mode === 'register' ? 'auth-strength' : undefined}
                    />
                  </AuthField>
                )}

                {mode === 'register' && (
                  <div className={`auth-strength s-${pw.score}`} id="auth-strength" aria-live="polite">
                    <span className="auth-strength-bars" aria-hidden="true">
                      {[1, 2, 3, 4].map((i) => (
                        <i key={i} className={i <= pw.score ? 'on' : ''} />
                      ))}
                    </span>
                    <span className="auth-strength-label">
                      {pw.score ? `${pw.label} password` : 'Mix letters, numbers and a symbol'}
                    </span>
                  </div>
                )}

                {mode === 'register' && (
                  <AuthField id="auth-confirm" label="Confirm password" icon="key" error={errors.confirm}>
                    <input
                      id="auth-confirm"
                      className="input"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      onBlur={blur('confirm')}
                      aria-invalid={!!errors.confirm}
                      aria-describedby={errors.confirm ? 'auth-confirm-err' : undefined}
                    />
                  </AuthField>
                )}

                {mode === 'signin' && (
                  <label className="checkbox auth-check">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                    Keep me signed in on this device
                  </label>
                )}

                {mode === 'register' && (
                  <div className="auth-terms">
                    <label className="checkbox auth-check">
                      <input
                        type="checkbox"
                        checked={terms}
                        onChange={(e) => setTerms(e.target.checked)}
                        aria-invalid={!!errors.terms}
                        aria-describedby={errors.terms ? 'auth-terms-err' : undefined}
                      />
                      <span>
                        I agree to the{' '}
                        <Link to="/legal/terms" onClick={closeAuth}>
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/legal/refunds" onClick={closeAuth}>
                          Refund Policy
                        </Link>
                        .
                      </span>
                    </label>
                    {errors.terms && <FieldError id="auth-terms-err">{errors.terms}</FieldError>}
                  </div>
                )}

                {/* aria-disabled rather than disabled: a disabled button loses focus mid-submit. */}
                <button
                  type="submit"
                  className="btn btn-primary btn-lg btn-block auth-submit"
                  aria-disabled={!!loading || undefined}
                >
                  {loading === 'email' ? (
                    <>
                      <span className="auth-spinner" aria-hidden="true" />
                      {mode === 'forgot' ? 'Sending…' : mode === 'register' ? 'Creating account…' : 'Signing in…'}
                    </>
                  ) : (
                    <>
                      {copy.cta}
                      <span className="chip-arrow">
                        <Icon name="arrow-right" />
                      </span>
                    </>
                  )}
                </button>
              </form>

              <p className="auth-switch">
                {mode === 'signin' && (
                  <>
                    New to {BRAND.name}?{' '}
                    <button type="button" className="auth-link" onClick={() => openAuth('register')}>
                      Create an account
                    </button>
                  </>
                )}
                {mode === 'register' && (
                  <>
                    Already have an account?{' '}
                    <button type="button" className="auth-link" onClick={() => openAuth('signin')}>
                      Sign in
                    </button>
                  </>
                )}
                {mode === 'forgot' && (
                  <>
                    Remembered it?{' '}
                    <button type="button" className="auth-link" onClick={() => openAuth('signin')}>
                      Sign in instead
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AuthField({
  id,
  label,
  icon,
  error,
  aside,
  trailing,
  children,
}: {
  id: string;
  label: string;
  icon: string;
  error?: string;
  aside?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`field auth-field${error ? ' has-error' : ''}${trailing ? ' has-trailing' : ''}`}>
      <div className="auth-label-row">
        <label className="label" htmlFor={id}>
          {label}
        </label>
        {aside}
      </div>
      <div className="input-wrap">
        <Icon name={icon} />
        {children}
        {trailing}
      </div>
      {error && <FieldError id={`${id}-err`}>{error}</FieldError>}
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span className="auth-error" id={id} role="alert">
      <Icon name="alert" size={13} />
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */

function BrandPanel() {
  return (
    <aside className="auth-brand" aria-hidden="true">
      <BrandArt />
      <div className="auth-brand-top">
        <Logo size={28} />
      </div>

      <div className="auth-brand-mid">
        <span className="eyebrow">Member area</span>
        <p className="auth-brand-title">
          Your keys, loaders
          <br />
          <span className="grad-text">and guides.</span>
        </p>
        <p className="auth-brand-lead">
          One account for every purchase. Guides update with every build, and support is one message away.
        </p>
        <ul className="auth-perks">
          {PERKS.map((p) => (
            <li key={p.title}>
              <span className="auth-perk-icon">
                <Icon name={p.icon} size={17} />
              </span>
              <span>
                <strong>{p.title}</strong>
                <span>{p.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="auth-proof">
        <span className="auth-proof-avatars">
          {['kxzzy', 'mirage', 'novaa', 'Tobi'].map((n) => (
            <Avatar key={n} name={n} size={28} />
          ))}
        </span>
        <span className="auth-proof-text">
          <span className="row gap-8">
            <Stars value={BRAND.rating} size={12} />
            <strong>{BRAND.rating}</strong>
          </span>
          <span>
            {BRAND.reviewCount.toLocaleString('en-US')} ratings · {BRAND.customers} players
          </span>
        </span>
      </div>
    </aside>
  );
}

/** Generated art for the brand panel: a masked grid with light slashes, plus a hex reticle emblem. */
function BrandArt() {
  const hex = (r: number) =>
    [-90, -30, 30, 90, 150, 210]
      .map((a) => {
        const t = (a * Math.PI) / 180;
        return `${(Math.cos(t) * r).toFixed(1)},${(Math.sin(t) * r).toFixed(1)}`;
      })
      .join(' ');
  return (
    <>
      <svg className="auth-art" viewBox="0 0 400 680" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="auth-art-slash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.45" />
            <stop offset="1" stopColor="var(--violet)" stopOpacity="0" />
          </linearGradient>
          <pattern id="auth-art-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke="#fff" strokeOpacity="0.05" />
          </pattern>
          <radialGradient id="auth-art-fade" cx="85%" cy="95%" r="75%">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="auth-art-mask">
            <rect width="400" height="680" fill="url(#auth-art-fade)" />
          </mask>
        </defs>
        <rect width="400" height="680" fill="url(#auth-art-grid)" mask="url(#auth-art-mask)" />
        <g style={{ mixBlendMode: 'screen' }} opacity="0.5">
          <polygon points="262,0 300,0 130,680 92,680" fill="url(#auth-art-slash)" opacity="0.3" />
          <polygon points="338,0 350,0 180,680 168,680" fill="url(#auth-art-slash)" opacity="0.45" />
        </g>
      </svg>

      <svg className="auth-emblem" viewBox="-200 -200 400 400" aria-hidden="true">
        <defs>
          <linearGradient id="auth-emblem-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b9f6ff" />
            <stop offset="0.5" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--violet)" />
          </linearGradient>
        </defs>
        <g fill="none">
          <polygon points={hex(196)} stroke="url(#auth-emblem-g)" strokeOpacity="0.14" strokeWidth="1.5" />
          <polygon points={hex(146)} stroke="url(#auth-emblem-g)" strokeOpacity="0.24" strokeWidth="1.5" />
          <polygon points={hex(96)} stroke="url(#auth-emblem-g)" strokeOpacity="0.45" strokeWidth="2" />
          <circle r="120" stroke="#fff" strokeOpacity="0.14" strokeDasharray="2 8" />
          <circle r="50" stroke="var(--accent)" strokeOpacity="0.55" strokeWidth="1.5" />
          <circle r="5" fill="var(--accent)" />
          <path d="M-78 0H-60M60 0H78M0 -78V-60M0 60V78" stroke="var(--accent)" strokeOpacity="0.6" strokeWidth="2" />
        </g>
      </svg>
    </>
  );
}
