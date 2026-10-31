import type { StickerLayer } from '../types';
import { rng } from '../lib/util';
import { drawStroke } from './brushes';
import { ensureFont, fontString } from '../fonts';

const SANS = 'Oswald';
const MONO = 'VT323';

function fitText(ctx: CanvasRenderingContext2D, text: string, family: string, weight: number, maxW: number, maxH: number) {
  let size = maxH;
  ctx.font = fontString(family, weight, size);
  const w = ctx.measureText(text).width;
  if (w > maxW) size *= maxW / w;
  ctx.font = fontString(family, weight, size);
  return size;
}

function advisory(ctx: CanvasRenderingContext2D, l: StickerLayer) {
  ensureFont(SANS, 700);
  const { w, h } = l;
  const ink = l.color;
  const paper = l.color2;
  const x0 = -w / 2;
  const y0 = -h / 2;
  const pad = h * 0.07;
  ctx.fillStyle = ink;
  ctx.fillRect(x0, y0, w, h);
  // white middle band
  const bandTop = y0 + h * 0.3;
  const bandH = h * 0.42;
  ctx.fillStyle = paper;
  ctx.fillRect(x0 + pad, bandTop, w - pad * 2, bandH);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = paper;
  fitText(ctx, 'PARENTAL', SANS, 700, w - pad * 3, h * 0.2);
  ctx.fillText('PARENTAL', 0, y0 + h * 0.16);
  ctx.fillStyle = ink;
  fitText(ctx, 'ADVISORY', SANS, 700, w - pad * 3, bandH * 0.95);
  ctx.fillText('ADVISORY', 0, bandTop + bandH * 0.53);
  ctx.fillStyle = paper;
  fitText(ctx, 'EXPLICIT CONTENT', SANS, 700, w - pad * 3, h * 0.17);
  ctx.fillText('EXPLICIT CONTENT', 0, y0 + h * 0.86);
}

function explicitTag(ctx: CanvasRenderingContext2D, l: StickerLayer) {
  ensureFont('Arimo', 700);
  const s = Math.min(l.w, l.h);
  ctx.fillStyle = l.color;
  const r = s * 0.12;
  ctx.beginPath();
  ctx.moveTo(-s / 2 + r, -s / 2);
  ctx.arcTo(s / 2, -s / 2, s / 2, s / 2, r);
  ctx.arcTo(s / 2, s / 2, -s / 2, s / 2, r);
  ctx.arcTo(-s / 2, s / 2, -s / 2, -s / 2, r);
  ctx.arcTo(-s / 2, -s / 2, s / 2, -s / 2, r);
  ctx.fill();
  ctx.fillStyle = l.color2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = fontString('Arimo', 700, s * 0.72);
  ctx.fillText('E', 0, s * 0.04);
}

