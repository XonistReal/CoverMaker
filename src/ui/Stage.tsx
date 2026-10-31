import React, { useEffect, useRef, useState } from 'react';
import type { DrawLayer, Layer, Stroke } from '../types';
import { assets, commit, getState, setState, subscribe, updateLayer, addLayer, useStore } from '../store';
import { layerBox, renderDoc, getEngineError } from '../render/compose';
import { onFontLoad } from '../fonts';
import { newDraw } from '../defaults';
import { randSeed } from '../lib/util';

type Drag =
  | { kind: 'move'; id: string; sx: number; sy: number; lx: number; ly: number }
  | { kind: 'scale'; id: string; cx: number; cy: number; d0: number; s0: number }
  | { kind: 'rotate'; id: string; cx: number; cy: number; a0: number; r0: number }
  | { kind: 'pinch'; id: string; d0: number; a0: number; s0: number; r0: number; mx: number; my: number; lx: number; ly: number }
  | { kind: 'draw'; id: string };

const deg = (r: number) => (r * 180) / Math.PI;

function toLocal(l: Layer, px: number, py: number) {
  const a = (-l.rot * Math.PI) / 180;
  const dx = px - l.x;
  const dy = py - l.y;
  return [(dx * Math.cos(a) - dy * Math.sin(a)) / l.scale, (dx * Math.sin(a) + dy * Math.cos(a)) / l.scale];
}

function toDoc(l: Layer, lx: number, ly: number) {
  const a = (l.rot * Math.PI) / 180;
  const x = lx * l.scale;
  const y = ly * l.scale;
  return [l.x + x * Math.cos(a) - y * Math.sin(a), l.y + x * Math.sin(a) + y * Math.cos(a)];
}

/** Corners + rotate knob of a layer's box, in doc units. */
function frame(l: Layer, knob: number) {
  const b = layerBox(l);
  const x0 = b.cx - b.w / 2, x1 = b.cx + b.w / 2, y0 = b.cy - b.h / 2, y1 = b.cy + b.h / 2;
  const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => toDoc(l, x, y));
  const top = toDoc(l, b.cx, y0);
  const a = (l.rot * Math.PI) / 180;
  const rot: [number, number] = [top[0] + Math.sin(a) * knob, top[1] - Math.cos(a) * knob];
  const center = toDoc(l, b.cx, b.cy);
  return { corners, rot, top, center, box: b };
}

function hitLayer(layers: Layer[], x: number, y: number): Layer | null {
  // clean layers render above the effects pass, so they are checked first
  const ordered = [...layers.filter((l) => l.clean).reverse(), ...layers.filter((l) => !l.clean).reverse()];
  for (const l of ordered) {
    if (l.hidden || l.locked) continue;
    const b = layerBox(l);
    if (l.kind === 'draw' && b.w >= 1000) continue; // empty drawing layer
    const [lx, ly] = toLocal(l, x, y);
    if (Math.abs(lx - b.cx) <= b.w / 2 && Math.abs(ly - b.cy) <= b.h / 2) return l;
  }
  return null;
}

