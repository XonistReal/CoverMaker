import React from 'react';
import type { Blend, DrawLayer, ImageLayer, Layer, LayerBase, MaskShape, ShapeKind, ShapeLayer, StickerLayer, TextFill, TextLayer, TextPath } from '../types';
import {
  commit, duplicateLayer, moveLayer, removeLayer, setMeta, setState, updateLayer, useStore,
} from '../store';
import { fontByFamily } from '../fonts';
import { randSeed } from '../lib/util';
import { pickFiles, replacePhoto } from '../lib/photos';
import { place } from '../presets';
import { ColorField, FontPicker, IconButton, Section, Seg, SelectField, Slider, TextArea, Toggle } from './controls';
import { Icon } from './icons';
import { BrushControls } from './AddPanel';

const BLENDS: { v: Blend; label: string }[] = [
  { v: 'source-over', label: 'Normal' }, { v: 'multiply', label: 'Multiply' }, { v: 'screen', label: 'Screen' }, { v: 'overlay', label: 'Overlay' },
  { v: 'soft-light', label: 'Soft light' }, { v: 'hard-light', label: 'Hard light' }, { v: 'difference', label: 'Difference' }, { v: 'exclusion', label: 'Exclusion' },
  { v: 'color-dodge', label: 'Dodge' }, { v: 'color-burn', label: 'Burn' }, { v: 'lighten', label: 'Lighten' }, { v: 'darken', label: 'Darken' },
  { v: 'hue', label: 'Hue' }, { v: 'color', label: 'Color' }, { v: 'luminosity', label: 'Luminosity' },
];

const KIND_ICON: Record<Layer['kind'], string> = { image: 'image', text: 'text', shape: 'shape', sticker: 'sticker', draw: 'brush' };

function LayerList() {
  const layers = useStore((s) => s.doc.layers);
  const selected = useStore((s) => s.selected);
  const rows = [...layers].reverse();
  if (!rows.length) return <p className="muted small">No layers yet. Pick a style or add a photo.</p>;
  return (
    <ul className="layer-list" aria-label="Layers, top first">
      {rows.map((l) => (
        <li key={l.id} className={(l.id === selected ? 'on ' : '') + (l.hidden ? 'is-hidden' : '')}>
          <button type="button" className="layer-name" onClick={() => setState({ selected: l.id })}>
            <Icon name={KIND_ICON[l.kind]} size={15} />
            <span>{l.kind === 'text' ? l.text.split('\n')[0] || 'Text' : l.name}</span>
            {l.clean && <em title="Drawn above the effects">crisp</em>}
          </button>
          <IconButton icon={l.hidden ? 'eyeOff' : 'eye'} label={l.hidden ? 'Show' : 'Hide'} onClick={() => updateLayer(l.id, { hidden: !l.hidden })} />
          <IconButton icon={l.locked ? 'lock' : 'unlock'} label={l.locked ? 'Unlock' : 'Lock'} active={l.locked} onClick={() => updateLayer(l.id, { locked: !l.locked })} />
        </li>
      ))}
    </ul>
  );
}

function Common({ l }: { l: Layer }) {
  const up = (p: Partial<LayerBase>, save = false) => updateLayer<Layer>(l.id, p as Partial<Layer>, save);
  return (
    <Section title="Placement & blend" open={false}>
      <Slider label="Opacity" value={l.opacity} min={0} max={1} onChange={(v) => up({ opacity: v })} />
      <SelectField<Blend> label="Blend mode" value={l.blend} options={BLENDS} onChange={(v) => up({ blend: v }, true)} />
      <Slider label="Rotate" value={l.rot} min={-180} max={180} step={1} format={(v) => `${Math.round(v)}°`} onChange={(v) => up({ rot: v })} />
      <Slider label="Scale" value={l.scale} min={0.05} max={4} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => up({ scale: v })} />
      <div className="btn-row">
        <button type="button" className="btn small" onClick={() => up({ x: 500 }, true)}>Center across</button>
        <button type="button" className="btn small" onClick={() => up({ y: 500 }, true)}>Center down</button>
      </div>
      <Toggle label="Keep crisp" hint="Draw above grain and color effects" value={l.clean} onChange={(v) => up({ clean: v })} />
    </Section>
  );
}

