import React from 'react';
import { formatLead } from '../../lib/resilience';
import { card, cardPad, cardTitle, num } from '../../styles/tokens';
import type { Episode } from '../../types/resilience';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-MY', { dateStyle: 'short', timeStyle: 'medium' }) : '-');

export function EpisodeTable({ episodes }: { episodes: Episode[] }) {
  return (
    <section className={`${card} ${cardPad}`} aria-labelledby="episodes-title">
      <h2 id="episodes-title" className={cardTitle}>Flood events</h2>
      {episodes.length === 0 ? (
        <p className="mt-2 text-sm/5 text-slate-700">No events in this window.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm/5">
            <thead className="text-xs/4 text-slate-600">
              <tr>
                {['Camera', 'Started', 'Reached DANGER', 'Lead time', 'Status'].map((h) => (
                  <th key={h} scope="col" className="py-2 pr-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900">
              {episodes.map((e) => (
                <tr key={`${e.camera_id}-${e.started_at}`}>
                  <td className="py-2 pr-3 font-medium">
                    {e.camera_name}
                    {e.simulated && <span className="ml-2 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-900">SAMPLE</span>}
                  </td>
                  <td className={`${num} py-2 pr-3`}>{when(e.started_at)}</td>
                  <td className={`${num} py-2 pr-3`}>{when(e.danger_at)}</td>
                  <td className={`${num} py-2 pr-3`}>{formatLead(e.lead_time_s)}</td>
                  <td className="py-2 pr-3">{e.ended_at ? 'All clear' : e.interrupted ? 'Interrupted (server restarted)' : 'Ongoing'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
