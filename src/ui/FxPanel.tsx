import React from 'react';
import type { Background, ColorMode, FX, MirrorMode, Stylize } from '../types';
import { updateDoc, useStore } from '../store';
import { defaultFX } from '../defaults';
import { randSeed } from '../lib/util';
import { ColorField, Section, Seg, Slider, Toggle } from './controls';
import { Icon } from './icons';

const setFx = (p: Partial<FX>, save = false) => updateDoc((d) => ({ ...d, fx: { ...d.fx, ...p } }), save);
const setBg = (p: Partial<Background>, save = false) => updateDoc((d) => ({ ...d, bg: { ...d.bg, ...p } }), save);

export function FxPanel() {
  const fx = useStore((s) => s.doc.fx);
  const bg = useStore((s) => s.doc.bg);
  const S = (label: string, k: keyof FX, min: number, max: number, step = 0.01, format?: (v: number) => string) => (
    <Slider label={label} value={fx[k] as number} min={min} max={max} step={step} format={format} onChange={(v) => setFx({ [k]: v } as Partial<FX>)} />
  );
  const duo = fx.mode === 'duotone' || fx.mode === 'colorize';
  return (
    <div className="panel-body">
      <div className="styles-head">
        <h2>Effects</h2>
        <div className="btn-row">
          <button type="button" className="btn small" onClick={() => setFx({ seed: randSeed() % 997 }, true)} title="New random grain, dust and VHS pattern">
            <Icon name="refresh" size={14} /> Reroll noise
          </button>
          <button type="button" className="btn small" onClick={() => setFx({ ...defaultFX(), grain: 0 }, true)}>Reset</button>
        </div>
      </div>
      <p className="muted small">Effects run over everything except layers marked “Keep crisp”. Double-tap a slider to zero it.</p>

      <Section title="Color mode">
        <Seg<ColorMode>
          wrap
          value={fx.mode}
          onChange={(v) => setFx({ mode: v })}
          options={[
            { v: 'none', label: 'Natural' }, { v: 'bw', label: 'B&W' }, { v: 'duotone', label: 'Duotone' }, { v: 'colorize', label: 'Tint' },
            { v: 'nightvision', label: 'Night vision' }, { v: 'thermal', label: 'Thermal' }, { v: 'invert', label: 'Invert' }, { v: 'xray', label: 'X-ray' }, { v: 'sepia', label: 'Sepia' },
          ]}
        />
        {fx.mode !== 'none' && S('Strength', 'modeMix', 0, 1)}
        {fx.mode === 'duotone' && <ColorField label="Shadows" value={fx.shadowColor} onChange={(v) => setFx({ shadowColor: v })} />}
        {duo && <ColorField label={fx.mode === 'duotone' ? 'Highlights' : 'Tint color'} value={fx.highlightColor} onChange={(v) => setFx({ highlightColor: v })} />}
      </Section>

      <Section title="Tone">
        {S('Exposure', 'exposure', -2, 2)}
        {S('Contrast', 'contrast', -1, 1.5)}
        {S('Brightness', 'brightness', -1, 1)}
        {S('Crush blacks', 'blacks', 0, 0.5)}
        {S('Faded blacks', 'fade', 0, 1)}
        {S('Saturation', 'saturation', -1, 1.5)}
        {S('Hue shift', 'hue', -180, 180, 1, (v) => `${Math.round(v)}°`)}
        {S('Warmth', 'temperature', -1, 1)}
        {S('Tint (green/magenta)', 'tint', -1, 1)}
        {S('Sharpen', 'sharpen', 0, 1)}
      </Section>

      <Section title="Camera & lens">
        {S('Flash', 'flash', 0, 1)}
        {S('Vignette', 'vignette', 0, 1)}
        {S('Glow', 'glow', 0, 1)}
        {fx.glow > 0 && S('Glow starts at', 'glowThreshold', 0, 1)}
        {S('Soft blur', 'blur', 0, 1)}
        {S('Color split', 'chroma', 0, 1)}
      </Section>

      <Section title="Texture & lo-fi">
        {S('Grain', 'grain', 0, 1)}
        {fx.grain > 0 && S('Grain size', 'grainSize', 0.5, 4, 0.05, (v) => v.toFixed(1))}
        {fx.grain > 0 && <Toggle label="Color grain" value={fx.grainColor} onChange={(v) => setFx({ grainColor: v })} />}
        {S('Dust & scratches', 'dust', 0, 1)}
        {S('Scanlines', 'scanlines', 0, 1)}
        {S('VHS wobble', 'vhs', 0, 1)}
        {S('Low-res (webcam)', 'lowres', 0, 1)}
        {S('JPEG crunch', 'jpeg', 0, 1)}
        {S('Pixelate', 'pixelate', 0, 1)}
      </Section>

      <Section title="Print look" open={fx.stylize !== 'none'}>
        <Seg<Stylize>
          wrap
          value={fx.stylize}
          onChange={(v) => setFx({ stylize: v })}
          options={[
            { v: 'none', label: 'Off' }, { v: 'threshold', label: '1-bit' }, { v: 'dither', label: 'Dither' },
            { v: 'halftone', label: 'Halftone' }, { v: 'engrave', label: 'Engrave' }, { v: 'posterize', label: 'Posterize' },
          ]}
        />
        {fx.stylize !== 'none' && fx.stylize !== 'posterize' && fx.stylize !== 'threshold' && S('Dot / line size', 'cell', 2, 30, 0.5, (v) => v.toFixed(1))}
        {fx.stylize !== 'none' && S(fx.stylize === 'posterize' ? 'Levels' : 'Balance', 'level', 0, 1)}
        {fx.stylize !== 'none' && fx.stylize !== 'posterize' && (
          <>
            <ColorField label="Ink" value={fx.ink} onChange={(v) => setFx({ ink: v })} />
            <ColorField label="Paper" value={fx.paper} onChange={(v) => setFx({ paper: v })} />
            <Toggle label="Use photo colors for ink" value={fx.keepColor} onChange={(v) => setFx({ keepColor: v })} />
          </>
        )}
      </Section>

      <Section title="Mirror" open={fx.mirror !== 'none'}>
        <Seg<MirrorMode>
          wrap
          value={fx.mirror}
          onChange={(v) => setFx({ mirror: v })}
          options={[
            { v: 'none', label: 'Off' }, { v: 'left', label: 'Left → right' }, { v: 'right', label: 'Right → left' },
            { v: 'top', label: 'Top → bottom' }, { v: 'quad', label: '4-way' }, { v: 'kaleido', label: 'Kaleidoscope' },
          ]}
        />
        {fx.mirror === 'kaleido' && S('Slices', 'segments', 2, 16, 1, (v) => String(Math.round(v)))}
      </Section>

      <Section title="Background">
        <Seg<Background['type']>
          value={bg.type}
          wrap
          onChange={(v) => setBg({ type: v })}
          options={[{ v: 'solid', label: 'Solid' }, { v: 'linear', label: 'Fade' }, { v: 'radial', label: 'Spotlight' }, { v: 'paper', label: 'Paper' }, { v: 'concrete', label: 'Concrete' }]}
        />
        <ColorField label={bg.type === 'solid' || bg.type === 'paper' || bg.type === 'concrete' ? 'Color' : 'From'} value={bg.c1} onChange={(v) => setBg({ c1: v })} />
        {(bg.type === 'linear' || bg.type === 'radial') && <ColorField label="To" value={bg.c2} onChange={(v) => setBg({ c2: v })} />}
        {bg.type === 'linear' && (
          <Slider label="Angle" value={bg.angle} min={0} max={360} step={1} format={(v) => `${Math.round(v)}°`} onChange={(v) => setBg({ angle: v })} />
        )}
        <p className="muted small">The background only shows where your photo doesn’t cover the square.</p>
      </Section>
    </div>
  );
}
