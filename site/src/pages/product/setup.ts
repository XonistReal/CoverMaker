import type { Product } from '../../data/types';

/** Local mock data for the product page: setup guides, trust copy and payment chips. */

export interface SetupStep {
  title: string;
  body: string;
  icon: string;
  /** Short mono hint rendered as a key/chip, e.g. a hotkey or settings path. */
  hint?: string;
}

const statusStep = (name: string): SetupStep => ({
  title: 'Check the live status',
  body: `Open the Status page and make sure ${name} shows Undetected before every session. If it is amber or red, wait for the green light.`,
  icon: 'activity',
  hint: 'Status › green',
});

const loaderStep: SetupStep = {
  title: 'Run the loader as admin',
  body: 'Download the loader from your dashboard, right-click it, choose Run as administrator and paste the license key from your inbox.',
  icon: 'key',
  hint: 'Run as administrator',
};

export function setupSteps(product: Product, gameName: string): SetupStep[] {
  const mode = product.requirements.mode === 'Any' ? 'any window' : product.requirements.mode.toLowerCase();
  switch (product.kind) {
    case 'spoofer':
      return [
        {
          title: 'Close every game and launcher',
          body: 'Quit games, Steam, Epic, Battle.net and anti-cheat services so nothing holds on to your old hardware IDs.',
          icon: 'x',
        },
        loaderStep,
        {
          title: 'Pick a spoof mode',
          body: 'Choose Spoof. Temp gives you a fresh identity until the next reboot; Perm writes new serials once and keeps them.',
          icon: 'cpu',
          hint: 'Temp · Perm',
        },
        {
          title: 'Clean old traces',
          body: 'Run the one-click cleaner to remove leftover game files, logs and registry entries tied to the banned identity.',
          icon: 'refresh',
        },
        {
          title: 'Verify and play',
          body: 'Open the serial checker to confirm every identifier changed, then sign in with a fresh account and launch.',
          icon: 'check-circle',
          hint: 'Serial checker',
        },
      ];
    case 'radar':
      return [
        statusStep(product.name),
        loaderStep,
        {
          title: 'Open your private radar link',
          body: 'The loader prints a private URL. Open it on your phone, tablet or a second monitor: nothing draws over the game.',
          icon: 'radar',
          hint: 'radar.link/••••',
        },
        {
          title: `Launch ${gameName} and deploy`,
          body: 'Start the game as normal. Players, loot and extracts appear on the radar the moment your raid loads.',
          icon: 'gamepad',
        },
        {
          title: 'Share with your squad',
          body: 'Optional: send the team link so everyone sees the same live map. Revoke it any time from the radar settings.',
          icon: 'users',
        },
      ];
    case 'unlocker':
      return [
        statusStep(product.name),
        loaderStep,
        {
          title: `Start ${gameName} to the main menu`,
          body: 'Let the game finish loading. The loader turns green once it has attached to the client.',
          icon: 'gamepad',
        },
        {
          title: 'Open the unlock panel',
          body: 'Press F5, pick the operators, camos and blueprints you want and equip them like normal.',
          icon: 'unlock',
          hint: 'F5',
        },
        {
          title: 'Play your session',
          body: 'Everything is client-side and resets when you close the game, so nothing is written to your account.',
          icon: 'shield-check',
        },
      ];
    default:
      return [
        statusStep(product.name),
        {
          title: 'Add a Defender exclusion',
          body: 'In Windows Security add a folder exclusion for your tools folder only, and close overlay apps such as MSI Afterburner or RivaTuner. Leave real-time protection on.',
          icon: 'shield-check',
          hint: 'Windows Security › Exclusions',
        },
        loaderStep,
        {
          title: `Launch ${gameName}`,
          body: `When the loader says Ready, start the game in ${mode} mode and load into the lobby.`,
          icon: 'gamepad',
        },
        {
          title: 'Open the menu',
          body: 'Press INSERT, load a legit preset from the cloud configs and fine-tune from there. Your settings sync across PCs.',
          icon: 'sliders',
          hint: 'INSERT',
        },
      ];
  }
}

export const TRUST = [
  { icon: 'zap', title: 'Instant delivery', body: 'Key and loader in seconds' },
  { icon: 'lock', title: 'Secure checkout', body: 'Handled by our processor' },
  { icon: 'headset', title: '24/7 support', body: 'Median reply under 4 min' },
  { icon: 'clock', title: 'Keys paused during updates', body: 'Never lose time you paid for' },
] as const;

export const PAYMENTS: { label: string; icon?: string }[] = [
  { label: 'Visa', icon: 'card' },
  { label: 'Mastercard' },
  { label: 'Apple Pay' },
  { label: 'Google Pay' },
  { label: 'PayPal' },
  { label: 'BTC', icon: 'bitcoin' },
  { label: 'ETH' },
  { label: 'LTC' },
  { label: 'USDT' },
];

/** Deterministic star distribution (percent per star, 5 → 1) derived from the average rating. */
export function ratingDistribution(rating: number): number[] {
  const d = Math.max(0, Math.min(0.6, 4.9 - rating));
  const p5 = Math.round(92 - 60 * d);
  const p4 = Math.round(6 + 40 * d);
  const p3 = Math.round(1 + 10 * d);
  const p2 = Math.round(0.4 + 5 * d);
  const p1 = Math.max(0, 100 - p5 - p4 - p3 - p2);
  return [p5, p4, p3, p2, p1];
}

/** Fake but stable build number per product, shown in the menu / loader mocks. */
export function buildVersion(product: Product): string {
  const d = new Date(product.updatedAt);
  return `${String(d.getUTCFullYear()).slice(2)}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
}
