import React from 'react';
import { formatLead } from '../../lib/resilience';
import { medianLeadS } from '../../lib/estate';
import { LEVEL_META } from '../../lib/vision/levels';
import { card, cardPad, cardTitle, num } from '../../styles/tokens';
import type { Episode } from '../../types/resilience';
import type { AlertEvent, Camera, Level } from '../../types/vision';

interface Props {
  level: Level | null;
  cameras: Camera[];
  alerts: AlertEvent[];
  episodes: Episode[];
  resilienceStatus: 'loading' | 'error' | 'ready';
  windowLabel: string;
}

/** Water level, recent alerts and flood events for the cameras inside one township. */
export function AreaOverview({ level, cameras, alerts, episodes, resilienceStatus, windowLabel }: Props) {
  const meta = level ? LEVEL_META[level] : null;
  const Icon = meta?.icon;
  return (
    <section className={`${card} ${cardPad}`} aria-labelledby="area-title">
      <h2 id="area-title" className={cardTitle}>Water near you</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {meta && Icon ? (
          <span className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-base font-bold ${meta.chip}`}>
            <Icon className="h-5 w-5" aria-hidden="true" /> {meta.label}
          </span>
        ) : (
          <span className="text-sm/5 text-slate-700">No camera is reporting in this township.</span>
        )}
        <span className="text-sm/5 text-slate-700">
          {cameras.length === 0 ? 'No cameras in this township yet.' : `${cameras.length} ${cameras.length === 1 ? 'camera' : 'cameras'} · ${cameras.filter((c) => c.online).length} online`}
        </span>
      </div>

      <div className="mt-4 grid gap-4 @min-[760px]/main:grid-cols-2">
        <div>
          <h3 className="text-sm/5 font-semibold text-slate-900">Recent alerts</h3>
          {alerts.length === 0 ? (
            <p className="mt-1 text-sm/5 text-slate-700">No alerts yet.</p>
          ) : (
            <ul className="mt-1 divide-y divide-slate-100 text-sm/5">
              {alerts.slice(0, 5).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <span className="font-medium text-slate-900">{a.camera_name}</span>
                  <span className={LEVEL_META[a.level].text}>{a.kind === 'all_clear' ? 'All clear' : LEVEL_META[a.level].label}</span>
                  <span className={`${num} text-xs text-slate-600`}>{new Date(a.timestamp).toLocaleTimeString('en-MY')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm/5 font-semibold text-slate-900">Flood events</h3>
          {resilienceStatus === 'error' ? (
            <p className="mt-1 text-sm/5 text-slate-700">Event history unavailable (server not reachable).</p>
          ) : resilienceStatus === 'loading' ? (
            <p className="mt-1 text-sm/5 text-slate-700" role="status">Loading…</p>
          ) : (
            <p className="mt-1 text-sm/5 text-slate-700">
              <span className={`${num} font-semibold text-slate-900`}>{episodes.length}</span> in the last {windowLabel}. Median warning before danger:{' '}
              <span className={`${num} font-semibold text-slate-900`}>{formatLead(medianLeadS(episodes))}</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