function TextProps({ l }: { l: TextLayer }) {
  const up = (p: Partial<TextLayer>, save = false) => updateLayer<TextLayer>(l.id, p, save);
  const meta = useStore((s) => s.doc.meta);
  const def = fontByFamily.get(l.font);
  const linked = l.role === 'title' || l.role === 'artist';
  return (
    <>
      {l.role === 'tracks' ? (
        <TextArea label="Tracklist (one per line, numbers added for you)" rows={5} value={meta.tracks} onChange={(v) => setMeta('tracks', v, false)} />
      ) : (
        <div className="ctl">
          <label className="ctl-label" htmlFor="layer-text">
            {linked ? `Text (linked to your ${l.role})` : 'Text'}
          </label>
          <textarea
            id="layer-text"
            rows={2}
            value={l.text}
            onChange={(e) => (linked ? setMeta(l.role as 'title' | 'artist', e.target.value, false) : up({ text: e.target.value }))}
            onBlur={commit}
          />
        </div>
      )}
      <FontPicker value={l.font} sample={l.text} onChange={(f) => {
        const d = fontByFamily.get(f);
        up({ font: f, weight: d && !d.weights.includes(l.weight) ? d.weights[d.weights.length - 1] : l.weight, italic: d?.italic ? l.italic : false }, true);
      }} />
      <Slider label="Size" value={l.size} min={12} max={420} step={1} onChange={(v) => up({ size: v })} />
      {def && def.weights.length > 1 && (
        <Seg label="Weight" value={String(l.weight)} options={def.weights.map((w) => ({ v: String(w), label: w >= 800 ? 'Black' : w >= 600 ? 'Bold' : 'Regular' }))} onChange={(v) => up({ weight: Number(v) })} />
      )}
      <div className="row">
        <Seg label="Case" value={l.caps} options={[{ v: 'none', label: 'Aa' }, { v: 'upper', label: 'AA' }, { v: 'lower', label: 'aa' }]} onChange={(v) => up({ caps: v })} />
        <Seg label="Align" value={l.align} options={[{ v: 'left', label: 'Left' }, { v: 'center', label: 'Mid' }, { v: 'right', label: 'Right' }]} onChange={(v) => up({ align: v })} />
      </div>
      {def?.italic && <Toggle label="Italic" value={l.italic} onChange={(v) => up({ italic: v })} />}

      <Section title="Fill & outline">
        <Seg<TextFill>
          value={l.fill}
          wrap
          onChange={(v) => up({ fill: v })}
          options={[
            { v: 'solid', label: 'Solid' }, { v: 'gradient', label: 'Gradient' }, { v: 'chrome', label: 'Chrome' },
            { v: 'gold', label: 'Gold' }, { v: 'ice', label: 'Ice' }, { v: 'none', label: 'Outline only' },
          ]}
        />
        {(l.fill === 'solid' || l.fill === 'gradient' || l.fill === 'none') && <ColorField label={l.fill === 'gradient' ? 'Top color' : 'Color'} value={l.color} onChange={(v) => up({ color: v })} />}
        {l.fill === 'gradient' && <ColorField label="Bottom color" value={l.color2} onChange={(v) => up({ color2: v })} />}
        <Slider label="Outline" value={l.stroke} min={0} max={24} step={0.5} onChange={(v) => up({ stroke: v })} />
        {l.stroke > 0 && <ColorField label="Outline color" value={l.strokeColor} onChange={(v) => up({ strokeColor: v })} />}
      </Section>

      <Section title="Glow, shadow, 3D" open={l.glow > 0 || l.shadow > 0 || l.extrude > 0}>
        <Slider label="Glow" value={l.glow} min={0} max={1} onChange={(v) => up({ glow: v })} />
        {l.glow > 0 && <ColorField label="Glow color" value={l.glowColor} onChange={(v) => up({ glowColor: v })} />}
        <Slider label="Drop shadow" value={l.shadow} min={0} max={1} onChange={(v) => up({ shadow: v })} />
        {l.shadow > 0 && <ColorField label="Shadow color" value={l.shadowColor} onChange={(v) => up({ shadowColor: v })} />}
        <Slider label="3D depth" value={l.extrude} min={0} max={1} onChange={(v) => up({ extrude: v })} />
        {l.extrude > 0 && <ColorField label="Depth color" value={l.extrudeColor} onChange={(v) => up({ extrudeColor: v })} />}
      </Section>

      <Section title="Spacing & shape" open={l.path !== 'none' || l.jitter > 0}>
        <Seg<TextPath>
          label="Path"
          value={l.path}
          onChange={(v) => up({ path: v, curve: v === 'wave' ? 140 : v === 'circle' ? 250 : l.curve === 140 ? 320 : l.curve })}
          options={[{ v: 'none', label: 'Straight' }, { v: 'arc', label: 'Arc' }, { v: 'circle', label: 'Circle' }, { v: 'wave', label: 'Wave' }]}
        />
        {l.path !== 'none' && (
          <Slider
            label={l.path === 'wave' ? 'Wave height' : l.path === 'circle' ? 'Radius' : 'Curve (negative bends down)'}
            value={l.curve}
            min={l.path === 'arc' ? -900 : l.path === 'circle' ? 60 : 0}
            max={l.path === 'wave' ? 400 : 900}
            step={1}
            onChange={(v) => up({ curve: v })}
          />
        )}
        <Slider label="Letter spacing" value={l.tracking} min={-150} max={800} step={5} onChange={(v) => up({ tracking: v })} />
        <Slider label="Line height" value={l.leading} min={0.6} max={2} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => up({ leading: v })} />
        <Slider label="Stretch" value={l.stretch} min={0.4} max={2} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => up({ stretch: v })} />
        {l.path === 'none' && <Toggle label="Shrink to fit" hint="Long titles scale down to stay on the cover" value={l.fit > 0} onChange={(v) => up({ fit: v ? 900 : 0 })} />}
        <Slider label="Wobble" value={l.jitter} min={0} max={1} onChange={(v) => up({ jitter: v })} />
        {l.jitter > 0 && (
          <button type="button" className="btn small" onClick={() => up({ seed: randSeed() }, true)}>
            <Icon name="refresh" size={14} /> Reroll wobble
          </button>
        )}
      </Section>
    </>
  );
}

