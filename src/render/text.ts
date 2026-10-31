import type { TextLayer } from '../types';
import { ensureFont, fontString } from '../fonts';
import { rng } from '../lib/util';

export interface Box { w: number; h: number; cx: number; cy: number }

interface Glyph { s: string; x: number; y: number; rot: number; sc: number }

const METALS: Record<string, [number, string][]> = {
  chrome: [[0, '#ffffff'], [0.3, '#dfe3e9'], [0.47, '#7a7f89'], [0.5, '#16181c'], [0.6, '#9ea4ae'], [0.82, '#f7f9fc'], [1, '#6f747d']],
  gold: [[0, '#fff7cf'], [0.35, '#f3c552'], [0.48, '#8d5c10'], [0.53, '#5a3605'], [0.62, '#d9a43a'], [0.85, '#fff0ad'], [1, '#a46f17']],
  ice: [[0, '#ffffff'], [0.3, '#cfe9ff'], [0.47, '#5d86b8'], [0.5, '#0c1a2e'], [0.6, '#8fb8e6'], [0.82, '#f2fbff'], [1, '#4f6f99']],
};

export const applyCase = (t: string, caps: TextLayer['caps']) =>
  caps === 'upper' ? t.toUpperCase() : caps === 'lower' ? t.toLowerCase() : t;

function layout(ctx: CanvasRenderingContext2D, l: TextLayer): { glyphs: Glyph[]; box: Box; perChar: boolean } {
  const size = l.size;
  const text = applyCase(l.text, l.caps);
  const track = (l.tracking / 1000) * size;
  const r = rng(l.seed);
  const glyphs: Glyph[] = [];
  const jit = () => {
    if (l.jitter <= 0) return { rot: 0, dy: 0, sc: 1 };
    return { rot: (r() - 0.5) * l.jitter * 0.7, dy: (r() - 0.5) * l.jitter * size * 0.3, sc: 1 + (r() - 0.5) * l.jitter * 0.45 };
  };

  if (l.path === 'arc' || l.path === 'circle') {
    const line = text.replace(/\n+/g, l.path === 'circle' ? '  ' : ' ');
    const chars = Array.from(line);
    const adv = chars.map((c) => ctx.measureText(c).width + track);
    const total = adv.reduce((a, b) => a + b, 0);
    const R = l.path === 'circle' ? Math.max(40, Math.abs(l.curve)) : Math.abs(l.curve) < 40 ? 40 * Math.sign(l.curve || 1) : l.curve;
    if (l.path === 'circle') {
      const k = (Math.PI * 2) / Math.max(1, total);
      let s = 0;
      chars.forEach((c, i) => {
        const a = (s + adv[i] / 2) * k * (l.curve < 0 ? -1 : 1);
        s += adv[i];
        const j = jit();
        glyphs.push({ s: c, x: Math.sin(a) * R, y: -Math.cos(a) * R + j.dy, rot: a + j.rot, sc: j.sc });
      });
      const ext = R + size * 0.7;
      return { glyphs, box: { w: ext * 2, h: ext * 2, cx: 0, cy: 0 }, perChar: true };
    }
    let s = -total / 2;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    chars.forEach((c, i) => {
      const mid = s + adv[i] / 2;
      s += adv[i];
      const th = mid / R;
      const j = jit();
      const x = R * Math.sin(th);
      const y = R * (1 - Math.cos(th)) + j.dy;
      glyphs.push({ s: c, x, y, rot: th + j.rot, sc: j.sc });
      minX = Math.min(minX, x - size * 0.5); maxX = Math.max(maxX, x + size * 0.5);
      minY = Math.min(minY, y - size * 0.6); maxY = Math.max(maxY, y + size * 0.6);
    });
    if (!glyphs.length) return { glyphs, box: { w: size, h: size, cx: 0, cy: 0 }, perChar: true };
    return { glyphs, box: { w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }, perChar: true };
  }

  const lines = text.split('\n');
  const lineH = size * l.leading;
  const perChar = track !== 0 || l.jitter > 0 || l.path === 'wave';
  const widths = lines.map((ln) => {
    if (!perChar) return ctx.measureText(ln).width;
    return Array.from(ln).reduce((a, c) => a + ctx.measureText(c).width + track, 0) - (ln.length ? track : 0);
  });
  const maxW = Math.max(size * 0.3, ...widths);
  const H = lines.length * lineH;
  const amp = l.path === 'wave' ? l.curve / 8 : 0;
  const wl = size * 3.2;
  lines.forEach((ln, li) => {
    const y = -H / 2 + lineH * (li + 0.5);
    const lw = widths[li];
    let x = l.align === 'left' ? -maxW / 2 : l.align === 'right' ? maxW / 2 - lw : -lw / 2;
    if (!perChar) {
      glyphs.push({ s: ln, x: x + lw / 2, y, rot: 0, sc: 1 });
      return;
    }
    for (const c of Array.from(ln)) {
      const w = ctx.measureText(c).width;
      const cx = x + w / 2;
      const j = jit();
      let gy = y + j.dy;
      let rot = j.rot;
      if (amp) {
        gy += Math.sin((cx / wl) * Math.PI * 2) * amp;
        rot += Math.atan(Math.cos((cx / wl) * Math.PI * 2) * amp * ((Math.PI * 2) / wl)) * 0.8;
      }
      glyphs.push({ s: c, x: cx, y: gy, rot, sc: j.sc });
      x += w + track;
    }
  });
  return { glyphs, box: { w: maxW, h: H + Math.abs(amp) * 2, cx: 0, cy: 0 }, perChar };
}

