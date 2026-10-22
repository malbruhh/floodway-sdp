import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { EpisodeTable } from '../components/resilience/EpisodeTable';
import { LossEstimate } from '../components/resilience/LossEstimate';
import { MetricTiles } from '../components/resilience/MetricTiles';
import { useResilience } from '../hooks/useResilience';
import { buildResilienceView, loadAssumptions, saveAssumptions, type Assumptions } from '../lib/resilience';
import { exportCsvUrl } from '../services/resilience';
import { btnSecondary, card, cardPad, cardTitle, interactive, pageTitle } from '../styles/tokens';
import type { CsvKind } from '../types/resilience';

const WINDOWS = [{ h: 24, label: '24 hours' }, { h: 168, label: '7 days' }, { h: 720, label: '30 days' }];
const EXPORTS: { kind: CsvKind; label: string }[] = [
  { kind: 'episodes', label: 'Events (CSV)' },
  { kind: 'alerts', label: 'Alerts (CSV)' },
  { kind: 'routes', label: 'Routes (CSV)' },
];

/** What FloodWay did, from the durable event log: events caught, lead time, alerts sent, households routed, plus an illustrative loss estimate. */
export function ResiliencePage() {
  const [windowH, setWindowH] = useState(24);
  const [assumptions, setAssumptions] = useState<Assumptions>(() => loadAssumptions());
  useEffect(() => saveAssumptions(assumptions), [assumptions]);

  const state = useResilience(windowH);
  const view = useMemo(
    () => buildResilienceView(state.status === 'ready' ? state.data : null, assumptions),
    [state, assumptions],
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        <Header />
        <main className="@container/main mx-auto w-full max-w-7xl flex-1 space-y-4 p-4 md:space-y-6 md:p-6 lg:p-8" aria-label="Resilience">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className={pageTitle}>Resilience</h1>
              <p className="text-sm/5 text-slate-700">What FloodWay caught, how early, and who it reached.</p>
            </div>
            <div role="group" aria-label="Time window" className="flex gap-2">
              {WINDOWS.map((w) => (
                <button
                  key={w.h}
                  type="button"
                  aria-pressed={windowH === w.h}
                  onClick={() => setWindowH(w.h)}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${interactive} ${
                    windowH === w.h ? 'border-[#0958D9] bg-[#0958D9] text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {state.status === 'loading' && <p className="text-sm text-slate-700" role="status">Loading…</p>}

          {view.status === 'error' && state.status === 'error' && (
            <section className={`${card} ${cardPad}`} role="alert">
              <h2 className={cardTitle}>Cannot reach the server</h2>
              <p className="mt-1 text-sm/5 text-slate-700">
                Resilience figures come from the backend event log, so there is nothing to show without it. No numbers are made up. Start the backend and this page updates by itself.
              </p>
            </section>
          )}

          {view.status === 'ready' && state.status === 'ready' && (
            <>
              {view.allSimulated && (
                <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm/5 font-medium text-amber-900">
                  Simulated: every event below comes from AI-generated sample cameras and demo drives, so these figures show how the system
                  works, not what happened on a real river.
                </p>
              )}
              {view.empty && (
                <p className="text-sm/5 text-slate-700">No events yet in this window. Sample cameras raise events as their water rises and falls, so check back in a few minutes.</p>
              )}
              <MetricTiles v={view} />
              <LossEstimate assumptions={assumptions} onChange={setAssumptions} loss={view.loss} />
              <EpisodeTable episodes={state.data.episodes} />

              <section className={`${card} ${cardPad}`} aria-labelledby="export-title">
                <h2 id="export-title" className={cardTitle}>Export for ESG reporting</h2>
                <p className="mt-1 text-sm/5 text-slate-700">
                  Raw records for the selected window. Each row has a <code>simulated</code> column so sample data is never mistaken for real events.
                  {state.data.log_since && ` Log starts ${new Date(state.data.log_since).toLocaleString('en-MY')}.`}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {EXPORTS.map((x) => (
                    <a key={x.kind} href={exportCsvUrl(x.kind, windowH)} download className={btnSecondary}>
                      <Download className="h-4 w-4" aria-hidden="true" /> {x.label}
                    </a>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
