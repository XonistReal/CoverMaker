import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BRAND } from '../config';
import { STATS } from '../data/catalog';
import { Link } from '../router';
import { useUI } from '../state/store';
import { Icon } from './Icon';
import { Avatar } from './ui';
import './overlays.css';

/* Floating live-chat launcher + panel. Front-end only: replies are canned and nothing is persisted. */

const EXIT_MS = 260;
const TEASER_MS = 6000;
const TEASER_HIDE_MS = 12000;
const TEASER_KEY = `${BRAND.storageKey}.chat-teaser`;
const AGENTS = ['Mila', 'Dex', 'Sora'];
const PAY_METHODS = ['Card', 'Apple Pay', 'Google Pay', 'PayPal', 'BTC', 'ETH', 'LTC', 'USDT'];

const QUICK = [
  { label: 'Payment help', icon: 'card' },
  { label: 'Setup help', icon: 'wrench' },
  { label: 'Product status', icon: 'activity' },
  { label: 'Talk to a human', icon: 'user' },
];

interface Msg {
  id: number;
  from: 'agent' | 'user';
  text: string;
  at: number;
  agent?: string;
  link?: { label: string; to: string; icon: string };
  pay?: boolean;
}

type Reply = Pick<Msg, 'text' | 'link' | 'pay'>;

function replyFor(input: string): Reply {
  const t = input.toLowerCase();
  if (/status|detect|undetect|ban|safe|working|down|patch|update/.test(t)) {
    return {
      text: `Right now ${STATS.undetected} of ${STATS.products} products are green. The status page updates the minute a game patches, so it's always the best place to check before you load in.`,
      link: { label: 'Open live status', to: '/status', icon: 'activity' },
    };
  }
  if (/setup|set up|install|loader|guide|inject|launch|error|crash|config/.test(t)) {
    return {
      text: 'Every product ships with a step-by-step guide, and most setups take under five minutes. If you get stuck, an agent can walk you through it over remote desktop.',
      link: { label: 'Browse setup guides', to: '/support', icon: 'wrench' },
    };
  }
  if (/pay|card|crypto|btc|bitcoin|eth|paypal|refund|price|checkout|apple|google/.test(t)) {
    return {
      text: 'We accept all of these. Your key is delivered the instant payment clears, and crypto usually confirms within a few minutes.',
      pay: true,
    };
  }
  if (/human|agent|person|someone|real|talk/.test(t)) {
    return { text: 'Got it. An agent will join shortly. Current wait is under 4 minutes, and you can keep browsing while you wait.' };
  }
  return {
    text: 'Thanks, noted. An agent will join shortly to help with that. Current wait is under 4 minutes.',
  };
}

const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
/* Same breakpoint as the store's scroll lock: below it the panel is a full-screen modal sheet. */
const NARROW_MQ = '(max-width: 560px)';
const isNarrow = () => window.matchMedia(NARROW_MQ).matches;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab inside `root`, including when focus has drifted outside it. */
function trapTab(e: KeyboardEvent, root: HTMLElement | null) {
  if (!root) return;
  const els = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
  if (!els.length) return;
  const first = els[0];
  const last = els[els.length - 1];
  const active = document.activeElement;
  const inside = root.contains(active);
  if (e.shiftKey && (active === first || !inside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !inside)) {
    e.preventDefault();
    first.focus();
  }
}

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

