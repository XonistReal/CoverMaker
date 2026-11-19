import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { BRAND } from '../config';
import { FAQS, GAMES, PRODUCTS } from '../data/catalog';
import type { Faq } from '../data/types';
import { Icon } from '../components/Icon';
import { Accordion, Avatar, EmptyState, Reveal, SectionHeader } from '../components/ui';
import { Link } from '../router';
import { useUI } from '../state/store';
import './support.css';

/* =====================================================================
   Support page: #/support
   Hero with live reply stat + FAQ search, contact channels, setup guides
   (modal), searchable FAQ and a front-end-only ticket form.
   ===================================================================== */

/* ------------------------------------------------------------------ */
/* Local mock data                                                     */
/* ------------------------------------------------------------------ */

const TICKET_PREFIX = BRAND.keyPrefix;

type FaqCategory = Faq['category'];

const EXTRA_FAQS: Faq[] = [
  {
    category: 'Setup',
    q: 'The loader says "driver failed to load". What do I do?',
    a: 'That error almost always means another driver is holding the slot or Windows is out of date. Restart fully (not Fast Startup), close RGB, overlay and macro tools, update Windows, then try again. If it still fails, open a ticket and attach loader.log so we can read the exact cause.',
  },
  {
    category: 'Setup',
    q: 'My antivirus deleted the loader. Is it a virus?',
    a: 'No. Antivirus engines flag any tool that interacts with another process, so they quarantine the loader by reflex. Restore it from Protection history, add a folder exclusion for your tools folder only, and re-download from your dashboard if the file was damaged. Our Defender exclusions guide covers it step by step.',
  },
  {
    category: 'Setup',
    q: 'Can I use my key on a different PC?',
    a: 'Yes. A key is bound to one machine at a time. You can reset the HWID binding yourself from your dashboard once every 7 days, and support can grant an extra reset if you are upgrading hardware.',
  },
  {
    category: 'General',
    q: 'Can I swap my key for a different game?',
    a: 'Unused keys can be swapped for any product of equal or lower value within 24 hours of purchase. Open a ticket with your order number and the product you want instead, and we will move it over.',
  },
  {
    category: 'Payments',
    q: 'I paid but did not receive my key.',
    a: 'Card, Apple Pay, Google Pay and PayPal orders deliver instantly. Crypto waits for network confirmations, usually 2 to 10 minutes. If it has been longer than 15 minutes, check your spam folder, then open a ticket with your order number and transaction ID.',
  },
  {
    category: 'Safety',
    q: 'Do you store my card or payment details?',
    a: 'No. Payments are handled end-to-end by our payment processors. We only ever see the order total, the method you used and a reference number. Details are in our Privacy Policy.',
  },
  {
    category: 'Safety',
    q: 'Should I use an HWID spoofer?',
    a: 'If any account on this PC has been banned before, yes. Anti-cheats fingerprint your hardware, and a spoofer keeps a new account from inheriting the old ban. If your hardware is clean you do not need one.',
  },
];

interface FaqEntry extends Faq {
  id: string;
}

const ALL_FAQS: FaqEntry[] = [...FAQS, ...EXTRA_FAQS].map((f, i) => ({ ...f, id: `faq-${i}` }));

const CAT_ORDER: FaqCategory[] = ['General', 'Setup', 'Payments', 'Safety'];
const CATEGORIES = CAT_ORDER.filter((c) => ALL_FAQS.some((f) => f.category === c));
const CAT_ICON: Record<FaqCategory, string> = { General: 'info', Setup: 'wrench', Payments: 'card', Safety: 'shield' };

const POPULAR_SEARCHES = [
  { label: 'Refunds', q: 'refund' },
  { label: 'HWID reset', q: 'hwid' },
  { label: 'Driver error', q: 'driver' },
  { label: 'Crypto', q: 'crypto' },
  { label: 'Antivirus', q: 'antivirus' },
];

const AGENTS: { name: string; role: string; busy: boolean }[] = [
  { name: 'Mila', role: 'Setup specialist', busy: false },
  { name: 'Dex', role: 'Payments & billing', busy: true },
  { name: 'Sora', role: 'Spoofers & HWID', busy: false },
  { name: 'Kai', role: 'Night shift lead', busy: false },
];

/** First-reply time per hour over the last 24h, in minutes. */
const REPLY_BARS = [
  3.4, 2.9, 2.6, 2.4, 2.8, 3.1, 3.6, 4.2, 4.8, 5.4, 6.0, 5.1, 4.4, 3.9, 3.5, 3.8, 4.6, 5.2, 4.7, 4.1, 3.6, 3.3, 3.7, 3.6,
];
const BAR_MAX = Math.max(...REPLY_BARS);

type ChannelAction = 'chat' | 'discord' | 'ticket' | 'email';

interface Channel {
  id: ChannelAction;
  icon: string;
  title: string;
  body: string;
  eta: string;
  etaTone: 'ok' | 'accent' | 'info' | 'neutral';
  cta: string;
  featured?: boolean;
}

const CHANNELS: Channel[] = [
  {
    id: 'chat',
    icon: 'message',
    title: 'Live chat',
    body: 'Talk to a real agent in seconds. Best for setup snags, payment questions and quick status checks.',
    eta: '~2 min',
    etaTone: 'ok',
    cta: 'Start a chat',
    featured: true,
  },
  {
    id: 'discord',
    icon: 'discord',
    title: 'Discord',
    body: `Join ${BRAND.customers} players for patch alerts, giveaways and a staffed help channel.`,
    eta: '~5 min',
    etaTone: 'accent',
    cta: 'Join the server',
  },
  {
    id: 'ticket',
    icon: 'ticket',
    title: 'Open a ticket',
    body: 'Refunds, key swaps and anything that needs logs or screenshots. Tracked until it is solved.',
    eta: '< 1 hour',
    etaTone: 'info',
    cta: 'Write a ticket',
  },
  {
    id: 'email',
    icon: 'mail',
    title: 'Email',
    body: 'Prefer your inbox? Write to us any time and keep the whole thread in one place.',
    eta: '< 12 hours',
    etaTone: 'neutral',
    cta: BRAND.supportEmail,
  },
];