function ImageProps({ l }: { l: ImageLayer }) {
  const up = (p: Partial<ImageLayer>, save = false) => updateLayer<ImageLayer>(l.id, p, save);
  return (
    <>
      <div className="btn-row">
        <button type="button" className="btn small" onClick={async () => { const [f] = await pickFiles(false); if (f) replacePhoto(l.id, f); }}>
          <Icon name="upload" size={14} /> Replace
        </button>
        <button type="button" className="btn small" onClick={() => up(place(l, 'cover'), true)}>Fill cover</button>
        <button type="button" className="btn small" onClick={() => up(place(l, 1000), true)}>Fit inside</button>
        <IconButton icon="flipH" label="Flip horizontal" active={l.flipX} onClick={() => up({ flipX: !l.flipX }, true)} />
        <IconButton icon="flipV" label="Flip vertical" active={l.flipY} onClick={() => up({ flipY: !l.flipY }, true)} />
      </div>
      <Section title="Adjust">
        <Toggle label="Black & white" value={l.bw} onChange={(v) => up({ bw: v })} />
        <Slider label="Brightness" value={l.bright} min={-1} max={1} onChange={(v) => up({ bright: v })} />
        <Slider label="Contrast" value={l.contrast} min={-1} max={1.5} onChange={(v) => up({ contrast: v })} />
        <Slider label="Tint" value={l.tintAmt} min={0} max={1} onChange={(v) => up({ tintAmt: v })} />
        {l.tintAmt > 0 && <ColorField label="Tint color" value={l.tint} onChange={(v) => up({ tint: v })} />}
      </Section>
      <Section title="Cut out & shape" open={l.keyOut !== 'none' || l.mask !== 'none' || l.outline > 0}>
        <Seg
          label="Remove background"
          value={l.keyOut}
          onChange={(v) => up({ keyOut: v })}
          options={[{ v: 'none', label: 'Off' }, { v: 'white', label: 'White bg' }, { v: 'black', label: 'Black bg' }]}
        />
        {l.keyOut !== 'none' && <Slider label="Tolerance" value={l.keyTol} min={0} max={1} onChange={(v) => up({ keyTol: v })} />}
        <Seg<MaskShape>
          label="Mask"
          wrap
          value={l.mask}
          onChange={(v) => up({ mask: v })}
          options={[
            { v: 'none', label: 'None' }, { v: 'circle', label: 'Circle' }, { v: 'triangle', label: 'Triangle' },
            { v: 'diamond', label: 'Diamond' }, { v: 'arch', label: 'Arch' }, { v: 'rounded', label: 'Rounded' },
          ]}
        />
        <Slider label="Sticker border" value={l.outline} min={0} max={40} step={1} onChange={(v) => up({ outline: v })} />
        {l.outline > 0 && <ColorField label="Border color" value={l.outlineColor} onChange={(v) => up({ outlineColor: v })} />}
        <Slider label="Drop shadow" value={l.shadow} min={0} max={1} onChange={(v) => up({ shadow: v })} />
      </Section>
    </>
  );
}

