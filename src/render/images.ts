import type { Asset, ImageLayer } from '../types';
import { ctx2d, hexToRgb, makeCanvas } from '../lib/util';

export type Quality = 'preview' | 'export';
type Src = HTMLCanvasElement | HTMLImageElement;

const PREVIEW_MAX = 1400;
const proxies = new Map<string, Src>();

/** Down-sized copy used while editing so per-pixel tweaks stay instant. */
export function sourceFor(asset: Asset, q: Quality): Src {
  if (q === 'export') return asset.src;
  const longest = Math.max(asset.w, asset.h);
  if (longest <= PREVIEW_MAX) return asset.src;
  let p = proxies.get(asset.id);
  if (!p) {
    const k = PREVIEW_MAX / longest;
    const c = makeCanvas(asset.w * k, asset.h * k);
    const x = ctx2d(c);
    x.imageSmoothingQuality = 'high';
    x.drawImage(asset.src, 0, 0, c.width, c.height);
    proxies.set(asset.id, c);
    p = c;
  }
  return p;
}

interface Processed { canvas: Src; pad: number }
const cache = new Map<string, Processed>();

function key(l: ImageLayer, q: Quality) {
  return [l.asset, q, l.bw, l.bright, l.contrast, l.tint, l.tintAmt, l.keyOut, l.keyTol, l.mask === 'none' ? l.outline : 0, l.outlineColor, Math.round(l.w)].join('|');
}

const needsPixels = (l: ImageLayer) => l.bw || l.bright !== 0 || l.contrast !== 0 || l.tintAmt > 0 || l.keyOut !== 'none';

export function processedImage(l: ImageLayer, asset: Asset, q: Quality): Processed {
  const k = key(l, q);
  const hit = cache.get(k);
  if (hit) {
    cache.delete(k);
    cache.set(k, hit);
    return hit;
  }
  const src = sourceFor(asset, q);
  let out: Src = src;
  if (needsPixels(l)) {
    const c = makeCanvas(src.width, src.height);
    const x = ctx2d(c);
    x.drawImage(src, 0, 0);
    const img = x.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    const [tr, tg, tb] = hexToRgb(l.tint);
    const con = 1 + l.contrast;
    const br = l.bright * 128;
    const tol = l.keyTol;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      if (l.keyOut !== 'none') {
        const v = l.keyOut === 'white' ? 1 - Math.min(r, g, b) / 255 : Math.max(r, g, b) / 255;
        const lo = tol * 0.7;
        const t = Math.min(1, Math.max(0, (v - lo) / 0.12));
        d[i + 3] = d[i + 3] * t * t * (3 - 2 * t);
      }
      if (con !== 1 || br !== 0) {
        r = (r - 128) * con + 128 + br;
        g = (g - 128) * con + 128 + br;
        b = (b - 128) * con + 128 + br;
      }
      if (l.bw || l.tintAmt > 0) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (l.bw) r = g = b = lum;
        if (l.tintAmt > 0) {
          const t = Math.min(1, Math.max(0, lum / 255));
          let cr, cg, cb;
          if (t < 0.5) { const k2 = t * 2; cr = tr * k2; cg = tg * k2; cb = tb * k2; }
          else { const k2 = (t - 0.5) * 2; cr = tr + (255 - tr) * k2; cg = tg + (255 - tg) * k2; cb = tb + (255 - tb) * k2; }
          r += (cr - r) * l.tintAmt;
          g += (cg - g) * l.tintAmt;
          b += (cb - b) * l.tintAmt;
        }
      }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    x.putImageData(img, 0, 0);
    out = c;
  }
  let pad = 0;
  if (l.outline > 0 && l.mask === 'none') {
    // Sticker border: stamp a solid silhouette in a ring of offsets, then the photo on top.
    const pxPerUnit = out.width / l.w;
    pad = Math.max(1, Math.round(l.outline * pxPerUnit));
    const c = makeCanvas(out.width + pad * 2, out.height + pad * 2);
    const x = ctx2d(c);
    const sil = makeCanvas(out.width, out.height);
    const sx = ctx2d(sil);
    sx.drawImage(out, 0, 0);
    sx.globalCompositeOperation = 'source-in';
    sx.fillStyle = l.outlineColor;
    sx.fillRect(0, 0, sil.width, sil.height);
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      x.drawImage(sil, pad + Math.cos(a) * pad, pad + Math.sin(a) * pad);
    }
    x.drawImage(sil, pad, pad);
    x.drawImage(out, pad, pad);
    out = c;
  }
  const res = { canvas: out, pad };
  cache.set(k, res);
  while (cache.size > 24) cache.delete(cache.keys().next().value as string);
  return res;
}

export function forgetAsset(id: string) {
  proxies.delete(id);
  for (const k of [...cache.keys()]) if (k.startsWith(id + '|')) cache.delete(k);
}
