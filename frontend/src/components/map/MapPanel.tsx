import { AlertTriangle, Bike, Car, CheckCircle2, Footprints, MapPin, Navigation, Route, Waves } from 'lucide-react';
import type { Shelter } from '../../types';
import type { TravelMode } from '../../lib/mappers';
import { ORIGINS } from '../../data/klDemo';
import { formatCapacity, formatMin, percentOf } from '../../lib/format';
import { etaMin, type ScoredRoute } from '../../lib/routing';
import type { Scenario } from './FloodProneLayer';

export type ShelterFilter = 'all' | 'open' | 'recommended';

export const SCENARIO_INFO: Record<Scenario, { label: string; sub: string; active: string }> = {
  normal: { label: 'Normal', sub: 'Dry', active: 'bg-[#1677FF] text-white' },
  warning: { label: 'Warning', sub: 'Rising', active: 'bg-amber-600 text-white' },
  danger: { label: 'Danger', sub: 'Peak', active: 'bg-red-600 text-white' },
};

const fmtKm = (m: number) => `${(m / 1000).toFixed(1)} km`;

interface Props {
  originId: string;
  onOrigin: (id: string) => void;
  scenario: Scenario;
  onScenario: (s: Scenario) => void;
  auto: boolean;
  onAuto: () => void;
  autoNote: string;
  floodedCount: number;
  cameraZoneCount: number;
  shelters: Shelter[];
  best: Record<string, ScoredRoute | null>;
  selectedId: string;
  onSelect: (id: string) => void;
  filter: ShelterFilter;
  onFilter: (f: ShelterFilter) => void;
  mode: TravelMode;
  onMode: (m: TravelMode) => void;
  alternatives: ScoredRoute[];
  chosen: number;
  onChoose: (i: number) => void;
  navigating: boolean;
  onStart: () => void;
  routesReady: boolean;
}

const MODES: { id: TravelMode; label: string; Icon: typeof Car }[] = [
  { id: 'car', label: 'Drive', Icon: Car },
  { id: 'bike', label: 'Motorcycle', Icon: Bike },
  { id: 'walk', label: 'Walk', Icon: Footprints },
];

