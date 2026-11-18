import type {
  ChangelogEntry,
  Faq,
  FeatureGroup,
  Game,
  Plan,
  Product,
  ProductKind,
  Requirements,
  Review,
  Status,
} from './types';

/* ------------------------------------------------------------------ */
/* Games                                                               */
/* ------------------------------------------------------------------ */

export const GAMES: Game[] = [
  { slug: 'fortnite', name: 'Fortnite', short: 'FN', genre: 'Battle Royale', hue: 268, hue2: 200, tag: 'hot' },
  { slug: 'valorant', name: 'Valorant', short: 'VAL', genre: 'Tactical', hue: 352, hue2: 18 },
  { slug: 'call-of-duty', name: 'Call of Duty', short: 'COD', genre: 'Battle Royale', hue: 95, hue2: 40, tag: 'hot' },
  { slug: 'apex-legends', name: 'Apex Legends', short: 'APX', genre: 'Battle Royale', hue: 6, hue2: 330 },
  { slug: 'counter-strike-2', name: 'Counter-Strike 2', short: 'CS2', genre: 'Tactical', hue: 36, hue2: 205 },
  { slug: 'rainbow-six-siege', name: 'Rainbow Six Siege', short: 'R6', genre: 'Tactical', hue: 210, hue2: 250 },
  { slug: 'rust', name: 'Rust', short: 'RST', genre: 'Survival', hue: 18, hue2: 350 },
  { slug: 'escape-from-tarkov', name: 'Escape from Tarkov', short: 'EFT', genre: 'Extraction', hue: 60, hue2: 120 },
  { slug: 'arc-raiders', name: 'ARC Raiders', short: 'ARC', genre: 'Extraction', hue: 190, hue2: 150, tag: 'new' },
  { slug: 'pubg', name: 'PUBG', short: 'PUBG', genre: 'Battle Royale', hue: 42, hue2: 20 },
  { slug: 'the-finals', name: 'The Finals', short: 'TF', genre: 'Arena', hue: 330, hue2: 280 },
  { slug: 'marvel-rivals', name: 'Marvel Rivals', short: 'MR', genre: 'Arena', hue: 0, hue2: 45 },
  { slug: 'dayz', name: 'DayZ', short: 'DZ', genre: 'Survival', hue: 140, hue2: 90 },
  { slug: 'delta-force', name: 'Delta Force', short: 'DF', genre: 'Extraction', hue: 160, hue2: 210, tag: 'new' },
  { slug: 'arena-breakout', name: 'Arena Breakout: Infinite', short: 'ABI', genre: 'Extraction', hue: 28, hue2: 60 },
  { slug: 'hwid-spoofer', name: 'HWID Spoofers', short: 'HWID', genre: 'Utility', hue: 186, hue2: 230 },
];

/* ------------------------------------------------------------------ */
/* Feature presets                                                     */
/* ------------------------------------------------------------------ */

const AIM: FeatureGroup = {
  group: 'Aimbot',
  icon: 'crosshair',
  items: [
    'Humanized smooth aim',
    'Adjustable FOV circle',
    'Bone selection (head / neck / chest)',
    'Visibility check',
    'Bullet prediction',
    'Triggerbot with delay',
    'Per-weapon configs',
  ],
};

const VISUALS: FeatureGroup = {
  group: 'Visuals',
  icon: 'eye',
  items: [
    'Box ESP (2D / corner)',
    'Skeleton ESP',
    'Health & shield bars',
    'Name & distance',
    'Snaplines',
    'Chams / glow',
    'Loot & item ESP',
  ],
};

const MISC: FeatureGroup = {
  group: 'Misc',
  icon: 'sliders',
  items: [
    'Stream-proof overlay',
    '2D radar',
    'Cloud configs',
    'Custom crosshair',
    'Panic key',
  ],
};

const SPOOF: FeatureGroup[] = [
  {
    group: 'Spoofing',
    icon: 'cpu',
    items: [
      'Disk & volume serials',
      'SMBIOS / motherboard',
      'MAC addresses',
      'GPU identifiers',
      'Monitor EDID',
      'TPM-aware mode',
    ],
  },
  {
    group: 'Coverage',
    icon: 'shield',
    items: ['EAC', 'BattlEye', 'Vanguard', 'Ricochet', 'FairFight', 'Custom kernels'],
  },
  {
    group: 'Utility',
    icon: 'sliders',
    items: ['One-click cleaner', 'Serial checker', 'Restore on demand', 'Works with every Nyxor tool'],
  },
];

