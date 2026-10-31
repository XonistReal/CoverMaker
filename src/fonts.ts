export type FontCat = 'Gothic' | 'Bold' | 'Serif' | 'Hand' | 'Graffiti' | 'Horror' | 'Digital' | 'Psych';

export interface FontDef {
  family: string;
  cat: FontCat;
  weights: number[];
  italic?: boolean;
  /** Google Fonts css2 family spec */
  spec: string;
}

const f = (family: string, cat: FontCat, weights: number[] = [400], italic = false): FontDef => {
  let spec = family.replace(/ /g, '+');
  if (italic) spec += `:ital,wght@${[0, 1].flatMap((i) => weights.map((w) => `${i},${w}`)).join(';')}`;
  else if (weights.length > 1 || weights[0] !== 400) spec += `:wght@${weights.join(';')}`;
  return { family, cat, weights, italic, spec };
};

export const FONTS: FontDef[] = [
  f('UnifrakturMaguntia', 'Gothic'),
  f('UnifrakturCook', 'Gothic', [700]),
  f('Pirata One', 'Gothic'),
  f('Grenze Gotisch', 'Gothic', [400, 700, 900]),
  f('Jacquard 24', 'Gothic'),
  f('Jacquarda Bastarda 9', 'Gothic'),
  f('Manufacturing Consent', 'Gothic'),
  f('Germania One', 'Gothic'),
  f('Fruktur', 'Gothic'),
  f('New Rocker', 'Gothic'),
  f('Metal Mania', 'Gothic'),

  f('Anton', 'Bold'),
  f('Bebas Neue', 'Bold'),
  f('League Gothic', 'Bold'),
  f('Six Caps', 'Bold'),
  f('Oswald', 'Bold', [400, 600, 700]),
  f('Antonio', 'Bold', [400, 700]),
  f('Big Shoulders Display', 'Bold', [400, 700, 900]),
  f('Archivo Black', 'Bold'),
  f('Bowlby One', 'Bold'),
  f('Inter', 'Bold', [400, 700, 900]),
  f('Arimo', 'Bold', [400, 700]),
  f('Unbounded', 'Bold', [400, 700, 900]),
  f('Syne', 'Bold', [400, 700, 800]),

  f('Cinzel', 'Serif', [400, 700, 900]),
  f('Playfair Display', 'Serif', [400, 700, 900], true),
  f('Cormorant Garamond', 'Serif', [400, 700], true),
  f('Instrument Serif', 'Serif', [400], true),
  f('Bodoni Moda', 'Serif', [400, 700]),
  f('EB Garamond', 'Serif', [400, 700]),
  f('Federo', 'Serif'),
  f('Poiret One', 'Serif'),
  f('Italiana', 'Serif'),
  f('Limelight', 'Serif'),

  f('Permanent Marker', 'Hand'),
  f('Rock Salt', 'Hand'),
  f('Gloria Hallelujah', 'Hand'),
  f('Caveat', 'Hand', [400, 700]),
  f('Reenie Beanie', 'Hand'),
  f('Nanum Pen Script', 'Hand'),
  f('Covered By Your Grace', 'Hand'),
  f('Homemade Apple', 'Hand'),
  f('Londrina Sketch', 'Hand'),

  f('Sedgwick Ave Display', 'Graffiti'),
  f('Rubik Spray Paint', 'Graffiti'),
  f('Rubik Wet Paint', 'Graffiti'),
  f('Rubik Distressed', 'Graffiti'),
  f('Rubik Burned', 'Graffiti'),
  f('Rubik Glitch', 'Graffiti'),
  f('Lacquer', 'Graffiti'),
  f('Frijole', 'Graffiti'),

  f('Nosifer', 'Horror'),
  f('Creepster', 'Horror'),
  f('Butcherman', 'Horror'),
  f('Eater', 'Horror'),
  f('Rubik Puddles', 'Horror'),

  f('VT323', 'Digital'),
  f('Share Tech Mono', 'Digital'),
  f('Silkscreen', 'Digital', [400, 700]),
  f('Press Start 2P', 'Digital'),
  f('Jersey 10', 'Digital'),
  f('Courier Prime', 'Digital', [400, 700]),
  f('Special Elite', 'Digital'),

  f('Monoton', 'Psych'),
  f('Shrikhand', 'Psych'),
  f('Bungee Shade', 'Psych'),
  f('Rampart One', 'Psych'),
  f('Climate Crisis', 'Psych'),
  f('Bagel Fat One', 'Psych'),
  f('Kablammo', 'Psych'),
  f('Blaka', 'Psych'),
  f('Rubik Maze', 'Psych'),
];

export const FONT_CATS: FontCat[] = ['Gothic', 'Bold', 'Serif', 'Hand', 'Graffiti', 'Horror', 'Digital', 'Psych'];

export const fontByFamily = new Map(FONTS.map((d) => [d.family, d]));

export const FALLBACK = 'Georgia, "Times New Roman", serif';

export function fontsCssUrl() {
  return `https://fonts.googleapis.com/css2?${FONTS.map((d) => `family=${d.spec}`).join('&')}&display=block`;
}

export function nearestWeight(family: string, w: number) {
  const d = fontByFamily.get(family);
  if (!d) return w;
  return d.weights.reduce((best, cur) => (Math.abs(cur - w) < Math.abs(best - w) ? cur : best), d.weights[0]);
}

export function fontString(family: string, weight: number, size: number, italic = false) {
  return `${italic ? 'italic ' : ''}${nearestWeight(family, weight)} ${size}px "${family}", ${FALLBACK}`;
}

const loaded = new Set<string>();
const pending = new Map<string, Promise<void>>();
const fontListeners = new Set<() => void>();
export function onFontLoad(fn: () => void) {
  fontListeners.add(fn);
  return () => {
    fontListeners.delete(fn);
  };
}
const notify = () => fontListeners.forEach((fn) => fn());

// document.fonts.check() answers "true" for families it has never heard of, so nothing is
// trusted until the Google Fonts stylesheet (which declares every face) has arrived.
let cssReady = false;
let cssReadyResolve: () => void = () => undefined;
const cssReadyP = new Promise<void>((r) => (cssReadyResolve = r));
export function loadFontsStylesheet() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = fontsCssUrl();
  const done = () => {
    if (cssReady) return;
    cssReady = true;
    cssReadyResolve();
    notify();
  };
  link.onload = done;
  link.onerror = done;
  setTimeout(done, 6000);
  document.head.appendChild(link);
}

/** True when the face is ready for canvas; otherwise starts loading and notifies listeners later. */
export function ensureFont(family: string, weight: number, italic = false): boolean {
  const key = `${family}|${nearestWeight(family, weight)}|${italic}`;
  if (loaded.has(key)) return true;
  if (typeof document === 'undefined' || !document.fonts) return true;
  if (!cssReady) return false;
  const probe = fontString(family, weight, 40, italic);
  if (document.fonts.check(probe)) {
    loaded.add(key);
    return true;
  }
  if (!pending.has(key)) {
    const p = document.fonts
      .load(probe, 'AaBb')
      .catch(() => undefined)
      .then(() => {
        loaded.add(key);
      })
      .finally(() => {
        pending.delete(key);
        notify();
      });
    pending.set(key, p);
  }
  return false;
}

export async function waitForFonts(families: { family: string; weight: number; italic?: boolean }[]) {
  if (!document.fonts) return;
  await Promise.race([cssReadyP, new Promise((r) => setTimeout(r, 4000))]);
  await Promise.all(
    families.map((d) => document.fonts.load(fontString(d.family, d.weight, 40, d.italic), 'AaBb').catch(() => undefined)),
  );
}
