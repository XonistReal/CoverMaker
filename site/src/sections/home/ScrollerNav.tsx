import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';

/** Drives a `.scroller` row with prev/next buttons that page by whole cards. */
export function useScrollerNav<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft <= 4);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = 'ResizeObserver' in window ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, []);

  const page = useCallback((dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 16;
    const step = first ? first.getBoundingClientRect().width + gap : el.clientWidth * 0.8;
    const perPage = Math.max(1, Math.floor((el.clientWidth + gap) / step));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * step * perPage, behavior: reduce ? 'auto' : 'smooth' });
  }, []);

  return { ref, atStart, atEnd, page };
}

export function ScrollerArrows({
  label,
  atStart,
  atEnd,
  onPage,
}: {
  label: string;
  atStart: boolean;
  atEnd: boolean;
  onPage: (dir: 1 | -1) => void;
}) {
  return (
    <div className="home-arrows">
      <button
        type="button"
        className="btn btn-ghost btn-icon home-arrow"
        onClick={() => onPage(-1)}
        disabled={atStart}
        aria-label={`Previous ${label}`}
      >
        <Icon name="arrow-left" />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-icon home-arrow"
        onClick={() => onPage(1)}
        disabled={atEnd}
        aria-label={`Next ${label}`}
      >
        <Icon name="arrow-right" />
      </button>
    </div>
  );
}

/** True once the element has scrolled into view (and stays true while visible). */
export function useInView<T extends HTMLElement>(rootMargin = '0px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver((es) => setInView(es.some((e) => e.isIntersecting)), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return { ref, inView };
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
