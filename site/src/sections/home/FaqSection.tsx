import { Icon } from '../../components/Icon';
import { Accordion, Avatar, Reveal } from '../../components/ui';
import { FAQS } from '../../data/catalog';
import { Link } from '../../router';
import { useUI } from '../../state/store';

const ITEMS = FAQS.slice(0, 6).map((f) => ({ q: f.q, a: f.a }));

export function FaqSection() {
  const { setChatOpen } = useUI();
  return (
    <section className="section home-sec home-faq" aria-labelledby="home-faq-title">
      <div className="container home-faq-grid">
        <Reveal className="home-faq-side">
          <div className="titles stack gap-12">
            <span className="eyebrow">FAQ</span>
            <h2 id="home-faq-title" className="h2">
              Frequently asked <span className="muted">questions</span>
            </h2>
            <p className="lead">Everything players ask before their first key. Short, straight answers.</p>
          </div>

          <div className="card home-faq-help">
            <div className="row gap-12">
              <span className="icon-tile is-accent">
                <Icon name="headset" />
              </span>
              <div className="grow">
                <h3 className="h4">Still stuck?</h3>
                <p className="small muted">Our team replies in minutes, day or night.</p>
              </div>
            </div>
            <div className="home-faq-agents">
              <span className="home-faq-avatars" aria-hidden="true">
                {['Rhea', 'Jonas', 'Mila'].map((n) => (
                  <Avatar key={n} name={n} size={24} />
                ))}
              </span>
              <span className="tiny text-2">
                <span className="dot ok pulse" aria-hidden="true" /> Online now · replies in ~4 min
              </span>
            </div>
            <button type="button" className="btn btn-white btn-block" onClick={() => setChatOpen(true)}>
              Ask the team <Icon name="message" />
            </button>
          </div>
        </Reveal>

        <Reveal delay={80} className="home-faq-main">
          <Accordion items={ITEMS} numbered />
          <Link to="/support" className="home-link-arrow home-faq-more">
            Visit the help center <Icon name="arrow-right" size={15} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
