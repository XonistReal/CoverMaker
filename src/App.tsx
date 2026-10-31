import React, { useEffect, useState } from 'react';
import { duplicateLayer, getState, redo, removeLayer, setDoc, setState, undo, updateLayer, useStore, commit, type Panel } from './store';
import { remix } from './presets';
import { addPhotos } from './lib/photos';
import { Stage } from './ui/Stage';
import { StylesPanel } from './ui/StylesPanel';
import { AddPanel } from './ui/AddPanel';
import { LayerPanel } from './ui/LayerPanel';
import { FxPanel } from './ui/FxPanel';
import { ExportPanel } from './ui/ExportPanel';
import { Icon } from './ui/icons';

const TABS: { id: Panel; label: string; icon: string }[] = [
  { id: 'styles', label: 'Styles', icon: 'wand' },
  { id: 'add', label: 'Add', icon: 'plus' },
  { id: 'layer', label: 'Layers', icon: 'layers' },
  { id: 'fx', label: 'Effects', icon: 'sliders' },
  { id: 'export', label: 'Export', icon: 'download' },
];

const typing = (e: Event) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
};

export function App() {
  const panel = useStore((s) => s.panel);
  const tool = useStore((s) => s.tool);
  const canUndo = useStore((s) => s.past.length > 0 || s.doc !== s.committed);
  const canRedo = useStore((s) => s.future.length > 0);
  const toastMsg = useStore((s) => s.toast);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        if (typing(e)) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        if (typing(e)) return;
        e.preventDefault();
        redo();
        return;
      }
      if (typing(e)) return;
      const { selected, tool: t } = getState();
      if (e.key === 'Escape') {
        if (t === 'draw') setState({ tool: 'select' });
        else setState({ selected: null });
        return;
      }
      if (!selected) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeLayer(selected);
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateLayer(selected);
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const l = getState().doc.layers.find((q) => q.id === selected);
        if (!l || l.locked) return;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        updateLayer(selected, { x: l.x + dx, y: l.y + dy }, false);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.startsWith('Arrow')) commit();
    };
    const onPaste = (e: ClipboardEvent) => {
      if (typing(e)) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) {
        e.preventDefault();
        addPhotos(files);
      }
    };
    let depth = 0;
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      depth++;
      setDragging(true);
    };
    const onDragLeave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setDragging(false);
      if (e.dataTransfer?.files.length) addPhotos(e.dataTransfer.files);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('paste', onPaste);
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo">CoverMaker</span>
          <span className="tagline">underground cover art · 3000 × 3000</span>
        </div>
        <div className="top-actions">
          <button type="button" className="icon-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
            <Icon name="undo" />
          </button>
          <button type="button" className="icon-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
            <Icon name="redo" />
          </button>
          <button type="button" className="btn ghost" onClick={() => setDoc(remix(getState().doc))} title="Random style with fresh seeds">
            <Icon name="dice" /> <span className="hide-sm">Random</span>
          </button>
          <button type="button" className="btn primary" onClick={() => setState({ panel: 'export' })}>
            <Icon name="download" /> <span className="hide-sm">Export</span>
          </button>
        </div>
      </header>

      <main className="work">
        <div className="stage-col">
          <Stage />
          <div className="stage-bar">
            {tool === 'draw' ? (
              <>
                <span className="pill live">Drawing</span>
                <button type="button" className="btn small" onClick={() => setState({ tool: 'select' })}>Done</button>
              </>
            ) : (
              <span className="mono muted">drag to move · corners scale · top knob rotates · two fingers pinch</span>
            )}
          </div>
        </div>

        <aside className="side">
          <nav className="tabs" role="tablist" aria-label="Editor panels">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={panel === t.id}
                className={panel === t.id ? 'on' : ''}
                onClick={() => setState({ panel: t.id })}
              >
                <Icon name={t.icon} size={17} />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="panel" role="tabpanel">
            {panel === 'styles' && <StylesPanel />}
            {panel === 'add' && <AddPanel />}
            {panel === 'layer' && <LayerPanel />}
            {panel === 'fx' && <FxPanel />}
            {panel === 'export' && <ExportPanel />}
          </div>
        </aside>
      </main>

      {toastMsg && (
        <div className="toast" role="status" key={toastMsg.id}>
          {toastMsg.msg}
        </div>
      )}
      {dragging && (
        <div className="drop">
          <div>Drop photos to add them</div>
        </div>
      )}
    </div>
  );
}
