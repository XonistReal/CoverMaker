// All layer geometry lives in "doc units": the cover is always 1000 x 1000,
// and the renderer scales to whatever pixel size it is drawing (preview or 3000px export).
export const DOC = 1000;

export type Blend =
  | 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference'
  | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

export interface LayerBase {
  id: string;
  name: string;
  x: number; // center
  y: number;
  rot: number; // degrees
  scale: number;
  opacity: number;
  blend: Blend;
  hidden: boolean;
  locked: boolean;
  /** Draw above the effects stack so it stays crisp (stickers, advisory label). */
  clean: boolean;
  /** Created by a style preset; replaced when another style is applied. */
  auto?: boolean;
}

export type MaskShape = 'none' | 'circle' | 'triangle' | 'rounded' | 'diamond' | 'arch';

export interface ImageLayer extends LayerBase {
  kind: 'image';
  asset: string;
  w: number; // size at scale 1, in doc units
  h: number;
  flipX: boolean;
  flipY: boolean;
  mask: MaskShape;
  bw: boolean;
  bright: number; // -1..1
  contrast: number; // -1..1
  tint: string;
  tintAmt: number; // 0..1, colorizes the photo
  keyOut: 'none' | 'white' | 'black';
  keyTol: number; // 0..1
  outline: number; // sticker border, doc units
  outlineColor: string;
  shadow: number; // 0..1
}

export type TextFill = 'solid' | 'gradient' | 'chrome' | 'gold' | 'ice' | 'none';
export type TextPath = 'none' | 'arc' | 'circle' | 'wave';
export type TextRole = 'title' | 'artist' | 'tracks' | 'other';

export interface TextLayer extends LayerBase {
  kind: 'text';
  role: TextRole;
  text: string;
  font: string;
  weight: number;
  italic: boolean;
  size: number;
  caps: 'none' | 'upper' | 'lower';
  align: 'left' | 'center' | 'right';
  tracking: number; // thousandths of an em
  leading: number; // line height multiplier
  stretch: number; // horizontal scale, <1 = condensed
  fill: TextFill;
  color: string;
  color2: string;
  stroke: number;
  strokeColor: string;
  glow: number;
  glowColor: string;
  shadow: number;
  shadowColor: string;
  extrude: number;
  extrudeColor: string;
  path: TextPath;
  curve: number;
  jitter: number;
  seed: number;
  /** Max width in doc units; text shrinks to stay inside it (0 = off). */
  fit: number;
}

export type ShapeKind =
  | 'rect' | 'ellipse' | 'triangle' | 'star' | 'cross' | 'heart' | 'diamond' | 'frame' | 'line' | 'invcross';

export interface ShapeLayer extends LayerBase {
  kind: 'shape';
  shape: ShapeKind;
  w: number;
  h: number;
  fillOn: boolean;
  fill: string;
  fill2: string;
  gradient: boolean;
  stroke: number;
  strokeColor: string;
  points: number; // for star
  rough: number; // hand-drawn wobble 0..1
  seed: number;
}

export type StickerKind =
  | 'advisory' | 'rec' | 'timestamp' | 'barcode' | 'splatter' | 'drips' | 'sparkle'
  | 'barbed' | 'scribble' | 'tape' | 'explicit' | 'flare' | 'scratches';

export interface StickerLayer extends LayerBase {
  kind: 'sticker';
  sticker: StickerKind;
  w: number;
  h: number;
  color: string;
  color2: string;
  text: string;
  seed: number;
  amount: number; // density / count, meaning depends on sticker
}

export type Brush = 'marker' | 'crayon' | 'spray' | 'pixel' | 'eraser';

export interface Stroke {
  brush: Brush;
  color: string;
  size: number;
  seed: number;
  pts: number[]; // flat x,y pairs in layer-local units
}

export interface DrawLayer extends LayerBase {
  kind: 'draw';
  strokes: Stroke[];
}

export type Layer = ImageLayer | TextLayer | ShapeLayer | StickerLayer | DrawLayer;
export type LayerKind = Layer['kind'];

export interface Background {
  type: 'solid' | 'linear' | 'radial' | 'paper' | 'concrete';
  c1: string;
  c2: string;
  angle: number;
}

export type MirrorMode = 'none' | 'left' | 'right' | 'top' | 'quad' | 'kaleido';
export type ColorMode =
  | 'none' | 'bw' | 'duotone' | 'colorize' | 'nightvision' | 'thermal' | 'invert' | 'xray' | 'sepia';
export type Stylize = 'none' | 'threshold' | 'dither' | 'halftone' | 'engrave' | 'posterize';

export interface FX {
  mirror: MirrorMode;
  segments: number;
  lowres: number; // 0..1 soft downscale (webcam)
  pixelate: number; // 0..1 hard blocks
  jpeg: number; // 0..1 block artifacts
  exposure: number; // -2..2
  brightness: number; // -1..1
  contrast: number; // -1..1
  saturation: number; // -1..1
  hue: number; // -180..180
  temperature: number; // -1..1
  tint: number; // -1..1
  blacks: number; // 0..0.5 crush
  fade: number; // 0..1 lift blacks
  sharpen: number; // 0..1
  mode: ColorMode;
  modeMix: number;
  shadowColor: string;
  highlightColor: string;
  stylize: Stylize;
  cell: number; // stylize size in doc units
  level: number; // threshold / posterize levels
  ink: string;
  paper: string;
  keepColor: boolean;
  glow: number;
  glowThreshold: number;
  blur: number;
  flash: number;
  vignette: number;
  chroma: number;
  vhs: number;
  scanlines: number;
  grain: number;
  grainSize: number;
  grainColor: boolean;
  dust: number;
  seed: number;
}

export interface Meta {
  artist: string;
  title: string;
  tracks: string;
}

export interface Doc {
  meta: Meta;
  bg: Background;
  layers: Layer[];
  fx: FX;
  preset: string;
}

export interface Asset {
  id: string;
  src: HTMLCanvasElement | HTMLImageElement;
  w: number;
  h: number;
  blob?: Blob;
}
