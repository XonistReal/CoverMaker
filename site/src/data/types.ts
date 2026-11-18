export type Status = 'undetected' | 'updating' | 'testing' | 'detected';

export type ProductKind = 'external' | 'internal' | 'spoofer' | 'unlocker' | 'radar';

export type Genre =
  | 'Battle Royale'
  | 'Tactical'
  | 'Extraction'
  | 'Survival'
  | 'Arena'
  | 'Utility';

export interface Game {
  slug: string;
  name: string;
  /** 2–4 letter monogram used on generated cover art. */
  short: string;
  genre: Genre;
  /** Two hues (0–360) that drive the generated cover art gradient. */
  hue: number;
  hue2: number;
  tag?: 'new' | 'hot';
}

export interface Plan {
  id: string;
  label: string;
  /** null = lifetime */
  days: number | null;
  price: number;
  /** Optional struck-through price. */
  compareAt?: number;
}

export interface FeatureGroup {
  group: string;
  icon: string;
  items: string[];
}

export interface Requirements {
  os: string;
  cpu: string;
  mode: 'Windowed' | 'Borderless' | 'Any';
  streamProof: boolean;
  controller: boolean;
  spoofer: 'Included' | 'Recommended' | 'Not needed';
}

export interface Product {
  slug: string;
  gameSlug: string;
  name: string;
  kind: ProductKind;
  status: Status;
  tagline: string;
  description: string;
  features: FeatureGroup[];
  plans: Plan[];
  requirements: Requirements;
  popular?: boolean;
  isNew?: boolean;
  /** ISO date of the last build push. */
  updatedAt: string;
  rating: number;
  reviews: number;
  /** Rough units sold, shown as social proof. */
  sold: number;
  /** Units left on the cheapest plan; undefined = unlimited. */
  stock?: number;
}

export interface Review {
  id: string;
  author: string;
  productSlug: string;
  plan: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  /** ISO date */
  date: string;
  verified: boolean;
}

export interface Faq {
  q: string;
  a: string;
  category: 'General' | 'Payments' | 'Safety' | 'Setup';
}

export interface ChangelogEntry {
  date: string;
  productSlug: string;
  kind: 'update' | 'status' | 'feature' | 'fix';
  text: string;
}
