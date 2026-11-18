// Everything brand-specific lives here so the store can be renamed in one place.
export const BRAND = {
  name: 'Junko',
  wordmark: 'JUNKO',
  domain: 'junko.rip',
  tagline: 'Play in the dark.',
  blurb:
    'Premium game tools built in-house, shipped instantly and watched around the clock. Trusted by 18,000+ players.',
  discordUrl: '#/support',
  supportEmail: 'support@junko.rip',
  rating: 4.9,
  reviewCount: 2140,
  customers: '18K+',
  founded: 2021,
  currency: 'USD',
} as const;

export const NAV_LINKS = [
  { label: 'Store', href: '#/store', icon: 'store' },
  { label: 'Status', href: '#/status', icon: 'activity' },
  { label: 'Reviews', href: '#/reviews', icon: 'star' },
  { label: 'Support', href: '#/support', icon: 'headset' },
] as const;
