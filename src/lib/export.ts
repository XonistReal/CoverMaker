import type { Doc } from '../types';
import { assets } from '../store';
import { renderDoc } from '../render/compose';
import { waitForFonts } from '../fonts';
import { makeCanvas } from './util';

type Downloads = { save: (r: { filename: string; data: Blob }) => Promise<{ status: string }> };
type ClaudeWin = Window & { claude?: { use?: (n: string) => Promise<unknown> } };

// Inside a claude.ai artifact the frame blocks plain downloads; the host's downloads capability takes over.
let downloadsP: Promise<Downloads | null> | null = null;
export function hostDownloads(): Promise<Downloads | null> {
  if (!downloadsP) {
    const w = window as ClaudeWin;
    downloadsP = w.claude?.use ? (w.claude.use('downloads') as Promise<Downloads | null>).catch(() => null) : Promise.resolve(null);
  }
  return downloadsP;
}

export const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'cover';

export async function renderFull(doc: Doc, size: number): Promise<HTMLCanvasElement> {
  const fonts = doc.layers.flatMap((l) => (l.kind === 'text' && !l.hidden ? [{ family: l.font, weight: l.weight, italic: l.italic }] : []));
  fonts.push({ family: 'Oswald', weight: 700, italic: false }, { family: 'VT323', weight: 400, italic: false });
  await waitForFonts(fonts);
  const c = makeCanvas(size, size);
  renderDoc(doc, c, { size, quality: 'export', assets });
  return c;
}

export function toBlob(c: HTMLCanvasElement, type: 'image/jpeg' | 'image/png'): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Your browser could not encode the image. Try PNG or a smaller size.'))), type, 0.95));
}

/** Returns 'saved' when the file went to the viewer, or throws with a readable reason. */
export async function saveBlob(blob: Blob, filename: string): Promise<'saved' | 'declined'> {
  const host = await hostDownloads();
  if (host) {
    try {
      await host.save({ filename, data: blob });
      return 'saved';
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'declined') return 'declined';
      if (code === 'rate_limited') throw new Error('A save prompt is already open. Finish that one first.');
      throw new Error('Saving is not available in this view. Open the page in a full browser tab to download.');
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'saved';
}
