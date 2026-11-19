import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { BRAND } from '../config';
import { Icon } from '../components/Icon';
import { LogoMark } from '../components/Logo';
import { Reveal, StatusBadge } from '../components/ui';
import './menu-showcase.css';

/* ===================================================================== */
/* Settings model                                                         */
/* ===================================================================== */

type TabKey = 'visuals' | 'aimbot' | 'misc' | 'config';
type Bone = 'head' | 'neck' | 'chest';
type BoxStyle = 'full' | 'corner';
type CrossStyle = 'cross' | 'dot' | 'circle';
type SwatchKey = 'ice' | 'violet' | 'toxic' | 'amber' | 'rose' | 'white';
type PresetKey = 'legit' | 'rage' | 'streamer';

interface Settings {
  box: boolean;
  boxStyle: BoxStyle;
  skeleton: boolean;
  chams: boolean;
  health: boolean;
  names: boolean;
  distance: boolean;
  snaplines: boolean;
  color: SwatchKey;
  maxDist: number;
  aimbot: boolean;
  drawFov: boolean;
  fov: number;
  smooth: number;
  bone: Bone;
  visibleOnly: boolean;
  crosshair: boolean;
  crossStyle: CrossStyle;
  radar: boolean;
  watermark: boolean;
  streamProof: boolean;
}

type Setter = <K extends keyof Settings>(key: K, value: Settings[K]) => void;

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'visuals', label: 'Visuals', icon: 'eye' },
  { key: 'aimbot', label: 'Aimbot', icon: 'crosshair' },
  { key: 'misc', label: 'Misc', icon: 'sliders' },
  { key: 'config', label: 'Config', icon: 'layers' },
];

const SWATCHES: { key: SwatchKey; label: string; css: string }[] = [
  { key: 'ice', label: 'Ice', css: 'var(--accent)' },
  { key: 'violet', label: 'Violet', css: 'var(--violet)' },
  { key: 'toxic', label: 'Toxic', css: 'var(--ok)' },
  { key: 'amber', label: 'Amber', css: 'var(--warn)' },
  { key: 'rose', label: 'Rose', css: 'var(--bad)' },
  { key: 'white', label: 'White', css: '#ffffff' },
];

const BONE_LABEL: Record<Bone, string> = { head: 'Head', neck: 'Neck', chest: 'Chest' };

const BASE: Settings = {
  box: true,
  boxStyle: 'corner',
  skeleton: true,
  chams: false,
  health: true,
  names: false,
  distance: true,
  snaplines: false,
  color: 'ice',
  maxDist: 250,
  aimbot: true,
  drawFov: true,
  fov: 60,
  smooth: 70,
  bone: 'chest',
  visibleOnly: true,
  crosshair: true,
  crossStyle: 'cross',
  radar: true,
  watermark: true,
  streamProof: false,
};

const PRESETS: Record<
  PresetKey,
  { label: string; icon: string; tag: string; blurb: string; chips: string[]; values: Partial<Settings> }
> = {
  legit: {
    label: 'Legit',
    icon: 'shield-check',
    tag: 'LGT',
    blurb: 'Corner boxes, chest aim, tight FOV. Reads like good game sense.',
    chips: ['FOV 60°', 'Chest', '70% smooth'],
    values: {
      box: true,
      boxStyle: 'corner',
      skeleton: true,
      chams: false,
      health: true,
      names: false,
      distance: true,
      snaplines: false,
      color: 'ice',
      aimbot: true,
      drawFov: true,
      fov: 60,
      smooth: 70,
      bone: 'chest',
      visibleOnly: true,
      watermark: true,
      streamProof: false,
    },
  },
  rage: {
    label: 'Rage',
    icon: 'flame',
    tag: 'RGE',
    blurb: 'Every visual on, head aim, wide FOV. Maximum information.',
    chips: ['FOV 160°', 'Head', 'Chams'],
    values: {
      box: true,
      boxStyle: 'full',
      skeleton: true,
      chams: true,
      health: true,
      names: true,
      distance: true,
      snaplines: true,
      color: 'rose',
      aimbot: true,
      drawFov: true,
      fov: 160,
      smooth: 12,
      bone: 'head',
      visibleOnly: false,
      watermark: true,
      streamProof: false,
    },
  },
  streamer: {
    label: 'Streamer',
    icon: 'monitor',
    tag: 'STR',
    blurb: 'Hidden from OBS and Discord capture, minimal on-screen visuals.',
    chips: ['Stream-proof', 'Neck', 'No FOV ring'],
    values: {
      box: true,
      boxStyle: 'corner',
      skeleton: false,
      chams: false,
      health: true,
      names: true,
      distance: false,
      snaplines: false,
      color: 'violet',
      aimbot: true,
      drawFov: false,
      fov: 45,
      smooth: 85,
      bone: 'neck',
      visibleOnly: true,
      watermark: false,
      streamProof: true,
    },
  },
};
const PRESET_KEYS: PresetKey[] = ['legit', 'rage', 'streamer'];

function shareCode(s: Settings, preset: PresetKey) {
  const str = JSON.stringify(s);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const suffix = (h >>> 0).toString(36).toUpperCase().slice(-4).padStart(4, '0');
  return `${BRAND.keyPrefix}-${PRESETS[preset].tag}-${suffix}`;
}

/* ===================================================================== */
/* Scene geometry (viewBox units)                                         */
/* ===================================================================== */

const VW = 420;
const VH = 400;
const CX = 210;
const CY = 200;
const VP = { x: 210, y: 150 };

interface Pt {
  x: number;
  y: number;
}

type JointKey =
  | 'head'
  | 'neck'
  | 'chest'
  | 'pelvis'
  | 'sL'
  | 'sR'
  | 'eL'
  | 'eR'
  | 'hL'
  | 'hR'
  | 'hipL'
  | 'hipR'
  | 'kL'
  | 'kR'
  | 'fL'
  | 'fR';
type Joints = Record<JointKey, Pt>;

interface Enemy {
  id: 'a' | 'b';
  name: string;
  hp: number;
  dist: number;
  h: number;
  foot: Pt;
  j: Joints;
  headR: number;
  occluded: boolean;
}