function ShapeProps({ l }: { l: ShapeLayer }) {
  const up = (p: Partial<ShapeLayer>, save = false) => updateLayer<ShapeLayer>(l.id, p, save);
  return (
    <>
      <SelectField<ShapeKind>
        label="Shape"
        value={l.shape}
        onChange={(v) => up({ shape: v })}
        options={[
          { v: 'rect', label: 'Box' }, { v: 'ellipse', label: 'Circle' }, { v: 'triangle', label: 'Triangle' }, { v: 'star', label: 'Star' },
          { v: 'cross', label: 'Cross' }, { v: 'invcross', label: 'Upside-down cross' }, { v: 'heart', label: 'Heart' }, { v: 'diamond', label: 'Diamond' },
          { v: 'frame', label: 'Frame' }, { v: 'line', label: 'Line' },
        ]}
      />
      <Slider label="Width" value={l.w} min={10} max={1200} step={1} onChange={(v) => up({ w: v })} />
      {l.shape !== 'line' && <Slider label="Height" value={l.h} min={10} max={1200} step={1} onChange={(v) => up({ h: v })} />}
      {l.shape === 'star' && <Slider label="Points" value={l.points} min={3} max={16} step={1} onChange={(v) => up({ points: v })} />}
      {l.shape !== 'line' && <Toggle label="Fill" value={l.fillOn} onChange={(v) => up({ fillOn: v })} />}
      {l.fillOn && l.shape !== 'line' && (
        <>
          <ColorField label={l.gradient ? 'Top color' : 'Fill color'} value={l.fill} onChange={(v) => up({ fill: v })} />
          <Toggle label="Gradient" value={l.gradient} onChange={(v) => up({ gradient: v })} />
          {l.gradient && <ColorField label="Bottom color" value={l.fill2} onChange={(v) => up({ fill2: v })} />}
        </>
      )}
      <Slider label="Outline" value={l.stroke} min={0} max={60} step={1} onChange={(v) => up({ stroke: v })} />
      {l.stroke > 0 && <ColorField label="Outline color" value={l.strokeColor} onChange={(v) => up({ strokeColor: v })} />}
      <Slider label="Hand-drawn wobble" value={l.rough} min={0} max={1} onChange={(v) => up({ rough: v })} />
      {l.rough > 0 && (
        <button type="button" className="btn small" onClick={() => up({ seed: randSeed() }, true)}>
          <Icon name="refresh" size={14} /> Reroll wobble
        </button>
      )}
    </>
  );
}

