import React from 'react';

const P: Record<string, string> = {
  undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  redo: 'm15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
  dice: 'M4 4h16v16H4zM8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01',
  download: 'M12 3v12m0 0-5-5m5 5 5-5M4 19h16',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  unlock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 7.5-2',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  up: 'm6 15 6-6 6 6',
  down: 'm6 9 6 6 6-6',
  copy: 'M8 8h12v12H8zM16 8V4H4v12h4',
  plus: 'M12 5v14M5 12h14',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9.5h.01',
  text: 'M5 6V4h14v2M12 4v16M9 20h6',
  brush: 'M18 3l3 3-9.5 9.5-3-3zM8.5 12.5c-2 0-3.5 1.5-3.5 3.5 0 1.5-1 2.5-2 3 3.5 1 8 .5 8.5-3.5',
  shape: 'M12 3l9 16H3zM12 9v.01',
  layers: 'm12 3 9 5-9 5-9-5 9-5zm-9 9 9 5 9-5M3 16l9 5 9-5',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  wand: 'M15 4V2M15 10V8M11 6H9M21 6h-2M18 3l-1.5 1.5M3 21l12-12',
  x: 'M6 6l12 12M18 6 6 18',
  upload: 'M12 16V4m0 0-5 5m5-5 5 5M4 20h16',
  pointer: 'M5 3l14 7-6 2-2 6z',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  flipH: 'M12 3v18M8 7 3 12l5 5V7zm8 0 5 5-5 5V7z',
  flipV: 'M3 12h18M7 8l5-5 5 5H7zm0 8 5 5 5-5H7z',
  center: 'M12 2v4M12 18v4M2 12h4M18 12h4M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  sticker: 'M4 4h11l5 5v11H4zM15 4v5h5',
  back: 'M15 18l-6-6 6-6',
};

export function Icon({ name, size = 18 }: { name: keyof typeof P | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? ''} />
    </svg>
  );
}
