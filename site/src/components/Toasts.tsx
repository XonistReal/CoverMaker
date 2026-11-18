import { useUI } from '../state/store';
import { Icon } from './Icon';

const ICON = { ok: 'check-circle', info: 'info', warn: 'alert', bad: 'alert' } as const;

export function Toasts() {
  const { toasts, dismissToast } = useUI();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast tone-${t.tone ?? 'ok'}`}>
          <Icon name={ICON[t.tone ?? 'ok']} size={18} className="toast-icon" />
          <div className="grow">
            <div className="toast-title">{t.title}</div>
            {t.body && <div className="toast-body">{t.body}</div>}
          </div>
          <button className="btn btn-quiet btn-icon btn-sm" style={{ ['--h' as string]: '26px' }} onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
