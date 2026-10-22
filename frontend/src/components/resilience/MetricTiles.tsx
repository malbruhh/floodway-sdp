import React from 'react';
import { num } from '../../styles/tokens';
import { card, cardPad } from '../../styles/tokens';
import type { ResilienceView } from '../../lib/resilience';

type Ready = Extract<ResilienceView, { status: 'ready' }>;

/** The four measured figures. Each tile says how it is counted; none is an estimate. */
export function MetricTiles({ v }: { v: Ready }) {
  const tiles = [
    { k: 'Flood events caught', v: v.episodes, note: `${v.ongoing} still ongoing. An event runs from a WARNING or DANGER alert to its all-clear.` },
    { k: 'Median lead time', v: v.medianLead, note: `${v.leadNote} Lead time = first DANGER alert minus the earliest ADVISORY signal.` },
    { k: 'Alerts sent', v: `${v.alertsSentExternal} / ${v.alertsRaised}`, note: v.alertNote ?? 'Sent to an external channel (Telegram) out of alerts raised. The in-app log is not counted as sent.' },
    { k: 'Households routed', v: v.householdsRouted, note: `${v.arrived} reached a shelter. One started route = one household. These are simulated drives in the app.` },
  ];
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.k} className={`${card} ${cardPad}`}>
          <dt className="text-sm/5 font-semibold text-slate-700">{t.k}</dt>
          <dd className={`${num} mt-1 font-heading text-3xl/10 font-bold text-slate-900`}>{t.v}</dd>
          <p className="mt-2 text-xs/4 text-slate-700">{t.note}</p>
        </div>
      ))}
    </dl>
  );
}
