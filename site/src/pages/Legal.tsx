import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BRAND } from '../config';
import { Icon } from '../components/Icon';
import { Breadcrumbs } from '../components/ui';
import { Link } from '../router';
import { useUI } from '../state/store';
import './legal.css';

/* =====================================================================
   Legal documents: #/legal/terms | privacy | refunds | cookies
   Two-column layout: sticky document nav + table of contents on the
   left, the document on the right. Unknown slugs fall back to terms.
   ===================================================================== */

type Slug = 'terms' | 'privacy' | 'refunds' | 'cookies';

type Block =
  | string
  | { list: string[]; ordered?: boolean }
  | { callout: string; tone?: 'info' | 'warn' }
  | { table: { head: string[]; rows: string[][]; monoKey?: boolean } }
  | { prefs: true };

interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

interface LegalDoc {
  slug: Slug;
  title: string;
  nav: string;
  blurb: string;
  icon: string;
  summary: string[];
  sections: Section[];
}

const N = BRAND.name;
const SITE = BRAND.domain;
const SUPPORT = BRAND.supportEmail;
const LEGAL_EMAIL = `legal@${BRAND.domain}`;
const PRIVACY_EMAIL = `privacy@${BRAND.domain}`;
const UPDATED = 'Nov 1, 2026';
const CK = BRAND.wordmark.replace(/[^a-z]/gi, '').slice(0, 3).toLowerCase() || 'site';

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

