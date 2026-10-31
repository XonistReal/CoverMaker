import type { MaskShape, ShapeLayer } from '../types';
import { rng } from '../lib/util';

type Pt = [number, number];

function polygon(w: number, h: number, shape: ShapeLayer['shape'] | MaskShape, points = 5): Pt[] {
  const hw = w / 2;
  const hh = h / 2;
  switch (shape) {
    case 'triangle':
      return [[0, -hh], [hw, hh], [-hw, hh]];
    case 'diamond':
      return [[0, -hh], [hw, 0], [0, hh], [-hw, 0]];
    case 'star': {
      const out: Pt[] = [];
      const n = Math.max(3, Math.round(points));
      for (let i = 0; i < n * 2; i++) {
        const r = i % 2 === 0 ? 1 : 0.42;
        const a = -Math.PI / 2 + (i * Math.PI) / n;
        out.push([Math.cos(a) * hw * r, Math.sin(a) * hh * r]);
      }
      return out;
    }
    case 'cross':
    case 'invcross': {
      const t = w * 0.24; // beam thickness
      const bar = shape === 'cross' ? -hh + h * 0.3 : hh - h * 0.3; // crossbar center
      const pts: Pt[] = [
        [-t / 2, -hh], [t / 2, -hh], [t / 2, bar - t / 2], [hw, bar - t / 2], [hw, bar + t / 2], [t / 2, bar + t / 2],
        [t / 2, hh], [-t / 2, hh], [-t / 2, bar + t / 2], [-hw, bar + t / 2], [-hw, bar - t / 2], [-t / 2, bar - t / 2],
      ];
      return pts;
    }
    case 'heart': {
      const out: Pt[] = [];
      for (let i = 0; i < 64; i++) {
        const t = (i / 64) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3;
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        out.push([(x / 17) * hw, (y / 17) * hh + hh * 0.08]);
      }
      return out;
    }
    case 'ellipse':
    case 'circle': {
      const out: Pt[] = [];
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        out.push([Math.cos(a) * hw, Math.sin(a) * hh]);
      }
      return out;
    }
    case 'arch': {
      const out: Pt[] = [[-hw, hh]];
      const r = hw;
      for (let i = 0; i <= 36; i++) {
        const a = Math.PI + (i / 36) * Math.PI;
        out.push([Math.cos(a) * r, -hh + r + Math.sin(a) * r]);
      }
      out.push([hw, hh]);
      return out;
    }
    default:
      return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
  }
}

function roughen(pts: Pt[], amount: number, seed: number, scale: number): Pt[] {
  if (amount <= 0) return pts;
  const r = rng(seed);
  const out: Pt[] = [];
  const amp = amount * 14 * scale;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.round(len / 24));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push([a[0] + (b[0] - a[0]) * t + (r() - 0.5) * amp, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * amp]);
    }
  }
  return out;
}

export function tracePoly(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

export function maskPath(ctx: CanvasRenderingContext2D, mask: MaskShape, w: number, h: number) {
  if (mask === 'rounded') {
    const r = Math.min(w, h) * 0.12;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + r, -h / 2);
    ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
    ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
    ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
    ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
    ctx.closePath();
    return;
  }
  const shape = mask === 'circle' ? 'ellipse' : mask;
  tracePoly(ctx, polygon(w, h, shape as ShapeLayer['shape']));
}

export function drawShape(ctx: CanvasRenderingContext2D, l: ShapeLayer) {
  const { w, h } = l;
  ctx.lineJoin = l.rough > 0 ? 'round' : 'miter';
  ctx.lineCap = 'round';
  if (l.shape === 'line') {
    const pts = roughen([[-w / 2, 0], [w / 2, 0]], l.rough, l.seed, 1);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineTo(w / 2, 0);
    ctx.strokeStyle = l.strokeColor;
    ctx.lineWidth = Math.max(1, l.stroke);
    ctx.stroke();
    return;
  }
  const pts = roughen(polygon(w, h, l.shape === 'frame' ? 'rect' : l.shape, l.points), l.rough, l.seed, 1);
  tracePoly(ctx, pts);
  if (l.fillOn) {
    if (l.gradient) {
      const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, l.fill);
      g.addColorStop(1, l.fill2);
      ctx.fillStyle = g;
    } else ctx.fillStyle = l.fill;
    ctx.fill();
  }
  if (l.stroke > 0) {
    ctx.strokeStyle = l.strokeColor;
    ctx.lineWidth = l.stroke;
    ctx.stroke();
  }
}
