import { BRAND } from '../config';
import type { Review } from '../data/types';

/**
 * Older reviews revealed by "Load more" on #/reviews. Hand-written so they read
 * like real customers: mostly happy, a few honest 4s, and the odd low score.
 * Plans always match a plan the product actually sells.
 */
export const EXTRA_REVIEWS: Review[] = [
  { id: 'x1', author: 'reaper', productSlug: 'cod-umbra', plan: '1 Month', rating: 5, text: 'Loot ESP plus the radar is basically a cheat code for rotations. Ran it all week at a smooth 160 fps.', date: '2026-11-03', verified: true },
  { id: 'x2', author: 'Mika', productSlug: 'spoofer-temp', plan: '1 Week', rating: 5, text: 'Spoofer plus Umbra combo. Followed the guide step by step and it just worked. No BIOS flashing, no drama.', date: '2026-11-03', verified: true },
  { id: 'x3', author: 'hxllow', productSlug: 'valorant-nightfall', plan: '1 Day', rating: 4, text: 'Grabbed a day key to test before committing. Aim curves feel natural, the triggerbot delay took a bit of tuning.', date: '2026-11-02', verified: true },
  { id: 'x4', author: 'frostbyte', productSlug: 'rust-nightfall', plan: '1 Month', rating: 5, text: 'Sleeper and stash filters are perfect for offline raids. Sharing configs with my duo is clutch.', date: '2026-11-02', verified: true },
  { id: 'x5', author: 'Leo', productSlug: 'apex-eclipse', plan: '1 Week', rating: 5, text: "Loot ESP with rarity colours means I'm fully kitted in half the time. Zero frame drops on a 3060.", date: '2026-11-01', verified: true },
  { id: 'x6', author: 'nightowl', productSlug: 'tarkov-eclipse', plan: 'Lifetime', rating: 5, text: 'Went lifetime after two monthly keys. I run the radar on an old tablet next to my monitor and nothing ever touches the game client.', date: '2026-10-31', verified: true },
  { id: 'x7', author: 'qwerty', productSlug: 'fortnite-umbra', plan: '1 Week', rating: 4, text: 'Great aim, clean menu. Took a couple of tries to get borderless mode right but support sorted it in chat.', date: '2026-10-31', verified: true },
  { id: 'x8', author: 'saint', productSlug: 'r6-wraith', plan: '1 Month', rating: 5, text: 'Seeing traps and drones through walls changes how you play defense. Stream-proof holds up on OBS too.', date: '2026-10-30', verified: true },
  { id: 'x9', author: 'Yuki', productSlug: 'cs2-specter', plan: '1 Month', rating: 5, text: 'Legit preset is subtle enough for Premier. Recoil control feels like my own spray, just tighter.', date: '2026-10-29', verified: true },
  { id: 'x10', author: 'dvrk', productSlug: 'arc-umbra', plan: '1 Week', rating: 5, text: 'High-tier loot highlighting alone is worth it. Extracting with full bags almost every raid now.', date: '2026-10-29', verified: true },
  { id: 'x11', author: 'Marco', productSlug: 'spoofer-perm', plan: 'Lifetime', rating: 4, text: 'Did what it promised on my second PC. Needed one more reboot than the guide said, otherwise flawless.', date: '2026-10-28', verified: true },
  { id: 'x12', author: 'v0id', productSlug: 'rivals-nightfall', plan: '1 Month', rating: 5, text: 'Ability tracking shows exactly when enemy ults are up. Feels like having a coach on comms.', date: '2026-10-27', verified: true },
  { id: 'x13', author: 'kenji', productSlug: 'delta-specter', plan: '1 Month', rating: 5, text: 'Operations ESP shows loot tiers at a glance. The build was back the same day the season patch hit.', date: '2026-10-27', verified: true },
  { id: 'x14', author: 'ashen', productSlug: 'pubg-umbra', plan: '1 Month', rating: 5, text: 'Vehicle ESP and recoil smoothing make late circles way less chaotic. Loader is tiny and quick.', date: '2026-10-26', verified: true },
  { id: 'x15', author: 'Nina', productSlug: 'cod-unlocker', plan: '1 Week', rating: 5, text: 'Every camo unlocked in two clicks. My friends think I grinded for months.', date: '2026-10-25', verified: true },
  { id: 'x16', author: 'phantom', productSlug: 'dayz-wraith', plan: '1 Week', rating: 4, text: 'Long-range ESP is reliable. Would love a heli crash filter, but zombie and vehicle ESP are spot on.', date: '2026-10-24', verified: true },
  { id: 'x17', author: 'ezra', productSlug: 'finals-specter', plan: '1 Week', rating: 5, text: 'Smooth aim on light builds is unreal. Cashout ESP helps a ton in ranked tournaments.', date: '2026-10-23', verified: true },
  { id: 'x18', author: 'riot.', productSlug: 'fortnite-wraith', plan: '1 Month', rating: 5, text: "Internal is noticeably snappier than the external. When the patch dropped my key paused on its own, so I didn't lose a day.", date: '2026-10-22', verified: true },
  { id: 'x19', author: 'Owen', productSlug: 'valorant-nightfall', plan: '1 Month', rating: 5, text: 'Second month. Vanguard updates come and go and Nightfall is usually back within hours. Worth every cent.', date: '2026-10-21', verified: true },
  { id: 'x20', author: 'lumen', productSlug: 'abi-umbra', plan: '1 Week', rating: 3, text: 'Worked well most of the week, then it got flagged and sales were paused. Support extended my key and offered store credit, so fair enough.', date: '2026-11-06', verified: true },
  { id: 'x21', author: 'Grim', productSlug: 'apex-eclipse', plan: '1 Day', rating: 5, text: 'Day pass turned into a month. The smoothing slider has a ton of range, easy to make it look legit.', date: '2026-10-19', verified: true },
  { id: 'x22', author: 'Sora', productSlug: 'spoofer-temp', plan: '1 Month', rating: 5, text: 'I run the temp spoofer before every session. Fresh serials each boot, nothing to think about.', date: '2026-10-18', verified: true },
  { id: 'x23', author: 'jinx', productSlug: 'r6-wraith', plan: '1 Week', rating: 4, text: 'ESP is excellent. So many options it was a bit overwhelming at first, but the default config is a great start.', date: '2026-10-17', verified: true },
  { id: 'x24', author: 'Felix', productSlug: 'rust-nightfall', plan: '1 Week', rating: 5, text: 'Ore and hemp ESP make farming painless. Had a question at 4am and got an answer in minutes.', date: '2026-10-16', verified: true },
  { id: 'x25', author: 'kxzzy', productSlug: 'cod-umbra', plan: 'Lifetime', rating: 5, text: 'Upgraded to lifetime. Survived every update since I bought it with only a few hours of downtime each time.', date: '2026-10-15', verified: true },
  { id: 'x26', author: 'bento', productSlug: 'tarkov-eclipse', plan: '1 Week', rating: 4, text: 'Radar is super accurate. Price checker could refresh faster after market swings, still the best I have tried.', date: '2026-10-14', verified: true },
  { id: 'x27', author: 'Aiko', productSlug: 'fortnite-umbra', plan: '1 Month', rating: 5, text: 'Controller support is what sold me. Feels incredible in build fights.', date: '2026-10-12', verified: true },
  { id: 'x28', author: 'trace', productSlug: 'cs2-specter', plan: '1 Week', rating: 2, text: 'Not for me. I wanted a rage config and this is clearly built for legit play. Refund was handled quickly though, no arguing.', date: '2026-10-11', verified: true },
  { id: 'x29', author: 'mirage.exe', productSlug: 'spoofer-perm', plan: 'Lifetime', rating: 5, text: 'Hardware ban on my main rig. One run of the perm spoofer and I was back in the same evening.', date: '2026-10-09', verified: true },
  { id: 'x30', author: 'Rook', productSlug: 'delta-specter', plan: '1 Week', rating: 5, text: 'Warfare ESP at long range is clean and readable. Zero crashes in 20+ hours.', date: '2026-10-08', verified: true },
  { id: 'x31', author: 'zeal', productSlug: 'pubg-umbra', plan: '1 Day', rating: 4, text: 'Airdrop and vehicle ESP worked first try. Would like a few more crosshair styles.', date: '2026-10-06', verified: true },
  { id: 'x33', author: 'dex', productSlug: 'valorant-nightfall', plan: '1 Day', rating: 1, text: "Couldn't get it running on an Insider build of Windows. Support explained it isn't supported yet and refunded me within the hour.", date: '2026-10-05', verified: true },
  { id: 'x32', author: 'Hana', productSlug: 'rivals-nightfall', plan: '1 Week', rating: 5, text: 'Aim profiles switch automatically when I swap heroes. So much better than juggling configs by hand.', date: '2026-10-04', verified: true },
];

/** Share of all-time star ratings per star, 5 → 1. Averages out to BRAND.rating (≈4.87). */
const SHARE: Record<1 | 2 | 3 | 4 | 5, number> = { 5: 0.9117, 4: 0.065, 3: 0.0131, 2: 0.0042, 1: 0.006 };

export interface DistRow {
  stars: 1 | 2 | 3 | 4 | 5;
  count: number;
  pct: number;
}

/** Star-rating distribution whose counts always add up exactly to BRAND.reviewCount (every rating, not just written reviews). */
export const DISTRIBUTION: DistRow[] = (() => {
  const total = BRAND.reviewCount;
  const lower = ([4, 3, 2, 1] as const).map((s) => ({ stars: s, count: Math.round(total * SHARE[s]) }));
  const five = total - lower.reduce((a, r) => a + r.count, 0);
  return [{ stars: 5 as const, count: five }, ...lower].map((r) => ({ ...r, pct: (r.count / total) * 100 }));
})();

export const RATING_WORDS = ['', 'Terrible', 'Poor', 'Okay', 'Great', 'Excellent'] as const;
