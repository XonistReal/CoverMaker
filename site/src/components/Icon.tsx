import type { SVGProps } from 'react';

/* Stroke icon set (24×24, lucide-style geometry). Add new glyphs to PATHS. */

const PATHS: Record<string, JSX.Element> = {
  store: (
    <>
      <path d="M3 9 4.5 4h15L21 9" />
      <path d="M3 9h18v1.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z" />
      <path d="M5 13v7h14v-7" />
      <path d="M10 20v-4h4v4" />
    </>
  ),
  activity: <path d="M22 12h-4l-3 8-6-16-3 8H2" />,
  star: <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.3l-5.6 2.9 1.1-6.3-4.6-4.4 6.3-.9Z" />,
  headset: (
    <>
      <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
      <path d="M21 14v3a2 2 0 0 1-2 2h-1v-6h3ZM3 14v3a2 2 0 0 0 2 2h1v-6H3Z" />
      <path d="M18 19c0 1.7-1.8 3-4 3h-1" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2.5 3h2.6l2.4 12.2a1.8 1.8 0 0 0 1.8 1.5h8.6a1.8 1.8 0 0 0 1.8-1.4L21.5 8H6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.6" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.3a3.6 3.6 0 0 1 0 7.2M18 14.2A6.5 6.5 0 0 1 21.5 20" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  'arrow-up-right': <path d="M7 17 17 7M8 7h9v9" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-up': <path d="m6 15 6-6 6 6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  'chevron-left': <path d="m15 6-6 6 6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.3 2.8 2.8L16.2 9.6" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  shield: <path d="M12 2.8 4.5 5.6v6.2c0 4.6 3.1 8.2 7.5 9.4 4.4-1.2 7.5-4.8 7.5-9.4V5.6Z" />,
  'shield-check': (
    <>
      <path d="M12 2.8 4.5 5.6v6.2c0 4.6 3.1 8.2 7.5 9.4 4.4-1.2 7.5-4.8 7.5-9.4V5.6Z" />
      <path d="m8.8 12 2.2 2.2 4.3-4.4" />
    </>
  ),
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  gamepad: (
    <>
      <path d="M7.5 7h9a5 5 0 0 1 4.9 6l-.7 3.6a2.4 2.4 0 0 1-4.2 1L15 16H9l-1.5 1.6a2.4 2.4 0 0 1-4.2-1L2.6 13a5 5 0 0 1 4.9-6Z" />
      <path d="M7.5 10.5v3M6 12h3" />
      <circle cx="16" cy="11" r=".6" fill="currentColor" />
      <circle cx="17.6" cy="13" r=".6" fill="currentColor" />
    </>
  ),
  box: (
    <>
      <path d="m12 2.8 8 4.4v9.6l-8 4.4-8-4.4V7.2Z" />
      <path d="m4 7.2 8 4.5 8-4.5M12 11.7v9.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  cpu: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </>
  ),
  radar: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <path d="M12 12 18.4 5.6" />
      <circle cx="15.5" cy="9" r="1" fill="currentColor" />
    </>
  ),
  unlock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.7-1.5" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.7 12.3 9.3-9.3M17 6l3 3M14.5 8.5l2 2" />
    </>
  ),
  message: <path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.5-5.2A8.5 8.5 0 1 1 21 12Z" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  filter: <path d="M3 5h18l-7 8.5V20l-4-2v-4.5Z" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.6-4.4L4 8" />
      <path d="M4 3v5h5M4 13a8 8 0 0 0 14.6 4.4L20 16" />
      <path d="M20 21v-5h-5" />
    </>
  ),
  card: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.2" />
      <path d="M2.5 10h19M6 15h4" />
    </>
  ),
  bitcoin: (
    <path d="M9 4v16M13 4v2M13 18v2M7 6h7a3 3 0 0 1 0 6H7m0 0h8a3 3 0 0 1 0 6H7" />
  ),
  wallet: (
    <>
      <path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6" />
      <circle cx="16.5" cy="14" r="1.2" fill="currentColor" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </>
  ),
  download: <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />,
  'log-out': (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  trash: <path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12.2A2 2 0 0 0 8.5 21h7a2 2 0 0 0 2-1.8L18.5 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />,
  tag: (
    <>
      <path d="M3 12.2V4a1 1 0 0 1 1-1h8.2a1 1 0 0 1 .7.3l8 8a1 1 0 0 1 0 1.4l-8.2 8.2a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1-.3-.7Z" />
      <circle cx="7.8" cy="7.8" r="1.3" fill="currentColor" />
    </>
  ),
  flame: <path d="M12 22c4 0 7-2.8 7-7 0-3.6-2.4-6.4-4-8-.3 2.2-1.3 3.6-2.6 4.2.4-3.4-1-6.6-4.4-9.2.2 3.4-1.4 5.6-3 7.6A8.4 8.4 0 0 0 5 15c0 4.2 3 7 7 7Z" />,
  sparkles: (
    <>
      <path d="M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
      <path d="M19 15.5 19.8 17.2 21.5 18l-1.7.8L19 20.5l-.8-1.7L16.5 18l1.7-.8ZM5 2.5l.6 1.4L7 4.5l-1.4.6L5 6.5l-.6-1.4L3 4.5l1.4-.6Z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.6v.1" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 17v.1" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  monitor: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  play: <path d="M7 4.5v15l12.5-7.5Z" />,
  rocket: (
    <>
      <path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1Z" />
      <path d="M12 15 9 12a20 20 0 0 1 3-6.5A11 11 0 0 1 21 3c0 2.7-.8 6.4-5.5 9.5A20 20 0 0 1 12 15Z" />
      <path d="M9 12H4.5S5 9.5 6.5 8.5C8 7.6 11 8.6 11 8.6M12 15v4.5s2.5-.5 3.5-2c.9-1.5 0-4.5 0-4.5" />
    </>
  ),
  quote: (
    <path d="M9.5 7H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2.5v1.5A2.5 2.5 0 0 1 6 18M19.5 7H16a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2.5v1.5A2.5 2.5 0 0 1 16 18" />
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />,
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  gift: (
    <>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M19 12v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8" />
      <path d="M12 8H7.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8Zm0 0h4.5a2.5 2.5 0 1 0 0-5C13 3 12 8 12 8Z" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 8.5V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.5a3.5 3.5 0 0 0 0 7V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2.5a3.5 3.5 0 0 0 0-7Z" />
      <path d="M14 5v2M14 11v2M14 17v2" />
    </>
  ),
  send: <path d="M21.5 2.5 10.5 13.5M21.5 2.5 14.5 21.5l-4-8-8-4Z" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />,
  layers: (
    <>
      <path d="m12 2.5 9.5 5L12 12.5 2.5 7.5Z" />
      <path d="m2.5 12 9.5 5 9.5-5M2.5 16.5l9.5 5 9.5-5" />
    </>
  ),
  'thumbs-up': (
    <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Zm0 0 4-7.5a2.5 2.5 0 0 1 2.5 2.7L13 10h5.8a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 17.4 21H7" />
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4.5 4.5 0 0 0 5.6 5.6l-8.8 8.8a2.5 2.5 0 0 1-3.5-3.5l8.8-8.8a4.5 4.5 0 0 1-2.1-2.1ZM14.7 6.3l2.5-2.5a4.5 4.5 0 0 1 3 3l-2.5 2.5" />,
};

/* Brand glyphs drawn filled */
const FILLED: Record<string, JSX.Element> = {
  discord: (
    <path d="M19.6 5.3A16.6 16.6 0 0 0 15.4 4l-.5 1.1a15.4 15.4 0 0 0-5.8 0L8.6 4a16.5 16.5 0 0 0-4.2 1.3C1.8 9.3 1 13.2 1.4 17a16.7 16.7 0 0 0 5.1 2.6l1.1-1.8a10.8 10.8 0 0 1-1.7-.8l.4-.3a11.9 11.9 0 0 0 11.4 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.8a16.6 16.6 0 0 0 5.1-2.6c.5-4.4-.7-8.3-3-11.7ZM8.4 14.7c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.9.9 1.8 2c0 1.1-.8 2-1.8 2Zm7.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.9.9 1.8 2c0 1.1-.8 2-1.8 2Z" />
  ),
  'star-fill': <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.3l-5.6 2.9 1.1-6.3-4.6-4.4 6.3-.9Z" />,
  youtube: (
    <path d="M22.5 7.2a2.8 2.8 0 0 0-2-2C18.8 4.8 12 4.8 12 4.8s-6.8 0-8.5.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 4.8 2.8 2.8 0 0 0 2 2c1.7.4 8.5.4 8.5.4s6.8 0 8.5-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 23 12a29 29 0 0 0-.5-4.8ZM9.8 15.1V8.9l5.7 3.1Z" />
  ),
  'x-brand': <path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.4L1.9 3h6.4l4.4 5.9Zm-1.1 16.2h1.7L7.4 4.7H5.6Z" />,
  tiktok: <path d="M16.6 2h-3.4v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.2a6.3 6.3 0 1 0 5.4 6.2V8.6a8 8 0 0 0 4.4 1.3V6.5a4.5 4.5 0 0 1-4.4-4.5Z" />,
};

/** Every available glyph name (stroke + filled brand glyphs). */
export const ICON_NAMES = [...Object.keys(PATHS), ...Object.keys(FILLED)];

interface Props extends SVGProps<SVGSVGElement> {
  name: string;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 18, strokeWidth = 1.8, ...rest }: Props) {
  const filled = FILLED[name];
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
        {filled}
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name] ?? PATHS.box}
    </svg>
  );
}
