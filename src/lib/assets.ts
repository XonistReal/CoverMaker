import type { Asset } from '../types';
import { assets, setState, getState } from '../store';
import { ctx2d, makeCanvas, rng, uid } from './util';

const MAX = 3000;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('That file could not be read as an image. Try a JPG, PNG or WEBP.'));
    img.src = url;
  });
}

function toCanvas(img: CanvasImageSource, w: number, h: number) {
  const k = Math.min(1, MAX / Math.max(w, h));
  const c = makeCanvas(w * k, h * k);
  const x = ctx2d(c);
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob | undefined>((res) => c.toBlob((b) => res(b ?? undefined), type, q));

export function registerAsset(a: Asset) {
  assets.set(a.id, a);
  setState({ assetsRev: getState().assetsRev + 1 });
}

export async function importFile(file: Blob, id = uid('a')): Promise<Asset> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const c = toCanvas(img, img.naturalWidth, img.naturalHeight);
    const keepPng = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
    const blob = (await toBlob(c, keepPng ? 'image/png' : 'image/jpeg', 0.92)) ?? file;
    const a: Asset = { id, src: c, w: c.width, h: c.height, blob };
    registerAsset(a);
    return a;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * A moody placeholder portrait drawn in code (hooded figure, hard light) so every
 * style has something to chew on before you upload your own photo.
 */
export function sampleAsset(): Asset {
  const id = 'sample';
  const existing = assets.get(id);
  if (existing) return existing;
  const S = 1400;
  const c = makeCanvas(S, S);
  const x = ctx2d(c);
  const r = rng(42);
  // room
  const wall = x.createLinearGradient(0, 0, 0, S);
  wall.addColorStop(0, '#4a4f5c');
  wall.addColorStop(0.7, '#2a2d35');
  wall.addColorStop(1, '#16171c');
  x.fillStyle = wall;
  x.fillRect(0, 0, S, S);
  const light = x.createRadialGradient(S * 0.38, S * 0.3, 0, S * 0.38, S * 0.3, S * 0.75);
  light.addColorStop(0, 'rgba(255,240,220,0.55)');
  light.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = light;
  x.fillRect(0, 0, S, S);
  // door frame on the wall
  x.fillStyle = 'rgba(20,20,26,0.35)';
  x.fillRect(S * 0.72, S * 0.12, S * 0.2, S * 0.62);
  x.fillStyle = 'rgba(255,255,255,0.05)';
  x.fillRect(S * 0.735, S * 0.135, S * 0.17, S * 0.6);
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},0.03)`;
    x.fillRect(r() * S, r() * S, 2 + r() * 6, 2 + r() * 6);
  }
  // body / hoodie
  const cx = S * 0.47;
  x.save();
  const hoodie = x.createLinearGradient(cx - S * 0.4, 0, cx + S * 0.4, 0);
  hoodie.addColorStop(0, '#0d0d10');
  hoodie.addColorStop(0.35, '#2b2b33');
  hoodie.addColorStop(0.6, '#17171c');
  hoodie.addColorStop(1, '#060608');
  x.fillStyle = hoodie;
  x.beginPath();
  x.moveTo(cx - S * 0.46, S);
  x.bezierCurveTo(cx - S * 0.44, S * 0.78, cx - S * 0.36, S * 0.66, cx - S * 0.17, S * 0.6);
  x.lineTo(cx + S * 0.17, S * 0.6);
  x.bezierCurveTo(cx + S * 0.36, S * 0.66, cx + S * 0.44, S * 0.78, cx + S * 0.46, S);
  x.closePath();
  x.fill();
  // hood
  x.beginPath();
  x.ellipse(cx, S * 0.43, S * 0.2, S * 0.25, 0, 0, Math.PI * 2);
  x.fill();
  // face in shadow
  const face = x.createRadialGradient(cx - S * 0.03, S * 0.44, S * 0.02, cx, S * 0.46, S * 0.15);
  face.addColorStop(0, '#8a6a58');
  face.addColorStop(0.55, '#4a3529');
  face.addColorStop(1, '#120c0a');
  x.fillStyle = face;
  x.beginPath();
  x.ellipse(cx, S * 0.465, S * 0.115, S * 0.155, 0, 0, Math.PI * 2);
  x.fill();
  // soft eye sockets, nose and mouth shading (kept vague so it reads like a dark photo)
  x.save();
  x.filter = 'blur(6px)';
  x.fillStyle = 'rgba(12,7,5,0.7)';
  x.beginPath();
  x.ellipse(cx - S * 0.045, S * 0.445, S * 0.03, S * 0.014, 0.1, 0, Math.PI * 2);
  x.ellipse(cx + S * 0.045, S * 0.445, S * 0.03, S * 0.014, -0.1, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = 'rgba(255,220,190,0.18)';
  x.beginPath();
  x.ellipse(cx - S * 0.008, S * 0.49, S * 0.012, S * 0.03, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = 'rgba(20,10,8,0.55)';
  x.beginPath();
  x.ellipse(cx, S * 0.545, S * 0.035, S * 0.008, 0, 0, Math.PI * 2);
  x.fill();
  x.restore();
  // hood rim highlight
  x.strokeStyle = 'rgba(255,255,255,0.12)';
  x.lineWidth = S * 0.012;
  x.beginPath();
  x.ellipse(cx, S * 0.43, S * 0.19, S * 0.24, 0, Math.PI * 1.05, Math.PI * 1.7);
  x.stroke();
  // chain
  x.strokeStyle = '#d8c48a';
  x.lineWidth = S * 0.006;
  x.setLineDash([S * 0.008, S * 0.004]);
  x.beginPath();
  x.moveTo(cx - S * 0.14, S * 0.64);
  x.quadraticCurveTo(cx, S * 0.82, cx + S * 0.14, S * 0.64);
  x.stroke();
  x.setLineDash([]);
  const pend = x.createRadialGradient(cx - S * 0.006, S * 0.765, 0, cx, S * 0.77, S * 0.024);
  pend.addColorStop(0, '#fff3c4');
  pend.addColorStop(0.5, '#b89a52');
  pend.addColorStop(1, '#5a4520');
  x.fillStyle = pend;
  x.beginPath();
  x.arc(cx, S * 0.77, S * 0.022, 0, Math.PI * 2);
  x.fill();
  // drawstrings
  x.strokeStyle = 'rgba(230,230,235,0.55)';
  x.lineWidth = S * 0.006;
  x.beginPath();
  x.moveTo(cx - S * 0.06, S * 0.62);
  x.lineTo(cx - S * 0.07, S * 0.76);
  x.moveTo(cx + S * 0.06, S * 0.62);
  x.lineTo(cx + S * 0.05, S * 0.74);
  x.stroke();
  x.restore();
  // a little sensor noise so effects have texture to bite into
  const img = x.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 18;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  x.putImageData(img, 0, 0);
  const a: Asset = { id, src: c, w: S, h: S };
  assets.set(id, a);
  return a;
}
