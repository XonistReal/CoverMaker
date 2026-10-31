import type { Stroke } from '../types';
import { rng } from '../lib/util';

/** Resample a polyline so brush stamps are evenly spaced regardless of pointer speed. */
function resample(pts: number[], step: number): [number, number][] {
  const out: [number, number][] = [];
  if (pts.length < 2) return out;
  out.push([pts[0], pts[1]]);
  let px = pts[0];
  let py = pts[1];
  let carry = 0;
  for (let i = 2; i < pts.length; i += 2) {
    const x = pts[i];
    const y = pts[i + 1];
    let d = Math.hypot(x - px, y - py);
    if (d === 0) continue;
    let t = step - carry;
    while (t <= d) {
      const k = t / d;
      out.push([px + (x - px) * k, py + (y - py) * k]);
      t += step;
    }
    carry = d - (t - step);
    px = x;
    py = y;
    d = 0;
  }
  if (out.length === 1) out.push([pts[0] + 0.01, pts[1]]);
  return out;
}

function smoothPath(ctx: CanvasRenderingContext2D, pts: number[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  if (pts.length === 2) {
    ctx.lineTo(pts[0] + 0.01, pts[1]);
    return;
  }
  for (let i = 2; i < pts.length - 2; i += 2) {
    const mx = (pts[i] + pts[i + 2]) / 2;
    const my = (pts[i + 1] + pts[i + 3]) / 2;
    ctx.quadraticCurveTo(pts[i], pts[i + 1], mx, my);
  }
  ctx.lineTo(pts[pts.length - 2], pts[pts.length - 1]);
}

export function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  const r = rng(s.seed);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (s.brush) {
    case 'marker':
    case 'eraser': {
      if (s.brush === 'eraser') ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      smoothPath(ctx, s.pts);
      ctx.stroke();
      break;
    }
    case 'crayon': {
      // Many thin, broken, jittered passes give the waxy kid-drawing texture.
      const passes = Math.max(4, Math.round(s.size / 2.2));
      ctx.strokeStyle = s.color;
      const step = Math.max(2, s.size * 0.35);
      const pts = resample(s.pts, step);
      for (let p = 0; p < passes; p++) {
        const off = (r() - 0.5) * s.size;
        const offY = (r() - 0.5) * s.size;
        ctx.globalAlpha = 0.35 + r() * 0.5;
        ctx.lineWidth = Math.max(0.6, s.size * (0.08 + r() * 0.12));
        ctx.beginPath();
        let drawing = false;
        for (let i = 0; i < pts.length; i++) {
          const skip = r() < 0.12;
          const x = pts[i][0] + off + (r() - 0.5) * s.size * 0.18;
          const y = pts[i][1] + offY + (r() - 0.5) * s.size * 0.18;
          if (skip) { drawing = false; continue; }
          if (!drawing) { ctx.moveTo(x, y); drawing = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'spray': {
      ctx.fillStyle = s.color;
      const pts = resample(s.pts, Math.max(1.5, s.size * 0.18));
      const dots = Math.round(10 + s.size * 0.9);
      for (const [x, y] of pts) {
        for (let i = 0; i < dots; i++) {
          const a = r() * Math.PI * 2;
          // Gaussian-ish falloff so the middle is dense and edges mist out.
          const d = (r() + r() + r()) / 3;
          const rad = Math.abs(d - 0.5) * 2 * s.size;
          ctx.globalAlpha = 0.25 + r() * 0.5;
          const dot = 0.4 + r() * s.size * 0.035;
          ctx.fillRect(x + Math.cos(a) * rad, y + Math.sin(a) * rad, dot, dot);
        }
      }
      break;
    }
    case 'pixel': {
      ctx.fillStyle = s.color;
      const g = Math.max(4, s.size);
      const pts = resample(s.pts, g * 0.5);
      let last = '';
      for (const [x, y] of pts) {
        const gx = Math.floor(x / g) * g;
        const gy = Math.floor(y / g) * g;
        const k = gx + ',' + gy;
        if (k === last) continue;
        last = k;
        ctx.fillRect(gx, gy, g, g);
      }
      break;
    }
  }
  ctx.restore();
}
