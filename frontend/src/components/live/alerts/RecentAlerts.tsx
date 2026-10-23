import { Bell, BellRing, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { clockTime, timeAgo } from '../../../lib/vision/format';
import { LEVEL_META } from '../../../lib/vision/levels';
import { notificationPermission, requestNotificationPermission } from '../../../lib/vision/notify';
import type { AlertEvent } from '../../../types/vision';
import { card, cardPad, cardTitle, interactive, num } from '../shared/ui';

const COLLAPSED = 3;

export function RecentAlerts({ alerts }: { alerts: AlertEvent[] }) {
  const [all, setAll] = useState(false);
  const [permission, setPermission] = useState(notificationPermission());
  const [hideBlocked, setHideBlocked] = useState(false);
  const shown = all ? alerts.slice(0, 10) : alerts.slice(0, COLLAPSED);

  return (
    <section className={`${card} ${cardPad}`} aria-labelledby="ra-title">
      <div className="flex min-h-10 items-center justify-between gap-3">
        <h3 id="ra-title" className={`${cardTitle} flex items-center gap-2`}>
          <Bell className="h-5 w-5 text-muted" aria-hidden="true" /> Recent alerts
        </h3>
        {alerts.length > COLLAPSED && (
          <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className={`inline-flex min-h-11 items-center gap-1 rounded-ctl px-2 text-sm font-semibold text-link hover:bg-blue-50 ${interactive}`}>
            {all ? 'Show less' : `View all (${Math.min(alerts.length, 10)})`}
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${all ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="mt-2 text-sm/5 text-muted">No alerts yet. Warning and danger events appear here.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100" aria-live="polite">
          {shown.map((a) => {
            const clear = a.kind === 'all_clear';
            const meta = LEVEL_META[clear ? 'NORMAL' : a.level]; // all-clear rows use the green style
            const Icon = meta.icon;
            return (
              <li key={a.id} className="flex gap-3 py-3 first:pt-1 last:pb-0">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.solid}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline justify-between gap-2 text-sm/5">
                    <span className={`font-semibold ${meta.text}`}>{clear ? 'ALL CLEAR' : meta.label.toUpperCase()}</span>
                    <time dateTime={a.timestamp} title={timeAgo(a.timestamp)} className={`${num} shrink-0 text-xs/4 text-muted`}>{clockTime(a.timestamp)}</time>
                  </p>
                  <p className="truncate text-sm/5 font-medium text-ink" title={a.camera_name}>{a.camera_name}</p>
                  <p className="text-xs/4 text-muted">{clear ? 'Back below the warning line at ' : 'Reached '}<span className={num}>{Math.round(a.water_ratio * 100)}%</span> up the bank</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {permission === 'default' && (
        <button
          type="button"
          onClick={async () => setPermission(await requestNotificationPermission())}
          className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-ctl border border-control bg-surface px-3 text-sm font-semibold text-ink hover:bg-slate-50 ${interactive}`}
        >
          <BellRing className="h-4 w-4" aria-hidden="true" /> Enable phone notifications
        </button>
      )}
      {permission === 'denied' && !hideBlocked && (
        <p className="mt-3 flex items-start gap-2 rounded-ctl bg-raised p-3 text-sm text-muted" role="status">
          <span className="flex-1">Phone alerts are blocked in this browser. Allow notifications in the site settings to get them.</span>
          <button type="button" onClick={() => setHideBlocked(true)} className="flex min-h-11 min-w-11 items-center justify-center font-medium text-link">Dismiss</button>
        </p>
      )}
    </section>
  );
}
