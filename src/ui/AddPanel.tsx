import React, { useEffect, useRef } from 'react';
import type { Brush, ShapeKind, StickerKind, TextLayer } from '../types';
import { addLayer, getState, setState, useStore, roleText } from '../store';
import { newShape, newSticker, newText } from '../defaults';
import { drawSticker } from '../render/stickers';
import { drawShape } from '../render/shapes';
import { onFontLoad } from '../fonts';
import { addPhotos, pickFiles } from '../lib/photos';
import { ColorField, Seg, Slider } from './controls';
import { Icon } from './icons';

interface QuickText {
  name: string;
  css: React.CSSProperties;
  make: (t: string) => Partial<TextLayer>;
}

const QUICK_TEXT: QuickText[] = [
  { name: 'Chrome gothic', css: { fontFamily: 'UnifrakturCook', fontWeight: 700 }, make: () => ({ font: 'UnifrakturCook', weight: 700, fill: 'chrome', stroke: 2.5, strokeColor: '#0a0a0a', glow: 0.3, shadow: 0.5, size: 130 }) },
  { name: 'Blackletter', css: { fontFamily: 'UnifrakturMaguntia' }, make: () => ({ font: 'UnifrakturMaguntia', size: 120 }) },
  { name: 'Condensed', css: { fontFamily: 'Anton', textTransform: 'uppercase' }, make: () => ({ font: 'Anton', caps: 'upper', size: 160, stretch: 0.9 }) },
  { name: 'Serif caps', css: { fontFamily: 'Cinzel', letterSpacing: '0.18em', textTransform: 'uppercase' }, make: () => ({ font: 'Cinzel', caps: 'upper', tracking: 180, size: 60 }) },
  { name: 'Graffiti', css: { fontFamily: 'Sedgwick Ave Display', color: '#ff3ea5' }, make: () => ({ font: 'Sedgwick Ave Display', color: '#ff2d55', stroke: 6, strokeColor: '#000000', size: 140, rot: -5 }) },
  { name: 'Spray', css: { fontFamily: 'Rubik Spray Paint', color: '#ff5a3c' }, make: () => ({ font: 'Rubik Spray Paint', color: '#ff3b1f', caps: 'upper', size: 170, rot: -6 }) },
  { name: 'Marker', css: { fontFamily: 'Permanent Marker' }, make: () => ({ font: 'Permanent Marker', size: 100 }) },
  { name: 'Scrawl', css: { fontFamily: 'Rock Salt', color: '#ff7a1a' }, make: () => ({ font: 'Rock Salt', color: '#ff7a1a', jitter: 0.45, size: 70 }) },
  { name: 'Horror', css: { fontFamily: 'Nosifer', color: '#d0001a' }, make: () => ({ font: 'Nosifer', color: '#c40018', size: 90 }) },
  { name: 'Psych wave', css: { fontFamily: 'Shrikhand', color: '#ffcf3a' }, make: () => ({ font: 'Shrikhand', fill: 'gradient', color: '#ffe14a', color2: '#ff3b1f', stroke: 4, strokeColor: '#5a0000', path: 'wave', curve: 140, size: 110 }) },
  { name: 'Typewriter', css: { fontFamily: 'Special Elite' }, make: () => ({ font: 'Special Elite', caps: 'lower', size: 64 }) },
  { name: 'Pixel', css: { fontFamily: 'Silkscreen' }, make: () => ({ font: 'Silkscreen', size: 60, caps: 'upper' }) },
  { name: 'Ice glow', css: { fontFamily: 'Pirata One', color: '#cfe9ff', textShadow: '0 0 8px #b98cff' }, make: () => ({ font: 'Pirata One', fill: 'ice', glow: 0.6, glowColor: '#c9a6ff', size: 120 }) },
  { name: 'Gold', css: { fontFamily: 'Grenze Gotisch', fontWeight: 900, color: '#f2c14e' }, make: () => ({ font: 'Grenze Gotisch', weight: 900, fill: 'gold', stroke: 2, strokeColor: '#2a1600', shadow: 0.6, size: 120 }) },
  { name: 'Arc', css: { fontFamily: 'Cinzel', textTransform: 'uppercase' }, make: () => ({ font: 'Cinzel', caps: 'upper', tracking: 120, path: 'arc', curve: 320, size: 54 }) },
  { name: 'Mono stamp', css: { fontFamily: 'VT323', color: '#ff9b2f' }, make: () => ({ font: 'VT323', color: '#ff9b2f', glow: 0.25, glowColor: '#ff5a00', size: 60 }) },
];

const SHAPES: { v: ShapeKind; label: string }[] = [
  { v: 'rect', label: 'Box' }, { v: 'ellipse', label: 'Circle' }, { v: 'triangle', label: 'Triangle' }, { v: 'star', label: 'Star' },
  { v: 'cross', label: 'Cross' }, { v: 'invcross', label: 'Upside cross' }, { v: 'heart', label: 'Heart' }, { v: 'diamond', label: 'Diamond' },
  { v: 'frame', label: 'Frame' }, { v: 'line', label: 'Line' },
];

const STICKERS: { v: StickerKind; label: string }[] = [
  { v: 'advisory', label: 'Advisory' }, { v: 'explicit', label: 'E tag' }, { v: 'rec', label: 'Camcorder' }, { v: 'timestamp', label: 'Timestamp' },
  { v: 'splatter', label: 'Splatter' }, { v: 'drips', label: 'Drips' }, { v: 'sparkle', label: 'Sparkle' }, { v: 'flare', label: 'Lens flare' },
  { v: 'barbed', label: 'Barbed wire' }, { v: 'scribble', label: 'Scribble' }, { v: 'tape', label: 'Tape' }, { v: 'barcode', label: 'Barcode' },
  { v: 'scratches', label: 'Dust & scratches' },
];

