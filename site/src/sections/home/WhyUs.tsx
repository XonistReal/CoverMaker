import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../../components/Icon';
import { Avatar, Reveal, SectionHeader, StatusDot } from '../../components/ui';
import { BRAND } from '../../config';
import { STATUS_META, getGame, getProduct, timeAgo } from '../../data/catalog';
import type { Product } from '../../data/types';
import { Link } from '../../router';
import { prefersReducedMotion, useInView } from './ScrollerNav';

/* ------------------------------------------------------------------ */
/* Card shell                                                          */
/* ------------------------------------------------------------------ */

function WhyCard({
  className,
  icon,
  kicker,
  title,
  children,
  visual,
  delay = 0,
}: {
  className: string;
  icon: string;
  kicker: string;
  title: string;
  children: ReactNode;
  visual: ReactNode;
  delay?: number;
}) {
  return (
    <Reveal as="article" delay={delay} className={`card home-why-card ${className}`}>
      <div className="home-why-visual">{visual}</div>
      <div className="home-why-copy">
        <span className="home-why-kicker">
          <Icon name={icon} size={15} />
          {kicker}
        </span>
        <h3 className="h3">{title}</h3>
        <div className="home-why-body">{children}</div>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Visual: live status panel                                           */
/* ------------------------------------------------------------------ */

const LIVE = ['valorant-nightfall', 'fortnite-umbra', 'r6-wraith', 'fortnite-wraith', 'finals-specter']
  .map((s) => getProduct(s))
  .filter((p): p is Product => Boolean(p));

function LiveStatus() {
  return (
    <div className="home-why-window">
      <div className="home-why-window-bar">
        <span className="home-why-lights" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="mono">status / live</span>
        <span className="home-why-synced mono">
          <span className="dot ok pulse" aria-hidden="true" /> synced 2m ago
        </span>
      </div>
      <ul className="home-why-status-list">
        {LIVE.map((p) => {
          const m = STATUS_META[p.status];
          return (
            <li key={p.slug}>
              <StatusDot status={p.status} />
              <span className="home-why-status-name">{p.name}</span>
              <span className="home-why-status-game mono">{getGame(p.gameSlug)?.short}</span>
              <span className={`home-why-status-label tone-${m.tone}`}>{m.label}</span>
              <span className="home-why-status-time mono">{timeAgo(p.updatedAt)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visual: delivery timer                                              */
/* ------------------------------------------------------------------ */

const DELIVERY_STEPS = [
  { at: 700, label: 'Payment confirmed' },
  { at: 1900, label: 'License key issued' },
  { at: 3100, label: 'Loader ready to download' },
];
const DELIVERED_AT = 3400;
const CYCLE = 7000;

function DeliveryDemo() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [t, setT] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setT(DELIVERED_AT);
      return;
    }
    if (!inView) return;
    const id = window.setInterval(() => setT((v) => (v + 100) % CYCLE), 100);
    return () => window.clearInterval(id);
  }, [inView]);

  const elapsed = Math.min(t, DELIVERED_AT);
  const done = t >= DELIVERED_AT;

  return (
    <div className="home-why-delivery" ref={ref}>
      <div className="home-why-delivery-top">
        <span className="home-why-timer tabular">
          {(elapsed / 1000).toFixed(1)}
          <small>s</small>
        </span>
        <span className={`badge ${done ? 'badge-ok' : 'badge-accent'}`}>{done ? 'Delivered' : 'Processing'}</span>
      </div>
      <div className="home-why-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${elapsed / DELIVERED_AT})` }} />
      </div>
      <ul className="home-why-steps">
        {DELIVERY_STEPS.map((s) => {
          const ok = t >= s.at;
          return (
            <li key={s.label} className={ok ? 'is-done' : ''}>
              <span className="home-why-step-ico" aria-hidden="true">
                {ok ? <Icon name="check" size={12} strokeWidth={3} /> : <span className="home-why-spin" />}
              </span>
              {s.label}
            </li>
          );
        })}
      </ul>
      <div className={`home-why-key mono${done ? ' is-shown' : ''}`}>
        <Icon name="key" size={14} />
        <span>{BRAND.keyPrefix}-7Q4M-••••-X2KD</span>
        <Icon name="copy" size={14} className="home-why-key-copy" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visual: patch-to-green bar chart                                    */
/* ------------------------------------------------------------------ */

// Hours each day that the fleet was green (24 = no downtime). Patch days dip.
const UPTIME = [24, 24, 24, 24, 24, 21, 24, 24, 24, 24, 24, 24, 19, 24, 24, 24, 24, 24, 24, 24, 22, 24, 24, 24, 24, 24, 20, 24, 24, 23];

function UptimeChart() {
  return (
    <div className="home-why-uptime">
      <div className="home-why-uptime-head">
        <span className="home-why-big tabular">
          3h<small> </small>41m
        </span>
        <span className="tiny muted">median patch → green</span>
      </div>
      <div className="home-why-bars" role="img" aria-label="Daily uptime for the last 30 days, with short dips on patch days">
        {UPTIME.map((h, i) => (
          <span
            key={i}
            className={h < 24 ? 'is-dip' : ''}
            style={{ height: `${(h / 24) * 100}%`, ['--i' as string]: i }}
          />
        ))}
      </div>
      <div className="home-why-axis mono">
        <span>30d ago</span>
        <span>today</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visual: support chat                                                */
/* ------------------------------------------------------------------ */

function SupportChat() {
  return (
    <div className="home-why-chat">
      <div className="home-why-agents">
        <span className="home-why-avatars">
          {['Rhea', 'Jonas', 'Mila', 'Kenji'].map((n) => (
            <Avatar key={n} name={n} size={26} />
          ))}
        </span>
        <span className="tiny text-2">
          <span className="dot ok" aria-hidden="true" /> 4 agents online
        </span>
      </div>
      <div className="home-why-bubble is-in">Loader says “driver blocked”. Help?</div>
      <div className="home-why-bubble is-out">
        Turn off Core Isolation, reboot, and you’re in. Want me to hop on remote?
        <span className="home-why-bubble-meta mono">Rhea · replied in 1m 12s</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visual: stream-proof split                                          */
/* ------------------------------------------------------------------ */

function StreamProof() {
  return (
    <div className="home-why-screens">
      <div className="home-why-screen">
        <span className="home-why-screen-label">
          <Icon name="eye" size={12} /> Your view
        </span>
        <div className="home-why-scene">
          <span className="home-why-figure" />
          <span className="home-why-esp">
            <span className="home-why-esp-tag mono">enemy · 42m</span>
            <span className="home-why-esp-hp" />
          </span>
          <span className="home-why-fov" />
        </div>
      </div>
      <div className="home-why-screen">
        <span className="home-why-screen-label">
          <span className="home-why-rec" /> Stream
        </span>
        <div className="home-why-scene">
          <span className="home-why-figure" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visual: paused key timeline                                         */
/* ------------------------------------------------------------------ */

function PausedKeys() {
  return (
    <div className="home-why-timeline">
      <div className="home-why-tl-head">
        <span className="mono tiny muted">KEY · 1 MONTH</span>
        <span className="home-why-tl-left tabular">
          29d 06h <span className="muted">left</span>
        </span>
      </div>
      <div className="home-why-tl-bar">
        <span className="home-why-tl-seg is-used" style={{ flexBasis: '34%' }} />
        <span className="home-why-tl-seg is-paused" style={{ flexBasis: '14%' }}>
          <span className="home-why-tl-pin mono">
            <Icon name="clock" size={11} /> clock paused · 6h
          </span>
        </span>
        <span className="home-why-tl-seg is-left" />
      </div>
      <div className="home-why-tl-axis mono">
        <span>Day 1</span>
        <span className="home-why-tl-patch">Patch day</span>
        <span>Day 30 + 6h</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function WhyUs() {
  return (
    <section className="section home-sec home-why" aria-labelledby="home-why-title">
      <div className="glow-blob home-why-glow" aria-hidden="true" />
      <div className="container">
        <Reveal>
          <SectionHeader
            align="center"
            eyebrow={`Why ${BRAND.name}`}
            title={
              <span id="home-why-title">
                Built like a product,
                <br />
                <span className="grad-text">not a side project.</span>
              </span>
            }
            lead="Our own code, our own testers, our own support team. No resold builds and no guessing about status."
          />
        </Reveal>

        <div className="home-why-grid">
          <WhyCard
            className="home-why-a"
            icon="shield-check"
            kicker="Undetected by design"
            title="Tested before it ships. Pulled the minute it isn’t safe."
            visual={<LiveStatus />}
          >
            <p>
              Every build runs on fresh accounts first. When a game patches, the product flips to Updating automatically
              and stays there until it’s verified again.
            </p>
            <Link to="/status" className="home-link-arrow">
              Live status <Icon name="arrow-right" size={15} />
            </Link>
          </WhyCard>

          <WhyCard
            className="home-why-b"
            icon="zap"
            kicker="Instant delivery"
            title="Your key lands in seconds"
            visual={<DeliveryDemo />}
            delay={80}
          >
            <p>No manual approval and no ticket queue. Pay, and your key and loader are in your dashboard and inbox.</p>
          </WhyCard>

          <WhyCard
            className="home-why-c"
            icon="refresh"
            kicker="Same-day updates"
            title="Back online fast after patches"
            visual={<UptimeChart />}
          >
            <p>Our developers are on call for patch day, so most tools are green again within hours.</p>
          </WhyCard>

          <WhyCard
            className="home-why-d"
            icon="headset"
            kicker="24/7 humans"
            title="Real people, day and night"
            visual={<SupportChat />}
            delay={80}
          >
            <p>Live chat, tickets and Discord, answered by people who use the tools. No bots, no scripts.</p>
          </WhyCard>

          <WhyCard
            className="home-why-e"
            icon="monitor"
            kicker="Stream-proof"
            title="You see it. Your stream doesn’t."
            visual={<StreamProof />}
            delay={160}
          >
            <p>Overlays are hidden from OBS, Discord and every capture tool, so you can stream or record freely.</p>
          </WhyCard>

          <WhyCard
            className="home-why-f"
            icon="clock"
            kicker="Fair keys"
            title="Your clock stops while we update"
            visual={<PausedKeys />}
          >
            <p>
              When a product goes amber, every active key stops counting down until it’s green again. You never pay for
              downtime.
            </p>
          </WhyCard>
        </div>
      </div>
    </section>
  );
}
