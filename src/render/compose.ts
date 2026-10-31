import type { Asset, Background, Doc, DrawLayer, ImageLayer, Layer } from '../types';
import { ctx2d, hexToRgb, makeCanvas, rng } from '../lib/util';
import { drawShape, maskPath } from './shapes';
import { drawSticker } from './stickers';
import { drawText, type Box } from './text';
import { drawStroke } from './brushes';
import { processedImage, type Quality } from './images';
import { FxEngine, fxIsNeutral } from './fx';

export interface RenderOpts {
  size: number;
  quality: Quality;
  assets: Map<string, Asset>;
  /** Separate GL context for style thumbnails so they don't thrash the main buffers. */
  engine?: 'main' | 'thumb';
}

// ---------- background textures ----------
const texCache = new Map<string, HTMLCanvasElement>();
function texture(kind: 'paper' | 'concrete', color: string, size: number) {
  const k = `${kind}|${color}|${size}`;
  const hit = texCache.get(k);
  if (hit) return hit;
  const c = makeCanvas(size, size);
  const x = ctx2d(c);
  const [r0, g0, b0] = hexToRgb(color);
  x.fillStyle = color;
  x.fillRect(0, 0, size, size);
  // low-frequency blotches
  const r = rng(kind === 'paper' ? 11 : 23);
  const blots = kind === 'paper' ? 40 : 90;
  for (let i = 0; i < blots; i++) {
    const rad = size * (0.05 + r() * 0.25);
    const px = r() * size;
    const py = r() * size;
    const g = x.createRadialGradient(px, py, 0, px, py, rad);
    const dark = r() > 0.5;
    const a = kind === 'paper' ? 0.05 : 0.12;
    g.addColorStop(0, dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  // fine noise
  const img = x.getImageData(0, 0, size, size);
  const d = img.data;
  const amp = kind === 'paper' ? 14 : 34;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amp;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  x.putImageData(img, 0, 0);
  if (kind === 'paper') {
    // fibers
    x.strokeStyle = `rgba(${r0 * 0.7},${g0 * 0.7},${b0 * 0.7},0.08)`;
    x.lineWidth = Math.max(1, size / 1500);
    for (let i = 0; i < 500; i++) {
      const px = r() * size, py = r() * size, len = size * (0.005 + r() * 0.02), a = r() * Math.PI;
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
      x.stroke();
    }
  }
  texCache.set(k, c);
  if (texCache.size > 6) texCache.delete(texCache.keys().next().value as string);
  return c;
}

export function drawBackground(ctx: CanvasRenderingContext2D, bg: Background, size: number) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (bg.type === 'paper' || bg.type === 'concrete') {
    ctx.drawImage(texture(bg.type, bg.c1, Math.min(size, 1600)), 0, 0, size, size);
  } else if (bg.type === 'linear') {
    const a = ((bg.angle - 90) * Math.PI) / 180;
    const dx = Math.cos(a), dy = Math.sin(a);
    const half = (size / 2) * (Math.abs(dx) + Math.abs(dy));
    const g = ctx.createLinearGradient(size / 2 - dx * half, size / 2 - dy * half, size / 2 + dx * half, size / 2 + dy * half);
    g.addColorStop(0, bg.c1);
    g.addColorStop(1, bg.c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (bg.type === 'radial') {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.72);
    g.addColorStop(0, bg.c1);
    g.addColorStop(1, bg.c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else {
    ctx.fillStyle = bg.c1;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.restore();
}

// ---------- drawing layers ----------
const drawCache = new WeakMap<DrawLayer['strokes'], { size: number; c: HTMLCanvasElement }>();

function drawLayerCanvas(l: DrawLayer, size: number) {
  const hit = drawCache.get(l.strokes);
  if (hit && hit.size === size) return hit.c;
  const c = makeCanvas(size, size);
  const x = ctx2d(c);
  x.setTransform(size / 1000, 0, 0, size / 1000, 0, 0);
  for (const s of l.strokes) drawStroke(x, s);
  drawCache.set(l.strokes, { size, c });
  return c;
}

/** Circle/triangle/diamond/arch masks use the photo's inner square so they never stretch. */
export function maskSize(l: ImageLayer): [number, number] {
  if (l.mask === 'none' || l.mask === 'rounded') return [l.w, l.h];
  const s = Math.min(l.w, l.h);
  return [s, s];
}

function applyTransform(ctx: CanvasRenderingContext2D, l: Layer) {
  ctx.translate(l.x, l.y);
  if (l.rot) ctx.rotate((l.rot * Math.PI) / 180);
  if (l.scale !== 1) ctx.scale(l.scale, l.scale);
}

export function drawLayer(ctx: CanvasRenderingContext2D, l: Layer, opts: RenderOpts) {
  if (l.hidden) return;
  ctx.save();
  ctx.globalAlpha = l.opacity;
  ctx.globalCompositeOperation = l.blend;
  if (l.kind === 'draw') {
    // strokes are stored in doc space relative to the layer origin (500,500 at creation)
    ctx.save();
    ctx.translate(l.x, l.y);
    if (l.rot) ctx.rotate((l.rot * Math.PI) / 180);
    if (l.scale !== 1) ctx.scale(l.scale, l.scale);
    ctx.translate(-500, -500);
    ctx.drawImage(drawLayerCanvas(l, opts.size), 0, 0, 1000, 1000);
    ctx.restore();
    ctx.restore();
    return;
  }
  applyTransform(ctx, l);
  switch (l.kind) {
    case 'image': {
      const asset = opts.assets.get(l.asset);
      if (!asset) break;
      const { canvas, pad } = processedImage(l, asset, opts.quality);
      const padU = pad * (l.w / (canvas.width - pad * 2));
      ctx.scale(l.flipX ? -1 : 1, l.flipY ? -1 : 1);
      const m = ctx.getTransform();
      const px = Math.hypot(m.a, m.b);
      const [mw, mh] = maskSize(l);
      if (l.mask !== 'none' && l.outline > 0) {
        ctx.save();
        maskPath(ctx, l.mask, mw, mh);
        ctx.strokeStyle = l.outlineColor;
        ctx.lineWidth = l.outline * 2;
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
      }
      if (l.shadow > 0) {
        ctx.shadowColor = `rgba(0,0,0,${0.35 + l.shadow * 0.45})`;
        ctx.shadowBlur = l.shadow * 40 * px;
        ctx.shadowOffsetY = l.shadow * 14 * px;
      }
      if (l.mask !== 'none') {
        maskPath(ctx, l.mask, mw, mh);
        ctx.clip();
      }
      ctx.drawImage(canvas, -l.w / 2 - padU, -l.h / 2 - padU, l.w + padU * 2, l.h + padU * 2);
      break;
    }
    case 'text':
      drawText(ctx, l);
      break;
    case 'shape':
      drawShape(ctx, l);
      break;
    case 'sticker':
      drawSticker(ctx, l);
      break;
  }
  ctx.restore();
}

let measureCtx: CanvasRenderingContext2D | null = null;

/** Local (unscaled, unrotated) bounds of a layer, centered on its origin unless cx/cy say otherwise. */
export function layerBox(l: Layer): Box {
  switch (l.kind) {
    case 'image': {
      const [w, h] = maskSize(l);
      return { w: w + l.outline * 2, h: h + l.outline * 2, cx: 0, cy: 0 };
    }
    case 'shape':
      return { w: l.w + l.stroke, h: Math.max(l.h, 24) + l.stroke, cx: 0, cy: 0 };
    case 'sticker':
      return { w: l.w, h: l.h, cx: 0, cy: 0 };
    case 'text': {
      if (!measureCtx) measureCtx = ctx2d(makeCanvas(4, 4));
      const b = drawText(measureCtx, l, true);
      return { ...b, w: b.w + l.stroke * 2, h: b.h + l.stroke * 2 };
    }
    case 'draw': {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const s of l.strokes) {
        for (let i = 0; i < s.pts.length; i += 2) {
          minX = Math.min(minX, s.pts[i] - s.size); maxX = Math.max(maxX, s.pts[i] + s.size);
          minY = Math.min(minY, s.pts[i + 1] - s.size); maxY = Math.max(maxY, s.pts[i + 1] + s.size);
        }
      }
      if (!Number.isFinite(minX)) return { w: 1000, h: 1000, cx: 0, cy: 0 };
      return { w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2 - 500, cy: (minY + maxY) / 2 - 500 };
    }
  }
}

// ---------- full render ----------
const engines = new Map<string, FxEngine | null>();
let engineError = '';
export function getEngine(slot: 'main' | 'thumb' = 'main') {
  if (!engines.has(slot)) {
    let e: FxEngine | null = null;
    try {
      e = FxEngine.create();
      if (!e) engineError = 'WebGL is unavailable in this browser, so photo effects are switched off.';
    } catch (err) {
      engineError = (err as Error).message;
      console.error(err);
    }
    engines.set(slot, e);
  }
  return engines.get(slot) ?? null;
}
export const getEngineError = () => engineError;

const baseCanvases = new Map<number, HTMLCanvasElement>();
function baseCanvas(size: number) {
  let c = baseCanvases.get(size);
  if (!c) {
    if (baseCanvases.size > 1) baseCanvases.clear();
    c = makeCanvas(size, size);
    baseCanvases.set(size, c);
  }
  return c;
}

export function renderDoc(doc: Doc, out: HTMLCanvasElement, opts: RenderOpts) {
  const R = opts.size;
  if (out.width !== R) out.width = R;
  if (out.height !== R) out.height = R;
  const k = R / 1000;
  const base = baseCanvas(R);
  const bx = ctx2d(base);
  bx.setTransform(1, 0, 0, 1, 0, 0);
  bx.globalAlpha = 1;
  bx.globalCompositeOperation = 'source-over';
  bx.imageSmoothingQuality = 'high';
  drawBackground(bx, doc.bg, R);
  bx.setTransform(k, 0, 0, k, 0, 0);
  for (const l of doc.layers) if (!l.clean) drawLayer(bx, l, opts);

  const ox = ctx2d(out);
  ox.setTransform(1, 0, 0, 1, 0, 0);
  ox.globalAlpha = 1;
  ox.globalCompositeOperation = 'source-over';
  let src: HTMLCanvasElement = base;
  if (!fxIsNeutral(doc.fx)) {
    const e = getEngine(opts.engine ?? 'main');
    if (e && R <= e.maxSize) {
      try {
        src = e.render(base, doc.fx);
      } catch (err) {
        engineError = (err as Error).message;
        console.error(err);
      }
    }
  }
  ox.clearRect(0, 0, R, R);
  ox.drawImage(src, 0, 0, R, R);
  ox.setTransform(k, 0, 0, k, 0, 0);
  for (const l of doc.layers) if (l.clean) drawLayer(ox, l, opts);
  ox.setTransform(1, 0, 0, 1, 0, 0);
}
