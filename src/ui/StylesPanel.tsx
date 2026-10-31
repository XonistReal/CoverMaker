import React, { useEffect, useRef } from 'react';
import { PRESETS, applyPreset, remix } from '../presets';
import { assets, getState, setDoc, setMeta, subscribe, toast, useStore } from '../store';
import { renderDoc } from '../render/compose';
import { onFontLoad } from '../fonts';
import { TextArea, TextInput } from './controls';
import { Icon } from './icons';
import { PhotoButton } from './PhotoButton';

const THUMB = 168;

function thumbKey() {
  const { doc, assetsRev } = getState();
  const main = doc.layers.find((l) => l.kind === 'image');
  return [main && main.kind === 'image' ? main.asset : 'none', doc.meta.artist, doc.meta.title, doc.meta.tracks, assetsRev, doc.layers.filter((l) => l.kind === 'image').length].join('|');
}

export function StylesPanel() {
  const current = useStore((s) => s.doc.preset);
  const meta = useStore((s) => s.doc.meta);
  const refs = useRef(new Map<string, HTMLCanvasElement>());

  useEffect(() => {
    let key = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const run = () => {
      const k = thumbKey();
      if (k === key) return;
      key = k;
      if (timer) clearTimeout(timer);
      let i = 0;
      const step = () => {
        if (cancelled || key !== k) return;
        const p = PRESETS[i++];
        if (!p) return;
        const c = refs.current.get(p.id);
        if (c) {
          const doc = applyPreset(getState().doc, p.id, 7);
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          renderDoc(doc, c, { size: Math.round(THUMB * dpr), quality: 'preview', assets, engine: 'thumb' });
        }
        timer = setTimeout(step, 16);
      };
      timer = setTimeout(step, 120);
    };
    run();
    const unsub = subscribe(run);
    const unfont = onFontLoad(() => {
      key = '';
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, 250);
    });
    return () => {
      cancelled = true;
      unsub();
      unfont();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const apply = (id: string) => {
    setDoc(applyPreset(getState().doc, id));
    if (id === 'collage' && getState().doc.layers.filter((l) => l.kind === 'image').length < 2) toast('Add more photos: each one drops in as a sticker.');
    if (id === 'crayon') toast('Grab the brush in Add → Draw to scribble your own.');
  };

  return (
    <div className="panel-body">
      <div className="intro">
        <PhotoButton />
        <div className="meta-fields">
          <TextInput label="Artist" value={meta.artist} onChange={(v) => setMeta('artist', v, false)} placeholder="your name" />
          <TextInput label="Title" value={meta.title} onChange={(v) => setMeta('title', v, false)} placeholder="project title" />
        </div>
      </div>
      <details className="tracks">
        <summary>Tracklist (used by Halo Text)</summary>
        <TextArea label="One song per line" rows={5} value={meta.tracks} onChange={(v) => setMeta('tracks', v, false)} />
      </details>

      <div className="styles-head">
        <h2>Styles</h2>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setDoc(remix(getState().doc));
          }}
        >
          <Icon name="dice" /> Random
        </button>
      </div>
      <p className="muted small">Tap a style to apply it to your photo. Everything stays editable afterwards.</p>
      <div className="preset-grid">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className={'preset' + (p.id === current ? ' on' : '')} onClick={() => apply(p.id)} aria-pressed={p.id === current}>
            <canvas
              ref={(el) => {
                if (el) refs.current.set(p.id, el);
                else refs.current.delete(p.id);
              }}
              width={THUMB}
              height={THUMB}
              aria-hidden="true"
            />
            <span className="preset-name">{p.name}</span>
            <span className="preset-hint">{p.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