function rec(ctx: CanvasRenderingContext2D, l: StickerLayer) {
  ensureFont(MONO, 400);
  const { w, h } = l;
  const m = w * 0.06;
  const L = w * 0.07;
  ctx.strokeStyle = l.color;
  ctx.lineWidth = w * 0.006;
  ctx.lineCap = 'square';
  const corners: [number, number, number, number][] = [
    [-w / 2 + m, -h / 2 + m, 1, 1], [w / 2 - m, -h / 2 + m, -1, 1], [-w / 2 + m, h / 2 - m, 1, -1], [w / 2 - m, h / 2 - m, -1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x, y + L * dy);
    ctx.lineTo(x, y);
    ctx.lineTo(x + L * dx, y);
    ctx.stroke();
  }
  const fs = w * 0.05;
  ctx.font = fontString(MONO, 400, fs);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = l.color2;
  ctx.beginPath();
  ctx.arc(-w / 2 + m * 1.6, -h / 2 + m * 1.55 + fs * 0.42, fs * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = l.color;
  ctx.fillText('REC', -w / 2 + m * 1.6 + fs * 0.5, -h / 2 + m * 1.55);
  ctx.textAlign = 'right';
  ctx.fillText('SP  ▮▮▮▯', w / 2 - m * 1.4, -h / 2 + m * 1.55);
  const lines = (l.text || '').split('\n');
  ctx.textBaseline = 'bottom';
  lines.reverse().forEach((line, i) => ctx.fillText(line, w / 2 - m * 1.4, h / 2 - m * 1.4 - i * fs * 1.05));
  ctx.textAlign = 'left';
  ctx.fillText('PLAY ▶', -w / 2 + m * 1.6, h / 2 - m * 1.4);
}

function timestamp(ctx: CanvasRenderingContext2D, l: StickerLayer) {
  ensureFont(MONO, 400);
  const { w, h } = l;
  ctx.fillStyle = l.color2;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = l.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitText(ctx, l.text || '00:00:00', MONO, 400, w * 0.9, h * 0.9);
  ctx.fillText(l.text || '00:00:00', 0, h * 0.04);
}

function barcode(ctx: CanvasRenderingContext2D, l: StickerLayer) {
  ensureFont('Share Tech Mono', 400);
  const r = rng(l.seed);
  const { w, h } = l;
  ctx.fillStyle = l.color2;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = l.color;
  const pad = w * 0.08;
  let x = -w / 2 + pad;
  const barH = h * 0.66;
  while (x < w / 2 - pad) {
    const bw = (1 + Math.floor(r() * 3)) * w * 0.006;
    if (r() > 0.42) ctx.fillRect(x, -h / 2 + h * 0.08, bw, barH);
    x += bw + w * 0.005;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = fontString('Share Tech Mono', 400, h * 0.2);
  const digits = l.text || Array.from({ length: 12 }, () => Math.floor(r() * 10)).join('');
  ctx.fillText(digits, 0, h / 2 - h * 0.03);
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, r: () => number, wob = 0.35) {
  const n = 18;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = rad * (1 - wob / 2 + r() * wob);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function splatter(ctx: CanvasRenderingContext2D, l: StickerLayer) {
  const r = rng(l.seed);
  const R = Math.min(l.w, l.h) / 2;
  ctx.fillStyle = l.color;
  // core
  const cores = 1 + Math.floor(r() * 3);
  for (let i = 0; i < cores; i++) blob(ctx, (r() - 0.5) * R * 0.3, (r() - 0.5) * R * 0.3, R * (0.18 + r() * 0.14), r, 0.5);
  // streaks that shoot out from the impact
  const streaks = Math.round(10 + l.amount * 26);
  for (let i = 0; i < streaks; i++) {
    const a = r() * Math.PI * 2;
    const len = R * (0.3 + r() * 0.7);
    const wdt = R * (0.015 + r() * 0.05);
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(R * 0.1, -wdt);
    ctx.quadraticCurveTo(len * 0.7, -wdt * 0.6, len, 0);
    ctx.quadraticCurveTo(len * 0.7, wdt * 0.6, R * 0.1, wdt);
    ctx.fill();
    blob(ctx, len, 0, wdt * (1 + r()), r, 0.3);
    ctx.restore();
  }
  // droplets
  const drops = Math.round(40 + l.amount * 180);
  for (let i = 0; i < drops; i++) {
    const a = r() * Math.PI * 2;
    const d = R * Math.pow(r(), 0.6);
    const s = R * 0.04 * Math.pow(r(), 2.2) + R * 0.004;
    blob(ctx, Math.cos(a) * d, Math.sin(a) * d, s, r, 0.4);
  }
}

function drips(ctx: CanvasRenderingContext2D, l: StickerLayer) {
  const r = rng(l.seed);
  const { w, h } = l;
  const top = -h / 2;
  ctx.fillStyle = l.color;
  // ragged band at the top edge
  ctx.beginPath();
  ctx.moveTo(-w / 2, top);
  ctx.lineTo(w / 2, top);
  for (let x = w / 2; x >= -w / 2; x -= w / 40) ctx.lineTo(x, top + h * (0.03 + r() * 0.05));
  ctx.closePath();
  ctx.fill();
  const count = Math.round(8 + l.amount * 40);
  for (let i = 0; i < count; i++) {
    const x = -w / 2 + r() * w;
    const dw = w * (0.004 + r() * 0.018);
    const len = h * (0.1 + Math.pow(r(), 1.6) * 0.88);
    ctx.beginPath();
    ctx.moveTo(x - dw, top);
    ctx.bezierCurveTo(x - dw, top + len * 0.6, x - dw * 0.8, top + len - dw * 2, x - dw * 0.7, top + len - dw);
    ctx.arc(x, top + len - dw * 1.1, dw * 1.1, Math.PI, 0, true);
    ctx.bezierCurveTo(x + dw * 0.8, top + len - dw * 2, x + dw, top + len * 0.6, x + dw, top);
    ctx.closePath();
    ctx.fill();
  }
}

function sparkle(ctx: CanvasRenderingContext2D, l: StickerLayer) {
  const R = Math.min(l.w, l.h) / 2;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.5);
  g.addColorStop(0, l.color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.globalAlpha *= 0.6;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha /= 0.6;
  ctx.fillStyle = l.color;
  const star = (len: number, thick: number, rot: number) => {
    ctx.save();
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.quadraticCurveTo(thick * 0.2, -thick * 0.2, len, 0);
    ctx.quadraticCurveTo(thick * 0.2, thick * 0.2, 0, len);
    ctx.quadraticCurveTo(-thick * 0.2, thick * 0.2, -len, 0);
    ctx.quadraticCurveTo(-thick * 0.2, -thick * 0.2, 0, -len);
    ctx.fill();
    ctx.restore();
  };
  star(R, R * 0.5, 0);
  if (l.amount > 0.3) star(R * 0.5 * l.amount, R * 0.3, Math.PI / 4);
}

function barbed(ctx: CanvasRenderingContext2D, l: StickerLayer) {
  const r = rng(l.seed);
  const { w, h } = l;
  const amp = h * 0.18;
  ctx.strokeStyle = l.color;
  ctx.lineCap = 'round';
  ctx.lineWidth = h * 0.06;
  const wave = (phase: number) => {
    ctx.beginPath();
    for (let x = -w / 2; x <= w / 2; x += 4) {
      const y = Math.sin((x / w) * Math.PI * 14 + phase) * amp;
      if (x === -w / 2) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  wave(0);
  wave(Math.PI);
  const gap = w / Math.round(5 + l.amount * 12);
  ctx.lineWidth = h * 0.05;
  for (let x = -w / 2 + gap / 2; x < w / 2; x += gap) {
    const s = h * (0.35 + r() * 0.15);
    const tilt = (r() - 0.5) * 0.6;
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x - s * Math.cos(tilt + k * 0.8), -s * Math.sin(tilt + k * 0.8));
      ctx.lineTo(x + s * Math.cos(tilt + k * 0.8), s * Math.sin(tilt + k * 0.8));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(x, 0, h * 0.12, h * 0.2, tilt, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function scribble(ctx: CanvasRenderingContext2D, l: StickerLayer) {
  const r = rng(l.seed);
  const { w, h } = l;
  const rows = Math.round(4 + l.amount * 10);
  for (let row = 0; row < rows; row++) {
    const pts: number[] = [];
    const y0 = -h / 2 + (row + 0.5) * (h / rows);
    const zig = Math.round(10 + r() * 14);
    for (let i = 0; i <= zig; i++) {
      const x = -w / 2 + (i / zig) * w + (r() - 0.5) * 20;
      const y = y0 + (i % 2 ? -1 : 1) * (h / rows) * (0.7 + r() * 0.6) + (r() - 0.5) * 12;
      pts.push(x, y);
    }
    drawStroke(ctx, { brush: 'crayon', color: l.color, size: 9 + r() * 6, seed: l.seed + row, pts });
  }
}

function tape(ctx: CanvasRenderingContext2D, l: StickerLayer) {
  const r = rng(l.seed);
  const { w, h } = l;
  ctx.globalAlpha *= l.amount;
  ctx.fillStyle = l.color;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  for (let y = -h / 2; y <= h / 2; y += h / 8) ctx.lineTo(w / 2 + (r() - 0.5) * h * 0.18, y);
  ctx.lineTo(-w / 2, h / 2);
  for (let y = h / 2; y >= -h / 2; y -= h / 8) ctx.lineTo(-w / 2 + (r() - 0.5) * h * 0.18, y);
  ctx.closePath();
  ctx.fill();
}

function flare(ctx: CanvasRenderingContext2D, l: StickerLayer) {
  const R = Math.min(l.w, l.h) / 2;
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.6);
  g.addColorStop(0, l.color);
  g.addColorStop(0.15, l.color2);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha *= l.amount;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.6, 0, Math.PI * 2);
  ctx.fill();
  // anamorphic streak
  const s = ctx.createLinearGradient(-R, 0, R, 0);
  s.addColorStop(0, 'rgba(0,0,0,0)');
  s.addColorStop(0.5, l.color);
  s.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = s;
  ctx.fillRect(-R, -R * 0.012, R * 2, R * 0.024);
  ctx.save();
  ctx.rotate(Math.PI / 2);
  ctx.globalAlpha *= 0.5;
  ctx.fillRect(-R * 0.6, -R * 0.008, R * 1.2, R * 0.016);
  ctx.restore();
  // ghost rings
  for (let i = 1; i <= 3; i++) {
    ctx.strokeStyle = l.color2;
    ctx.globalAlpha = 0.15 * l.amount;
    ctx.lineWidth = R * 0.01;
    ctx.beginPath();
    ctx.arc(-R * 0.25 * i, R * 0.18 * i, R * 0.06 * i, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function scratches(ctx: CanvasRenderingContext2D, l: StickerLayer) {
  const r = rng(l.seed);
  const { w, h } = l;
  ctx.strokeStyle = l.color;
  ctx.fillStyle = l.color;
  const n = Math.round(4 + l.amount * 20);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + r() * w;
    const y = -h / 2 + r() * h;
    const len = h * (0.1 + r() * 0.6);
    ctx.globalAlpha = 0.2 + r() * 0.5;
    ctx.lineWidth = 0.6 + r() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + (r() - 0.5) * 20, y + len * 0.3, x + (r() - 0.5) * 20, y + len * 0.6, x + (r() - 0.5) * 30, y + len);
    ctx.stroke();
  }
  const specks = Math.round(30 + l.amount * 200);
  for (let i = 0; i < specks; i++) {
    ctx.globalAlpha = 0.2 + r() * 0.6;
    const s = 0.6 + Math.pow(r(), 3) * 5;
    ctx.beginPath();
    ctx.arc(-w / 2 + r() * w, -h / 2 + r() * h, s, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawSticker(ctx: CanvasRenderingContext2D, l: StickerLayer) {
  ctx.save();
  switch (l.sticker) {
    case 'advisory': advisory(ctx, l); break;
    case 'explicit': explicitTag(ctx, l); break;
    case 'rec': rec(ctx, l); break;
    case 'timestamp': timestamp(ctx, l); break;
    case 'barcode': barcode(ctx, l); break;
    case 'splatter': splatter(ctx, l); break;
    case 'drips': drips(ctx, l); break;
    case 'sparkle': sparkle(ctx, l); break;
    case 'barbed': barbed(ctx, l); break;
    case 'scribble': scribble(ctx, l); break;
    case 'tape': tape(ctx, l); break;
    case 'flare': flare(ctx, l); break;
    case 'scratches': scratches(ctx, l); break;
  }
  ctx.restore();
}
