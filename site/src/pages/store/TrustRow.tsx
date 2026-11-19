import { Icon } from '../../components/Icon';

const ITEMS = [
  { icon: 'zap', title: 'Instant delivery', body: 'Key and loader in seconds' },
  { icon: 'lock', title: 'Secure checkout', body: 'Encrypted, cards & crypto' },
  { icon: 'refresh', title: 'Same-day updates', body: 'Rebuilt fast after patches' },
  { icon: 'headset', title: '24/7 support', body: 'Real people, ~4 min replies' },
];

/** Slim row of store guarantees shown under the store header. */
export function TrustRow({ className = '' }: { className?: string }) {
  return (
    <ul className={`store-trust ${className}`} aria-label="Why buy here">
      {ITEMS.map((it) => (
        <li key={it.title} className="store-trust-item">
          <span className="store-trust-icon" aria-hidden="true">
            <Icon name={it.icon} size={18} />
          </span>
          <span className="store-trust-text">
            <strong>{it.title}</strong>
            <span>{it.body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