const BONES: [JointKey, JointKey][] = [
  ['neck', 'chest'],
  ['chest', 'pelvis'],
  ['neck', 'sL'],
  ['neck', 'sR'],
  ['sL', 'eL'],
  ['eL', 'hL'],
  ['sR', 'eR'],
  ['eR', 'hR'],
  ['pelvis', 'hipL'],
  ['pelvis', 'hipR'],
  ['hipL', 'kL'],
  ['kL', 'fL'],
  ['hipR', 'kR'],
  ['kR', 'fR'],
];
const DOT_JOINTS: JointKey[] = ['neck', 'chest', 'pelvis', 'sL', 'sR', 'eL', 'eR', 'hL', 'hR', 'kL', 'kR', 'fL', 'fR'];

/** Build a humanoid pose. Local units are fractions of standing height, y up = negative. */
function makePose(
  foot: Pt,
  h: number,
  o: { phase: number; stride: number; lean: number; breathe: number },
): Joints {
  const { phase, stride, lean, breathe } = o;
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const up = Math.abs(s) * stride * 0.3 + breathe * 0.005;
  const liftL = Math.max(0, c) * stride * 0.7;
  const liftR = Math.max(0, -c) * stride * 0.7;
  const sway = Math.sin(phase * 0.5) * 0.006 + breathe * 0.004;
  const P = (lx: number, ly: number): Pt => ({ x: foot.x + lx * h, y: foot.y + ly * h });
  const L = (k: number) => lean * k;

  const hipL = P(-0.062 + L(0.25), -0.5 - up);
  const hipR = P(0.062 + L(0.25), -0.5 - up);
  const fL = P(-0.078 - stride * s, -liftL);
  const fR = P(0.078 + stride * s, -liftR);
  const knee = (hip: Pt, f: Pt, dir: -1 | 1, lift: number): Pt => ({
    x: (hip.x + f.x) / 2 + dir * (0.012 + lift * 0.7) * h,
    y: (hip.y + f.y) / 2 - lift * 0.15 * h,
  });

  return {
    head: P(L(1), -0.9 - up),
    neck: P(L(0.82), -0.818 - up),
    chest: P(L(0.62), -0.715 - up),
    pelvis: P(L(0.25), -0.5 - up),
    sL: P(-0.112 + L(0.75), -0.795 - up),
    sR: P(0.112 + L(0.75), -0.795 - up),
    eL: P(-0.145 + L(0.6), -0.645 - up + sway),
    eR: P(0.152 + L(0.6), -0.655 - up - sway),
    hL: P(-0.03 + L(0.55), -0.6 - up + sway),
    hR: P(0.07 + L(0.55), -0.585 - up - sway),
    hipL,
    hipR,
    kL: knee(hipL, fL, -1, liftL),
    kR: knee(hipR, fR, 1, liftR),
    fL,
    fR,
  };
}

function computeScene(t: number): Enemy[] {
  const ax = 186 + 34 * Math.sin(t * 0.85);
  const speed = Math.min(1, Math.abs(Math.cos(t * 0.85)) * 1.5);
  const aFoot = { x: ax, y: 344 };
  const aH = 158;
  const bFoot = { x: 306 + 2.5 * Math.sin(t * 0.6), y: 236 };
  const bH = 70;
  return [
    {
      id: 'a',
      name: 'kairo_',
      hp: 100,
      dist: 38,
      h: aH,
      foot: aFoot,
      headR: aH * 0.06,
      occluded: false,
      j: makePose(aFoot, aH, { phase: t * 5.4, stride: 0.05 * speed, lean: 0, breathe: Math.sin(t * 2.1) }),
    },
    {
      id: 'b',
      name: 'm1stral',
      hp: 64,
      dist: 112,
      h: bH,
      foot: bFoot,
      headR: bH * 0.06,
      occluded: true,
      j: makePose(bFoot, bH, { phase: 0, stride: 0, lean: 0.05 * Math.sin(t * 0.7), breathe: Math.sin(t * 1.8 + 1) }),
    },
  ];
}

const fovRadius = (fov: number) => 12 + fov * 0.9;

function boxOf(e: Enemy) {
  const top = e.j.head.y - e.headR - e.h * 0.035;
  const bottom = e.foot.y + e.h * 0.015;
  const w = e.h * 0.46;
  const cx = e.j.pelvis.x;
  return { top, bottom, left: cx - w / 2, right: cx + w / 2, cx };
}

interface Target {
  e: Enemy;
  pt: Pt;
}

function pickTarget(enemies: Enemy[], s: Settings): Target | null {
  if (!s.aimbot) return null;
  const r = fovRadius(s.fov);
  let best: Target | null = null;
  let bestD = Infinity;
  for (const e of enemies) {
    if (s.visibleOnly && e.occluded) continue;
    const p = e.j[s.bone];
    const d = Math.hypot(p.x - CX, p.y - CY);
    if (d <= r && d < bestD) {
      best = { e, pt: p };
      bestD = d;
    }
  }
  return best;
}

const swatchCss = (k: SwatchKey) => SWATCHES.find((w) => w.key === k)?.css ?? 'var(--accent)';
const hpColor = (hp: number) => (hp >= 70 ? 'var(--ok)' : hp >= 35 ? 'var(--warn)' : 'var(--bad)');
const f = (n: number) => Math.round(n * 10) / 10;

/* ===================================================================== */
/* Hooks                                                                  */
/* ===================================================================== */

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