function StickerProps({ l }: { l: StickerLayer }) {
  const up = (p: Partial<StickerLayer>, save = false) => updateLayer<StickerLayer>(l.id, p, save);
  const hasText = l.sticker === 'rec' || l.sticker === 'timestamp' || l.sticker === 'barcode';
  const random = ['splatter', 'drips', 'barbed', 'scribble', 'tape', 'barcode', 'scratches'].includes(l.sticker);
  const amountLabel: Partial<Record<StickerLayer['sticker'], string>> = {
    splatter: 'Mess', drips: 'Drips', sparkle: 'Second glint', barbed: 'Barbs', scribble: 'Rows', tape: 'Opacity', flare: 'Intensity', scratches: 'Amount',
  };
  const two = ['advisory', 'explicit', 'rec', 'timestamp', 'barcode', 'flare'].includes(l.sticker);
  return (
    <>
      {hasText && (
        <TextArea label={l.sticker === 'barcode' ? 'Digits (blank for random)' : 'Text'} rows={l.sticker === 'rec' ? 2 : 1} value={l.text} onChange={(v) => up({ text: v })} />
      )}
      <ColorField label={l.sticker === 'advisory' || l.sticker === 'explicit' ? 'Ink' : 'Color'} value={l.color} onChange={(v) => up({ color: v })} />
      {two && (
        <ColorField
          label={l.sticker === 'rec' ? 'REC dot' : l.sticker === 'flare' ? 'Halo' : l.sticker === 'timestamp' ? 'Box' : 'Paper'}
          value={l.color2}
          onChange={(v) => up({ color2: v })}
        />
      )}
      {amountLabel[l.sticker] && <Slider label={amountLabel[l.sticker]!} value={l.amount} min={0} max={1} onChange={(v) => up({ amount: v })} />}
      {l.sticker !== 'rec' && (
        <>
          <Slider label="Width" value={l.w} min={20} max={1400} step={1} onChange={(v) => up({ w: v })} />
          <Slider label="Height" value={l.h} min={20} max={1400} step={1} onChange={(v) => up({ h: v })} />
        </>
      )}
      {random && (
        <button type="button" className="btn small" onClick={() => up({ seed: randSeed() }, true)}>
          <Icon name="refresh" size={14} /> Reroll
        </button>
      )}
    </>
  );
}

function DrawProps({ l }: { l: DrawLayer }) {
  const tool = useStore((s) => s.tool);
  return (
    <>
      <div className="btn-row">
        <button type="button" className={'btn small' + (tool === 'draw' ? ' primary' : '')} onClick={() => setState({ tool: tool === 'draw' ? 'select' : 'draw' })}>
          <Icon name="brush" size={14} /> {tool === 'draw' ? 'Done drawing' : 'Draw on this layer'}
        </button>
        <button type="button" className="btn small" disabled={!l.strokes.length} onClick={() => updateLayer<DrawLayer>(l.id, { strokes: l.strokes.slice(0, -1) })}>
          Undo stroke
        </button>
        <button type="button" className="btn small" disabled={!l.strokes.length} onClick={() => updateLayer<DrawLayer>(l.id, { strokes: [] })}>
          Clear
        </button>
      </div>
      <BrushControls />
    </>
  );
}

export function LayerPanel() {
  const selected = useStore((s) => s.doc.layers.find((l) => l.id === s.selected) ?? null);
  const count = useStore((s) => s.doc.layers.length);
  return (
    <div className="panel-body">
      {selected ? (
        <div className="props">
          <div className="props-head">
            <button type="button" className="link" onClick={() => setState({ selected: null })}>
              <Icon name="back" size={14} /> All layers
            </button>
            <div className="props-actions">
              <IconButton icon="up" label="Bring forward" onClick={() => moveLayer(selected.id, 1)} />
              <IconButton icon="down" label="Send backward" onClick={() => moveLayer(selected.id, -1)} />
              <IconButton icon="copy" label="Duplicate" onClick={() => duplicateLayer(selected.id)} />
              <IconButton icon="trash" label="Delete" danger onClick={() => removeLayer(selected.id)} />
            </div>
          </div>
          <h2 className="props-title">
            {selected.kind === 'text' ? 'Text' : selected.kind === 'image' ? 'Photo' : selected.kind === 'draw' ? 'Drawing' : selected.name}
          </h2>
          {selected.kind === 'text' && <TextProps l={selected} />}
          {selected.kind === 'image' && <ImageProps l={selected} />}
          {selected.kind === 'shape' && <ShapeProps l={selected} />}
          {selected.kind === 'sticker' && <StickerProps l={selected} />}
          {selected.kind === 'draw' && <DrawProps l={selected} />}
          <Common l={selected} />
        </div>
      ) : (
        <>
          <h2>Layers</h2>
          <p className="muted small">Tap a layer on the cover or in this list to edit it. Top of the list is the front.</p>
          <LayerList />
        </>
      )}
      {selected && (
        <details className="layers-mini">
          <summary>All layers ({count})</summary>
          <LayerList />
        </details>
      )}
    </div>
  );
}
