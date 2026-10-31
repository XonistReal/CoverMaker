import type { Background, Doc, FX, ImageLayer, Layer, TextLayer } from './types';
import { defaultFX, newShape, newSticker, newText } from './defaults';
import { roleText } from './store';
import { FONTS, fontByFamily } from './fonts';
import { pick, randSeed, rng } from './lib/util';

export interface Preset {
  id: string;
  name: string;
  hint: string;
  build: (ctx: BuildCtx) => Look;
}

interface Look {
  bg: Background;
  fx: Partial<FX>;
  photo?: Partial<ImageLayer> | 'cover' | 'hide';
  /** Arrange every photo layer (collage presets). */
  photos?: (imgs: ImageLayer[]) => ImageLayer[];
  below?: Layer[];
  above?: Layer[];
}

interface BuildCtx {
  meta: Doc['meta'];
  photo: ImageLayer | null;
}

const solid = (c1: string): Background => ({ type: 'solid', c1, c2: '#000000', angle: 180 });
const auto = <T extends Layer>(l: T): T => ({ ...l, auto: true });

// Preset titles shrink to fit so long names never run off the cover.
function title(meta: Doc['meta'], over: Partial<TextLayer>) {
  return auto(newText(roleText('title', meta), { role: 'title', name: 'Title', fit: over.path && over.path !== 'none' ? 0 : 900, ...over }));
}
function artist(meta: Doc['meta'], over: Partial<TextLayer>) {
  return auto(newText(roleText('artist', meta), { role: 'artist', name: 'Artist', fit: over.path && over.path !== 'none' ? 0 : 860, ...over }));
}

/** Scale a photo to cover the square, or to fit inside a box. */
export function place(p: ImageLayer, box: number | 'cover', x = 500, y = 500): Partial<ImageLayer> {
  const aspect = p.w / p.h;
  let w: number, h: number;
  if (box === 'cover') {
    if (aspect > 1) { h = 1000; w = 1000 * aspect; } else { w = 1000; h = 1000 / aspect; }
  } else if (aspect > 1) { w = box; h = box / aspect; } else { h = box; w = box * aspect; }
  return { w, h, x, y, scale: 1, rot: 0 };
}

/** Square fit for masked photos so a circle mask stays a circle. */
function placeSquare(p: ImageLayer, size: number, x = 500, y = 500): Partial<ImageLayer> {
  const aspect = p.w / p.h;
  const w = aspect > 1 ? size * aspect : size;
  const h = aspect > 1 ? size : size / aspect;
  return { w, h, x, y, scale: 1, rot: 0 };
}

