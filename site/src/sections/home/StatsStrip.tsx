import { Icon } from '../../components/Icon';
import { CountUp } from '../../components/ui';
import { BRAND } from '../../config';
import { STATS } from '../../data/catalog';

const players = parseFloat(BRAND.customers) * (/k/i.test(BRAND.customers) ? 1000 : 1);

const CELLS: { icon: string; to: number; label: string; format?: (n: number) => string; unit?: string }[] = [
  { icon: 'gamepad', to: STATS.games, label: 'Games supported' },
  { icon: 'box', to: STATS.products, label: 'Products in stock' },
  { icon: 'users', to: players, label: 'Players served', format: (n) => `${Math.round(n / 1000)}K+` },
  { icon: 'headset', to: 4, label: 'Avg. support reply', format: (n) => `<${Math.max(1, Math.round(n))}`, unit: 'min' },
];

export function StatsStrip() {
  return (
    <div className="home-stats" role="list" aria-label={`${BRAND.name} in numbers`}>
      {CELLS.map((c) => (
        <div className="home-stat" role="listitem" key={c.label}>
          <span className="icon-tile home-stat-icon">
            <Icon name={c.icon} />
          </span>
          <span className="home-stat-text">
            <span className="home-stat-value">
              <CountUp to={c.to} format={c.format} duration={1600} />
              {c.unit && <span className="home-stat-unit">{c.unit}</span>}
            </span>
            <span className="home-stat-label">{c.label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