const RADAR: FeatureGroup[] = [
  {
    group: 'Radar',
    icon: 'radar',
    items: ['Web radar on any device', 'Live player positions', 'Loot & container filter', 'Extraction points', 'Team sharing link'],
  },
  VISUALS,
  { group: 'Misc', icon: 'sliders', items: ['Stream-proof overlay', 'Price checker', 'Quest item highlighter', 'Panic key'] },
];

const UNLOCK: FeatureGroup[] = [
  {
    group: 'Unlocks',
    icon: 'unlock',
    items: ['All operators & skins', 'All camos', 'All reticles', 'All blueprints', 'Calling cards & emblems'],
  },
  { group: 'Safety', icon: 'shield', items: ['Client-side only', 'Toggle per session', 'Auto-update on patch day'] },
];

function featuresFor(kind: ProductKind): FeatureGroup[] {
  switch (kind) {
    case 'spoofer':
      return SPOOF;
    case 'radar':
      return RADAR;
    case 'unlocker':
      return UNLOCK;
    case 'internal':
      return [AIM, VISUALS, { ...MISC, items: [...MISC.items, 'No recoil / no spread', 'Rapid config hotkeys'] }];
    default:
      return [AIM, VISUALS, MISC];
  }
}

/* ------------------------------------------------------------------ */
/* Plans                                                               */
/* ------------------------------------------------------------------ */