export const PRESETS: Preset[] = [
  {
    id: 'nightvision',
    name: 'Night Vision',
    hint: 'Green camcorder horror, glowing eyes',
    build: () => ({
      bg: solid('#000000'),
      fx: { mode: 'nightvision', contrast: 0.35, exposure: 0.25, glow: 0.45, glowThreshold: 0.5, vignette: 0.65, scanlines: 0.35, grain: 0.55, grainSize: 1.6, blur: 0.04, sharpen: 0.2, chroma: 0.12 },
      photo: { contrast: 0.2 },
      above: [auto(newSticker('timestamp', { text: '03:33:00 AM', x: 790, y: 930, w: 300, h: 54 }))],
    }),
  },
  {
    id: 'chrome',
    name: 'Chrome Gothic',
    hint: 'Liquid-metal blackletter over a black void',
    build: ({ meta }) => ({
      bg: solid('#030303'),
      fx: { contrast: 0.2, saturation: -0.35, vignette: 0.55, grain: 0.2, glow: 0.25, glowThreshold: 0.72 },
      photo: { bright: -0.12, contrast: 0.2 },
      above: [
        title(meta, { font: 'UnifrakturCook', weight: 700, size: 150, fill: 'chrome', stroke: 2.5, strokeColor: '#0a0a0a', glow: 0.35, glowColor: '#ffffff', shadow: 0.6, y: 150 }),
        artist(meta, { font: 'Pirata One', size: 46, color: '#cfd3da', y: 262, tracking: 60 }),
        auto(newSticker('sparkle', { x: 840, y: 92, w: 150, h: 150, amount: 0.7 })),
        auto(newSticker('sparkle', { x: 160, y: 205, w: 90, h: 90, amount: 0.3 })),
      ],
    }),
  },
  {
    id: 'flash',
    name: 'Point & Shoot',
    hint: 'Harsh party flash with a date stamp',
    build: () => {
      const d = new Date();
      const stamp = `'${String(d.getFullYear()).slice(2)}  ${d.getMonth() + 1}  ${d.getDate()}`;
      return {
        bg: solid('#111111'),
        fx: { flash: 0.65, vignette: 0.35, temperature: 0.06, contrast: 0.15, saturation: 0.1, sharpen: 0.25, grain: 0.22, chroma: 0.1 },
        photo: 'cover',
        above: [auto(newText(stamp, { name: 'Date stamp', font: 'VT323', size: 52, color: '#ff9b2f', glow: 0.25, glowColor: '#ff5a00', x: 800, y: 925, tracking: 40 }))],
      };
    },
  },
  {
    id: 'webcam',
    name: 'Webcam',
    hint: 'Crunchy 2009 laptop-cam selfie',
    build: () => ({
      bg: solid('#000000'),
      fx: { lowres: 0.62, jpeg: 0.55, exposure: 0.25, saturation: 0.25, temperature: -0.25, tint: 0.1, sharpen: 0.45, contrast: 0.1, grain: 0.1, fade: 0.1 },
      photo: 'cover',
    }),
  },
  {
    id: 'redduo',
    name: 'Red Duotone',
    hint: 'Red ink portrait, huge condensed title',
    build: ({ meta }) => ({
      bg: { type: 'paper', c1: '#e9e4da', c2: '#000000', angle: 180 },
      fx: { grain: 0.25, contrast: 0.1, fade: 0.05, dust: 0.3 },
      photo: { bw: true, contrast: 0.3, tintAmt: 1, tint: '#c81b1b', blend: 'multiply' },
      above: [title(meta, { font: 'Anton', caps: 'upper', size: 205, color: '#f3efe6', y: 922, stretch: 0.92, tracking: -10 })],
    }),
  },
  {
    id: 'engrave',
    name: 'Engraving',
    hint: 'Banknote line art, white on black',
    build: ({ meta }) => ({
      bg: solid('#000000'),
      fx: { mode: 'invert', stylize: 'engrave', cell: 5, level: 0.5, ink: '#f4f4f4', paper: '#050505', contrast: 0.3, grain: 0.08 },
      photo: 'cover',
      above: [title(meta, { font: 'Cormorant Garamond', weight: 700, caps: 'upper', size: 40, tracking: 320, color: '#f4f4f4', y: 950, clean: true })],
    }),
  },
  {
    id: 'xerox',
    name: 'Xerox Zine',
    hint: 'Photocopied flyer, 1-bit and dusty',
    build: ({ meta }) => ({
      bg: { type: 'paper', c1: '#efebe1', c2: '#000000', angle: 180 },
      fx: { stylize: 'threshold', level: 0.45, ink: '#121212', paper: '#efebe1', contrast: 0.35, dust: 0.6, grain: 0.2, blur: 0.03 },
      photo: 'cover',
      above: [
        auto(newSticker('tape', { x: 500, y: 92, w: 520, h: 110, rot: -2, amount: 0.9, color: '#f3ead2', clean: true })),
        title(meta, { font: 'Special Elite', caps: 'lower', size: 66, color: '#111111', y: 92, rot: -2, clean: true }),
      ],
    }),
  },
  {
    id: 'triangle',
    name: 'Red Triangle',
    hint: 'Occult poster: triangle frame, serif caps',
    build: ({ meta, photo }) => ({
      bg: solid('#050505'),
      fx: { grain: 0.25, vignette: 0.35, contrast: 0.1 },
      photo: photo ? { ...placeSquare(photo, 600, 500, 560), mask: 'triangle', tintAmt: 0.3, tint: '#b3160f' } : 'cover',
      below: [auto(newShape('triangle', { w: 780, h: 700, y: 540, fill: '#c3221a', fill2: '#5e0904', gradient: true }))],
      above: [
        artist(meta, { font: 'Cinzel', weight: 700, caps: 'upper', size: 38, tracking: 140, color: '#c3221a', y: 70 }),
        title(meta, { font: 'Cinzel', weight: 400, caps: 'upper', size: 58, tracking: 90, color: '#c3221a', y: 950 }),
      ],
    }),
  },
  {
    id: 'halo',
    name: 'Halo Text',
    hint: 'Name and tracklist circling one small photo',
    build: ({ meta, photo }) => ({
      bg: { type: 'paper', c1: '#f2efe8', c2: '#000000', angle: 180 },
      fx: { grain: 0.15, dust: 0.25 },
      photo: photo ? { ...placeSquare(photo, 330), mask: 'circle', bw: true, contrast: 0.25 } : 'cover',
      above: [
        artist(meta, { font: 'UnifrakturMaguntia', size: 66, color: '#111111', path: 'arc', curve: 270, y: 230 }),
        auto(newText(roleText('tracks', meta), { role: 'tracks', name: 'Tracklist', font: 'UnifrakturMaguntia', size: 30, color: '#111111', path: 'arc', curve: -265, y: 765 })),
      ],
    }),
  },
  {
    id: 'void',
    name: 'Gradient Void',
    hint: 'Nothing but a grey fade and grain',
    build: () => ({
      bg: { type: 'linear', c1: '#050505', c2: '#f0f0f0', angle: 180 },
      fx: { grain: 0.45, grainSize: 1.4 },
      photo: 'hide',
    }),
  },
  {
    id: 'lightsoff',
    name: 'Lights Off',
    hint: 'Underexposed, crushed blue shadows',
    build: () => ({
      bg: solid('#000000'),
      fx: { exposure: -1.25, blacks: 0.04, temperature: -0.55, tint: 0.08, saturation: -0.4, contrast: 0.2, grain: 0.7, grainSize: 1.8, grainColor: true, vignette: 0.5, fade: 0.12, blur: 0.04 },
      photo: 'cover',
    }),
  },
  {
    id: 'airbrush',
    name: 'Airbrush Glow',
    hint: 'Purple haze, bloom and lens flare',
    build: ({ meta }) => ({
      bg: { type: 'radial', c1: '#2a1745', c2: '#05030a', angle: 180 },
      fx: { glow: 0.6, glowThreshold: 0.62, chroma: 0.35, saturation: 0.3, mode: 'colorize', highlightColor: '#a77bff', modeMix: 0.45, contrast: 0.25, exposure: -0.15, vignette: 0.6, grain: 0.18, blur: 0.02 },
      photo: 'cover',
      above: [
        auto(newSticker('flare', { x: 720, y: 250, w: 760, h: 760, color: '#ffffff', color2: '#b98cff', amount: 0.55 })),
        title(meta, { font: 'Pirata One', size: 128, fill: 'ice', glow: 0.6, glowColor: '#c9a6ff', y: 125, caps: 'upper', tracking: 40 }),
      ],
    }),
  },
  {
    id: 'framed',
    name: 'Framed',
    hint: 'Photo hung on a loud solid wall',
    build: ({ photo }) => ({
      bg: solid('#e1140f'),
      fx: { grain: 0.15, contrast: 0.1, saturation: 0.1 },
      photo: photo ? { ...place(photo, 700, 500, 490), outline: 16, outlineColor: '#191313', shadow: 0.6 } : 'cover',
    }),
  },
  {
    id: 'kaleido',
    name: 'Kaleidoscope',
    hint: 'Mirror-tile your photo into a mandala',
    build: ({ photo }) => ({
      bg: solid('#000000'),
      fx: { mirror: 'kaleido', segments: 8, saturation: 0.45, contrast: 0.2, grain: 0.12, sharpen: 0.2 },
      photo: photo ? { ...place(photo, 'cover'), scale: 1.3 } : 'cover',
    }),
  },
  {
    id: 'crayon',
    name: 'Crayon Scrawl',
    hint: 'Kid drawing on black, wobbly lettering',
    build: ({ meta }) => ({
      bg: solid('#0a0a0a'),
      fx: { grain: 0.15 },
      photo: 'hide',
      above: [
        auto(newSticker('scribble', { y: 760, w: 780, h: 300, color: '#ff7a1a', amount: 0.7 })),
        title(meta, { font: 'Rock Salt', size: 74, color: '#ff7a1a', jitter: 0.45, rot: -4, y: 210 }),
        artist(meta, { font: 'Rock Salt', size: 34, color: '#f1e6d2', jitter: 0.3, y: 330, rot: -2 }),
      ],
    }),
  },
  {
    id: 'collage',
    name: 'Sticker Bomb',
    hint: 'Every photo becomes a cut-out sticker',
    build: ({ meta }) => ({
      bg: { type: 'concrete', c1: '#2b2b2b', c2: '#000000', angle: 180 },
      fx: { saturation: 0.35, contrast: 0.15, grain: 0.15, sharpen: 0.15 },
      photos: (imgs) => {
        const r = rng(randSeed());
        return imgs.map((p, i) => ({
          ...p,
          ...place(p, i === 0 ? 640 : 380 + r() * 160, i === 0 ? 500 : 140 + r() * 720, i === 0 ? 540 : 160 + r() * 700),
          rot: (r() - 0.5) * (i === 0 ? 10 : 34),
          outline: 12,
          outlineColor: '#ffffff',
          shadow: 0.45,
        }));
      },
      above: [
        auto(newSticker('tape', { x: 330, y: 245, w: 230, h: 64, rot: -18 })),
        auto(newSticker('tape', { x: 700, y: 820, w: 230, h: 64, rot: 12 })),
        title(meta, { font: 'Sedgwick Ave Display', size: 150, color: '#ff2d55', stroke: 7, strokeColor: '#000000', jitter: 0.35, rot: -6, y: 150 }),
        artist(meta, { font: 'Permanent Marker', size: 54, color: '#fff35c', stroke: 4, strokeColor: '#000000', rot: 4, y: 905 }),
      ],
    }),
  },
  {
    id: 'vhs',
    name: 'VHS Rip',
    hint: 'Tracking lines, color bleed, REC',
    build: () => ({
      bg: solid('#000000'),
      fx: { vhs: 0.6, scanlines: 0.45, chroma: 0.45, saturation: -0.15, contrast: 0.1, blur: 0.06, grain: 0.3, temperature: 0.05, fade: 0.1 },
      photo: 'cover',
      above: [auto(newSticker('rec', {}))],
    }),
  },
  {
    id: 'gore',
    name: 'Blood & Bone',
    hint: 'B&W airbrush with fresh red splatter',
    build: ({ meta }) => ({
      bg: solid('#000000'),
      fx: { mode: 'bw', contrast: 0.45, glow: 0.3, glowThreshold: 0.6, vignette: 0.6, grain: 0.25, blur: 0.03, sharpen: 0.1 },
      photo: 'cover',
      above: [
        auto(newSticker('splatter', { x: 650, y: 360, w: 720, h: 720, color: '#a30000', clean: true, amount: 0.65 })),
        auto(newSticker('splatter', { x: 240, y: 780, w: 380, h: 380, color: '#8c0000', clean: true, amount: 0.4 })),
        title(meta, { font: 'New Rocker', size: 108, color: '#b30000', y: 115, clean: true, shadow: 0.5 }),
      ],
    }),
  },
  {
    id: 'tag',
    name: 'Spray Tag',
    hint: 'Flash photo, graffiti word on the wall',
    build: ({ meta }) => ({
      bg: solid('#111111'),
      fx: { flash: 0.35, contrast: 0.15, grain: 0.25, vignette: 0.25 },
      photo: 'cover',
      above: [title(meta, { font: 'Rubik Spray Paint', caps: 'upper', size: 180, color: '#ff3b1f', rot: -7, opacity: 0.92, y: 300, fit: 820 })],
    }),
  },
  {
    id: 'psych',
    name: 'Psych Poster',
    hint: '70s doom-rock wavy letters, saturated',
    build: ({ meta }) => ({
      bg: solid('#120400'),
      fx: { saturation: 0.6, contrast: 0.25, glow: 0.2, grain: 0.2, temperature: 0.15 },
      photo: 'cover',
      above: [
        auto(newShape('frame', { w: 900, h: 900, stroke: 22, strokeColor: '#f2c230' })),
        title(meta, { font: 'UnifrakturCook', weight: 700, size: 132, path: 'wave', curve: 150, fill: 'gradient', color: '#ffe14a', color2: '#ff3b1f', stroke: 5, strokeColor: '#7a0000', extrude: 0.25, extrudeColor: '#2a0000', y: 130 }),
      ],
    }),
  },
  {
    id: 'drip',
    name: 'Wet Paint',
    hint: 'Paint pouring down over everything',
    build: ({ meta }) => ({
      bg: solid('#c21a14'),
      fx: { contrast: 0.15, grain: 0.2, saturation: 0.2 },
      photo: 'cover',
      above: [
        auto(newSticker('drips', { y: 240, h: 520, color: '#f4f1ea', amount: 0.65 })),
        title(meta, { font: 'Rubik Wet Paint', size: 120, color: '#f4f1ea', y: 880, caps: 'upper' }),
      ],
    }),
  },
  {
    id: 'halftone',
    name: 'Halftone Print',
    hint: 'Newspaper dots in one loud ink',
    build: ({ meta }) => ({
      bg: solid('#efe9dc'),
      fx: { stylize: 'halftone', cell: 7, ink: '#c4161c', paper: '#efe9dc', contrast: 0.25, grain: 0.1 },
      photo: 'cover',
      above: [title(meta, { font: 'Archivo Black', size: 112, caps: 'upper', color: '#111111', y: 905, tracking: -20, clean: true })],
    }),
  },
  {
    id: 'thermal',
    name: 'Heat Map',
    hint: 'Thermal camera false color',
    build: ({ meta }) => ({
      bg: solid('#000000'),
      fx: { mode: 'thermal', blur: 0.03, grain: 0.15, scanlines: 0.2, contrast: 0.1 },
      photo: 'cover',
      above: [title(meta, { font: 'Share Tech Mono', size: 42, caps: 'upper', tracking: 220, color: '#ffffff', y: 945 })],
    }),
  },
  {
    id: 'clean',
    name: 'Clean',
    hint: 'Just your photo, a hint of grain',
    build: () => ({ bg: solid('#000000'), fx: {}, photo: 'cover' }),
  },
];