/** Controls and relief-centre list. Rendered in the desktop side panel and inside the phone bottom sheet. */
export function MapPanel(p: Props) {
  const shown = p.shelters.filter((s) => (p.filter === 'open' ? s.status === 'OPEN' : p.filter === 'recommended' ? s.status === 'OPEN' && s.routeStatus === 'CLEAR' : true));
  const selected = p.shelters.find((s) => s.id === p.selectedId);

  return (
    <div className="space-y-4 p-4">
      {/* Where "you" are: fixed demo positions, all in Kuala Lumpur */}
      <section aria-labelledby="origin-label">
        <label id="origin-label" htmlFor="origin-select" className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Your position (demo)
        </label>
        <select
          id="origin-select"
          value={p.originId}
          onChange={(e) => p.onOrigin(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]"
        >
          {ORIGINS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}, Kuala Lumpur
            </option>
          ))}
        </select>
      </section>

      {/* Scenario */}
      <section aria-labelledby="scenario-label">
        <p id="scenario-label" className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
          <Waves className="h-3.5 w-3.5" aria-hidden="true" /> Flood scenario (simulated)
        </p>
        <div role="group" aria-labelledby="scenario-label" className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1.5">
          {(Object.keys(SCENARIO_INFO) as Scenario[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={!p.auto && p.scenario === k}
              onClick={() => p.onScenario(k)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-lg text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF] ${
                !p.auto && p.scenario === k ? `${SCENARIO_INFO[k].active} shadow-md` : 'text-slate-700 hover:bg-white'
              }`}
            >
              <span>{SCENARIO_INFO[k].label}</span>
              <span className="font-medium opacity-90">{SCENARIO_INFO[k].sub}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={p.auto}
          onClick={p.onAuto}
          className={`mt-1.5 min-h-11 w-full rounded-lg border text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF] ${
            p.auto ? 'border-[#1677FF] bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-700 hover:bg-white'
          }`}
        >
          Auto (from cameras): {SCENARIO_INFO[p.scenario].label}
        </button>
        {p.auto && <p className="mt-1.5 text-xs text-slate-600">{p.autoNote}.</p>}
        <p className="mt-1.5 text-xs text-slate-600">
          {p.floodedCount} of 16 flood-prone areas flooded
          {p.cameraZoneCount > 0 ? `, plus ${p.cameraZoneCount} sample-camera ${p.cameraZoneCount === 1 ? 'zone' : 'zones'}` : ''}. Demo data, not an official flood map.
        </p>
      </section>

      {/* Route alternatives for the selected relief centre */}
      <section aria-labelledby="routes-label">
        <p id="routes-label" className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
          <Route className="h-3.5 w-3.5" aria-hidden="true" /> Routes to {selected ? selected.name.replace('Demo relief centre: ', '') : 'a relief centre'}
        </p>
        {!p.routesReady ? (
          <p className="text-xs text-slate-600">Loading road routes…</p>
        ) : p.alternatives.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">No stored road route for this pair.</p>
        ) : (
          <ul className="space-y-1.5">
            {p.alternatives.map((r, i) => (
              <li key={r.index}>
                <button
                  type="button"
                  aria-pressed={p.chosen === i}
                  onClick={() => p.onChoose(i)}
                  className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF] ${
                    p.chosen === i ? 'border-[#1677FF] bg-blue-50 ring-1 ring-[#1677FF]/30' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-slate-900">
                    Route {String.fromCharCode(65 + i)}
                    {i === 0 ? ' · suggested' : ''}
                  </span>
                  <span className="text-slate-700">
                    {fmtKm(r.distanceM)} · ~{formatMin(etaMin(r, p.mode))}
                  </span>
                  <span className={`shrink-0 font-bold ${r.crossings === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {r.crossings === 0 ? 'Avoids flood' : `Crosses ${r.crossings}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {p.alternatives.length > 0 && p.alternatives[0].crossings > 0 && (
          <p className="mt-1.5 rounded-xl border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-900">
            Every stored route crosses flooded areas in this scenario. Route A crosses the fewest.
          </p>
        )}
        <p className="mt-1.5 text-xs text-slate-600">Roads from OpenStreetMap. Time has no live traffic{p.mode !== 'car' ? ' and uses a typical speed for this mode' : ''}.</p>
        <div role="group" aria-label="Travel mode" className="mt-2 grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {MODES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={p.mode === id}
              onClick={() => p.onMode(id)}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF] ${
                p.mode === id ? 'bg-[#1677FF] text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </section>

      {/* Relief centres */}
      <section aria-labelledby="centres-label">
        <div className="mb-1.5 flex items-center justify-between">
          <h2 id="centres-label" className="font-heading text-sm font-extrabold text-slate-900">
            Relief centres <span className="font-medium text-slate-600">(demo list, {shown.length} shown)</span>
          </h2>
        </div>
        <div role="group" aria-label="Filter relief centres" className="mb-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1">
          {(['all', 'open', 'recommended'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={p.filter === f}
              onClick={() => p.onFilter(f)}
              className={`min-h-9 rounded-lg text-xs font-bold capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF] ${
                p.filter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              {f === 'open' ? 'Open only' : f}
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {shown.map((s) => {
            const sel = s.id === p.selectedId;
            const b = p.best[s.id];
            const pct = percentOf(s.currentCapacity, s.maxCapacity);
            const unavailable = s.status === 'FULL' || s.status === 'CLOSED';
            return (
              <li key={s.id}>
                <div className={`rounded-2xl border p-3 ${sel ? 'border-[#1677FF] bg-blue-50/40 ring-1 ring-[#1677FF]/30' : 'border-slate-200 bg-white'}`}>
                  <button
                    type="button"
                    aria-pressed={sel}
                    onClick={() => p.onSelect(s.id)}
                    className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block text-xs font-bold uppercase tracking-wide text-slate-600">{s.category}</span>
                        <span className="block font-heading text-sm font-bold text-slate-900">{s.name}</span>
                      </div>
                      <span
                        className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${
                          s.status === 'CLOSED' ? 'bg-red-100 text-red-800' : s.status === 'FULL' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {unavailable ? <AlertTriangle className="h-3 w-3" aria-hidden="true" /> : <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
                        {s.status === 'FULL' ? 'FULL' : s.status}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-700">
                      {b ? (
                        <>
                          <span className="font-bold text-slate-900">{fmtKm(b.distanceM)}</span>
                          <span className="font-semibold text-[#0958D9]">~{formatMin(etaMin(b, p.mode))}</span>
                          <span className={`font-semibold ${b.crossings === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {b.crossings === 0 ? 'Avoids flood' : `Crosses ${b.crossings} flooded`}
                          </span>
                        </>
                      ) : (
                        <span>Road route unavailable</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="mb-1 flex justify-between text-xs text-slate-600">
                        <span>Occupancy {pct === null ? '–' : `${pct}%`}</span>
                        <span className="font-bold text-slate-800">{formatCapacity(s.currentCapacity, s.maxCapacity)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                        <div className={`h-full rounded-full ${(pct ?? 0) >= 100 ? 'bg-red-600' : (pct ?? 0) > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct ?? 0}%` }} />
                      </div>
                    </div>
                    {unavailable && <p className="mt-2 text-xs font-semibold text-amber-900">Full. Choose another centre.</p>}
                  </button>
                  {sel && !unavailable && (
                    <button
                      type="button"
                      onClick={p.onStart}
                      disabled={p.navigating || !p.alternatives.length}
                      className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[#1677FF] text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-[#0958D9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF] focus-visible:ring-offset-2 disabled:opacity-50"
                    >
                      <Navigation className="h-4 w-4" aria-hidden="true" /> {p.navigating ? 'Navigating…' : 'Start turn-by-turn'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
