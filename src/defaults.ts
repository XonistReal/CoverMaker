import type {
  Background, Doc, DrawLayer, FX, ImageLayer, LayerBase, ShapeLayer, ShapeKind, StickerKind, StickerLayer, TextLayer,
} from './types';
import { randSeed, uid } from './lib/util';

export const defaultFX = (): FX => ({
  mirror: 'none',
  segments: 6,
  lowres: 0,
  pixelate: 0,
  jpeg: 0,
  exposure: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  temperature: 0,
  tint: 0,
  blacks: 0,
  fade: 0,
  sharpen: 0,
  mode: 'none',
  modeMix: 1,
  shadowColor: '#120000',
  highlightColor: '#ff2d2d',
  stylize: 'none',
  cell: 6,
  level: 0.5,
  ink: '#0b0b0b',
  paper: '#f1ece2',
  keepColor: false,
  glow: 0,
  glowThreshold: 0.6,
  blur: 0,
  flash: 0,
  vignette: 0,
  chroma: 0,
  vhs: 0,
  scanlines: 0,
  grain: 0.12,
  grainSize: 1.2,
  grainColor: false,
  dust: 0,
  seed: 7,
});

export const defaultBg = (): Background => ({ type: 'solid', c1: '#0b0b0d', c2: '#3a3a40', angle: 180 });

const base = (name: string, extra: Partial<LayerBase> = {}): LayerBase => ({
  id: uid(),
  name,
  x: 500,
  y: 500,
  rot: 0,
  scale: 1,
  opacity: 1,
  blend: 'source-over',
  hidden: false,
  locked: false,
  clean: false,
  ...extra,
});

export function newImage(asset: string, w: number, h: number, name = 'Photo', cover = true): ImageLayer {
  // Fit to cover the square when it's the main photo, otherwise drop it in at ~55%.
  const aspect = w / h;
  const target = cover ? 1000 : 560;
  let lw: number, lh: number;
  if (cover) {
    if (aspect > 1) { lh = target; lw = target * aspect; } else { lw = target; lh = target / aspect; }
  } else if (aspect > 1) { lw = target; lh = target / aspect; } else { lh = target; lw = target * aspect; }
  return {
    ...base(name),
    kind: 'image',
    asset,
    w: lw,
    h: lh,
    flipX: false,
    flipY: false,
    mask: 'none',
    bw: false,
    bright: 0,
    contrast: 0,
    tint: '#d11a1a',
    tintAmt: 0,
    keyOut: 'none',
    keyTol: 0.25,
    outline: 0,
    outlineColor: '#ffffff',
    shadow: 0,
  };
}

export function newText(text: string, over: Partial<TextLayer> = {}): TextLayer {
  return {
    ...base(over.name ?? 'Text'),
    kind: 'text',
    role: 'other',
    text,
    font: 'UnifrakturMaguntia',
    weight: 400,
    italic: false,
    size: 120,
    caps: 'none',
    align: 'center',
    tracking: 0,
    leading: 1.05,
    stretch: 1,
    fill: 'solid',
    color: '#ffffff',
    color2: '#ff2d2d',
    stroke: 0,
    strokeColor: '#000000',
    glow: 0,
    glowColor: '#ffffff',
    shadow: 0,
    shadowColor: '#000000',
    extrude: 0,
    extrudeColor: '#000000',
    path: 'none',
    curve: 300,
    jitter: 0,
    seed: randSeed(),
    fit: 0,
    ...over,
  };
}

export function newShape(shape: ShapeKind, over: Partial<ShapeLayer> = {}): ShapeLayer {
  const dims: Partial<Record<ShapeKind, [number, number]>> = {
    line: [600, 0],
    frame: [860, 860],
    cross: [380, 560],
    invcross: [380, 560],
    triangle: [700, 620],
  };
  const [w, h] = dims[shape] ?? [420, 420];
  return {
    ...base(shape[0].toUpperCase() + shape.slice(1)),
    kind: 'shape',
    shape,
    w,
    h,
    fillOn: shape !== 'frame' && shape !== 'line',
    fill: '#d4141c',
    fill2: '#5a0006',
    gradient: false,
    stroke: shape === 'frame' ? 18 : shape === 'line' ? 10 : 0,
    strokeColor: '#ffffff',
    points: 5,
    rough: 0,
    seed: randSeed(),
    ...over,
  };
}

const STICKER_DEFAULTS: Record<StickerKind, Partial<StickerLayer>> = {
  advisory: { w: 150, h: 92, x: 900, y: 930, color: '#000000', color2: '#ffffff', clean: true, name: 'Parental advisory' },
  explicit: { w: 54, h: 54, x: 940, y: 940, color: '#000000', color2: '#ffffff', clean: true, name: 'Explicit tag' },
  rec: { w: 1000, h: 1000, color: '#ffffff', color2: '#ff2a2a', text: '12:00:01 AM\nOCT 31 2026', clean: true, name: 'Camcorder overlay' },
  timestamp: { w: 300, h: 56, x: 800, y: 920, color: '#ffffff', color2: '#000000', text: '12:PS:YK:01', clean: true, name: 'Timestamp' },
  barcode: { w: 260, h: 120, x: 820, y: 900, color: '#000000', color2: '#ffffff', name: 'Barcode' },
  splatter: { w: 620, h: 620, color: '#9e0000', amount: 0.6, name: 'Blood splatter' },
  drips: { w: 1000, h: 520, y: 260, color: '#f4f1ea', amount: 0.6, name: 'Paint drips' },
  sparkle: { w: 160, h: 160, x: 720, y: 220, color: '#ffffff', amount: 0.5, name: 'Sparkle' },
  barbed: { w: 1000, h: 90, y: 160, color: '#bdbdbd', amount: 0.5, name: 'Barbed wire' },
  scribble: { w: 640, h: 360, y: 700, color: '#ff7a1a', amount: 0.6, name: 'Crayon scribble' },
  tape: { w: 260, h: 70, x: 500, y: 140, rot: -6, color: '#e9dfc2', amount: 0.7, name: 'Tape' },
  flare: { w: 700, h: 700, x: 660, y: 300, color: '#ffffff', color2: '#b98cff', amount: 0.7, name: 'Lens flare' },
  scratches: { w: 1000, h: 1000, color: '#ffffff', amount: 0.5, name: 'Scratches' },
};

export function newSticker(sticker: StickerKind, over: Partial<StickerLayer> = {}): StickerLayer {
  const d = STICKER_DEFAULTS[sticker];
  return {
    ...base(d.name ?? sticker),
    kind: 'sticker',
    sticker,
    w: 200,
    h: 200,
    color: '#ffffff',
    color2: '#000000',
    text: '',
    seed: randSeed(),
    amount: 0.5,
    ...d,
    ...over,
  } as StickerLayer;
}

export function newDraw(): DrawLayer {
  return { ...base('Drawing'), kind: 'draw', strokes: [] };
}

export const defaultMeta = () => ({
  artist: 'kxng crash',
  title: 'no service',
  tracks: 'intro\nopp pack\nno service\nghost mode\n4am in the trap\nwhite tee',
});

export function emptyDoc(): Doc {
  return { meta: defaultMeta(), bg: defaultBg(), layers: [], fx: defaultFX(), preset: 'none' };
}