const LOOK_RESET: Partial<ImageLayer> = {
  bw: false, bright: 0, contrast: 0, tintAmt: 0, mask: 'none', outline: 0, shadow: 0, opacity: 1, blend: 'source-over', hidden: false,
};

export function applyPreset(doc: Doc, presetId: string, seed?: number): Doc {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) return doc;
  const kept = doc.layers.filter((l) => !l.auto);
  const images = kept.filter((l): l is ImageLayer => l.kind === 'image');
  const main = images[0] ?? null;
  const look = preset.build({ meta: doc.meta, photo: main });
  let arranged = new Map<string, ImageLayer>();
  if (look.photos && images.length) {
    look.photos(images.map((p) => ({ ...p, ...LOOK_RESET }))).forEach((p) => arranged.set(p.id, p));
  } else if (main) {
    let p: ImageLayer = { ...main, ...LOOK_RESET };
    if (look.photo === 'hide') p = { ...p, hidden: true };
    else if (look.photo === 'cover' || !look.photo) p = { ...p, ...place(p, 'cover') };
    else p = { ...p, ...place(p, 'cover'), ...look.photo };
    arranged.set(p.id, p);
  }
  if (!images.length) arranged = new Map();
  const layers = [...(look.below ?? []), ...kept.map((l) => arranged.get(l.id) ?? l), ...(look.above ?? [])];
  return {
    ...doc,
    bg: look.bg,
    fx: { ...defaultFX(), ...look.fx, seed: seed ?? doc.fx.seed },
    layers,
    preset: presetId,
  };
}

/** Same vibe, new roll: another style, fresh seeds, a sibling typeface for the title. */
export function remix(doc: Doc): Doc {
  const options = PRESETS.filter((p) => p.id !== doc.preset && p.id !== 'clean');
  const p = pick(options);
  const next = applyPreset(doc, p.id, randSeed());
  return {
    ...next,
    layers: next.layers.map((l) => {
      if (!l.auto) return l;
      if (l.kind === 'text' && l.role === 'title' && l.path === 'none') {
        const cat = fontByFamily.get(l.font)?.cat;
        const sibs = FONTS.filter((f) => f.cat === cat);
        const f = pick(sibs);
        return { ...l, font: f.family, weight: f.weights.includes(l.weight) ? l.weight : f.weights[f.weights.length - 1], seed: randSeed() };
      }
      if (l.kind === 'sticker') return { ...l, seed: randSeed() };
      return l;
    }),
  };
}
