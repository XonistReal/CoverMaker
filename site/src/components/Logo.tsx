import { BRAND } from '../config';

/** Hexagonal "night eye" mark. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="junko-g" x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b9f6ff" />
          <stop offset="0.45" stopColor="var(--accent)" />
          <stop offset="1" stopColor="#7c5cff" />
        </linearGradient>
      </defs>
      <path d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25Z" stroke="url(#junko-g)" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M8.2 16S11.3 10.6 16 10.6 23.8 16 23.8 16 20.7 21.4 16 21.4 8.2 16 8.2 16Z" stroke="url(#junko-g)" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="2.6" fill="url(#junko-g)" />
    </svg>
  );
}

export function Logo({ size = 30, showWord = true }: { size?: number; showWord?: boolean }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      {showWord && <span className="logo-word">{BRAND.wordmark}</span>}
    </span>
  );
}
