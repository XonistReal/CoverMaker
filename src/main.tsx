import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { setState } from './store';
import { loadFontsStylesheet } from './fonts';
import { loadSaved, startAutosave } from './lib/persist';
import { sampleAsset } from './lib/assets';
import { freshDoc } from './ui/ExportPanel';

async function boot() {
  loadFontsStylesheet();
  sampleAsset();
  const saved = await Promise.race([loadSaved(), new Promise<null>((r) => setTimeout(() => r(null), 2500))]);
  const doc = saved ?? freshDoc();
  setState({ doc, committed: doc, past: [], future: [] });
  startAutosave();
  const root = document.getElementById('root')!;
  createRoot(root).render(<App />);
}

boot();