export function SupportWidget() {
  const { chatOpen, setChatOpen, cartOpen, authMode } = useUI();
  const { visible, closing } = usePresence(chatOpen, EXIT_MS);
  const [narrow, setNarrow] = useState(isNarrow);

  const nextId = useRef(2);
  const [messages, setMessages] = useState<Msg[]>(() => [
    {
      id: 1,
      from: 'agent',
      agent: AGENTS[0],
      at: Date.now(),
      text: `Hey, I'm ${AGENTS[0]} from the ${BRAND.name} team. Ask me anything about products, setup, payments or status. Real people are online 24/7.`,
    },
  ]);
  const [pending, setPending] = useState(0);
  const [draft, setDraft] = useState('');
  const [teaser, setTeaser] = useState<'idle' | 'shown' | 'done'>('idle');
  const [unread, setUnread] = useState(false);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const chatOpenRef = useRef(chatOpen);
  chatOpenRef.current = chatOpen;

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    const mq = window.matchMedia(NARROW_MQ);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // One-time teaser bubble + unread badge: once per browser session, never on
  // phones (the bubble would sit over content), and it tucks itself away after a while.
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(TEASER_KEY) === '1';
    } catch {
      /* storage blocked: show it once per page load */
    }
    if (seen) return;
    const t = window.setTimeout(() => {
      if (chatOpenRef.current) return;
      setUnread(true);
      try {
        sessionStorage.setItem(TEASER_KEY, '1');
      } catch {
        /* ignore */
      }
      if (isNarrow()) return;
      setTeaser((s) => (s === 'idle' ? 'shown' : s));
    }, TEASER_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (teaser !== 'shown') return;
    const t = window.setTimeout(() => setTeaser('done'), TEASER_HIDE_MS);
    return () => window.clearTimeout(t);
  }, [teaser]);

  // Opening the chat reads the greeting and retires the teaser. Focus moves in with a mouse, and always
  // on phones, where the sheet covers the page (the close button there, so no keyboard pops up).
  useEffect(() => {
    if (!chatOpen) return;
    setUnread(false);
    setTeaser('done');
    const raf = window.requestAnimationFrame(() => {
      if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true });
      else if (isNarrow()) closeRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [chatOpen]);

  const close = () => {
    setChatOpen(false);
    launcherRef.current?.focus({ preventScroll: true });
  };

  // Esc closes the panel when nothing modal sits above it; on phones the sheet is modal, so Tab stays inside.
  useEffect(() => {
    if (!chatOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (cartOpen || authMode !== null) return;
      if (e.key === 'Escape') {
        setChatOpen(false);
        launcherRef.current?.focus({ preventScroll: true });
      } else if (e.key === 'Tab' && narrow) {
        trapTab(e, panelRef.current);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [chatOpen, cartOpen, authMode, narrow, setChatOpen]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [messages, pending, visible]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const now = Date.now();
    setMessages((m) => [...m, { id: nextId.current++, from: 'user', text, at: now }]);
    setDraft('');
    const reply = replyFor(text);
    const startTyping = window.setTimeout(() => setPending((p) => p + 1), 380);
    const deliver = window.setTimeout(
      () => {
        setPending((p) => Math.max(0, p - 1));
        setMessages((m) => [...m, { id: nextId.current++, from: 'agent', agent: AGENTS[0], at: Date.now(), ...reply }]);
      },
      1300 + Math.min(900, reply.text.length * 6),
    );
    timers.current.push(startTyping, deliver);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  const toggle = () => setChatOpen(!chatOpen);
  const dismissTeaser = () => setTeaser('done');
  const blocked = cartOpen || authMode !== null;
  const userHasSpoken = messages.some((m) => m.from === 'user');
  const lastIsAgent = messages[messages.length - 1]?.from === 'agent';

  return (
    <div className={`chat-root${chatOpen ? ' is-open' : ''}`}>
      {teaser === 'shown' && !chatOpen && !blocked && (
        <div className="chat-teaser" role="status">
          <button className="chat-teaser-body" onClick={() => setChatOpen(true)}>
            <span className="chat-teaser-avatar">
              <Avatar name={AGENTS[0]} size={34} />
              <span className="chat-online-dot" aria-hidden="true" />
            </span>
            <span className="chat-teaser-text">
              <strong>{AGENTS[0]} · Support</strong>
              <span>Need a hand choosing? We’re online.</span>
            </span>
          </button>
          <button className="chat-teaser-close" onClick={dismissTeaser} aria-label="Dismiss message">
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      <button
        ref={launcherRef}
        className={`chat-launcher${unread ? ' has-unread' : ''}`}
        onClick={toggle}
        aria-expanded={chatOpen}
        aria-controls="chat-panel"
        aria-label={chatOpen ? 'Close support chat' : unread ? 'Open support chat, 1 unread message' : 'Open support chat'}
      >
        <span className="chat-launcher-icon is-chat" aria-hidden="true">
          <Icon name="message" size={24} />
        </span>
        <span className="chat-launcher-icon is-close" aria-hidden="true">
          <Icon name="chevron-down" size={26} />
        </span>
        {unread && !chatOpen && (
          <span className="chat-badge" aria-hidden="true">
            1
          </span>
        )}
      </button>

      {visible && (
        <div className={`chat-scrim${closing ? ' is-closing' : ''}`} onClick={close} aria-hidden="true" />
      )}

      {visible && (
        <section
          ref={panelRef}
          id="chat-panel"
          className={`chat-panel${closing ? ' is-closing' : ''}`}
          role="dialog"
          aria-modal={narrow || undefined}
          aria-labelledby="chat-title"
        >
          <header className="chat-head">
            <div className="chat-head-bg" aria-hidden="true" />
            <span className="chat-handle" aria-hidden="true" />
            <span className="chat-avatars" aria-hidden="true">
              {AGENTS.map((a) => (
                <Avatar key={a} name={a} size={32} />
              ))}
            </span>
            <div className="chat-head-text">
              <h2 id="chat-title" className="chat-title">
                {BRAND.name} Support
              </h2>
              <p className="chat-sub">
                <span className="dot ok pulse" aria-hidden="true" />
                Typically replies in under 4 min
              </p>
            </div>
            <button ref={closeRef} className="chat-close" onClick={close} aria-label="Close support chat">
              <Icon name="x" size={18} />
            </button>
          </header>

          <div className="chat-list" ref={listRef} role="log" aria-live="polite" aria-label="Conversation">
            <div className="chat-day">
              <span>Today</span>
            </div>

            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const grouped = prev && prev.from === m.from;
              return m.from === 'agent' ? (
                <div key={m.id} className={`chat-msg is-agent${grouped ? ' is-grouped' : ''}`}>
                  <span className="chat-msg-avatar" aria-hidden="true">
                    {!grouped && <Avatar name={m.agent ?? AGENTS[0]} size={28} />}
                  </span>
                  <div className="chat-msg-col">
                    {!grouped && (
                      <span className="chat-msg-meta">
                        {m.agent} <span>· {clock(m.at)}</span>
                      </span>
                    )}
                    <div className="chat-bubble">
                      <p>{m.text}</p>
                      {m.pay && (
                        <span className="chat-pay">
                          {PAY_METHODS.map((p) => (
                            <span key={p}>{p}</span>
                          ))}
                        </span>
                      )}
                      {m.link && (
                        <Link
                          to={m.link.to}
                          className="chat-link"
                          onClick={() => {
                            if (isNarrow()) setChatOpen(false);
                          }}
                        >
                          <Icon name={m.link.icon} size={15} />
                          <span className="grow">{m.link.label}</span>
                          <Icon name="arrow-right" size={15} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={m.id} className={`chat-msg is-user${grouped ? ' is-grouped' : ''}`}>
                  <div className="chat-msg-col">
                    <div className="chat-bubble">
                      <p>{m.text}</p>
                    </div>
                    <span className="chat-msg-meta">
                      {clock(m.at)} <Icon name="check" size={12} strokeWidth={2.4} />
                    </span>
                  </div>
                </div>
              );
            })}

            {pending > 0 && (
              <div className="chat-msg is-agent">
                <span className="chat-msg-avatar" aria-hidden="true">
                  <Avatar name={AGENTS[0]} size={28} />
                </span>
                <div className="chat-msg-col">
                  <div className="chat-bubble chat-typing" aria-label={`${AGENTS[0]} is typing`}>
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
            )}

            {pending === 0 && lastIsAgent && (
              <div className={`chat-quick${userHasSpoken ? ' is-compact' : ''}`} aria-label="Quick replies">
                {QUICK.map((q) => (
                  <button key={q.label} className="chat-chip" onClick={() => send(q.label)}>
                    <Icon name={q.icon} size={14} />
                    {q.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form className="chat-compose" onSubmit={onSubmit}>
            <label htmlFor="chat-input" className="sr-only">
              Message
            </label>
            <input
              ref={inputRef}
              id="chat-input"
              className="chat-input"
              type="text"
              autoComplete="off"
              placeholder="Write a message…"
              value={draft}
              maxLength={500}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="chat-send" disabled={!draft.trim()} aria-label="Send message">
              <Icon name="send" size={18} />
            </button>
          </form>
          <p className="chat-foot">
            <Icon name="lock" size={12} />
            We’ll never ask for your password in chat.
          </p>
        </section>
      )}
    </div>
  );
}