interface GuideStep {
  title: string;
  body: string;
}

interface Guide {
  id: string;
  icon: string;
  tag: string;
  title: string;
  summary: string;
  minutes: number;
  level: 'Beginner' | 'Intermediate';
  steps: GuideStep[];
  tip: string;
}

const GUIDES: Guide[] = [
  {
    id: 'loader',
    icon: 'rocket',
    tag: 'Setup',
    title: 'Getting started with the loader',
    summary: 'From key to in-game menu in under five minutes, on any supported product.',
    minutes: 4,
    level: 'Beginner',
    steps: [
      { title: 'Grab your key and loader', body: 'Both appear in your dashboard and your order email the moment payment clears. Always download the loader from your dashboard, never from a link someone sends you.' },
      { title: 'Save it to its own folder', body: 'Create a folder such as C:\\Tools and keep the loader there. Avoid OneDrive or other synced folders, which can lock the file mid-launch.' },
      { title: 'Run it as administrator', body: 'Right-click the loader and choose Run as administrator. It starts a short-lived service and removes it again when you close the loader.' },
      { title: 'Log in with your key', body: 'Paste your key and press Log in. The first login binds the key to this PC; you can reset that binding from your dashboard every 7 days.' },
      { title: 'Launch the game', body: 'Wait for the loader to show Ready, then start the game. Open the menu in the lobby with the Insert key and pick a preset to begin.' },
    ],
    tip: 'Check the live status page before every session. If a product is not green, do not load it.',
  },
  {
    id: 'spoofer',
    icon: 'cpu',
    tag: 'Spoofer',
    title: 'Installing a HWID spoofer',
    summary: 'Run a temp or perm spoof cleanly so a fresh account starts on a fresh identity.',
    minutes: 6,
    level: 'Intermediate',
    steps: [
      { title: 'Choose temp or perm', body: 'Temp spoofs revert on reboot and suit trying a new account. Perm changes your serials once and keeps them changed. Not sure? Ask in live chat before you buy.' },
      { title: 'Close games and launchers', body: 'Fully exit every game, launcher and anti-cheat service from the system tray. A launcher left running can cache your old identifiers.' },
      { title: 'Run the spoofer first', body: 'Open the spoofer as administrator and press Spoof. Wait for every row to show a tick before you start anything else.' },
      { title: 'Verify the change', body: 'Press Check serials to compare the before and after values. Every listed identifier should now read differently.' },
      { title: 'Sign in on a fresh account', body: 'Old accounts stay linked to the old identity, so start clean. Temp users: repeat the spoof after every restart, before launching a game.' },
    ],
    tip: 'Run the spoofer before the cheat loader, never after. Order matters.',
  },
  {
    id: 'driver',
    icon: 'wrench',
    tag: 'Troubleshooting',
    title: 'Fixing "driver failed to load"',
    summary: 'The most common loader error and the five checks that clear it nine times out of ten.',
    minutes: 5,
    level: 'Beginner',
    steps: [
      { title: 'Do a full restart', body: 'A pending Windows update or a previous session can hold the driver slot. Use Restart rather than Shut down, since Fast Startup keeps the old state.' },
      { title: 'Close conflicting software', body: 'Quit RGB and fan utilities, overlays, macro tools, virtual machines and any other tool that loads its own driver.' },
      { title: 'Check Core isolation', body: 'Open Windows Security, then Device security, then Core isolation. If the product page lists Memory integrity as unsupported, switch it off and restart.' },
      { title: 'Update Windows', body: 'Builds older than 22H2 are missing components the loader relies on. Run Windows Update, install everything, and reboot.' },
      { title: 'Send us loader.log', body: 'Still failing? Open a ticket and attach loader.log from the loader folder. A specialist will read it and reply with the exact fix.' },
    ],
    tip: 'Never run two loaders at once. Close every other tool before you launch ours.',
  },
  {
    id: 'defender',
    icon: 'shield-check',
    tag: 'Windows',
    title: 'Adding Windows Defender exclusions safely',
    summary: 'Stop the loader from being quarantined without switching your protection off.',
    minutes: 3,
    level: 'Beginner',
    steps: [
      { title: 'Understand the flag', body: 'Tools that interact with another process trip antivirus heuristics. A narrow exclusion is far safer than disabling protection entirely.' },
      { title: 'Open Virus & threat protection', body: 'In Windows Security, open Virus & threat protection, then Manage settings under the settings heading.' },
      { title: 'Exclude one folder only', body: 'Under Exclusions choose Add or remove exclusions, then Folder, and pick only your tools folder. Never exclude a whole drive.' },
      { title: 'Restore anything quarantined', body: 'If the loader vanished, open Protection history and restore it, or re-download a fresh copy from your dashboard.' },
      { title: 'Leave real-time protection on', body: 'There is no need to turn Defender off. Keep it running for everything else on your PC.' },
    ],
    tip: 'We never send files over Discord DMs. Only download from your dashboard.',
  },
  {
    id: 'move-pc',
    icon: 'refresh',
    tag: 'Account',
    title: 'Moving your key to a new PC',
    summary: 'Reset your HWID binding yourself and be back in game on new hardware in minutes.',
    minutes: 2,
    level: 'Beginner',
    steps: [
      { title: 'Open your dashboard', body: 'Sign in and open Licenses. Every active key and the machine it is bound to are listed there.' },
      { title: 'Press Reset binding', body: 'Choose the key and press Reset binding. Self-service resets are available once every 7 days per key.' },
      { title: 'Log in on the new PC', body: 'Install the loader on the new machine and log in with the same key. It binds to the new hardware automatically.' },
      { title: 'Need another reset?', body: 'Upgrading parts or reinstalling Windows twice in a week? Open a ticket with your order number and we will grant an extra reset.' },
    ],
    tip: 'Your configs live in the cloud, so they follow your key to the new machine.',
  },
  {
    id: 'stream',
    icon: 'monitor',
    tag: 'Streaming',
    title: 'Keeping the overlay stream-proof',
    summary: 'Make sure the menu and visuals never show up on stream, in clips or on screen share.',
    minutes: 3,
    level: 'Intermediate',
    steps: [
      { title: 'Turn on Stream-proof', body: 'Open the menu, go to Settings and enable Stream-proof. The overlay is then excluded from capture APIs.' },
      { title: 'Use Game or Window capture', body: 'In OBS or similar, capture the game window rather than the full display. It is cleaner and uses less GPU.' },
      { title: 'Test with a private recording', body: 'Record thirty seconds with the menu open and play it back before you go live. Nothing from the overlay should appear.' },
      { title: 'Mind third-party overlays', body: 'Discord and GPU overlays can re-capture the screen. Disable them for the game if anything shows in your test.' },
    ],
    tip: 'Stream-proof support is listed under Requirements on every product page.',
  },
];

