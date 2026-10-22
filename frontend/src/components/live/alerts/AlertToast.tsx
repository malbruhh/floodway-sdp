import { ChevronRight, X } from 'lucide-react';
import { useEffect } from 'react';
import { LEVEL_META } from '../../../lib/vision/levels';
import type { AlertEvent } from '../../../types/vision';
import { interactive, num } from '../shared/ui';

interface Props {
  alert: AlertEvent | undefined;
  onOpen: (alert: AlertEvent) => void;
  onDismiss: (alert: AlertEvent) => void;
}

const AUTO_DISMISS_MS = 12000;

/** One per new WARNING/DANGER. Top-right on desktop; full width just under the app header on phones,
 *  so it never covers the sticky action bar at the bottom. */
export function AlertToast({ alert, onOpen, onDismiss }: Props) {
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => onDismiss(alert), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [alert, onDismiss]);

  if (!alert) return null;
  const clear = alert.kind === 'all_clear';
  const meta = LEVEL_META[clear ? 'NORMAL' : alert.level];
  const Icon = meta.icon;

  return (
    <div role="alert" className="fixed inset-x-3 top-[calc(4.5rem+env(safe-area-inset-top,0px))] z-50 motion-safe:animate-[live-toast-in_200ms_ease-out] sm:left-auto sm:right-6 sm:top-20 sm:w-[400px]">
      <div className={`flex items-start gap-3 rounded-2xl border bg-white p-3 shadow-lg shadow-slate-900/10 ${meta.border}`}>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.solid}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <button type="button" onClick={() => onOpen(alert)} className={`group min-w-0 flex-1 rounded-lg text-left ${interactive}`}>
          <span className={`block text-sm/5 font-semibold ${meta.text}`}>{clear ? 'ALL CLEAR' : meta.label.toUpperCase()}</span>
          <span className="block truncate text-sm/5 font-semibold text-slate-900">{alert.camera_name}</span>
          <span className="mt-0.5 block text-sm/5 text-slate-600">
            {clear ? 'Back below the warning line at' : 'Reached'} <span className={num}>{Math.round(alert.water_ratio * 100)}%</span> of bank.{' '}
            <span className="inline-flex items-center whitespace-nowrap font-semibold text-[#0958D9]">
              Open routes
              <ChevronRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
            </span>
          </span>
        </button>
        <button type="button" onClick={() => onDismiss(alert)} aria-label="Dismiss alert" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 ${interactive}`}>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
