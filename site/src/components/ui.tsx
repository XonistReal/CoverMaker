import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { STATUS_META } from '../data/catalog';
import type { Status } from '../data/types';
import { Icon } from './Icon';
import { Link } from '../router';

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export function StatusDot({ status, pulse = true }: { status: Status; pulse?: boolean }) {
  const tone = STATUS_META[status].tone;
  return <span className={`dot ${tone}${pulse && status !== 'detected' ? ' pulse' : ''}`} aria-hidden="true" />;
}

/** Compact status badge: green "Undetected", amber "Updating", etc. */
export function StatusBadge({ status, size = 'md' }: { status: Status; size?: 'sm' | 'md' }) {
  const m = STATUS_META[status];
  return (
    <span className={`status-badge tone-${m.tone} size-${size}`} title={m.hint}>
      <StatusDot status={status} />
      {m.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Rating                                                              */
/* ------------------------------------------------------------------ */

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${value} out of 5 stars`} role="img">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="star" style={{ width: size, height: size }}>
            <Icon name="star-fill" size={size} className="star-bg" />
            <span className="star-fg" style={{ width: `${fill * 100}%` }}>
              <Icon name="star-fill" size={size} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Section header                                                      */
/* ------------------------------------------------------------------ */

interface SectionHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: 'left' | 'center';
  action?: ReactNode;
  as?: 'h1' | 'h2';
}

export function SectionHeader({ eyebrow, title, lead, align = 'left', action, as = 'h2' }: SectionHeaderProps) {
  const H = as;
  return (
    <div className={`section-head${align === 'center' ? ' is-center' : ''}`}>
      <div className="titles">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <H className={as === 'h1' ? 'h1' : 'h2'}>{title}</H>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {action && <div className="row gap-8">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reveal on scroll                                                    */
/* ------------------------------------------------------------------ */

export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Comp = Tag as 'div';
  return (
    <Comp
      ref={ref as React.Ref<HTMLDivElement>}
      className={`reveal${inView ? ' is-in' : ''} ${className}`}
      style={{ ...style, ['--delay' as string]: `${delay}ms` }}
    >
      {children}
    </Comp>
  );
}

/* ------------------------------------------------------------------ */
/* Accordion                                                           */
/* ------------------------------------------------------------------ */

export interface AccordionItem {
  q: ReactNode;
  a: ReactNode;
}

export function Accordion({
  items,
  numbered = false,
  defaultOpen = 0,
}: {
  items: AccordionItem[];
  numbered?: boolean;
  defaultOpen?: number | null;
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const base = useId();
  return (
    <div className="accordion">
      {items.map((it, i) => {
        const isOpen = open === i;
        const id = `${base}-${i}`;
        return (
          <div key={i} className={`acc-item${isOpen ? ' is-open' : ''}`}>
            <button
              className="acc-q"
              aria-expanded={isOpen}
              aria-controls={id}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              {numbered && <span className="acc-num mono">{String(i + 1).padStart(2, '0')}</span>}
              <span className="acc-title">{it.q}</span>
              <span className="acc-icon" aria-hidden="true">
                <Icon name={isOpen ? 'minus' : 'plus'} size={16} />
              </span>
            </button>
            <div className="acc-a" id={id} role="region">
              <div className="acc-a-inner">
                <div className="acc-a-body">{it.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

/** Coloured initial avatar, hue derived from the name. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, hsl(${h} 70% 45%), hsl(${(h + 50) % 360} 70% 30%))`,
      }}
      aria-hidden="true"
    >
      {name.replace(/[^a-z0-9]/gi, '').charAt(0).toUpperCase() || '?'}
    </span>
  );
}

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((c, i) => (
        <span key={i} className="row gap-8">
          {i > 0 && <Icon name="chevron-right" />}
          {c.to && i < items.length - 1 ? (
            <Link to={c.to}>{c.label}</Link>
          ) : (
            <span aria-current={i === items.length - 1 ? 'page' : undefined}>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function EmptyState({
  icon = 'search',
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="icon-tile">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="h4" style={{ color: 'var(--text)' }}>
        {title}
      </h3>
      {body && <p className="small" style={{ maxWidth: 380 }}>{body}</p>}
      {action}
    </div>
  );
}

/** Animated count-up number when scrolled into view. */
export function CountUp({ to, duration = 1400, format }: { to: number; duration?: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const start = () => {
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        setN(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(to);
      return;
    }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        start();
        io.disconnect();
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return (
    <span ref={ref} className="tabular">
      {format ? format(n) : Math.round(n).toLocaleString('en-US')}
    </span>
  );
}
