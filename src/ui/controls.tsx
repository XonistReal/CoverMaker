import React, { useEffect, useMemo, useRef, useState } from 'react';
import { commit } from '../store';
import { FONTS, FONT_CATS, type FontCat, fontByFamily } from '../fonts';
import { Icon } from './icons';

let idSeq = 0;
const useId = (p: string) => useMemo(() => `${p}-${++idSeq}`, [p]);

export function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
}) {
  const id = useId('s');
  const { label, value, min, max, step = 0.01, onChange, format } = props;
  const pct = ((value - min) / (max - min)) * 100;
  const shown = format ? format(value) : Math.abs(max - min) <= 2 ? Math.round(value * 100).toString() : Math.round(value).toString();
  return (
    <div className={'ctl slider' + (props.disabled ? ' is-off' : '')}>
      <label htmlFor={id}>
        <span>{label}</span>
        <output>{shown}</output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={props.disabled}
        style={{ ['--pct' as string]: `${pct}%` }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        onDoubleClick={() => {
          const zero = min < 0 && max > 0 ? 0 : min;
          onChange(zero);
          commit();
        }}
      />
    </div>
  );
}

const PALETTE = ['#ffffff', '#0a0a0a', '#ff2d2d', '#a30000', '#ff7a1a', '#f2c230', '#fff35c', '#3cff6b', '#1fd1ff', '#2d5bff', '#b98cff', '#ff3ea5', '#cfd3da', '#e9e4da'];

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId('c');
  return (
    <div className="ctl color">
      <label htmlFor={id}>{label}</label>
      <div className="color-row">
        <span className="swatch big" style={{ background: value }}>
          <input
            id={id}
            type="color"
            value={value.length === 7 ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            onBlur={commit}
            aria-label={`${label} color`}
          />
        </span>
        <div className="palette">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className={'swatch' + (c.toLowerCase() === value.toLowerCase() ? ' on' : '')}
              style={{ background: c }}
              aria-label={c}
              onClick={() => {
                onChange(c);
                commit();
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Seg<T extends string>({ label, value, options, onChange, wrap }: {
  label?: string;
  value: T;
  options: { v: T; label: React.ReactNode; title?: string }[];
  onChange: (v: T) => void;
  wrap?: boolean;
}) {
  return (
    <div className="ctl">
      {label && <div className="ctl-label">{label}</div>}
      <div className={'seg' + (wrap ? ' wrap' : '')} role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={o.v === value}
            title={o.title}
            className={o.v === value ? 'on' : ''}
            onClick={() => {
              onChange(o.v);
              commit();
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId('t');
  return (
    <div className="ctl toggle">
      <label htmlFor={id}>
        <span>
          {label}
          {hint && <small>{hint}</small>}
        </span>
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={value}
          onChange={(e) => {
            onChange(e.target.checked);
            commit();
          }}
        />
      </label>
    </div>
  );
}

export function SelectField<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId('sel');
  return (
    <div className="ctl">
      <label className="ctl-label" htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value as T);
          commit();
        }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function Section({ title, children, open: initial = true, right }: { title: string; children: React.ReactNode; open?: boolean; right?: React.ReactNode }) {
  const [open, setOpen] = useState(initial);
  return (
    <section className={'sect' + (open ? ' open' : '')}>
      <header>
        <button type="button" className="sect-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name={open ? 'down' : 'up'} size={14} />
          <span>{title}</span>
        </button>
        {right}
      </header>
      {open && <div className="sect-body">{children}</div>}
    </section>
  );
}

export function TextArea({ label, value, onChange, rows = 2, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const id = useId('ta');
  return (
    <div className="ctl">
      <label className="ctl-label" htmlFor={id}>{label}</label>
      <textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onBlur={commit} />
    </div>
  );
}

export function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId('ti');
  return (
    <div className="ctl">
      <label className="ctl-label" htmlFor={id}>{label}</label>
      <input id={id} type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onBlur={commit} />
    </div>
  );
}

export function FontPicker({ value, onChange, sample }: { value: string; onChange: (f: string) => void; sample: string }) {
  const [cat, setCat] = useState<FontCat>(fontByFamily.get(value)?.cat ?? 'Gothic');
  const list = FONTS.filter((f) => f.cat === cat);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = fontByFamily.get(value)?.cat;
    if (c) setCat(c);
  }, [value]);
  const text = (sample || 'Cover').split('\n')[0].slice(0, 18) || 'Cover';
  return (
    <div className="ctl">
      <div className="ctl-label">Font</div>
      <div className="seg wrap small" role="tablist" aria-label="Font style">
        {FONT_CATS.map((c) => (
          <button key={c} type="button" role="tab" aria-selected={c === cat} className={c === cat ? 'on' : ''} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="font-list" ref={ref}>
        {list.map((f) => (
          <button
            key={f.family}
            type="button"
            className={'font-opt' + (f.family === value ? ' on' : '')}
            onClick={() => {
              onChange(f.family);
              commit();
            }}
          >
            <span className="font-sample" style={{ fontFamily: `"${f.family}", Georgia, serif`, fontWeight: f.weights[f.weights.length - 1] }}>
              {text}
            </span>
            <span className="font-name">{f.family}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="row">{children}</div>;
}

export function IconButton({ icon, label, onClick, active, disabled, danger }: { icon: string; label: string; onClick: () => void; active?: boolean; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" className={'icon-btn' + (active ? ' on' : '') + (danger ? ' danger' : '')} onClick={onClick} disabled={disabled} title={label} aria-label={label}>
      <Icon name={icon} />
    </button>
  );
}
