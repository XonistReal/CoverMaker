import React, { useEffect, useRef } from 'react';
import { assets, useStore } from '../store';
import { addPhotos, pickFiles } from '../lib/photos';
import { Icon } from './icons';

export function PhotoButton() {
  const main = useStore((s) => s.doc.layers.find((l) => l.kind === 'image') ?? null);
  const rev = useStore((s) => s.assetsRev);
  const ref = useRef<HTMLCanvasElement>(null);
  const assetId = main && main.kind === 'image' ? main.asset : null;
  const isSample = assetId === 'sample' || !assetId;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const x = c.getContext('2d')!;
    x.fillStyle = '#1b1b20';
    x.fillRect(0, 0, c.width, c.height);
    const a = assetId ? assets.get(assetId) : null;
    if (!a) return;
    const s = Math.max(c.width / a.w, c.height / a.h);
    x.drawImage(a.src, (c.width - a.w * s) / 2, (c.height - a.h * s) / 2, a.w * s, a.h * s);
  }, [assetId, rev]);

  return (
    <button type="button" className={'photo-btn' + (isSample ? ' sample' : '')} onClick={async () => addPhotos(await pickFiles(true))}>
      <canvas ref={ref} width={128} height={128} aria-hidden="true" />
      <span className="photo-btn-label">
        <Icon name="upload" size={16} />
        {isSample ? 'Upload your photo' : 'Add photos'}
      </span>
      {isSample && <span className="photo-btn-note">Sample shown</span>}
    </button>
  );
}
