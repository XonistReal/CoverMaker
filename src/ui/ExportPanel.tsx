import React, { useState } from 'react';
import { getState, setDoc, setState, toast, useStore } from '../store';
import { renderFull, saveBlob, slug, toBlob } from '../lib/export';
import { emptyDoc, newImage, newSticker } from '../defaults';
import { sampleAsset } from '../lib/assets';
import { applyPreset } from '../presets';
import type { Doc } from '../types';
import { Seg } from './controls';
import { Icon } from './icons';
import { addLayer, removeLayer } from '../store';

const SIZES = [
  { v: '3000', label: '3000 px', note: 'Spotify, Apple Music, DistroKid, SoundCloud' },
  { v: '1600', label: '1600 px', note: 'Bandcamp, quick uploads' },
  { v: '1080', label: '1080 px', note: 'Instagram post' },
];

export function freshDoc(meta?: Doc['meta']) {
  const a = sampleAsset();
  const doc = emptyDoc();
  if (meta) doc.meta = meta;
  doc.layers = [newImage(a.id, a.w, a.h, 'Sample photo')];
  return applyPreset(doc, 'chrome');
}

export function ExportPanel() {
  const [size, setSize] = useState('3000');
  const [format, setFormat] = useState<'jpg' | 'png'>('jpg');
  const [busy, setBusy] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const meta = useStore((s) => s.doc.meta);
  const advisory = useStore((s) => s.doc.layers.find((l) => l.kind === 'sticker' && l.sticker === 'advisory') ?? null);
  const filename = `${slug(meta.artist)}-${slug(meta.title)}-${size}.${format}`;

  const run = async () => {
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const c = await renderFull(getState().doc, Number(size));
      const blob = await toBlob(c, format === 'jpg' ? 'image/jpeg' : 'image/png');
      const res = await saveBlob(blob, filename);
      toast(res === 'saved' ? `Saved ${filename}` : 'Save cancelled.');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-body">
      <h2>Export</h2>
      <div className="ctl">
        <div className="ctl-label">Size</div>
        <div className="size-list" role="radiogroup" aria-label="Export size">
          {SIZES.map((s) => (
            <button key={s.v} type="button" role="radio" aria-checked={size === s.v} className={'size-opt' + (size === s.v ? ' on' : '')} onClick={() => setSize(s.v)}>
              <strong>{s.label}</strong>
              <span>{s.note}</span>
            </button>
          ))}
        </div>
      </div>
      <Seg label="Format" value={format} onChange={setFormat} options={[{ v: 'jpg', label: 'JPG (smaller)' }, { v: 'png', label: 'PNG (lossless)' }]} />
      <label className="check">
        <input
          type="checkbox"
          checked={!!advisory}
          onChange={(e) => {
            if (e.target.checked) addLayer(newSticker('advisory'), false);
            else if (advisory) removeLayer(advisory.id);
          }}
        />
        <span>Parental advisory label</span>
      </label>
      <button type="button" className="btn primary big" onClick={run} disabled={busy}>
        <Icon name="download" /> {busy ? 'Rendering…' : `Download ${format.toUpperCase()}`}
      </button>
      <p className="muted small mono">{filename}</p>
      <p className="muted small">Streaming stores want a square image of at least 3000 × 3000 px with no blur or pixelation from upscaling. Every export here renders fresh at full size.</p>

      <hr />
      <h3>Start over</h3>
      {!confirmNew ? (
        <button type="button" className="btn" onClick={() => setConfirmNew(true)}>New cover</button>
      ) : (
        <div className="confirm">
          <p className="small">Clear this cover and start from the sample photo? You can still undo.</p>
          <div className="btn-row">
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                setDoc(freshDoc(getState().doc.meta));
                setState({ selected: null, panel: 'styles' });
                setConfirmNew(false);
              }}
            >
              Clear cover
            </button>
            <button type="button" className="btn" onClick={() => setConfirmNew(false)}>Keep working</button>
          </div>
        </div>
      )}
    </div>
  );
}
