import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './ScrollerNav';

/**
 * Layered, GPU-light hero background: dot matrix, glows, a slowly drifting
 * HUD reticle with a radar sweep, a perspective floor grid, a scan band and a
 * small canvas of rising particles. Everything is decorative (aria-hidden).
 */
export function HeroBackdrop() {
  return (
    <div className="home-hero-bg" aria-hidden="true">
      <div className="home-hero-glow-top" />
      <div className="home-hero-dots" />
      <div className="home-hero-reticle-wrap">
        <HeroReticle />
      </div>
      <div className="home-hero-floor">
        <div className="home-hero-floor-grid" />
      </div>
      <HeroParticles />
      <div className="home-hero-scan" />
      <div className="home-hero-horizon" />
      <div className="home-hero-fade" />
    </div>
  );
}

function HeroReticle() {
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  return (
    <div className="home-reticle">
      <div className="home-reticle-sweep" />
      <svg viewBox="0 0 1000 1000" className="home-reticle-svg">
        <g className="home-reticle-spin-slow">
          <circle cx="500" cy="500" r="486" strokeDasharray="2 10" />
          <circle cx="500" cy="500" r="470" strokeOpacity="0.35" />
        </g>
        <g className="home-reticle-spin-rev">
          {ticks.map((deg) => {
            const long = deg % 30 === 0;
            const r1 = long ? 382 : 392;
            const r2 = 404;
            const a = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                x1={500 + r1 * Math.cos(a)}
                y1={500 + r1 * Math.sin(a)}
                x2={500 + r2 * Math.cos(a)}
                y2={500 + r2 * Math.sin(a)}
                strokeOpacity={long ? 0.9 : 0.45}
              />
            );
          })}
          <circle cx="500" cy="500" r="404" strokeOpacity="0.4" />
        </g>
        <g className="home-reticle-spin-mid">
          {[0, 90, 180, 270].map((deg) => (
            <path
              key={deg}
              d="M 500 210 A 290 290 0 0 1 705 295"
              transform={`rotate(${deg} 500 500)`}
              strokeWidth="2.4"
              className="home-reticle-arc"
            />
          ))}
          <circle cx="500" cy="500" r="290" strokeOpacity="0.25" />
        </g>
        <g strokeOpacity="0.5">
          <circle cx="500" cy="500" r="150" strokeDasharray="1 7" />
          <path d="M500 40v110M500 850v110M40 500h110M850 500h110" />
          <path d="M500 330v60M500 610v60M330 500h60M610 500h60" strokeOpacity="0.8" />
        </g>
      </svg>
    </div>
  );
}

interface Particle {
  x: number;
  y: number;
  r: number;
  vy: number;
  drift: number;
  phase: number;
  life: number;
  ttl: number;
  bright: boolean;
}

function HeroParticles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduce = prefersReducedMotion();
    const hue = getComputedStyle(document.documentElement).getPropertyValue('--accent-h').trim() || '191';
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    let parts: Particle[] = [];

    const spawn = (anywhere: boolean): Particle => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 0.5 + Math.random() * 1.3,
      vy: 6 + Math.random() * 16,
      drift: 4 + Math.random() * 10,
      phase: Math.random() * Math.PI * 2,
      life: anywhere ? Math.random() * 12 : 0,
      ttl: 9 + Math.random() * 10,
      bright: Math.random() < 0.18,
    });

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        const fade = Math.min(1, p.life / 2, (p.ttl - p.life) / 2);
        const tw = 0.65 + 0.35 * Math.sin(time / 700 + p.phase);
        const a = Math.max(0, fade * tw * (p.bright ? 0.85 : 0.4));
        const x = p.x + Math.sin(time / 2400 + p.phase) * p.drift;
        ctx.fillStyle = p.bright ? `hsla(${hue}, 100%, 72%, ${a})` : `hsla(${hue}, 40%, 88%, ${a})`;
        ctx.beginPath();
        ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(70, Math.round((w * h) / 17000));
      parts = Array.from({ length: n }, () => spawn(true));
      draw(performance.now());
    };
    resize();

    if (reduce) {
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }

    let raf = 0;
    let last = performance.now();
    let running = false;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.life += dt;
        p.y -= p.vy * dt;
        if (p.life > p.ttl || p.y < -10) parts[i] = spawn(false);
      }
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    let visible = true;
    const io = new IntersectionObserver((es) => {
      visible = es.some((e) => e.isIntersecting);
      if (visible && !document.hidden) start();
      else stop();
    });
    io.observe(canvas);
    const onVis = () => (document.hidden || !visible ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', resize);

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="home-hero-canvas" />;
}