function Preview({ draw, bg = '#141418' }: { draw: (x: CanvasRenderingContext2D) => void; bg?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const paint = () => {
      const c = ref.current;
      if (!c) return;
      const x = c.getContext('2d')!;
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.fillStyle = bg;
      x.fillRect(0, 0, c.width, c.height);
      x.setTransform(c.width / 1000, 0, 0, c.height / 1000, c.width / 2, c.height / 2);
      draw(x);
    };
    paint();
    return onFontLoad(paint);
  }, [draw, bg]);
  return <canvas ref={ref} width={112} height={112} aria-hidden="true" />;
}

const stickerPreview = new Map<StickerKind, (x: CanvasRenderingContext2D) => void>();
function stickerDraw(kind: StickerKind) {
  let fn = stickerPreview.get(kind);
  if (!fn) {
    const s = newSticker(kind, { seed: 4 });
    const fit = 820 / Math.max(s.w, s.h);
    const l = { ...s, w: s.w * fit, h: s.h * fit };
    fn = (x) => drawSticker(x, l);
    stickerPreview.set(kind, fn);
  }
  return fn;
}

const shapePreview = new Map<ShapeKind, (x: CanvasRenderingContext2D) => void>();
function shapeDraw(kind: ShapeKind) {
  let fn = shapePreview.get(kind);
  if (!fn) {
    const s = newShape(kind, { strokeColor: '#ffffff' });
    const fit = 700 / Math.max(s.w, s.h || 1);
    const l = { ...s, w: s.w * fit, h: s.h * fit, stroke: s.stroke * 3 };
    fn = (x) => drawShape(x, l);
    shapePreview.set(kind, fn);
  }
  return fn;
}

export function BrushControls() {
  const brush = useStore((s) => s.brush);
  const set = (p: Partial<typeof brush>) => setState({ brush: { ...getState().brush, ...p } });
  return (
    <>
      <Seg<Brush>
        label="Brush"
        value={brush.brush}
        onChange={(v) => set({ brush: v })}
        options={[
          { v: 'crayon', label: 'Crayon' },
          { v: 'marker', label: 'Marker' },
          { v: 'spray', label: 'Spray' },
          { v: 'pixel', label: 'Pixel' },
          { v: 'eraser', label: 'Eraser' },
        ]}
      />
      <Slider label="Size" value={brush.size} min={2} max={80} step={1} onChange={(v) => set({ size: v })} />
      {brush.brush !== 'eraser' && <ColorField label="Color" value={brush.color} onChange={(v) => set({ color: v })} />}
    </>
  );
}

export function AddPanel() {
  const tool = useStore((s) => s.tool);
  const meta = useStore((s) => s.doc.meta);

  const addText = (q: QuickText) => {
    const hasTitle = getState().doc.layers.some((l) => l.kind === 'text' && l.role === 'title');
    const text = hasTitle ? roleText('artist', meta) : roleText('title', meta);
    addLayer(newText(text, { role: hasTitle ? 'artist' : 'title', name: hasTitle ? 'Artist' : 'Title', y: hasTitle ? 820 : 180, fit: 900, ...q.make(text) }));
  };

  return (
    <div className="panel-body">
      <div className="add-row">
        <button type="button" className="btn" onClick={async () => addPhotos(await pickFiles(true))}>
          <Icon name="image" /> Photo
        </button>
        <button
          type="button"
          className={'btn' + (tool === 'draw' ? ' primary' : '')}
          aria-pressed={tool === 'draw'}
          onClick={() => setState({ tool: tool === 'draw' ? 'select' : 'draw' })}
        >
          <Icon name="brush" /> {tool === 'draw' ? 'Done drawing' : 'Draw'}
        </button>
      </div>
      {tool === 'draw' && (
        <div className="draw-box">
          <p className="small">Draw straight on the cover. Each session of strokes goes on its own layer.</p>
          <BrushControls />
        </div>
      )}

      <h3>Text</h3>
      <p className="muted small">Adds your title first, then your artist name. Edit wording in the Layer tab.</p>
      <div className="tile-grid text-tiles">
        {QUICK_TEXT.map((q) => (
          <button key={q.name} type="button" className="tile text-tile" onClick={() => addText(q)}>
            <span className={'tile-sample' + (q.name === 'Chrome gothic' ? ' chrome-text' : q.name === 'Gold' ? ' gold-text' : '')} style={q.css}>
              {(meta.title || 'Title').slice(0, 12)}
            </span>
            <span className="tile-label">{q.name}</span>
          </button>
        ))}
      </div>

      <h3>Stickers</h3>
      <div className="tile-grid">
        {STICKERS.map((s) => (
          <button key={s.v} type="button" className="tile" onClick={() => addLayer(newSticker(s.v))}>
            <Preview draw={stickerDraw(s.v)} bg={s.v === 'advisory' || s.v === 'explicit' || s.v === 'barcode' ? '#3a3a42' : '#141418'} />
            <span className="tile-label">{s.label}</span>
          </button>
        ))}
      </div>

      <h3>Shapes</h3>
      <div className="tile-grid">
        {SHAPES.map((s) => (
          <button key={s.v} type="button" className="tile" onClick={() => addLayer(newShape(s.v))}>
            <Preview draw={shapeDraw(s.v)} />
            <span className="tile-label">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
