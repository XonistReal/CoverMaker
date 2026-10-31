import type { ImageLayer } from '../types';
import { addLayer, getState, setDoc, toast, updateDoc } from '../store';
import { newImage } from '../defaults';
import { applyPreset, place } from '../presets';
import { importFile } from './assets';

const isImage = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|avif)$/i.test(f.name);

/** First upload replaces the sample portrait; later ones are added on top (and arranged by collage styles). */
export async function addPhotos(files: File[] | FileList) {
  const list = Array.from(files).filter(isImage);
  if (!list.length) {
    toast('Drop a JPG, PNG or WEBP image.');
    return;
  }
  for (const file of list) {
    try {
      const a = await importFile(file);
      const { doc } = getState();
      const sample = doc.layers.find((l): l is ImageLayer => l.kind === 'image' && l.asset === 'sample');
      if (sample) {
        replaceAsset(sample.id, a.id, a.w, a.h, file.name);
        continue;
      }
      const hasImage = doc.layers.some((l) => l.kind === 'image');
      const layer = newImage(a.id, a.w, a.h, file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Photo', !hasImage);
      if (!hasImage) {
        // the main photo sits at the bottom of the stack
        updateDoc((d) => ({ ...d, layers: [layer, ...d.layers] }));
      } else addLayer(layer, list.length === 1);
    } catch (e) {
      toast((e as Error).message);
    }
  }
  const { doc } = getState();
  if (doc.preset === 'collage') setDoc(applyPreset(doc, 'collage'));
}

export function replaceAsset(layerId: string, assetId: string, w: number, h: number, name?: string) {
  updateDoc((d) => ({
    ...d,
    layers: d.layers.map((l) => {
      if (l.id !== layerId || l.kind !== 'image') return l;
      const fresh = { ...l, asset: assetId, w, h };
      const covered = Math.min(l.w, l.h) * l.scale >= 990;
      const geo = covered ? place(fresh, 'cover', l.x, l.y) : place(fresh, Math.max(l.w, l.h), l.x, l.y);
      return { ...fresh, ...geo, scale: covered ? 1 : l.scale, rot: l.rot, name: name ? name.replace(/\.[^.]+$/, '').slice(0, 24) : l.name };
    }),
  }));
}

export async function replacePhoto(layerId: string, file: File) {
  try {
    const a = await importFile(file);
    replaceAsset(layerId, a.id, a.w, a.h, file.name);
  } catch (e) {
    toast((e as Error).message);
  }
}

export function pickFiles(multiple = true): Promise<File[]> {
  return new Promise((res) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
      res(Array.from(input.files ?? []));
      input.remove();
    };
    input.click();
  });
}