export function Stage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [css, setCss] = useState(500);
  const [guides, setGuidesState] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const guidesRef = useRef(guides);
  const setGuides = (g: { v: boolean; h: boolean }) => {
    guidesRef.current = g;
    setGuidesState(g);
  };
  const [fxError, setFxError] = useState('');
  const tool = useStore((s) => s.tool);
  const dragRef = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const rafRef = useRef(0);
  const sizeRef = useRef(500);

  // fit the square to the available space
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const s = Math.max(200, Math.floor(Math.min(r.width, r.height || r.width)));
      setCss(s);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // render loop: coalesce every store change into one frame
  useEffect(() => {
    sizeRef.current = css;
    let lastDoc: unknown = null;
    let lastRev = -1;
    let dirtyFonts = false;
    const draw = () => {
      rafRef.current = 0;
      const s = getState();
      const c = canvasRef.current;
      if (!c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const R = Math.min(1400, Math.round(css * dpr));
      if (s.doc !== lastDoc || s.assetsRev !== lastRev || dirtyFonts || c.width !== R) {
        lastDoc = s.doc;
        lastRev = s.assetsRev;
        dirtyFonts = false;
        renderDoc(s.doc, c, { size: R, quality: 'preview', assets });
        const err = getEngineError();
        if (err) setFxError(err);
      }
      drawOverlay();
    };
    const schedule = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(draw);
    };
    const unsub = subscribe(schedule);
    const unfont = onFontLoad(() => {
      dirtyFonts = true;
      schedule();
    });
    schedule();
    return () => {
      unsub();
      unfont();
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [css]);

  useEffect(() => {
    drawOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guides]);

  function drawOverlay() {
    const o = overlayRef.current;
    if (!o) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const S = sizeRef.current;
    if (o.width !== Math.round(S * dpr)) {
      o.width = Math.round(S * dpr);
      o.height = Math.round(S * dpr);
    }
    const x = o.getContext('2d')!;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, o.width, o.height);
    const k = (S * dpr) / 1000;
    x.setTransform(k, 0, 0, k, 0, 0);
    const u = 1000 / S; // doc units per css px
    const st = getState();
    const guides = guidesRef.current;
    if (guides.v || guides.h) {
      x.strokeStyle = '#ff3ea5';
      x.lineWidth = u;
      x.setLineDash([6 * u, 4 * u]);
      if (guides.v) { x.beginPath(); x.moveTo(500, 0); x.lineTo(500, 1000); x.stroke(); }
      if (guides.h) { x.beginPath(); x.moveTo(0, 500); x.lineTo(1000, 500); x.stroke(); }
      x.setLineDash([]);
    }
    const l = st.doc.layers.find((q) => q.id === st.selected);
    if (!l || l.hidden || st.tool === 'draw') return;
    const f = frame(l, 26 * u);
    x.lineWidth = 1.5 * u;
    x.strokeStyle = 'rgba(0,0,0,0.6)';
    x.beginPath();
    f.corners.forEach(([cx, cy], i) => (i ? x.lineTo(cx, cy) : x.moveTo(cx, cy)));
    x.closePath();
    x.lineWidth = 3 * u;
    x.stroke();
    x.strokeStyle = '#ffffff';
    x.lineWidth = 1.2 * u;
    x.stroke();
    if (l.locked) return;
    x.beginPath();
    x.moveTo(f.top[0], f.top[1]);
    x.lineTo(f.rot[0], f.rot[1]);
    x.stroke();
    const knob = (px: number, py: number, round: boolean) => {
      x.beginPath();
      if (round) x.arc(px, py, 7 * u, 0, Math.PI * 2);
      else x.rect(px - 6 * u, py - 6 * u, 12 * u, 12 * u);
      x.fillStyle = '#ffffff';
      x.fill();
      x.strokeStyle = '#ff3ea5';
      x.lineWidth = 2 * u;
      x.stroke();
    };
    f.corners.forEach(([cx, cy]) => knob(cx, cy, false));
    knob(f.rot[0], f.rot[1], true);
  }

  const toDocPt = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 1000, ((e.clientY - r.top) / r.height) * 1000];
  };

  function startDraw(px: number, py: number) {
    const st = getState();
    let target = st.doc.layers.find((l) => l.id === st.selected && l.kind === 'draw') as DrawLayer | undefined;
    if (!target) {
      target = newDraw();
      addLayer(target, true);
    }
    const [lx, ly] = toLocal(target, px, py);
    const stroke: Stroke = { ...st.brush, seed: randSeed(), pts: [lx + 500, ly + 500] };
    updateLayer<DrawLayer>(target.id, (l) => ({ strokes: [...l.strokes, stroke] }), false);
    dragRef.current = { kind: 'draw', id: target.id };
  }

  function onPointerDown(e: React.PointerEvent) {
    const el = overlayRef.current!;
    el.setPointerCapture(e.pointerId);
    const [px, py] = toDocPt(e);
    pointers.current.set(e.pointerId, { x: px, y: py });
    const st = getState();

    if (st.tool === 'draw') {
      if (pointers.current.size === 1) startDraw(px, py);
      return;
    }

    const sel = st.doc.layers.find((l) => l.id === st.selected) ?? null;
    if (pointers.current.size === 2 && sel && !sel.locked) {
      const [a, b] = [...pointers.current.values()];
      dragRef.current = {
        kind: 'pinch', id: sel.id, d0: Math.hypot(b.x - a.x, b.y - a.y), a0: Math.atan2(b.y - a.y, b.x - a.x),
        s0: sel.scale, r0: sel.rot, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, lx: sel.x, ly: sel.y,
      };
      return;
    }
    const u = 1000 / sizeRef.current;
    const tol = (e.pointerType === 'touch' ? 20 : 12) * u;
    if (sel && !sel.locked && !sel.hidden) {
      const f = frame(sel, 26 * u);
      if (Math.hypot(px - f.rot[0], py - f.rot[1]) < tol) {
        dragRef.current = { kind: 'rotate', id: sel.id, cx: f.center[0], cy: f.center[1], a0: Math.atan2(py - f.center[1], px - f.center[0]), r0: sel.rot };
        return;
      }
      for (const [cx, cy] of f.corners) {
        if (Math.hypot(px - cx, py - cy) < tol) {
          dragRef.current = { kind: 'scale', id: sel.id, cx: sel.x, cy: sel.y, d0: Math.hypot(px - sel.x, py - sel.y) || 1, s0: sel.scale };
          return;
        }
      }
    }
    const hit = hitLayer(st.doc.layers, px, py);
    // keep the current selection when clicking inside it, even if something is above
    const keep = sel && !sel.locked && !sel.hidden && (() => {
      const b = layerBox(sel);
      const [lx, ly] = toLocal(sel, px, py);
      return Math.abs(lx - b.cx) <= b.w / 2 && Math.abs(ly - b.cy) <= b.h / 2;
    })();
    const target = keep ? sel : hit;
    if (!target) {
      setState({ selected: null });
      return;
    }
    if (target.id !== st.selected) {
      const panel = st.panel === 'fx' ? 'fx' : 'layer';
      setState({ selected: target.id, panel });
    }
    dragRef.current = { kind: 'move', id: target.id, sx: px, sy: py, lx: target.x, ly: target.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    const [px, py] = toDocPt(e);
    pointers.current.set(e.pointerId, { x: px, y: py });
    const d = dragRef.current;
    if (!d) return;
    const shift = e.shiftKey;
    if (d.kind === 'draw') {
      const l = getState().doc.layers.find((q) => q.id === d.id);
      if (!l) return;
      const [lx, ly] = toLocal(l, px, py);
      updateLayer<DrawLayer>(d.id, (dl) => {
        const strokes = dl.strokes.slice();
        const last = strokes[strokes.length - 1];
        strokes[strokes.length - 1] = { ...last, pts: [...last.pts, lx + 500, ly + 500] };
        return { strokes };
      }, false);
      return;
    }
    if (d.kind === 'move') {
      let x = d.lx + (px - d.sx);
      let y = d.ly + (py - d.sy);
      const snap = 8 * (1000 / sizeRef.current);
      const v = !shift && Math.abs(x - 500) < snap;
      const h = !shift && Math.abs(y - 500) < snap;
      if (v) x = 500;
      if (h) y = 500;
      if (v !== guidesRef.current.v || h !== guidesRef.current.h) setGuides({ v, h });
      updateLayer(d.id, { x, y }, false);
    } else if (d.kind === 'scale') {
      const s = Math.max(0.03, (d.s0 * Math.hypot(px - d.cx, py - d.cy)) / d.d0);
      updateLayer(d.id, { scale: s }, false);
    } else if (d.kind === 'rotate') {
      let r = d.r0 + deg(Math.atan2(py - d.cy, px - d.cx) - d.a0);
      r = ((r + 540) % 360) - 180;
      if (!shift) for (const t of [-180, -135, -90, -45, 0, 45, 90, 135, 180]) if (Math.abs(r - t) < 4) r = t;
      updateLayer(d.id, { rot: r }, false);
    } else if (d.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      updateLayer(d.id, {
        scale: Math.max(0.03, (d.s0 * dist) / d.d0),
        rot: d.r0 + deg(ang - d.a0),
        x: d.lx + (mx - d.mx),
        y: d.ly + (my - d.my),
      }, false);
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      dragRef.current = null;
      if (guidesRef.current.v || guidesRef.current.h) setGuides({ v: false, h: false });
      commit();
    } else if (dragRef.current?.kind === 'pinch') {
      // one finger lifted: continue as a move with the remaining finger
      const [p] = [...pointers.current.values()];
      const l = getState().doc.layers.find((q) => q.id === dragRef.current!.id);
      if (l) dragRef.current = { kind: 'move', id: l.id, sx: p.x, sy: p.y, lx: l.x, ly: l.y };
    }
  }

  function onDoubleClick(e: React.MouseEvent) {
    const [px, py] = toDocPt(e);
    const hit = hitLayer(getState().doc.layers, px, py);
    if (hit?.kind === 'text') {
      setState({ selected: hit.id, panel: 'layer' });
      setTimeout(() => document.getElementById('layer-text')?.focus(), 30);
    }
  }

  return (
    <div className="stage-wrap" ref={wrapRef}>
      <div className="stage" style={{ width: css, height: css }}>
        <canvas ref={canvasRef} className="stage-canvas" style={{ width: css, height: css }} aria-label="Cover preview" />
        <canvas
          ref={overlayRef}
          className={'stage-overlay' + (tool === 'draw' ? ' drawing' : '')}
          style={{ width: css, height: css }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
        />
        {fxError && <div className="stage-error" role="status">{fxError}</div>}
      </div>
    </div>
  );
}