function useInView<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver((entries) => setInView(entries.some((x) => x.isIntersecting)), {
      rootMargin: '120px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

/** Arrow-key navigation for a radio group with a roving tabindex. */
function useRoving<T extends string>(values: readonly T[], value: T, onChange: (v: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const i = values.indexOf(value);
    let n = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % values.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + values.length) % values.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = values.length - 1;
    if (n < 0) return;
    e.preventDefault();
    onChange(values[n]);
    refs.current[n]?.focus();
  };
  return { refs, onKeyDown };
}

/* ===================================================================== */
/* Controls                                                               */
/* ===================================================================== */

function ToggleRow({
  label,
  checked,
  onChange,
  wide,
  dim,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  wide?: boolean;
  dim?: boolean;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={`menu-row${checked ? ' is-on' : ''}${wide ? ' is-wide' : ''}${dim ? ' is-dim' : ''}`}>
      <label htmlFor={id} className="menu-row-label">
        {label}
      </label>
      {children}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className="switch menu-switch"
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

function KeyRow({ label, keyName }: { label: string; keyName: string }) {
  return (
    <div className="menu-row">
      <span className="menu-row-label is-static">{label}</span>
      <kbd className="menu-kbd">{keyName}</kbd>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  dim,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
  dim?: boolean;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={`menu-slider is-wide${dim ? ' is-dim' : ''}`}>
      <div className="menu-slider-head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="menu-slider-val">
          {value}
          <span>{unit}</span>
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="menu-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--p' as string]: `${pct}%` } as CSSProperties}
      />
    </div>
  );
}

function Seg<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: ReactNode; title: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { refs, onKeyDown } = useRoving(
    options.map((o) => o.value),
    value,
    onChange,
  );
  return (
    <div className="menu-seg" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.title}
            title={o.title}
            tabIndex={on ? 0 : -1}
            className={on ? 'is-active' : undefined}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Swatches({ value, onChange }: { value: SwatchKey; onChange: (v: SwatchKey) => void }) {
  const labelId = useId();
  const { refs, onKeyDown } = useRoving(
    SWATCHES.map((s) => s.key),
    value,
    onChange,
  );
  return (
    <div className="menu-row is-wide">
      <span className="menu-row-label is-static" id={labelId}>
        Colour
      </span>
      <div className="menu-swatches" role="radiogroup" aria-labelledby={labelId} onKeyDown={onKeyDown}>
        {SWATCHES.map((s, i) => {
          const on = s.key === value;
          return (
            <button
              key={s.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={s.label}
              title={s.label}
              tabIndex={on ? 0 : -1}
              className={`menu-swatch${on ? ' is-active' : ''}`}
              style={{ ['--sw' as string]: s.css } as CSSProperties}
              onClick={() => onChange(s.key)}
            />
          );
        })}
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="menu-group">
      <div className="menu-group-label">{label}</div>
      <div className="menu-list">{children}</div>
    </div>
  );
}

const CrossGlyph = ({ kind }: { kind: CrossStyle }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    {kind === 'cross' && <path d="M7 1v4M7 9v4M1 7h4M9 7h4" strokeLinecap="round" />}
    {kind === 'dot' && <circle cx="7" cy="7" r="2" fill="currentColor" stroke="none" />}
    {kind === 'circle' && (
      <>
        <circle cx="7" cy="7" r="5" />
        <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
      </>
    )}
  </svg>
);

function VisualsPanel({ s, set }: { s: Settings; set: Setter }) {
  return (
    <>
      <Group label="Player ESP">
        <ToggleRow label="Box ESP" checked={s.box} onChange={(v) => set('box', v)} wide>
          <Seg
            label="Box style"
            value={s.boxStyle}
            onChange={(v) => set('boxStyle', v)}
            options={[
              { value: 'full', label: '2D', title: 'Full 2D box' },
              { value: 'corner', label: 'Corner', title: 'Corner box' },
            ]}
          />
        </ToggleRow>
        <ToggleRow label="Skeleton" checked={s.skeleton} onChange={(v) => set('skeleton', v)} />
        <ToggleRow label="Chams" checked={s.chams} onChange={(v) => set('chams', v)} />
        <ToggleRow label="Health bar" checked={s.health} onChange={(v) => set('health', v)} />
        <ToggleRow label="Name tag" checked={s.names} onChange={(v) => set('names', v)} />
        <ToggleRow label="Distance" checked={s.distance} onChange={(v) => set('distance', v)} />
        <ToggleRow label="Snaplines" checked={s.snaplines} onChange={(v) => set('snaplines', v)} />
      </Group>
      <Group label="Style">
        <Swatches value={s.color} onChange={(v) => set('color', v)} />
        <SliderRow
          label="Max distance"
          value={s.maxDist}
          min={25}
          max={300}
          step={5}
          unit="m"
          onChange={(v) => set('maxDist', v)}
        />
      </Group>
    </>
  );
}

function AimbotPanel({ s, set }: { s: Settings; set: Setter }) {
  const boneId = useId();
  const off = !s.aimbot;
  return (
    <>
      <Group label="Aim assist">
        <ToggleRow label="Enable aimbot" checked={s.aimbot} onChange={(v) => set('aimbot', v)} />
        <KeyRow label="Aim key" keyName="MOUSE 5" />
        <ToggleRow label="Visible only" checked={s.visibleOnly} onChange={(v) => set('visibleOnly', v)} dim={off} />
        <ToggleRow label="Draw FOV" checked={s.drawFov} onChange={(v) => set('drawFov', v)} dim={off} />
      </Group>
      <Group label="Tuning">
        <SliderRow label="FOV" value={s.fov} min={20} max={180} unit="°" onChange={(v) => set('fov', v)} dim={off} />
        <SliderRow
          label="Smoothing"
          value={s.smooth}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => set('smooth', v)}
          dim={off}
        />
        <div className={`menu-row is-wide${off ? ' is-dim' : ''}`}>
          <label htmlFor={boneId} className="menu-row-label">
            Target bone
          </label>
          <select
            id={boneId}
            className="select menu-select"
            value={s.bone}
            onChange={(e) => set('bone', e.target.value as Bone)}
          >
            <option value="head">Head</option>
            <option value="neck">Neck</option>
            <option value="chest">Chest</option>
          </select>
        </div>
      </Group>
    </>
  );
}

function MiscPanel({ s, set }: { s: Settings; set: Setter }) {
  return (
    <>
      <Group label="Overlay">
        <ToggleRow label="Crosshair" checked={s.crosshair} onChange={(v) => set('crosshair', v)} wide>
          <Seg
            label="Crosshair style"
            value={s.crossStyle}
            onChange={(v) => set('crossStyle', v)}
            options={[
              { value: 'cross', label: <CrossGlyph kind="cross" />, title: 'Cross' },
              { value: 'dot', label: <CrossGlyph kind="dot" />, title: 'Dot' },
              { value: 'circle', label: <CrossGlyph kind="circle" />, title: 'Circle' },
            ]}
          />
        </ToggleRow>
        <ToggleRow label="Radar" checked={s.radar} onChange={(v) => set('radar', v)} />
        <ToggleRow label="Watermark" checked={s.watermark} onChange={(v) => set('watermark', v)} />
      </Group>
      <Group label="Safety">
        <ToggleRow label="Stream-proof" checked={s.streamProof} onChange={(v) => set('streamProof', v)} />
        <KeyRow label="Menu key" keyName="INSERT" />
      </Group>
      <p className="menu-note">
        <Icon name="info" size={14} />
        Stream-proof keeps every overlay out of OBS, Discord and screenshot capture.
      </p>
    </>
  );
}

function ConfigPanel({
  s,
  preset,
  dirty,
  onPreset,
}: {
  s: Settings;
  preset: PresetKey;
  dirty: boolean;
  onPreset: (k: PresetKey) => void;
}) {
  const labelId = useId();
  const { refs, onKeyDown } = useRoving(PRESET_KEYS, preset, onPreset);
  const [copied, setCopied] = useState(false);
  const code = shareCode(s, preset);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);
  const copy = () => {
    try {
      navigator.clipboard?.writeText(code).catch(() => undefined);
    } catch {
      /* clipboard unavailable: still show feedback */
    }
    setCopied(true);
  };
  return (
    <>
      <div className="menu-group">
        <div className="menu-group-label" id={labelId}>
          Presets
        </div>
        <div className="menu-presets" role="radiogroup" aria-labelledby={labelId} onKeyDown={onKeyDown}>
          {PRESET_KEYS.map((k, i) => {
            const p = PRESETS[k];
            const on = k === preset;
            return (
              <button
                key={k}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                className={`menu-preset${on ? ' is-active' : ''}`}
                onClick={() => onPreset(k)}
              >
                <span className="menu-preset-icon">
                  <Icon name={p.icon} size={16} />
                </span>
                <span className="menu-preset-body">
                  <span className="menu-preset-name">
                    {p.label}
                    {on && dirty && <span className="menu-preset-edited">edited</span>}
                  </span>
                  <span className="menu-preset-blurb">{p.blurb}</span>
                </span>
                <span className="menu-preset-check" aria-hidden="true">
                  <Icon name="check" size={12} strokeWidth={2.6} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="menu-group">
        <div className="menu-group-label">Share</div>
        <div className="menu-share">
          <span className="menu-share-code" aria-label="Config share code">
            {code}
          </span>
          <button type="button" className={`menu-share-btn${copied ? ' is-done' : ''}`} onClick={copy}>
            <Icon name={copied ? 'check' : 'copy'} size={14} />
            {copied ? 'Copied' : 'Copy'}
          </button>
          <span className="sr-only" aria-live="polite">
            {copied ? 'Share code copied' : ''}
          </span>
        </div>
      </div>
    </>
  );
}

/* ===================================================================== */
/* Preview: static backdrop                                               */
/* ===================================================================== */

const SKYLINE: [number, number, number][] = [
  [0, 34, 26], [30, 26, 40], [52, 22, 18], [70, 40, 52], [106, 24, 22], [126, 30, 34], [152, 16, 14],
  [166, 36, 28], [200, 22, 46], [218, 30, 20], [244, 26, 36], [266, 46, 30], [308, 28, 50], [332, 24, 22],
  [352, 38, 38], [386, 34, 24],
];
const GRID_Z = [1, 1.3, 1.7, 2.2, 2.9, 3.8, 5, 6.6, 8.7, 11.5];

function recede(p: Pt, k: number): Pt {
  return { x: p.x + (VP.x - p.x) * k, y: p.y + (VP.y - p.y) * k };
}

function Crate({ x1, y1, x2, y2, depth, uid }: { x1: number; y1: number; x2: number; y2: number; depth: number; uid: string }) {
  const tl = { x: x1, y: y1 };
  const tr = { x: x2, y: y1 };
  const bl = { x: x1, y: y2 };
  const br = { x: x2, y: y2 };
  const btl = recede(tl, depth);
  const btr = recede(tr, depth);
  const bbl = recede(bl, depth);
  const bbr = recede(br, depth);
  const pts = (...p: Pt[]) => p.map((q) => `${f(q.x)},${f(q.y)}`).join(' ');
  const side = x2 < VP.x ? pts(tr, br, bbr, btr) : pts(tl, bl, bbl, btl);
  const w = x2 - x1;
  const hgt = y2 - y1;
  const inset = Math.min(w, hgt) * 0.12;
  return (
    <g>
      <polygon points={side} fill={`url(#${uid}-crate-side)`} stroke="rgb(255 255 255 / 0.06)" strokeWidth="0.8" />
      <polygon points={pts(tl, tr, btr, btl)} fill={`url(#${uid}-crate-top)`} stroke="rgb(255 255 255 / 0.1)" strokeWidth="0.8" />
      <rect x={x1} y={y1} width={w} height={hgt} fill={`url(#${uid}-crate-front)`} stroke="rgb(255 255 255 / 0.08)" strokeWidth="0.8" />
      <rect
        x={x1 + inset}
        y={y1 + inset}
        width={w - inset * 2}
        height={hgt - inset * 2}
        fill="none"
        stroke="rgb(255 255 255 / 0.05)"
        strokeWidth="0.8"
      />
      <path
        d={`M${x1 + inset} ${y2 - inset}L${x2 - inset} ${y1 + inset}`}
        stroke="rgb(255 255 255 / 0.045)"
        strokeWidth="1.4"
      />
      <line x1={x1} y1={y1 + 0.5} x2={x2} y2={y1 + 0.5} stroke="rgb(255 255 255 / 0.18)" strokeWidth="0.8" />
    </g>
  );
}

const Backdrop = memo(function Backdrop({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05070b" />
          <stop offset="1" stopColor="#0e1420" />
        </linearGradient>
        <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c111a" />
          <stop offset="1" stopColor="#06080c" />
        </linearGradient>
        <radialGradient id={`${uid}-haze`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-gridfade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={`${uid}-gridmask`}>
          <rect x="0" y={VP.y} width={VW} height={VH - VP.y} fill={`url(#${uid}-gridfade)`} />
        </mask>
        <linearGradient id={`${uid}-crate-front`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2230" />
          <stop offset="1" stopColor="#10141d" />
        </linearGradient>
        <linearGradient id={`${uid}-crate-top`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#263043" />
          <stop offset="1" stopColor="#1a2130" />
        </linearGradient>
        <linearGradient id={`${uid}-crate-side`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0d1118" />
          <stop offset="1" stopColor="#121824" />
        </linearGradient>
        <linearGradient id={`${uid}-torso`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a4459" />
          <stop offset="1" stopColor="#252c3b" />
        </linearGradient>
        <radialGradient id={`${uid}-vignette`} cx="0.5" cy="0.5" r="0.72">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
        <radialGradient id={`${uid}-shadow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.7" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${uid}-chams`} x="-60%" y="-30%" width="220%" height="160%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Sky + skyline */}
      <rect width={VW} height={VP.y + 1} fill={`url(#${uid}-sky)`} />
      <ellipse cx={VP.x} cy={VP.y} rx="240" ry="70" fill={`url(#${uid}-haze)`} />
      <g fill="#0b1018">
        {SKYLINE.map(([x, w, h]) => (
          <rect key={x} x={x} y={VP.y - h} width={w} height={h} />
        ))}
      </g>
      <g fill="var(--accent)" opacity="0.35">
        {SKYLINE.filter((_, i) => i % 2 === 0).map(([x, w, h], i) => (
          <rect key={x} x={x + w * 0.3} y={VP.y - h + 6 + (i % 3) * 5} width="1.6" height="1.6" />
        ))}
      </g>

      {/* Floor + perspective grid */}
      <rect y={VP.y} width={VW} height={VH - VP.y} fill={`url(#${uid}-floor)`} />
      <g mask={`url(#${uid}-gridmask)`} stroke="var(--accent)" strokeOpacity="0.2" strokeWidth="0.7">
        {Array.from({ length: 25 }, (_, i) => -630 + i * 70).map((x) => (
          <line key={x} x1={VP.x} y1={VP.y} x2={x} y2={VH} />
        ))}
        {GRID_Z.map((z) => {
          const y = VP.y + 250 / z;
          return <line key={z} x1="0" y1={f(y)} x2={VW} y2={f(y)} />;
        })}
      </g>
      <line x1="0" y1={VP.y} x2={VW} y2={VP.y} stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="0.8" />

      {/* Foreground cover (left) */}
      <ellipse cx="80" cy="340" rx="80" ry="10" fill={`url(#${uid}-shadow)`} />
      <Crate uid={uid} x1={18} y1={258} x2={126} y2={338} depth={0.14} />
      <Crate uid={uid} x1={40} y1={214} x2={94} y2={252} depth={0.1} />
    </>
  );
});

/* ===================================================================== */
/* Preview: figures & ESP                                                 */
/* ===================================================================== */

function Figure({
  e,
  uid,
  color,
  opacity = 1,
  glow = false,
}: {
  e: Enemy;
  uid: string;
  color?: string;
  opacity?: number;
  glow?: boolean;
}) {
  const { j, h } = e;
  const limb = (...p: Pt[]) => 'M' + p.map((q) => `${f(q.x)} ${f(q.y)}`).join('L');
  const lw = h * 0.07;
  const torsoPts = [
    { x: j.sL.x - h * 0.02, y: j.sL.y - h * 0.008 },
    { x: j.sR.x + h * 0.02, y: j.sR.y - h * 0.008 },
    { x: j.hipR.x + h * 0.022, y: j.hipR.y + h * 0.03 },
    { x: j.hipL.x - h * 0.022, y: j.hipL.y + h * 0.03 },
  ]
    .map((p) => `${f(p.x)},${f(p.y)}`)
    .join(' ');
  const gunA = { x: j.hL.x - h * 0.07, y: j.hL.y + h * 0.012 };
  const gunB = { x: j.hR.x + h * 0.16, y: j.hR.y - h * 0.006 };
  const boot = (p: Pt, dir: -1 | 1) => limb({ x: p.x - dir * h * 0.008, y: p.y - h * 0.006 }, { x: p.x + dir * h * 0.03, y: p.y - h * 0.004 });

  const shapes = (c: { leg: string; limb: string; torso: string; head: string; edge: string }) => (
    <>
      <path d={limb(j.hipL, j.kL, j.fL)} stroke={c.leg} strokeWidth={lw * 1.12} fill="none" />
      <path d={limb(j.hipR, j.kR, j.fR)} stroke={c.leg} strokeWidth={lw * 1.12} fill="none" />
      <path d={boot(j.fL, -1)} stroke={c.leg} strokeWidth={lw * 0.95} fill="none" />
      <path d={boot(j.fR, 1)} stroke={c.leg} strokeWidth={lw * 0.95} fill="none" />
      <polygon points={torsoPts} fill={c.torso} stroke={c.edge} strokeWidth={lw * 0.75} />
      <path d={limb(j.neck, j.head)} stroke={c.limb} strokeWidth={lw * 0.75} fill="none" />
      <path d={limb(j.sL, j.eL, j.hL)} stroke={c.limb} strokeWidth={lw * 0.88} fill="none" />
      <path d={limb(j.sR, j.eR, j.hR)} stroke={c.limb} strokeWidth={lw * 0.88} fill="none" />
      <circle cx={f(j.head.x)} cy={f(j.head.y)} r={e.headR} fill={c.head} />
    </>
  );

  if (color) {
    return (
      <g opacity={opacity} filter={glow ? `url(#${uid}-chams)` : undefined} strokeLinecap="round" strokeLinejoin="round">
        {shapes({ leg: color, limb: color, torso: color, head: color, edge: color })}
      </g>
    );
  }
  const rim = '#5a6684';
  return (
    <g opacity={opacity} strokeLinecap="round" strokeLinejoin="round">
      {/* rim light from the top-left, then the body itself */}
      <g transform={`translate(${f(-h * 0.008)} ${f(-h * 0.008)})`} opacity="0.7">
        {shapes({ leg: rim, limb: rim, torso: rim, head: rim, edge: rim })}
      </g>
      {shapes({ leg: '#1d2433', limb: '#262e40', torso: `url(#${uid}-torso)`, head: '#333c52', edge: '#2a3245' })}
      <path d={limb(j.chest, { x: j.chest.x, y: j.pelvis.y })} stroke="rgb(0 0 0 / 0.25)" strokeWidth={h * 0.006} />
      <path d={limb(gunA, gunB)} stroke="#0b0e14" strokeWidth={lw * 0.6} fill="none" />
      <path d={limb({ x: gunB.x - h * 0.05, y: gunB.y }, gunB)} stroke="#3b4560" strokeWidth={lw * 0.2} fill="none" />
      <rect
        x={f(j.head.x - e.headR * 0.78)}
        y={f(j.head.y - e.headR * 0.2)}
        width={f(e.headR * 1.56)}
        height={f(e.headR * 0.4)}
        rx={f(e.headR * 0.2)}
        fill="#6b7896"
        opacity="0.75"
      />
    </g>
  );
}

function Skeleton({ e, color }: { e: Enemy; color: string }) {
  const { j } = e;
  const sw = Math.max(1, e.h * 0.011);
  const lines = BONES.map(([a, b]) => `M${f(j[a].x)} ${f(j[a].y)}L${f(j[b].x)} ${f(j[b].y)}`).join('');
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d={lines} stroke="rgb(0 0 0 / 0.6)" strokeWidth={sw + 2} fill="none" />
      <circle cx={f(j.head.x)} cy={f(j.head.y)} r={e.headR} stroke="rgb(0 0 0 / 0.6)" strokeWidth={sw + 2} fill="none" />
      <path d={lines} stroke={color} strokeWidth={sw} fill="none" />
      <circle cx={f(j.head.x)} cy={f(j.head.y)} r={e.headR} stroke={color} strokeWidth={sw} fill="none" />
      {DOT_JOINTS.map((k) => (
        <circle key={k} cx={f(j[k].x)} cy={f(j[k].y)} r={sw * 1.25} fill={color} />
      ))}
    </g>
  );
}

function Esp({ e, s, color }: { e: Enemy; s: Settings; color: string }) {
  const { top, bottom, left, right, cx } = boxOf(e);
  const w = right - left;
  const hgt = bottom - top;
  const fs = Math.max(9, e.h * 0.068);
  const len = Math.min(w, hgt) * 0.26;
  const corner =
    `M${f(left)} ${f(top + len)}V${f(top)}H${f(left + len)}` +
    `M${f(right - len)} ${f(top)}H${f(right)}V${f(top + len)}` +
    `M${f(right)} ${f(bottom - len)}V${f(bottom)}H${f(right - len)}` +
    `M${f(left + len)} ${f(bottom)}H${f(left)}V${f(bottom - len)}`;
  const barX = left - 5.5;
  const hpH = (hgt * e.hp) / 100;
  const tagW = e.name.length * fs * 0.62 + 12;
  const tagH = fs + 7;
  return (
    <g>
      {s.box &&
        (s.boxStyle === 'full' ? (
          <>
            <rect x={f(left)} y={f(top)} width={f(w)} height={f(hgt)} fill="none" stroke="rgb(0 0 0 / 0.65)" strokeWidth="3.2" />
            <rect
              x={f(left)}
              y={f(top)}
              width={f(w)}
              height={f(hgt)}
              fill={color}
              fillOpacity="0.05"
              stroke={color}
              strokeWidth="1.3"
            />
          </>
        ) : (
          <>
            <path d={corner} fill="none" stroke="rgb(0 0 0 / 0.65)" strokeWidth="3.6" strokeLinecap="square" />
            <path d={corner} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="square" />
          </>
        ))}
      {s.health && (
        <g>
          <rect x={f(barX - 1)} y={f(top - 1)} width="4.5" height={f(hgt + 2)} rx="1" fill="rgb(0 0 0 / 0.7)" />
          <rect x={f(barX)} y={f(bottom - hpH)} width="2.5" height={f(hpH)} rx="0.5" fill={hpColor(e.hp)} />
          {e.hp < 100 && (
            <text
              x={f(barX - 3)}
              y={f(bottom - hpH)}
              className="menu-svg-text"
              fontSize={fs * 0.72}
              textAnchor="end"
              dominantBaseline="central"
              fill={hpColor(e.hp)}
              stroke="rgb(0 0 0 / 0.8)"
              strokeWidth="2.4"
              paintOrder="stroke"
            >
              {e.hp}
            </text>
          )}
        </g>
      )}
      {s.names && (
        <g>
          <rect
            x={f(cx - tagW / 2)}
            y={f(top - tagH - 5)}
            width={f(tagW)}
            height={f(tagH)}
            rx="3"
            fill="rgb(5 7 11 / 0.78)"
            stroke={color}
            strokeOpacity="0.55"
            strokeWidth="0.8"
          />
          <text
            x={f(cx)}
            y={f(top - 5 - tagH / 2)}
            className="menu-svg-text"
            fontSize={fs}
            fontWeight="600"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#f3f5f9"
          >
            {e.name}
          </text>
        </g>
      )}
      {s.distance && (
        <text
          x={f(cx)}
          y={f(bottom + 4)}
          className="menu-svg-text"
          fontSize={fs * 0.9}
          fontWeight="600"
          textAnchor="middle"
          dominantBaseline="hanging"
          fill={color}
          stroke="rgb(0 0 0 / 0.85)"
          strokeWidth="2.6"
          paintOrder="stroke"
        >
          {e.dist}m
        </text>
      )}
    </g>
  );
}

function Crosshair({ style }: { style: CrossStyle }) {
  const outline = { stroke: 'rgb(0 0 0 / 0.8)', strokeWidth: 3.4 };
  const main = { stroke: '#ffffff', strokeWidth: 1.4 };
  if (style === 'dot') {
    return (
      <g>
        <circle cx={CX} cy={CY} r="2.6" fill="rgb(0 0 0 / 0.8)" />
        <circle cx={CX} cy={CY} r="1.6" fill="#ffffff" />
      </g>
    );
  }
  if (style === 'circle') {
    return (
      <g fill="none">
        <circle cx={CX} cy={CY} r="7" {...outline} />
        <circle cx={CX} cy={CY} r="7" {...main} />
        <circle cx={CX} cy={CY} r="1.2" fill="#ffffff" stroke="none" />
      </g>
    );
  }
  const d = `M${CX} ${CY - 10}V${CY - 3.5}M${CX} ${CY + 3.5}V${CY + 10}M${CX - 10} ${CY}H${CX - 3.5}M${CX + 3.5} ${CY}H${CX + 10}`;
  return (
    <g strokeLinecap="round">
      <path d={d} {...outline} />
      <path d={d} {...main} />
    </g>
  );
}

function Radar({ enemies, color }: { enemies: Enemy[]; color: string }) {
  return (
    <div className="menu-radar" aria-hidden="true">
      <span className="menu-radar-sweep" />
      <svg viewBox="0 0 72 72" width="100%" height="100%">
        <path d="M36 36 15 6A36 36 0 0 1 57 6Z" fill="rgb(255 255 255 / 0.05)" />
        <circle cx="36" cy="36" r="24" fill="none" stroke="rgb(255 255 255 / 0.1)" />
        <circle cx="36" cy="36" r="12" fill="none" stroke="rgb(255 255 255 / 0.1)" />
        <path d="M36 2v68M2 36h68" stroke="rgb(255 255 255 / 0.07)" />
        {enemies.map((e) => {
          const x = 36 + (e.foot.x - CX) * 0.13;
          const y = 36 - e.dist * 0.24;
          return <circle key={e.id} cx={f(x)} cy={f(y)} r="2.6" fill={color} />;
        })}
        <path d="M36 31.5 39.5 39 36 37.2 32.5 39Z" fill="#ffffff" />
      </svg>
    </div>
  );
}

function MenuPreview({ s }: { s: Settings }) {
  const uid = 'menu' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const [frame, setFrame] = useState<{ t: number; aim: Pt }>({ t: 0, aim: { x: CX, y: CY } });
  const sRef = useRef(s);
  const frameRef = useRef(frame);

  useEffect(() => {
    sRef.current = s;
  }, [s]);

  useEffect(() => {
    if (reduced || !inView) return;
    let raf = 0;
    let last = performance.now();
    let { t, aim } = frameRef.current;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const st = sRef.current;
      const target = pickTarget(computeScene(t), st);
      const goal = target ? target.pt : { x: CX, y: CY };
      const per = 0.025 + 0.6 * Math.pow(1 - st.smooth / 100, 2);
      const a = 1 - Math.pow(1 - per, dt * 60);
      aim = { x: aim.x + (goal.x - aim.x) * a, y: aim.y + (goal.y - aim.y) * a };
      const next = { t, aim };
      frameRef.current = next;
      setFrame(next);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, inView]);

  const enemies = computeScene(frame.t);
  const [a, b] = enemies;
  const color = swatchCss(s.color);
  const target = pickTarget(enemies, s);
  const aim = reduced ? (target ? target.pt : { x: CX, y: CY }) : frame.aim;
  const locked = !!target && Math.hypot(aim.x - target.pt.x, aim.y - target.pt.y) < 6;
  const showAim = s.aimbot && Math.hypot(aim.x - CX, aim.y - CY) > 2;
  const inRange = (e: Enemy) => e.dist <= s.maxDist;
  const pulse = reduced ? 0 : (Math.sin(frame.t * 6) + 1) / 2;
  const fovR = fovRadius(s.fov);

  let hud: ReactNode;
  if (!s.aimbot) hud = <span className="menu-chip is-faint">Aim off</span>;
  else if (!target) hud = <span className="menu-chip is-faint">No target in FOV</span>;
  else
    hud = (
      <span className={`menu-chip${locked ? ' is-lock' : ''}`}>
        <span className="menu-chip-dot" />
        {locked ? 'Locked' : 'Tracking'} · {target.e.name} · {BONE_LABEL[s.bone]}
      </span>
    );

  return (
    <div className="menu-preview" ref={ref}>
      <svg
        className="menu-preview-svg"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`Live preview: ${[
          s.box && `${s.boxStyle === 'full' ? '2D' : 'corner'} box`,
          s.skeleton && 'skeleton',
          s.chams && 'chams',
          s.health && 'health bars',
          s.names && 'name tags',
          s.distance && 'distance',
          s.snaplines && 'snaplines',
          s.aimbot && `aimbot on ${BONE_LABEL[s.bone].toLowerCase()}`,
        ]
          .filter(Boolean)
          .join(', ') || 'all visuals off'}`}
      >
        <Backdrop uid={uid} />

        {/* Far enemy, partly behind cover */}
        <Figure e={b} uid={uid} />
        <ellipse cx="300" cy="266" rx="62" ry="7" fill={`url(#${uid}-shadow)`} />
        <Crate uid={uid} x1={258} y1={204} x2={352} y2={262} depth={0.12} />

        {/* Near enemy */}
        <ellipse cx={f(a.foot.x)} cy={a.foot.y + 2} rx="34" ry="6" fill={`url(#${uid}-shadow)`} />
        {!(s.chams && inRange(a)) && <Figure e={a} uid={uid} />}

        <rect width={VW} height={VH} fill={`url(#${uid}-vignette)`} />

        {/* Chams render through cover */}
        {s.chams &&
          enemies.filter(inRange).map((e) => (
            <Figure key={e.id} e={e} uid={uid} color={color} opacity={e.occluded ? 0.5 : 0.62} glow />
          ))}

        {/* ESP */}
        {s.snaplines &&
          enemies.filter(inRange).map((e) => {
            const bx = boxOf(e);
            return (
              <line
                key={e.id}
                x1={CX}
                y1={VH}
                x2={f(bx.cx)}
                y2={f(bx.bottom)}
                stroke={color}
                strokeOpacity="0.75"
                strokeWidth="1.1"
              />
            );
          })}
        {s.skeleton && enemies.filter(inRange).map((e) => <Skeleton key={e.id} e={e} color={color} />)}
        {enemies.filter(inRange).map((e) => (
          <Esp key={e.id} e={e} s={s} color={color} />
        ))}

        {/* Aimbot */}
        {s.aimbot &&
          enemies
            .filter((e) => !(s.visibleOnly && e.occluded))
            .map((e) => {
              const p = e.j[s.bone];
              const r = Math.max(2.4, e.h * 0.032);
              const isT = target?.e.id === e.id;
              return (
                <g key={e.id}>
                  <circle cx={f(p.x)} cy={f(p.y)} r={r + 1.2} fill="rgb(0 0 0 / 0.55)" />
                  <circle cx={f(p.x)} cy={f(p.y)} r={r} fill={isT ? color : '#ffffff'} fillOpacity={isT ? 1 : 0.55} />
                </g>
              );
            })}
        {s.aimbot && s.drawFov && (
          <circle
            cx={CX}
            cy={CY}
            r={f(fovR)}
            fill="rgb(255 255 255 / 0.025)"
            stroke={target ? color : '#ffffff'}
            strokeOpacity={target ? 0.75 : 0.45}
            strokeWidth="1"
            strokeDasharray={target ? undefined : '3 3'}
          />
        )}
        {showAim && target && (
          <g filter={`url(#${uid}-glow)`}>
            <line x1={CX} y1={CY} x2={f(aim.x)} y2={f(aim.y)} stroke={color} strokeWidth="1.4" strokeLinecap="round" />
            <circle
              cx={f(target.pt.x)}
              cy={f(target.pt.y)}
              r={f(Math.max(5, target.e.h * 0.055) + (locked ? pulse * 2.5 : 4))}
              fill="none"
              stroke={color}
              strokeWidth="1.2"
              strokeOpacity={locked ? 0.95 : 0.55}
            />
            <circle cx={f(aim.x)} cy={f(aim.y)} r="2" fill={color} />
          </g>
        )}
        {s.crosshair && <Crosshair style={s.crossStyle} />}
      </svg>

      <div className="menu-hud menu-hud-tl">
        {s.watermark && (
          <span className="menu-chip menu-watermark">
            <LogoMark size={12} />
            <b>{BRAND.wordmark}</b>
            <span className="menu-chip-sep" />
            240 fps
          </span>
        )}
        {hud}
        {s.streamProof && (
          <span className="menu-chip is-ok">
            <Icon name="eye-off" size={12} />
            Hidden from capture
          </span>
        )}
      </div>
      {s.radar && (
        <div className="menu-hud menu-hud-tr">
          <Radar enemies={enemies} color={color} />
        </div>
      )}
      <div className="menu-hud menu-hud-bl">
        <span className="menu-live">
          <span className="menu-live-dot" />
          Live preview
        </span>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* Window                                                                 */
/* ===================================================================== */

function MenuWindow() {
  const uid = useId();
  const [tab, setTab] = useState<TabKey>('visuals');
  const [s, setS] = useState<Settings>(() => ({ ...BASE, ...PRESETS.legit.values }));
  const [preset, setPreset] = useState<PresetKey>('legit');
  const [dirty, setDirty] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const set: Setter = useCallback((key, value) => {
    setS((p) => ({ ...p, [key]: value }));
    setDirty(true);
  }, []);

  const applyPreset = useCallback((k: PresetKey) => {
    setS((p) => ({ ...p, ...PRESETS[k].values }));
    setPreset(k);
    setDirty(false);
  }, []);

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.key === tab);
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = TABS.length - 1;
    if (n < 0) return;
    e.preventDefault();
    setTab(TABS[n].key);
    tabRefs.current[n]?.focus();
  };

  const tabId = (k: TabKey) => `${uid}-tab-${k}`;
  const panelId = (k: TabKey) => `${uid}-panel-${k}`;

  return (
    <div className="menu-window" style={{ ['--esp' as string]: swatchCss(s.color) } as CSSProperties}>
      <div className="menu-titlebar">
        <span className="menu-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="menu-title">
          <LogoMark size={18} />
          <span className="menu-title-word">{BRAND.wordmark}</span>
          <span className="menu-title-ver">v4.2.1</span>
        </span>
        <StatusBadge status="undetected" size="sm" />
      </div>

      <div className="menu-tabs" role="tablist" aria-label="Menu sections" onKeyDown={onTabKey}>
        {TABS.map((t, i) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={tabId(t.key)}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={panelId(t.key)}
              tabIndex={on ? 0 : -1}
              className={`menu-tab${on ? ' is-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <Icon name={t.icon} size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="menu-body">
        <div className="menu-panels">
          {TABS.map((t) => (
            <div
              key={t.key}
              id={panelId(t.key)}
              role="tabpanel"
              aria-labelledby={tabId(t.key)}
              tabIndex={0}
              hidden={t.key !== tab}
              className="menu-panel"
            >
              {t.key === 'visuals' && <VisualsPanel s={s} set={set} />}
              {t.key === 'aimbot' && <AimbotPanel s={s} set={set} />}
              {t.key === 'misc' && <MiscPanel s={s} set={set} />}
              {t.key === 'config' && <ConfigPanel s={s} preset={preset} dirty={dirty} onPreset={applyPreset} />}
            </div>
          ))}
        </div>
        <MenuPreview s={s} />
      </div>

      <div className="menu-footer">
        <span className="menu-footer-config">
          Config: <b>{PRESETS[preset].label}</b>
          {dirty && <em>· edited</em>}
        </span>
        <span className="menu-footer-stats">
          240 FPS <span aria-hidden="true">·</span> <span className="menu-footer-ok">0 detections</span>
        </span>
      </div>
    </div>
  );
}

/* ===================================================================== */
/* Section                                                                */
/* ===================================================================== */

const POINTS: { title: string; body: string }[] = [
  {
    title: 'Rebuilt on every launch.',
    body: 'Kernel-level protection that mutates its own signature each time it loads.',
  },
  {
    title: 'Keys in seconds.',
    body: 'Your license lands in your inbox and dashboard the moment payment clears.',
  },
  {
    title: 'Back the same day.',
    body: 'When a game patches, most tools are rebuilt and green again within hours.',
  },
  {
    title: 'Humans, around the clock.',
    body: 'Real staff on live chat and Discord 24/7, including 1-on-1 setup help.',
  },
];

export function MenuShowcase() {
  const headingId = useId();
  return (
    <section className="section menu-section" aria-labelledby={headingId}>
      <div className="menu-bg" aria-hidden="true">
        <div className="bg-dots" />
      </div>
      <div className="container menu-grid">
        <Reveal className="menu-stage">
          <div className="menu-hint">
            <span className="dot pulse" />
            Interactive demo · flip any toggle
          </div>
          <MenuWindow />
        </Reveal>

        <Reveal className="menu-copy" delay={120}>
          <span className="eyebrow">Inside the menu</span>
          <h2 className="h2 menu-h2" id={headingId}>
            Every setting,
            <br />
            <span className="accent">one key away.</span>
          </h2>
          <p className="lead menu-lead">
            Every {BRAND.name} tool opens to the same clean menu. Go on, try it: sensible presets out of the box, and every
            slider exposed when you want to go deeper.
          </p>
          <ul className="menu-points">
            {POINTS.map((p) => (
              <li key={p.title}>
                <span className="menu-point-icon" aria-hidden="true">
                  <Icon name="check" size={13} strokeWidth={2.6} />
                </span>
                <span>
                  <strong>{p.title}</strong> {p.body}
                </span>
              </li>
            ))}
          </ul>
          <div className="menu-cta">
            <a className="btn btn-primary btn-lg" href="#/store">
              Browse the store
              <span className="chip-arrow">
                <Icon name="arrow-right" />
              </span>
            </a>
            <a className="btn btn-quiet btn-lg menu-status-link" href="#/status">
              <span className="dot ok pulse" aria-hidden="true" />
              Live status
            </a>
          </div>
          <p className="menu-disclaimer">Preview is a simulation. Available features vary by game and product.</p>
        </Reveal>
      </div>
    </section>
  );
}
