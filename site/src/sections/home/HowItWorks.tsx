import { Icon } from '../../components/Icon';
import { Reveal, SectionHeader } from '../../components/ui';
import { STATS } from '../../data/catalog';

const STEPS = [
  {
    icon: 'gamepad',
    title: 'Pick your game',
    body: `Choose from ${STATS.games} games and a plan that fits, from a 1-day pass to lifetime. Live status is on every product page, so you know before you pay.`,
    chip: `${STATS.games} games`,
  },
  {
    icon: 'card',
    title: 'Checkout your way',
    body: 'Card, Apple Pay, PayPal or crypto. Your key and loader land in your dashboard the second payment clears.',
    chip: 'Delivered in seconds',
  },
  {
    icon: 'play',
    title: 'Load and play',
    body: 'Follow the step-by-step guide, run the loader and launch. Stuck? A specialist can set it up with you over remote desktop.',
    chip: 'About 2 min setup',
  },
];

export function HowItWorks() {
  return (
    <section className="section home-sec home-how" aria-labelledby="home-how-title">
      <div className="container">
        <Reveal>
          <SectionHeader
            align="center"
            eyebrow="How it works"
            title={
              <span id="home-how-title">
                Three steps to
                <br />
                <span className="grad-text">your first match.</span>
              </span>
            }
          />
        </Reveal>

        <div className="home-how-wrap">
          <span className="home-how-line" aria-hidden="true">
            <span className="home-how-line-pulse" />
          </span>
          <ol className="home-how-steps">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 110} className="home-how-step">
              <span className="home-how-node mono" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="home-how-card">
                <span className="icon-tile is-accent">
                  <Icon name={s.icon} />
                </span>
                <h3 className="h3">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </h3>
                <p>{s.body}</p>
                <span className="pill home-how-chip">
                  <Icon name={i === 1 ? 'zap' : i === 2 ? 'clock' : 'check-circle'} />
                  {s.chip}
                </span>
              </div>
            </Reveal>
          ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
