import { CHANGELOG, NOW } from '../data/catalog';
import type { ChangelogEntry, Product, Status } from '../data/types';

/**
 * Mock 30-day uptime history for the status page.
 * Deterministic per product slug so the strip never changes between renders,
 * and anchored to the product's real current status + changelog so the most
 * recent days always agree with what the badge says.
 */

export const DAY_MS = 86_400_000;
export const HISTORY_DAYS = 30;

export interface UptimeDay {
  /** ISO timestamp at noon UTC of that day. */
  date: string;
  status: Status;
  /** Fraction of the day the tool was unavailable (0..1). */
  down: number;
}

export interface UptimeHistory {
  days: UptimeDay[];
  /** 0..100 */
  uptime: number;
  incidents: number;
}

function rng(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Index (0 = oldest, HISTORY_DAYS-1 = today) of the day an ISO date falls on, or -1 if out of range. */
function dayIndex(iso: string) {
  const back = Math.floor((NOW - Date.parse(iso)) / DAY_MS);
  const i = HISTORY_DAYS - 1 - back;
  return i >= 0 && i < HISTORY_DAYS ? i : -1;
}

const cache = new Map<string, UptimeHistory>();

export function uptimeFor(p: Product): UptimeHistory {
  const hit = cache.get(p.slug);
  if (hit) return hit;

  const r = rng(`${p.slug}:uptime`);
  const statuses: Status[] = new Array(HISTORY_DAYS).fill('undetected');

  // Background noise: the odd patch day, sometimes followed by a day in QA.
  for (let i = 0; i < HISTORY_DAYS - 3; i++) {
    if (r() < 0.04) {
      statuses[i] = 'updating';
      if (r() < 0.4 && i + 1 < HISTORY_DAYS - 3) {
        statuses[i + 1] = 'testing';
        i++;
      }
    }
  }

  // Patch days from the changelog show up as short "updating" blips.
  for (const c of CHANGELOG) {
    if (c.productSlug !== p.slug || c.kind !== 'update') continue;
    const i = dayIndex(c.date);
    if (i >= 0) statuses[i] = 'updating';
  }

  // The current status owns the trailing days since the last build push.
  if (p.status !== 'undetected') {
    const trailing = Math.min(HISTORY_DAYS, Math.floor((NOW - Date.parse(p.updatedAt)) / DAY_MS) + 1);
    for (let k = 0; k < trailing; k++) statuses[HISTORY_DAYS - 1 - k] = p.status;
    const before = HISTORY_DAYS - 1 - trailing;
    if (before >= 0) statuses[before] = p.status === 'testing' ? 'updating' : 'undetected';
  }

  const days: UptimeDay[] = statuses.map((status, i) => {
    const down =
      status === 'undetected'
        ? 0
        : status === 'updating'
          ? 0.05 + r() * 0.22
          : status === 'testing'
            ? 0.15 + r() * 0.3
            : 1;
    return {
      date: new Date(NOW - (HISTORY_DAYS - 1 - i) * DAY_MS).toISOString(),
      status,
      down,
    };
  });

  const lost = days.reduce((a, d) => a + d.down, 0);
  let incidents = 0;
  for (let i = 0; i < days.length; i++) {
    if (days[i].status !== 'undetected' && (i === 0 || days[i - 1].status === 'undetected')) incidents++;
  }

  const res: UptimeHistory = { days, uptime: 100 * (1 - lost / HISTORY_DAYS), incidents };
  cache.set(p.slug, res);
  return res;
}

export function formatUptime(n: number) {
  if (n >= 99.995) return '100%';
  return `${n.toFixed(n >= 99.95 ? 2 : 1)}%`;
}

export function uptimeTone(n: number): 'ok' | 'warn' | 'bad' {
  if (n >= 95) return 'ok';
  if (n >= 80) return 'warn';
  return 'bad';
}

export const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function dayDetail(d: UptimeDay) {
  const hours = Math.max(1, Math.round(d.down * 24));
  switch (d.status) {
    case 'undetected':
      return 'No incidents';
    case 'updating':
      return `Patch rebuild, ~${hours}h paused`;
    case 'testing':
      return `Build in QA, ~${hours}h`;
    default:
      return 'Sales paused all day';
  }
}

/** Visual config for each changelog entry kind. */
export const CHANGE_KIND: Record<ChangelogEntry['kind'], { label: string; icon: string; tone: 'accent' | 'warn' | 'violet' | 'info' }> = {
  update: { label: 'Update', icon: 'refresh', tone: 'accent' },
  status: { label: 'Status', icon: 'activity', tone: 'warn' },
  feature: { label: 'Feature', icon: 'sparkles', tone: 'violet' },
  fix: { label: 'Fix', icon: 'wrench', tone: 'info' },
};

export const clockUTC = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' });