const TICKET_CATEGORIES = [
  'Setup & installation',
  'Payment & delivery',
  'Refund request',
  'HWID reset & account',
  'Product status',
  'Something else',
];

const PRODUCT_GROUPS = GAMES.map((g) => ({ game: g, products: PRODUCTS.filter((p) => p.gameSlug === g.slug) })).filter(
  (g) => g.products.length > 0,
);

/* ------------------------------------------------------------------ */
/* Search helpers                                                      */
/* ------------------------------------------------------------------ */

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/["“”]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function faqMatches(f: Faq, toks: string[]) {
  const hay = `${f.q} ${f.a} ${f.category}`.toLowerCase();
  return toks.every((t) => hay.includes(t));
}

function searchFaqs(list: FaqEntry[], toks: string[]): FaqEntry[] {
  if (!toks.length) return list;
  const hits = list.filter((f) => faqMatches(f, toks));
  const inTitle = (f: FaqEntry) => toks.every((t) => f.q.toLowerCase().includes(t));
  return [...hits.filter(inTitle), ...hits.filter((f) => !inTitle(f))];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function highlight(text: string, toks: string[]): ReactNode {
  if (!toks.length) return text;
  const re = new RegExp(`(${toks.map(escapeRe).join('|')})`, 'gi');
  const parts = text.split(re);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="sup-mark">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/** Median first reply that drifts a few seconds so the chip feels live. */
function useLiveMedian(start = 221) {
  const [sec, setSec] = useState(start);
  useEffect(() => {
    const t = window.setInterval(() => {
      setSec((v) => Math.max(start - 14, Math.min(start + 14, v + Math.round((Math.random() - 0.5) * 6))));
    }, 4200);
    return () => window.clearInterval(t);
  }, [start]);
  return sec;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function SupportPage() {
  const { setChatOpen } = useUI();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<FaqCategory | 'All'>('All');
  const [jump, setJump] = useState<{ id: string; n: number } | null>(null);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [prefill, setPrefill] = useState<{ category: string; n: number } | null>(null);

  const openTicket = useCallback((category?: string) => {
    if (category) setPrefill((p) => ({ category, n: (p?.n ?? 0) + 1 }));
    scrollToId('sup-ticket');
    window.setTimeout(() => document.getElementById('sup-t-name')?.focus({ preventScroll: true }), 650);
  }, []);

  const jumpTo = useCallback((id: string) => {
    setCat('All');
    setJump((j) => ({ id, n: (j?.n ?? 0) + 1 }));
    window.setTimeout(() => scrollToId('sup-faq'), 30);
  }, []);

  const seeAll = useCallback(() => {
    setCat('All');
    setJump(null);
    window.setTimeout(() => scrollToId('sup-faq'), 30);
  }, []);

  const updateQuery = useCallback((q: string) => {
    setQuery(q);
    setJump(null);
  }, []);

  return (
    <div className="page sup">
      <Hero query={query} setQuery={updateQuery} onJump={jumpTo} onSeeAll={seeAll} />
      <Channels onTicket={() => openTicket()} />
      <Guides onOpen={setGuide} />
      <FaqBlock
        query={query}
        setQuery={updateQuery}
        cat={cat}
        setCat={(c) => {
          setCat(c);
          setJump(null);
        }}
        jump={jump}
        onChat={() => setChatOpen(true)}
        onTicket={() => openTicket()}
      />
      <TicketSection prefill={prefill} onChat={() => setChatOpen(true)} />
      {guide && (
        <GuideModal
          key={guide.id}
          guide={guide}
          onClose={() => setGuide(null)}
          onTicket={() => {
            setGuide(null);
            openTicket(TICKET_CATEGORIES[0]);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero({
  query,
  setQuery,
  onJump,
  onSeeAll,
}: {
  query: string;
  setQuery: (q: string) => void;
  onJump: (id: string) => void;
  onSeeAll: () => void;
}) {
  const { setChatOpen } = useUI();
  const median = useLiveMedian();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  const toks = useMemo(() => tokenize(query), [query]);
  const results = useMemo(() => searchFaqs(ALL_FAQS, toks), [toks]);
  const shown = toks.length ? results.slice(0, 5) : [];
  const showPop = open && toks.length > 0;
  const online = AGENTS.filter((a) => !a.busy).length;

  useEffect(() => setActive(-1), [query]);

  // "/" focuses the search, like most docs sites.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      e.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  // Close the popover on outside click.
  useEffect(() => {
    if (!open) return;
    const on = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', on);
    return () => document.removeEventListener('pointerdown', on);
  }, [open]);

  const pick = (id: string) => {
    setOpen(false);
    inputRef.current?.blur();
    onJump(id);
  };

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (query) setQuery('');
      else setOpen(false);
      return;
    }
    if (!toks.length) return;
    const max = shown.length; // index `max` = "see all" row
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a >= max ? 0 : a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? max : a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && active < shown.length) pick(shown[active].id);
      else {
        setOpen(false);
        inputRef.current?.blur();
        onSeeAll();
      }
    }
  };

  return (
    <section className="sup-hero" aria-labelledby="sup-title">
      <div className="sup-hero-bg" aria-hidden="true">
        <div className="bg-grid" />
        <div className="glow-blob sup-glow-a" />
        <div className="glow-blob sup-glow-b" />
      </div>

      <div className="container sup-hero-grid">
        <div className="sup-hero-main anim-fade-up">
          <span className="eyebrow">Support</span>
          <h1 className="h1" id="sup-title">
            Help that never
            <br />
            <span className="accent">logs off.</span>
          </h1>
          <p className="lead sup-hero-lead">
            Setup snags, payments, HWID resets or a build that will not load: our in-house team answers in minutes,
            not days. Search the answers below or reach a human right now.
          </p>

          <div className="sup-hero-chips">
            <span className="sup-live-chip" aria-live="off">
              <span className="dot ok pulse" aria-hidden="true" />
              <span className="sup-live-label">Median first reply</span>
              <strong className="mono tabular">{formatDuration(median)}</strong>
            </span>
            <span className="pill">
              <Icon name="users" />
              {online} agents available
            </span>
            <span className="pill sup-pill-hide-sm">
              <Icon name="globe" />
              24/7/365, every timezone
            </span>
          </div>

          <div className="sup-search" ref={boxRef}>
            <label htmlFor="sup-search-input" className="sr-only">
              Search support answers
            </label>
            <div className={`sup-search-field${showPop ? ' is-open' : ''}`}>
              <Icon name="search" className="sup-search-icon" />
              <input
                ref={inputRef}
                id="sup-search-input"
                className="sup-search-input"
                type="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Search answers: refunds, HWID reset, driver error…"
                value={query}
                role="combobox"
                aria-expanded={showPop}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={showPop && active >= 0 ? `${listId}-${active}` : undefined}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKey}
              />
              {query ? (
                <button
                  type="button"
                  className="sup-search-clear"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                >
                  <Icon name="x" size={16} />
                </button>
              ) : (
                <kbd className="sup-kbd" aria-hidden="true">
                  /
                </kbd>
              )}
            </div>

            {showPop && (
              <div className="sup-search-pop" role="listbox" id={listId} aria-label="Matching answers">
                <div className="sup-search-pop-head">
                  <span className="tiny mono muted">
                    {results.length} {results.length === 1 ? 'ANSWER' : 'ANSWERS'}
                  </span>
                  <span className="tiny mono muted sup-pop-keys">↑ ↓ to move · ↵ to open</span>
                </div>
                {shown.length ? (
                  <>
                    {shown.map((f, i) => (
                      <button
                        key={f.id}
                        id={`${listId}-${i}`}
                        type="button"
                        role="option"
                        aria-selected={active === i}
                        className={`sup-search-opt${active === i ? ' is-active' : ''}`}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => pick(f.id)}
                      >
                        <span className="sup-search-opt-icon" aria-hidden="true">
                          <Icon name={CAT_ICON[f.category]} size={15} />
                        </span>
                        <span className="sup-search-opt-text">
                          <span className="sup-search-opt-q">{highlight(f.q, toks)}</span>
                          <span className="sup-search-opt-cat">{f.category}</span>
                        </span>
                        <Icon name="arrow-right" size={15} className="sup-search-opt-go" />
                      </button>
                    ))}
                    <button
                      id={`${listId}-${shown.length}`}
                      type="button"
                      role="option"
                      aria-selected={active === shown.length}
                      className={`sup-search-all${active === shown.length ? ' is-active' : ''}`}
                      onMouseEnter={() => setActive(shown.length)}
                      onClick={() => {
                        setOpen(false);
                        onSeeAll();
                      }}
                    >
                      See all {results.length} in the FAQ
                      <Icon name="chevron-down" size={15} />
                    </button>
                  </>
                ) : (
                  <div className="sup-search-none">
                    <p className="small text-2">
                      Nothing matches <strong>“{query.trim()}”</strong>. A human will know.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setOpen(false);
                        setChatOpen(true);
                      }}
                    >
                      <Icon name="message" />
                      Ask in live chat
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="sup-popular">
            <span className="sup-popular-label">Popular</span>
            {POPULAR_SEARCHES.map((p) => (
              <button
                key={p.q}
                type="button"
                className={`sup-popular-chip${query.trim().toLowerCase() === p.q ? ' is-active' : ''}`}
                onClick={() => {
                  setQuery(p.q);
                  setOpen(true);
                  inputRef.current?.focus();
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <aside className="sup-desk anim-fade-up" style={{ ['--delay' as string]: '120ms' } as CSSProperties} aria-label="Support desk right now">
          <div className="sup-desk-head">
            <div className="stack gap-4">
              <span className="sup-desk-kicker">Support desk</span>
              <strong className="sup-desk-title">All hands online</strong>
            </div>
            <span className="badge badge-ok">
              <span className="dot ok pulse" aria-hidden="true" />
              Live
            </span>
          </div>

          <ul className="sup-desk-agents">
            {AGENTS.map((a) => (
              <li key={a.name} className="sup-agent">
                <span className="sup-agent-av">
                  <Avatar name={a.name} size={36} />
                  <span className={`sup-agent-dot${a.busy ? ' is-busy' : ''}`} aria-hidden="true" />
                </span>
                <span className="sup-agent-meta">
                  <strong>{a.name}</strong>
                  <span>{a.role}</span>
                </span>
                <span className={`sup-agent-state mono${a.busy ? ' is-busy' : ''}`}>{a.busy ? 'In a chat' : 'Available'}</span>
              </li>
            ))}
          </ul>

          <div className="sup-desk-chart">
            <div className="sup-desk-chart-head">
              <span className="sup-desk-kicker">First reply · last 24h</span>
              <span className="tiny mono text-2">peak {formatDuration(Math.round(BAR_MAX * 60))}</span>
            </div>
            <div className="sup-bars" role="img" aria-label={`First reply times over the last 24 hours, peaking at ${formatDuration(Math.round(BAR_MAX * 60))}`}>
              {REPLY_BARS.map((v, i) => (
                <span
                  key={i}
                  className={i === REPLY_BARS.length - 1 ? 'is-now' : undefined}
                  style={{ height: `${Math.round((v / BAR_MAX) * 100)}%` }}
                />
              ))}
            </div>
            <div className="sup-bars-axis mono" aria-hidden="true">
              <span>-24h</span>
              <span>-12h</span>
              <span>now</span>
            </div>
          </div>

          <div className="sup-desk-foot">
            <span className="small text-2">
              <strong className="sup-desk-queue">0</strong> waiting, you would be next
            </span>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setChatOpen(true)}>
              <Icon name="message" />
              Start chat
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Contact channels                                                    */
/* ------------------------------------------------------------------ */

function Channels({ onTicket }: { onTicket: () => void }) {
  const { setChatOpen } = useUI();
  const discordExternal = /^https?:/i.test(BRAND.discordUrl);

  const inner = (c: Channel) => (
    <>
      <span className="sup-channel-top">
        <span className={`icon-tile${c.featured ? ' is-accent' : ''} sup-channel-icon`}>
          <Icon name={c.icon} />
        </span>
        {c.featured ? (
          <span className="badge badge-solid">Fastest</span>
        ) : (
          <span className="sup-channel-arrow" aria-hidden="true">
            <Icon name={c.id === 'discord' || c.id === 'email' ? 'arrow-up-right' : 'arrow-right'} size={16} />
          </span>
        )}
      </span>
      <span className="sup-channel-title">{c.title}</span>
      <span className="sup-channel-body">{c.body}</span>
      <span className="sup-channel-foot">
        <span className={`sup-eta tone-${c.etaTone}`}>
          <Icon name="clock" size={13} />
          <span className="sr-only">Typical response </span>
          {c.eta}
        </span>
        <span className={`sup-channel-cta${c.id === 'email' ? ' mono' : ''}`}>
          {c.cta}
          {c.featured && <Icon name="arrow-right" size={15} />}
        </span>
      </span>
    </>
  );

  return (
    <section className="section-sm sup-channels" aria-labelledby="sup-channels-title">
      <div className="container">
        <div className="section-head">
          <div className="titles">
            <span className="eyebrow">Contact</span>
            <h2 className="h2" id="sup-channels-title">
              Pick a channel.
              <br />
              <span className="accent">Get a human.</span>
            </h2>
          </div>
          <p className="lead sup-section-aside">
            No bots, no outsourced call centre. Every channel is staffed by the people who build and test the tools.
          </p>
        </div>

        <div className="sup-channel-grid">
          {CHANNELS.map((c, i) => {
            const cls = `sup-channel${c.featured ? ' is-featured' : ''}`;
            let el: ReactNode;
            if (c.id === 'chat') {
              el = (
                <button type="button" className={cls} onClick={() => setChatOpen(true)}>
                  {inner(c)}
                </button>
              );
            } else if (c.id === 'ticket') {
              el = (
                <button type="button" className={cls} onClick={onTicket}>
                  {inner(c)}
                </button>
              );
            } else if (c.id === 'discord') {
              el = (
                <a
                  className={cls}
                  href={BRAND.discordUrl}
                  {...(discordExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {inner(c)}
                </a>
              );
            } else {
              el = (
                <a className={cls} href={`mailto:${BRAND.supportEmail}`}>
                  {inner(c)}
                </a>
              );
            }
            return (
              <Reveal key={c.id} delay={i * 70} className="sup-channel-cell">
                {el}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Setup guides                                                        */
/* ------------------------------------------------------------------ */

function Guides({ onOpen }: { onOpen: (g: Guide) => void }) {
  return (
    <section className="section-sm sup-guides" aria-labelledby="sup-guides-title">
      <div className="container">
        <SectionHeader
          eyebrow="Setup guides"
          title={
            <span id="sup-guides-title">
              Fix it yourself
              <br />
              <span className="accent">in five minutes.</span>
            </span>
          }
          action={
            <span className="pill">
              <Icon name="refresh" />
              Reviewed after every patch
            </span>
          }
        />
        <div className="sup-guide-grid">
          {GUIDES.map((g, i) => (
            <Reveal key={g.id} delay={(i % 3) * 70} className="sup-guide-cell">
              <button type="button" className="sup-guide" onClick={() => onOpen(g)} aria-haspopup="dialog">
                <span className="sup-guide-top">
                  <span className="icon-tile sup-guide-icon">
                    <Icon name={g.icon} />
                  </span>
                  <span className="sup-guide-tag">{g.tag}</span>
                </span>
                <span className="sup-guide-title">{g.title}</span>
                <span className="sup-guide-summary">{g.summary}</span>
                <span className="sup-guide-foot">
                  <span className="sup-guide-meta mono">
                    <Icon name="clock" size={13} />
                    {g.minutes} min read
                    <span className="sup-guide-sep" aria-hidden="true" />
                    {g.steps.length} steps
                  </span>
                  <span className="sup-guide-chev" aria-hidden="true">
                    <Icon name="chevron-right" size={16} />
                  </span>
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function GuideModal({ guide, onClose, onTicket }: { guide: Guide; onClose: () => void; onTicket: () => void }) {
  const [done, setDone] = useState<Set<number>>(() => new Set());
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const closingRef = useRef(false);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(onClose, 240);
  }, [onClose]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      prev?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const els = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [close]);

  const toggle = (i: number) =>
    setDone((d) => {
      const n = new Set(d);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const total = guide.steps.length;
  const pct = Math.round((done.size / total) * 100);
  const complete = done.size === total;

  return createPortal(
    <div className={`sup-modal-root${closing ? ' is-closing' : ''}`}>
      <div className="sup-modal-backdrop" onClick={close} aria-hidden="true" />
      <div className="sup-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef}>
        <span className="sup-modal-grab" aria-hidden="true" />
        <header className="sup-modal-head">
          <span className="icon-tile is-accent sup-modal-icon">
            <Icon name={guide.icon} />
          </span>
          <div className="sup-modal-titles">
            <span className="sup-modal-meta">
              {guide.tag}
              <span className="sup-guide-sep" aria-hidden="true" />
              {guide.minutes} min
              <span className="sup-modal-level">
                <span className="sup-guide-sep" aria-hidden="true" />
                {guide.level}
              </span>
            </span>
            <h2 className="h3" id={titleId}>
              {guide.title}
            </h2>
            <p className="small text-2">{guide.summary}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm sup-modal-x" onClick={close} ref={closeRef} aria-label="Close guide">
            <Icon name="x" />
          </button>
        </header>

        <div className="sup-modal-body">
        <div className="sup-modal-progress">
          <div className="sup-modal-progress-row">
            <span className="tiny mono text-2">
              {complete ? 'All steps done' : `${done.size} of ${total} steps done`}
            </span>
            <span className="tiny mono muted">{pct}%</span>
          </div>
          <div className="sup-modal-bar" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>

        <ol className="sup-steps">
          {guide.steps.map((s, i) => {
            const isDone = done.has(i);
            return (
              <li key={i} className={`sup-step${isDone ? ' is-done' : ''}`}>
                <button
                  type="button"
                  className="sup-step-check"
                  aria-pressed={isDone}
                  aria-label={`Mark step ${i + 1} as ${isDone ? 'not done' : 'done'}`}
                  onClick={() => toggle(i)}
                >
                  {isDone ? <Icon name="check" size={15} strokeWidth={2.6} /> : <span className="mono">{i + 1}</span>}
                </button>
                <div className="sup-step-text">
                  <h3 className="sup-step-title">{s.title}</h3>
                  <p className="sup-step-body">{s.body}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="sup-modal-tip">
          <Icon name="info" size={17} />
          <p>{guide.tip}</p>
        </div>
        </div>

        <footer className="sup-modal-foot">
          <span className="small muted sup-modal-foot-note">Still stuck after the last step?</span>
          <div className="row gap-8 sup-modal-foot-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onTicket}>
              <Icon name="ticket" />
              Open a ticket
            </button>
            <button type="button" className={`btn btn-sm ${complete ? 'btn-primary' : 'btn-white'}`} onClick={close}>
              {complete ? <Icon name="check-circle" /> : null}
              {complete ? 'All set' : 'Done'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

function FaqBlock({
  query,
  setQuery,
  cat,
  setCat,
  jump,
  onChat,
  onTicket,
}: {
  query: string;
  setQuery: (q: string) => void;
  cat: FaqCategory | 'All';
  setCat: (c: FaqCategory | 'All') => void;
  jump: { id: string; n: number } | null;
  onChat: () => void;
  onTicket: () => void;
}) {
  const toks = useMemo(() => tokenize(query), [query]);
  const matched = useMemo(() => searchFaqs(ALL_FAQS, toks), [toks]);
  const list = cat === 'All' ? matched : matched.filter((f) => f.category === cat);
  const countFor = (c: FaqCategory | 'All') => (c === 'All' ? matched.length : matched.filter((f) => f.category === c).length);
  const openIdx = jump ? Math.max(0, list.findIndex((f) => f.id === jump.id)) : 0;

  const items = list.map((f) => ({
    q: (
      <span className="sup-faq-q">
        {cat === 'All' && <span className="sup-faq-tag">{f.category}</span>}
        <span>{highlight(f.q, toks)}</span>
      </span>
    ),
    a: <p>{highlight(f.a, toks)}</p>,
  }));

  const chips: (FaqCategory | 'All')[] = ['All', ...CATEGORIES];

  return (
    <section className="section-sm sup-faq" id="sup-faq" aria-labelledby="sup-faq-title">
      <div className="container sup-faq-grid">
        <div className="sup-faq-side">
          <span className="eyebrow">FAQ</span>
          <h2 className="h2" id="sup-faq-title">
            Answers,
            <br />
            <span className="accent">straight up.</span>
          </h2>
          <p className="lead sup-faq-lead">The questions our team hears most, minus the fluff.</p>

          <label className="input-wrap sup-faq-search">
            <span className="sr-only">Filter questions</span>
            <Icon name="search" />
            <input
              className="input"
              type="search"
              placeholder="Filter questions…"
              value={query}
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <div className="sup-cats" role="group" aria-label="Filter by category">
            {chips.map((c) => {
              const n = countFor(c);
              const on = cat === c;
              return (
                <button
                  key={c}
                  type="button"
                  className={`sup-cat${on ? ' is-active' : ''}`}
                  aria-pressed={on}
                  onClick={() => setCat(c)}
                >
                  {c !== 'All' && <Icon name={CAT_ICON[c]} size={14} />}
                  {c}
                  <span className="sup-cat-n mono tabular">{n}</span>
                </button>
              );
            })}
          </div>

          <div className="sup-stuck card">
            <div className="sup-stuck-avatars" aria-hidden="true">
              {AGENTS.slice(0, 3).map((a) => (
                <Avatar key={a.name} name={a.name} size={32} />
              ))}
              <span className="sup-stuck-dot" />
            </div>
            <div className="stack gap-4">
              <strong className="h4">Still stuck?</strong>
              <span className="small muted">A specialist replies in minutes, day or night.</span>
            </div>
            <div className="sup-stuck-actions">
              <button type="button" className="btn btn-white btn-sm" onClick={onChat}>
                <Icon name="message" />
                Live chat
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onTicket}>
                <Icon name="ticket" />
                Ticket
              </button>
            </div>
          </div>
        </div>

        <div className="sup-faq-main">
          <div className="sup-faq-meta" aria-live="polite">
            <span className="small muted">
              Showing <strong className="text-2 tabular">{list.length}</strong> of {ALL_FAQS.length} answers
              {cat !== 'All' && (
                <>
                  {' '}
                  in <strong className="text-2">{cat}</strong>
                </>
              )}
              {toks.length > 0 && (
                <>
                  {' '}
                  for <strong className="text-2">“{query.trim()}”</strong>
                </>
              )}
            </span>
            {(toks.length > 0 || cat !== 'All') && (
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() => {
                  setQuery('');
                  setCat('All');
                }}
              >
                <Icon name="x" />
                Reset
              </button>
            )}
          </div>

          {list.length ? (
            <Accordion key={`${cat}|${query}|${jump ? `${jump.id}-${jump.n}` : ''}`} items={items} defaultOpen={openIdx} />
          ) : (
            <div className="sup-faq-empty">
              <EmptyState
                icon="search"
                title={toks.length ? `No answers for “${query.trim()}”` : 'Nothing in this category yet'}
                body="Try a shorter search or another category. Or skip the reading: a human is online right now."
                action={
                  <div className="row gap-8 wrap sup-faq-empty-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setQuery('');
                        setCat('All');
                      }}
                    >
                      Clear filters
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={onChat}>
                      <Icon name="message" />
                      Ask in live chat
                    </button>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ticket form                                                         */
/* ------------------------------------------------------------------ */

interface TicketFields {
  name: string;
  email: string;
  order: string;
  category: string;
  product: string;
  message: string;
}

type TicketErrors = Partial<Record<keyof TicketFields | 'file', string>>;

const EMPTY_TICKET: TicketFields = { name: '', email: '', order: '', category: '', product: '', message: '' };
const MAX_MESSAGE = 2000;
const MAX_FILE = 10 * 1024 * 1024;

function validate(f: TicketFields): TicketErrors {
  const e: TicketErrors = {};
  if (f.name.trim().length < 2) e.name = 'Tell us what to call you.';
  if (!f.email.trim()) e.email = 'We reply by email, so we need one.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'That email does not look right.';
  if (f.order.trim() && !/^[a-z0-9][a-z0-9-]{4,23}$/i.test(f.order.trim().replace(/^#/, '')))
    e.order = 'Order numbers look like ORD-261118-7F3K.';
  if (!f.category) e.category = 'Pick the closest topic.';
  if (f.message.trim().length < 20) e.message = 'A little more detail helps us fix it first time (20 characters minimum).';
  return e;
}

const FIELD_ORDER: (keyof TicketFields)[] = ['name', 'email', 'order', 'category', 'product', 'message'];

function TicketSection({ prefill, onChat }: { prefill: { category: string; n: number } | null; onChat: () => void }) {
  const { toast } = useUI();
  const [form, setForm] = useState<TicketFields>(EMPTY_TICKET);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<TicketErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [lastTicket, setLastTicket] = useState<{ id: string; email: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number>();
  const seq = useRef(48213);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (prefill) setForm((f) => ({ ...f, category: prefill.category }));
  }, [prefill]);

  const set =
    (k: keyof TicketFields) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const v = k === 'message' ? e.target.value.slice(0, MAX_MESSAGE) : e.target.value;
      setForm((f) => ({ ...f, [k]: v }));
      if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
      if (lastTicket) setLastTicket(null);
    };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_FILE) {
      setFile(null);
      setErrors((er) => ({ ...er, file: `${f.name} is ${formatBytes(f.size)}. Files must be under 10 MB.` }));
    } else {
      setFile(f);
      setErrors((er) => ({ ...er, file: undefined }));
    }
    e.target.value = '';
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const errs = validate(form);
    setErrors(errs);
    const firstBad = FIELD_ORDER.find((k) => errs[k]);
    if (firstBad) {
      document.getElementById(`sup-t-${firstBad}`)?.focus();
      return;
    }
    setSubmitting(true);
    timer.current = window.setTimeout(() => {
      const id = `${TICKET_PREFIX}-${seq.current}`;
      seq.current += 7 + Math.floor(Math.random() * 40);
      toast({
        title: `Ticket #${id} created — we'll reply by email`,
        body: `Confirmation sent to ${form.email.trim()}.`,
        tone: 'ok',
      });
      setLastTicket({ id, email: form.email.trim() });
      setForm(EMPTY_TICKET);
      setFile(null);
      setErrors({});
      setSubmitting(false);
    }, 1300);
  };

  const err = (k: keyof TicketErrors) =>
    errors[k] ? (
      <span className="sup-err" id={`sup-t-${k}-err`} role="alert">
        <Icon name="alert" size={13} />
        {errors[k]}
      </span>
    ) : null;

  const aria = (k: keyof TicketFields) => ({
    id: `sup-t-${k}`,
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? `sup-t-${k}-err` : undefined,
  });

  const msgLen = form.message.length;

  return (
    <section className="section-sm sup-ticket" id="sup-ticket" aria-labelledby="sup-ticket-title">
      <div className="container sup-ticket-grid">
        <div className="sup-ticket-side">
          <span className="eyebrow">Tickets</span>
          <h2 className="h2" id="sup-ticket-title">
            Open a ticket.
            <br />
            <span className="accent">We'll own it.</span>
          </h2>
          <p className="lead">
            Tickets go straight to the specialist for your product, not a queue of generalists. You will get a
            confirmation right away and a real reply by email.
          </p>

          <div className="sup-include">
            <span className="sup-desk-kicker">Include if you can</span>
            <ul>
              {[
                'Your order number, from the receipt email',
                'The product and your Windows version',
                'A screenshot or loader.log from the loader folder',
                'What you have already tried',
              ].map((t) => (
                <li key={t}>
                  <span className="sup-include-check" aria-hidden="true">
                    <Icon name="check" size={13} strokeWidth={2.6} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="sup-ticket-stats">
            <div className="sup-ticket-stat">
              <strong className="tabular">38m</strong>
              <span>median time to resolve</span>
            </div>
            <div className="sup-ticket-stat">
              <strong className="tabular">94%</strong>
              <span>fixed on the first reply</span>
            </div>
          </div>

          <p className="small muted sup-ticket-note">
            Asking for a refund? Read the{' '}
            <Link to="/legal/refunds" className="sup-link">
              Refund Policy
            </Link>{' '}
            first, it takes a minute. Need it faster?{' '}
            <button type="button" className="sup-link" onClick={onChat}>
              Start a live chat
            </button>
            .
          </p>
        </div>

        <form className="sup-form card" onSubmit={submit} noValidate aria-busy={submitting}>
          <div className="sup-form-head">
            <div className="stack gap-4">
              <strong className="h3">New ticket</strong>
              <span className="small muted">Fields marked * are required.</span>
            </div>
            <span className="sup-eta tone-info">
              <Icon name="clock" size={13} />
              Reply &lt; 1 hour
            </span>
          </div>

          {lastTicket && (
            <div className="sup-form-success" role="status">
              <Icon name="check-circle" size={18} />
              <span>
                Ticket <strong className="mono">#{lastTicket.id}</strong> is in the queue. We will reply to{' '}
                <strong>{lastTicket.email}</strong>.
              </span>
            </div>
          )}

          <div className="sup-form-grid">
            <div className="field">
              <label className="label" htmlFor="sup-t-name">
                Name *
              </label>
              <input className="input" autoComplete="name" placeholder="What should we call you?" value={form.name} onChange={set('name')} {...aria('name')} />
              {err('name')}
            </div>
            <div className="field">
              <label className="label" htmlFor="sup-t-email">
                Email *
              </label>
              <input
                className="input"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                {...aria('email')}
              />
              {err('email')}
            </div>
            <div className="field">
              <label className="label" htmlFor="sup-t-order">
                Order number <span className="muted">(optional)</span>
              </label>
              <input
                className="input mono"
                placeholder="ORD-261118-7F3K"
                autoComplete="off"
                spellCheck={false}
                value={form.order}
                onChange={set('order')}
                {...aria('order')}
              />
              {err('order')}
            </div>
            <div className="field">
              <label className="label" htmlFor="sup-t-category">
                Topic *
              </label>
              <select className="select" value={form.category} onChange={set('category')} {...aria('category')}>
                <option value="" disabled>
                  Choose a topic
                </option>
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {err('category')}
            </div>
            <div className="field sup-span-2">
              <label className="label" htmlFor="sup-t-product">
                Product
              </label>
              <select className="select" value={form.product} onChange={set('product')} {...aria('product')}>
                <option value="">Not about a specific product</option>
                {PRODUCT_GROUPS.map(({ game, products }) => (
                  <optgroup key={game.slug} label={game.name}>
                    {products.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="field sup-span-2">
              <div className="sup-label-row">
                <label className="label" htmlFor="sup-t-message">
                  Message *
                </label>
                <span className={`tiny mono tabular ${msgLen > MAX_MESSAGE * 0.9 ? 'sup-count-warn' : 'muted'}`}>
                  {msgLen}/{MAX_MESSAGE}
                </span>
              </div>
              <textarea
                className="textarea"
                rows={6}
                placeholder="What happened, what you expected, and any error text you saw."
                value={form.message}
                onChange={set('message')}
                {...aria('message')}
              />
              {err('message')}
            </div>
          </div>

          <div className="sup-attach">
            <input
              ref={fileRef}
              type="file"
              id="sup-t-file"
              className="sr-only"
              tabIndex={-1}
              accept="image/*,.log,.txt,.zip"
              onChange={onFile}
              aria-hidden="true"
            />
            {file ? (
              <span className="sup-file">
                <span className="sup-file-icon" aria-hidden="true">
                  <Icon name="box" size={15} />
                </span>
                <span className="sup-file-name">{file.name}</span>
                <span className="sup-file-size mono">{formatBytes(file.size)}</span>
                <button type="button" className="sup-file-x" aria-label={`Remove ${file.name}`} onClick={() => setFile(null)}>
                  <Icon name="x" size={14} />
                </button>
              </span>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                <Icon name="plus" />
                Attach a file
              </button>
            )}
            <span className="tiny muted sup-attach-hint">Screenshot, .log, .txt or .zip · max 10 MB</span>
            {err('file')}
          </div>

          <div className="sup-form-foot">
            <p className="tiny muted">
              By submitting you agree to our{' '}
              <Link to="/legal/privacy" className="sup-link">
                Privacy Policy
              </Link>
              . We never ask for your password.
            </p>
            <button type="submit" className="btn btn-primary btn-lg sup-submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="sup-spinner" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                <>
                  Submit ticket
                  <span className="chip-arrow">
                    <Icon name="send" />
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