const TERMS: LegalDoc = {
  slug: 'terms',
  title: 'Terms of Service',
  nav: 'Terms of Service',
  blurb: 'Your licence and the rules',
  icon: 'key',
  summary: [
    'You get a personal licence for the plan you buy. Keys are for one person on one PC at a time.',
    `${N} is independent and not affiliated with any game publisher or anti-cheat provider.`,
    'Using third-party tools can break a game’s rules and lead to account action. That risk is yours.',
    'Our liability is limited to what you paid for the licence in question.',
  ],
  sections: [
    {
      id: 'agreement',
      title: 'Agreement to these terms',
      blocks: [
        `These Terms of Service (the “Terms”) govern your access to and use of ${SITE}, the ${N} dashboard and loader, and any software licence you purchase from us (together, the “Service”). By creating an account, purchasing a licence or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.`,
        'You must be at least 18 years old, or the age of majority where you live if that is higher, to create an account or make a purchase.',
      ],
    },
    {
      id: 'licence',
      title: 'Licence grant',
      blocks: [
        `When you purchase a plan, ${N} grants you a limited, personal, non-exclusive, non-transferable and revocable licence to use the licensed software for the duration of that plan, on one machine at a time, for your own non-commercial use.`,
        'You may not, and may not allow anyone else to:',
        {
          list: [
            'resell, share, rent, lend or sublicense a key or account;',
            'reverse engineer, decompile, disassemble or attempt to extract the source code of any software, except where the law expressly permits it;',
            'bypass, disable or tamper with licensing, HWID binding or update mechanisms;',
            'redistribute builds, configs or loaders, or publish them in any public place;',
            'use the Service to build or train a competing product.',
          ],
        },
        `All software, content, trademarks and branding remain the property of ${N} or its licensors. No rights are granted except those expressly set out in these Terms.`,
      ],
    },
    {
      id: 'accounts',
      title: 'Accounts and keys',
      blocks: [
        'You are responsible for keeping your login details and keys confidential, and for all activity under your account. Tell us straight away if you believe your account has been accessed without permission.',
        {
          list: [
            'Each key is bound to one machine. You can reset the binding from your dashboard within the limits shown there.',
            'We may suspend a key that has been shared publicly, used on multiple machines at once, or used in a way that harms the Service or other customers.',
            'Keep the email on your account current. It is how we deliver keys, notices and support replies.',
          ],
        },
      ],
    },
    {
      id: 'acceptable-use',
      title: 'Acceptable use',
      blocks: [
        'You agree not to use the Service to:',
        {
          list: [
            'break any law or regulation that applies to you;',
            'harass, threaten or abuse other people, including our staff;',
            'attempt to gain unauthorised access to our systems, other accounts or other customers’ data;',
            'interfere with or disrupt the Service, including through automated scraping or load testing;',
            'commit payment fraud, including knowingly false chargebacks.',
          ],
        },
        'We may investigate suspected breaches and suspend access while we do.',
      ],
    },
    {
      id: 'payments',
      title: 'Orders, pricing and payments',
      blocks: [
        `Prices are shown in ${BRAND.currency} and may exclude taxes, which are calculated at checkout where applicable. Payments are processed by third-party payment providers; we never receive or store your full card details.`,
        {
          list: [
            'A licence is delivered once payment is confirmed. Crypto payments are confirmed after the required network confirmations.',
            'Plan time starts when a key is first activated, not when it is purchased.',
            'When a product is marked Updating or Detected, remaining time on active keys is paused and restored automatically when it returns.',
            'We may change prices at any time. Changes never affect orders that have already been paid.',
          ],
        },
        'Refunds and store credit are governed by our Refund Policy, which forms part of these Terms.',
      ],
    },
    {
      id: 'third-party',
      title: 'Third-party games and risk',
      blocks: [
        {
          tone: 'warn',
          callout: `${N} is an independent company. We are not affiliated with, endorsed by or sponsored by any game publisher, developer, platform or anti-cheat provider. All game names and trademarks belong to their respective owners and are used for identification only.`,
        },
        'Using third-party software with online games may violate those games’ terms of service or end-user licence agreements. Publishers may act against your account at their sole discretion, including warnings, suspensions, permanent bans and hardware bans.',
        'By using the Service you accept that risk in full. We do not guarantee that any product is, or will remain, undetected. Status indicators on our site reflect our own testing at the time shown and are not a promise about the future.',
        'You are responsible for complying with the laws, and the game and platform rules, that apply to you.',
      ],
    },
    {
      id: 'disclaimers',
      title: 'Disclaimers',
      blocks: [
        'The Service is provided “as is” and “as available”. To the fullest extent permitted by law, we disclaim all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted or error-free operation.',
        'We do not warrant that the Service will be compatible with every hardware or software configuration, or that it will continue to work after a game or operating-system update.',
      ],
    },
    {
      id: 'liability',
      title: 'Limitation of liability',
      blocks: [
        `To the maximum extent permitted by law, ${N} and its staff, contractors and suppliers will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of game accounts, in-game items, virtual currency, data, profits or goodwill, arising out of or relating to the Service.`,
        `Our total liability for any claim relating to the Service is limited to the amount you paid ${N} for the licence giving rise to the claim during the three months before the claim arose.`,
        'Some jurisdictions do not allow certain exclusions or limitations. Where that is the case, they apply only to the extent permitted.',
      ],
    },
    {
      id: 'termination',
      title: 'Suspension and termination',
      blocks: [
        'You can stop using the Service at any time. We may suspend or terminate your access, without refund, if you materially breach these Terms, if required by law, or to protect the Service or other customers.',
        'Sections that by their nature should survive termination, including ownership, disclaimers, limitation of liability and governing law, will survive.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes and governing law',
      blocks: [
        'We may update these Terms from time to time. Material changes will be announced on this page and by email at least 14 days before they take effect. Continuing to use the Service after that date means you accept the updated Terms.',
        `These Terms are governed by the laws of the jurisdiction in which ${N} is established, without regard to conflict-of-law rules. Nothing in these Terms limits rights you have under mandatory consumer law where you live.`,
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      blocks: [`Questions about these Terms? Email ${LEGAL_EMAIL}. For anything about an order or a key, ${SUPPORT} or live chat is fastest.`],
    },
  ],
};

const PRIVACY: LegalDoc = {
  slug: 'privacy',
  title: 'Privacy Policy',
  nav: 'Privacy Policy',
  blurb: 'What we collect and why',
  icon: 'shield',
  summary: [
    'We collect only what we need to deliver keys, prevent fraud and support you.',
    'Payment details are handled by our payment processors. We never see full card numbers.',
    'We do not sell your personal data, and we do not use advertising trackers.',
    'You can access, export or delete your data at any time.',
  ],
  sections: [
    {
      id: 'who-we-are',
      title: 'Who we are',
      blocks: [
        `This policy explains how ${N} (“we”, “us”) collects and uses personal data when you visit ${SITE}, create an account, buy a licence or contact support. We are the controller of that data. You can reach our privacy team at ${PRIVACY_EMAIL}.`,
      ],
    },
    {
      id: 'data-we-collect',
      title: 'Data we collect',
      blocks: [
        {
          list: [
            'Account data: your email address, username and a salted hash of your password.',
            'Order data: products and plans purchased, amounts, order numbers, the payment method type and a processor reference.',
            'Licence and device data: key activations, loader version and a one-way hash of hardware identifiers used to bind your key to one machine.',
            'Security data: IP address and approximate location at sign-in and activation, used to detect key sharing and fraud.',
            'Support data: tickets, chat transcripts and any files you choose to attach.',
            'Usage data: pages visited and basic device and browser information, collected through cookies as described in our Cookie Policy.',
          ],
        },
        'We do not collect data about your game accounts, and the loader does not read personal files on your PC.',
      ],
    },
    {
      id: 'payment-data',
      title: 'Payment data',
      blocks: [
        'Card, wallet, PayPal and crypto payments are processed by third-party payment processors under their own privacy policies. They receive the details you enter on their secure pages; we receive only a confirmation, the amount, a reference number and, for cards, the brand and last four digits.',
        'We never see or store full card numbers, CVV codes or wallet private keys.',
      ],
    },
    {
      id: 'how-we-use',
      title: 'How we use your data',
      blocks: [
        {
          list: [
            'To create your account, deliver licences and keep them working (performance of a contract).',
            'To answer support requests and troubleshoot problems (performance of a contract).',
            'To detect fraud, chargeback abuse and key sharing (legitimate interests).',
            'To send order confirmations and important service notices (performance of a contract).',
            'To send product updates and offers, only if you opt in (consent, which you can withdraw at any time).',
            'To meet tax, accounting and other legal obligations (legal obligation).',
          ],
        },
      ],
    },
    {
      id: 'sharing',
      title: 'Who we share it with',
      blocks: [
        'We do not sell or rent personal data. We share it only with service providers who help us run the Service, under contracts that limit their use of it:',
        {
          list: [
            'payment processors, to take payments and handle disputes;',
            'hosting and infrastructure providers, to run the website, dashboard and licence servers;',
            'email delivery and support tooling providers, to send receipts and handle tickets;',
            'professional advisers and authorities, where required by law or to establish, exercise or defend legal claims.',
          ],
        },
      ],
    },
    {
      id: 'cookies',
      title: 'Cookies',
      blocks: [
        'We use essential cookies and local storage to keep you signed in and remember your cart, and optional analytics cookies only with your consent. We do not use advertising or cross-site tracking cookies. Details are in our Cookie Policy.',
      ],
    },
    {
      id: 'retention',
      title: 'How long we keep it',
      blocks: [
        {
          table: {
            head: ['Data', 'Kept for'],
            rows: [
              ['Account data', 'While your account is open, then 30 days'],
              ['Order and invoice records', '7 years, for tax and accounting'],
              ['Support tickets and chats', '24 months after the ticket closes'],
              ['Security and sign-in logs', '90 days'],
              ['Analytics data', 'Aggregated after 14 months'],
            ],
          },
        },
        'When data is no longer needed it is deleted or irreversibly anonymised.',
      ],
    },
    {
      id: 'security',
      title: 'Security',
      blocks: [
        'Data is encrypted in transit, passwords are salted and hashed, and access to customer data is limited to staff who need it to do their job. No system is perfectly secure, so we also monitor for suspicious activity and will notify you and the relevant authority of a breach where the law requires it.',
      ],
    },
    {
      id: 'your-rights',
      title: 'Your rights',
      blocks: [
        'Depending on where you live, you may have the right to:',
        {
          list: [
            'access the personal data we hold about you and get a copy of it;',
            'correct data that is inaccurate or incomplete;',
            'delete your data, subject to records we must keep by law;',
            'restrict or object to certain processing, including direct marketing;',
            'receive your data in a portable, machine-readable format;',
            'withdraw consent at any time, without affecting processing that has already happened;',
            'complain to your local data protection authority.',
          ],
        },
        `To exercise any of these rights, email ${PRIVACY_EMAIL} from the address on your account. We reply within 30 days.`,
      ],
    },
    {
      id: 'transfers',
      title: 'International transfers',
      blocks: [
        'Our providers may process data outside your country. Where that happens we rely on appropriate safeguards, such as standard contractual clauses, to protect it.',
      ],
    },
    {
      id: 'children',
      title: 'Children',
      blocks: ['The Service is not directed at anyone under 18, and we do not knowingly collect their personal data. If you believe a minor has given us data, contact us and we will delete it.'],
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      blocks: ['We will post any changes on this page and update the date above. If a change materially affects how we use your data, we will also tell you by email before it takes effect.'],
    },
  ],
};

const REFUNDS: LegalDoc = {
  slug: 'refunds',
  title: 'Refund Policy',
  nav: 'Refund Policy',
  blurb: 'Refunds, credit and disputes',
  icon: 'wallet',
  summary: [
    'If a product will not run on your PC and we cannot fix it, you get a refund or store credit.',
    'Downtime after a patch pauses your key automatically, so you never lose paid time.',
    'Talk to support first. Most problems are solved in minutes.',
    'Chargebacks without contacting us first suspend all keys on the account.',
  ],
  sections: [
    {
      id: 'overview',
      title: 'Overview',
      blocks: [
        `${N} sells digital licences that are delivered instantly and cannot be returned once used. Because of that, refunds are available in the specific situations below. This policy does not affect any statutory rights you have under consumer law where you live.`,
      ],
    },
    {
      id: 'eligible',
      title: 'When you can get a refund',
      blocks: [
        'You are entitled to a full refund to your original payment method if:',
        {
          list: [
            'the product will not run on a system that meets the requirements on its product page, and support cannot resolve it within 48 hours of your ticket;',
            'you were charged more than once for the same order;',
            'your key was not delivered and we cannot deliver it within 24 hours of payment;',
            'you bought a product that was marked Detected at the time of purchase.',
          ],
        },
        'Refund requests must be made within 7 days of purchase.',
      ],
    },
    {
      id: 'store-credit',
      title: 'When store credit applies',
      blocks: [
        {
          list: [
            'If a product is Updating or Detected for more than 72 hours in a row during your plan, you can choose store credit for the remaining time instead of waiting for it to return.',
            'Unused keys can be swapped for any product of equal or lower value within 24 hours of purchase. Any difference is issued as store credit.',
            'Where a refund is not available but we agree there was a genuine problem, we may offer store credit as a goodwill gesture.',
          ],
        },
        'Store credit never expires and can be used on any product.',
      ],
    },
    {
      id: 'not-eligible',
      title: 'What is not covered',
      blocks: [
        {
          list: [
            'Change of mind after a key has been activated.',
            'Game account warnings, suspensions or bans. Using third-party tools carries that risk, as set out in our Terms of Service.',
            'Systems that do not meet the published requirements, although we will always try to help.',
            'Keys that were shared, resold or suspended for breaching our Terms.',
            'Requests made more than 7 days after purchase.',
          ],
        },
      ],
    },
    {
      id: 'how-to-request',
      title: 'How to request a refund',
      blocks: [
        {
          ordered: true,
          list: [
            'Open a ticket from the Support page and choose “Refund request” as the topic.',
            'Include your order number, the product, what went wrong and, if possible, loader.log or a screenshot.',
            'A specialist will troubleshoot with you first. Most issues are fixed within minutes.',
            'If it cannot be fixed, we confirm your refund or credit within 48 hours.',
            'Card and PayPal refunds arrive in 5 to 10 business days. Crypto refunds are sent in the original coin at the USD value at the time of purchase.',
          ],
        },
      ],
    },
    {
      id: 'chargebacks',
      title: 'Chargebacks and disputes',
      blocks: [
        {
          tone: 'warn',
          callout: 'Please contact us before disputing a charge with your bank or payment provider. We can almost always resolve it faster.',
        },
        'Opening a chargeback or payment dispute without contacting support first will suspend every key on the account while the dispute is open. If a dispute is found to be fraudulent, we may close the account permanently.',
        'To respond to a dispute, we may share order, delivery and activation records with the payment processor as evidence.',
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      blocks: [`Questions about a refund? Open a ticket or email ${SUPPORT} with your order number.`],
    },
  ],
};

const COOKIES: LegalDoc = {
  slug: 'cookies',
  title: 'Cookie Policy',
  nav: 'Cookie Policy',
  blurb: 'Essential vs. analytics',
  icon: 'sliders',
  summary: [
    'Essential cookies keep you signed in and remember your cart. They cannot be switched off.',
    'Analytics cookies are optional and only set with your consent.',
    'No advertising or cross-site tracking cookies, ever.',
  ],
  sections: [
    {
      id: 'what-are-cookies',
      title: 'What cookies are',
      blocks: [
        `Cookies are small text files a website stores in your browser. We also use similar technology called local storage, which keeps data on your device rather than sending it with every request. This policy covers both, on ${SITE} and the ${N} dashboard.`,
      ],
    },
    {
      id: 'essential',
      title: 'Essential cookies',
      blocks: [
        'These are needed for the site to work, so they are always on. They do not track you across other sites.',
        {
          table: {
            head: ['Name', 'Purpose', 'Expires'],
            monoKey: true,
            rows: [
              [`${CK}_session`, 'Keeps you signed in to your account', 'End of session'],
              [`${CK}_csrf`, 'Protects forms against cross-site request forgery', 'End of session'],
              [`${CK}.cart`, 'Remembers your cart (local storage)', 'Until cleared'],
              [`${CK}_consent`, 'Stores your cookie choices', '12 months'],
            ],
          },
        },
      ],
    },
    {
      id: 'analytics',
      title: 'Analytics cookies',
      blocks: [
        'With your consent, we use privacy-friendly analytics to understand which pages are useful and where the site is slow. Data is aggregated, IP addresses are truncated, and it is never sold or used for advertising.',
        {
          table: {
            head: ['Name', 'Purpose', 'Expires'],
            monoKey: true,
            rows: [
              [`_${CK}_a`, 'Counts visits and pages viewed, anonymised', '13 months'],
              [`_${CK}_perf`, 'Measures page load performance', '30 days'],
            ],
          },
        },
      ],
    },
    {
      id: 'advertising',
      title: 'Advertising cookies',
      blocks: ['We do not use advertising, retargeting or cross-site tracking cookies, and we do not allow third parties to set them on our site.'],
    },
    {
      id: 'managing',
      title: 'Managing your choices',
      blocks: [
        'You can change your choice for optional cookies at any time below. Your setting is saved in this browser.',
        { prefs: true },
        'You can also block or delete cookies in your browser settings. Blocking essential cookies will stop sign-in and checkout from working.',
        {
          list: [
            'Chrome: Settings, Privacy and security, Third-party cookies.',
            'Firefox: Settings, Privacy & Security, Cookies and Site Data.',
            'Safari: Settings, Privacy, Manage Website Data.',
            'Edge: Settings, Cookies and site permissions.',
          ],
        },
      ],
    },
    {
      id: 'contact',
      title: 'Changes and contact',
      blocks: [`We will update this page if the cookies we use change. Questions? Email ${PRIVACY_EMAIL}.`],
    },
  ],
};

const DOCS: LegalDoc[] = [TERMS, PRIVACY, REFUNDS, COOKIES];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /([a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,})/gi;

/** Turns email addresses in copy into mailto links. */
function linkify(text: string): ReactNode {
  const parts = text.split(EMAIL_RE);
  if (parts.length === 1) return text;
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <a key={i} href={`mailto:${p}`} className="legal-link">
        {p}
      </a>
    ) : (
      p
    ),
  );
}

function wordsIn(doc: LegalDoc) {
  let n = doc.summary.join(' ').split(/\s+/).length;
  for (const s of doc.sections) {
    for (const b of s.blocks) {
      if (typeof b === 'string') n += b.split(/\s+/).length;
      else if ('list' in b) n += b.list.join(' ').split(/\s+/).length;
      else if ('callout' in b) n += b.callout.split(/\s+/).length;
      else if ('table' in b) n += b.table.rows.flat().join(' ').split(/\s+/).length;
    }
  }
  return n;
}

const secId = (id: string) => `legal-${id}`;

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function LegalPage({ doc }: { doc: string }) {
  const { toast } = useUI();
  const current = DOCS.find((d) => d.slug === doc.toLowerCase()) ?? TERMS;
  const index = DOCS.indexOf(current);
  const prev = index > 0 ? DOCS[index - 1] : null;
  const next = index < DOCS.length - 1 ? DOCS[index + 1] : null;
  const minutes = useMemo(() => Math.max(2, Math.round(wordsIn(current) / 220)), [current]);
  const [active, setActive] = useState(current.sections[0].id);
  const [tocOpen, setTocOpen] = useState(false);
  const docsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `${current.title} · ${BRAND.name}`;
  }, [current]);

  // On narrow screens the document switcher is a horizontal row: keep the active one in view.
  useEffect(() => {
    const row = docsRef.current;
    const el = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !el || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft = Math.max(0, el.offsetLeft - row.offsetLeft - 16);
  }, [current]);

  // Scroll-spy: the active section is the last heading above the top third of the viewport.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.3;
      let id = current.sections[0].id;
      for (const s of current.sections) {
        const el = document.getElementById(secId(s.id));
        if (el && el.getBoundingClientRect().top <= line) id = s.id;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) id = current.sections[current.sections.length - 1].id;
      setActive(id);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      cancelAnimationFrame(raf);
    };
  }, [current]);

  const goTo = (id: string) => {
    setTocOpen(false);
    document.getElementById(secId(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/legal/${current.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', body: `${current.title} link is on your clipboard.`, tone: 'ok' });
    } catch {
      toast({ title: 'Could not copy the link', body: url, tone: 'warn' });
    }
  };

  return (
    <div className="page legal">
      <div className="legal-bg" aria-hidden="true">
        <div className="bg-grid" />
        <div className="glow-blob legal-glow" />
      </div>

      <div className="container">
        <div className="legal-layout">
          <aside className="legal-side">
            <div className="legal-side-inner">
              <nav className="legal-docs" aria-label="Legal documents">
                <span className="legal-side-label">Documents</span>
                <div className="legal-docs-list" ref={docsRef}>
                  {DOCS.map((d) => {
                    const on = d.slug === current.slug;
                    return (
                      <Link
                        key={d.slug}
                        to={`/legal/${d.slug}`}
                        className={`legal-doc-link${on ? ' is-active' : ''}`}
                        aria-current={on ? 'page' : undefined}
                      >
                        <span className="legal-doc-icon" aria-hidden="true">
                          <Icon name={d.icon} size={16} />
                        </span>
                        <span className="legal-doc-text">
                          <strong>{d.nav}</strong>
                          <span>{d.blurb}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </nav>

              <nav className="legal-toc" aria-label="On this page">
                <span className="legal-side-label">On this page</span>
                <TocList doc={current} active={active} onPick={goTo} />
              </nav>

              <div className="legal-help">
                <span className="legal-help-icon" aria-hidden="true">
                  <Icon name="mail" size={16} />
                </span>
                <div className="stack gap-4">
                  <strong className="small">Questions about a policy?</strong>
                  <a href={`mailto:${LEGAL_EMAIL}`} className="legal-link small">
                    {LEGAL_EMAIL}
                  </a>
                </div>
              </div>
            </div>
          </aside>

          <article className="legal-doc anim-fade-up" aria-labelledby="legal-title">
            <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Legal', to: '/legal/terms' }, { label: current.title }]} />

            <header className="legal-head">
              <span className="eyebrow">Legal</span>
              <h1 className="h1" id="legal-title">
                {current.title}
              </h1>
              <div className="legal-meta">
                <span className="legal-meta-item">
                  <Icon name="calendar" size={15} />
                  Last updated {UPDATED}
                </span>
                <span className="legal-meta-dot" aria-hidden="true" />
                <span className="legal-meta-item">
                  <Icon name="clock" size={15} />
                  {minutes} min read
                </span>
                <button type="button" className="btn btn-ghost btn-sm legal-copy" onClick={copyLink}>
                  <Icon name="copy" />
                  Copy link
                </button>
              </div>
            </header>

            <div className="legal-template" role="note">
              <span className="legal-template-icon" aria-hidden="true">
                <Icon name="info" size={17} />
              </span>
              <p>
                <strong>Template notice.</strong> This document is a general storefront template provided for
                illustration. It is not legal advice and must be reviewed by qualified counsel for your business and
                jurisdiction before you rely on it.
              </p>
            </div>

            <section className="legal-summary" aria-labelledby="legal-summary-title">
              <h2 className="legal-summary-title" id="legal-summary-title">
                <Icon name="sparkles" size={16} />
                The short version
              </h2>
              <ul>
                {current.summary.map((s) => (
                  <li key={s}>
                    <span className="legal-summary-check" aria-hidden="true">
                      <Icon name="check" size={12} strokeWidth={2.8} />
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
              <p className="tiny muted">The summary is for convenience. The full text below is what applies.</p>
            </section>

            <div className={`legal-toc-mobile${tocOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="legal-toc-mobile-btn"
                aria-expanded={tocOpen}
                aria-controls="legal-toc-mobile-list"
                onClick={() => setTocOpen((o) => !o)}
              >
                <span className="row gap-8">
                  <Icon name="list" size={16} />
                  On this page
                </span>
                <span className="row gap-8">
                  <span className="tiny mono muted">{current.sections.length} sections</span>
                  <Icon name="chevron-down" size={16} className="legal-toc-chev" />
                </span>
              </button>
              <div className="legal-toc-mobile-panel" id="legal-toc-mobile-list">
                <div className="legal-toc-mobile-inner">
                  <TocList doc={current} active={active} onPick={goTo} />
                </div>
              </div>
            </div>

            <div className="legal-body">
              {current.sections.map((s, i) => (
                <section key={s.id} id={secId(s.id)} className="legal-section" aria-labelledby={`${secId(s.id)}-h`}>
                  <h2 className="legal-h2" id={`${secId(s.id)}-h`}>
                    <span className="legal-num">{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </h2>
                  {s.blocks.map((b, j) => (
                    <BlockView key={j} block={b} />
                  ))}
                </section>
              ))}
            </div>

            <nav className="legal-pager" aria-label="Other legal documents">
              {prev ? (
                <Link to={`/legal/${prev.slug}`} className="legal-pager-link">
                  <span className="legal-pager-dir">
                    <Icon name="arrow-left" size={14} />
                    Previous
                  </span>
                  <strong>{prev.title}</strong>
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link to={`/legal/${next.slug}`} className="legal-pager-link is-next">
                  <span className="legal-pager-dir">
                    Next
                    <Icon name="arrow-right" size={14} />
                  </span>
                  <strong>{next.title}</strong>
                </Link>
              ) : (
                <Link to="/support" className="legal-pager-link is-next">
                  <span className="legal-pager-dir">
                    Still have questions
                    <Icon name="arrow-right" size={14} />
                  </span>
                  <strong>Visit Support</strong>
                </Link>
              )}
            </nav>
          </article>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function TocList({ doc, active, onPick }: { doc: LegalDoc; active: string; onPick: (id: string) => void }) {
  return (
    <ol className="legal-toc-list">
      {doc.sections.map((s, i) => {
        const on = s.id === active;
        return (
          <li key={s.id}>
            <button
              type="button"
              className={`legal-toc-item${on ? ' is-active' : ''}`}
              aria-current={on ? 'location' : undefined}
              onClick={() => onPick(s.id)}
            >
              <span className="legal-toc-num">{String(i + 1).padStart(2, '0')}</span>
              <span>{s.title}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function BlockView({ block }: { block: Block }) {
  if (typeof block === 'string') return <p className="legal-p">{linkify(block)}</p>;
  if ('list' in block) {
    const L = block.ordered ? 'ol' : 'ul';
    return (
      <L className={`legal-list${block.ordered ? ' is-ordered' : ''}`}>
        {block.list.map((item, i) => (
          <li key={i}>
            {block.ordered && <span className="legal-step">{i + 1}</span>}
            <span>{linkify(item)}</span>
          </li>
        ))}
      </L>
    );
  }
  if ('callout' in block) {
    return (
      <div className={`legal-callout tone-${block.tone ?? 'info'}`}>
        <Icon name={block.tone === 'warn' ? 'alert' : 'info'} size={17} />
        <p>{linkify(block.callout)}</p>
      </div>
    );
  }
  if ('table' in block) {
    return (
      <div className="legal-table-wrap">
        <table className="table legal-table">
          <thead>
            <tr>
              {block.table.head.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.table.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} data-label={block.table.head[j]} className={j === 0 ? `legal-td-key${block.table.monoKey ? ' is-mono' : ''}` : undefined}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <CookiePrefs />;
}

const PREFS_KEY = `${CK}.cookie-consent`;

function readAnalyticsPref(): boolean {
  try {
    return window.localStorage.getItem(PREFS_KEY) === 'analytics';
  } catch {
    return false;
  }
}

function CookiePrefs() {
  const { toast } = useUI();
  const [analytics, setAnalytics] = useState(readAnalyticsPref);
  const saved = useRef(analytics);
  const [dirty, setDirty] = useState(false);

  const save = () => {
    try {
      window.localStorage.setItem(PREFS_KEY, analytics ? 'analytics' : 'essential');
    } catch {
      /* storage unavailable: preference applies for this visit only */
    }
    saved.current = analytics;
    setDirty(false);
    toast({
      title: 'Cookie preferences saved',
      body: analytics ? 'Essential and analytics cookies are on.' : 'Only essential cookies are on.',
      tone: 'ok',
    });
  };

  return (
    <div className="legal-prefs">
      <div className="legal-pref">
        <div className="legal-pref-text">
          <strong>Essential</strong>
          <span>Sign-in, cart, security and your consent choice.</span>
        </div>
        <span className="legal-pref-locked mono">
          <Icon name="lock" size={12} />
          Always on
        </span>
      </div>
      <div className="legal-pref">
        <div className="legal-pref-text">
          <strong id="legal-pref-analytics">Analytics</strong>
          <span>Anonymous visit counts and page speed.</span>
        </div>
        <button
          type="button"
          role="switch"
          className="switch legal-switch"
          aria-checked={analytics}
          aria-labelledby="legal-pref-analytics"
          onClick={() => {
            const v = !analytics;
            setAnalytics(v);
            setDirty(v !== saved.current);
          }}
        />
      </div>
      <div className="legal-prefs-foot">
        <span className="tiny muted">{dirty ? 'You have unsaved changes.' : 'Saved in this browser.'}</span>
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!dirty}>
          Save preferences
        </button>
      </div>
    </div>
  );
}