function plansFrom(day: number, slug: string, opts: { lifetime?: boolean } = {}): Plan[] {
  const r = (n: number) => Math.round(n) - 0.01;
  const plans: Plan[] = [
    { id: `${slug}-1d`, label: '1 Day', days: 1, price: day },
    { id: `${slug}-7d`, label: '1 Week', days: 7, price: r(day * 3.4), compareAt: r(day * 7) },
    { id: `${slug}-30d`, label: '1 Month', days: 30, price: r(day * 6.8), compareAt: r(day * 30) },
  ];
  if (opts.lifetime) plans.push({ id: `${slug}-life`, label: 'Lifetime', days: null, price: r(day * 26) });
  return plans;
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

const REQ_EXTERNAL: Requirements = {
  os: 'Windows 10 / 11 (22H2+)',
  cpu: 'Intel & AMD',
  mode: 'Borderless',
  streamProof: true,
  controller: true,
  spoofer: 'Recommended',
};

const REQ_INTERNAL: Requirements = { ...REQ_EXTERNAL, mode: 'Any', controller: false, spoofer: 'Included' };

const REQ_SPOOFER: Requirements = {
  os: 'Windows 10 / 11',
  cpu: 'Intel & AMD',
  mode: 'Any',
  streamProof: false,
  controller: false,
  spoofer: 'Not needed',
};

interface Seed {
  slug: string;
  game: string;
  name: string;
  kind: ProductKind;
  status: Status;
  day: number;
  tagline: string;
  popular?: boolean;
  isNew?: boolean;
  lifetime?: boolean;
  updated: string;
  rating: number;
  reviews: number;
  sold: number;
  stock?: number;
}

const SEEDS: Seed[] = [
  { slug: 'fortnite-umbra', game: 'fortnite', name: 'Fortnite Umbra', kind: 'external', status: 'undetected', day: 5.99, tagline: 'Feather-light external with silky aim and full ESP.', popular: true, lifetime: true, updated: '2026-11-17T21:40:00Z', rating: 4.9, reviews: 412, sold: 9100 },
  { slug: 'fortnite-wraith', game: 'fortnite', name: 'Fortnite Wraith', kind: 'internal', status: 'updating', day: 8.99, tagline: 'Full internal for competitive players. Back shortly after patch.', updated: '2026-11-18T09:12:00Z', rating: 4.8, reviews: 198, sold: 3800 },
  { slug: 'valorant-nightfall', game: 'valorant', name: 'Valorant Nightfall', kind: 'external', status: 'undetected', day: 9.99, tagline: 'Vanguard-tested external with humanized aim curves.', popular: true, updated: '2026-11-16T14:05:00Z', rating: 4.9, reviews: 356, sold: 6400, stock: 14 },
  { slug: 'cod-umbra', game: 'call-of-duty', name: 'Call of Duty Umbra', kind: 'external', status: 'undetected', day: 6.99, tagline: 'BO7 & Warzone external with loot ESP and radar.', popular: true, lifetime: true, updated: '2026-11-17T08:30:00Z', rating: 4.8, reviews: 287, sold: 7200 },
  { slug: 'cod-unlocker', game: 'call-of-duty', name: 'Call of Duty Unlock All', kind: 'unlocker', status: 'undetected', day: 4.99, tagline: 'Every operator, camo and blueprint, client-side.', isNew: true, updated: '2026-11-15T19:00:00Z', rating: 4.7, reviews: 96, sold: 2100 },
  { slug: 'apex-eclipse', game: 'apex-legends', name: 'Apex Eclipse', kind: 'external', status: 'undetected', day: 6.99, tagline: 'Shield-aware ESP and smooth aim for every legend.', popular: true, lifetime: true, updated: '2026-11-14T11:20:00Z', rating: 4.9, reviews: 241, sold: 5300 },
  { slug: 'cs2-specter', game: 'counter-strike-2', name: 'CS2 Specter', kind: 'internal', status: 'undetected', day: 4.99, tagline: 'Legit-first internal built for Premier and Faceit-free play.', lifetime: true, updated: '2026-11-12T16:45:00Z', rating: 4.8, reviews: 174, sold: 4100 },
  { slug: 'r6-wraith', game: 'rainbow-six-siege', name: 'Rainbow Six Wraith', kind: 'external', status: 'undetected', day: 6.99, tagline: 'Through-wall ESP with gadget and drone tracking.', popular: true, updated: '2026-11-17T12:00:00Z', rating: 4.9, reviews: 302, sold: 6900 },
  { slug: 'rust-nightfall', game: 'rust', name: 'Rust Nightfall', kind: 'external', status: 'undetected', day: 7.99, tagline: 'Raid-ready ESP with stash, ore and sleeper filters.', popular: true, lifetime: true, updated: '2026-11-13T22:10:00Z', rating: 4.8, reviews: 223, sold: 4800 },
  { slug: 'tarkov-eclipse', game: 'escape-from-tarkov', name: 'Tarkov Eclipse Radar', kind: 'radar', status: 'undetected', day: 8.99, tagline: 'Web radar with live loot values on your second screen.', lifetime: true, updated: '2026-11-11T10:00:00Z', rating: 4.9, reviews: 167, sold: 3300 },
  { slug: 'arc-umbra', game: 'arc-raiders', name: 'ARC Raiders Umbra', kind: 'external', status: 'undetected', day: 7.99, tagline: 'ESP for raiders, ARC machines and high-tier loot.', isNew: true, popular: true, updated: '2026-11-18T06:30:00Z', rating: 4.9, reviews: 88, sold: 1900, stock: 9 },
  { slug: 'pubg-umbra', game: 'pubg', name: 'PUBG Umbra', kind: 'external', status: 'undetected', day: 5.99, tagline: 'Vehicle, airdrop and player ESP with recoil smoothing.', updated: '2026-11-10T13:15:00Z', rating: 4.7, reviews: 131, sold: 2900 },
  { slug: 'finals-specter', game: 'the-finals', name: 'The Finals Specter', kind: 'external', status: 'testing', day: 6.99, tagline: 'Fresh build in QA after the season update.', updated: '2026-11-18T03:00:00Z', rating: 4.7, reviews: 74, sold: 1500 },
  { slug: 'rivals-nightfall', game: 'marvel-rivals', name: 'Marvel Rivals Nightfall', kind: 'external', status: 'undetected', day: 6.99, tagline: 'Hero-aware aim with ability and ult tracking.', updated: '2026-11-09T18:40:00Z', rating: 4.8, reviews: 119, sold: 2600 },
  { slug: 'dayz-wraith', game: 'dayz', name: 'DayZ Wraith', kind: 'external', status: 'undetected', day: 6.99, tagline: 'Long-range player, zombie, vehicle and loot ESP.', updated: '2026-11-08T09:25:00Z', rating: 4.8, reviews: 92, sold: 1700 },
  { slug: 'delta-specter', game: 'delta-force', name: 'Delta Force Specter', kind: 'external', status: 'undetected', day: 6.99, tagline: 'Operations and Warfare ESP with extraction overlay.', isNew: true, updated: '2026-11-16T20:00:00Z', rating: 4.8, reviews: 63, sold: 1200 },
  { slug: 'abi-umbra', game: 'arena-breakout', name: 'Arena Breakout Umbra', kind: 'external', status: 'detected', day: 6.99, tagline: 'Sales paused while we rebuild after the last anti-cheat wave.', updated: '2026-11-05T12:00:00Z', rating: 4.6, reviews: 58, sold: 1400 },
  { slug: 'spoofer-temp', game: 'hwid-spoofer', name: 'Nyxor Temp Spoofer', kind: 'spoofer', status: 'undetected', day: 3.99, tagline: 'Fresh hardware identity every boot. Reverts on restart.', popular: true, updated: '2026-11-17T15:30:00Z', rating: 4.9, reviews: 388, sold: 8700 },
  { slug: 'spoofer-perm', game: 'hwid-spoofer', name: 'Nyxor Perm Spoofer', kind: 'spoofer', status: 'undetected', day: 14.99, tagline: 'Permanent serial change for hardware bans. One run, done.', lifetime: true, updated: '2026-11-15T09:45:00Z', rating: 4.9, reviews: 204, sold: 4300 },
];

function describe(seed: Seed, game: Game): string {
  switch (seed.kind) {
    case 'spoofer':
      return `${seed.name} changes the hardware identifiers anti-cheats use to fingerprint your PC, so a hardware ban stays on the old identity instead of following you. It runs before the game, needs no BIOS flashing, and works alongside every Nyxor product.`;
    case 'radar':
      return `${seed.name} draws the whole raid on a web radar you can open on a phone, tablet or second monitor, so nothing ever renders on top of the game itself. Filter loot by value, track players through walls and share a live link with your squad.`;
    case 'unlocker':
      return `${seed.name} unlocks cosmetics client-side in ${game.name}. Toggle it on per session, pick your loadout and play. Nothing is written to your account, and it updates automatically on patch day.`;
    default:
      return `${seed.name} is our ${seed.kind} build for ${game.name}: a clean, fast menu with humanized aim, full ESP and a stream-proof overlay. Every build is tested on a fresh account before it ships, and the moment a patch lands we pull it until it's verified again.`;
  }
}

export const PRODUCTS: Product[] = SEEDS.map((s) => {
  const game = GAMES.find((g) => g.slug === s.game)!;
  const requirements =
    s.kind === 'spoofer' ? REQ_SPOOFER : s.kind === 'internal' ? REQ_INTERNAL : REQ_EXTERNAL;
  return {
    slug: s.slug,
    gameSlug: s.game,
    name: s.name,
    kind: s.kind,
    status: s.status,
    tagline: s.tagline,
    description: describe(s, game),
    features: featuresFor(s.kind),
    plans: plansFrom(s.day, s.slug, { lifetime: s.lifetime }),
    requirements,
    popular: s.popular,
    isNew: s.isNew,
    updatedAt: s.updated,
    rating: s.rating,
    reviews: s.reviews,
    sold: s.sold,
    stock: s.stock,
  };
});

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export const REVIEWS: Review[] = [
  { id: 'r1', author: 'kxzzy', productSlug: 'fortnite-umbra', plan: '1 Month', rating: 5, text: 'Third month in a row. Aim feels like my own just a bit cleaner, nobody in my lobbies can tell. Loader takes ten seconds.', date: '2026-11-17', verified: true },
  { id: 'r2', author: 'mirage.exe', productSlug: 'valorant-nightfall', plan: '1 Week', rating: 5, text: 'Only external I have found that survives more than a patch. Support walked me through setup over screenshare at 3am.', date: '2026-11-16', verified: true },
  { id: 'r3', author: 'Tobi', productSlug: 'spoofer-temp', plan: '1 Day', rating: 5, text: 'Was hardware banned, ran the temp spoofer, fresh account, back in game in 5 minutes. Unreal.', date: '2026-11-16', verified: true },
  { id: 'r4', author: 'novaa', productSlug: 'r6-wraith', plan: '1 Month', rating: 5, text: 'Drone and gadget ESP is so useful. The menu is clean and the configs save to the cloud so I can swap PCs.', date: '2026-11-15', verified: true },
  { id: 'r5', author: 'blxckout', productSlug: 'rust-nightfall', plan: 'Lifetime', rating: 5, text: 'Stash finder alone paid for itself in one wipe. Updates land same day as the Thursday patch.', date: '2026-11-14', verified: true },
  { id: 'r6', author: 'ghostline', productSlug: 'cod-umbra', plan: '1 Week', rating: 4, text: 'Loot ESP is great, aim is smooth. Took me a minute to find the right smoothing, defaults are a bit snappy.', date: '2026-11-14', verified: true },
  { id: 'r7', author: 'Ari', productSlug: 'apex-eclipse', plan: '1 Month', rating: 5, text: 'Shield colours on the health bar are such a nice touch. Running it 2 months, zero issues.', date: '2026-11-13', verified: true },
  { id: 'r8', author: 'vex', productSlug: 'tarkov-eclipse', plan: '1 Month', rating: 5, text: 'Radar on my phone while I play is a game changer. Loot value filter is the best I have used.', date: '2026-11-12', verified: true },
  { id: 'r9', author: 'sk1ttle', productSlug: 'arc-umbra', plan: '1 Day', rating: 5, text: 'Bought the day pass to try it, ended up grabbing a month. ARC machines showing through walls is crazy.', date: '2026-11-12', verified: true },
  { id: 'r10', author: 'lunar', productSlug: 'cs2-specter', plan: 'Lifetime', rating: 5, text: 'Legit config out of the box is perfect. Feels like a really good day rather than a cheat.', date: '2026-11-11', verified: true },
  { id: 'r11', author: 'Dmitri', productSlug: 'spoofer-perm', plan: 'Lifetime', rating: 5, text: 'Perm spoofer did exactly what it said. One run, rebooted, serials changed, ban gone.', date: '2026-11-10', verified: true },
  { id: 'r12', author: 'jayy', productSlug: 'fortnite-umbra', plan: '1 Day', rating: 5, text: 'Instant key, worked first try. Will be back for the week.', date: '2026-11-10', verified: true },
  { id: 'r13', author: 'oblivion', productSlug: 'valorant-nightfall', plan: '1 Month', rating: 4, text: 'Very solid. Wish it had a couple more ESP colour options but the aim is perfect.', date: '2026-11-09', verified: true },
  { id: 'r14', author: 'pyre', productSlug: 'rivals-nightfall', plan: '1 Week', rating: 5, text: 'Ult tracking is such a cool feature. Climbed two ranks this week.', date: '2026-11-08', verified: true },
  { id: 'r15', author: 'echo', productSlug: 'dayz-wraith', plan: '1 Month', rating: 5, text: 'Vehicle and loot ESP at long range, smooth FPS. Exactly what I wanted for DayZ.', date: '2026-11-07', verified: true },
  { id: 'r16', author: 'zenith', productSlug: 'r6-wraith', plan: '1 Day', rating: 5, text: 'Support answered in under 2 minutes on a Sunday. Product is clean.', date: '2026-11-06', verified: true },
  { id: 'r17', author: 'Kairo', productSlug: 'pubg-umbra', plan: '1 Week', rating: 4, text: 'Airdrop ESP and recoil smoothing work great. Setup guide was clear.', date: '2026-11-05', verified: true },
  { id: 'r18', author: 'sable', productSlug: 'delta-specter', plan: '1 Week', rating: 5, text: 'Extraction overlay is genius, never miss an exfil now.', date: '2026-11-04', verified: true },
];

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

export const FAQS: Faq[] = [
  { category: 'Safety', q: 'Is it safe? Will I get banned?', a: 'Every build is tested on fresh accounts before release, and the second a game patches we pull the affected product until it is verified again. Check the live status before you load, use a spoofer if you have been banned before, and keep your settings believable. No tool is risk-free, so we are upfront about status at all times.' },
  { category: 'General', q: 'How does delivery work?', a: 'Instantly. As soon as payment clears your license key and loader appear in your dashboard and in your inbox. There is no manual approval and no waiting in a ticket queue.' },
  { category: 'Payments', q: 'Which payment methods do you accept?', a: 'Cards, Apple Pay and Google Pay, PayPal, and the major cryptocurrencies (BTC, ETH, LTC, USDT). Prices are shown in USD and converted at checkout.' },
  { category: 'Setup', q: 'Will it work on my PC?', a: 'If you are on Windows 10 or 11 with an Intel or AMD CPU, yes. Any extra requirement for a specific product is listed on its page under Requirements before you buy.' },
  { category: 'Setup', q: 'How do I install and set it up?', a: 'Each product ships with a step-by-step guide in your dashboard. Run the loader before launching the game, log in with your key and you are in. Prefer a hand? Add a 1-on-1 setup and a specialist will do it with you over remote desktop.' },
  { category: 'Payments', q: 'Do you offer refunds?', a: 'If a product will not run on your system and support cannot fix it, you get a refund or store credit. Talk to us first, because most problems are solved in minutes. The full policy is on the Refund Policy page.' },
  { category: 'General', q: 'What happens to my key when a game updates?', a: 'When a product is marked Updating we pause the clock on every active key, so you never lose time you paid for while we rebuild.' },
  { category: 'General', q: 'Where do I get support?', a: 'Support is open 24/7 by live chat, ticket and Discord. Median first response is under 4 minutes.' },
];

/* ------------------------------------------------------------------ */
/* Changelog                                                           */
/* ------------------------------------------------------------------ */

export const CHANGELOG: ChangelogEntry[] = [
  { date: '2026-11-18T09:12:00Z', productSlug: 'fortnite-wraith', kind: 'status', text: 'Marked Updating after the v39.10 patch. Active keys paused.' },
  { date: '2026-11-18T06:30:00Z', productSlug: 'arc-umbra', kind: 'feature', text: 'Added ARC machine ESP and blueprint highlighter.' },
  { date: '2026-11-18T03:00:00Z', productSlug: 'finals-specter', kind: 'status', text: 'Season build moved to Testing on internal accounts.' },
  { date: '2026-11-17T21:40:00Z', productSlug: 'fortnite-umbra', kind: 'update', text: 'Updated for v39.10. Back to Undetected.' },
  { date: '2026-11-17T15:30:00Z', productSlug: 'spoofer-temp', kind: 'fix', text: 'Fixed a rare boot loop on some MSI boards.' },
  { date: '2026-11-17T12:00:00Z', productSlug: 'r6-wraith', kind: 'feature', text: 'Drone ESP now shows owner name.' },
  { date: '2026-11-16T14:05:00Z', productSlug: 'valorant-nightfall', kind: 'update', text: 'Rebuilt for the latest Vanguard update.' },
  { date: '2026-11-05T12:00:00Z', productSlug: 'abi-umbra', kind: 'status', text: 'Marked Detected. Sales paused; affected keys extended.' },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const STATUS_META: Record<Status, { label: string; short: string; tone: 'ok' | 'warn' | 'info' | 'bad'; hint: string }> = {
  undetected: { label: 'Undetected', short: 'Safe', tone: 'ok', hint: 'Working and safe to use.' },
  updating: { label: 'Updating', short: 'Updating', tone: 'warn', hint: 'Game patched. Rebuild in progress, keys paused.' },
  testing: { label: 'Testing', short: 'Testing', tone: 'info', hint: 'New build is being verified on test accounts.' },
  detected: { label: 'Detected', short: 'Paused', tone: 'bad', hint: 'Sales paused. Do not use until it is green again.' },
};

export const KIND_LABEL: Record<ProductKind, string> = {
  external: 'External',
  internal: 'Internal',
  spoofer: 'HWID Spoofer',
  unlocker: 'Unlocker',
  radar: 'Web Radar',
};

export const getGame = (slug: string) => GAMES.find((g) => g.slug === slug);
export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);
export const productsForGame = (slug: string) => PRODUCTS.filter((p) => p.gameSlug === slug);
export const reviewsForProduct = (slug: string) => REVIEWS.filter((r) => r.productSlug === slug);

export const fromPrice = (p: Product) => Math.min(...p.plans.map((pl) => pl.price));
export const gameFromPrice = (slug: string) => {
  const ps = productsForGame(slug);
  return ps.length ? Math.min(...ps.map(fromPrice)) : 0;
};

/** Worst-case status across a game's products is NOT what players want; show the best available. */
export const gameStatus = (slug: string): Status => {
  const order: Status[] = ['undetected', 'testing', 'updating', 'detected'];
  const ps = productsForGame(slug);
  for (const s of order) if (ps.some((p) => p.status === s)) return s;
  return 'detected';
};

export const STATS = {
  games: GAMES.length,
  products: PRODUCTS.length,
  undetected: PRODUCTS.filter((p) => p.status === 'undetected').length,
};

export const formatPrice = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/** "Now" is pinned so relative dates in the mock data read naturally. */
export const NOW = new Date('2026-11-18T12:00:00Z').getTime();

export function timeAgo(iso: string): string {
  const diff = Math.max(0, NOW - new Date(iso).getTime());
  const m = Math.round(diff / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