function fillStyle(ctx: CanvasRenderingContext2D, l: TextLayer, size: number): string | CanvasGradient {
  if (l.fill === 'solid' || l.fill === 'none') return l.color;
  const g = ctx.createLinearGradient(0, -size * 0.55, 0, size * 0.45);
  if (l.fill === 'gradient') {
    g.addColorStop(0, l.color);
    g.addColorStop(1, l.color2);
  } else for (const [o, c] of METALS[l.fill]) g.addColorStop(o, c);
  return g;
}

/** Draws the layer centered at 0,0 in the current transform. Returns its local bounding box. */
export function drawText(ctx: CanvasRenderingContext2D, l: TextLayer, dryRun = false): Box {
  ensureFont(l.font, l.weight, l.italic);
  ctx.save();
  ctx.font = fontString(l.font, l.weight, l.size, l.italic);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const { glyphs, box } = layout(ctx, l);
  let outBox = { ...box, w: box.w * l.stretch, cx: box.cx * l.stretch };
  const k = l.fit > 0 && outBox.w > l.fit ? l.fit / outBox.w : 1;
  if (k < 1) outBox = { w: outBox.w * k, h: outBox.h * k, cx: outBox.cx * k, cy: outBox.cy * k };
  if (dryRun) {
    ctx.restore();
    return outBox;
  }
  if (k < 1) ctx.scale(k, k);
  ctx.scale(l.stretch, 1);
  const m = ctx.getTransform();
  const px = Math.hypot(m.a, m.b) || 1; // device px per local unit, for shadow sizes
  const size = l.size;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  const each = (fn: (g: Glyph) => void) => {
    for (const g of glyphs) {
      ctx.save();
      ctx.translate(g.x, g.y);
      if (g.rot) ctx.rotate(g.rot);
      if (g.sc !== 1) ctx.scale(g.sc, g.sc);
      fn(g);
      ctx.restore();
    }
  };

  // shadow-only pass trick: draw far off-canvas and let the offset shadow land in place
  const FAR = 20000;
  const shadowPass = (color: string, blur: number, ox: number, oy: number, times = 1) => {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur * px;
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#000';
    each((g) => {
      const mm = ctx.getTransform();
      // the far offset must be expressed in device px along the current axes
      const dx = FAR * mm.a;
      const dy = FAR * mm.b;
      ctx.shadowOffsetX = dx + ox * px;
      ctx.shadowOffsetY = dy + oy * px;
      for (let i = 0; i < times; i++) {
        ctx.fillText(g.s, -FAR, 0);
        if (l.stroke > 0) {
          ctx.lineWidth = l.stroke * 2;
          ctx.strokeText(g.s, -FAR, 0);
        }
      }
    });
    ctx.restore();
  };

  if (l.extrude > 0) {
    const depth = l.extrude * size * 0.16;
    const steps = Math.min(60, Math.ceil(depth / 1.2));
    ctx.fillStyle = l.extrudeColor;
    ctx.strokeStyle = l.extrudeColor;
    for (let i = steps; i >= 1; i--) {
      const o = (depth * i) / steps;
      each((g) => {
        ctx.fillText(g.s, o * 0.6, o);
        if (l.stroke > 0) {
          ctx.lineWidth = l.stroke * 2;
          ctx.strokeText(g.s, o * 0.6, o);
        }
      });
    }
  }
  if (l.shadow > 0) shadowPass(l.shadowColor, l.shadow * size * 0.06, l.shadow * size * 0.05, l.shadow * size * 0.07);
  if (l.glow > 0) {
    shadowPass(l.glowColor, l.glow * size * 0.35, 0, 0, 2);
    shadowPass(l.glowColor, l.glow * size * 0.08, 0, 0, 1);
  }
  if (l.stroke > 0) {
    ctx.strokeStyle = l.strokeColor;
    ctx.lineWidth = l.fill === 'none' ? l.stroke : l.stroke * 2;
    each((g) => ctx.strokeText(g.s, 0, 0));
  }
  if (l.fill !== 'none') {
    each((g) => {
      ctx.fillStyle = fillStyle(ctx, l, size);
      ctx.fillText(g.s, 0, 0);
    });
  }
  ctx.restore();
  return outBox;
}
